import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type {
  AdminCustomerDetailRaw,
  AdminCustomerListQuery,
  AdminCustomerSource,
  AdminCustomersResponse,
  ShopifyBehaviorAnalyticsRaw,
  ShopifyControlCenterRaw,
  ShopifyRevenueAnalyticsRaw,
  ShopifyTryOnOverview,
  ShopifyTryOnRange,
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

export async function fetchAdminCustomers(query: AdminCustomerListQuery): Promise<AdminCustomersResponse> {
  return adminFetch<AdminCustomersResponse>(`/api/admin/stores?${createCustomerSearchParams(query)}`);
}

export async function fetchAdminShopifyTryOnOverview(
  range: ShopifyTryOnRange = "30d",
): Promise<ShopifyTryOnOverview> {
  return adminFetch<ShopifyTryOnOverview>(
    `/api/admin/analytics/shopify-tryons?range=${encodeURIComponent(range)}`,
  );
}

export async function fetchAdminCustomer(
  source: AdminCustomerSource,
  id: string,
): Promise<AdminCustomerDetailRaw> {
  return adminFetch<AdminCustomerDetailRaw>(
    `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}`,
  );
}

export async function fetchAdminShopifyControlCenter(id: string): Promise<ShopifyControlCenterRaw> {
  return adminFetch<ShopifyControlCenterRaw>(
    `/api/admin/stores/shopify/${encodeURIComponent(id)}/control-center`,
  );
}

export async function fetchAdminShopifyBehavior(
  id: string,
  range = "30d",
): Promise<ShopifyBehaviorAnalyticsRaw> {
  return adminFetch<ShopifyBehaviorAnalyticsRaw>(
    `/api/admin/stores/shopify/${encodeURIComponent(id)}/behavior?range=${encodeURIComponent(range)}`,
  );
}

export async function fetchAdminShopifyRevenue(
  id: string,
  range = "30d",
): Promise<ShopifyRevenueAnalyticsRaw> {
  return adminFetch<ShopifyRevenueAnalyticsRaw>(
    `/api/admin/stores/shopify/${encodeURIComponent(id)}/revenue?range=${encodeURIComponent(range)}`,
  );
}
