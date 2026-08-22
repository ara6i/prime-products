import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { rankSdkWearPart, SDK_WEAR_PARTS, visibleWearMesh, type SdkWearIndex, type SdkWearPart, type SdkWearQuery } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadIndex(): Promise<SdkWearIndex> {
  const file = path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", "index.json");
  return JSON.parse(await readFile(file, "utf8")) as SdkWearIndex;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return NextResponse.json({ error: "SDK WEAR is private Test Lab only." }, { status: 403 });
  try {
    const index = await loadIndex();
    const people = index.people.map((person) => ({
      scanId: person.scanId,
      subjectId: person.subjectId,
      gender: person.gender,
      heightCm: person.heightCm,
      weightKg: person.weightKg,
      imageUrl: `/api/try-on-test/sizing-lab/sdk-wear/asset?scanId=${encodeURIComponent(person.scanId)}`,
      // Safe replay inputs: visible mesh geometry only. Reveal-only tape and
      // circumference fields are deliberately omitted from this response.
      mesh: visibleWearMesh(person),
      rowWidths: Object.fromEntries(index.parts.map((part) => {
        const row = person.rows[part];
        return row?.frontWidthCm && row.heightFractionFromFeet != null
          ? [part, { frontWidthCm: row.frontWidthCm, heightFractionFromFeet: row.heightFractionFromFeet }]
          : [];
      })),
    }));
    return NextResponse.json({ ok: true, personCount: index.personCount, expectedPersonCount: index.expectedPersonCount, parts: index.parts, status: index.status, releaseApproved: index.releaseApproved, people });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Held-out WEAR index unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return NextResponse.json({ error: "SDK WEAR is private Test Lab only." }, { status: 403 });
  try {
    const body = await request.json() as { metrics?: { heightCm?: number; weightKg?: number; gender?: string }; query?: SdkWearQuery; parts?: string[]; strictOnly?: boolean; excludeScanId?: string };
    const heightCm = Number(body.metrics?.heightCm);
    const weightKg = Number(body.metrics?.weightKg);
    const gender = String(body.metrics?.gender ?? "").toLowerCase();
    if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || !["female", "male"].includes(gender)) return NextResponse.json({ ok: false, error: "Valid height, weight, and gender are required." }, { status: 400 });
    if (!body.query || !Array.isArray(body.query.outline) || !body.query.rowWidths) return NextResponse.json({ ok: false, error: "A front visible mesh query is required." }, { status: 400 });
    const index = await loadIndex();
    if (index.personCount !== 448 || index.people.some((person) => person.role !== "test")) return NextResponse.json({ ok: false, error: "Held-out index integrity check failed." }, { status: 500 });
    const requested = (body.parts ?? [...SDK_WEAR_PARTS]).filter((part): part is SdkWearPart => (SDK_WEAR_PARTS as readonly string[]).includes(part));
    const parts = requested.length ? requested : [...SDK_WEAR_PARTS];
    const excludeScanId = body.excludeScanId && /^[A-Z]{2}-\d{4}-A$/.test(body.excludeScanId) ? body.excludeScanId : undefined;
    const results = parts.map((part) => rankSdkWearPart(index, body.query!, part, heightCm, weightKg, gender, { strictOnly: body.strictOnly === true, excludeScanId }));
    // This is returned only after a match run finishes. It is never passed into
    // the ranker, so the Test Lab can compare the chosen model with the hidden
    // held-out input without leaking a tape value into the match.
    const inputPerson = excludeScanId ? index.people.find((person) => person.scanId === excludeScanId) ?? null : null;
    return NextResponse.json({
      ok: true,
      mode: "sdk-wear-mesh",
      private: true,
      heldOut: { personCount: index.personCount, split: "test-only", rankingUsesTape: false, rankingUsesCircumference: false },
      policy: { gender: "exact", heightCm: body.strictOnly ? "±1 only" : "±1 strict then visible expansion", weightKg: body.strictOnly ? "±1 only" : "±1 strict then visible expansion", maxFrontWidthDifferenceCm: 1.27, strictOnly: body.strictOnly === true, excludedInputModel: excludeScanId ?? null },
      inputRevealAfterRank: inputPerson ? {
        scanId: inputPerson.scanId,
        rowTapeAndCircumferenceCm: inputPerson.revealOnly.rowTapeAndCircumferenceCm,
      } : null,
      results,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "SDK WEAR matching failed" }, { status: 500 });
  }
}
