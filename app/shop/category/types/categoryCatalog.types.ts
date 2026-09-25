export const SHOP_CATEGORY_IDS = [
  "women",
  "men",
  "accessories",
] as const;

export type ShopCategoryId = (typeof SHOP_CATEGORY_IDS)[number];
export type LegacyShopCategoryId = "denim";

export type CategorySortId = "featured" | "price-low" | "price-high" | "newest";

export type CategoryProductFacet = {
  groupId: string;
  value: string;
};

export type CategoryProductSizeGuide = {
  title: string;
  headers: string[];
  rows: string[][];
};

export type RawCategoryProduct = {
  id: string;
  name: string;
  brand: string;
  priceCents: number;
  image: string;
  hoverImage?: string;
  note: string;
  position: number;
  facets: CategoryProductFacet[];
  gender?: "women" | "men";
  slot?: "top" | "bottom" | "shoe" | "bag" | "accessory";
  fitType?: "apparel" | "shoe" | "bag" | "accessory";
  sizes?: string[];
  measurements?: string;
  description?: string;
  material?: string;
  details?: string[];
  materialDetails?: string[];
  careInstructions?: string[];
  fitDescription?: string;
  fitNotes?: string[];
  sizeGuide?: CategoryProductSizeGuide;
  showcaseNotes?: string[];
  colorHex?: string;
  displayColor?: string;
  gallery?: Array<{ src: string; alt: string; caption?: string }>;
  garmentReferenceImage?: string;
  garmentDetailImage?: string;
};

export type RawCategoryFilter = {
  id: string;
  label: string;
  options: string[];
};

export type RawCategoryCatalog = {
  id: ShopCategoryId | LegacyShopCategoryId;
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

export type ActiveRawCategoryCatalog = Omit<RawCategoryCatalog, "id"> & {
  id: ShopCategoryId;
};

export type CategoryProduct = RawCategoryProduct & {
  priceLabel: string;
};

export type CategoryFilter = RawCategoryFilter & {
  count: number;
};

export type CategoryCatalog = Omit<
  RawCategoryCatalog,
  "id" | "filters" | "products"
> & {
  id: ShopCategoryId;
  filters: CategoryFilter[];
  products: CategoryProduct[];
};

export type ActiveCategoryFilters = Record<string, string[]>;
