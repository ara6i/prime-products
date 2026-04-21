"use server";

import { adminFetch } from "./adminFetch";
import type { BehaviorOverview } from "../types";

export async function getStoreBehavior(
  shopId: string,
  range: "7d" | "30d" | "90d" = "30d",
): Promise<BehaviorOverview | null> {
  try {
    return await adminFetch<BehaviorOverview>(
      `/api/admin/stores/shopify/${encodeURIComponent(shopId)}/behavior?range=${range}`,
    );
  } catch (error) {
    console.error("Failed to load store behavior", error);
    return null;
  }
}

export async function getGlobalBehavior(
  range: "7d" | "30d" | "90d" = "30d",
): Promise<BehaviorOverview | null> {
  try {
    return await adminFetch<BehaviorOverview>(`/api/admin/analytics/behavior?range=${range}`);
  } catch (error) {
    console.error("Failed to load global behavior", error);
    return null;
  }
}
