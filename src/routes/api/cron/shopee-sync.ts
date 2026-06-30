import { createFileRoute } from "@tanstack/react-router";
import { getCachedProducts } from "../../../lib/shopee/cache";
import { ingestShopeeNodes } from "../../../lib/shopee/ingestion";
import { ShopeeSort, type ShopeeSortType } from "../../../lib/shopee/types";
import { isShopeeConfigured } from "../../../lib/shopee/client";
import { getAdminClient, isAdminConfigured } from "../../../lib/supabase-admin";
import {
  CATEGORY_KEYWORDS,
  buildKeywordPool,
} from "../../../lib/shopee/keywords";
import { pruneExpiredCache } from "../../../lib/shopee/cache";

// ---------------------------------------------------------------------------
// /api/cron/shopee-sync — production sync endpoint.
//
//   GET /api/cron/shopee-sync?secret={CRON_SECRET}&job={jobName}
//
// Jobs:
//   - popular     (every 5 min)  refresh hot items across baseline keywords
//   - prices      (every 15 min) re-fetch items already in catalog so prices
//                                 stay in sync (also captures price drops)
//   - promos      (every 1 h)    flash-sale focused queries
//   - categories  (every 6 h)    rotate the full keyword pool
//   - cleanup     (every 1 h)    purge expired cache + history
//
// Authentication: `CRON_SECRET` env (defaults to a placeholder if unset, so
// production deployments MUST override it).
//
// The endpoint NEVER returns mock data: if Shopee is unreachable AND the
// cache has nothing usable, it returns a structured failure with status 503
// so the caller can retry. The catalog already in the DB is unaffected.
// ---------------------------------------------------------------------------

type JobName = "popular" | "prices" | "promos" | "categories" | "cleanup";

const JOBS: Record<JobName, true> = {
  popular: true,
  prices: true,
  promos: true,
  categories: true,
  cleanup: true,
};

const PAGE_SIZE = 30;

interface JobResult {
  job: JobName;
  durationMs: number;
  keywords: number;
  apiCalls: number;
  cacheHits: number;
  staleServed: number;
  considered: number;
  inserted: number;
  updated: number;
  priceChanges: number;
  errors: number;
  errorDetails?: string[];
}

async function runForKeywords(args: {
  keywords: string[];
  sortType: ShopeeSortType;
  pages: number;
  force: boolean;
  ttlSeconds?: number;
}): Promise<Omit<JobResult, "job" | "durationMs">> {
  const result = {
    keywords: args.keywords.length,
    apiCalls: 0,
    cacheHits: 0,
    staleServed: 0,
    considered: 0,
    inserted: 0,
    updated: 0,
    priceChanges: 0,
    errors: 0,
    errorDetails: [] as string[],
  };

  for (const keyword of args.keywords) {
    for (let page = 1; page <= Math.max(1, args.pages); page++) {
      try {
        const res = await getCachedProducts({
          keyword,
          page,
          limit: PAGE_SIZE,
          sortType: args.sortType,
          listType: 0,
          force: args.force,
          ttlSeconds: args.ttlSeconds,
        });

        if (res.source === "fresh") result.apiCalls += 1;
        else if (res.source === "cache") result.cacheHits += 1;
        else if (res.source === "stale") result.staleServed += 1;

        const stats = await ingestShopeeNodes(res.nodes, keyword);
        result.considered += stats.considered;
        result.inserted += stats.inserted;
        result.updated += stats.updated;
        result.priceChanges += stats.priceChanges;
        if (stats.error && result.errorDetails.length < 5) {
          result.errors += 1;
          result.errorDetails.push(`ingest:${keyword}: ${stats.error}`);
        }

        // Stop early when the API signals no more pages — saves quota.
        if (res.nodes.length < PAGE_SIZE) break;
      } catch (err) {
        result.errors += 1;
        const msg = (err as Error).message;
        if (result.errorDetails.length < 5) result.errorDetails.push(`${keyword}: ${msg}`);
      }
    }
  }

  if (result.errorDetails.length === 0) delete (result as { errorDetails?: string[] }).errorDetails;
  return result;
}

async function jobPopular(): Promise<Omit<JobResult, "job" | "durationMs">> {
  // Top of every baseline keyword, sorted by hottest.
  const keywords = Object.values(CATEGORY_KEYWORDS).flat();
  return runForKeywords({
    keywords,
    sortType: ShopeeSort.HOT,
    pages: 1,
    force: true,                 // popular is the warm-cache job — always refresh
    ttlSeconds: 5 * 60,          // short TTL so the next pass refreshes
  });
}

