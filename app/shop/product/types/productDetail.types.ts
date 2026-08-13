import type { BrandCatalog } from "../../brand/types/brandCatalog.types";
import type { RawCategoryCatalog } from "../../category/types/categoryCatalog.types";

export type RawProductDetailSource =
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
  gallery: ProductGalleryItem[];
  featureImage: string;
  sourceHref: string;
  sourceLabel: string;
  canonicalHref?: string;
  tryOnSupported?: boolean;
  note: string;
  information: ProductInformationSection[];
  related: ProductRelatedItem[];
};

export type ProductDetailInteractionState = {
  activeImageIndex: number;
  selectedSize: string;
  bagCount: number;
  isFavorite: boolean;
  sizeGuideOpen: boolean;
  confirmation: string;
  setActiveImageIndex: (index: number) => void;
  setSelectedSize: (size: string) => void;
  setSizeGuideOpen: (open: boolean) => void;
  addToBag: () => void;
  toggleFavorite: () => void;
};
