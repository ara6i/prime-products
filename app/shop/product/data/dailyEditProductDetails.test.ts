// @vitest-environment node

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dailyEditProducts } from "../../data/dailyEdit.data";
import { mapProductDetail } from "../mappers/productDetail.mapper";
import { mapProductSizeGuide } from "../mappers/productSizeGuide.mapper";
import { getRawProductDetail, getStaticProductIds } from "../services/productDetail.service";
import { dailyEditProductDetails } from "./dailyEditProductDetails.data";

describe("Daily Edit mock product catalog", () => {
  it("preserves the exact four landing names, original images and prices", () => {
    expect(dailyEditProducts.map(({ name, image, price }) => [name, image, price])).toEqual([
      ["Vela Cropped Denim", "/media/global-shop/product-denim-blonde-3d.webp", 148],
      ["Cobalt Track Set", "/media/global-shop/product-cobalt-3d.webp", 72],
      ["Noir Halo Blazer", "/media/global-shop/product-coral-black-3d.webp", 164],
      ["Signal Sport Shell", "/media/global-shop/product-coral-redhead-3d.webp", 198],
    ]);
  });

  it.each(dailyEditProducts)("resolves $name to its own static, matching mock PDP", async (card) => {
    expect(getStaticProductIds().filter((id) => id === card.id)).toHaveLength(1);
    const source = await getRawProductDetail(card.id);
    expect(source?.kind).toBe("mock");
    const product = mapProductDetail(source!);
    expect(product.name).toBe(card.name);
    expect(product.brandName).toBe(card.brand);
    expect(product.priceCents).toBe(card.price * 100);
    expect(product.gallery[0].src).toBe(card.image);
    expect(product.canonicalHref).toBe(`/shop/product/${card.id}`);
    expect(product.canonicalHref).toBe(card.href);
    expect(product.isMock).toBe(true);
    expect(product.tryOnSupported).toBe(false);
    expect(product.ratingLabel).toBeUndefined();
    expect(product.reviewLabel).toBeUndefined();
  });

  it.each(dailyEditProductDetails)("has four distinct existing gallery files and a full size chart for $name", (product) => {
    expect(product.gallery).toHaveLength(4);
    expect(new Set(product.gallery.map((image) => image.src)).size).toBe(4);
    for (const item of product.gallery) {
      expect(existsSync(path.join(process.cwd(), "public", item.src))).toBe(true);
      expect(item.alt).toContain(product.name);
    }
    expect(product.sizes).toHaveLength(6);
    expect(product.sizeGuide?.rows.map(([size]) => size)).toEqual(product.sizes);
    for (const row of product.sizeGuide!.rows) {
      expect(row).toHaveLength(product.sizeGuide!.headers.length);
      expect(row.slice(1).every((value) => Number(value) > 0)).toBe(true);
    }
    expect(mapProductSizeGuide(product)).toBe(product.sizeGuide);
    expect(product.related).toHaveLength(3);
    expect(product.related.every((item) => item.id !== product.id && dailyEditProducts.some((card) => card.id === item.id))).toBe(true);
  });

  it("uses jacket sizing for Vela denim and a two-piece chart for Cobalt", () => {
    const [vela, cobalt, noir, signal] = dailyEditProductDetails;
    expect(vela.sizeGuide?.headers).toContain("Shoulder");
    expect(vela.sizeGuide?.headers).not.toContain("Inseam");
    expect(cobalt.sizeGuide?.headers).toEqual(["Size", "Jacket chest", "Jacket length", "Waist", "Inseam"]);
    expect(noir.sizeGuide?.headers).toContain("Hip");
    expect(signal.sizeGuide?.headers).toContain("Hem");
  });

  it("leaves existing catalog product routes and missing-product behavior intact", async () => {
    expect((await getRawProductDetail("denim-light-wide-leg"))?.kind).toBe("category");
    expect((await getRawProductDetail("orange-shell"))?.kind).toBe("category");
    expect(await getRawProductDetail("daily-edit-not-a-product")).toBeNull();
  });
});
