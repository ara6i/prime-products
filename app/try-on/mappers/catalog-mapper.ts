import type { ProductApiItem } from "@/app/try-on/services/catalog.service";
import type { OutfitApiItem } from "@/app/try-on/services/outfits.service";
import type { GalleryApiItem } from "@/app/try-on/services/gallery.service";
import type {
  CatalogProduct,
  ClothingCategory,
  SavedOutfit,
  ClosetItem,
  OutfitProduct,
} from "@/app/try-on/types";

const PARENT_CATEGORY_MAP: Record<string, ClothingCategory> = {
  tops: "upper-body",
  outerwear: "upper-body",
  bottoms: "lower-body",
  dresses: "full-body",
  footwear: "accessories",
  accessories: "accessories",
};

function mapParentCategory(parentCategory?: string): ClothingCategory {
  if (!parentCategory) return "upper-body";
  return PARENT_CATEGORY_MAP[parentCategory.toLowerCase()] ?? "upper-body";
}

export function mapProductToFrontend(product: ProductApiItem): CatalogProduct {
  return {
    id: product.product_id,
    name: product.name,
    brand: product.brand,
    price: product.price,
    imageUrl: product.image_urls?.[0] ?? "",
    category: mapParentCategory(product.parentCategory),
    isSaved: false,
    affiliateUrl: product.affiliate_url ?? null,
  };
}

export function mapProductsToFrontend(products: ProductApiItem[]): CatalogProduct[] {
  return products.map(mapProductToFrontend);
}

export function mapOutfitToFrontend(outfit: OutfitApiItem): SavedOutfit {
  return {
    id: outfit.id,
    name: outfit.name,
    imageUrl: outfit.imageUrl,
    date: new Date(outfit.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    tags: outfit.tags,
    pieceCount: outfit.products.length,
    products: outfit.products.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      brand: p.brand,
      price: p.price,
      category: p.category,
      affiliateUrl: p.affiliateUrl ?? null,
    })),
  };
}

export function mapOutfitsToFrontend(outfits: OutfitApiItem[]): SavedOutfit[] {
  return outfits.map(mapOutfitToFrontend);
}

export function mapGalleryItemToCloset(item: GalleryApiItem): ClosetItem {
  return {
    id: item._id,
    imageUrl: item.remoteOutputUrl || item.outputUrl || "",
    date: new Date(item.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    products: item.products.map((p): OutfitProduct => ({
      id: p.product_id,
      name: p.name,
      imageUrl: p.image_url,
      brand: p.brand,
      price: p.price,
      category: p.category ?? "",
      affiliateUrl: p.affiliate_url ?? null,
    })),
  };
}

export function mapGalleryToCloset(items: GalleryApiItem[]): ClosetItem[] {
  return items.map(mapGalleryItemToCloset);
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
