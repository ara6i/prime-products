import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { aiadPersonSummary, loadAiadCohort, loadAiadReport } from "../../_lib/aiadBenchmark";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return NextResponse.json({ ok: false }, { status: 403 });
  try { const people = await loadAiadCohort(); return NextResponse.json({ ok: true, personCount: 448, models: people.map(aiadPersonSummary), report: await loadAiadReport() }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Aiad benchmark unavailable." }, { status: 503 }); }
}
