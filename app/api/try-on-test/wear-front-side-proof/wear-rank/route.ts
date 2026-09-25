import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import type { WearRankingResponse } from "@/app/try-on-test/wear-side-selector/types";
import {
  artifactReference,
  loadWearInput,
  loadWearSideCatalog,
  rankWearWaistHipScenarios,
  WEAR_ARTIFACT_VERSION,
  WEAR_CATALOG_VERSION,
  wearSideCatalogMetadata,
} from "@/app/api/try-on-test/wear-side-selector/_lib/catalog";
import { createFrozenWearRun } from "@/app/api/try-on-test/wear-side-selector/_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR matching is private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as { scanId?: unknown };
    const scanId = typeof body.scanId === "string" ? body.scanId.trim().toUpperCase() : "";
    const input = await loadWearInput(scanId);
    if (!input) return NextResponse.json({ error: "Choose a valid usable WEAR person." }, { status: 404 });
    const waistWidth = input.person.rows.waist?.frontWidthCm;
    const hipWidth = input.person.rows.hips?.frontWidthCm;
    if (waistWidth == null || hipWidth == null) {
      return NextResponse.json({ error: "This WEAR person has no complete waist and hip front rows." }, { status: 400 });
    }

    const people = await loadWearSideCatalog();
    const ranked = rankWearWaistHipScenarios(people, {
      gender: input.person.gender,
      heightCm: input.person.heightCm,
      weightKg: input.person.weightKg,
      rowWidths: { waist: waistWidth, hips: hipWidth },
      excludeScanId: input.person.scanId,
    });
    const run = await createFrozenWearRun({
      inputScanId: input.person.scanId,
      rings: ranked.rings,
      globalFrontWinner: ranked.globalFrontWinner,
    });
    const response: WearRankingResponse = {
      ok: true,
      runId: run.runId,
      catalogVersion: WEAR_CATALOG_VERSION,
      artifactVersion: WEAR_ARTIFACT_VERSION,
      catalog: {
        personCount: people.length,
        sourceRecordCount: wearSideCatalogMetadata.sourceRecordCount,
        excludedPersonCount: wearSideCatalogMetadata.sourceRecordCount - people.length,
        exclusions: wearSideCatalogMetadata.exclusions,
      },
      input: {
        scanId: input.person.scanId,
        gender: input.person.gender,
        heightCm: input.person.heightCm,
        weightKg: input.person.weightKg,
        frontWidthCmByPart: { waist: waistWidth, hips: hipWidth },
        overallRows: ["waist", "hips"],
        overallCoverage: "2/2",
        frontArtifact: artifactReference(input.person.scanId, ["front"]),
      },
      rings: ranked.rings,
      globalFrontWinner: ranked.globalFrontWinner,
      rankingBoundary: "Each ±N scenario is separate. ±3 means the largest height/weight difference is greater than 2 and no more than 3; it does not include ±1 or ±2. Ranking then uses only waist and hip front A-to-B widths. Side depth and recorded tape are not used or returned.",
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "WEAR matching failed." }, { status: 500 });
  }
}
