import { categoryCatalogData } from "../data/categoryCatalog.data";
import { mapCategoryCatalog } from "../mappers/categoryCatalog.mapper";
import {
  SHOP_CATEGORY_IDS,
  type CategoryCatalog,
  type ShopCategoryId,
} from "../types/categoryCatalog.types";

export function isShopCategoryId(value: string): value is ShopCategoryId {
  return SHOP_CATEGORY_IDS.includes(value as ShopCategoryId);
}

export async function getCategoryCatalog(
  categoryId: string,
): Promise<CategoryCatalog | null> {
  if (!isShopCategoryId(categoryId)) return null;
  const raw = categoryCatalogData.find(
    (category) => category.id === categoryId,
  );
  return raw ? mapCategoryCatalog(raw) : null;
}

export function getStaticCategoryIds(): ShopCategoryId[] {
  return [...SHOP_CATEGORY_IDS];
}
