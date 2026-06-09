import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminReplaySessionsResponse } from "../types";

export async function fetchReplaySessions(): Promise<AdminReplaySessionsResponse> {
  return adminFetch<AdminReplaySessionsResponse>("/api/admin/replays?limit=100");
}
