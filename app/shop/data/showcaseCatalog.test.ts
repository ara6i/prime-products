import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categoryCatalogData } from "../category/data/categoryCatalog.data";
import { getProductInstantOutfitLooks } from "../product/mappers/productOutfitLooks.mapper";
import { getRawProductDetail } from "../product/services/productDetail.service";
import { mapProductDetail } from "../product/mappers/productDetail.mapper";
import { mapProductSizeGuide } from "../product/mappers/productSizeGuide.mapper";
import {
  SHOWCASE_GENDERS,
  SHOWCASE_PRODUCTS,
  SHOWCASE_PRODUCT_SPECIFICATIONS,
  SHOWCASE_SLOTS,
  getShowcaseProductSpecification,
  showcaseAsset,
} from "./showcaseCatalog.data";

const root = process.cwd();

describe("generated shop showcase catalog", () => {
  it("contains exactly ten products per gender and two products per required slot", () => {
    expect(SHOWCASE_PRODUCTS).toHaveLength(20);
    for (const gender of SHOWCASE_GENDERS) {
      const products = SHOWCASE_PRODUCTS.filter(
        (product) => product.gender === gender,
      );
      expect(products).toHaveLength(10);
      for (const slot of SHOWCASE_SLOTS) {
        expect(
          products.filter((product) => product.slot === slot),
        ).toHaveLength(2);
      }
    }
  });

  it("has complete sizes, unique routes, restrained colors and nine valid images per product", () => {
    expect(new Set(SHOWCASE_PRODUCTS.map((product) => product.id)).size).toBe(
      20,
    );
    for (const product of SHOWCASE_PRODUCTS) {
      expect(product.sizes.length).toBeGreaterThan(0);
      expect(product.color).not.toMatch(
        /\b(?:black|navy|neon|electric|acid)\b/i,
      );
      for (const filename of [
        "01-product-front",
        "02-product-back",
        "03-model-front",
        "04-model-three-quarter",
        "05-model-back",
        "06-model-movement",
        "07-model-crop",
        "08-detail",
        "09-model-alternate",
      ]) {
        expect(
          existsSync(
            path.join(root, "public", showcaseAsset(product, filename)),
          ),
        ).toBe(true);
      }
    }
  });

  it("uses only isolated product images for category default and hover states", () => {
    for (const gender of SHOWCASE_GENDERS) {
      const catalog = categoryCatalogData.find(
        (candidate) => candidate.id === gender,
      );
      const showcaseIds = new Set(
        SHOWCASE_PRODUCTS.filter((product) => product.gender === gender).map(
          (product) => product.id,
        ),
      );
      const showcaseProducts = (catalog?.products ?? []).filter((product) =>
        showcaseIds.has(product.id),
      );
      expect(showcaseProducts).toHaveLength(10);
      for (const product of showcaseProducts) {
        expect(product.image).toContain("/01-product-front.png");
        expect(product.hoverImage).toContain("/02-product-back.png");
        expect(product.image).not.toContain("model");
        expect(product.hoverImage).not.toContain("model");
      }
    }
  });

  it("provides complete product-specific content and structured size guides", () => {
    expect(Object.keys(SHOWCASE_PRODUCT_SPECIFICATIONS)).toHaveLength(20);

    for (const product of SHOWCASE_PRODUCTS) {
      const specification = getShowcaseProductSpecification(product.id);
      expect(specification).toBeDefined();
      if (!specification) continue;

      expect(specification.details.length).toBeGreaterThanOrEqual(3);
      expect(specification.materialDetails.length).toBeGreaterThanOrEqual(1);
      expect(specification.careInstructions.length).toBeGreaterThanOrEqual(2);
      expect(specification.fitDescription.length).toBeGreaterThan(20);
      expect(specification.fitNotes.length).toBeGreaterThanOrEqual(2);
      expect(specification.sizeGuide.rows.map(([size]) => size)).toEqual(
        product.sizes,
      );
      expect(specification.sizeGuide.headers[0]).toBe("Size");
      expect(
        specification.sizeGuide.rows.every(
          (row) => row.length === specification.sizeGuide.headers.length,
        ),
      ).toBe(true);

      const normalizedHeaders = specification.sizeGuide.headers
        .join(" ")
        .toLowerCase();
      if (product.fitType === "shoe") {
        expect(normalizedHeaders).toContain("foot length");
        expect(normalizedHeaders).toContain("insole length");
        expect(normalizedHeaders).toContain("width");
      } else if (product.slot === "top") {
        expect(normalizedHeaders).toMatch(/chest|bust/);
        expect(normalizedHeaders).toContain("waist");
        expect(normalizedHeaders).toContain("hip");
        expect(normalizedHeaders).toContain("shoulder");
        expect(normalizedHeaders).toContain("sleeve");
      } else if (product.slot === "bottom") {
        expect(normalizedHeaders).toContain("waist");
        expect(normalizedHeaders).toContain("hip");
        expect(normalizedHeaders).toMatch(/inseam|length/);
      } else {
        expect(specification.sizeGuide.headers.length).toBeGreaterThanOrEqual(
          4,
        );
      }
    }
  });

  it("maps every PDP to nine ordered views and clean SDK garment references", async () => {
    for (const product of SHOWCASE_PRODUCTS) {
      const source = await getRawProductDetail(product.id);
      expect(source?.kind).toBe("category");
      if (!source) continue;
      const detail = mapProductDetail(source);
      expect(detail.gallery).toHaveLength(9);
      expect(detail.gallery[0].src).toContain("03-model-front.png");
      expect(
        detail.gallery
          .slice(0, 6)
          .every((view) => view.src.includes("/showcase-v5/")),
      ).toBe(true);
      expect(
        detail.gallery
          .slice(0, 6)
          .every((view) => existsSync(path.join(root, "public", view.src))),
      ).toBe(true);
      expect(detail.gallery[6].src).toContain("01-product-front.png");
      expect(detail.gallery[7].src).toContain("02-product-back.png");
      expect(detail.gallery[8].src).toContain("08-detail.png");
      expect(
        detail.gallery
          .slice(6)
          .every((view) => view.src.includes("/showcase-v4/")),
      ).toBe(true);
      expect(detail.garmentReferenceImage).toContain("01-product-front.png");
      expect(detail.garmentDetailImage).toContain("08-detail.png");
      expect(detail.sizeGuide).toEqual(
        getShowcaseProductSpecification(product.id)?.sizeGuide,
      );
      expect(mapProductSizeGuide(detail)).toEqual(detail.sizeGuide);
      expect(detail.information.map((section) => section.title)).toEqual([
        "Details",
        "Materials",
        "Size & Fit",
        "Showcase status",
      ]);
      expect(
        detail.information.every((section) => section.items.length >= 3),
      ).toBe(true);
      expect(detail.ratingLabel).toBeUndefined();
      expect(detail.reviewLabel).toBeUndefined();
    }
  });

  it("builds five same-gender companion looks without duplicating the pinned product", () => {
    for (const pinned of SHOWCASE_PRODUCTS) {
      const looks = getProductInstantOutfitLooks(pinned.id);
      expect(looks).toHaveLength(5);
      for (const look of looks) {
        expect(look.items).toHaveLength(4);
        expect(new Set(look.items.map((item) => item.slot))).toEqual(
          new Set(SHOWCASE_SLOTS.filter((slot) => slot !== pinned.slot)),
        );
        expect(look.items.some((item) => item.productId === pinned.id)).toBe(
          false,
        );
        for (const item of look.items) {
          const catalogProduct = SHOWCASE_PRODUCTS.find(
            (candidate) => candidate.id === item.productId,
          );
          expect(catalogProduct?.gender).toBe(pinned.gender);
          expect(item.url).toBe(`/shop/product/${item.productId}`);
          expect(item.alternatives).toHaveLength(1);
          expect(item.alternatives?.[0].slot).toBe(item.slot);
        }
      }
    }
  });
});
