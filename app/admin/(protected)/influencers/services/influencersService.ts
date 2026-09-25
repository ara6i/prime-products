import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminCreatorWaitlistResponse } from "../types";

export async function fetchAdminCreatorWaitlist(limit = 500): Promise<AdminCreatorWaitlistResponse> {
  const params = new URLSearchParams({ page: "1", limit: String(limit) });
  return adminFetch<AdminCreatorWaitlistResponse>(`/api/admin/creator-waitlist?${params.toString()}`);
}
