import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminNotificationReadRouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: AdminNotificationReadRouteContext) {
  const { id } = await context.params;
  return proxyAdminJson(request, `/api/admin/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
}
