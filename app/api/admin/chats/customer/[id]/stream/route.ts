import type { NextRequest } from "next/server";
import { openPublicAdminStream } from "../../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  return openPublicAdminStream(request, `/api/admin/chats/customer/${encodeURIComponent(id)}/stream${url.search}`);
}
