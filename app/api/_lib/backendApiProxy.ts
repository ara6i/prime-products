import type { NextRequest } from "next/server";

const FALLBACK_BACKEND_ORIGIN = "http://localhost:4000";
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

function getBackendOrigin(): string {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    FALLBACK_BACKEND_ORIGIN;

  try {
    const url = new URL(configuredOrigin);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }
  } catch {
    // Fall through to the local backend used by the development workspace.
  }

  return FALLBACK_BACKEND_ORIGIN;
}

function getBackendUrl(path: string[], request: NextRequest): URL {
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const url = new URL(`/api/${encodedPath}`, getBackendOrigin());
  url.search = request.nextUrl.search;
  return url;
}

function getUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  headers.delete("transfer-encoding");
  return headers;
}

function getResponseHeaders(upstream: Response): Headers {
  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  return headers;
}

export async function proxyBackendApi(
  request: NextRequest,
  path: string[],
): Promise<Response> {
  const method = request.method.toUpperCase();
  const body = BODYLESS_METHODS.has(method)
    ? undefined
    : await request.arrayBuffer();

  try {
    const upstream = await fetch(getBackendUrl(path, request), {
      method,
      headers: getUpstreamHeaders(request),
      body,
      cache: "no-store",
      redirect: "manual",
    });

    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: getResponseHeaders(upstream),
    });
  } catch {
    return Response.json(
      { message: "PrimeStyleAI API is unavailable" },
      { status: 502 },
    );
  }
}
