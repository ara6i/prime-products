import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  TEACHER_ROW_IDS,
  type TeacherProofPerson,
  type TeacherProofPoint,
  type TeacherProofRatio,
  type TeacherProofRow,
  type TeacherProofSelection,
  type TeacherRatioBasis,
  type TeacherRowId,
} from "./teacherProof.types";
import {
  classifyTeacherRatio,
  classifyTeacherRow,
  isTeacherRowApplicable,
} from "./teacherProof.contract";

type JsonRecord = Record<string, unknown>;

const PROOF_DIRECTORY = path.join(
  ".local-ml",
  "wear3d-fresh-teacher-proof",
  "random10-seed-20260824-v1",
);

const ROW_LABELS: Record<TeacherRowId, string> = {
  neck: "Neck base",
  chest: "Chest",
  underbust: "Under-bust",
  waist: "Preferred waist",
  hips: "Maximum hips",
};

const ROW_MEASUREMENT_KEYS: Record<TeacherRowId, string> = {
  neck: "neck_base_circumference_mm",
  chest: "chest_circumference_mm",
  underbust: "underbust_circumference_mm",
  waist: "waist_circumference_mm",
  hips: "hip_circumference_mm",
};

const ROW_TAPE_PROTOCOLS: Record<TeacherRowId, string> = {
  neck: "sloped-chain-through-clavicales-suprasternale-and-cervicale",
  chest: "horizontal-tape-at-nipple-level-with-arms-hanging",
  underbust: "horizontal-tape-immediately-below-bra-cups",
  waist: "horizontal-tape-at-subject-preferred-natural-waist",
  hips: "horizontal-maximum-hip-tape",
};

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function contourPoints(value: unknown): Array<readonly [number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => {
    if (!Array.isArray(point) || point.length < 2) return [];
    const x = finite(point[0]);
    const y = finite(point[1]);
    return x === null || y === null ? [] : [[x, y] as const];
  });
}

function worldPathMeters(value: unknown): Array<readonly [number, number, number]> {
  if (!Array.isArray(value)) return [];
  const points = value.flatMap((point) => {
    if (!Array.isArray(point) || point.length < 3) return [];
    const x = finite(point[0]);
    const depth = finite(point[1]);
    const height = finite(point[2]);
    return x === null || depth === null || height === null
      ? []
      : [[x, depth, height] as const];
  });
  if (points.length < 3) return [];
  // Blender GLB export maps source Z to Three Y and source Y to -Three Z.
  return points.map(([x, depth, height]) => [
    x / 1000,
    height / 1000,
    -depth / 1000,
  ] as const);
}

function worldPointMeters(value: unknown): readonly [number, number, number] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const x = finite(value[0]);
  const depth = finite(value[1]);
  const height = finite(value[2]);
  return x === null || depth === null || height === null
    ? null
    : [x / 1000, height / 1000, -depth / 1000] as const;
}

function splitObservedArcRuns(
  points: Array<readonly [number, number, number]>,
): Array<Array<readonly [number, number, number]>> {
  if (points.length < 6) return points.length >= 2 ? [points] : [];
  const edges = points.map((point, index) => {
    const next = points[(index + 1) % points.length]!;
    return {
      index,
      distance: Math.hypot(next[0] - point[0], next[1] - point[1], next[2] - point[2]),
    };
  }).sort((left, right) => right.distance - left.distance);
  const cuts = edges.slice(0, 2);
  if (cuts.length < 2 || cuts[1]!.distance <= 0.012) return [points];
  const [firstCut, secondCut] = cuts.map((edge) => edge.index).sort((left, right) => left - right);
  const firstRun = points.slice(firstCut + 1, secondCut + 1);
  const secondRun = [...points.slice(secondCut + 1), ...points.slice(0, firstCut + 1)];
  return [firstRun, secondRun].filter((run) => run.length >= 2);
}

function teacherTargetAccepted(
  source: JsonRecord,
  teacherFlag: string,
  targetFlag: string,
  legacyAccepted: boolean,
) {
  const hasTeacherFlag = Object.prototype.hasOwnProperty.call(source, teacherFlag);
  return source[targetFlag] !== false
    && (source[teacherFlag] === true || (!hasTeacherFlag && legacyAccepted));
}

function overlayPoints(value: unknown): TeacherProofPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const point = record(raw);
    const x = finite(point.x);
    const y = finite(point.y);
    return x === null || y === null ? [] : [{ x, y }];
  });
}

