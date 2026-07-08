export type CustomerProductSelectionFilter = "all" | "current-cycle" | "not-current-cycle" | "live" | "off";

export type CustomerProductInventoryFilter = "in-stock" | "out-of-stock" | "all";

export type CustomerProductImportMode = "csv" | "auto-detect";

export type CustomerProductAutoDetectStatus =
  | "idle"
  | "preflight_running"
  | "settings_required"
  | "settings_ready"
  | "import_running"
  | "ready"
  | "failed";

export type CustomerProductAutoDetectStepStatus = "queued" | "active" | "complete";
export type CustomerProductAutoDetectInventoryMode = "track_from_site" | "no_inventory" | "upload_later";
export type CustomerProductAutoDetectVariantMode = "visible_options" | "simple_products" | "review_later";
export type CustomerProductAutoDetectSizeGuideMode = "detect_public_guides" | "no_size_guides" | "upload_later";

export interface CustomerProductAutoDetectStep {
  id: string;
  label: string;
  detail: string;
  found: string;
  status: CustomerProductAutoDetectStepStatus;
}

export interface CustomerProductAutoDetectActivity {
  id: string;
  type?: string;
  level: "info" | "warn" | "error";
  message: string;
  detail?: string | null;
  timestamp: string;
}

export interface CustomerProductAutoDetectCategory {
  id: string;
  sourceLabel: string;
  sourceUrl: string;
  sourcePath: string;
  source: "seed" | "sitemap" | "page-link";
  depth: number;
  selected: boolean;
  mappedCategory: string;
  productCountEstimate: number | null;
}

export interface CustomerProductAutoDetectSettings {
  inventoryMode: CustomerProductAutoDetectInventoryMode;
  variantMode: CustomerProductAutoDetectVariantMode;
  sizeGuideMode: CustomerProductAutoDetectSizeGuideMode;
  categoryMappings: CustomerProductAutoDetectCategory[];
}

export interface CustomerProductAutoDetectProduct {
  id: string;
  handle: string;
  title: string;
  image: string;
  sourceUrl: string;
  canonicalUrl?: string;
  collection: string;
  type: string;
  tags: string[];
  categoryPath?: string[];
  categoryPaths?: string[][];
  mergedUrls?: string[];
  price?: string;
  currency?: string;
  brand?: string;
  description?: string;
  sizeGuideUrl?: string;
  sizeGuideText?: string;
  variantCount: number;
  confidence: number;
  status: "detecting" | "review";
  selected?: boolean;
  reviewedAt?: string | null;
  missingFields?: string[];
  coverageScore?: number;
  variants: Array<{
    id: string;
    title: string;
    sku: string;
    image: string;
    inventoryQuantity: number;
    options: string;
    price?: string;
  }>;
}

export type CustomerProductAutoDetectField = "websiteUrl" | "authorized";

export interface CustomerProductAutoDetectForm {
  websiteUrl: string;
  authorized: boolean;
}

export interface CustomerProductAutoDetectCoverage {
  found: string[];
  missing: string[];
  warnings: string[];
}

export interface CustomerProductAutoDetectJob {
  id: string;
  status: Exclude<CustomerProductAutoDetectStatus, "idle">;
  websiteUrl: string;
  hostname: string;
  categories: CustomerProductAutoDetectCategory[];
  settings: CustomerProductAutoDetectSettings | null;
  products: CustomerProductAutoDetectProduct[];
  events: CustomerProductAutoDetectActivity[];
  coverage: CustomerProductAutoDetectCoverage;
  stats: Record<string, unknown>;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export type CustomerProductAutoDetectErrors = Partial<Record<CustomerProductAutoDetectField, string>>;

export type CustomerProductAutoDetectTouched = Partial<Record<CustomerProductAutoDetectField, boolean>>;

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
