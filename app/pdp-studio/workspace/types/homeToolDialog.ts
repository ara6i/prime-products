import type {
  PdpStudioToolId,
  PdpStudioToolMode,
  PdpStudioUiIconName,
} from "./index";

export type PdpStudioHomeAiToolId = PdpStudioToolId;

export interface PdpStudioDialogSourceImage {
  name: string;
  previewUrl: string;
  file?: File;
  assetId?: string;
}

export type PdpStudioImageLibrarySource = "start-photo" | "background-remover";

export type PdpStudioImageLibraryTab =
  "all" | "uploads" | "products" | "ai-images" | "designs";

export type PdpStudioToolDialogPanel =
  "tool" | "quality" | "size" | "brand" | null;

export type PdpStudioGenerationQuality = "standard" | "advanced" | "premium";

export type PdpStudioGenerationSize =
  | "original"
  | "portrait-9-16"
  | "portrait-3-4"
  | "portrait-2-3"
  | "square"
  | "landscape-3-2"
  | "landscape-4-3"
  | "landscape-16-9";

export interface PdpStudioHomeToolDialogDefinition {
  id: PdpStudioHomeAiToolId;
  label: string;
  description: string;
  icon: PdpStudioUiIconName;
  mode: PdpStudioToolMode;
  defaultSize: PdpStudioGenerationSize;
  illustrationImage: string;
  uploadLabel?: string;
  secondaryUploadLabel?: string;
  referenceUploadsOptional?: boolean;
  promptLabel?: string;
  outputCount: 1 | 2;
}

export interface PdpStudioToolSwitcherItem {
  id: PdpStudioToolId;
  label: string;
  icon: PdpStudioUiIconName;
  href: string;
  supportedInDialog: boolean;
}
