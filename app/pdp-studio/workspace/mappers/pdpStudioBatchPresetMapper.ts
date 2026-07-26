import type { PdpStudioToolId } from "../types";

export interface PdpStudioBatchProcessorSelection {
  toolId: Extract<
    PdpStudioToolId,
    "ai-backgrounds" | "background-remover" | "ai-shadows"
  >;
  prompt?: string;
  options: Record<string, unknown>;
}

export function mapPdpStudioBatchPreset(
  presetId: string,
): PdpStudioBatchProcessorSelection {
  if (presetId === "transparent-cutout") {
    return {
      toolId: "background-remover",
      options: {},
    };
  }
  if (presetId === "soft-shadow") {
    return {
      toolId: "ai-shadows",
      options: {},
    };
  }
  return {
    toolId: "ai-backgrounds",
    prompt: `Create a clean ecommerce background using the "${presetId.replaceAll("-", " ")}" preset direction.`,
    options: { background: presetId, aspectRatio: "1:1" },
  };
}
