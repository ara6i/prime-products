import type { PdpStudioAsset, PdpStudioJob } from "../../platform/types/pdpStudioPlatform";

export type AiBackgroundMode =
  | "preset"
  | "reference"
  | "assisted"
  | "manual"
  | "edit";

export type AiBackgroundModelPreset =
  | "studio-hd"
  | "studio"
  | "v3"
  | "v2";

export type AiBackgroundQuality = "premium" | "advanced" | "standard";

export type AiBackgroundAspectRatio =
  | "1:1"
  | "2:3"
  | "3:4"
  | "4:3"
  | "3:2"
  | "9:16"
  | "16:9";

export type AiBackgroundCustomTab = "image" | "assisted" | "manual";

export type AiBackgroundAssetTab =
  | "all"
  | "uploads"
  | "generated"
  | "shopify";

export interface AiBackgroundPreset {
  id: string;
  label: string;
  category: string;
  assetKey: string;
  image: string;
  prompt: string;
}
export interface AiBackgroundPresetGroup {
  id: string;
  label: string;
  presets: AiBackgroundPreset[];
}

export interface AiBackgroundJobOptions {
  mode: AiBackgroundMode;
  modelPreset: AiBackgroundModelPreset;
  imageSize: "1K" | "2K" | "4K";
  aspectRatio: AiBackgroundAspectRatio;
  presetId?: string;
  surface?: string;
  environment?: string;
}

export interface AiBackgroundLocalSource {
  id: string;
  name: string;
  previewUrl: string;
  file?: File;
  asset?: PdpStudioAsset;
}

export interface AiBackgroundTextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface AiBackgroundImageLayer {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AiBackgroundWorkspaceState {
  source: AiBackgroundLocalSource | null;
  reference: AiBackgroundLocalSource | null;
  assetPickerOpen: boolean;
  assetPickerPurpose: "source" | "reference" | "insert";
  assetTab: AiBackgroundAssetTab;
  assets: PdpStudioAsset[];
  assetsLoading: boolean;
  assetsError: string | null;
  assetsBefore: string | null;
  assetsHasMore: boolean;
  editorOpen: boolean;
  customOpen: boolean;
  customTab: AiBackgroundCustomTab;
  search: string;
  modelPreset: AiBackgroundModelPreset;
  quality: AiBackgroundQuality;
  aspectRatio: AiBackgroundAspectRatio;
  selectedPresetId: string | null;
  imageDescription: string;
  surface: string;
  environment: string;
  manualPrompt: string;
  editPrompt: string;
  job: PdpStudioJob | null;
  error: string | null;
  uploading: boolean;
  textLayers: AiBackgroundTextLayer[];
  imageLayers: AiBackgroundImageLayer[];
}
