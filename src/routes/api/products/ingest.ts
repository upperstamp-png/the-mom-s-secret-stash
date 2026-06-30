import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../../lib/supabase";
import { getAdminClient, isAdminConfigured } from "../../../lib/supabase-admin";

// ---------------------------------------------------------------------------
// /api/products/ingest — admin-only product ingestion from a single affiliate
// link.
//
//   POST /api/products/ingest
//   Authorization: Bearer <user JWT>
//   Body: {
//     affiliateLink: string,          // required — the share/affiliate URL
//     category?: string,              // optional — overrides auto-detection
//     marketplace?: string,           // optional — overrides domain detection
//     title?: string,                 // optional — overrides og:title
//     description?: string,
//     price?: number,                 // optional — overrides og:price:amount
//     oldPrice?: number,
//     image?: string,                 // optional — overrides og:image
//     brand?: string,
//     vipOnly?: boolean,
//     hot?: boolean
//   }
//
// Steps:
//   1) Verify caller is an admin via the user JWT + admin_users table.
//   2) Scrape the link with the WhatsApp UA (smallest payload + reliable
//      og:image extraction across marketplaces).
//   3) Build a product row by combining scraped metadata with body overrides
//      (body always wins).
//   4) Upsert into public.products via the admin (service-role) client so we
//      bypass the read-only RLS policy.
//
// Returns: { product: <inserted row> } on success.
// ---------------------------------------------------------------------------

type IngestBody = {
  affiliateLink?: string;
  category?: string;
  marketplace?: string;
  title?: string;
  description?: string;
  price?: number;
  oldPrice?: number;
  image?: string;
  brand?: string;
  vipOnly?: boolean;
  hot?: boolean;
};

type ScrapedMeta = {
  title: string | null;
  description: string | null;
  image: string | null;
  price: number | null;
  oldPrice: number | null;
  brand: string | null;
};

const ALLOWED_HOSTS: { match: RegExp; marketplace: string }[] = [
  { match: /(^|\.)shopee\.com\.br$/i, marketplace: "Shopee" },
  { match: /(^|\.)shopee\.com$/i, marketplace: "Shopee" },
  { match: /s\.shopee\.com\.br$/i, marketplace: "Shopee" },
  { match: /(^|\.)mercadolivre\.com\.br$/i, marketplace: "MercadoLivre" },
  { match: /(^|\.)mercadolibre\.com$/i, marketplace: "MercadoLivre" },
  { match: /(^|\.)amazon\.com\.br$/i, marketplace: "Amazon" },
  { match: /(^|\.)amazon\.com$/i, marketplace: "Amazon" },
  { match: /(^|\.)amzn\.to$/i, marketplace: "Amazon" },
  { match: /(^|\.)magazineluiza\.com\.br$/i, marketplace: "Magalu" },
  { match: /(^|\.)magazinevoce\.com\.br$/i, marketplace: "Magalu" },
  { match: /(^|\.)magalu\.com$/i, marketplace: "Magalu" },
  { match: /(^|\.)aliexpress\.com$/i, marketplace: "AliExpress" },
  { match: /(^|\.)aliexpress\.com\.br$/i, marketplace: "AliExpress" },
  { match: /(^|\.)temu\.com$/i, marketplace: "Temu" },
  { match: /(^|\.)shein\.com\.br$/i, marketplace: "Shein" },
  { match: /(^|\.)shein\.com$/i, marketplace: "Shein" },
];

function detectMarketplace(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const { match, marketplace } of ALLOWED_HOSTS) {
      if (match.test(host)) return marketplace;
    }
    return "Outros";
  } catch {
    return "Outros";
  }
}

