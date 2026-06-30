import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase";

// ---------------------------------------------------------------------------
// Feed endpoint — paginação infinita estilo Pinterest.
//
// GET /api/feed?cursor=0&limit=20&category=tudo&q=&seed=42
//
// Resposta:
// {
//   products: Product[],
//   nextCursor: number | null,
//   hasMore: boolean,
//   total: number
// }
//
// Estratégia de relevância:
//   1) Filtra hard por categoria — quando o chip não é "tudo", só passam
//      os produtos com category_id correspondente. "promocoes" é especial:
//      libera produtos com desconto real (old_price > price) ou hot.
//   2) Filtra hard por texto — quando há `q`, exige que TODOS os termos
//      apareçam em algum campo (título, marca, descrição, shop, categoria).
//   3) Pontua cada produto com sinais: categoria, interesses do usuário,
//      idade dos filhos, marca favoritada, popularidade, conversão, hot, novo,
//      desconto, match textual.
//   4) Ordena por score desc + id asc (estável).
//   5) Mistura com shuffle determinístico por `seed` para variedade entre
//      sessões mas estabilidade dentro da mesma sessão (dedup confiável).
//   6) Quando o cursor ultrapassa o tamanho do pool, "vira a página" re-
//      embaralhando com seed+round — feed nunca termina.
// ---------------------------------------------------------------------------

type Row = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  video_url: string | null;
  price: number;
  old_price: number;
  marketplace: string;
  category_id: string | null;
  brand: string | null;
  coupon_id: string | null;
  cashback: number | null;
  affiliate_link: string;
  vip_only: boolean;
  hot: boolean;
  score_ai: number | null;
  popularity: number | null;
  conversion_rate?: number | null;
  slug: string;
  created_at?: string;
  // Shopee-enriched fields (nullable for non-Shopee marketplaces)
  rating?: number | null;
  rating_count?: number | null;
  sales_count?: number | null;
  free_shipping?: boolean | null;
  flash_sale?: boolean | null;
  shop_name?: string | null;
  commission_rate?: number | null;
  coupons?: { code: string } | { code: string }[] | null;
};

type FeedProduct = {
  id: string;
  title: string;
  description: string;
  image: string;
  video?: string;
  price: number;
  oldPrice: number;
  marketplace: string;
  brand: string;
  category: string;
  coupon?: string;
  vipOnly: boolean;
  hot: boolean;
  affiliateLink?: string;
  rating?: number;
  ratingCount?: number;
  salesCount?: number;
  freeShipping?: boolean;
  flashSale?: boolean;
  shopName?: string;
  commissionRate?: number;
};

const PAGE_DEFAULT = 20;
const PAGE_MAX = 60;

// Hash determinístico de string → uint32. Usado pra shuffle estável.
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// PRNG mulberry32 — leve, determinístico, suficiente pra shuffle de UI.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function couponCode(c: Row["coupons"]): string | undefined {
  if (!c) return undefined;
  if (Array.isArray(c)) return c[0]?.code;
  return c.code;
}

function normalize(r: Row): FeedProduct {
  return {
    id: r.id,
    title: r.title,
    description: r.description || "",
    image: r.image_url,
    video: r.video_url || undefined,
    price: Number(r.price),
    oldPrice: Number(r.old_price),
    marketplace: r.marketplace,
    brand: r.brand || "",
    category: r.category_id || "tudo",
    coupon: couponCode(r.coupons),
    vipOnly: !!r.vip_only,
    hot: !!r.hot,
    affiliateLink: r.affiliate_link || undefined,
    rating: r.rating != null ? Number(r.rating) : undefined,
    ratingCount: r.rating_count != null ? Number(r.rating_count) : undefined,
    salesCount: r.sales_count != null ? Number(r.sales_count) : undefined,
    freeShipping: r.free_shipping ?? undefined,
    flashSale: r.flash_sale ?? undefined,
    shopName: r.shop_name || undefined,
    commissionRate: r.commission_rate != null ? Number(r.commission_rate) : undefined,
  };
}

type UserSignals = {
  userId: string | null;
  interestCategories: Set<string>;
  childAgeBuckets: Set<"baby" | "toddler" | "kids">;
  favoriteIds: Set<string>;
  favoriteBrands: Set<string>;
  seenProductIds: Set<string>;
};

const EMPTY_SIGNALS: UserSignals = {
  userId: null,
  interestCategories: new Set(),
  childAgeBuckets: new Set(),
  favoriteIds: new Set(),
  favoriteBrands: new Set(),
  seenProductIds: new Set(),
};

const AGE_TO_CATEGORIES: Record<string, string[]> = {
  baby: ["fraldas", "mamadeiras", "carrinhos"],
  toddler: ["brinquedos", "carrinhos", "roupas"],
  kids: ["escolar", "brinquedos", "calcados"],
};

// Antirepetição: ignorar produtos vistos nos últimos N registros.
// 500 é suficiente pra evitar dejá-vu na sessão sem podar demais o pool.
const RECENT_HISTORY_LIMIT = 500;

