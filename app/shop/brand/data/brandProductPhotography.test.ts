// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { mapProductDetail } from "../../product/mappers/productDetail.mapper";
import { getRawProductDetail, getStaticProductIds } from "../../product/services/productDetail.service";
import { mapBrandCatalogToEditorial } from "../mappers/brandEditorial.mapper";
import { brandCatalogData } from "./brandCatalog.data";
import { generatedBrandProductIds } from "./generatedBrandProducts.data";
import { importedBrandProducts } from "./importedBrandProducts.data";

const products = brandCatalogData.flatMap((catalog) => catalog.products.map((product) => ({ catalog, product })));
const assetFile = (src: string) => path.join(process.cwd(), "public", src);

describe("Brand product photography", () => {
  it("covers all 64 products across the eight listed brands", () => {
    expect(brandCatalogData).toHaveLength(8);
    expect(products).toHaveLength(64);
    expect(generatedBrandProductIds.size).toBe(64);
    expect(new Set(products.map(({ product }) => product.id)).size).toBe(64);
  });

  it.each(products)("keeps $product.id matched from catalog to PDP", async ({ catalog, product }) => {
    const original = importedBrandProducts[catalog.id].find(({ id }) => id === product.id)!;
    const source = await getRawProductDetail(product.id);
    expect(source?.kind).toBe("brand");
    expect(getStaticProductIds().filter((id) => id === product.id)).toHaveLength(1);
    const pdp = mapProductDetail(source!);
    expect(pdp.name).toBe(product.name);
    expect(pdp.brandName).toBe(catalog.name);
    expect(pdp.priceCents).toBe(Math.round(original.price * 100));
    expect(pdp.sizes).toEqual(original.sizes);
    expect(pdp.styleCode).toBe(original.styleCode);
    expect(pdp.canonicalHref).toBe(`/shop/product/${product.id}`);
    expect(pdp.sourceHref).toBe(`/shop/brand/${catalog.id}`);
    expect(pdp.isMock).not.toBe(true);
    expect(pdp.ratingLabel).toBeUndefined();
    expect(pdp.reviewLabel).toBeUndefined();
    expect(pdp.gallery).toHaveLength(2);
    expect(pdp.gallery[0].src).toBe(product.image);
    expect(product.image).toBe(`/media/global-shop/brand-products-v1/${product.id}-front.png`);
    expect(pdp.gallery[0].caption).toBe("AI-generated catalog preview");
    expect(pdp.gallery[1].caption).toBe("Original supplier photo");
    expect(pdp.imageNotice).toContain("Details may vary");
    expect(pdp.information.find(({ id }) => id === "materials")?.summary).toContain("has not been supplied");
    for (const view of pdp.gallery) {
      expect(view.src).toContain(product.id);
      expect(view.src).not.toContain("runway-generated");
      const metadata = await sharp(assetFile(view.src)).metadata();
      expect(metadata.width).toBeGreaterThanOrEqual(500);
      expect(metadata.height).toBeGreaterThanOrEqual(750);
      expect(view.alt).toContain(product.name);
    }
    expect(pdp.related.every((item) => catalog.products.some((candidate) => candidate.id === item.id && candidate.image === item.image))).toBe(true);
  });

  it("uses a distinct generated file for every SKU", () => {
    const hashes = products.map(({ product }) => createHash("sha256").update(readFileSync(assetFile(product.image))).digest("hex"));
    expect(new Set(hashes).size).toBe(64);
  });

  it("corrects imported neckline conflicts and the top filed under bottoms", () => {
    const zenana = products.find(({ product }) => product.id === "zenana-08")!.product;
    expect(zenana.name).not.toContain("V-Neck");
    expect(zenana.description).toContain("round neckline");
    expect(products.find(({ product }) => product.id === "davi-dani-06")!.product.category).toBe("Tops");
    expect(importedBrandProducts.zenana[7].name).toContain("V-Neck");
    expect(importedBrandProducts["davi-dani"][5].category).toBe("Bottoms");
    const bombom = products.find(({ product }) => product.id === "bombom-04")!.product;
    expect(bombom.name).not.toContain("Round Neck");
    expect(bombom.description).toContain("shallow V neckline");
    expect(importedBrandProducts.bombom[3].name).toContain("Round Neck");
  });

  it.each(brandCatalogData)("keeps $name editorial and category cards tied to the same catalog photos", (catalog) => {
    const editorial = mapBrandCatalogToEditorial(catalog);
    expect(editorial.droppedProducts.map(({ product }) => product.image)).toEqual(catalog.products.slice(0, 4).map(({ image }) => image));
    for (const card of editorial.categoryCards) {
      expect(catalog.products.some((product) => product.image === card.image && (!card.value || product.category === card.value))).toBe(true);
    }
  });

  it("does not invent runway views or sizes when a product has no explicit gallery or size list", () => {
    const catalog = brandCatalogData[0];
    const product = { ...catalog.products[0], gallery: undefined, sizes: [] };
    const pdp = mapProductDetail({ kind: "brand", productIndex: 0, catalog: { ...catalog, products: [product] } });
    expect(pdp.gallery.map(({ src }) => src)).toEqual([product.image]);
    expect(pdp.sizes).toEqual([]);
  });
});
