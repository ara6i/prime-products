export const SHOP_CATEGORY_IDS = [
  "women",
  "men",
  "denim",
  "accessories",
] as const;

export type ShopCategoryId = (typeof SHOP_CATEGORY_IDS)[number];

export type CategorySortId = "featured" | "price-low" | "price-high" | "newest";

export type CategoryProductFacet = {
  groupId: string;
  value: string;
};

export type RawCategoryProduct = {
  id: string;
  name: string;
  brand: string;
  priceCents: number;
  image: string;
  note: string;
  position: number;
  facets: CategoryProductFacet[];
};

export type RawCategoryFilter = {
  id: string;
  label: string;
  options: string[];
};

export type RawCategoryCatalog = {
  id: ShopCategoryId;
  label: string;
  seasonTitle: string;
  intro: string;
  heroImage: string;
  mobileHeroImage?: string;
  heroAlt: string;
  heroObjectPosition: string;
  announcementItems: string[];
  filters: RawCategoryFilter[];
  products: RawCategoryProduct[];
};

export type CategoryProduct = RawCategoryProduct & {
  priceLabel: string;
};

export type CategoryFilter = RawCategoryFilter & {
  count: number;
};

export type CategoryCatalog = Omit<
  RawCategoryCatalog,
  "filters" | "products"
> & {
  filters: CategoryFilter[];
  products: CategoryProduct[];
};

export type ActiveCategoryFilters = Record<string, string[]>;
