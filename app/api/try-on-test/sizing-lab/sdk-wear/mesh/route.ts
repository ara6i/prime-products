import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { loadMetricAsset } from "@/app/api/try-on-test/wear-mesh-overlay/_lib/metricAsset";
import { SDK_WEAR_PARTS, type SdkWearIndex } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";
import { buildExactWearRows } from "./_lib/exactWearRows";
import { buildTrainingTargets, summarizeTrainingTargets } from "./_lib/trainingTargets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCAN_ID = /^[A-Z]{2}-\d{4}-A$/;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pointPairs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => (
    Array.isArray(point)
      && point.length >= 2
      && finiteNumber(point[0]) !== null
      && finiteNumber(point[1]) !== null
      ? [[point[0] as number, point[1] as number] as const]
      : []
  ));
}

function exactTrainingRows(metric: Record<string, unknown>) {
  const rows = record(metric.rows);
  return Object.fromEntries(SDK_WEAR_PARTS.flatMap((kind) => {
    const row = record(rows?.[kind]);
    const plane = record(row?.plane);
    const breadth = record(row?.abBreadth);
    const depth = record(row?.cdDepth);
    const contour = record(row?.contour);
    const tape = record(row?.recordedTape);
    const front = pointPairs(breadth?.frontProjectionCm);
    const contourCm = pointPairs(contour?.pointsCm);
    const frontWidthCm = finiteNumber(row?.breadthCm);
    const depthCm = finiteNumber(row?.depthCm);
    if (!row || front.length !== 2 || frontWidthCm === null || depthCm === null) return [];
    return [[kind, {
      kind,
      label: typeof row.label === "string" ? row.label : kind,
      planeHeightCm: finiteNumber(plane?.heightCm),
      planeSource: typeof plane?.heightSource === "string" ? plane.heightSource : null,
      abFrontProjectionCm: front,
      frontWidthCm,
      depthCm,
      cCanonicalCm: Array.isArray(depth?.cCanonicalCm) ? depth.cCanonicalCm : null,
      dCanonicalCm: Array.isArray(depth?.dCanonicalCm) ? depth.dCanonicalCm : null,
      contourCm,
      geometryPerimeterCm: finiteNumber(row.closedLoopCircumferenceCm)
        ?? finiteNumber(row.diagnosticReconstructedPerimeterCm),
      geometryPerimeterKind: finiteNumber(row.closedLoopCircumferenceCm) !== null
        ? "raw-closed-ply-loop"
        : finiteNumber(row.diagnosticReconstructedPerimeterCm) !== null
          ? "diagnostic-reconstructed-ply-loop"
          : "unavailable",
      recordedTapeCm: finiteNumber(tape?.valueCm),
      rawCentralLoopClosed: row.rawCentralLoopClosed === true,
      certifiedSection: row.certifiedSection === true,
      geometryTrainingEligible: row.geometryTrainingEligible === true,
      tapeTrainingEligible: row.tapeTrainingEligible === true,
      stitchEvidence: record(row.stitchEvidence),
      sourceGeometry: typeof row.sourceGeometry === "string" ? row.sourceGeometry : "raw WEAR PLY section",
      qualityFlags: Array.isArray(row.qualityFlags)
        ? row.qualityFlags.filter((flag): flag is string => typeof flag === "string")
        : [],
    }]];
  }));
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "SDK WEAR meshes are private Test Lab assets." }, { status: 403 });
  }
  const scanId = new URL(request.url).searchParams.get("scanId")?.toUpperCase() ?? "";
  if (!SCAN_ID.test(scanId)) return NextResponse.json({ error: "Choose a valid held-out WEAR scan." }, { status: 400 });
  try {
    const indexPath = path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", "index.json");
    const index = JSON.parse(await readFile(indexPath, "utf8")) as SdkWearIndex;
    const person = index.people.find((candidate) => candidate.scanId === scanId && candidate.role === "test");
    if (!person) {
      return NextResponse.json({ error: "Only the 448 held-out WEAR scans are available in this SDK test." }, { status: 404 });
    }
    const { metric, mesh2d } = await loadMetricAsset(scanId);
    const trainingTargets = buildTrainingTargets(metric);
    return NextResponse.json({
      ok: true,
      scanId,
      mesh: {
        ...mesh2d,
        rows: buildExactWearRows(metric),
        trainingRows: exactTrainingRows(metric),
        trainingTargets,
        trainingTargetSummary: summarizeTrainingTargets(trainingTargets),
        cameraAudit: record(metric.canonicalProjectionAudit),
        heldoutProjectionRows: person.rows,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The real WEAR PLY mesh is unavailable." }, { status: 500 });
  }
}