async function loadUserSignals(token: string | null): Promise<UserSignals> {
  if (!token) return EMPTY_SIGNALS;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return EMPTY_SIGNALS;

    const [interestsRes, childrenRes, favoritesRes, historyRes] = await Promise.all([
      supabase.from("interests").select("category_id").eq("profile_id", user.id),
      supabase.from("children").select("age_months").eq("profile_id", user.id),
      supabase
        .from("favorites")
        .select("product_id, products(brand)")
        .eq("profile_id", user.id),
      supabase
        .from("user_feed_history")
        .select("product_id")
        .eq("profile_id", user.id)
        .order("seen_at", { ascending: false })
        .limit(RECENT_HISTORY_LIMIT),
    ]);

    const buckets = new Set<"baby" | "toddler" | "kids">();
    (childrenRes.data || []).forEach((c: any) => {
      const age = Number(c?.age_months ?? 0);
      if (age <= 12) buckets.add("baby");
      else if (age <= 36) buckets.add("toddler");
      else buckets.add("kids");
    });

    const favBrands = new Set<string>();
    const favIds = new Set<string>();
    (favoritesRes.data || []).forEach((f: any) => {
      if (f?.product_id) favIds.add(String(f.product_id));
      const b = f?.products?.brand;
      if (b) favBrands.add(String(b).toLowerCase());
    });

    const seen = new Set<string>(
      (historyRes.data || [])
        .map((h: any) => h?.product_id)
        .filter(Boolean)
        .map(String),
    );

    return {
      userId: user.id,
      interestCategories: new Set(
        (interestsRes.data || [])
          .map((i: any) => i?.category_id)
          .filter(Boolean),
      ),
      childAgeBuckets: buckets,
      favoriteIds: favIds,
      favoriteBrands: favBrands,
      seenProductIds: seen,
    };
  } catch (err) {
    console.warn("loadUserSignals:", (err as Error).message);
    return EMPTY_SIGNALS;
  }
}

function discountPct(p: FeedProduct): number {
  if (p.oldPrice <= 0) return 0;
  return Math.max(0, 1 - p.price / p.oldPrice);
}

function score(
  p: FeedProduct,
  popularity: number | null,
  conversion: number | null,
  category: string,
  q: string,
  signals: UserSignals,
  jitter: number,
): number {
  let s = 0;

  // Categoria explícita (chip): boost forte mas não excludente
  if (category !== "tudo" && p.category === category) s += 6;

  // Match textual: título / marca
  if (q) {
    const hay = (p.title + " " + p.brand).toLowerCase();
    if (hay.includes(q)) s += 5;
    else {
      // match parcial por palavra
      const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
      for (const t of tokens) if (hay.includes(t)) s += 1;
    }
  }

  // Interesses cadastrados
  if (signals.interestCategories.has(p.category)) s += 3;

  // Idade do(s) filho(s)
  for (const bucket of signals.childAgeBuckets) {
    if (AGE_TO_CATEGORIES[bucket]?.includes(p.category)) {
      s += 2;
      break;
    }
  }

  // Marca favorita
  if (p.brand && signals.favoriteBrands.has(p.brand.toLowerCase())) s += 2;

  // Já favoritado: pequeno boost (mantém em rotação)
  if (signals.favoriteIds.has(p.id)) s += 1;

  // Sinais de catálogo
  if (p.hot) s += 2;
  s += Math.min(3, (popularity || 0) / 100);
  s += Math.min(3, (conversion || 0) * 30);
  s += discountPct(p) * 4; // até +4 por desconto grande

  // Jitter determinístico (0..1.5) — variedade sem perder estabilidade
  s += jitter * 1.5;

  return s;
}

