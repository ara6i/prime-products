import { type NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export async function GET(request: NextRequest) {
  return proxyAdminJson(request, "/api/admin/ip-limits/settings");
}

export async function PATCH(request: NextRequest) {
  const body = await request.text();
  return proxyAdminJson(request, "/api/admin/ip-limits/settings", {
    method: "PATCH",
    body,
  });
}
