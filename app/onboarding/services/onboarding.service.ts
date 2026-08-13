export { estimateSizing } from "./ai-sizing.service";
export type { EstimateSizingInput } from "./ai-sizing.service";

export interface SubmitOnboardingPayload {
  profile?: {
    gender?: string;
    birthYear?: string;
    height?: string;
    weight?: string;
    measurementSystem?: "metric" | "imperial";
    braSizeRegion?: string;
    bandSize?: string;
    cupSize?: string;
    bodyType?: string;
    photoUrl?: string;
    measurements?: Record<string, number>;
    measurementUnit?: "cm" | "in";
    measurementSource?: "photo" | "manual";
  };
  preferences?: {
    styles?: string[];
    colors?: string[];
  };
  tokens?: {
    awardedTokens?: number;
  };
  complete?: boolean;
}

export async function submitOnboarding(
  data: SubmitOnboardingPayload,
): Promise<unknown> {
  const res = await fetch("/api/users/me/onboarding", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to submit onboarding");
  }
  return res.json();
}

export async function uploadProfilePhoto(
  file: File,
): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/users/me/photo", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to upload photo");
  }
  return res.json();
}

export async function uploadSizingPhoto(
  imageDataUrl: string,
): Promise<{ sizingPhotoUrl: string }> {
  const source = await fetch(imageDataUrl);
  const blob = await source.blob();
  const extension =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
        ? "webp"
        : "jpg";
  const formData = new FormData();
  formData.append(
    "file",
    new File([blob], `sizing-photo.${extension}`, { type: blob.type }),
  );

  const res = await fetch("/api/users/me/sizing-photo", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to save sizing photo");
  }
  return res.json();
}

export async function redeemPromoCode(
  code: string,
): Promise<{ success: boolean; message: string; tokensAwarded?: number }> {
  const res = await fetch("/api/promo-codes/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to redeem promo code");
  }
  return res.json();
}