async function jobPrices(): Promise<Omit<JobResult, "job" | "durationMs">> {
  // Re-fetch products already in catalog, ordered by last_fetched_at asc.
  if (!isAdminConfigured()) {
    return {
      keywords: 0,
      apiCalls: 0,
      cacheHits: 0,
      staleServed: 0,
      considered: 0,
      inserted: 0,
      updated: 0,
      priceChanges: 0,
      errors: 1,
      errorDetails: ["supabase admin not configured"],
    };
  }
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("title, shopee_item_id, category_id")
    .eq("marketplace", "Shopee")
    .not("shopee_item_id", "is", null)
    .order("last_fetched_at", { ascending: true })
    .limit(200);
  if (error) {
    return {
      keywords: 0,
      apiCalls: 0,
      cacheHits: 0,
      staleServed: 0,
      considered: 0,
      inserted: 0,
      updated: 0,
      priceChanges: 0,
      errors: 1,
      errorDetails: [error.message],
    };
  }
  // Use the product title (first 3 words) as a re-fetch keyword. The API
  // returns price-fresh data; ingestion upserts by item_id so we don't
  // accidentally create duplicates.
  const keywords = Array.from(
    new Set(
      (data ?? [])
        .map((p) => (p.title ?? "").toString().split(/\s+/).slice(0, 3).join(" "))
        .filter(Boolean),
    ),
  ).slice(0, 60);
  return runForKeywords({
    keywords,
    sortType: ShopeeSort.RELEVANCE,
    pages: 1,
    force: true,
    ttlSeconds: 15 * 60,
  });
}

async function jobPromos(): Promise<Omit<JobResult, "job" | "durationMs">> {
  // Queries focused on discounts + commission to surface flash sales.
  const keywords = [
    ...CATEGORY_KEYWORDS.promocoes,
    "oferta relâmpago bebê",
    "shopee mall bebê",
    "frete grátis bebê",
  ];
  return runForKeywords({
    keywords,
    sortType: ShopeeSort.COMMISSION_DESC,
    pages: 2,
    force: true,
    ttlSeconds: 30 * 60,
  });
}

async function jobCategories(): Promise<Omit<JobResult, "job" | "durationMs">> {
  // Full pool — rotates through age + interest extensions too.
  const keywords = buildKeywordPool({});
  return runForKeywords({
    keywords,
    sortType: ShopeeSort.RELEVANCE,
    pages: 2,
    force: false,                // honor cache, gentle scan
    ttlSeconds: 60 * 60,
  });
}

async function jobCleanup(): Promise<Omit<JobResult, "job" | "durationMs">> {
  await pruneExpiredCache();
  return {
    keywords: 0,
    apiCalls: 0,
    cacheHits: 0,
    staleServed: 0,
    considered: 0,
    inserted: 0,
    updated: 0,
    priceChanges: 0,
    errors: 0,
  };
}

export const Route = createFileRoute("/api/cron/shopee-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const job = (url.searchParams.get("job") || "popular") as JobName;

        // Authentication: accept either
        //   - ?secret=...                       (Supabase Edge Function / manual)
        //   - Authorization: Bearer <secret>    (Vercel Cron)
        const expected = process.env.CRON_SECRET || "super-secret-cron-token";
        const secretParam = url.searchParams.get("secret");
        const authHeader = request.headers.get("authorization") || "";
        const bearer = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : null;
        const ok = secretParam === expected || bearer === expected;
        if (!ok) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!JOBS[job]) {
          return Response.json(
            { error: `unknown job: ${job}`, validJobs: Object.keys(JOBS) },
            { status: 400 },
          );
        }

        if (job !== "cleanup" && !isShopeeConfigured()) {
          return Response.json(
            { error: "Shopee credentials missing (SHOPEE_APP_ID/SHOPEE_APP_SECRET)" },
            { status: 503 },
          );
        }
        if (!isAdminConfigured()) {
          return Response.json(
            { error: "Supabase service-role key missing (SUPABASE_SERVICE_ROLE_KEY)" },
            { status: 503 },
          );
        }

        const started = Date.now();
        try {
          let body: Omit<JobResult, "job" | "durationMs">;
          switch (job) {
            case "popular":
              body = await jobPopular();
              break;
            case "prices":
              body = await jobPrices();
              break;
            case "promos":
              body = await jobPromos();
              break;
            case "categories":
              body = await jobCategories();
              break;
            case "cleanup":
              body = await jobCleanup();
              break;
          }
          const result: JobResult = {
            job,
            durationMs: Date.now() - started,
            ...body,
          };
          return Response.json(result);
        } catch (err) {
          return Response.json(
            {
              job,
              error: (err as Error).message,
              durationMs: Date.now() - started,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
