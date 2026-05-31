import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { ShopifyRevenueReport } from "../types";

export async function fetchShopifyRevenueReport(): Promise<ShopifyRevenueReport> {
  return adminFetch<ShopifyRevenueReport>("/api/admin/revenue/shopify");
}
