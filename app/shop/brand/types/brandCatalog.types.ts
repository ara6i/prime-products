export const SHOP_BRAND_IDS = [
  "nike",
  "adidas",
  "ganni",
  "new-balance",
  "reiss",
  "aritzia",
  "assembly-01",
  "northline",
] as const;

export type ShopBrandId = (typeof SHOP_BRAND_IDS)[number];

export type BrandSortId = "popular" | "newest" | "price-low" | "price-high";

export type BrandProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  badge?: "NEW" | "SALE";
  image: string;
  category: string;
  season: string;
  color: string;
  sizes: string[];
  styleCode: string;
  description: string;
  popularity: number;
};

export type BrandCatalog = {
  id: ShopBrandId;
  name: string;
  shortName: string;
  logo?: string;
  descriptor: string;
  products: BrandProduct[];
};

export type ActiveBrandFilters = {
  categories: string[];
  seasons: string[];
  colors: string[];
  sizes: string[];
  price: "all" | "under-125" | "125-175" | "over-175";
};
