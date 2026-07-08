import type { NextRequest } from "next/server";
import { proxyCustomerAutoDetectJson } from "../../proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { jobId } = await context.params;
  return proxyCustomerAutoDetectJson(
    request,
    `/api/customer/dashboard/products/auto-detect/jobs/${encodeURIComponent(jobId)}`,
    "GET",
  );
}
