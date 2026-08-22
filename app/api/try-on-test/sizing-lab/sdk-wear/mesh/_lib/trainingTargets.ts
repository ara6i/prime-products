type UnknownRecord = Record<string, unknown>;

export type WearTrainingTargetStatus =
  | "exact-geometry"
  | "exact-row-geometry"
  | "recorded-scalar-only";

export interface WearTrainingTarget {
  id: string;
  label: string;
  family: string;
  sourceGroup: string;
  sourceKey: string;
  value: number;
  unit: string;
  valueCm: number | null;
  status: WearTrainingTargetStatus;
  geometryAvailable: boolean;
  geometryType: string | null;
  geometryLengthCm: number | null;
  landmarkNames: string[];
  canonicalPointsCm: number[][];
  frontPointsCm: Array<readonly [number, number]>;
  rowId: string | null;
  protocolNote: string | null;
  geometryUnavailableReason: string | null;
  planeHeightEligible: boolean;
  geometryTrainingEligible: boolean;
  qualityFlags: string[];
  trainingRejectionReasons: string[];
}

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function pointTriples(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => (
    Array.isArray(point)
      && point.length >= 3
      && point.slice(0, 3).every((coordinate) => finite(coordinate) !== null)
      ? [[point[0] as number, point[1] as number, point[2] as number]]
      : []
  ));
}

function pointPairs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => (
    Array.isArray(point)
      && point.length >= 2
      && finite(point[0]) !== null
      && finite(point[1]) !== null
      ? [[point[0] as number, point[1] as number] as const]
      : []
  ));
}

function polylineLength2d(points: Array<readonly [number, number]>) {
  if (points.length < 2) return null;
  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index]!;
    return total + Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  }, 0);
}

const UNSAFE_ROW_FLAG_PARTS = [
  "reconstructed",
  "not-certified",
  "outside-lnd-torso-bounds",
  "over-12pct",
] as const;

function rowTrainingDecision(
  status: WearTrainingTargetStatus,
  linkedRow: UnknownRecord | null,
  linkedFront: Array<readonly [number, number]>,
) {
  const qualityFlags = stringArray(linkedRow?.qualityFlags);
  const plane = record(linkedRow?.plane);
  const planeHeightEligible = status === "exact-row-geometry"
    && finite(plane?.heightCm) !== null;
  if (status === "recorded-scalar-only") {
    return {
      planeHeightEligible: false,
      geometryTrainingEligible: false,
      qualityFlags,
      trainingRejectionReasons: ["No defensible PLY/LND geometry is mapped to this stored number."],
    };
  }
  if (status === "exact-geometry") {
    return {
      planeHeightEligible: false,
      geometryTrainingEligible: linkedFront.length >= 2,
      qualityFlags,
      trainingRejectionReasons: linkedFront.length >= 2
        ? []
        : ["The mapped landmark path has fewer than two valid points."],
    };
  }

  const rawCentralLoopClosed = linkedRow?.rawCentralLoopClosed === true;
  const certifiedSection = linkedRow?.certifiedSection === true
    && linkedRow?.geometryTrainingEligible === true;
  const unsafeFlags = qualityFlags.filter((flag) => (
    UNSAFE_ROW_FLAG_PARTS.some((part) => flag.toLowerCase().includes(part))
  ));
  const trainingRejectionReasons = [
    ...(!rawCentralLoopClosed && !certifiedSection
      ? ["PLY torso section is neither a raw closed loop nor a certified WEAR-landmark-bounded front/back ring."]
      : []),
    ...unsafeFlags.map((flag) => `WEAR geometry flag: ${flag}`),
  ];
  return {
    planeHeightEligible,
    geometryTrainingEligible: linkedFront.length === 2
      && (rawCentralLoopClosed || certifiedSection)
      && unsafeFlags.length === 0,
    qualityFlags,
    trainingRejectionReasons,
  };
}

