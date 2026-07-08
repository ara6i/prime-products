import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminStoreStyleMatchRouteContext {
  params: Promise<{
    source: string;
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, context: AdminStoreStyleMatchRouteContext) {
  const { source, id } = await context.params;
  return proxyAdminJson(
    request,
    `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}/style-match`,
    {
      method: "PATCH",
      body: await request.text(),
    },
  );
}
