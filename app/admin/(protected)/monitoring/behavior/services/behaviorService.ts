import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminClaritySessionsResponse } from "../types";

export async function fetchClaritySessions(): Promise<AdminClaritySessionsResponse> {
  return adminFetch<AdminClaritySessionsResponse>("/api/admin/analytics/clarity-sessions?range=30d&limit=150");
}
