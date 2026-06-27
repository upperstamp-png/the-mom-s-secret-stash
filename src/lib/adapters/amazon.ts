import { type MarketplaceAdapter, type RawProduct } from "./index";

export class AmazonAdapter implements MarketplaceAdapter {
  name = "Amazon";

  async fetchOffers(queryOrCategory: string): Promise<RawProduct[]> {
    const partnerTag = process.env.AMAZON_PARTNER_TAG;
    const accessKey = process.env.AMAZON_ACCESS_KEY;
    const secretKey = process.env.AMAZON_SECRET_KEY;

    if (!partnerTag || !accessKey || !secretKey) {
      // Dev mode placeholder fallback
      console.log("[AmazonAdapter] Credenciais ausentes. Retornando ofertas simuladas.");
      return [
        {
          title: "Fralda Premium Toque Macio — Pacote Mega (Amazon)",
          description: "A fralda mais vendida da Amazon com desconto exclusivo.",
          imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop",
          price: 54.90,
          oldPrice: 109.90,
          brand: "BabyDry",
          categoryId: "fraldas",
          couponCode: "MAMAE50",
          affiliateUrl: "https://amazon.com.br/dp/B0XDFHJ72?tag=clubeachadinhos-20",
          available: true,
        },
        {
          title: "Kit Mamadeiras Anticólica (4 un.) (Amazon)",
          description: "Sistema anticólica avançado, bicos ultra suaves.",
          imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop",
          price: 119.90,
          oldPrice: 219.90,
          brand: "SoftFeed",
          categoryId: "mamadeiras",
          affiliateUrl: "https://amazon.com.br/dp/B0XDFHJ88?tag=clubeachadinhos-20",
          available: true,
        }
      ];
    }

    try {
      // In production, sign and invoke Amazon Product Advertising API (PA-API v5)
      // Reference: https://webservices.amazon.com/paapi5/documentation/search-items.html
      const host = "webservices.amazon.com.br";
      const uri = "/paapi5/searchitems";
      
      const payload = {
        Keywords: queryOrCategory,
        PartnerTag: partnerTag,
        PartnerType: "Associates",
        Marketplace: "www.amazon.com.br",
        Resources: [
          "Images.Primary.Large",
          "ItemInfo.Title",
          "ItemInfo.Features",
          "ItemInfo.ByLineInfo",
          "Offers.Listings.Price"
        ]
      };

      // Professional implementation of AWS V4 Signature would occur here
      // For sandbox readiness, we output logs and run requests
      const res = await fetch(`https://${host}${uri}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-amz-target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
          // AWS Signature headers go here
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      return (data.SearchResult?.Items || []).map((item: any) => {
        const listing = item.Offers?.Listings?.[0];
        const price = listing?.Price?.Amount || 0;
        const oldPrice = listing?.SavingBasis?.Amount || price;

        return {
          title: item.ItemInfo?.Title?.DisplayValue || "",
          description: item.ItemInfo?.Features?.DisplayValues?.join(". ") || "",
          imageUrl: item.Images?.Primary?.Large?.URL || "",
          price: Number(price),
          oldPrice: Number(oldPrice),
          brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || "Amazon",
          categoryId: "tudo",
          affiliateUrl: item.DetailPageURL,
          available: true,
        };
      });
    } catch (err) {
      console.error("[AmazonAdapter] Erro na API da Amazon:", err);
      return [];
    }
  }
}
