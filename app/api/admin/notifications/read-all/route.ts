import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return proxyAdminJson(request, "/api/admin/notifications/read-all", {
    method: "PATCH",
  });
}
