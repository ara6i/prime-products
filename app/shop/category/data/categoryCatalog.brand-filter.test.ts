// @vitest-environment node

import { describe, expect, it } from "vitest";
import { brandCatalogData } from "../../brand/data/brandCatalog.data";
import { mapCategoryCatalog } from "../mappers/categoryCatalog.mapper";
import { SHOP_CATEGORY_IDS } from "../types/categoryCatalog.types";
import {
  categoryProductMatchesFilters,
  createInitialCategoryFilters,
} from "../utils/categoryCatalogFilters";
import { categoryCatalogData } from "./categoryCatalog.data";

describe("Women brand collections", () => {
  it("keeps Denim products under Women without exposing a Denim category", () => {
    expect(SHOP_CATEGORY_IDS).toEqual(["women", "men", "accessories"]);
    expect(categoryCatalogData.map((catalog) => catalog.id).sort()).toEqual([
      "accessories",
      "men",
      "women",
    ]);
    const women = categoryCatalogData.find((catalog) => catalog.id === "women");
    expect(
      women?.products.some((product) => product.id === "denim-light-wide-leg"),
    ).toBe(true);
  });

  it.each(brandCatalogData)(
    "shows only the real $name products for its query",
    (brand) => {
      const rawWomen = categoryCatalogData.find(
        (catalog) => catalog.id === "women",
      );
      expect(rawWomen).toBeTruthy();
      const women = mapCategoryCatalog(rawWomen!);
      const filters = createInitialCategoryFilters(brand.name);
      const matches = women.products.filter((product) =>
        categoryProductMatchesFilters(product, filters, ""),
      );

      expect(matches).toHaveLength(brand.products.length);
      expect(matches.map((product) => product.id).sort()).toEqual(
        brand.products.map((product) => product.id).sort(),
      );
    },
  );
});
