export type LandingClothingCategory = "upper-body" | "lower-body" | "shoes";

export type TryOnPhase = "idle" | "generating" | "complete" | "already_used" | "failed";

export interface LandingProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: LandingClothingCategory;
}

export interface LandingModel {
  id: string;
  imageUrl: string;
  alt: string;
}