export function trainingTargetLabel(sourceKey: string) {
  return sourceKey
    .replace(/_(?:mm|kg)$/u, "")
    .split("_")
    .map((word) => word === "asis" ? "ASIS" : word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function trainingTargetFamily(sourceKey: string) {
  if (sourceKey.includes("sitting")) return "Seated / not used in standing trainer";
  if (/circumference/u.test(sourceKey)) return "Circumference rows";
  if (/arm|sleeve|acromion|radiale|stylion|elbow|wrist|shoulder|spine_to/u.test(sourceKey)) return "Arms, sleeves and shoulders";
  if (/thigh|knee|crotch|trochanter|inseam|ankle|sphyrion|malleolus/u.test(sourceKey)) return "Lower body and inseam";
  if (/hand|foot/u.test(sourceKey)) return "Hands and feet";
  if (/head|face|sellion|tragion|gonial|neck|cervicale/u.test(sourceKey)) return "Head and neck";
  if (/height|stature/u.test(sourceKey)) return "Heights";
  if (/bust|chest|waist|hip|interscye|bispinous|bicristale|axilla/u.test(sourceKey)) return "Torso landmarks";
  return "Other WEAR measurements";
}

export function buildTrainingTargets(metric: UnknownRecord): WearTrainingTarget[] {
  const rows = record(metric.rows);
  const measurements = Array.isArray(metric.measurements) ? metric.measurements : [];
  return measurements.flatMap((raw) => {
    const item = record(raw);
    if (!item) return [];
    const id = typeof item.id === "string" ? item.id : "";
    const sourceGroup = typeof item.sourceGroup === "string" ? item.sourceGroup : "unknown";
    const sourceKey = typeof item.sourceKey === "string" ? item.sourceKey : id;
    const value = finite(item.value);
    const unit = typeof item.unit === "string" ? item.unit : "unknown";
    if (!id || !sourceKey || value === null) return [];

    const rowId = typeof item.rowId === "string" ? item.rowId : null;
    const linkedRow = rowId ? record(rows?.[rowId]) : null;
    const breadth = record(linkedRow?.abBreadth);
    const linkedFront = pointPairs(breadth?.frontProjectionCm);
    const canonicalPoints = pointTriples(item.canonicalPointsCm);
    const geometryAvailable = item.geometryAvailable === true;
    const status: WearTrainingTargetStatus = linkedRow && linkedFront.length === 2
      ? "exact-row-geometry"
      : geometryAvailable
        ? "exact-geometry"
        : "recorded-scalar-only";
    const frontPointsCm = status === "exact-row-geometry"
      ? linkedFront
      : canonicalPoints.map((point) => [point[0]!, point[2]!] as const);
    const trainingDecision = rowTrainingDecision(status, linkedRow, frontPointsCm);

    return [{
      id,
      label: trainingTargetLabel(sourceKey),
      family: trainingTargetFamily(sourceKey),
      sourceGroup,
      sourceKey,
      value,
      unit,
      valueCm: finite(item.valueCm),
      status,
      geometryAvailable: status !== "recorded-scalar-only",
      geometryType: typeof item.geometryType === "string" ? item.geometryType : null,
      geometryLengthCm: status === "exact-row-geometry"
        ? polylineLength2d(linkedFront)
        : finite(item.geometryLengthCm),
      landmarkNames: stringArray(item.landmarkNames),
      canonicalPointsCm: canonicalPoints,
      frontPointsCm,
      rowId,
      protocolNote: typeof item.protocolNote === "string" ? item.protocolNote : null,
      geometryUnavailableReason: typeof item.geometryUnavailableReason === "string"
        ? item.geometryUnavailableReason
        : null,
      ...trainingDecision,
    }];
  });
}

export function summarizeTrainingTargets(targets: WearTrainingTarget[]) {
  return {
    total: targets.length,
    exactGeometry: targets.filter((target) => target.status === "exact-geometry").length,
    exactRows: targets.filter((target) => target.status === "exact-row-geometry").length,
    recordedScalarOnly: targets.filter((target) => target.status === "recorded-scalar-only").length,
    geometryReady: targets.filter((target) => target.geometryTrainingEligible).length,
    geometryRejected: targets.filter((target) => (
      target.status !== "recorded-scalar-only" && !target.geometryTrainingEligible
    )).length,
  };
}
