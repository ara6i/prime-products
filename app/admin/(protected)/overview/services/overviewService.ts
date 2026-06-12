import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { ShopifyDashboardRange, ShopifyDashboardRaw } from "../types";

interface ShopifyDashboardOverviewQuery {
  tryOnRange?: ShopifyDashboardRange;
  installRange?: ShopifyDashboardRange;
  date?: string | null;
}

export async function fetchShopifyDashboardOverview({
  tryOnRange = "month",
  installRange = "month",
  date,
}: ShopifyDashboardOverviewQuery = {}): Promise<ShopifyDashboardRaw> {
  const params = new URLSearchParams({
    tryOnRange,
    installRange,
  });
  if (date) params.set("date", date);

  return adminFetch<ShopifyDashboardRaw>(
    `/api/admin/analytics/shopify-dashboard?${params.toString()}`,
  );
}
