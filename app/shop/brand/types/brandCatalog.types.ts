export const SHOP_BRAND_IDS = [
  "judy-blue",
  "zenana",
  "bibi",
  "umgee",
  "hyfve",
  "heimish",
  "bombom",
  "davi-dani",
] as const;

export type ShopBrandId = (typeof SHOP_BRAND_IDS)[number];

export type BrandSortId = "popular" | "newest" | "price-low" | "price-high";

export type BrandProductImage = {
  src: string;
  alt: string;
  caption: string;
};

export type BrandProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  badge?: "NEW" | "SALE";
  image: string;
  gallery?: BrandProductImage[];
  imageNotice?: string;
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

export type BrandFilterOptions = {
  categories: string[];
  categoryCounts: Record<string, number>;
  seasons: string[];
  colors: string[];
  sizes: string[];
};

export type BrandCategoryCard = {
  label: string;
  value: string | null;
  image: string;
  count?: number;
  href?: string;
  meta?: string;
  imageFit?: "contain" | "cover";
};

export type EditorialProduct = {
  product: BrandProduct;
  eyebrow: string;
};

export type EditorialStory = {
  eyebrow: string;
  title: string;
  href: string;
};

export type BrandEditorialAssets = {
  dropped: string;
  gender: string;
  promos: string;
  news: string;
};

export type BrandEditorialViewModel = {
  catalog: BrandCatalog;
  assets: BrandEditorialAssets;
  droppedProducts: EditorialProduct[];
  categoryCards: BrandCategoryCard[];
  promoStories: EditorialStory[];
  newsStories: EditorialStory[];
  filterOptions: BrandFilterOptions;
  newCount: number;
  saleCount: number;
};
