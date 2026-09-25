import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import type { WearRankingResponse } from "@/app/try-on-test/wear-side-selector/types";
import {
  artifactReference,
  loadWearSideCatalog,
  rankWearSideCandidates,
  WEAR_ARTIFACT_VERSION,
  WEAR_CATALOG_VERSION,
  wearSideCatalogMetadata,
} from "@/app/api/try-on-test/wear-side-selector/_lib/catalog";
import { createFrozenWearRun } from "@/app/api/try-on-test/wear-side-selector/_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "Front matching is private Test Lab only." }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      photoId?: unknown;
      gender?: unknown;
      heightCm?: unknown;
      weightKg?: unknown;
      rowWidthsCm?: unknown;
    };
    const photoId = typeof body.photoId === "string" ? body.photoId.trim().toLowerCase() : "";
    const gender = body.gender === "female" || body.gender === "male" ? body.gender : null;
    const heightCm = typeof body.heightCm === "number" ? body.heightCm : Number.NaN;
    const weightKg = typeof body.weightKg === "number" ? body.weightKg : Number.NaN;
    const rowWidths = body.rowWidthsCm && typeof body.rowWidthsCm === "object"
      ? body.rowWidthsCm as { waist?: unknown; hips?: unknown }
      : null;
    const waistWidthCm = typeof rowWidths?.waist === "number" ? rowWidths.waist : Number.NaN;
    const hipWidthCm = typeof rowWidths?.hips === "number" ? rowWidths.hips : Number.NaN;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(photoId) || !gender
      || !(waistWidthCm >= 10 && waistWidthCm <= 80) || !(hipWidthCm >= 10 && hipWidthCm <= 80)
      || !(heightCm >= 120 && heightCm <= 230) || !(weightKg >= 30 && weightKg <= 250)) {
      return NextResponse.json({ error: "Choose a valid saved model." }, { status: 400 });
    }

    const people = await loadWearSideCatalog();
    const ranked = rankWearSideCandidates(people, {
      gender,
      heightCm,
      weightKg,
      rowWidths: { waist: waistWidthCm, hips: hipWidthCm },
      excludeScanId: "",
    });
    const run = await createFrozenWearRun({
      inputScanId: `saved-model:${photoId}`,
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
        scanId: photoId,
        gender,
        heightCm,
        weightKg,
        frontWidthCmByPart: {
          waist: waistWidthCm,
          hips: hipWidthCm,
        },
        overallRows: ["waist", "hips"],
        overallCoverage: "2/2",
        frontArtifact: artifactReference(photoId, ["front"]),
      },
      rings: ranked.rings,
      globalFrontWinner: ranked.globalFrontWinner,
      rankingBoundary: "The saved model is ranked from front shape, height, weight, and gender only. Candidate side depth and tape are opened only after a candidate is selected.",
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Front matching failed." }, { status: 500 });
  }
}
