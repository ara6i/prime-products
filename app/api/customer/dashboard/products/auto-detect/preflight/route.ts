import type { NextRequest } from "next/server";
import { proxyCustomerAutoDetectJson } from "../proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  return proxyCustomerAutoDetectJson(request, "/api/customer/dashboard/products/auto-detect/preflight", "POST");
}
