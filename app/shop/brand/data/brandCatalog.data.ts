import type { BrandCatalog } from "../types/brandCatalog.types";
import { importedBrandProducts } from "./importedBrandProducts.data";
import { shopBrandProfiles } from "./brandProfiles.data";

export const brandCatalogData: BrandCatalog[] = shopBrandProfiles.map(
  (brand) => ({
    ...brand,
    products: importedBrandProducts[brand.id],
  }),
);
