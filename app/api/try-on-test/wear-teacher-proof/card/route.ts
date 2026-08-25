import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { readTeacherProofCard } from "@/app/try-on-test/wear-teacher-proof/teacherProof.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCAN_ID = /^[A-Z]{2}-\d{4}-A$/u;

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR teacher cards are private Test Lab only." }, { status: 403 });
  }
  const scanId = new URL(request.url).searchParams.get("scanId")?.toUpperCase() ?? "";
  if (!SCAN_ID.test(scanId)) {
    return NextResponse.json({ error: "Unknown teacher scan." }, { status: 404 });
  }
  const card = await readTeacherProofCard(scanId);
  if (!card) {
    return NextResponse.json({ error: "Unknown teacher scan." }, { status: 404 });
  }
  return new Response(new Uint8Array(card), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(card.byteLength),
      "Content-Type": "image/png",
    },
  });
}
