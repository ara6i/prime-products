import type { NextRequest } from "next/server";
import { proxyPublicAdminJson } from "../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  return proxyPublicAdminJson(`/api/admin/chats/customer/${encodeURIComponent(id)}${url.search}`);
}
