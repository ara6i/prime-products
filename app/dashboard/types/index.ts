export type TryOnStatus = "processing" | "ready";

export interface TryOnCardData {
  id: string;
  imageUrl: string;
  status: TryOnStatus;
  itemCount: number;
  price: string;
  href: string;
}

export interface OutfitProduct {
  productId: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: string;
  affiliateUrl?: string;
}

export interface TryOnDetailData extends TryOnCardData {
  products: OutfitProduct[];
  createdAt: string;
}
