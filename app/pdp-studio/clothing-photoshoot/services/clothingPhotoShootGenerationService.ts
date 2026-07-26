"use client";

import type {
  PdpStudioBrandStylePreset,
  PdpStudioClothingPhotoShootGenerateResult,
  PdpStudioPhotoShootPreset,
  PdpStudioQualityPreset,
  PdpStudioSizePreset,
} from "../../types";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import {
  createPdpStudioToolJob,
  getPdpStudioJob,
} from "../../platform/services/pdpStudioJobService";

interface ClothingPhotoShootGenerationInput {
  garmentFile: File;
  model: PdpStudioPhotoShootPreset;
  pose: PdpStudioPhotoShootPreset;
  background: PdpStudioPhotoShootPreset;
  size: PdpStudioSizePreset;
  quality: PdpStudioQualityPreset;
  brandStyle: PdpStudioBrandStylePreset;
  prompt: string;
}

export async function requestClothingPhotoShootGeneration(
  input: ClothingPhotoShootGenerationInput,
): Promise<PdpStudioClothingPhotoShootGenerateResult> {
  const startedAt = Date.now();
  const [garment, model, pose, background] = await Promise.all([
    uploadPdpStudioAsset(input.garmentFile),
    uploadReference(input.model, "model"),
    uploadReference(input.pose, "pose"),
    uploadReference(input.background, "background"),
  ]);
  const cleanPrompt = input.prompt.trim();
  const job = await createPdpStudioToolJob("ai-fashion-models", {
    inputAssetIds: [garment.id],
    referenceAssetIds: [model.id, pose.id, background.id],
    ...(cleanPrompt ? { prompt: cleanPrompt } : {}),
    options: {
      model: input.model.label,
      pose: input.pose.label,
      background: input.background.label,
      quality: input.quality.resolution,
      brandStyle: input.brandStyle.label,
      aspectRatio: `${input.size.aspectWidth}:${input.size.aspectHeight}`,
      outputCount: 1,
    },
    useBrandKit: input.brandStyle.id === "use-brand-kit",
    idempotencyKey: crypto.randomUUID(),
  });
  const completed = await waitForJob(job.id);
  const output = completed.outputs[0];
  if (!output) {
    throw new Error("Clothing photoshoot completed without an output image.");
  }

  return {
    id: completed.id,
    image: {
      dataUri: output.url,
      mimeType: output.mimeType,
      bytes: output.bytes,
    },
    model: completed.model || completed.provider,
    prompt: completed.prompt || cleanPrompt,
    latencyMs: Date.now() - startedAt,
  };
}

async function uploadReference(
  preset: PdpStudioPhotoShootPreset,
  role: string,
) {
  if (!preset.assetUrl) {
    throw new Error(`Select a ${role} with a reference image.`);
  }
  const response = await fetch(preset.assetUrl);
  if (!response.ok) {
    throw new Error(`The selected ${role} reference could not be loaded.`);
  }
  const blob = await response.blob();
  const extension = blob.type.includes("png") ? "png" : "jpg";
  return uploadPdpStudioAsset(
    new File([blob], `${role}-${preset.id}.${extension}`, {
      type: blob.type || "image/jpeg",
    }),
  );
}

async function waitForJob(jobId: string) {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const job = await getPdpStudioJob(jobId);
    if (job.status === "succeeded") return job;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(
        job.error?.message ||
          (job.status === "cancelled"
            ? "Clothing photoshoot was cancelled."
            : "Clothing photoshoot generation failed."),
      );
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1_500));
  }
  throw new Error("Clothing photoshoot generation timed out.");
}
