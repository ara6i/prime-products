import { brandCatalogData } from "../data/brandCatalog.data";
import {
  SHOP_BRAND_IDS,
  type BrandCatalog,
  type ShopBrandId,
} from "../types/brandCatalog.types";

export function isShopBrandId(value: string): value is ShopBrandId {
  return SHOP_BRAND_IDS.includes(value as ShopBrandId);
}

export async function getBrandCatalog(
  brandId: string,
): Promise<BrandCatalog | null> {
  if (!isShopBrandId(brandId)) return null;
  return brandCatalogData.find((brand) => brand.id === brandId) ?? null;
}

export function getStaticBrandIds(): ShopBrandId[] {
  return [...SHOP_BRAND_IDS];
}
