export type GlobalShopCategory = "Women" | "Men" | "Denim" | "Accessories";

export type GlobalShopCategoryFilter = "All" | GlobalShopCategory;

export type GlobalShopProduct = {
  id: string;
  href?: string;
  name: string;
  brand: string;
  price: number;
  category: GlobalShopCategory;
  image: string;
  tone: string;
  note: string;
};

export type ShopNavigationOptions = {
  onNavigate?: () => void;
};

export type ShopNavigationActions = {
  aiStylistHref: string;
  openBrandPage: (brandId: string) => void;
  openCategoryPage: (category: GlobalShopCategory) => void;
};
