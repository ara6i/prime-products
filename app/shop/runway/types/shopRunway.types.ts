export type ShopRunwayProduct = {
  id: string;
  name: string;
  brand: string;
  priceCents: number;
  image: string;
  category: "Women" | "Men" | "Denim" | "Accessories";
};

export type ShopRunwayLook = {
  id: string;
  number: number;
  title: string;
  description: string;
  modelImage: string;
  modelAlt: string;
  categoryLabel: string;
  products: ShopRunwayProduct[];
};

export type ShopRunwayProductView = ShopRunwayProduct & {
  formattedPrice: string;
};

export type ShopRunwayLookView = Omit<ShopRunwayLook, "products"> & {
  displayNumber: string;
  products: ShopRunwayProductView[];
};
