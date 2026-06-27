import { type MarketplaceAdapter, type RawProduct } from "./index";

export class MagaluAdapter implements MarketplaceAdapter {
  name = "Magalu";

  async fetchOffers(queryOrCategory: string): Promise<RawProduct[]> {
    const feedUrl = process.env.MAGALU_FEED_URL;

    if (!feedUrl) {
      console.log("[MagaluAdapter] Feed URL ausente. Retornando ofertas simuladas.");
      return [
        {
          title: "Carrinho 3 em 1 Compacto Dobrável (Magalu)",
          description: "Dobra com uma mão, super leve e com reclínio total.",
          imageUrl: "https://images.unsplash.com/photo-1591938424202-7c37b755f718?w=500&auto=format&fit=crop",
          price: 799.00,
          oldPrice: 1499.00,
          brand: "RollBaby",
          categoryId: "carrinhos",
          couponCode: "ROLL200",
          affiliateUrl: "https://magazinevoce.com.br/clubeachadinhos/carrinho-rollbaby",
          available: true,
        },
        {
          title: "Macacão Plush Inverno Aconchego (Magalu)",
          description: "Quentinho, macio e estiloso. Edição limitada do Clube VIP.",
          imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop",
          price: 94.90,
          oldPrice: 179.90,
          brand: "Tiny Co.",
          categoryId: "roupas",
          couponCode: "PLUSH40",
          affiliateUrl: "https://magazinevoce.com.br/clubeachadinhos/macacao-plush",
          available: true,
        }
      ];
    }

    try {
      // Magalu affiliate XML/JSON feed parsing
      const res = await fetch(feedUrl);
      if (!res.ok) throw new Error(`Magalu feed error status: ${res.status}`);
      const data = await res.json(); // assuming JSON format, fallback to XML parser if needed

      return (data.products || []).map((item: any) => ({
        title: item.title || "",
        description: item.description || "",
        imageUrl: item.image_url || "",
        price: Number(item.price) || 0,
        oldPrice: Number(item.original_price) || Number(item.price) || 0,
        brand: item.brand || "Magalu",
        categoryId: "tudo",
        affiliateUrl: item.affiliate_link || item.url,
        available: item.stock > 0,
      }));
    } catch (err) {
      console.error("[MagaluAdapter] Erro na API da Magalu:", err);
      return [];
    }
  }
}
