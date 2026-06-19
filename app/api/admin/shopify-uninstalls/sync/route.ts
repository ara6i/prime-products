import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyAdminJson(request, "/api/admin/shopify-uninstalls/sync", {
    method: "POST",
    body: "{}",
  });
}
