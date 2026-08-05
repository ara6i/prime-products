import { describe, expect, it } from "vitest";
import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";
import { mapPdpStudioAssetToDialogSource } from "./pdpStudioDialogSourceMapper";

const asset: PdpStudioAsset = {
  id: "asset-shopify-1",
  source: "shopify",
  resourceType: "image",
  url: "https://example.com/product.jpg",
  mimeType: "image/jpeg",
  bytes: 2048,
  width: 1200,
  height: 1600,
  durationSeconds: null,
  originalName: "front-view.jpg",
  createdAt: "2026-08-03T00:00:00.000Z",
};

describe("mapPdpStudioAssetToDialogSource", () => {
  it("reuses the imported private asset without creating another upload", () => {
    expect(mapPdpStudioAssetToDialogSource(asset, "Fallback product")).toEqual({
      assetId: "asset-shopify-1",
      name: "front-view.jpg",
      previewUrl: "https://example.com/product.jpg",
    });
  });

  it("uses the product title when Shopify has no original filename", () => {
    expect(
      mapPdpStudioAssetToDialogSource(
        { ...asset, originalName: null },
        "Blue linen shirt",
      ).name,
    ).toBe("Blue linen shirt");
  });
});
