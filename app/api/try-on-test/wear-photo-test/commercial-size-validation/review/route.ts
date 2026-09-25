import { NextResponse } from "next/server";
import { saveCommercialReview } from "../../_lib/commercialSizingReport";
import { isTestLabAvailableForHost, normalizeHost } from "@/app/try-on-test/lib/access";
import type { CommercialSizingConclusion } from "@/app/try-on-test/wear-photo-test/commercialSizingTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const host = request.headers.get("host");
  if (!isTestLabAvailableForHost(host) || !["localhost", "127.0.0.1", "::1"].includes(normalizeHost(host))) {
    return NextResponse.json({ ok: false, error: "This private review is available only in the local Test Lab." }, { status: 403, headers: PRIVATE_HEADERS });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ ok: false, error: "Origin rejected." }, { status: 403, headers: PRIVATE_HEADERS });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ ok: false, error: "Use JSON." }, { status: 415, headers: PRIVATE_HEADERS });
  if (Number(request.headers.get("content-length") || 0) > 8_192) return NextResponse.json({ ok: false, error: "Review request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
  try {
    const body = await request.json() as { conclusion?: CommercialSizingConclusion; rationale?: string; reviewer?: string };
    const review = await saveCommercialReview({ conclusion: body.conclusion ?? "Unanswered", rationale: body.rationale ?? "", reviewer: body.reviewer });
    return NextResponse.json({ ok: true, review }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save review." }, { status: 400, headers: PRIVATE_HEADERS });
  }
}
