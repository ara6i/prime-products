import type { NextRequest } from "next/server";

const API_BASE_URL =
  process.env.PRIMESTYLE_ADMIN_API_INTERNAL_URL ||
  process.env.PRIMESTYLE_API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";
const COOKIE_NAME = "admin_session";

export function adminApiUnavailableResponse(): Response {
  return Response.json({ message: "API base URL is not configured" }, { status: 500 });
}

export function getAdminSession(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}

export function unauthorizedAdminResponse(): Response {
  return Response.json({ message: "No admin session" }, { status: 401 });
}

export async function proxyAdminJson(request: NextRequest, path: string, init?: RequestInit): Promise<Response> {
  if (!API_BASE_URL) return adminApiUnavailableResponse();

  const session = getAdminSession(request);
  if (!session) return unauthorizedAdminResponse();

  const headers = new Headers(init?.headers);
  headers.set("Cookie", `${COOKIE_NAME}=${session}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function proxyPublicAdminJson(path: string, init?: RequestInit): Promise<Response> {
  if (!API_BASE_URL) return adminApiUnavailableResponse();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: init?.headers,
    cache: "no-store",
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function openAdminStream(request: NextRequest, path: string): Promise<Response> {
  if (!API_BASE_URL) return adminApiUnavailableResponse();

  const session = getAdminSession(request);
  if (!session) return unauthorizedAdminResponse();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Cookie: `${COOKIE_NAME}=${session}`,
    },
    cache: "no-store",
    signal: request.signal,
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => response.statusText);
    return Response.json({ message }, { status: response.status });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function openPublicAdminStream(request: NextRequest, path: string): Promise<Response> {
  if (!API_BASE_URL) return adminApiUnavailableResponse();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    signal: request.signal,
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => response.statusText);
    return Response.json({ message }, { status: response.status });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
