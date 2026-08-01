import {
  AI_BACKGROUND_PRESET_GROUPS,
  AI_BACKGROUND_UNIQUE_ASSETS,
} from "./aiBackgroundPresets";
import { AI_BACKGROUND_GENERATED_RESULTS } from "./aiBackgroundGeneratedResults";

export interface AiBackgroundAssetManifestEntry {
  assetKey: string;
  filename: string;
  labels: string[];
  categories: string[];
  prompt: string;
  minimumWidth: 1024;
  minimumHeight: 1024;
  generationSurface: "signed-in-chatgpt-browser";
  generationConversation: string | null;
  generatedResult: string | null;
  visualQa: "pending" | "passed" | "failed";
  integration: "pending" | "integrated";
}

export const AI_BACKGROUND_ASSET_MANIFEST: readonly AiBackgroundAssetManifestEntry[] =
  AI_BACKGROUND_UNIQUE_ASSETS.map((asset) => {
    const matches = AI_BACKGROUND_PRESET_GROUPS.flatMap((group) =>
      group.presets.filter((preset) => preset.assetKey === asset.assetKey),
    );
    const generated = AI_BACKGROUND_GENERATED_RESULTS[asset.assetKey];
    return {
      assetKey: asset.assetKey,
      filename: `${asset.assetKey}.webp`,
      labels: Array.from(new Set(matches.map((preset) => preset.label))),
      categories: Array.from(new Set(matches.map((preset) => preset.category))),
      prompt: [
        `Generate one original, photorealistic, square ecommerce background named “${asset.label}”.`,
        `The image is a clean ${asset.category.toLowerCase()} scene intended to receive a product later, so leave a natural open focal area near the center.`,
        "Use realistic materials, professional commercial lighting, believable depth, restrained props, and scene-appropriate natural color.",
        "No product, people, hands, text, labels, logos, watermark, UI, frame, border, collage, or obvious AI artifacts.",
        "Do not imitate or reproduce any existing PhotoRoom thumbnail.",
        "Output one 1024×1024 image.",
      ].join(" "),
      minimumWidth: 1024,
      minimumHeight: 1024,
      generationSurface: "signed-in-chatgpt-browser" as const,
      generationConversation: generated?.conversation ?? null,
      generatedResult: generated?.result ?? null,
      visualQa: generated?.visualQa ?? ("pending" as const),
      integration: generated ? ("integrated" as const) : ("pending" as const),
    };
  });
