import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { aiadStatus, parseAiadMaskDataUrl, predictAiad } from "../_lib/aiadRuntime";
import { predictAiadHeldout } from "../_lib/aiadBenchmark";
import { segmentAiadPhoto } from "../_lib/aiadSegmentation";
import { aiadProfile } from "@/app/try-on-test/wear-photo-test/aiadPreprocessing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return NextResponse.json({ ok: false, error: "Test Lab only." }, { status: 403 });
  try { return NextResponse.json(await aiadStatus(), { headers }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Aiad model is unavailable." }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return NextResponse.json({ ok: false, error: "Test Lab only." }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 21_010_000) return NextResponse.json({ ok: false, error: "Photo request is too large." }, { status: 413, headers });
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("A prediction request object is required.");
    if (body.heldoutScanId != null) return NextResponse.json(await predictAiadHeldout(body.heldoutScanId), { headers });
    aiadProfile({ heightCm: body.heightCm, weightKg: body.weightKg, gender: body.gender });
    if (body.imageDataUrl != null) return NextResponse.json(await predictAiad(await segmentAiadPhoto(body.imageDataUrl), { heightCm: body.heightCm, weightKg: body.weightKg, gender: body.gender }, "aiad-rembg-photo"), { headers });
    // Deliberately whitelist model inputs. Never forward caller-supplied tape,
    // guide positions, old predictions or labels into the graph.
    return NextResponse.json(await predictAiad(parseAiadMaskDataUrl(body.maskDataUrl), { heightCm: body.heightCm, weightKg: body.weightKg, gender: body.gender }), { headers });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Aiad prediction failed." }, { status: 400, headers });
  }
}
