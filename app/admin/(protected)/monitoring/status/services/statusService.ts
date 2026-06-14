import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { PlatformStatusResponse } from "../types";

export async function fetchPlatformStatus(): Promise<PlatformStatusResponse> {
  try {
    return await adminFetch<PlatformStatusResponse>("/api/health/status");
  } catch {
    return {
      status: "degraded",
      generatedAt: new Date().toISOString(),
      services: [
        {
          id: "status-api",
          name: "Status API",
          status: "degraded",
          detail: "Could not reach the backend status endpoint.",
        },
      ],
    };
  }
}
