import { proxyCustomerAutoDetectStream } from "../../../proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { jobId } = await context.params;
  return proxyCustomerAutoDetectStream(
    `/api/customer/dashboard/products/auto-detect/jobs/${encodeURIComponent(jobId)}/stream`,
  );
}
