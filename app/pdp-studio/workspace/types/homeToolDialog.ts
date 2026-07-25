import type { PdpStudioToolId, PdpStudioUiIconName } from "./index";

export type PdpStudioHomeAiToolId =
  | "product-staging"
  | "ghost-mannequin"
  | "product-beautifier"
  | "flat-lay";

export type PdpStudioImageLibrarySource =
  | "start-photo"
  | "background-remover";

export type PdpStudioImageLibraryTab =
  | "all"
  | "uploads"
  | "products"
  | "ai-images"
  | "designs";

export type PdpStudioToolDialogPanel =
  | "tool"
  | "quality"
  | "size"
  | "brand"
  | null;

export type PdpStudioGenerationQuality =
  | "standard"
  | "advanced"
  | "premium";

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
  defaultSize: PdpStudioGenerationSize;
  illustrationImage: string;
}

export interface PdpStudioToolSwitcherItem {
  id: PdpStudioToolId;
  label: string;
  icon: PdpStudioUiIconName;
  href: string;
  supportedInDialog: boolean;
}
