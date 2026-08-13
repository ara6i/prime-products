import type { GalleryDetailApiItem } from "@/app/try-on/services/gallery.service";
import type { TryOnDetailData } from "@/app/dashboard/types";

export function mapGalleryItemToDetail(item: GalleryDetailApiItem): TryOnDetailData {
  const totalPrice = item.products.reduce((sum, p) => sum + p.price, 0);

  return {
    id: item._id,
    imageUrl: item.outputUrl || item.remoteOutputUrl || "/images/dashboard/tryon-placeholder.png",
    status: item.status === "completed" ? "ready" : "processing",
    itemCount: item.products.length,
    price: `$${totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    href: `/dashboard/try-on/${item._id}`,
    createdAt: item.createdAt,
    products: item.products.map((p) => ({
      productId: p.product_id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      imageUrl: p.image_url,
      category: p.category ?? "",
      affiliateUrl: p.affiliate_url,
    })),
  };
}
