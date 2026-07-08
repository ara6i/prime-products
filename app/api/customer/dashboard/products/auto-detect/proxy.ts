import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getCustomerApiBaseUrl } from "@/app/customer/shared/services/customerApiBase";

const CUSTOMER_SESSION_COOKIE_NAME = "customer_session";
const BACKEND_SESSION_COOKIE_NAME = "customer_session";

export async function proxyCustomerAutoDetectJson(
  request: NextRequest,
  backendPath: string,
  method: "GET" | "POST" | "PATCH",
): Promise<Response> {
  const apiBaseUrl = getCustomerApiBaseUrl();
  if (!apiBaseUrl) return Response.json({ ok: false, error: "API base URL is not configured" }, { status: 500 });

  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = method === "GET" ? undefined : await request.text();
  const response = await fetch(`${apiBaseUrl}${backendPath}`, {
    method,
    headers: {
      Cookie: `${BACKEND_SESSION_COOKIE_NAME}=${session}`,
      ...(body ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
    },
    body: body || undefined,
    cache: "no-store",
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function proxyCustomerAutoDetectStream(backendPath: string): Promise<Response> {
  const apiBaseUrl = getCustomerApiBaseUrl();
  if (!apiBaseUrl) return new Response("API base URL is not configured", { status: 500 });

  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!session) return new Response("Unauthorized", { status: 401 });

  const backendResponse = await fetch(`${apiBaseUrl}${backendPath}`, {
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
