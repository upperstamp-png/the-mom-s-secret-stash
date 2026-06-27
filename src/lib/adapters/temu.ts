import { type MarketplaceAdapter, type RawProduct } from "./index";

export class TemuAdapter implements MarketplaceAdapter {
  name = "Temu";

  async fetchOffers(queryOrCategory: string): Promise<RawProduct[]> {
    const affiliateId = process.env.TEMU_AFFILIATE_ID;

    if (!affiliateId) {
      console.log("[TemuAdapter] Credenciais ausentes. Retornando ofertas simuladas.");
      return [
        {
          title: "Brinquedo de Banho Cascata Dinossauro (Temu)",
          description: "Brinquedo interativo de sucção para diversão no banho do bebê.",
          imageUrl: "https://images.unsplash.com/photo-1515488042361-404e9250afef?w=500&auto=format&fit=crop",
          price: 29.90,
          oldPrice: 59.90,
          brand: "Temu",
          categoryId: "brinquedos",
          affiliateUrl: "https://temu.to/m/clubeachadinhos",
          available: true,
        }
      ];
    }

    try {
      // Temu Affiliate API or data feed parsing
      const url = `https://api.temu.com/affiliate/products?id=${affiliateId}&q=${encodeURIComponent(queryOrCategory)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Temu API response status: ${res.status}`);
      const data = await res.json();

      return (data.products || []).map((prod: any) => ({
        title: prod.name || "",
        description: prod.description || "Achado com super desconto na Temu.",
        imageUrl: prod.image || "",
        price: Number(prod.price) || 0,
        oldPrice: Number(prod.original_price) || Number(prod.price) || 0,
        brand: prod.brand || "Temu",
        categoryId: "tudo",
        affiliateUrl: prod.affiliate_link,
        available: true,
      }));
    } catch (err) {
      console.error("[TemuAdapter] Erro na API da Temu:", err);
      return [];
    }
  }
}
