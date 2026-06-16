import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminProfileUsersResponse } from "../types";

export async function fetchAdminProfileUsers(limit = 150, search?: string): Promise<AdminProfileUsersResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  return adminFetch<AdminProfileUsersResponse>(`/api/admin/profile-users?${params.toString()}`);
}
