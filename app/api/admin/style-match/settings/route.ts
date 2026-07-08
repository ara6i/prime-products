import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAdminJson(request, "/api/admin/style-match/settings");
}

export async function PATCH(request: NextRequest) {
  return proxyAdminJson(request, "/api/admin/style-match/settings", {
    method: "PATCH",
    body: await request.text(),
  });
}
