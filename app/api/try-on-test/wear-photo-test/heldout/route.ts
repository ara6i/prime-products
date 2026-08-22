import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import type { SdkWearIndex } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPECTED_HELDOUT_PEOPLE = 448;

async function loadHeldoutIndex() {
  const indexPath = path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8")) as SdkWearIndex;
  const valid = index.personCount === EXPECTED_HELDOUT_PEOPLE
    && index.expectedPersonCount === EXPECTED_HELDOUT_PEOPLE
    && index.people.length === EXPECTED_HELDOUT_PEOPLE
    && new Set(index.people.map((person) => person.scanId)).size === EXPECTED_HELDOUT_PEOPLE
    && index.people.every((person) => person.role === "test" && Boolean(person.imagePath));
  if (!valid) throw new Error("The 448-person held-out WEAR index failed its test-only integrity check.");
  return index;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "This held-out cohort is available only inside Test Lab." }, { status: 403 });
  }
  try {
    const index = await loadHeldoutIndex();
    const models = index.people
      .map((person) => ({
        scanId: person.scanId,
        subjectId: person.subjectId,
        gender: person.gender,
        heightCm: person.heightCm,
        weightKg: person.weightKg,
        imageUrl: `/api/try-on-test/sizing-lab/sdk-wear/asset?scanId=${encodeURIComponent(person.scanId)}`,
      }))
      .sort((left, right) => left.scanId.localeCompare(right.scanId));
    return NextResponse.json({
      ok: true,
      personCount: models.length,
      expectedPersonCount: EXPECTED_HELDOUT_PEOPLE,
      split: "test-only",
      includedInTraining: false,
      tapeIncluded: false,
      models,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "The held-out WEAR cohort is unavailable.",
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
