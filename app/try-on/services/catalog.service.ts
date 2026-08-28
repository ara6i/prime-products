import type { FilterFacetCounts, FilterState } from "@/app/shared/types";
import type { CatalogAvailabilityContext } from "@/app/ai-stylist/types";

export interface ProductApiItem {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  parentCategory?: string;
  subcategory?: string;
  gender?: string;
  price: number;
  original_price?: number;
  currency: string;
  stock_status: "InStock" | "LowStock" | "OutOfStock";
  image_urls: string[];
  color?: string;
  color_hex?: string;
  material?: string;
  season?: string;
  occasion?: string[];
  is_virtual_tryon_supported?: boolean;
  rating?: number;
  reviews_count?: number;
  affiliate_url?: string | null;
}

interface ProductsResponse {
  items: ProductApiItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
  nextPage?: number | null;
  totalIsExact?: boolean;
  facets?: FilterFacetCounts;
  availabilityContext?: CatalogAvailabilityContext;
}

interface FetchProductsParams {
  search?: string;
  categories?: string[];
  sort?: string;
  userGender?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  filterState?: FilterState;
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductsResponse> {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sort) query.set("sort", params.sort);
  if (params.userGender) query.set("userGender", params.userGender);
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));

  if (params.filterState) {
    const { sort, gender, selectedFilters, priceRange } = params.filterState;

    const SORT_MAP: Record<string, string> = {
      "recommended": "all",
      "most-used": "all",
      "newest": "newest",
      "price-low-high": "price-low",
      "price-high-low": "price-high",
    };
    if (sort) query.set("sort", SORT_MAP[sort] ?? "all");

    if (gender && gender !== "all") query.set("userGender", gender);
    if (priceRange) {
      query.set("minPrice", String(priceRange.min));
      query.set("maxPrice", String(priceRange.max));
    }
    if (selectedFilters) {
      const filterMap: Record<string, string> = {
        categories: "categories",
        occasion: "occasions",
        season: "seasons",
        fit: "tags",
        material: "materials",
        color: "colors",
      };
      for (const [section, paramName] of Object.entries(filterMap)) {
        const values = selectedFilters[section];
        if (values?.length) query.set(paramName, values.join(","));
      }
    }
  }

  if (params.categories?.length) query.set("categories", params.categories.join(","));

  // Catalog cards use incremental backend pagination. Filter counts are loaded
  // independently so the first product request never waits on a full facet scan.
  query.set("pagination", "infinite");
  query.set("includeFacets", "false");
  query.set("view", "card");

  const res = await fetch(`/api/stylist/catalog/products?${query.toString()}`, {
    credentials: "include",
    signal: AbortSignal.timeout(4_000),
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function fetchProductById(productId: string): Promise<ProductApiItem> {
  const res = await fetch(
    `/api/stylist/catalog/products/${encodeURIComponent(productId)}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export async function fetchUserClosetProducts(): Promise<ProductApiItem[]> {
  const res = await fetch("/api/users/me/closet/products", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch closet products");
  const data: { items: ProductApiItem[] } = await res.json();
  return data.items;
}
