import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { renderTeacherBlenderScan } from "@/app/try-on-test/wear-teacher-proof/teacherBlender.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCAN_ID = /^[A-Z]{2}-\d{4}-A$/u;

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR teacher Blender rendering is private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as { scanId?: unknown };
    const scanId = typeof body.scanId === "string" ? body.scanId.toUpperCase() : "";
    if (!SCAN_ID.test(scanId)) {
      return NextResponse.json({ error: "Choose one of the ten teacher-proof scans." }, { status: 400 });
    }
    const rendered = await renderTeacherBlenderScan(scanId);
    if (!rendered) {
      return NextResponse.json({ error: "This scan is not part of the fresh random ten-person teacher proof." }, { status: 404 });
    }
    return NextResponse.json(rendered, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[wear-teacher-proof] Blender render failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Blender could not render this teacher scan.",
    }, { status: 500 });
  }
}
