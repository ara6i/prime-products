import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminTicketReplyRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: AdminTicketReplyRouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyAdminJson(request, `/api/admin/tickets/${encodeURIComponent(id)}/replies`, {
    method: "POST",
    body,
  });
}
