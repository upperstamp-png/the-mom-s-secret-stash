import { type MarketplaceAdapter, type RawProduct } from "./index";
import crypto from "crypto";

export class ShopeeAdapter implements MarketplaceAdapter {
  name = "Shopee";

  async fetchOffers(queryOrCategory: string): Promise<RawProduct[]> {
    const appId = process.env.SHOPEE_APP_ID;
    const appSecret = process.env.SHOPEE_APP_SECRET;

    if (!appId || !appSecret) {
      console.log("[ShopeeAdapter] Credenciais ausentes. Retornando ofertas simuladas.");
      return [
        {
          title: "Kit Body Algodão Orgânico (5 peças) (Shopee)",
          description: "Conjunto de bodies em algodão pima, super respirável e durável.",
          imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop",
          price: 79.90,
          oldPrice: 149.90,
          brand: "Tiny Co.",
          categoryId: "roupas",
          couponCode: "BODY30",
          affiliateUrl: "https://shopee.com.br/universal-link/kit-body-cotton",
          available: true,
        },
        {
          title: "Tênis Primeiros Passos Antiderrapante (Shopee)",
          description: "Sola flexível e antiderrapante, perfeito para os primeiros passinhos.",
          imageUrl: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=500&auto=format&fit=crop",
          price: 64.90,
          oldPrice: 129.90,
          brand: "StepUp",
          categoryId: "calcados",
          couponCode: "STEP20",
          affiliateUrl: "https://shopee.com.br/universal-link/shoes-stepup",
          available: true,
        }
      ];
    }

    try {
      // Shopee OpenAPI Open API v2 implementation
      // Reference: https://open.shopee.com/documents
      const path = "/api/v2/affiliate/search_product";
      const timestamp = Math.floor(Date.now() / 1000);
      const url = `https://open.shopee.com${path}`;
      
      const payload = {
        keyword: queryOrCategory,
        limit: 10,
        page: 1,
      };

      // Sign the request
      const baseString = `${appId}${path}${timestamp}${JSON.stringify(payload)}`;
      const signature = crypto.createHmac("sha256", appSecret).update(baseString).digest("hex");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": signature,
          "Timestamp": String(timestamp),
          "App-Key": appId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Shopee response error: ${res.status}`);
      const data = await res.json();

      return (data.response?.products || []).map((prod: any) => ({
        title: prod.product_name || "",
        description: prod.product_description || "",
        imageUrl: prod.image || "",
        price: Number(prod.price) || 0,
        oldPrice: Number(prod.price_before_discount) || Number(prod.price) || 0,
        brand: prod.brand || "Shopee",
        categoryId: "tudo",
        affiliateUrl: prod.affiliate_link || prod.item_url,
        available: true,
      }));
    } catch (err) {
      console.error("[ShopeeAdapter] Erro na API da Shopee:", err);
      return [];
    }
  }
}
