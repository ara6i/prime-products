import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminReplayRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, context: AdminReplayRouteContext) {
  const { sessionId } = await context.params;
  return proxyAdminJson(request, `/api/admin/replays/${encodeURIComponent(sessionId)}`);
}
