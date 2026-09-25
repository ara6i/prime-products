import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  AIAD_CAMERA_TOOLS,
  forwardAiadCamera,
  type AiadCameraTool,
} from "../../_lib/aiadCamera";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const responseHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "Test Lab only." }, { status: 403 });
  }
  if (isSiteAuthEnabled() && !await verifySiteSessionToken(request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "")) {
    return NextResponse.json({ ok: false, error: "Sign in to use the private camera worker." }, { status: 401 });
  }
  const { tool } = await params;
  if (!AIAD_CAMERA_TOOLS.includes(tool as AiadCameraTool)) {
    return NextResponse.json({ ok: false, error: "Unknown camera action." }, { status: 404, headers: responseHeaders });
  }
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 22 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Camera request is too large." }, { status: 413, headers: responseHeaders });
    }
    const value = JSON.parse(body);
    if (!value || typeof value !== "object" || Array.isArray(value) || "heldoutScanId" in value || "scanId" in value) {
      return NextResponse.json({ ok: false, error: "Camera correction is for normal photos, not the 448-person benchmark." }, { status: 400, headers: responseHeaders });
    }
    const response = await forwardAiadCamera(tool as AiadCameraTool, body);
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { ...responseHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({
      ok: false,
      error: "The private Mac camera worker is unavailable or timed out. Keep the Mac awake and connected. Raw ONNX predictions are unchanged.",
    }, { status: 503, headers: responseHeaders });
  }
}
