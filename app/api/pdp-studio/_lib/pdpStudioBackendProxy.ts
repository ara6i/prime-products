import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PDP_STUDIO_SESSION_COOKIE_NAME = "pdp_studio_session";
const TEST_BACKEND_URL = "https://test-be-9a7k.primestyleai.com";

export function getPdpStudioApiBaseUrl(): string {
  return (
    process.env.PRIMESTYLE_PDP_STUDIO_API_INTERNAL_URL ||
    process.env.PRIMESTYLE_API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    TEST_BACKEND_URL
  ).replace(/\/$/, "");
}

export async function proxyPdpStudioRequest(
  request: Request,
  backendPath: string,
): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get(PDP_STUDIO_SESSION_COOKIE_NAME)?.value;
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "PDP Studio login is required." },
      { status: 401 },
    );
  }

  const requestUrl = new URL(request.url);
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set(
    "Cookie",
    `${PDP_STUDIO_SESSION_COOKIE_NAME}=${encodeURIComponent(session)}`,
  );

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const response = await fetch(
      `${getPdpStudioApiBaseUrl()}${backendPath}${requestUrl.search}`,
      {
        method: request.method,
        headers,
        ...(body && body.byteLength > 0 ? { body } : {}),
        cache: "no-store",
      },
    );
    const responseHeaders = new Headers();
    for (const name of [
      "content-type",
      "content-disposition",
      "cache-control",
      "etag",
    ]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to reach the PDP Studio server." },
      { status: 502 },
    );
  }
}
