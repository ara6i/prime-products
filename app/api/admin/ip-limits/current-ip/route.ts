import { type NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export async function GET(request: NextRequest) {
  const headers = new Headers();
  for (const name of ["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "true-client-ip"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return proxyAdminJson(request, "/api/admin/ip-limits/current-ip", { headers });
}
