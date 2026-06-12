import { type NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return proxyAdminJson(request, `/api/admin/analytics/shopify-dashboard${url.search}`);
}