// Best-effort categorizer based on title/description text. The product
// can be re-categorized manually via the optional `category` body field.
const CATEGORY_KEYWORDS_LIST: Record<string, string[]> = {
  fraldas: ["fralda", "diaper", "pampers", "huggies", "babysec", "mamypoko"],
  mamadeiras: [
    "mamadeira",
    "chupeta",
    "chuca",
    "bottle",
    "bico",
    "esterilizador",
    "nuk",
    "avent",
    "mam ",
  ],
  brinquedos: [
    "brinquedo",
    "boneca",
    "carrinho de brinquedo",
    "pelúcia",
    "pelucia",
    "lego",
    "playmobil",
    "jogo",
    "puzzle",
    "quebra-cabeça",
  ],
  carrinhos: [
    "carrinho de bebê",
    "carrinho bebe",
    "bebê conforto",
    "bebe conforto",
    "cadeirinha",
    "moisés",
    "moises",
    "berço",
    "berco",
    "stroller",
  ],
  escolar: [
    "escolar",
    "mochila",
    "lápis",
    "lapis",
    "caderno",
    "estojo",
    "lancheira",
    "material escolar",
  ],
  calcados: [
    "tênis",
    "tenis",
    "sapato",
    "sandália",
    "sandalia",
    "chinelo",
    "bota",
    "papete",
    "calçado",
    "calcado",
  ],
  roupas: [
    "roupa",
    "vestido",
    "blusa",
    "calça",
    "calca",
    "macacão",
    "macacao",
    "body",
    "camiseta",
    "camisa",
    "short",
    "saia",
    "conjunto",
    "pijama",
    "moletom",
    "casaco",
    "jaqueta",
  ],
};

