import type { IconProps } from "@/app/shared/types";
import type { FilterFacetCounts } from "@/app/shared/types";

export interface OccasionCategory {
  id: string;
  name: string;
  imageUrl: string;
}

export interface SeasonCategory {
  id: string;
  name: string;
  icon: React.ComponentType<IconProps>;
  gradient: string;
}

export interface ClothingCategory {
  id: string;
  name: string;
  icon: React.ComponentType<IconProps>;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  isSaved: boolean;
  affiliateUrl?: string | null;
}

export interface OccasionOutfit {
  id: string;
  title: string;
  itemCount: number;
  totalPrice: number;
  products: CatalogProduct[];
}

export type GenderTab = "ladies" | "gents";

export interface BackendProduct {
  product_id: string;
  name: string;
  brand: string;
  price: number;
  image_urls: string[];
  affiliate_url?: string | null;
  gender?: string;
  category?: string;
  parentCategory?: string;
  color?: string;
  season?: string;
  occasion?: string[];
  stock_status?: string;
  is_virtual_tryon_supported?: boolean;
}

export interface ProductsApiResponse {
  items: BackendProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets?: FilterFacetCounts;
  searchInterpretation?: CatalogSearchInterpretation;
}

export interface CatalogSearchInterpretation {
  query: string;
  mode: "gpt-filter" | "backend-filter" | "backend-text";
  filters?: {
    gender?: "female" | "male" | "unisex" | null;
    [key: string]: unknown;
  };
}

export interface CatalogFacetsApiResponse {
  facets: FilterFacetCounts;
  searchInterpretation?: CatalogSearchInterpretation;
}

export interface CuratedOutfitProduct {
  product_id: string;
  role: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
  color?: string;
  affiliate_url?: string | null;
}

export interface CuratedOutfitItem {
  id: string;
  occasion: string;
  gender: string;
  season: string;
  title: string;
  total_price: number;
  color_palette: string[];
  products: CuratedOutfitProduct[];
}

export interface CuratedOutfitsApiResponse {
  items: CuratedOutfitItem[];
  total: number;
  totalPages: number;
  page: number;
}
