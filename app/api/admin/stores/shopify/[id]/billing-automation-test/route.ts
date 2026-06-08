import type { NextRequest } from "next/server";
import { proxyAdminJson } from "../../../../_lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminShopifyStoreRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: AdminShopifyStoreRouteContext) {
  const { id } = await context.params;
  return proxyAdminJson(request, `/api/admin/stores/shopify/${encodeURIComponent(id)}/billing-automation-test`, {
    method: "POST",
    body: await request.text(),
  });
}
