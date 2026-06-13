import { type NextRequest } from "next/server";
import { proxyAdminJson } from "../_lib/adminProxy";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return proxyAdminJson(request, `/api/admin/ip-limits${url.search}`);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyAdminJson(request, "/api/admin/ip-limits/whitelist", {
    method: "POST",
    body,
  });
}
