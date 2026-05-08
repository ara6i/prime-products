/** Raw shape from GET /api/catalog/demo/products */
export interface DemoProductApi {
  _id?: string;
  product_id?: string;
  name?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  price?: number;
  original_price?: number;
  currency?: string;
  stock_status?: string;
  image_urls?: string[];
  gallery?: string[];
  sizes?: string[];
  size_system?: string;
  color?: string;
  color_hex?: string;
  color_variants?: Array<{ name?: string; hex?: string; available?: boolean }>;
  material?: string;
  description?: string;
  short_description?: string;
  tags?: string[];
  is_virtual_tryon_supported?: boolean;
  variants?: Array<{
    id?: string;
    name?: string;
    hex?: string;
    available?: boolean;
    images?: string[];
    sizes?: Array<{ name?: string; sku?: string; availability?: string; price?: number }>;
  }>;
  variant_image_urls?: string[];
  variant_sizes?: Array<{ name?: string; availability?: string }>;
  selected_color?: { id?: string; name?: string; hex?: string; available?: boolean };
  size_guide?: unknown;
  /** Gemini-generated model-free cover image URL (for listing card only) */
  generated_cover?: string;
}

/** Raw shape from GET /api/catalog/demo/products (list) */
export interface DemoProductListApi {
  items: DemoProductApi[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** UI-ready product for the listing grid */
export interface DemoProductCard {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  /** Pre-generated model-free cover Cloudinary URL (only set when a real cover exists). */
  generatedCover?: string;
  /** True when cover detection has already run (real URL or SKIP). No API call needed. */
  coverChecked: boolean;
  vtoSupported: boolean;
}

/** UI-ready list result */
export interface DemoProductListView {
  products: DemoProductCard[];
  page: number;
  total: number;
  totalPages: number;
}

/** Color variant for the detail page */
export interface DemoColorVariant {
  name: string;
  hex: string;
  available: boolean;
  images: string[];
  sizes: DemoSizeOption[];
}

export interface DemoSizeOption {
  name: string;
  available: boolean;
}

/** UI-ready product for the detail page */
export interface DemoProductView {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  material: string;
  images: string[];
  primaryImage: string;
  sizes: DemoSizeOption[];
  sizeSystem: string;
  colorVariants: DemoColorVariant[];
  selectedColor: string;
  /** Raw size guide data — passed directly to SDK's sizeGuideData prop */
  sizeGuideData: unknown;
  /** Structured size guide for the modal */
  sizeGuide: DemoSizeGuide | null;
}

export interface DemoSizeGuideSection {
  name: string;
  description?: string;
  note?: string;
  headers: string[];
  rows: Array<Record<string, string>>;
}

/** Country/region selector entry for the size guide modal. Picking one
 *  filters the table to show only the listed columns plus the size label.
 *  Use code "ALL" to mean "show every column". */
export interface DemoSizeGuideRegion {
  code: string;
  label: string;
  /** Column keys (header names) to keep when this region is selected. */
  columns: string[];
}

/** Row-filtering dropdown — e.g. Fit (Missy/Plus) and Customization
 *  (Standard/Extra Length) for variant-aware charts. Each filter narrows
 *  the visible rows by matching the row's value of `key` to the chosen
 *  option. Multiple filters are AND-combined.  */
export interface DemoSizeGuideFilter {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  default?: string;
}

export interface DemoSizeGuide {
  title: string;
  /** Flat format (single table) */
  headers?: string[];
  rows?: Array<Record<string, string>>;
  /** Multi-section format (multiple tables — jacket, pants, vest, etc.) */
  sections?: DemoSizeGuideSection[];
  unit?: string;
  subtitle?: string;
  howToMeasure?: string[];
  fitTerms?: Array<{ name: string; description: string }>;
  /** Optional country/region selector — adds a dropdown above the table. */
  regions?: DemoSizeGuideRegion[];
  /** Optional row-filter dropdowns (e.g. Fit / Customization for the
   *  wedding gown). When present, the modal renders one <select> per
   *  filter and shows only rows matching the chosen values. */
  filters?: DemoSizeGuideFilter[];
  /** When true, hide the cm/in unit toggle (use for charts that are pure
   *  label conversions and have no actual length measurements). */
  noUnitToggle?: boolean;
  /** Measurement guide images shown in the "How to Measure" section of the modal */
  guideImages?: Array<{ label: string; url: string }>;
}
