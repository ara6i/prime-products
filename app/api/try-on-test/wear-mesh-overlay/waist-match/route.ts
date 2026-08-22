import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { pairsFromFlat, type Point2 } from "@/app/try-on-test/wear-mesh-overlay/geometry";
import {
  buildWaistBandDescriptor,
  locateVisibleWaistFraction,
  rankWaistCandidates,
  weightedMean,
  type GeometryOnlyWaistCandidate,
} from "@/app/try-on-test/wear-mesh-overlay/waistMatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_PHOTO_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HEIGHT_TOLERANCE_CM = 1;
const WEIGHT_TOLERANCE_KG = 1;

interface MeshAsset {
  imageSize: [number, number];
  outline: number[];
}

interface MetricIndexEntry {
  scanId: string;
  path: string;
  profile: { gender: string; heightCm: number; weightKg: number };
}

interface MetricAsset {
  scanId: string;
  profile: { gender: string; heightCm: number; weightKg: number };
  frontProjection: { outline: { pointsCm: Point2[] } };
  rows: {
    waist: {
      plane: { heightCm: number };
      breadthCm: number;
      depthCm: number;
      recordedTape: { valueCm: number } | null;
    };
  };
}

function finiteNumber(value: string | null) {
  const parsed = value == null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "This blind waist proof is available only inside Test Lab." }, { status: 403 });
  }
  const parameters = new URL(request.url).searchParams;
  const photoId = parameters.get("photo") ?? "delaram";
  const heightCm = finiteNumber(parameters.get("heightCm"));
  const weightKg = finiteNumber(parameters.get("weightKg"));
  const gender = parameters.get("gender")?.trim().toLowerCase();
  if (!SAFE_PHOTO_ID.test(photoId) || heightCm == null || weightKg == null || !["female", "male"].includes(gender ?? "")) {
    return NextResponse.json({ error: "photo, heightCm, weightKg, and gender are required." }, { status: 400 });
  }

  const root = process.cwd();
  const overlayRoot = path.join(root, ".local-ml", "wear-mesh-overlay");
  const metricDirectory = path.join(overlayRoot, "metric-lines");
  try {
    const mesh = JSON.parse(await readFile(
      path.join(overlayRoot, "blender-mesh", `${photoId}.json`),
      "utf8",
    )) as MeshAsset;
    const querySpace = {
      points: pairsFromFlat(mesh.outline),
      statureCm: heightCm,
      yAxis: "down" as const,
      imageWidthPx: mesh.imageSize[0],
      imageHeightPx: mesh.imageSize[1],
    };
    const queryWaistFraction = locateVisibleWaistFraction(querySpace);
    const queryDescriptor = queryWaistFraction == null
      ? null
      : buildWaistBandDescriptor(querySpace, queryWaistFraction);
    if (!queryDescriptor) throw new Error("Five visible waist slices could not be measured.");

    const index = JSON.parse(await readFile(path.join(metricDirectory, "index.json"), "utf8")) as {
      scans: MetricIndexEntry[];
    };
    const epsilon = 1e-9;
    const cohort = index.scans.filter((entry) => (
      entry.profile.gender.toLowerCase() === gender
      && Math.abs(entry.profile.heightCm - heightCm) <= HEIGHT_TOLERANCE_CM + epsilon
      && Math.abs(entry.profile.weightKg - weightKg) <= WEIGHT_TOLERANCE_KG + epsilon
    ));

    // Phase 1: create geometry-only values. Tape, depth and circumference are
    // not copied into this array and therefore cannot affect the rank.
    const metrics = new Map<string, MetricAsset>();
    const geometryOnly: GeometryOnlyWaistCandidate[] = [];
    for (const entry of cohort) {
      if (path.basename(entry.path) !== entry.path) continue;
      const metric = JSON.parse(await readFile(path.join(metricDirectory, entry.path), "utf8")) as MetricAsset;
      metrics.set(metric.scanId, metric);
      const waistFraction = metric.rows.waist.plane.heightCm / metric.profile.heightCm;
      const descriptor = buildWaistBandDescriptor({
        points: metric.frontProjection.outline.pointsCm,
        statureCm: metric.profile.heightCm,
        yAxis: "up",
      }, waistFraction);
      if (!descriptor) continue;
      geometryOnly.push({
        scanId: metric.scanId,
        heightCm: metric.profile.heightCm,
        weightKg: metric.profile.weightKg,
        descriptor,
      });
    }
    const frozenTopFive = rankWaistCandidates(queryDescriptor, geometryOnly, 5);

    // Phase 2: only after IDs and weights are frozen do we reveal WEAR labels.
    const predictedCircumferenceCm = weightedMean(
      frozenTopFive,
      (scanId) => metrics.get(scanId)?.rows.waist.recordedTape?.valueCm ?? null,
    );
    const predictedDepthCm = weightedMean(
      frozenTopFive,
      (scanId) => metrics.get(scanId)?.rows.waist.depthCm ?? null,
    );
    const revealed = frozenTopFive.map((candidate) => {
      const row = metrics.get(candidate.scanId)!.rows.waist;
      return {
        ...candidate,
        wearWaistBreadthCm: row.breadthCm,
        wearWaistDepthCm: row.depthCm,
        wearWaistTapeCm: row.recordedTape?.valueCm ?? null,
      };
    });

    return NextResponse.json({
      schemaVersion: "wear-waist-neighbor-proof/v1",
      privateTestLabOnly: true,
      releaseApproved: false,
      method: "five visible front waist slices, then frozen-neighbor WEAR label reveal",
      query: { photoId, gender, heightCm, weightKg },
      strictCohort: {
        eligibleCount: cohort.length,
        sameGender: true,
        maximumHeightDifferenceCm: HEIGHT_TOLERANCE_CM,
        maximumWeightDifferenceKg: WEIGHT_TOLERANCE_KG,
      },
      rankingPhase: {
        delaramTapeUsed: false,
        wearTapeUsed: false,
        wearDepthUsed: false,
        wearCircumferenceUsed: false,
        sliceCount: queryDescriptor.widthsBodyHeight.length,
        queryDescriptor,
        frozenTopFive: frozenTopFive.map((candidate) => ({
          rank: candidate.rank,
          scanId: candidate.scanId,
          heightCm: candidate.heightCm,
          weightKg: candidate.weightKg,
          meanAbsoluteWidthErrorCmEquivalent: candidate.meanAbsoluteWidthErrorCmEquivalent,
          similarityWeight: candidate.similarityWeight,
          widthsCmEquivalent: candidate.descriptor.widthsCmEquivalent,
        })),
      },
      revealPhase: {
        labelsRevealedAfterRanking: true,
        predictedCircumferenceCm,
        predictedDepthCm,
        neighbors: revealed,
      },
      limitations: [
        "The visible photo outline includes tight clothing and hair.",
        "Photo centimetres use known-height scaling and do not remove camera perspective.",
        "This is one blind Test Lab experiment, not a validated production model.",
      ],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[wear-waist-match] proof failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The waist-only proof is unavailable.",
    }, { status: 404 });
  }
}
