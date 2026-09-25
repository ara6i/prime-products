import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SHOWCASE_PRODUCTS } from "../../data/showcaseCatalog.data";
import { categoryCatalogData } from "../../category/data/categoryCatalog.data";
import {
  SHOWCASE_DEMO_RESULT_VIEWS,
  showcasePreparedResultFile,
} from "../data/productSdkDemo.data";
import { GET as getPreparedResult } from "../../prepared-results/[gender]/[productId]/[fileName]/route";
import { getProductSdkDemo } from "./productSdkDemo.mapper";
import { mapProductDetail } from "./productDetail.mapper";
import { getRawProductDetail } from "../services/productDetail.service";

const root = process.cwd();

const expectedShowcaseBasePhoto = {
  women: "/media/global-shop/sdk-base-models/women-pdp-model-raw-v2.png",
  men: "/media/global-shop/sdk-base-models/men-pdp-model-raw-v2.png",
} as const;

async function getProduct(productId: string) {
  const source = await getRawProductDetail(productId);
  if (!source) throw new Error(`Missing product ${productId}`);
  return mapProductDetail(source);
}

function expectedProfilePhoto(product: Awaited<ReturnType<typeof getProduct>>) {
  return (
    product.gallery.find((item) =>
      /original supplier photo/i.test(item.caption ?? ""),
    )?.src ?? product.gallery[0]?.src
  );
}

