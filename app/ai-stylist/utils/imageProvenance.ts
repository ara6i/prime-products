import type { IntelligentOutfitItem } from "../types";

const LOCAL_ML_RESULT_PATH = "/garment-extraction/results/";

export function isLocalMlOutfitImage(item: IntelligentOutfitItem): boolean {
  if (item.imageProvenance === "local-ml") return true;
  if (item.imagePipelineVersion?.toLowerCase().startsWith("flux2-")) {
    return true;
  }
  const imageUrl = item.cutoutImageUrl ?? item.imageUrl;
  return imageUrl.toLowerCase().includes(LOCAL_ML_RESULT_PATH);
}
