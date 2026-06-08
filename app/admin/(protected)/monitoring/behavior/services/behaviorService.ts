import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminBehaviorResponse } from "../types";

export async function fetchAdminBehavior(): Promise<AdminBehaviorResponse> {
  return adminFetch<AdminBehaviorResponse>("/api/admin/analytics/behavior?range=30d");
}
