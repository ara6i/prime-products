import { brandCatalogData } from "../../brand/data/brandCatalog.data";
import { categoryCatalogData } from "../../category/data/categoryCatalog.data";
import { dailyEditProductDetails } from "../data/dailyEditProductDetails.data";
import type { RawProductDetailSource } from "../types/productDetail.types";

export async function getRawProductDetail(
  productId: string,
): Promise<RawProductDetailSource | null> {
  const mockProduct = dailyEditProductDetails.find((product) => product.id === productId);
  if (mockProduct) return { kind: "mock", product: mockProduct };

  for (const catalog of brandCatalogData) {
    const productIndex = catalog.products.findIndex(
      (product) => product.id === productId,
    );
    if (productIndex >= 0) return { kind: "brand", catalog, productIndex };
  }

  for (const catalog of categoryCatalogData) {
    const productIndex = catalog.products.findIndex(
      (product) => product.id === productId,
    );
    if (productIndex >= 0) return { kind: "category", catalog, productIndex };
  }

  return null;
}

export function getStaticProductIds(): string[] {
  return [
    ...dailyEditProductDetails.map((product) => product.id),
    ...brandCatalogData.flatMap((catalog) =>
      catalog.products.map((product) => product.id),
    ),
    ...categoryCatalogData.flatMap((catalog) =>
      catalog.products.map((product) => product.id),
    ),
  ];
}
