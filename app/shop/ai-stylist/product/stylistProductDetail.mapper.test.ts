import { describe, expect, it } from "vitest";
import type {
  StylistCatalogProduct,
  StylistSizeRecommendation,
} from "@/app/ai-stylist/types";
import { mapStylistProductDetail } from "./stylistProductDetail.mapper";

const product: StylistCatalogProduct = {
  product_id: "style-1",
  style_rag_id: "style-1",
  source_product_id: "15263111577645",
  source: "style_rag",
  name: "Contrast Ruffled Hem Square Neck Tank",
  brand: "Trendsi",
  description: "Merchant description",
  category: "top",
  parentCategory: "tops",
  gender: "female",
  price: 45.76,
  currency: "USD",
  stock_status: "InStock",
  image_urls: ["https://images.test/cutout.png", "https://images.test/front.webp"],
  cutout_image_url: "https://images.test/cutout.png",
  enriched_image_url: "https://images.test/detail.webp",
  sizes: ["S", "M", "L", "XL"],
  color: "Black and white",
  material: "67% polyester, 30% rayon, 3% spandex",
  pattern: "solid",
  season: "summer",
  season_tags: ["summer"],
  occasion: ["everyday", "date-night"],
  tags: ["square-neck"],
  style_tags: ["ruffled-hem"],
  fit_tags: ["fitted"],
  silhouette_tags: ["peplum"],
  coverage_tags: ["sleeveless"],
  formality: "casual",
  is_virtual_tryon_supported: true,
  rating: 0,
  reviews_count: 0,
  affiliate_url: null,
  product_url: null,
  date_added: "2026-08-12T00:00:00.000Z",
  variants: [],
};

describe("mapStylistProductDetail", () => {
  it("keeps the real Trendsi price, images, sizes, and honest unavailable state", () => {
    const result = mapStylistProductDetail(product, null);

    expect(result.name).toBe(product.name);
    expect(result.brandName).toBe("Trendsi");
    expect(result.priceLabel).toBe("$45.76");
    expect(result.gallery.map((image) => image.src)).toEqual([
      "https://images.test/cutout.png",
      "https://images.test/front.webp",
      "https://images.test/detail.webp",
    ]);
    expect(result.sizes).toEqual(["S", "M", "L", "XL"]);
    expect(result.ratingLabel).toBeUndefined();
    expect(result.reviewLabel).toBeUndefined();
    expect(result.sizeRecommendation?.status).toBe("unavailable");
    expect(result.canonicalHref).toBe("/shop/ai-stylist/product/style-1");
  });

  it("carries a verified personal size into the PDP", () => {
    const recommendation: StylistSizeRecommendation = {
      styleRagId: "style-1",
      status: "ready",
      recommendedSize: "M",
      confidence: "high",
      reason: "Matched to the saved fit profile.",
      availableSizes: product.sizes,
    };

    expect(mapStylistProductDetail(product, recommendation).sizeRecommendation).toMatchObject({
      status: "ready",
      recommendedSize: "M",
      label: "Recommended size M",
    });
  });
});
