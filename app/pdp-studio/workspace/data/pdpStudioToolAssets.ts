import type { PdpStudioToolId } from "../types";

const asset = (name: string) => `/images/pdp-studio/ai-tools-v2/${name}.webp`;

export const PDP_STUDIO_TOOL_ASSETS: Record<PdpStudioToolId, string> = {
  "video-generator": asset("video-generator"),
  "ai-fashion-models": asset("ai-fashion-models"),
  "product-staging": asset("product-staging"),
  "product-beautifier": asset("product-beautifier"),
  "edit-with-ai": asset("edit-with-ai"),
  "create-any-image": asset("create-any-image"),
  "ghost-mannequin": asset("ghost-mannequin"),
  "flat-lay": asset("flat-lay"),
  logo: asset("logo"),
  recolor: asset("recolor"),
  "product-photography": asset("product-photography"),
  text: asset("text"),
  ironing: asset("ironing"),
  "product-packaging": asset("product-packaging"),
  "instagram-story": asset("instagram-story"),
  "product-fixer": asset("product-fixer"),
  "image-enhancer": asset("image-enhancer"),
  "ai-backgrounds": asset("ai-backgrounds"),
  "ai-expand": asset("ai-expand"),
  "ai-images": asset("ai-images"),
  "ai-shadows": asset("ai-shadows"),
  "background-remover": asset("background-remover"),
  resize: asset("resize"),
  retouch: asset("retouch"),
  "studio-shot": asset("studio-shot"),
  "ai-shot-list": asset("ai-shot-list"),
};