function cm(value: unknown) {
  const millimetres = finite(value);
  return millimetres === null ? null : millimetres / 10;
}

function rowFromRecord({
  id,
  raw,
  maskedRaw,
  gender,
  measurementRaw,
}: {
  id: TeacherRowId;
  raw: unknown;
  maskedRaw: unknown;
  gender: string;
  measurementRaw: unknown;
}): TeacherProofRow {
  const source = record(raw);
  const masked = record(maskedRaw);
  const widthCm = cm(source.mesh_width_mm);
  const depthCm = cm(source.mesh_depth_mm);
  const tapeCm = cm(source.measurement_circumference_mm)
    ?? cm(masked.measurement_circumference_mm)
    ?? cm(measurementRaw);
  const walkedPerimeterCm = cm(source.shape_walk_circumference_mm)
    ?? cm(source.mesh_section_perimeter_mm);
  const contour = contourPoints(source.contour_points_normalized);
  const surfacePathNonplanar = source.surface_path_nonplanar === true;
  const closedWorldPath = worldPathMeters(source.contour_world_points_mm);
  const observedArcWorldPath = worldPathMeters(source.observed_arc_world_points_mm);
  const surfaceWorldPath = worldPathMeters(source.surface_path_points_mm);
  const worldPathSegments = closedWorldPath.length >= 3
    ? [closedWorldPath]
    : observedArcWorldPath.length >= 3
      ? splitObservedArcRuns(observedArcWorldPath)
      : surfaceWorldPath.length >= 3
        ? [surfaceWorldPath]
        : [];
  const worldPath = closedWorldPath.length >= 3
    ? closedWorldPath
    : observedArcWorldPath.length >= 3
      ? observedArcWorldPath
      : surfaceWorldPath;
  const worldCenter = worldPointMeters(source.center_world_mm);
  const frontPath = surfacePathNonplanar ? contourPoints(source.projected_contour) : [];
  const applicable = isTeacherRowApplicable(id, gender, tapeCm);
  const measurementAvailable = tapeCm !== null;
  const rejectionReasons = stringArray(source.teacher_rejection_reasons);
  const tapeRejections = stringArray(source.tape_teacher_rejection_reasons);
  const maskedReason = text(masked.reason);
  if (maskedReason) rejectionReasons.push(maskedReason);
  const sourceAccepted = source.accepted === true;
  const rowCoordinatesAvailable = finite(source.y_norm) !== null
    && finite(source.left_x_norm) !== null
    && finite(source.right_x_norm) !== null;
  const edgeEligible = applicable
    && widthCm !== null
    && rowCoordinatesAvailable
    && teacherTargetAccepted(source, "edge_teacher_accepted", "edge_target_valid", sourceAccepted);
  const depthEligible = applicable
    && depthCm !== null
    && teacherTargetAccepted(source, "depth_teacher_accepted", "depth_target_valid", sourceAccepted);
  const shapeEligible = applicable
    && contour.length >= 8
    && source.shape_target_valid !== false
    && (source.shape_teacher_accepted === true
      || (!Object.prototype.hasOwnProperty.call(source, "shape_teacher_accepted") && sourceAccepted));
  const accepted = applicable && sourceAccepted && edgeEligible && depthEligible && shapeEligible;
  const geometryEligible = edgeEligible;
  const available = edgeEligible
    || depthEligible
    || contour.length >= 3
    || worldPathSegments.some((segment) => segment.length >= 2);
  if (applicable && !available && rejectionReasons.length === 0) {
    rejectionReasons.push("No defensible standing 3D section is present in this teacher card.");
  }
  const tapeEligible = applicable && measurementAvailable;
  const ratioEligible = edgeEligible || tapeEligible;
  const state = classifyTeacherRow({
    applicable,
    accepted,
    partialGeometryAvailable: !accepted && (edgeEligible || depthEligible),
    visualGeometryAvailable: available || widthCm !== null || depthCm !== null,
    measurementAvailable,
  });
  return {
    id,
    label: ROW_LABELS[id],
    state,
    applicable,
    measurementAvailable,
    available,
    accepted,
    geometryEligible,
    tapeEligible,
    ratioEligible,
    trainingMask: {
      edge: geometryEligible && source.edge_target_valid !== false,
      depth: depthEligible,
      shape: shapeEligible,
      tape: tapeEligible,
      ratio: ratioEligible,
    },
    certifiedSection: source.certified_section === true,
    rawLoopClosed: source.raw_slice_closed === true,
    reconstructed: source.slice_reconstructed === true,
    yNorm: finite(source.y_norm),
    leftXNorm: finite(source.left_x_norm),
    rightXNorm: finite(source.right_x_norm),
    sliceHeightCm: cm(source.slice_height_mm),
    widthCm,
    depthCm,
    depthWidthRatio: finite(source.mesh_depth_ratio)
      ?? (widthCm && depthCm ? depthCm / widthCm : null),
    rawPerimeterCm: cm(source.raw_mesh_section_perimeter_mm),
    walkedPerimeterCm,
    tapeCm,
    tapeDeltaCm: walkedPerimeterCm !== null && tapeCm !== null
      ? walkedPerimeterCm - tapeCm
      : null,
    tapeDeltaPct: finite(source.perimeter_delta_to_measurement_pct),
    closureGapCm: cm(source.closure_gap_mm),
    contour,
    frontPath,
    worldPathMeters: worldPath,
    worldPathSegmentsMeters: worldPathSegments,
    worldCenterMeters: worldCenter,
    surfacePathNonplanar,
    surfaceAttachment: {
      testedPoints: finite(record(source.surface_attachment).tested_points) ?? 0,
      medianDistanceMm: finite(record(source.surface_attachment).median_distance_mm),
      p95DistanceMm: finite(record(source.surface_attachment).p95_distance_mm)
        ?? finite(record(source.surface_attachment).initial_p95_distance_mm),
      maximumDistanceMm: finite(record(source.surface_attachment).maximum_distance_mm),
      p95AllowedMm: finite(record(source.surface_attachment).p95_allowed_mm),
      maximumAllowedMm: finite(record(source.surface_attachment).maximum_allowed_mm),
      certified: record(source.surface_attachment).certified === true,
    },
    nominalSliceHeightCm: cm(source.nominal_slice_height_mm),
    sliceRobustnessOffsetCm: cm(source.slice_robustness_offset_mm),
    planeProtocol: text(
      source.geometry_protocol,
      text(source.height_method, text(source.mesh_plane_protocol, applicable ? "No certified PLY plane" : "Not applicable to this subject")),
    ),
    tapeProtocol: text(source.measurement_protocol, applicable ? ROW_TAPE_PROTOCOLS[id] : "Not applicable to this subject"),
    geometrySource: text(source.edge_target_source, "WEAR PLY section"),
    depthSource: text(source.depth_target_source, "WEAR PLY C-D extent"),
    tapeSource: text(source.circumference_target_source, "WEAR standing tape"),
    rejectionReasons,
    qualityFlags: [
      ...stringArray(source.quality_flags),
      ...tapeRejections.map((reason) => `Tape target: ${reason}`),
      ...(text(source.recorded_protocol_alignment_warning)
        ? [text(source.recorded_protocol_alignment_warning)]
        : []),
    ],
  };
}

