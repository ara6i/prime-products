import type {
  AiBackgroundAspectRatio,
  AiBackgroundJobOptions,
  AiBackgroundMode,
  AiBackgroundModelPreset,
  AiBackgroundQuality,
} from "../types/aiBackgrounds";

const QUALITY_TO_IMAGE_SIZE: Record<
  AiBackgroundQuality,
  AiBackgroundJobOptions["imageSize"]
> = {
  standard: "1K",
  advanced: "2K",
  premium: "4K",
};

export interface MapAiBackgroundJobInput {
  mode: AiBackgroundMode;
  modelPreset: AiBackgroundModelPreset;
  quality: AiBackgroundQuality;
  aspectRatio: AiBackgroundAspectRatio;
  presetId?: string;
  surface?: string;
  environment?: string;
}
export function mapAiBackgroundJobOptions(
  input: MapAiBackgroundJobInput,
): AiBackgroundJobOptions {
  return {
    mode: input.mode,
    modelPreset: input.modelPreset,
    imageSize: QUALITY_TO_IMAGE_SIZE[input.quality],
    aspectRatio: input.aspectRatio,
    ...(input.presetId ? { presetId: input.presetId } : {}),
    ...(input.surface?.trim() ? { surface: input.surface.trim() } : {}),
    ...(input.environment?.trim()
      ? { environment: input.environment.trim() }
      : {}),
  };
}
