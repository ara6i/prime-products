export type PdpStudioWorkspacePageId =
  | "home"
  | "ai-tools"
  | "batch"
  | "products"
  | "designs"
  | "brand-kit"
  | "templates"
  | "preferences";

export type PdpStudioOverlayId =
  | "usage"
  | "api"
  | "upgrade"
  | "help"
  | "preferences"
  | "space"
  | "mobile-login";

export type PdpStudioUiIconName =
  | PdpStudioToolId
  | "ai"
  | "api"
  | "archive"
  | "arrow"
  | "batch"
  | "brand"
  | "camera"
  | "check"
  | "chevron"
  | "close"
  | "design"
  | "download"
  | "expand"
  | "folder"
  | "help"
  | "home"
  | "image"
  | "layers"
  | "menu"
  | "model"
  | "more"
  | "palette"
  | "play"
  | "plus"
  | "product"
  | "profile"
  | "recolor"
  | "resize"
  | "search"
  | "settings"
  | "shopify"
  | "sparkles"
  | "template"
  | "text"
  | "upload"
  | "usage"
  | "video"
  | "wand";

export interface PdpStudioRouteNavItem {
  id: PdpStudioWorkspacePageId | "photoshoot";
  label: string;
  icon: PdpStudioUiIconName;
  href: string;
  badge?: string;
}

export interface PdpStudioActionNavItem {
  id: PdpStudioOverlayId;
  label: string;
  icon: PdpStudioUiIconName;
}

export interface PdpStudioNavGroup {
  label?: string;
  routes?: PdpStudioRouteNavItem[];
  actions?: PdpStudioActionNavItem[];
}

export type PdpStudioToolId =
  | "video-generator"
  | "ai-fashion-models"
  | "product-staging"
  | "product-beautifier"
  | "edit-with-ai"
  | "create-any-image"
  | "ghost-mannequin"
  | "flat-lay"
  | "logo"
  | "recolor"
  | "product-photography"
  | "text"
  | "ironing"
  | "product-packaging"
  | "instagram-story"
  | "product-fixer"
  | "image-enhancer"
  | "ai-backgrounds"
  | "ai-expand"
  | "ai-images"
  | "ai-shadows"
  | "background-remover"
  | "resize"
  | "retouch"
  | "studio-shot"
  | "ai-shot-list";

export type PdpStudioToolMode =
  | "generator"
  | "upload"
  | "text-generator"
  | "dual-upload"
  | "studio-shot"
  | "shot-list"
  | "chooser";

export interface PdpStudioOption {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  swatch?: string;
  image?: string;
}

export interface PdpStudioToolDefinition {
  id: PdpStudioToolId;
  label: string;
  description: string;
  icon: PdpStudioUiIconName;
  mode: PdpStudioToolMode;
  href: string;
  group: "create" | "all";
  featured?: boolean;
  home?: boolean;
  badge?: string;
  acceptsMultiple?: boolean;
  secondaryUploadLabel?: string;
  uploadLabel?: string;
  promptLabel?: string;
  outputCount?: 1 | 2;
  defaultSize?: string;
  options?: {
    label: string;
    values: PdpStudioOption[];
  }[];
}

export interface PdpStudioPresetCollection {
  id: string;
  label: string;
  items: PdpStudioOption[];
}

export interface PdpStudioPreferenceSection {
  id: string;
  label: string;
  group: "account" | "space";
}

export interface PdpStudioAuditCatalog {
  navigation: PdpStudioNavGroup[];
  tools: PdpStudioToolDefinition[];
  backgrounds: PdpStudioPresetCollection[];
  preferenceSections: PdpStudioPreferenceSection[];
}

export interface PdpStudioCommandItem {
  id: string;
  label: string;
  description: string;
  href?: string;
  overlay?: PdpStudioOverlayId;
  icon: PdpStudioUiIconName;
  keywords: string[];
}

export interface PdpStudioWorkspaceView {
  catalog: PdpStudioAuditCatalog;
  commands: PdpStudioCommandItem[];
}

export interface PdpStudioLocalFile {
  id: string;
  name: string;
  previewUrl: string;
  file?: File;
}
