import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return proxyAdminJson(request, `/api/admin/stores${url.search}`);
}
