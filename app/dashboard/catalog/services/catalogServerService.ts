"use server";

import { cookies } from "next/headers";
import { mapCatalogProductsToViewModel, type CatalogProductViewModel } from "../mapper/catalogMapper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const BASE_PATH = "/api/catalog/products";

async function fetchWithCookies(path: string, init?: RequestInit) {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`catalogServerService: ${response.status} ${message}`);
  }

  return response.json();
}

export async function getCatalogProductsByIds(productIds: string[]): Promise<CatalogProductViewModel[]> {
  if (!productIds.length) return [];
  const results: CatalogProductViewModel[] = [];

  for (const id of productIds) {
    try {
      const data = await fetchWithCookies(`${BASE_PATH}/${id}`);
      const mapped = mapCatalogProductsToViewModel([data]);
      if (mapped[0]) {
        results.push(mapped[0]);
      }
    } catch (error) {
      console.error("Failed to fetch catalog product", id, error);
    }
  }

  return results;
}

export async function getCatalogProduct(productId: string): Promise<CatalogProductViewModel | null> {
  const items = await getCatalogProductsByIds([productId]);
  return items[0] ?? null;
}

type ListProductsOptions = {
  sort?: string;
  limit?: number;
  page?: number;
};

export async function listCatalogProducts(options: ListProductsOptions = {}) {
  const params = new URLSearchParams();
  if (options.sort) params.set("sort", options.sort);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.page) params.set("page", String(options.page));

  const query = params.toString();
  const data = await fetchWithCookies(`${BASE_PATH}${query ? `?${query}` : ""}`);
  const items = mapCatalogProductsToViewModel(data.items ?? []);

  return {
    items,
    page: data.page ?? 1,
    limit: data.limit ?? items.length,
    total: data.total ?? items.length,
    totalPages: data.totalPages ?? 1,
  };
}


