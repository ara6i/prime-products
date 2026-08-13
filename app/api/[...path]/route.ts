import type { NextRequest } from "next/server";
import { proxyBackendApi } from "@/app/api/_lib/backendApiProxy";

type ApiProxyContext = {
  params: Promise<{ path: string[] }>;
};

async function handle(request: NextRequest, context: ApiProxyContext) {
  const { path } = await context.params;
  return proxyBackendApi(request, path);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
