import { type MarketplaceAdapter, type RawProduct } from "./index";

export class SheinAdapter implements MarketplaceAdapter {
  name = "Shein";

  async fetchOffers(queryOrCategory: string): Promise<RawProduct[]> {
    const devId = process.env.SHEIN_DEV_ID;

    if (!devId) {
      console.log("[SheinAdapter] Credenciais ausentes. Retornando ofertas simuladas.");
      return [
        {
          title: "Conjunto Infantil Conforto 2 Peças (Shein)",
          description: "Kit macio de camiseta e shorts 100% algodão para o dia a dia.",
          imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop",
          price: 39.90,
          oldPrice: 79.90,
          brand: "Shein Kids",
          categoryId: "roupas",
          affiliateUrl: "https://shein.com/universal-link/kids-set",
          available: true,
        }
      ];
    }

    try {
      // Shein Open API integration
      const url = `https://open-api.shein.com/affiliate/products?dev_id=${devId}&q=${encodeURIComponent(queryOrCategory)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Shein API response status: ${res.status}`);
      const data = await res.json();

      return (data.products || []).map((prod: any) => ({
        title: prod.product_name || "",
        description: prod.product_description || "Roupas infantis estilosas na Shein.",
        imageUrl: prod.main_image || "",
        price: Number(prod.sale_price) || 0,
        oldPrice: Number(prod.retail_price) || Number(prod.sale_price) || 0,
        brand: prod.brand || "Shein",
        categoryId: "tudo",
        affiliateUrl: prod.promotion_link,
        available: true,
      }));
    } catch (err) {
      console.error("[SheinAdapter] Erro na API da Shein:", err);
      return [];
    }
  }
}
