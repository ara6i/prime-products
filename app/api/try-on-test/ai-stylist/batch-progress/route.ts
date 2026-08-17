import { NextRequest, NextResponse } from "next/server";
import { hasCapacityLabAccess } from "../../capacity-lab/_lib/auth";
import { getAiStylistBatchProgress } from "@/app/try-on-test/ai-stylist/server/aiStylistBatchProgress.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await hasCapacityLabAccess(request))) {
    return NextResponse.json(
      { ok: false, error: "AI Stylist Lab is not available on this host." },
      { status: 404 },
    );
  }

  try {
    return NextResponse.json(
      { ok: true, progress: await getAiStylistBatchProgress() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `Unable to read saved Batch progress: ${error.message}`
            : "Unable to read saved Batch progress.",
      },
      { status: 500 },
    );
  }
}