type RatioOperand = {
  label: string;
  centimetres: number | null;
  applicable: boolean;
  eligible: boolean;
};

function ratio(
  id: string,
  label: string,
  numerator: RatioOperand,
  denominator: RatioOperand,
  basis: TeacherRatioBasis,
): TeacherProofRatio {
  const applicable = numerator.applicable && denominator.applicable;
  const inputsEligible = numerator.eligible
    && denominator.eligible
    && numerator.centimetres !== null
    && denominator.centimetres !== null
    && denominator.centimetres > 0;
  const state = classifyTeacherRatio({ applicable, inputsEligible });
  const value = state === "eligible" && numerator.centimetres !== null && denominator.centimetres !== null
    ? numerator.centimetres / denominator.centimetres
    : null;
  return {
    id,
    label,
    basis,
    state,
    value,
    numeratorLabel: numerator.label,
    numeratorCm: state === "eligible" ? numerator.centimetres : null,
    denominatorLabel: denominator.label,
    denominatorCm: state === "eligible" ? denominator.centimetres : null,
    runtimeContract: basis === "tape-number"
      ? "Teacher-only auxiliary target from independent WEAR tape numbers. At photo-only inference it is recomputed from predicted circumferences, unless the user explicitly supplies both measurements."
      : "Recomputed from the camera-normalized front 2D body; no hidden side view or 3D input is allowed.",
    reason: state === "eligible"
      ? null
      : state === "not-applicable"
        ? "This ratio includes a row that is not applicable to this subject."
        : basis === "tape-number"
          ? `Masked until both recorded ${numerator.label.toLowerCase()} and ${denominator.label.toLowerCase()} tape numbers exist.`
          : `Masked until both ${numerator.label.toLowerCase()} and ${denominator.label.toLowerCase()} front widths are certified.`,
  };
}

