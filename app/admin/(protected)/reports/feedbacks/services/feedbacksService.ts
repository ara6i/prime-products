import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminFeedbacksResponse } from "../types";

export async function fetchAdminFeedbacks(): Promise<AdminFeedbacksResponse> {
  return adminFetch<AdminFeedbacksResponse>("/api/admin/feedbacks?limit=100");
}
