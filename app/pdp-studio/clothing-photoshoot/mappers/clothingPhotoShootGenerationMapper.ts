"use client";

import type {
  PdpStudioBrandStylePreset,
  PdpStudioClothingPhotoShootGeneratePayload,
  PdpStudioGenerationChoice,
  PdpStudioGenerationImageReference,
  PdpStudioGenerationSizeChoice,
  PdpStudioPhotoShootPreset,
  PdpStudioQualityPreset,
  PdpStudioSizePreset,
} from "../../types";
import { imageUrlToDataUri } from "../utils/imageDataUri";

export interface ClothingPhotoShootGenerationMapperInput {
  garmentImageDataUri: string;
  model: PdpStudioPhotoShootPreset;
  pose: PdpStudioPhotoShootPreset;
  background: PdpStudioPhotoShootPreset;
  size: PdpStudioSizePreset;
  quality?: PdpStudioQualityPreset;
  brandStyle?: PdpStudioBrandStylePreset;
  prompt: string;
}

export async function mapClothingPhotoShootGeneratePayload(
  input: ClothingPhotoShootGenerationMapperInput,
): Promise<PdpStudioClothingPhotoShootGeneratePayload> {
  const [modelImage, poseImage, backgroundImage] = await Promise.all([
    presetAssetToDataUri(input.model, "model"),
    presetAssetToDataUri(input.pose, "pose"),
    presetAssetToDataUri(input.background, "background"),
  ]);

  const cleanPrompt = input.prompt.trim();

  return {
    garmentImage: input.garmentImageDataUri,
    model: toImageReference(input.model, modelImage),
    pose: toImageReference(input.pose, poseImage),
    background: toImageReference(input.background, backgroundImage),
    size: toSizeChoice(input.size),
    ...(input.quality ? { quality: toQualityChoice(input.quality) } : {}),
    ...(input.brandStyle ? { brandStyle: toChoice(input.brandStyle) } : {}),
    ...(cleanPrompt ? { prompt: cleanPrompt } : {}),
  };
}

async function presetAssetToDataUri(item: PdpStudioPhotoShootPreset, label: string): Promise<string> {
  if (!item.assetUrl) {
    throw new Error(`Select a ${label} with a reference image.`);
  }
  return imageUrlToDataUri(item.assetUrl);
}

function toImageReference(item: PdpStudioPhotoShootPreset, image: string): PdpStudioGenerationImageReference {
  return {
    id: item.id,
    label: item.label,
    description: item.description,
    image,
  };
}

function toChoice(item: PdpStudioBrandStylePreset): PdpStudioGenerationChoice {
  return {
    id: item.id,
    label: item.label,
    description: item.description,
  };
}

function toQualityChoice(item: PdpStudioQualityPreset): PdpStudioGenerationChoice {
  return {
    id: item.id,
    label: item.label,
    description: item.description,
  };
}

function toSizeChoice(item: PdpStudioSizePreset): PdpStudioGenerationSizeChoice {
  return {
    id: item.id,
    label: item.label,
    description: `${item.aspectWidth}:${item.aspectHeight}`,
    aspectRatio: `${item.aspectWidth}:${item.aspectHeight}`,
  };
}
