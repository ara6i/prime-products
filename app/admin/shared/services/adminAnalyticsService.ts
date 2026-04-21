"use server";

import { adminFetch } from "./adminFetch";
import type { AnalyticsOverview } from "../types";

export async function getAnalyticsOverview(): Promise<AnalyticsOverview | null> {
  try {
    return await adminFetch<AnalyticsOverview>("/api/admin/analytics/overview");
  } catch (error) {
    console.error("Failed to load analytics overview", error);
    return null;
  }
}
