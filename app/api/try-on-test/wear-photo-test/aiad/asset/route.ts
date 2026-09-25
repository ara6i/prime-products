import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { readAiadRender } from "../../_lib/aiadBenchmark";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return new NextResponse(null, { status: 403 });
  try { const { image } = await readAiadRender(new URL(request.url).searchParams.get("scanId")); return new NextResponse(new Uint8Array(image), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" } }); }
  catch { return NextResponse.json({ ok: false, error: "WEAR render unavailable." }, { status: 404 }); }
}
