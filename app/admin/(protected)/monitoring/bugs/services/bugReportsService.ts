import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminBugReportsResponse } from "../types";

export async function fetchAdminBugReports(): Promise<AdminBugReportsResponse> {
  return adminFetch<AdminBugReportsResponse>("/api/admin/bug-reports?limit=100");
}
