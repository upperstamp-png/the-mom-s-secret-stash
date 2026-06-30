import diapers from "@/assets/p-diapers.jpg";
import clothes from "@/assets/p-clothes.jpg";
import toys from "@/assets/p-toys.jpg";
import stroller from "@/assets/p-stroller.jpg";
import bottles from "@/assets/p-bottles.jpg";
import shoes from "@/assets/p-shoes.jpg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type CategoryId =
  | "fraldas"
  | "roupas"
  | "calcados"
  | "brinquedos"
  | "mamadeiras"
  | "carrinhos"
  | "escolar"
  | "promocoes"
  | "tudo";

export interface Category {
  id: CategoryId;
  label: string;
  icon: string; // lucide icon name
}

export const CATEGORIES: Category[] = [
  { id: "tudo", label: "Tudo", icon: "Sparkles" },
  { id: "fraldas", label: "Fraldas", icon: "Baby" },
  { id: "roupas", label: "Roupas", icon: "Shirt" },
  { id: "calcados", label: "Calçados", icon: "Footprints" },
  { id: "brinquedos", label: "Brinquedos", icon: "ToyBrick" },
  { id: "mamadeiras", label: "Mamadeiras", icon: "Milk" },
  { id: "carrinhos", label: "Carrinhos", icon: "Truck" },
  { id: "escolar", label: "Material Escolar", icon: "Pencil" },
  { id: "promocoes", label: "Promoções", icon: "Flame" },
];

export interface Product {
  id: string;
  title: string;
  image: string;
  video?: string;
  price: number;
  oldPrice: number;
  marketplace: string;
  brand: string;
  category: CategoryId;
  coupon?: string;
  vipOnly?: boolean;
  hot?: boolean;
  description: string;
  affiliateLink?: string;
  // Shopee-enriched (optional — undefined for non-Shopee items)
  rating?: number;
  ratingCount?: number;
  salesCount?: number;
  freeShipping?: boolean;
  flashSale?: boolean;
  shopName?: string;
  commissionRate?: number;
}

const brl = (n: number) => n;