describe("prepared Shop PDP SDK demos", () => {
  it("builds a preset profile and five matched results for every showcase PDP", async () => {
    for (const product of SHOWCASE_PRODUCTS) {
      const detail = await getProduct(product.id);
      const demo = getProductSdkDemo(detail);

      expect(demo).toBeDefined();
      expect(demo?.presetProfile.id).toBe(`shop-demo-${product.id}`);
      expect(demo?.presetProfile.gender).toBe(
        product.gender === "women" ? "female" : "male",
      );
      expect(demo?.presetProfile.photoUrl).toBe(
        expectedShowcaseBasePhoto[product.gender],
      );
      expect(demo?.instantOutfitLooks).toHaveLength(5);
      expect(
        demo?.instantOutfitLooks.every((look) =>
          look.items.every((item) => item.productId !== product.id),
        ),
      ).toBe(true);
      for (const look of demo?.instantOutfitLooks ?? []) {
        for (const item of look.items) {
          expect(item.image, item.productId).toMatch(
            /(?:\/01-product-front\.png|\/sdk-companions-v1\/)/,
          );
          expect(item.displayImage, item.productId).toBe(item.image);
          for (const alternative of item.alternatives ?? []) {
            expect(alternative.image, alternative.productId).toMatch(
              /(?:\/01-product-front\.png|\/sdk-companions-v1\/)/,
            );
            expect(alternative.displayImage, alternative.productId).toBe(
              alternative.image,
            );
          }
        }
      }
      expect(demo?.instantOutfitResults).toHaveLength(5);
      expect(demo?.instantOutfitResults.map((result) => result.lookId)).toEqual(
        demo?.instantOutfitLooks.map((look) => look.id),
      );
      expect(
        demo?.instantOutfitResults.every((result, index) =>
          result.image.endsWith(
            `/shop/prepared-results/${product.gender}/${product.id}/look-${String(index + 1).padStart(2, "0")}.png`,
          ),
        ),
      ).toBe(true);

      for (const view of SHOWCASE_DEMO_RESULT_VIEWS) {
        expect(
          existsSync(
            path.join(
              root,
              "public/media/global-shop/showcase-v5",
              product.gender,
              product.id,
              `${view}.png`,
            ),
          ),
        ).toBe(true);
      }
    }
  });

  it("starts every showcase demo from a neutral photo of the same PDP model identity", async () => {
    const womenProduct = await getProduct(
      "women-camel-pinstripe-tailored-blazer",
    );
    const menProduct = await getProduct("men-espresso-double-breasted-blazer");
    const women = getProductSdkDemo(womenProduct);
    const men = getProductSdkDemo(menProduct);

    expect(women?.presetProfile.photoUrl).toBe(
      expectedShowcaseBasePhoto.women,
    );
    expect(men?.presetProfile.photoUrl).toBe(expectedShowcaseBasePhoto.men);
    expect(women?.presetProfile.gender).toBe("female");
    expect(men?.presetProfile.gender).toBe("male");
    expect(women?.presetProfile).toEqual(
      expect.objectContaining({
        bandSize: "34",
        cupSize: "B",
        braSizeRegion: "US",
      }),
    );
  });

  it("gives the Camel Blazer five distinct replacements with real sizes in every category", async () => {
    const product = await getProduct("women-camel-pinstripe-tailored-blazer");
    const demo = getProductSdkDemo(product);

    expect(demo?.instantOutfitLooks).toHaveLength(5);
    for (const look of demo?.instantOutfitLooks ?? []) {
      for (const item of look.items) {
        const options = [item, ...(item.alternatives ?? [])];
        expect(new Set(options.map((option) => option.productId)).size).toBe(5);
        expect(options.every((option) => Boolean(option.recommendedSize))).toBe(
          true,
        );
      }
    }

    for (const slot of ["bottom", "shoe", "bag", "accessory"]) {
      const selectedIds = (demo?.instantOutfitLooks ?? []).map(
        (look) => look.items.find((item) => item.slot === slot)?.productId,
      );
      expect(new Set(selectedIds).size).toBe(5);
    }
  });

  it("prepares five looks for every product currently shown in Women and Men", async () => {
    const genderProducts = categoryCatalogData
      .filter((catalog) => catalog.id === "women" || catalog.id === "men")
      .flatMap((catalog) => catalog.products);

    for (const product of genderProducts) {
      const detail = await getProduct(product.id);
      const demo = getProductSdkDemo(detail);
      const showcase = SHOWCASE_PRODUCTS.find(
        (candidate) => candidate.id === product.id,
      );
      expect(demo?.instantOutfitLooks, product.id).toHaveLength(5);
      expect(
        demo?.instantOutfitLooks.every((look) =>
          look.items.every((item) => item.productId !== product.id),
        ),
        product.id,
      ).toBe(true);
      expect(demo?.instantOutfitResults, product.id).toHaveLength(5);
      expect(demo?.presetProfile.photoUrl, product.id).toBe(
        showcase
          ? expectedShowcaseBasePhoto[showcase.gender]
          : expectedProfilePhoto(detail),
      );
    }
  });

  it("uses each imported brand's worn supplier photo for the prepared profile", async () => {
    const detail = await getProduct("judy-blue-01");
    const demo = getProductSdkDemo(detail);

    expect(detail.gallery[1]?.caption).toBe("Original supplier photo");
    expect(demo?.presetProfile.photoUrl).toBe(detail.gallery[1]?.src);
    expect(
      demo?.instantOutfitResults.every(
        (result) => result.image === detail.gallery[1]?.src,
      ),
    ).toBe(true);
    expect(demo?.presetProfile).toEqual(
      expect.objectContaining({
        gender: "female",
        height: 168,
        weight: 59,
        bandSize: "34",
        cupSize: "B",
        braSizeRegion: "US",
      }),
    );
  });

  it("uses one stable asset convention for later generated results", () => {
    const product = SHOWCASE_PRODUCTS[0];
    expect(showcasePreparedResultFile(product, 0)).toBe(
      `media/global-shop/showcase-sdk-results/${product.gender}/${product.id}/look-01.png`,
    );
  });

  it("serves the stable prepared-result endpoint with an editorial fallback", async () => {
    const product = SHOWCASE_PRODUCTS[0];
    const response = await getPreparedResult(new Request("http://localhost"), {
      params: Promise.resolve({
        gender: product.gender,
        productId: product.id,
        fileName: "look-01.png",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(["fallback", "prepared"]).toContain(
      response.headers.get("x-primestyle-prepared-asset"),
    );
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("wires the showcase-only demo props into the Shop SDK", () => {
    const source = readFileSync(
      path.join(root, "app/shop/product/components/ProductTryOnButton.tsx"),
      "utf8",
    );

    expect(source).toContain(
      'outfitBuilderSource={sdkDemo ? "ai-stylist" : "sdk"}',
    );
    expect(source).toContain("getProductSdkDemo(product)");
    expect(source).toContain(
      "instantOutfitResults={sdkDemo?.instantOutfitResults}",
    );
    expect(source).toContain("presetProfile={sdkDemo?.presetProfile}");
    expect(source).toContain("guidedDemoAutoplay={Boolean(sdkDemo)}");
    expect(source).toContain("usePresetProfileOnly={Boolean(sdkDemo)}");
    expect(source).toContain("showHeaderControls={!sdkDemo}");
  });
});
