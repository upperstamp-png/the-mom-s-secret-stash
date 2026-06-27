import { type MarketplaceAdapter, type RawProduct } from "./index";

export class AliExpressAdapter implements MarketplaceAdapter {
  name = "AliExpress";

  async fetchOffers(queryOrCategory: string): Promise<RawProduct[]> {
    const apiKey = process.env.ALIEXPRESS_API_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;

    if (!apiKey || !appSecret) {
      console.log("[AliExpressAdapter] Credenciais ausentes. Retornando ofertas simuladas.");
      return [
        {
          title: "Conjunto Sensorial Montessori (AliExpress)",
          description: "Kit educativo sensorial importado de alta qualidade para desenvolvimento de bebês.",
          imageUrl: "https://images.unsplash.com/photo-1515488042361-404e9250afef?w=500&auto=format&fit=crop",
          price: 49.90,
          oldPrice: 99.90,
          brand: "AliExpress",
          categoryId: "brinquedos",
          affiliateUrl: "https://s.click.aliexpress.com/e/sensorial-montessori",
          available: true,
        }
      ];
    }

    try {
      // AliExpress Portals API integration
      // Reference: https://portals.aliexpress.com/help/help_center_API.html
      const url = `https://api.aliexpress.com/router/rest?method=ae.open.affiliate.product.query&app_key=${apiKey}&keywords=${encodeURIComponent(queryOrCategory)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`AliExpress response status: ${res.status}`);
      const data = await res.json();

      return (data.resp_result?.result?.products || []).map((prod: any) => ({
        title: prod.product_title || "",
        description: prod.product_description || "Oferta internacional do AliExpress.",
        imageUrl: prod.product_main_image_url || "",
        price: Number(prod.target_sale_price) || 0,
        oldPrice: Number(prod.target_original_price) || Number(prod.target_sale_price) || 0,
        brand: prod.brand || "AliExpress",
        categoryId: "tudo",
        affiliateUrl: prod.promotion_link || prod.product_detail_url,
        available: true,
      }));
    } catch (err) {
      console.error("[AliExpressAdapter] Erro na API do AliExpress:", err);
      return [];
    }
  }
}
