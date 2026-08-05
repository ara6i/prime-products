import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";
import type { PdpStudioDialogSourceImage } from "../types/homeToolDialog";

export function mapPdpStudioAssetToDialogSource(
  asset: PdpStudioAsset,
  fallbackName: string,
): PdpStudioDialogSourceImage {
  return {
    assetId: asset.id,
    name: asset.originalName || fallbackName,
    previewUrl: asset.url,
  };
}
