import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminTicketRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: AdminTicketRouteContext) {
  const { id } = await context.params;
  return proxyAdminJson(request, `/api/admin/tickets/${encodeURIComponent(id)}`);
}

export async function PATCH(request: NextRequest, context: AdminTicketRouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyAdminJson(request, `/api/admin/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}
