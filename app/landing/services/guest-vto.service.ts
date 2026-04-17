export interface GuestTryOnResponse {
  jobId: string;
}

export interface GuestTryOnAlreadyUsed {
  alreadyUsed: true;
  jobId: string;
  status: "processing" | "completed" | "failed";
  resultImageUrl: string | null;
}

export interface GuestTryOnStatus {
  status: "processing" | "completed" | "failed";
  resultImageUrl: string | null;
}

/** Convert a relative path or blob URL to a base64 data URI */
export async function imageToBase64(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function startGuestTryOn(
  modelImage: string,
  garmentImage: string,
): Promise<GuestTryOnResponse | GuestTryOnAlreadyUsed> {
  const res = await fetch("/api/public/tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelImage, garmentImage }),
  });

  if (res.status === 429) {
    return res.json() as Promise<GuestTryOnAlreadyUsed>;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? "Failed to start try-on");
  }

  return res.json() as Promise<GuestTryOnResponse>;
}

export async function getGuestTryOnStatus(jobId: string): Promise<GuestTryOnStatus> {
  const res = await fetch(`/api/public/tryon/status/${jobId}`);
  if (!res.ok) throw new Error("Failed to check status");
  return res.json() as Promise<GuestTryOnStatus>;
}
