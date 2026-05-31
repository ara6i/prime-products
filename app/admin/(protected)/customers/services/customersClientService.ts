"use client";

import type {
  AdminCustomerDetailRaw,
  AdminCustomerListQuery,
  AdminCustomerSource,
  AdminCustomersResponse,
} from "../types";

function createCustomerSearchParams(query: AdminCustomerListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    source: query.source,
  });
  if (query.search.trim()) {
    params.set("search", query.search.trim());
  }
  return params.toString();
}

export async function fetchAdminCustomersClient(query: AdminCustomerListQuery): Promise<AdminCustomersResponse> {
  const response = await fetch(`/api/admin/stores?${createCustomerSearchParams(query)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load customers");
  }
  return (await response.json()) as AdminCustomersResponse;
}

export async function fetchAdminCustomerClient(
  source: AdminCustomerSource,
  id: string,
): Promise<AdminCustomerDetailRaw> {
  const response = await fetch(`/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load customer");
  }
  return (await response.json()) as AdminCustomerDetailRaw;
}
