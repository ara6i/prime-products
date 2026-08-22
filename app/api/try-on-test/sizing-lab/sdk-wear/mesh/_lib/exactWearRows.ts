export type ExactWearEvidenceType = "wear-lnd-segment" | "ply-cross-section";

export interface ExactWearRow {
  a: { name: string; frontCm: readonly [number, number]; canonical3dCm: readonly [number, number, number] };
  b: { name: string; frontCm: readonly [number, number]; canonical3dCm: readonly [number, number, number] };
  distance3dCm: number;
  frontProjectedDistanceCm: number;
  source: string;
  protocolNote: string;
  evidenceType: ExactWearEvidenceType;
  planeHeightCm?: number;
  planeHeightSource?: string;
  qualityFlags?: string[];
}

type LandmarkPoint = {
  canonical3dCm?: readonly [number, number, number];
  front2dCm?: readonly [number, number];
};

const LANDMARK_PAIRS = {
  neck: ["Rt. Clavicale", "Lt. Clavicale"],
  chest: ["Rt. Thelion/Bustpoint", "Lt. Thelion/Bustpoint"],
  underbust: ["Rt. 10th Rib", "Lt. 10th Rib"],
  hips: ["Rt. Trochanterion", "Lt. Trochanterion"],
} as const;

const LANDMARK_NOTES = {
  neck: "bilateral neck-base Clavicale landmarks",
  chest: "bilateral Thelion/Bustpoint landmarks",
  underbust: "bilateral 10th-rib landmarks",
  hips: "bilateral Trochanterion landmarks",
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function tuple2(value: unknown): readonly [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const x = finiteNumber(value[0]);
  const y = finiteNumber(value[1]);
  return x === null || y === null ? null : [x, y];
}

function tuple3(value: unknown): readonly [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const x = finiteNumber(value[0]);
  const y = finiteNumber(value[1]);
  const z = finiteNumber(value[2]);
  return x === null || y === null || z === null ? null : [x, y, z];
}

function exactLandmarkSegments(metric: Record<string, unknown>) {
  const landmarks = metric.landmarks as { points?: Record<string, LandmarkPoint>; source?: string } | undefined;
  const points = landmarks?.points ?? {};
  return Object.fromEntries(Object.entries(LANDMARK_PAIRS).flatMap(([part, names]) => {
    const [aName, bName] = names;
    const a = points[aName];
    const b = points[bName];
    const a3 = a?.canonical3dCm;
    const b3 = b?.canonical3dCm;
    const a2 = a?.front2dCm;
    const b2 = b?.front2dCm;
    if (!a3 || !b3 || !a2 || !b2 || ![...a3, ...b3, ...a2, ...b2].every(Number.isFinite)) return [];
    const row: ExactWearRow = {
      a: { name: aName, frontCm: a2, canonical3dCm: a3 },
      b: { name: bName, frontCm: b2, canonical3dCm: b3 },
      distance3dCm: Math.hypot(a3[0] - b3[0], a3[1] - b3[1], a3[2] - b3[2]),
      frontProjectedDistanceCm: Math.hypot(a2[0] - b2[0], a2[1] - b2[1]),
      source: landmarks?.source ?? "exact paired WEAR LND",
      protocolNote: LANDMARK_NOTES[part as keyof typeof LANDMARK_NOTES],
      evidenceType: "wear-lnd-segment",
    };
    return [[part, row]];
  })) as Record<string, ExactWearRow>;
}

function exactPlyWaistSegment(metric: Record<string, unknown>): ExactWearRow | null {
  const rows = record(metric.rows);
  const waist = record(rows?.waist);
  const breadth = record(waist?.abBreadth);
  const plane = record(waist?.plane);
  const a3 = tuple3(breadth?.aCanonicalCm);
  const b3 = tuple3(breadth?.bCanonicalCm);
  const projections = breadth?.frontProjectionCm;
  const a2 = Array.isArray(projections) ? tuple2(projections[0]) : null;
  const b2 = Array.isArray(projections) ? tuple2(projections[1]) : null;
  if (!a3 || !b3 || !a2 || !b2) return null;

  const ordered = [
    { canonical3dCm: a3, frontCm: a2 },
    { canonical3dCm: b3, frontCm: b2 },
  ].sort((left, right) => left.frontCm[0] - right.frontCm[0]);
  const left = ordered[0]!;
  const right = ordered[1]!;
  const qualityFlags = Array.isArray(waist?.qualityFlags)
    ? waist.qualityFlags.filter((flag): flag is string => typeof flag === "string")
    : undefined;
  const planeHeightCm = finiteNumber(plane?.heightCm) ?? left.canonical3dCm[2];

  return {
    a: { name: "A · PLY left waist edge", ...left },
    b: { name: "B · PLY right waist edge", ...right },
    distance3dCm: Math.hypot(
      left.canonical3dCm[0] - right.canonical3dCm[0],
      left.canonical3dCm[1] - right.canonical3dCm[1],
      left.canonical3dCm[2] - right.canonical3dCm[2],
    ),
    frontProjectedDistanceCm: Math.hypot(
      left.frontCm[0] - right.frontCm[0],
      left.frontCm[1] - right.frontCm[1],
    ),
    source: typeof waist?.sourceGeometry === "string" ? waist.sourceGeometry : "raw WEAR PLY plane intersection",
    protocolNote: typeof waist?.planeProtocol === "string"
      ? waist.planeProtocol
      : "horizontal PLY section at WEAR recorded preferred-waist height",
    evidenceType: "ply-cross-section",
    planeHeightCm,
    planeHeightSource: typeof plane?.heightSource === "string" ? plane.heightSource : "WEAR profile waist_height_mm",
    qualityFlags,
  };
}

export function buildExactWearRows(metric: Record<string, unknown>) {
  const rows = exactLandmarkSegments(metric);
  const waist = exactPlyWaistSegment(metric);
  if (waist) rows.waist = waist;
  return rows;
}
