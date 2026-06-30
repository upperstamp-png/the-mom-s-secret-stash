import { getAdminClient } from "../supabase-admin";
import type { CategoryId } from "../products";
import {
  shopeeImageUrl,
  shopeeOldPrice,
  type ShopeeProductNode,
} from "./types";
import { categoryFromKeyword } from "./keywords";// ---------------------------------------------------------------------------
// Ingestion — turn raw Shopee API nodes into rows in `public.products`.
//
// All writes use the service-role client so RLS doesn't get in the way, and
// every insert is idempotent: `shopee_item_id` is the natural key and we
// upsert on conflict (defined in the migration via `ux_products_shopee_item`).
//
// We also record a `price_history` row whenever the new price differs from
// the price already stored, so the dashboard can chart drops over time.
// ---------------------------------------------------------------------------

const MARKETPLACE = "Shopee";

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Build a unique slug — Shopee item ids are stable & globally unique. */
function buildSlug(title: string, itemId: string | number): string {
  const base = slugify(title) || "produto";
  return `${base}-${itemId}`;
}

export interface IngestionStats {
  considered: number;
  inserted: number;
  updated: number;
  skipped: number;
  priceChanges: number;
  error?: string;
}

interface InternalRow {
  shopee_item_id: number;
  shopee_shop_id: number;
  title: string;
  description: string;
  image_url: string;
  marketplace: string;
  brand: string;
  category_id: CategoryId | null;
  price: number;
  old_price: number;
  affiliate_link: string;
  product_link: string;
  slug: string;
  available: boolean;
  hot: boolean;
  vip_only: boolean;
  sales_count: number;
  rating: number | null;
  rating_count: number;
  shop_name: string;
  shop_type: number | null;
  commission_rate: number;
  free_shipping: boolean;
  flash_sale: boolean;
  image_urls: { extras: string[] } | null;
  period_start_at: string | null;
  period_end_at: string | null;
  last_fetched_at: string;
}

function mapNode(node: ShopeeProductNode, keyword: string): InternalRow | null {
  const itemId = toNum(node.itemId);
  const shopId = toNum(node.shopId);
  if (!itemId || !shopId || !node.productName) return null;

  const offerLink = (node.offerLink || node.productLink || "").trim();
  const imageHash = (node.imageUrl || "").trim();
  if (!offerLink || !imageHash) return null;

  const priceMin = toNum(node.priceMin);
  if (priceMin <= 0) return null;

  const discount = toNum(node.priceDiscountRate);
  const oldPrice = Math.max(priceMin, shopeeOldPrice(priceMin, discount));

  const periodStart = node.periodStartTime ? new Date(node.periodStartTime * 1000) : null;
  const periodEnd = node.periodEndTime ? new Date(node.periodEndTime * 1000) : null;
  const now = Date.now();
  const flashSale =
    !!periodEnd && periodEnd.getTime() > now && (!periodStart || periodStart.getTime() <= now);

  const inferredCategory = categoryFromKeyword(keyword);
  // "tudo" e "promocoes" não são categorias do feed-content; fallback p/ title.
  const fallbackFromTitle = categoryFromKeyword(node.productName);
  const finalCategory: CategoryId | null =
    inferredCategory !== "tudo" && inferredCategory !== "promocoes"
      ? inferredCategory
      : fallbackFromTitle !== "tudo" && fallbackFromTitle !== "promocoes"
        ? fallbackFromTitle
        : null;
  const sales = toNum(node.sales);
  const rating = node.ratingStar != null ? toNum(node.ratingStar) : NaN;
  const shopType = typeof node.shopType === "number" ? node.shopType : null;
  // Shopee Mall / preferred shops typically include free shipping promos.
  const freeShipping = shopType === 2 || shopType === 3 || shopType === 4;

  const extras =
    Array.isArray(node.images) && node.images.length > 0
      ? node.images.map(shopeeImageUrl).filter(Boolean)
      : [];

  return {
    shopee_item_id: itemId,
    shopee_shop_id: shopId,
    title: node.productName.trim().slice(0, 280),
    description: node.productName.trim().slice(0, 500),
    image_url: shopeeImageUrl(imageHash),
    marketplace: MARKETPLACE,
    brand: (node.shopName || "Shopee").slice(0, 80),
    category_id: finalCategory,
    price: Math.round(priceMin * 100) / 100,
    old_price: Math.round(oldPrice * 100) / 100,
    affiliate_link: offerLink,
    product_link: node.productLink || offerLink,
    slug: buildSlug(node.productName, itemId),
    available: true,
    hot: discount >= 30 || sales >= 1000,
    vip_only: false,
    sales_count: sales,
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    rating_count: 0,
    shop_name: (node.shopName || "").slice(0, 120),
    shop_type: shopType,
    commission_rate: toNum(node.commissionRate),
    free_shipping: freeShipping,
    flash_sale: flashSale,
    image_urls: extras.length > 0 ? { extras } : null,
    period_start_at: periodStart ? periodStart.toISOString() : null,
    period_end_at: periodEnd ? periodEnd.toISOString() : null,
    last_fetched_at: new Date().toISOString(),
  };
}

