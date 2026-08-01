import type {
  PdpStudioGenerationQuality,
  PdpStudioGenerationSize,
  PdpStudioHomeAiToolId,
  PdpStudioHomeToolDialogDefinition,
  PdpStudioImageLibraryTab,
} from "../types/homeToolDialog";
import { PDP_STUDIO_AUDIT_CATALOG } from "./pdpStudioAuditData";
import { isPdpStudioHomeAiToolId } from "./pdpStudioInlineTools";
import { PDP_STUDIO_TOOL_ASSETS } from "./pdpStudioToolAssets";

const DEFAULT_TOOL_ASSET = "/images/pdp-studio/presets/clean-white.png";

function mapDefaultSize(size?: string): PdpStudioGenerationSize {
  const normalizedSize = size?.toLowerCase();
  if (normalizedSize === "original") return "original";
  if (normalizedSize?.includes("9:16")) return "portrait-9-16";
  if (normalizedSize?.includes("3:4")) return "portrait-3-4";
  if (normalizedSize?.includes("2:3")) return "portrait-2-3";
  if (normalizedSize?.includes("3:2")) return "landscape-3-2";
  if (normalizedSize?.includes("4:3")) return "landscape-4-3";
  if (normalizedSize?.includes("16:9")) return "landscape-16-9";
  return "square";
}

export const PDP_STUDIO_HOME_TOOL_DIALOGS = Object.fromEntries(
  PDP_STUDIO_AUDIT_CATALOG.tools
    .filter((tool) => isPdpStudioHomeAiToolId(tool.id))
    .map((tool) => [
      tool.id,
      {
        id: tool.id,
        label: tool.label,
        description: tool.description,
        icon: tool.icon,
        mode: tool.mode,
        defaultSize: mapDefaultSize(tool.defaultSize),
        illustrationImage:
          PDP_STUDIO_TOOL_ASSETS[tool.id] ?? DEFAULT_TOOL_ASSET,
        uploadLabel: tool.uploadLabel,
        secondaryUploadLabel: tool.secondaryUploadLabel,
        referenceUploadsOptional: tool.referenceUploadsOptional,
        promptLabel: tool.promptLabel,
        outputCount: tool.outputCount ?? 1,
      },
    ]),
) as Record<PdpStudioHomeAiToolId, PdpStudioHomeToolDialogDefinition>;

export const PDP_STUDIO_IMAGE_LIBRARY_TABS: {
  id: PdpStudioImageLibraryTab;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "uploads", label: "Uploads" },
  { id: "products", label: "Shopify products" },
  { id: "ai-images", label: "AI images" },
  { id: "designs", label: "Designs" },
];

export const PDP_STUDIO_QUALITY_OPTIONS: {
  id: PdpStudioGenerationQuality;
  label: string;
  tier: string;
  resolution: string;
  features: string[];
}[] = [
  {
    id: "premium",
    label: "Premium",
    tier: "Ultra",
    resolution: "4K+",
    features: [
      "Best scene coherence",
      "Photorealistic lighting & reflections",
      "Highest quality",
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    tier: "Max",
    resolution: "2K",
    features: [
      "Realistic scene integration",
      "Natural lighting & shadows",
      "High quality",
    ],
  },
  {
    id: "standard",
    label: "Standard",
    tier: "Pro",
    resolution: "1K",
    features: ["Basic scene placement", "Fast generations"],
  },
];

export const PDP_STUDIO_SIZE_OPTIONS: {
  id: PdpStudioGenerationSize;
  label: string;
  ratio: string;
}[] = [
  { id: "original", label: "Original", ratio: "auto" },
  { id: "portrait-9-16", label: "Portrait", ratio: "9:16" },
  { id: "portrait-3-4", label: "Portrait", ratio: "3:4" },
  { id: "portrait-2-3", label: "Portrait", ratio: "2:3" },
  { id: "square", label: "Square", ratio: "1:1" },
  { id: "landscape-3-2", label: "Landscape", ratio: "3:2" },
  { id: "landscape-4-3", label: "Landscape", ratio: "4:3" },
  { id: "landscape-16-9", label: "Landscape", ratio: "16:9" },
];

export const getPdpStudioQualityLabel = (
  quality: PdpStudioGenerationQuality,
) =>
  PDP_STUDIO_QUALITY_OPTIONS.find((option) => option.id === quality)?.label ??
  "Standard";

export const getPdpStudioSizeLabel = (size: PdpStudioGenerationSize) => {
  const option = PDP_STUDIO_SIZE_OPTIONS.find((item) => item.id === size);
  if (!option) return "Square";
  return option.id === "original"
    ? option.label
    : `${option.label}${option.id === "square" ? "" : ` (${option.ratio})`}`;
};
