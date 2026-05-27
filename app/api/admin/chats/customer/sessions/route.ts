import type { NextRequest } from "next/server";
import { proxyPublicAdminJson } from "../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyPublicAdminJson("/api/admin/chats/customer/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