function ratiosFor(rows: TeacherProofRow[], shoulderCm: number | null, shoulderEligible: boolean) {
  const front = Object.fromEntries(rows.map((row) => [row.id, {
    label: row.label,
    centimetres: row.widthCm,
    applicable: row.applicable,
    eligible: row.trainingMask.edge,
  }])) as Record<TeacherRowId, RatioOperand>;
  const tape = Object.fromEntries(rows.map((row) => [row.id, {
    label: `${row.label} tape`,
    centimetres: row.tapeCm,
    applicable: row.applicable,
    eligible: row.tapeEligible,
  }])) as Record<TeacherRowId, RatioOperand>;
  const shoulder: RatioOperand = {
    label: "Shoulder",
    centimetres: shoulderCm,
    applicable: true,
    eligible: shoulderEligible && shoulderCm !== null,
  };
  return [
    ratio("shoulder-waist", "Shoulder ÷ waist A–B", shoulder, front.waist, "front-width"),
    ratio("shoulder-hips", "Shoulder ÷ hips A–B", shoulder, front.hips, "front-width"),
    ratio("neck-shoulder", "Neck A–B ÷ shoulder", front.neck, shoulder, "front-width"),
    ratio("chest-underbust-tape", "Chest ÷ under-bust", tape.chest, tape.underbust, "tape-number"),
    ratio("chest-waist-tape", "Chest ÷ waist", tape.chest, tape.waist, "tape-number"),
    ratio("chest-hips-tape", "Chest ÷ hips", tape.chest, tape.hips, "tape-number"),
    ratio("neck-waist-tape", "Neck ÷ waist", tape.neck, tape.waist, "tape-number"),
    ratio("waist-hips-tape", "Waist ÷ hips", tape.waist, tape.hips, "tape-number"),
    ratio("underbust-waist-tape", "Under-bust ÷ waist", tape.underbust, tape.waist, "tape-number"),
    ratio("underbust-hips-tape", "Under-bust ÷ hips", tape.underbust, tape.hips, "tape-number"),
  ];
}

async function sourceRecords() {
  const sourcePath = path.join(process.cwd(), ".local-ml", "wear3d-v6-audit", "source-manifest-standing-a.jsonl");
  const records = new Map<string, JsonRecord>();
  try {
    for (const line of (await readFile(sourcePath, "utf8")).split(/\r?\n/u)) {
      if (!line.trim()) continue;
      const source = record(JSON.parse(line));
      const scanId = text(source.scan_id);
      if (scanId) records.set(scanId, source);
    }
  } catch {
    // The ten-card render manifest remains sufficient for the visual proof.
  }
  return records;
}

function sourceName(value: unknown) {
  const sourcePath = text(value);
  return sourcePath ? path.basename(sourcePath) : "not linked";
}

