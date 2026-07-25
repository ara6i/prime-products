import type {
  PdpStudioGenerationQuality,
  PdpStudioGenerationSize,
  PdpStudioHomeAiToolId,
  PdpStudioHomeToolDialogDefinition,
  PdpStudioImageLibraryTab,
} from "../types/homeToolDialog";

export const PDP_STUDIO_HOME_TOOL_DIALOGS: Record<
  PdpStudioHomeAiToolId,
  PdpStudioHomeToolDialogDefinition
> = {
  "product-staging": {
    id: "product-staging",
    label: "Product Staging",
    description:
      "Create stunning lifestyle images that tell a story and show your product in action",
    icon: "product-staging",
    defaultSize: "landscape-3-2",
    illustrationImage:
      "/images/pdp-studio/tool-dialogs/product-staging.png",
  },
  "ghost-mannequin": {
    id: "ghost-mannequin",
    label: "Ghost Mannequin",
    description:
      "Display your garment on a 3D ghost mannequin with professional styling",
    icon: "ghost-mannequin",
    defaultSize: "square",
    illustrationImage:
      "/images/pdp-studio/tool-dialogs/ghost-mannequin.png",
  },
  "product-beautifier": {
    id: "product-beautifier",
    label: "Product Beautifier",
    description: "Get a polished, professional image of your product",
    icon: "product-beautifier",
    defaultSize: "square",
    illustrationImage:
      "/images/pdp-studio/tool-dialogs/product-beautifier.png",
  },
  "flat-lay": {
    id: "flat-lay",
    label: "Flat Lay",
    description: "Visualize your product laid flat on a neutral surface",
    icon: "flat-lay",
    defaultSize: "square",
    illustrationImage: "/images/pdp-studio/tool-dialogs/flat-lay.png",
  },
};

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
