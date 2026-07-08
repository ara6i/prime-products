"use client";

import type {
  PdpStudioClothingPhotoShootGeneratePayload,
  PdpStudioClothingPhotoShootGenerateResult,
} from "../../types";

interface ClothingPhotoShootGenerateResponse {
  ok?: boolean;
  result?: PdpStudioClothingPhotoShootGenerateResult;
  error?: string;
}

export async function requestClothingPhotoShootGeneration(
  payload: PdpStudioClothingPhotoShootGeneratePayload,
): Promise<PdpStudioClothingPhotoShootGenerateResult> {
  const response = await fetch("/api/pdp-studio/clothing-photoshoot/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as ClothingPhotoShootGenerateResponse;

  if (!response.ok || !data.ok || !data.result) {
    throw new Error(data.error ?? `Clothing photoshoot generation failed (${response.status}).`);
  }

  return data.result;
}
