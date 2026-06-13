import { proxyPublicAdminJson } from "../admin/_lib/adminProxy";

export async function GET() {
  return proxyPublicAdminJson("/api/health/status");
}
