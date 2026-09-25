import type { BrandCatalog } from "../../brand/types/brandCatalog.types";
import type { RawCategoryCatalog } from "../../category/types/categoryCatalog.types";
import type { PrimeStyleAddToBagPayload } from "@primestyleai/tryon-shop/react";

export type RawProductDetailSource =
  | { kind: "mock"; product: ProductDetailViewModel }
  | {
      kind: "brand";
      catalog: BrandCatalog;
      productIndex: number;
    }
  | {
      kind: "category";
      catalog: RawCategoryCatalog;
      productIndex: number;
    };

export type ProductGalleryItem = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
};

export type ProductInformationSection = {
  id: "details" | "materials" | "fit" | "shipping";
  title: string;
  summary: string;
  items: string[];
};

export type ProductRelatedItem = {
  id: string;
  href: string;
  brandName: string;
  name: string;
  image: string;
  priceLabel: string;
  badge?: string;
};

export type ProductSizeGuideData = {
  title: string;
  headers: string[];
  rows: string[][];
};

export type ProductDetailViewModel = {
  id: string;
  name: string;
  brandName: string;
  brandLogo?: string;
  badge?: string;
  category: string;
  color: string;
  colorHex: string;
  styleCode: string;
  description: string;
  priceLabel: string;
  priceCents: number;
  currency?: string;
  compareAtPriceLabel?: string;
  discountLabel?: string;
  ratingLabel?: string;
  reviewLabel?: string;
  sizeRecommendation?: {
    status: "ready" | "not-needed" | "unavailable";
    label: string;
    detail: string;
    recommendedSize?: string;
  };
  sizes: string[];
  sizeGuide?: ProductSizeGuideData;
  isMock?: boolean;
  imageNotice?: string;
  gallery: ProductGalleryItem[];
  featureImage: string;
  sourceHref: string;
  sourceLabel: string;
  canonicalHref?: string;
  tryOnSupported?: boolean;
  note: string;
  information: ProductInformationSection[];
  related: ProductRelatedItem[];
  gender?: "women" | "men";
  slot?: "top" | "bottom" | "shoe" | "bag" | "accessory";
  fitType?: "apparel" | "shoe" | "bag" | "accessory";
  garmentReferenceImage?: string;
  garmentDetailImage?: string;
};

export type ProductDetailInteractionState = {
  activeImageIndex: number;
  selectedSize: string;
  bagCount: number;
  isFavorite: boolean;
  sizeGuideOpen: boolean;
  confirmation: string;
  pendingOutfit: Array<{
    productId: string;
    name: string;
    brandName: string;
    image: string;
    href: string;
    color: string;
    priceCents: number;
    currency: string;
    sizes: string[];
    selectedSize: string;
  }>;
  setActiveImageIndex: (index: number) => void;
  setSelectedSize: (size: string) => void;
  setBagOpen: (open: boolean) => void;
  setSizeGuideOpen: (open: boolean) => void;
  addToBag: () => void;
  addSdkSelection: (payload: PrimeStyleAddToBagPayload) => void;
  setPendingOutfitSize: (productId: string, size: string) => void;
  confirmPendingOutfit: () => void;
  closePendingOutfit: () => void;
  toggleFavorite: () => void;
};
