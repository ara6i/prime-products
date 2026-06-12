import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { ShopifyTryOnOverview, ShopifyTryOnRange } from "../types";

export async function fetchShopifyTryOnOverview(range: ShopifyTryOnRange): Promise<ShopifyTryOnOverview> {
  return adminFetch<ShopifyTryOnOverview>(`/api/admin/analytics/shopify-tryons?range=${range}`);
}
