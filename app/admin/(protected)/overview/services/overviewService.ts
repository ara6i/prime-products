import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { ShopifyDashboardRange, ShopifyDashboardRaw } from "../types";

export async function fetchShopifyDashboardOverview(
  range: ShopifyDashboardRange = "month",
): Promise<ShopifyDashboardRaw> {
  return adminFetch<ShopifyDashboardRaw>(
    `/api/admin/analytics/shopify-dashboard?range=${encodeURIComponent(range)}`,
  );
}