interface ExistingRow {
  id: string;
  shopee_item_id: number;
  price: number;
  old_price: number;
}

/** Bulk-ingest Shopee nodes — idempotent upsert + price history capture. */
export async function ingestShopeeNodes(
  nodes: ShopeeProductNode[],
  keyword: string,
): Promise<IngestionStats> {
  const stats: IngestionStats = {
    considered: nodes.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    priceChanges: 0,
  };
  if (nodes.length === 0) return stats;

  const admin = getAdminClient();
  const rows: InternalRow[] = [];

  for (const node of nodes) {
    const mapped = mapNode(node, keyword);
    if (!mapped) {
      stats.skipped += 1;
      continue;
    }
    rows.push(mapped);
  }

  if (rows.length === 0) return stats;

  // Pre-fetch existing rows so we can decide insert vs. update + price changes.
  const ids = rows.map((r) => r.shopee_item_id);
  const { data: existingData } = await admin
    .from("products")
    .select("id, shopee_item_id, price, old_price")
    .in("shopee_item_id", ids);

  const existing = new Map<number, ExistingRow>();
  for (const row of (existingData ?? []) as ExistingRow[]) {
    existing.set(row.shopee_item_id, row);
  }

  // Postgres não suporta `ON CONFLICT` em índices parciais (e o índice
  // ux_products_shopee_item é WHERE shopee_item_id IS NOT NULL), então
  // fazemos split manual: rows com shopee_item_id já no banco → UPDATE,
  // resto → INSERT.
  const toInsert: InternalRow[] = [];
  const toUpdate: InternalRow[] = [];
  for (const row of rows) {
    if (existing.has(row.shopee_item_id)) toUpdate.push(row);
    else toInsert.push(row);
  }

  const insertedById = new Map<number, { id: string; price: number }>();
  const updatedById = new Map<number, { id: string; price: number }>();

  if (toInsert.length > 0) {
    const { data, error } = await admin
      .from("products")
      .insert(toInsert)
      .select("id, shopee_item_id, price");
    if (error) {
      console.error(
        "[shopee-ingest] insert failed:",
        error.message,
        error.details,
        error.hint,
      );
      (stats as IngestionStats & { error?: string }).error =
        `insert: ${error.message}${error.details ? " — " + error.details : ""}${error.hint ? " (" + error.hint + ")" : ""}`;
      // Continue to update path — don't bail entirely.
    } else {
      for (const r of data ?? []) {
        insertedById.set((r as { shopee_item_id: number }).shopee_item_id, {
          id: (r as { id: string }).id,
          price: (r as { price: number }).price,
        });
      }
    }
  }

  for (const row of toUpdate) {
    const ex = existing.get(row.shopee_item_id);
    if (!ex) continue;
    const { error: updErr } = await admin
      .from("products")
      .update({
        title: row.title,
        description: row.description,
        image_url: row.image_url,
        price: row.price,
        old_price: row.old_price,
        marketplace: row.marketplace,
        brand: row.brand,
        category_id: row.category_id,
        affiliate_link: row.affiliate_link,
        product_link: row.product_link,
        available: row.available,
        hot: row.hot,
        sales_count: row.sales_count,
        rating: row.rating,
        rating_count: row.rating_count,
        shop_name: row.shop_name,
        shop_type: row.shop_type,
        commission_rate: row.commission_rate,
        free_shipping: row.free_shipping,
        flash_sale: row.flash_sale,
        image_urls: row.image_urls,
        period_start_at: row.period_start_at,
        period_end_at: row.period_end_at,
        last_fetched_at: row.last_fetched_at,
      })
      .eq("id", ex.id);
    if (updErr) {
      // Non-fatal — log only.
      console.warn(
        "[shopee-ingest] update failed for item",
        row.shopee_item_id,
        updErr.message,
      );
    } else {
      updatedById.set(row.shopee_item_id, { id: ex.id, price: row.price });
    }
  }

  // Stats + price history
  const priceHistory: Array<{ product_id: string; price: number }> = [];
  for (const row of rows) {
    const wasExisting = existing.get(row.shopee_item_id);
    if (wasExisting) {
      stats.updated += 1;
      if (Math.abs(wasExisting.price - row.price) > 0.005) {
        stats.priceChanges += 1;
        const stored = updatedById.get(row.shopee_item_id);
        if (stored) priceHistory.push({ product_id: stored.id, price: row.price });
      }
    } else {
      const stored = insertedById.get(row.shopee_item_id);
      if (stored) {
        stats.inserted += 1;
        priceHistory.push({ product_id: stored.id, price: row.price });
        stats.priceChanges += 1;
      }
    }
  }

  if (priceHistory.length > 0) {
    const { error: phErr } = await admin.from("price_history").insert(priceHistory);
    if (phErr) {
      // Non-fatal — log only.
      console.warn("[shopee-ingest] price_history insert failed:", phErr.message);
    }
  }

  return stats;
}
