"use client";

import type {
  AdminCustomerDetailRaw,
  AdminCustomerListQuery,
  AdminCustomerSource,
  AdminCustomersResponse,
  ShopifyBehaviorAnalyticsRaw,
  ShopifyBillingOverridePayload,
  ShopifyControlCenterMutationResponse,
  ShopifyControlCenterRaw,
  ShopifyRevenueAnalyticsRaw,
  ShopifyUsageLimitsPayload,
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

export async function fetchAdminShopifyControlCenterClient(id: string): Promise<ShopifyControlCenterRaw> {
  const response = await fetch(`/api/admin/stores/shopify/${encodeURIComponent(id)}/control-center`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load Shopify customer");
  }
  return (await response.json()) as ShopifyControlCenterRaw;
}

export async function fetchAdminShopifyBehaviorClient(
  id: string,
  range = "30d",
): Promise<ShopifyBehaviorAnalyticsRaw> {
  const response = await fetch(
    `/api/admin/stores/shopify/${encodeURIComponent(id)}/behavior?range=${encodeURIComponent(range)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Failed to load Shopify behavior analytics");
  }
  return (await response.json()) as ShopifyBehaviorAnalyticsRaw;
}

export async function fetchAdminShopifyRevenueClient(
  id: string,
  range = "30d",
): Promise<ShopifyRevenueAnalyticsRaw> {
  const response = await fetch(
    `/api/admin/stores/shopify/${encodeURIComponent(id)}/revenue?range=${encodeURIComponent(range)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Failed to load Shopify revenue analytics");
  }
  return (await response.json()) as ShopifyRevenueAnalyticsRaw;
}

export async function updateShopifyBillingOverrideClient(
  id: string,
  payload: ShopifyBillingOverridePayload,
): Promise<ShopifyControlCenterMutationResponse> {
  const response = await fetch(`/api/admin/stores/shopify/${encodeURIComponent(id)}/billing-override`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update billing override");
  }
  return (await response.json()) as ShopifyControlCenterMutationResponse;
}

export async function updateShopifyUsageLimitsClient(
  id: string,
  payload: ShopifyUsageLimitsPayload,
): Promise<ShopifyControlCenterMutationResponse> {
  const response = await fetch(`/api/admin/stores/shopify/${encodeURIComponent(id)}/usage-limits`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update usage limits");
  }
  return (await response.json()) as ShopifyControlCenterMutationResponse;
}

export async function updateShopifyStatusClient(id: string, status: "active" | "suspended"): Promise<void> {
  const action = status === "active" ? "activate" : "suspend";
  const response = await fetch(`/api/admin/stores/shopify/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(status === "active" ? "Failed to activate shop" : "Failed to suspend shop");
  }
}

export async function resetCustomerSizeGuideMappingClient(source: AdminCustomerSource, id: string): Promise<void> {
  const response = await fetch(
    `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}/reset-sizeguide-mapping`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to reset size-guide mapping");
  }
}
