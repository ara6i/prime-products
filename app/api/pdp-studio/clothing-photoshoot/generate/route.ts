import { proxyPdpStudioRequest } from "../../_lib/pdpStudioBackendProxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return proxyPdpStudioRequest(
    request,
    "/api/pdp-studio/clothing-photoshoot/generate",
  );
}
