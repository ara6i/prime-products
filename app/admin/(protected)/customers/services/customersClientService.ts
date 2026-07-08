"use client";

import type {
  AdminCustomerDetailRaw,
  AdminCustomerListQuery,
  AdminCustomerSource,
  AdminCustomersResponse,
  ShopifyBehaviorAnalyticsRaw,
  ShopifyBillingAutomationTestPayload,
  ShopifyBillingOverridePayload,
  ShopifyControlCenterMutationResponse,
  ShopifyControlCenterRaw,
  ShopifyRevenueAnalyticsRaw,
  StyleMatchSettingMutationResponse,
  ShopifyTryOnOverview,
  ShopifyTryOnRange,
  ShopifyUninstallReport,
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

export async function fetchAdminShopifyTryOnOverviewClient(
  range: ShopifyTryOnRange = "30d",
): Promise<ShopifyTryOnOverview> {
  const response = await fetch(`/api/admin/analytics/shopify-tryons?range=${encodeURIComponent(range)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load Shopify try-on analytics");
  }
  return (await response.json()) as ShopifyTryOnOverview;
}

export async function fetchAdminShopifyUninstallReportClient(): Promise<ShopifyUninstallReport> {
  const response = await fetch("/api/admin/shopify-uninstalls", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load Shopify uninstall reports");
  }
  return (await response.json()) as ShopifyUninstallReport;
}

export async function syncAdminShopifyUninstallReportClient(): Promise<ShopifyUninstallReport> {
  const response = await fetch("/api/admin/shopify-uninstalls/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error("Failed to sync Shopify uninstall reports");
  }
  return (await response.json()) as ShopifyUninstallReport;
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
  customRange?: { from: string; to: string } | null,
): Promise<ShopifyBehaviorAnalyticsRaw> {
  const params = new URLSearchParams({ range });
  if (customRange?.from && customRange.to) {
    params.set("from", customRange.from);
    params.set("to", customRange.to);
  }
  const response = await fetch(
    `/api/admin/stores/shopify/${encodeURIComponent(id)}/behavior?${params.toString()}`,
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
  customRange?: { from: string; to: string } | null,
): Promise<ShopifyRevenueAnalyticsRaw> {
  const params = new URLSearchParams({ range });
  if (customRange?.from && customRange.to) {
    params.set("from", customRange.from);
    params.set("to", customRange.to);
  }
  const response = await fetch(
    `/api/admin/stores/shopify/${encodeURIComponent(id)}/revenue?${params.toString()}`,
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

export async function updateCustomerStyleMatchSettingClient(
  source: AdminCustomerSource,
  id: string,
  enabled: boolean,
): Promise<StyleMatchSettingMutationResponse> {
  const response = await fetch(
    `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}/style-match`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update style RAG setting");
  }
  return (await response.json()) as StyleMatchSettingMutationResponse;
}

export async function runShopifyBillingAutomationTestClient(
  id: string,
  payload: ShopifyBillingAutomationTestPayload,
): Promise<ShopifyControlCenterMutationResponse> {
  const response = await fetch(`/api/admin/stores/shopify/${encodeURIComponent(id)}/billing-automation-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to run billing automation test");
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
