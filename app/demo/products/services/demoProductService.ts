import type { DemoProductApi, DemoProductListApi } from "../types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const PATH = "/api/catalog/demo/products";

function url(path: string) {
  return `${BASE}${path}`;
}

/** Fetch a paginated list of demo products (server-safe) */
export async function fetchDemoProducts(params: {
  page?: number;
  limit?: number;
  sort?: string;
  categories?: string;
  search?: string;
}): Promise<DemoProductListApi> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sort) qs.set("sort", params.sort);
  if (params.categories) qs.set("categories", params.categories);
  if (params.search) qs.set("search", params.search);

  const res = await fetch(url(`${PATH}?${qs.toString()}`), { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchDemoProducts: ${res.status}`);
  return res.json();
}

/** Fetch a single demo product by ID (server-safe) */
export async function fetchDemoProduct(
  productId: string,
  color?: string,
): Promise<DemoProductApi> {
  const qs = color ? `?color=${encodeURIComponent(color)}` : "";
  const res = await fetch(url(`${PATH}/${productId}${qs}`), { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchDemoProduct: ${res.status}`);
  return res.json();
}
