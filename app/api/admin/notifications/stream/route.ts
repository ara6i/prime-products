import type { NextRequest } from "next/server";
import { openAdminStream } from "../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return openAdminStream(request, "/api/admin/notifications/stream");
}