function personFromRecord(source: JsonRecord, truth: JsonRecord): TeacherProofPerson {
  const scanId = text(source.scan_id);
  const gender = text(source.gender, "unknown");
  const rowsRecord = record(source.rows);
  const maskedRowsRecord = record(source.masked_rows);
  const measurements = record(source.measurements_mm);
  const rows = TEACHER_ROW_IDS.map((id) => rowFromRecord({
    id,
    raw: rowsRecord[id],
    maskedRaw: maskedRowsRecord[id],
    gender,
    measurementRaw: measurements[ROW_MEASUREMENT_KEYS[id]],
  }));
  const shoulderCm = cm(measurements.shoulder_breadth_mm);
  const shoulderPoints = overlayPoints(record(source.segments).shoulders);
  const ratios = ratiosFor(rows, shoulderCm, shoulderPoints.length >= 2);
  const acceptedRows = rows.filter((row) => row.accepted).length;
  const applicableRows = rows.filter((row) => row.applicable).length;
  const rejectedRows = rows.filter((row) => row.state === "rejected-geometry").length;
  const partialRows = rows.filter((row) => row.state === "partial-geometry").length;
  const measurementOnlyRows = rows.filter((row) => row.state === "measurement-only").length;
  const notApplicableRows = rows.filter((row) => row.state === "not-applicable").length;
  const eligibleRatios = ratios.filter((item) => item.state === "eligible").length;
  const applicableRatios = ratios.filter((item) => item.state !== "not-applicable").length;
  const waist = rows.find((row) => row.id === "waist");
  const hips = rows.find((row) => row.id === "hips");
  const coreReady = waist?.accepted === true && hips?.accepted === true;
  const status = applicableRows > 0 && acceptedRows === applicableRows
    ? "certified" as const
    : coreReady
      ? "core-ready" as const
      : "review" as const;
  const truthSource = record(truth.source);
  const profileSources = record(truth.profile_input_sources);
  return {
    scanId,
    subjectId: text(source.subject_id),
    gender,
    region: text(source.region, scanId.slice(0, 2)),
    role: text(source.role, "unknown"),
    pose: text(truth.pose, text(source.pose, "standing")),
    heightCm: finite(source.height_cm) ?? finite(truth.height_cm) ?? 0,
    weightKg: finite(source.weight_kg) ?? finite(truth.weight_kg) ?? 0,
    bmi: finite(source.bmi) ?? finite(truth.bmi) ?? 0,
    trainingPoseValid: source.training_pose_valid === true,
    renderer: `${text(record(source.render).blender_version, "Blender")} · ${text(record(source.camera).projection, "perspective")}`,
    pipelineId: text(source.pipeline_id, "unknown"),
    imageKey: `local-canary/${path.basename(text(source.mesh_image))}`,
    source: {
      mesh: sourceName(truthSource.mesh),
      landmarks: sourceName(truthSource.landmarks),
      demographics: sourceName(truthSource.demographics),
      height: text(profileSources.height, "measured"),
      weight: text(profileSources.weight, "measured"),
    },
    shoulder: {
      breadthCm: shoulderCm,
      frontPoints: shoulderPoints,
    },
    rows,
    ratios,
    acceptedRows,
    applicableRows,
    rejectedRows,
    partialRows,
    measurementOnlyRows,
    notApplicableRows,
    eligibleRatios,
    applicableRatios,
    coreReady,
    status,
  };
}

export async function getTeacherProofPeople() {
  const manifestPath = path.join(process.cwd(), PROOF_DIRECTORY, "render-manifest.jsonl");
  const truthByScan = await sourceRecords();
  const sources = (await readFile(manifestPath, "utf8")).split(/\r?\n/u).flatMap((line) => {
    if (!line.trim()) return [];
    try {
      const source = record(JSON.parse(line));
      return source.view_id === "front-50" && !source.error ? [source] : [];
    } catch {
      return [];
    }
  });
  return sources
    .map((source) => personFromRecord(source, truthByScan.get(text(source.scan_id)) ?? {}))
    .sort((left, right) => left.scanId.localeCompare(right.scanId));
}

export async function getTeacherProofSelection(): Promise<TeacherProofSelection> {
  const selectionPath = path.join(process.cwd(), PROOF_DIRECTORY, "selection.json");
  const source = record(JSON.parse(await readFile(selectionPath, "utf8")));
  return {
    schemaVersion: finite(source.schemaVersion) ?? 1,
    purpose: text(source.purpose, "fresh-model-3d-teacher-proof"),
    seed: finite(source.seed) ?? 0,
    count: finite(source.count) ?? 0,
    populationCount: finite(source.populationCount) ?? 0,
    population: text(source.population, "non-held-out WEAR training scans"),
    heldOutRolesSelected: finite(source.heldOutRolesSelected) ?? 0,
    geometryUsedForSelection: source.geometryUsedForSelection === true,
    tapeUsedForSelection: source.tapeUsedForSelection === true,
    modelPredictionUsedForSelection: source.modelPredictionUsedForSelection === true,
    v9ArtifactUsed: source.v9ArtifactUsed === true,
    selectedScanIds: stringArray(source.selectedScanIds),
  };
}

export async function readTeacherProofCard(scanId: string) {
  if (!(await isTeacherProofScan(scanId))) return null;
  return readFile(path.join(
    process.cwd(),
    PROOF_DIRECTORY,
    "mesh-cards",
    `${scanId}-front-50.png`,
  ));
}

export async function getTeacherProofPerson(scanId: string) {
  return (await getTeacherProofPeople()).find((person) => person.scanId === scanId) ?? null;
}

export async function isTeacherProofScan(scanId: string) {
  return Boolean(await getTeacherProofPerson(scanId));
}
