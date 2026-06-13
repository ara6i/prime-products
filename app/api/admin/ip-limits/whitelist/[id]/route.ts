import { type NextRequest } from "next/server";
import { proxyAdminJson } from "../../../_lib/adminProxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAdminJson(request, `/api/admin/ip-limits/whitelist/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
