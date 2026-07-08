export type PdpStudioBuildStatus = "build-now" | "next" | "later";

export type PdpStudioIconName =
  | "archive"
  | "badge"
  | "batch"
  | "brand"
  | "brush"
  | "camera"
  | "check"
  | "chevron"
  | "crop"
  | "download"
  | "edit"
  | "export"
  | "gallery"
  | "grid"
  | "home"
  | "image"
  | "layers"
  | "layout"
  | "magic"
  | "model"
  | "palette"
  | "pose"
  | "product"
  | "resize"
  | "search"
  | "settings"
  | "sparkles"
  | "template"
  | "upload"
  | "wand";

export interface PdpStudioSidebarItem {
  id: string;
  label: string;
  icon: PdpStudioIconName;
  href?: string;
  active?: boolean;
}

export interface PdpStudioSidebarGroup {
  label?: string;
  items: PdpStudioSidebarItem[];
}

export interface PdpStudioToolCard {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: PdpStudioIconName;
  status: PdpStudioBuildStatus;
  href?: string;
  active?: boolean;
}

export interface PdpStudioWorkflowCard {
  id: string;
  title: string;
  description: string;
  icon: PdpStudioIconName;
}

export interface PdpStudioControlPreset {
  id: string;
  label: string;
  description: string;
  icon: PdpStudioIconName;
  swatch?: string;
}

export interface PdpStudioPhotoShootPreset extends PdpStudioControlPreset {
  previewTone: string;
  assetUrl?: string;
  thumbnailFit?: "cover" | "contain";
  thumbnailObjectPosition?: string;
  thumbnailScale?: number;
}

export interface PdpStudioPhotoShootPreviewAssets {
  compositeAssetUrl: string;
  productAssetUrl: string;
  sourceModelAssetUrl: string;
  resultModelAssetUrl: string;
}

export interface PdpStudioQualityPreset {
  id: string;
  label: string;
  badge: string;
  resolution: string;
  description: string;
  details: string[];
  assetUrl?: string;
}

export interface PdpStudioSizePreset {
  id: string;
  label: string;
  aspectWidth: number;
  aspectHeight: number;
}

export interface PdpStudioBrandStylePreset {
  id: string;
  label: string;
  description: string;
}

export interface PdpStudioGenerationImageReference {
  id: string;
  label: string;
  description?: string;
  image: string;
}

export interface PdpStudioGenerationChoice {
  id: string;
  label: string;
  description?: string;
}

export interface PdpStudioGenerationSizeChoice extends PdpStudioGenerationChoice {
  aspectRatio: string;
}

export interface PdpStudioClothingPhotoShootGeneratePayload {
  garmentImage: string;
  model: PdpStudioGenerationImageReference;
  pose: PdpStudioGenerationImageReference;
  background: PdpStudioGenerationImageReference;
  size: PdpStudioGenerationSizeChoice;
  quality?: PdpStudioGenerationChoice;
  brandStyle?: PdpStudioGenerationChoice;
  prompt?: string;
}

export interface PdpStudioClothingPhotoShootGeneratedImage {
  dataUri: string;
  mimeType: string;
  bytes: number;
}

export interface PdpStudioClothingPhotoShootGenerateResult {
  id: string;
  image: PdpStudioClothingPhotoShootGeneratedImage;
  model: string;
  prompt: string;
  latencyMs: number;
}

export interface PdpStudioPhotoShootView {
  previewAssets: PdpStudioPhotoShootPreviewAssets;
  models: PdpStudioPhotoShootPreset[];
  backgrounds: PdpStudioPhotoShootPreset[];
  poses: PdpStudioPhotoShootPreset[];
  qualities: PdpStudioQualityPreset[];
  sizes: PdpStudioSizePreset[];
  brandStyles: PdpStudioBrandStylePreset[];
}

export interface PdpStudioExportPreset {
  id: string;
  label: string;
  size: string;
  description: string;
  icon: PdpStudioIconName;
}

export interface PdpStudioRoadmapItem {
  id: string;
  label: string;
  description: string;
  status: PdpStudioBuildStatus;
}

export interface PdpStudioDashboardView {
  sidebarGroups: PdpStudioSidebarGroup[];
  tools: PdpStudioToolCard[];
  workflow: PdpStudioWorkflowCard[];
  backgrounds: PdpStudioControlPreset[];
  models: PdpStudioControlPreset[];
  poses: PdpStudioControlPreset[];
  clothingPhotoShoot: PdpStudioPhotoShootView;
  exports: PdpStudioExportPreset[];
  roadmap: PdpStudioRoadmapItem[];
}
