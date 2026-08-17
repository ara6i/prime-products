import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { hasCapacityLabAccess } from "../../../../capacity-lab/_lib/auth";
import { GEMINI_TRANSPARENT_DIR } from "@/app/try-on-test/ai-stylist/server/aiStylistBatchProgress.server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  if (!(await hasCapacityLabAccess(request))) {
    return new NextResponse(null, { status: 404 });
  }

  const { filename } = await context.params;
  if (!/^safe10-\d+\.png$/u.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const image = await readFile(path.join(GEMINI_TRANSPARENT_DIR, filename));
    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
