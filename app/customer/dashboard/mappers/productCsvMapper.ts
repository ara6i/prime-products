import type {
  CustomerImportedProduct,
  CustomerImportedVariant,
  CustomerProductImportSummary,
  CustomerProductInventoryFilter,
  CustomerProductSelectionFilter,
  CustomerProductSelectionState,
} from "../types/products";

export const CUSTOMER_PRODUCT_COLLECTION_ALL = "__all__";

export const customerProductSelectionFilterOptions: Array<{ label: string; value: CustomerProductSelectionFilter }> = [
  { label: "All products", value: "all" },
  { label: "Current cycle", value: "current-cycle" },
  { label: "Not current cycle", value: "not-current-cycle" },
  { label: "Live storefront", value: "live" },
  { label: "Off storefront", value: "off" },
];

export const customerProductInventoryFilterOptions: Array<{ label: string; value: CustomerProductInventoryFilter }> = [
  { label: "In stock", value: "in-stock" },
  { label: "Out of stock", value: "out-of-stock" },
  { label: "All inventory", value: "all" },
];

export function variantInventoryQuantity(variant: CustomerImportedVariant): number {
  return Math.max(0, variant.inventoryQuantity);
}

export function productAvailableVariantCount(product: CustomerImportedProduct): number {
  return product.variants.filter((variant) => variantInventoryQuantity(variant) > 0).length;
}

export function productTotalInventory(product: CustomerImportedProduct): number {
  return product.variants.reduce((sum, variant) => sum + variantInventoryQuantity(variant), 0);
}

export function productHasInventory(product: CustomerImportedProduct): boolean {
  return productAvailableVariantCount(product) > 0;
}

export function productInventorySummary(product: CustomerImportedProduct): string {
  const availableVariantCount = productAvailableVariantCount(product);
  const totalVariantCount = product.variants.length;
  const totalInventory = productTotalInventory(product);
  const variantLabel = totalVariantCount === 1 ? "variant" : "variants";

  if (availableVariantCount === totalVariantCount) {
    return `${totalVariantCount.toLocaleString()} ${variantLabel} available · ${totalInventory.toLocaleString()} in inventory`;
  }

  if (availableVariantCount > 0) {
    return `${availableVariantCount.toLocaleString()} of ${totalVariantCount.toLocaleString()} ${variantLabel} available · ${totalInventory.toLocaleString()} in inventory`;
  }

  return `${totalVariantCount.toLocaleString()} ${variantLabel} · out of stock`;
}

export function mapProductCollections(products: CustomerImportedProduct[]): string[] {
  return Array.from(new Set(products.map((product) => product.collection).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

export function filterCustomerProducts({
  products,
  selectionState,
  search,
  collectionFilter,
  selectionFilter,
  inventoryFilter,
}: {
  products: CustomerImportedProduct[];
  selectionState: Record<string, CustomerProductSelectionState>;
  search: string;
  collectionFilter: string;
  selectionFilter: CustomerProductSelectionFilter;
  inventoryFilter: CustomerProductInventoryFilter;
}): CustomerImportedProduct[] {
  const normalizedSearch = search.trim().toLowerCase();

  return products.filter((product) => {
    const state = selectionState[product.handle] ?? { currentCycle: false, currentStorefront: false };
    const searchSource = [
      product.title,
      product.handle,
      product.collection,
      product.type,
      ...product.tags,
      ...product.variants.flatMap((variant) => [variant.title, variant.sku]),
    ].join(" ").toLowerCase();
    const matchesSearch = !normalizedSearch || searchSource.includes(normalizedSearch);
    const matchesCollection = collectionFilter === CUSTOMER_PRODUCT_COLLECTION_ALL || product.collection === collectionFilter;
    const matchesSelection =
      selectionFilter === "all" ||
      (selectionFilter === "current-cycle" && state.currentCycle) ||
      (selectionFilter === "not-current-cycle" && !state.currentCycle) ||
      (selectionFilter === "live" && state.currentStorefront) ||
      (selectionFilter === "off" && !state.currentStorefront);
    const matchesInventory =
      inventoryFilter === "all" ||
      (inventoryFilter === "in-stock" && productHasInventory(product)) ||
      (inventoryFilter === "out-of-stock" && !productHasInventory(product));

    return matchesSearch && matchesCollection && matchesSelection && matchesInventory;
  });
}

export function mapCustomerProductImportSummary({
  products,
  visibleProducts,
  selectionState,
}: {
  products: CustomerImportedProduct[];
  visibleProducts: CustomerImportedProduct[];
  selectionState: Record<string, CustomerProductSelectionState>;
}): CustomerProductImportSummary {
  return {
    productCount: products.length,
    variantCount: products.reduce((sum, product) => sum + product.variants.length, 0),
    visibleProductCount: visibleProducts.length,
    visibleVariantCount: visibleProducts.reduce((sum, product) => sum + product.variants.length, 0),
    currentCycleCount: products.filter((product) => selectionState[product.handle]?.currentCycle).length,
    liveCount: products.filter((product) => selectionState[product.handle]?.currentStorefront).length,
  };
}
