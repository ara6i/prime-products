"use server";

import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import { mapStoresPage } from "../mappers/storesMapper";
import type { StoresPage } from "@/app/admin/shared/types";
import type { StoresFilterState } from "../types";

export async function listStores(filters: StoresFilterState): Promise<StoresPage> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.source && filters.source !== "all") params.set("source", filters.source);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));

  try {
    const data = await adminFetch<unknown>(`/api/admin/stores?${params.toString()}`);
    return mapStoresPage(data as Parameters<typeof mapStoresPage>[0]);
  } catch (error) {
    console.error("Failed to list stores", error);
    return mapStoresPage(null);
  }
}
