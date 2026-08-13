"use client";

import { getAiSizingFields } from "../lib/ai-sizing-profile";
import type {
  BodyLandmarks,
  BraSizeRegion,
  SizingEstimateResult,
} from "../types";

export interface EstimateSizingInput {
  height: number;
  weight: number;
  heightUnit: "cm" | "in";
  weightUnit: "kg" | "lbs";
  gender: "female" | "male";
  age?: number;
  bodyType?: "slim" | "athletic" | "average" | "stocky" | "plus";
  bodyImage?: string;
  bodyLandmarks?: BodyLandmarks;
  braSize?: {
    band: number;
    cup: string;
    region: BraSizeRegion;
  };
}

function withoutBodyImage(input: EstimateSizingInput): EstimateSizingInput {
  const landmarkInput = { ...input };
  delete landmarkInput.bodyImage;
  return landmarkInput;
}

function isDevelopmentPreview() {
  return (
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1"
  );
}

/**
 * MyAIFitting adapter for the same AI sizing endpoint used by the SDK.
 *
 * Signed-in users keep the MyAIFitting session route. The explicit local
 * onboarding preview has no user session, so it uses the configured SDK key
 * and public /v1 route. Both routes call the same backend controller and
 * estimateWithVision service.
 */
export async function estimateSizing(
  input: EstimateSizingInput,
): Promise<SizingEstimateResult> {
  const requestedPhotoSizing = Boolean(input.bodyImage);
  const preview = isDevelopmentPreview();
  const sdkKey = process.env.NEXT_PUBLIC_PRIMESTYLE_API_KEY?.trim();
  const requestBody =
    !preview && input.bodyLandmarks
      ? withoutBodyImage(input)
      : input;

  if (preview && !sdkKey) {
    throw new Error(
      "The local AI sizing preview key is not configured.",
    );
  }

  const res = await fetch(
    preview ? "/api/v1/sizing/estimate" : "/api/users/me/sizing/estimate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(preview ? { Authorization: `Bearer ${sdkKey}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        ...requestBody,
        requiredFields: getAiSizingFields(input.gender).map(
          (field) => field.key,
        ),
      }),
    },
  );

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      payload.message ||
        (res.status === 401
          ? "Sign in to create your size estimate."
          : "We could not estimate your size. Please try again."),
    );
  }

  const method = payload.method === "vision" ? "vision" : "manual";
  return {
    estimates: payload.estimates ?? {},
    unit: payload.unit === "in" ? "in" : "cm",
    method,
    ...(payload.confidence ? { confidence: payload.confidence } : {}),
    ...(requestedPhotoSizing && method !== "vision"
      ? { photoFallback: true }
      : {}),
  };
}
