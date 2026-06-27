export interface RawProduct {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  price: number;
  oldPrice: number;
  brand: string;
  categoryId: string;
  couponCode?: string;
  affiliateUrl: string;
  available: boolean;
}

export interface MarketplaceAdapter {
  name: string;
  fetchOffers(queryOrCategory: string): Promise<RawProduct[]>;
}
