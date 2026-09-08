import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import type { WearRankingResponse } from "@/app/try-on-test/wear-side-selector/types";
import {
  artifactReference,
  loadWearInput,
  loadWearSideCatalog,
  rankWearSideCandidates,
  WEAR_ARTIFACT_VERSION,
  WEAR_CATALOG_VERSION,
  wearSideCatalogMetadata,
} from "../_lib/catalog";
import { createFrozenWearRun } from "../_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unavailable(request: Request) {
  return !isTestLabAvailableForHost(request.headers.get("host"));
}

export async function GET(request: Request) {
  if (unavailable(request)) {
    return NextResponse.json({ error: "WEAR Side Picker is private Test Lab only." }, { status: 403 });
  }
  try {
    const people = await loadWearSideCatalog();
    return NextResponse.json({
      ok: true,
      personCount: people.length,
      sourceRecordCount: wearSideCatalogMetadata.sourceRecordCount,
      excludedPersonCount: wearSideCatalogMetadata.sourceRecordCount - people.length,
      exclusions: wearSideCatalogMetadata.exclusions,
      catalogVersion: WEAR_CATALOG_VERSION,
      artifactVersion: WEAR_ARTIFACT_VERSION,
      people: people.map(({ scanId, gender, heightCm, weightKg }) => ({ scanId, gender, heightCm, weightKg })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The full WEAR S3 catalog is unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (unavailable(request)) {
    return NextResponse.json({ error: "WEAR Side Picker is private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as { scanId?: unknown };
    const scanId = typeof body.scanId === "string" ? body.scanId.trim().toUpperCase() : "";
    const input = await loadWearInput(scanId);
    if (!input) return NextResponse.json({ error: "Choose a valid usable WEAR standing person." }, { status: 404 });

    const people = await loadWearSideCatalog();
    const ranked = rankWearSideCandidates(people, {
      gender: input.person.gender,
      heightCm: input.person.heightCm,
      weightKg: input.person.weightKg,
      rowWidths: input.rowWidths,
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
        frontWidthCmByPart: input.rowWidths,
        overallRows: ranked.overallRows,
        overallCoverage: `${ranked.overallRows.length}/${ranked.overallRows.length}`,
        frontArtifact: artifactReference(input.person.scanId, ["front"]),
      },
      rings: ranked.rings,
      globalFrontWinner: ranked.globalFrontWinner,
      rankingBoundary: "Frozen same-gender ranking uses only height, weight, and front PLY widths. It contains no input side artifact, side depth, recorded tape, or tape error.",
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "WEAR front candidates could not be ranked." }, { status: 500 });
  }
}
