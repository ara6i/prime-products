export interface StartTryOnRequest {
  modelImage: string;
  garmentImages: string[];
  products: {
    product_id: string;
    name: string;
    brand?: string;
    price?: number;
    category?: string;
    image_url?: string;
    affiliate_url?: string;
  }[];
  source: "tryon";
}

export interface StartTryOnResponse {
  galleryId: string;
  tokenCost: number;
}

export async function startTryOn(
  request: StartTryOnRequest,
): Promise<StartTryOnResponse> {
  const res = await fetch("/api/vto/tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to start try-on");
  }
  return res.json();
}

export async function checkTryOnStatus(
  galleryId: string,
): Promise<{ status: string; imageUrl?: string; error?: string }> {
  const res = await fetch(`/api/vto/status/${galleryId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to check status");
  return res.json();
}

export async function uploadPhoto(file: File): Promise<string> {
  // --- Real upload commented out for UI development ---
  // const formData = new FormData();
  // formData.append("image", file);
  // const res = await fetch("/api/vto/upload", {
  //   method: "POST",
  //   credentials: "include",
  //   body: formData,
  // });
  // if (!res.ok) throw new Error("Failed to upload photo");
  // const data = await res.json();
  // return data.url;

  // Mock: return a local object URL for the uploaded file
  return URL.createObjectURL(file);
}
