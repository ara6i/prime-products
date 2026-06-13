import { type NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyAdminJson(request, "/api/admin/ip-limits/reset", {
    method: "POST",
    body,
  });
}
