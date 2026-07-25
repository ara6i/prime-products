import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import type { MeshShapeStatusResponse } from "@/app/try-on-test/sizing-lab/lib/meshShapeProviders";
import { resolveMeshShapeProviders } from "../providerStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json(
      { ok: false, error: "Shape models are available only on local and test-lab hosts." },
      { status: 403 },
    );
  }
  const response: MeshShapeStatusResponse = {
    ok: true,
    localOnly: true,
    providers: resolveMeshShapeProviders().map((provider) => provider.status),
  };
  return NextResponse.json(response, { headers: { "cache-control": "no-store" } });
}