export const PRODUCTS: Product[] = [
  {
    id: "1",
    title: "Fralda Premium Toque Macio — Pacote Mega",
    image: diapers,
    price: brl(54.9),
    oldPrice: brl(109.9),
    marketplace: "Amazon",
    brand: "BabyDry",
    category: "fraldas",
    coupon: "MAMAE50",
    hot: true,
    description:
      "Pacote mega com proteção de 12 horas e toque ultra macio. Achadinho que some rápido!",
  },
  {
    id: "2",
    title: "Kit Body Algodão Orgânico (5 peças)",
    image: clothes,
    price: brl(79.9),
    oldPrice: brl(149.9),
    marketplace: "Shopee",
    brand: "Tiny Co.",
    category: "roupas",
    coupon: "BODY30",
    description:
      "Conjunto de bodies em algodão pima, super respirável e durável. Tons neutros lindos.",
  },
  {
    id: "3",
    title: "Brinquedos de Madeira Montessori",
    image: toys,
    price: brl(89.9),
    oldPrice: brl(189.9),
    marketplace: "Mercado Livre",
    brand: "WoodPlay",
    category: "brinquedos",
    hot: true,
    description:
      "Set educativo que estimula coordenação e criatividade. Material sustentável e seguro.",
  },
  {
    id: "4",
    title: "Carrinho 3 em 1 Compacto Dobrável",
    image: stroller,
    price: brl(799.0),
    oldPrice: brl(1499.0),
    marketplace: "Magalu",
    brand: "RollBaby",
    category: "carrinhos",
    coupon: "ROLL200",
    vipOnly: true,
    description:
      "Dobra com uma mão, super leve e com reclínio total. Oferta limitada do Clube.",
  },
  {
    id: "5",
    title: "Kit Mamadeiras Anticólica (4 un.)",
    image: bottles,
    price: brl(119.9),
    oldPrice: brl(219.9),
    marketplace: "Amazon",
    brand: "SoftFeed",
    category: "mamadeiras",
    description:
      "Sistema anticólica avançado, bicos ultra suaves que imitam a amamentação.",
  },
  {
    id: "6",
    title: "Tênis Primeiros Passos Antiderrapante",
    image: shoes,
    price: brl(64.9),
    oldPrice: brl(129.9),
    marketplace: "Shopee",
    brand: "StepUp",
    category: "calcados",
    coupon: "STEP20",
    hot: true,
    description:
      "Sola flexível e antiderrapante, perfeito para os primeiros passinhos.",
  },
  {
    id: "7",
    title: "Fralda Noturna Extra Absorção",
    image: diapers,
    price: brl(62.9),
    oldPrice: brl(118.0),
    marketplace: "Mercado Livre",
    brand: "BabyDry",
    category: "fraldas",
    description: "Noites secas e tranquilas com absorção reforçada por 12h.",
  },
  {
    id: "8",
    title: "Macacão Plush Inverno Aconchego",
    image: clothes,
    price: brl(94.9),
    oldPrice: brl(179.9),
    marketplace: "Magalu",
    brand: "Tiny Co.",
    category: "roupas",
    coupon: "PLUSH40",
    vipOnly: true,
    description: "Quentinho, macio e estiloso. Edição limitada do Clube VIP.",
  },
  {
    id: "9",
    title: "Cubo de Atividades Sensorial",
    image: toys,
    price: brl(72.9),
    oldPrice: brl(139.9),
    marketplace: "Amazon",
    brand: "WoodPlay",
    category: "brinquedos",
    description: "Várias texturas e cores para estimular os sentidos do bebê.",
  },
  {
    id: "10",
    title: "Copo de Transição com Alça",
    image: bottles,
    price: brl(39.9),
    oldPrice: brl(79.9),
    marketplace: "Shopee",
    brand: "SoftFeed",
    category: "mamadeiras",
    coupon: "COPO15",
    hot: true,
    description: "Antivazamento e fácil de segurar. A transição perfeita.",
  },
  {
    id: "11",
    title: "Sapatinho Couro Ecológico",
    image: shoes,
    price: brl(49.9),
    oldPrice: brl(99.9),
    marketplace: "Mercado Livre",
    brand: "StepUp",
    category: "calcados",
    description: "Confortável e respirável, com acabamento premium.",
  },
  {
    id: "12",
    title: "Mochila Escolar Térmica Infantil",
    image: clothes,
    price: brl(84.9),
    oldPrice: brl(159.9),
    marketplace: "Magalu",
    brand: "SchoolDay",
    category: "escolar",
    coupon: "ESCOLA25",
    description: "Compartimento térmico e design fofo. De volta às aulas!",
  },
];

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Marketing rule: if the database has no real "old price" (i.e. oldPrice is
 * missing, equal to, or below the current price), inflate it by +30% so the
 * shopper always sees a visible discount and savings amount. When the catalog
 * already has a legitimate higher anchor price, we keep it as-is.
 */
const MARKUP_FACTOR = 1.3;

export function displayOldPrice(p: Pick<Product, "price" | "oldPrice">): number {
  if (p.oldPrice && p.oldPrice > p.price) return p.oldPrice;
  return Math.round(p.price * MARKUP_FACTOR * 100) / 100;
}

export function savingsAmount(p: Pick<Product, "price" | "oldPrice">): number {
  return Math.max(0, displayOldPrice(p) - p.price);
}

export function savingsPercent(p: Pick<Product, "price" | "oldPrice">): number {
  const ref = displayOldPrice(p);
  if (ref <= 0) return 0;
  return Math.round((1 - p.price / ref) * 100);
}

export function getProductById(id: string): Product | undefined {
  const cleanId = id.split("-")[0];
  return PRODUCTS.find((p) => p.id === cleanId);
}

export function useRecommendedProducts() {
  return useQuery({
    queryKey: ["products", "recommended"],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        const res = await fetch("/api/recommendations", { headers });
        if (!res.ok) throw new Error("Failed to fetch recommended products");
        const data = await res.json();
        return data.products as Product[];
      } catch (err) {
        console.error("Erro ao carregar produtos recomendados:", err);
        // Fallback to static mock PRODUCTS if database fetch fails
        return PRODUCTS;
      }
    },
  });
}

