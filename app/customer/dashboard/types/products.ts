export type CustomerProductSelectionFilter = "all" | "current-cycle" | "not-current-cycle" | "live" | "off";

export type CustomerProductInventoryFilter = "in-stock" | "out-of-stock" | "all";

export interface CustomerImportedVariant {
  id: string;
  title: string;
  sku: string;
  image: string;
  inventoryQuantity: number;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface CustomerImportedProduct {
  id: string;
  handle: string;
  title: string;
  image: string;
  collection: string;
  type: string;
  tags: string[];
  variants: CustomerImportedVariant[];
}

export interface CustomerProductSelectionState {
  currentCycle: boolean;
  currentStorefront: boolean;
}

export interface CustomerProductCsvParseResult {
  products: CustomerImportedProduct[];
  defaultStates: Record<string, CustomerProductSelectionState>;
}

export interface CustomerProductFilterOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

export interface CustomerProductImportSummary {
  productCount: number;
  variantCount: number;
  visibleProductCount: number;
  visibleVariantCount: number;
  currentCycleCount: number;
  liveCount: number;
}
