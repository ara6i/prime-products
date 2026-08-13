/** Steps in the try-on flow */
export type Step = "choose-model" | "try-on";

/** Tabs within the selection panel */
export type SelectionTab = "choose-model" | "upload-photo";

/** Body type filter for model selection */
export type BodyType = "full-body" | "close-up";

/** Tabs within the catalog panel (try-on step) */
export type CatalogTab = "catalog" | "my-closet" | "saved-outfits";

/** Clothing category filters */
export type ClothingCategory = "upper-body" | "lower-body" | "full-body" | "accessories";

/** A product in the catalog (frontend shape) */
export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: ClothingCategory;
  isSaved: boolean;
  affiliateUrl?: string | null;
}

/** A saved outfit from try-on or AI stylist (frontend shape) */
export interface SavedOutfit {
  id: string;
  name: string;
  imageUrl: string;
  date: string;
  tags: string[];
  pieceCount: number;
  products: OutfitProduct[];
}

/** A product embedded in a saved outfit */
export interface OutfitProduct {
  id: string;
  name: string;
  imageUrl: string;
  brand: string;
  price: number;
  category: string;
  affiliateUrl?: string | null;
}

/** A gallery item from My Closet (previous try-on results) */
export interface ClosetItem {
  id: string;
  imageUrl: string;
  date: string;
  products: OutfitProduct[];
}

/** Product detail needed for VTO generation */
export interface TryOnProductDetail {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  brand: string;
  price: number;
  affiliateUrl?: string | null;
}

/** Try-on generation status */
export type TryOnStatus = "idle" | "generating" | "completed" | "error";
