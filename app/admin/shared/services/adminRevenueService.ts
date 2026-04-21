"use server";

import { adminFetch } from "./adminFetch";
import type { RevenueOverview } from "../types";

export async function getStoreRevenue(
  shopId: string,
  range: "7d" | "30d" | "90d" = "30d",
): Promise<RevenueOverview | null> {
  try {
    return await adminFetch<RevenueOverview>(
      `/api/admin/stores/shopify/${encodeURIComponent(shopId)}/revenue?range=${range}`,
    );
  } catch (error) {
    console.error("Failed to load store revenue", error);
    return null;
  }
}
