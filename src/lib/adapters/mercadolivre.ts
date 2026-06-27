import { type MarketplaceAdapter, type RawProduct } from "./index";

export class MercadoLivreAdapter implements MarketplaceAdapter {
  name = "Mercado Livre";

  async fetchOffers(queryOrCategory: string): Promise<RawProduct[]> {
    const accessToken = process.env.MERCADOLIVRE_ACCESS_TOKEN;

    // If no credentials, use public API or return mocks
    try {
      const query = encodeURIComponent(queryOrCategory || "bebe");
      const url = `https://api.mercadolibre.com/sites/MLB/search?q=${query}&limit=10`;
      
      const headers: HeadersInit = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`ML API error status: ${res.status}`);
      const data = await res.json();

      return (data.results || []).map((item: any) => {
        const price = item.price || 0;
        const oldPrice = item.original_price || price * 1.35; // estimate savings if not given

        return {
          title: item.title || "",
          description: `Produto em oferta no Mercado Livre. Condição: ${item.condition}. Envios para todo o Brasil.`,
          imageUrl: item.thumbnail ? item.thumbnail.replace("-I.jpg", "-O.jpg") : "", // replace thumbnail size with original size
          price: Number(price),
          oldPrice: Number(oldPrice),
          brand: item.attributes?.find((a: any) => a.id === "BRAND")?.value_name || "Mercado Livre",
          categoryId: "tudo",
          affiliateUrl: item.permalink, // parameterize in production
          available: item.available_quantity > 0,
        };
      });
    } catch (err) {
      console.error("[MercadoLivreAdapter] Erro na API do Mercado Livre:", err);
      // Fallback mocks
      return [
        {
          title: "Brinquedos de Madeira Montessori (Mercado Livre)",
          description: "Set educativo que estimula coordenação e criatividade.",
          imageUrl: "https://images.unsplash.com/photo-1515488042361-404e9250afef?w=500&auto=format&fit=crop",
          price: 89.90,
          oldPrice: 189.90,
          brand: "WoodPlay",
          categoryId: "brinquedos",
          affiliateUrl: "https://mercadolivre.com.br/montessori",
          available: true,
        },
        {
          title: "Fralda Noturna Extra Absorção (Mercado Livre)",
          description: "Noites secas e tranquilas com absorção reforçada por 12h.",
          imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop",
          price: 62.90,
          oldPrice: 118.00,
          brand: "BabyDry",
          categoryId: "fraldas",
          affiliateUrl: "https://mercadolivre.com.br/diapers-night",
          available: true,
        }
      ];
    }
  }
}
