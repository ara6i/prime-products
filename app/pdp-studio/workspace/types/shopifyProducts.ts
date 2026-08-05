export type ShopifyProductStatus = "ACTIVE" | "ARCHIVED" | "DRAFT" | string;

export interface ShopifyConnection {
  connected: boolean;
  shopDomain: string | null;
  storeName: string | null;
  currency: string | null;
  canPublish: boolean;
  publishAccessUrl: string | null;
}

export interface ShopifyProductMedia {
  id: string;
  type: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: string;
}

export interface ShopifyProduct {
	id: string;
	title: string;
	handle: string;
	status: ShopifyProductStatus;
	storefrontUrl: string | null;
	featuredImage: string | null;
  media: ShopifyProductMedia[];
  variants: ShopifyProductVariant[];
	priceLabel: string | null;
}

export type ShopifyProductDetail = ShopifyProduct;

export interface ShopifyProductsPage {
  products: ShopifyProduct[];
  hasNextPage: boolean;
  endCursor: string | null;
}

export type ShopifyProductsViewMode = "grid" | "list";
export type ShopifyProductsStatusFilter = "all" | "active" | "draft" | "archived";
