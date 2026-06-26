import { fetchDemoProducts } from "@/app/demo/products/services/demoProductService";
import { mapProductList } from "@/app/demo/products/mappers/demoProductMapper";
import { LOCAL_UNIFORM_DEMO_PRODUCTS, mergeLocalDemoProducts } from "@/app/demo/products/utils/localDemoProducts";
import { sortDemoProducts } from "@/app/demo/products/utils/demoProductSort";
import type { DemoProductApi } from "@/app/demo/products/types";
import { mapDemoProductsToCustomerProducts } from "../mappers/customerDemoProductMapper";
import type { CustomerProductCsvParseResult } from "../types/products";

export async function getCustomerDemoProducts(): Promise<CustomerProductCsvParseResult> {
  let rawItems: DemoProductApi[] = LOCAL_UNIFORM_DEMO_PRODUCTS;

  try {
    const raw = await fetchDemoProducts({ page: 1, limit: 100 });
    rawItems = mergeLocalDemoProducts(raw.items ?? []);
  } catch (error) {
    console.error("[CustomerDashboardProducts] Failed to fetch demo products:", error);
  }

  const mapped = mapProductList({
    items: rawItems,
    page: 1,
    limit: rawItems.length,
    total: rawItems.length,
    totalPages: 1,
  });
  const sortedCards = sortDemoProducts(mapped.products);
  const customerProducts = mapDemoProductsToCustomerProducts({
    cards: sortedCards,
    rawProducts: rawItems,
  });

  return {
    products: customerProducts.products,
    defaultStates: customerProducts.selectionState,
  };
}
