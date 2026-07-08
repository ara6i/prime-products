import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getCustomerApiBaseUrl } from "@/app/customer/shared/services/customerApiBase";

const CUSTOMER_SESSION_COOKIE_NAME = "customer_session";
const BACKEND_SESSION_COOKIE_NAME = "customer_session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const apiBaseUrl = getCustomerApiBaseUrl();
  if (!apiBaseUrl) {
    return new Response("API base URL is not configured", { status: 500 });
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const targetUrl = new URL(`${apiBaseUrl}/api/customer/dashboard/products/auto-detect/stream`);
  const maxProducts = request.nextUrl.searchParams.get("maxProducts");
  const websiteUrl = request.nextUrl.searchParams.get("websiteUrl");
  if (maxProducts) targetUrl.searchParams.set("maxProducts", maxProducts);
  if (websiteUrl) targetUrl.searchParams.set("websiteUrl", websiteUrl);

  const backendResponse = await fetch(targetUrl, {
    headers: {
      Accept: "text/event-stream",
      Cookie: `${BACKEND_SESSION_COOKIE_NAME}=${session}`,
    },
    cache: "no-store",
  });

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "Content-Type": backendResponse.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