export const Route = createFileRoute("/api/feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const sp = url.searchParams;
          const cursor = Math.max(0, Number(sp.get("cursor") || 0));
          const limit = Math.min(
            PAGE_MAX,
            Math.max(1, Number(sp.get("limit") || PAGE_DEFAULT)),
          );
          const category = (sp.get("category") || "tudo").trim();
          const q = (sp.get("q") || "").trim().toLowerCase();
          const seedRaw = sp.get("seed") || "1";
          const seed = Number(seedRaw) || hash32(seedRaw);

          // Auth (opcional)
          const authHeader = request.headers.get("Authorization");
          const token =
            authHeader && authHeader.startsWith("Bearer ")
              ? authHeader.slice(7)
              : null;
          const signals = await loadUserSignals(token);

          // Carrega catálogo disponível
          const { data, error } = await supabase
            .from("products")
            .select(
              `
              id, title, description, image_url, video_url,
              price, old_price, marketplace, category_id, brand,
              coupon_id, cashback, affiliate_link, vip_only, hot,
              score_ai, popularity, conversion_rate, slug, created_at,
              rating, rating_count, sales_count, free_shipping, flash_sale,
              shop_name, commission_rate,
              coupons (code)
            `,
            )
            .eq("available", true)
            .order("created_at", { ascending: false });

          if (error) {
            return Response.json(
              { error: error.message, products: [], nextCursor: null, hasMore: false, total: 0 },
              { status: 500 },
            );
          }

          const allRows = (data || []) as unknown as Row[];

          // ----------------------------------------------------------------
          // Filtro hard por categoria.
          // Quando o usuário clica num chip (ex: "Fraldas"), só queremos
          // mostrar produtos daquela categoria. "tudo" passa direto.
          // "promocoes" é um filtro especial: produtos com desconto real
          // (old_price > price) OU marcados como hot (alto giro).
          // ----------------------------------------------------------------
          const categoryFiltered = (() => {
            const c = category.toLowerCase();
            if (!c || c === "tudo") return allRows;
            if (c === "promocoes") {
              return allRows.filter(
                (r) => (r.old_price ?? 0) > (r.price ?? 0) || !!r.hot,
              );
            }
            return allRows.filter((r) => (r.category_id || "").toLowerCase() === c);
          })();

          // ----------------------------------------------------------------
          // Filtro hard por busca textual.
          // Quando o usuário digita no campo de busca, queremos mostrar APENAS
          // produtos que casam com o termo (título, marca, descrição ou shop).
          // Suporta múltiplos termos: todos precisam aparecer em algum campo
          // (busca AND, estilo "fralda pampers" → tem que ter "fralda" E
          // "pampers" no haystack).
          // ----------------------------------------------------------------
          const queryFiltered = (() => {
            if (!q) return categoryFiltered;
            const tokens = q
              .split(/\s+/)
              .map((t) => t.trim())
              .filter((t) => t.length >= 2);
            if (tokens.length === 0) return categoryFiltered;
            return categoryFiltered.filter((r) => {
              const hay = (
                (r.title || "") +
                " " +
                (r.brand || "") +
                " " +
                (r.description || "") +
                " " +
                (r.shop_name || "") +
                " " +
                (r.category_id || "")
              ).toLowerCase();
              return tokens.every((t) => hay.includes(t));
            });
          })();

          if (queryFiltered.length === 0) {
            return Response.json({
              products: [],
              nextCursor: null,
              hasMore: false,
              total: 0,
            });
          }

          // Anti-repetição: oculta produtos já vistos APENAS no primeiro round.
          // Em rounds seguintes, deixa voltar pra evitar feed vazio.
          const round0Rows =
            signals.seenProductIds.size > 0
              ? queryFiltered.filter((r) => !signals.seenProductIds.has(r.id))
              : queryFiltered;

          // Fallback: se a exclusão tirou TUDO (usuário muito ativo), usa o
          // pool completo — preferimos repetir do que mostrar tela vazia.
          const rows = round0Rows.length === 0 ? queryFiltered : round0Rows;
          if (rows.length === 0) {
            return Response.json({
              products: [],
              nextCursor: null,
              hasMore: false,
              total: 0,
            });
          }

          // Pontua + ordena (com jitter por seed)
          const rand = mulberry32(seed);
          const scored = rows.map((r) => {
            const p = normalize(r);
            const jitter = rand();
            const sc = score(
              p,
              r.popularity,
              r.conversion_rate ?? null,
              category,
              q,
              signals,
              jitter,
            );
            return { p, sc };
          });
          scored.sort((a, b) => {
            if (b.sc !== a.sc) return b.sc - a.sc;
            return a.p.id.localeCompare(b.p.id);
          });

          const ordered = scored.map((x) => x.p);
          const N = ordered.length;
          const total = N;

          // Paginação com "rounds" — vira a página e re-embaralha pra
          // continuar entregando produtos sem fim (Pinterest-style).
          const round = Math.floor(cursor / N);
          const offset = cursor % N;

          const pool =
            round === 0 ? ordered : shuffleWithSeed(ordered, seed + round * 7919);

          let slice = pool.slice(offset, offset + limit);
          if (slice.length < limit) {
            // Completa com o próximo round, evitando duplicatas dentro
            // do mesmo array de retorno
            const next = shuffleWithSeed(ordered, seed + (round + 1) * 7919);
            const seen = new Set(slice.map((p) => p.id));
            for (const p of next) {
              if (slice.length >= limit) break;
              if (!seen.has(p.id)) {
                slice.push(p);
                seen.add(p.id);
              }
            }
          }

          // Política: feed nunca termina se houver ao menos 1 produto.
          const nextCursor = cursor + slice.length;
          const hasMore = N > 0;

          // Anti-repetição: registra os produtos servidos no histórico do
          // usuário autenticado. Fire-and-forget — não bloqueia a resposta.
          if (signals.userId && slice.length > 0) {
            const userId = signals.userId;
            const historyRows = slice.map((p) => ({
              profile_id: userId,
              product_id: p.id,
            }));
            void supabase
              .from("user_feed_history")
              .insert(historyRows)
              .then(({ error: histErr }) => {
                if (histErr) {
                  console.warn("user_feed_history insert:", histErr.message);
                }
              });
          }

          return Response.json(
            {
              products: slice,
              nextCursor,
              hasMore,
              total,
            },
            {
              headers: {
                // Cache curto em CDN, revalida em background
                "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
              },
            },
          );
        } catch (e: any) {
          console.error("/api/feed erro:", e);
          return Response.json(
            { error: e?.message || "Internal", products: [], nextCursor: null, hasMore: false, total: 0 },
            { status: 500 },
          );
        }
      },
    },
  },
});
