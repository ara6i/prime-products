import type { NextRequest } from "next/server";
import { proxyCustomerAutoDetectJson } from "../../../../proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ jobId: string; productId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  const { jobId, productId } = await context.params;
  return proxyCustomerAutoDetectJson(
    request,
    `/api/customer/dashboard/products/auto-detect/jobs/${encodeURIComponent(jobId)}/products/${encodeURIComponent(productId)}`,
    "PATCH",
  );
}