function categorize(text: string): string {
  const t = text.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS_LIST)) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return "tudo";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function meta(html: string, prop: string): string | null {
  // Try property= first (OG), then name= (Twitter, std).
  const re1 = new RegExp(
    `<meta[^>]+property=["']${prop.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}["'][^>]+content=["']([^"']+)`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+name=["']${prop.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}["'][^>]+content=["']([^"']+)`,
    "i",
  );
  const m = html.match(re1) || html.match(re2);
  return m ? decodeEntities(m[1]) : null;
}

function metaContentFirst(
  html: string,
  prop: string,
): string | null {
  // Some sites put content="..." BEFORE property="..."
  const re = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : null;
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  // "R$ 89,90" / "89.90" / "89,9" / "1.234,56"
  const cleaned = raw.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;
  let n: number;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // assume "1.234,56" (BR) → "1234.56"
    n = Number(cleaned.replace(/\./g, "").replace(",", "."));
  } else if (cleaned.includes(",")) {
    n = Number(cleaned.replace(",", "."));
  } else {
    n = Number(cleaned);
  }
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function scrapeUrl(url: string): Promise<ScrapedMeta> {
  // WhatsApp UA → smallest payload, most marketplaces still serve full og:tags.
  const headers = {
    "User-Agent": "WhatsApp/2.23.20.0 A",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  };
  // 10s safety net — Shopee short links can chain 3-4 redirects.
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), 10_000);
  let html = "";
  try {
    const res = await fetch(url, {
      headers,
      redirect: "follow",
      signal: ctl.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao buscar URL`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const titleMeta =
    meta(html, "og:title") ||
    metaContentFirst(html, "og:title") ||
    (html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null);
  const descMeta =
    meta(html, "og:description") ||
    metaContentFirst(html, "og:description") ||
    meta(html, "description");
  const imgMeta =
    meta(html, "og:image") ||
    metaContentFirst(html, "og:image") ||
    meta(html, "twitter:image");
  const priceMeta =
    meta(html, "product:price:amount") ||
    meta(html, "og:price:amount") ||
    meta(html, "twitter:data1");
  const oldPriceMeta =
    meta(html, "product:price:standard_amount") ||
    meta(html, "og:price:standard_amount");
  const brandMeta = meta(html, "product:brand") || meta(html, "og:brand");

  return {
    title: titleMeta ? decodeEntities(titleMeta).trim() : null,
    description: descMeta ? decodeEntities(descMeta).trim() : null,
    image: imgMeta || null,
    price: parsePrice(priceMeta),
    oldPrice: parsePrice(oldPriceMeta),
    brand: brandMeta ? decodeEntities(brandMeta).trim() : null,
  };
}

async function requireAdmin(token: string | null): Promise<{
  userId: string;
} | { error: string; status: number }> {
  if (!token) return { error: "Não autenticado", status: 401 };
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(token);
  if (userErr || !user) return { error: "Sessão inválida", status: 401 };
  // Use admin client to read admin_users (the RLS policy is recursive and
  // only allows admins to see themselves; service-role bypasses that).
  if (!isAdminConfigured()) {
    return {
      error:
        "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada — não é possível inserir produtos.",
      status: 503,
    };
  }
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("admin_users")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error)
    return { error: `Erro ao verificar admin: ${error.message}`, status: 500 };
  if (!data) return { error: "Acesso restrito a admins", status: 403 };
  return { userId: user.id };
}

export const Route = createFileRoute("/api/products/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ---- 1. Auth ----
          const authHeader = request.headers.get("Authorization");
          const token =
            authHeader && authHeader.toLowerCase().startsWith("bearer ")
              ? authHeader.slice(7).trim()
              : null;
          const auth = await requireAdmin(token);
          if ("error" in auth) {
            return Response.json({ error: auth.error }, { status: auth.status });
          }

          // ---- 2. Parse body ----
          let body: IngestBody;
          try {
            body = (await request.json()) as IngestBody;
          } catch {
            return Response.json({ error: "JSON inválido" }, { status: 400 });
          }
          const affiliateLink = (body.affiliateLink || "").trim();
          if (!affiliateLink || !/^https?:\/\//i.test(affiliateLink)) {
            return Response.json(
              { error: "affiliateLink é obrigatório (http/https)" },
              { status: 400 },
            );
          }

          // ---- 3. Scrape (best-effort) ----
          let scraped: ScrapedMeta = {
            title: null,
            description: null,
            image: null,
            price: null,
            oldPrice: null,
            brand: null,
          };
          let scrapeError: string | null = null;
          try {
            scraped = await scrapeUrl(affiliateLink);
          } catch (e) {
            scrapeError = (e as Error).message;
            // Continue: caller can still POST with explicit fields.
          }

          // ---- 4. Merge body overrides over scraped data ----
          const title = (body.title || scraped.title || "").trim();
          if (!title) {
            return Response.json(
              {
                error:
                  "Não foi possível detectar o título do produto. Envie `title` no body.",
                scrapeError,
              },
              { status: 422 },
            );
          }
          const image = (body.image || scraped.image || "").trim();
          if (!image) {
            return Response.json(
              {
                error:
                  "Não foi possível detectar a imagem do produto. Envie `image` no body.",
                scrapeError,
              },
              { status: 422 },
            );
          }
          const price =
            body.price != null
              ? Number(body.price)
              : scraped.price != null
                ? Number(scraped.price)
                : null;
          if (price == null || !Number.isFinite(price) || price <= 0) {
            return Response.json(
              {
                error:
                  "Não foi possível detectar o preço. Envie `price` no body.",
                scrapeError,
              },
              { status: 422 },
            );
          }
          let oldPrice =
            body.oldPrice != null
              ? Number(body.oldPrice)
              : scraped.oldPrice != null
                ? Number(scraped.oldPrice)
                : price;
          if (!Number.isFinite(oldPrice) || oldPrice < price) oldPrice = price;

          const description =
            body.description ?? scraped.description ?? "";
          const brand = body.brand || scraped.brand || "";
          const marketplace =
            body.marketplace || detectMarketplace(affiliateLink);
          const category =
            body.category ||
            categorize(`${title} ${description} ${brand}`);

          // Unique slug. We append a short random suffix to avoid the unique
          // constraint blowing up on duplicate titles.
          const slugBase = slugify(title) || "produto";
          const suffix = Math.random().toString(36).slice(2, 8);
          const slug = `${slugBase}-${suffix}`;

          // ---- 5. Insert ----
          const admin = getAdminClient();
          const insertRow = {
            title,
            description,
            image_url: image,
            price,
            old_price: oldPrice,
            marketplace,
            category_id: category,
            brand,
            affiliate_link: affiliateLink,
            slug,
            available: true,
            vip_only: !!body.vipOnly,
            hot: !!body.hot,
          };
          const { data: inserted, error: insertErr } = await admin
            .from("products")
            .insert(insertRow)
            .select(
              "id, title, image_url, price, old_price, marketplace, category_id, slug, affiliate_link, hot, vip_only",
            )
            .single();
          if (insertErr) {
            return Response.json(
              { error: `Falha ao salvar produto: ${insertErr.message}` },
              { status: 500 },
            );
          }

          return Response.json({
            product: inserted,
            scrapeError,
          });
        } catch (e) {
          const msg = (e as Error).message || "Internal";
          console.error("/api/products/ingest erro:", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