export function useProduct(id: string) {
  const cleanId = id.split("-")[0];
  const isUuid = cleanId.match(/^[0-9a-fA-F-]{36}$/) !== null;

  return useQuery({
    queryKey: ["product", cleanId],
    queryFn: async () => {
      if (!isUuid) {
        // Fallback to mock product if the ID is not a UUID
        const mockProduct = getProductById(cleanId);
        if (mockProduct) return mockProduct;
        throw new Error("Product not found");
      }

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          title,
          description,
          image_url,
          video_url,
          price,
          old_price,
          marketplace,
          category_id,
          brand,
          coupon_id,
          cashback,
          affiliate_link,
          vip_only,
          hot,
          slug,
          rating,
          rating_count,
          sales_count,
          free_shipping,
          flash_sale,
          shop_name,
          commission_rate,
          coupons (code)
        `)
        .eq("id", cleanId)
        .single();

      if (error || !data) throw new Error("Product not found in database");

      // Supabase typings model a 1-to-1 FK join as an array — flatten it.
      const couponRel = Array.isArray((data as any).coupons)
        ? (data as any).coupons?.[0]
        : (data as any).coupons;

      return {
        id: data.id,
        title: data.title,
        description: data.description || "",
        image: data.image_url,
        video: data.video_url || undefined,
        price: Number(data.price),
        oldPrice: Number(data.old_price),
        marketplace: data.marketplace,
        brand: data.brand || "",
        category: data.category_id as CategoryId,
        coupon: couponRel?.code || undefined,
        vipOnly: data.vip_only,
        hot: data.hot,
        affiliateLink: data.affiliate_link || undefined,
        rating: data.rating != null ? Number(data.rating) : undefined,
        ratingCount: data.rating_count != null ? Number(data.rating_count) : undefined,
        salesCount: data.sales_count != null ? Number(data.sales_count) : undefined,
        freeShipping: data.free_shipping ?? undefined,
        flashSale: data.flash_sale ?? undefined,
        shopName: data.shop_name || undefined,
        commissionRate: data.commission_rate != null ? Number(data.commission_rate) : undefined,
      } as Product;
    },
    enabled: !!cleanId,
  });
}

/**
 * Fetches full product data for a list of favorite IDs directly from Supabase.
 * Used by the favorites page so saved products always show up, even when they
 * are not part of the current recommendations slice.
 */
export function useFavoriteProducts(ids: string[]) {
  const sortedKey = [...ids].sort().join(",");

  return useQuery({
    queryKey: ["products", "byIds", sortedKey],
    queryFn: async (): Promise<Product[]> => {
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          title,
          description,
          image_url,
          video_url,
          price,
          old_price,
          marketplace,
          category_id,
          brand,
          vip_only,
          hot,
          affiliate_link,
          rating,
          rating_count,
          sales_count,
          free_shipping,
          flash_sale,
          shop_name,
          commission_rate,
          coupons (code)
        `)
        .in("id", ids);

      if (error || !data) return [];

      const map = new Map<string, Product>();
      for (const p of data as any[]) {
        map.set(p.id, {
          id: p.id,
          title: p.title,
          description: p.description || "",
          image: p.image_url,
          video: p.video_url || undefined,
          price: Number(p.price),
          oldPrice: Number(p.old_price),
          marketplace: p.marketplace,
          brand: p.brand || "",
          category: p.category_id as CategoryId,
          coupon: p.coupons?.code || undefined,
          vipOnly: p.vip_only,
          hot: p.hot,
          affiliateLink: p.affiliate_link || undefined,
          rating: p.rating != null ? Number(p.rating) : undefined,
          ratingCount: p.rating_count != null ? Number(p.rating_count) : undefined,
          salesCount: p.sales_count != null ? Number(p.sales_count) : undefined,
          freeShipping: p.free_shipping ?? undefined,
          flashSale: p.flash_sale ?? undefined,
          shopName: p.shop_name || undefined,
          commissionRate: p.commission_rate != null ? Number(p.commission_rate) : undefined,
        });
      }

      // Preserve the order in which the user favorited them.
      return ids.map((id) => map.get(id)).filter((p): p is Product => Boolean(p));
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}
