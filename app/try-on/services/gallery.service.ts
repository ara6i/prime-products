export interface GalleryProductApiItem {
  product_id: string;
  name: string;
  brand: string;
  price: number;
  currency?: string;
  image_url: string;
  affiliate_url?: string;
  category?: string;
}

export interface GalleryApiItem {
  _id: string;
  outputUrl?: string;
  remoteOutputUrl?: string;
  mimeType: string;
  prompt: string;
  createdAt: string;
  products: GalleryProductApiItem[];
}

export async function fetchGallery(type: "image" | "video" = "image"): Promise<GalleryApiItem[]> {
  const res = await fetch(`/api/vto/gallery?type=${type}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch gallery");
  return res.json();
}

export interface GalleryDetailApiItem extends GalleryApiItem {
  status: string;
}

export async function fetchGalleryItem(id: string): Promise<GalleryDetailApiItem> {
  const res = await fetch(`/api/vto/gallery/${id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch gallery item");
  return res.json();
}

/** Server-side version using absolute URL + cookie forwarding */
export async function fetchGalleryItemServer(id: string, cookieHeader: string): Promise<GalleryDetailApiItem> {
  const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const res = await fetch(`${BACKEND}/api/vto/gallery/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch gallery item");
  return res.json();
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const res = await fetch(`/api/vto/gallery/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete gallery item");
}
