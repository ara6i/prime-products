import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminProfileUsersResponse } from "../types";

export async function fetchAdminProfileUsers(): Promise<AdminProfileUsersResponse> {
  return adminFetch<AdminProfileUsersResponse>("/api/admin/profile-users?limit=150");
}
