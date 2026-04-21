"use server";

import { adminFetch } from "./adminFetch";
import { mapOverview } from "../mappers/adminOverviewMapper";
import type { AdminOverview } from "../types";

export async function getAdminOverview(): Promise<AdminOverview | null> {
  try {
    const data = await adminFetch<unknown>("/api/admin/stores/overview");
    return mapOverview(data as Parameters<typeof mapOverview>[0]);
  } catch (error) {
    console.error("Failed to load admin overview", error);
    return null;
  }
}
