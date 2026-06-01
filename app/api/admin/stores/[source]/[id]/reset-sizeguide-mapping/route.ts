import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminStoreRouteContext {
  params: Promise<{
    source: string;
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: AdminStoreRouteContext) {
  const { source, id } = await context.params;
  return proxyAdminJson(
    request,
    `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}/reset-sizeguide-mapping`,
    {
      method: "POST",
      body: await request.text(),
    },
  );
}
