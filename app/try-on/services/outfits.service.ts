export interface OutfitProductApiItem {
  id: string;
  name: string;
  imageUrl: string;
  brand: string;
  price: number;
  category: string;
  affiliateUrl?: string | null;
}

export interface OutfitApiItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  products: OutfitProductApiItem[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface OutfitsResponse {
  outfits: OutfitApiItem[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchOutfits(page = 1, limit = 20): Promise<OutfitsResponse> {
  const res = await fetch(`/api/outfits?page=${page}&limit=${limit}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch outfits");
  return res.json();
}

export async function deleteOutfit(id: string): Promise<void> {
  const res = await fetch(`/api/outfits/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete outfit");
}
