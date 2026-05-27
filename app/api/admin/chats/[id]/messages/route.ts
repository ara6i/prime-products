import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyAdminJson(request, `/api/admin/chats/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: await request.text(),
  });
}
