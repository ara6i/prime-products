import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { WEAR_V8_RENDER_PREFIX } from "../wear-cpu-progress/wearCpuProgress.server";

type JsonRecord = Record<string, unknown>;

export interface WearEverythingPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface WearEverythingValue {
  id: string;
  key: string;
  label: string;
  category: string;
  sourceValue: number;
  sourceUnit: "mm" | "kg";
  displayValue: number;
  displayUnit: "cm" | "kg";
  visualStatus: "exact-row" | "exact-path" | "exact-landmark" | "recorded-value-only";
  overlayRef: string | null;
}

export interface WearEverythingRow {
  id: string;
  label: string;
  accepted: boolean;
  leftX: number;
  rightX: number;
  y: number;
  widthCm: number | null;
  depthCm: number | null;
  tapeCm: number | null;
  contour: Array<[number, number]>;
  protocol: string;
  meshProtocol: string;
}

export interface WearEverythingSegment {
  id: string;
  label: string;
  points: WearEverythingPoint[];
}

export interface WearPlaneSweepCandidate {
  offsetMm: number;
  heightMm: number;
  valid: boolean;
  certified: boolean;
  source: string | null;
  rawPerimeterCm: number | null;
  walkedCm: number | null;
  tapeDifferenceCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  yNorm: number | null;
  leftXNorm: number | null;
  rightXNorm: number | null;
  contour: Array<[number, number]>;
}

export interface WearPlaneSweep {
  row: string;
  sourceHeightCm: number;
  tapeCm: number | null;
  current: WearPlaneSweepCandidate | null;
  tapeBlind: WearPlaneSweepCandidate | null;
  oracle: WearPlaneSweepCandidate | null;
  candidates: WearPlaneSweepCandidate[];
  warning: string;
}

export interface WearEverythingModel {
  scanId: string;
  subjectId: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  role: string;
  region: string;
  viewId: string;
  viewIds: string[];
  pose: string;
  bmi: number;
  schemaVersion: string;
  pipelineId: string;
  imageKey: string;
  sourceFiles: {
    mesh: string;
    landmarks: string;
    demographics: string;
  };
  profileInputSources: {
    height: string;
    weight: string;
  };
  surfaceSchema: {
    meaning: string;
    required: string[];
    optional: string[];
    unitRule: string;
  };
  render: {
    width: number;
    height: number;
    blenderVersion: string;
    source: string;
    camera: string;
  };
  rows: WearEverythingRow[];
  segments: WearEverythingSegment[];
  landmarks: Array<{
    id: string;
    label: string;
    x3dMm: number | null;
    y3dMm: number | null;
    z3dMm: number | null;
  } & WearEverythingPoint>;
  recorded: WearEverythingValue[];
  extracted: WearEverythingValue[];
  planeSweep: WearPlaneSweep | null;
}

export const WEAR_EVERYTHING_COUNTS = {
  recorded: 45,
  extracted: 43,
  landmarks: 73,
  rows: 5,
  paths: 5,
} as const;

const ROW_LABELS: Record<string, string> = {
  neck: "Neck base",
  chest: "Chest",
  underbust: "Under-bust",
  waist: "Natural waist",
  hips: "Maximum hips",
};

const SEGMENT_LABELS: Record<string, string> = {
  shoulders: "Shoulder landmarks",
  left_sleeve: "Left sleeve path",
  right_sleeve: "Right sleeve path",
  left_inseam: "Left leg inseam",
  right_inseam: "Right leg inseam",
};

const RECORDED_ROW_REFS: Record<string, string> = {
  neck_base_circumference_mm: "neck",
  chest_circumference_mm: "chest",
  underbust_circumference_mm: "underbust",
  waist_circumference_mm: "waist",
  waist_height_mm: "waist",
  hip_circumference_mm: "hips",
  hip_max_height_mm: "hips",
};

const RECORDED_PATH_REFS: Record<string, string> = {
  shoulder_breadth_mm: "shoulders",
  arm_length_shoulder_to_wrist_mm: "right_sleeve",
  arm_length_spine_to_wrist_mm: "right_sleeve",
};

const EXTRACTED_PATH_REFS: Record<string, string> = {
  sleeve_outseam_left_mm: "left_sleeve",
  sleeve_outseam_right_mm: "right_sleeve",
};

const EXTRACTED_LANDMARK_REFS: Record<string, string> = {
  acromial_height_standing_left_mm: "Lt. Acromion|floor",
  acromial_height_standing_right_mm: "Rt. Acromion|floor",
  acromion_radiale_length_left_mm: "Lt. Acromion|Lt. Radiale",
  acromion_radiale_length_right_mm: "Rt. Acromion|Rt. Radiale",
  ankle_height_lateral_malleolus_left_mm: "Lt. Lateral Malleolus|floor",
  ankle_height_lateral_malleolus_right_mm: "Rt. Lateral Malleolus|floor",
  axilla_height_left_mm: "Lt. Axilla, Ant|floor",
  axilla_height_right_mm: "Rt. Axilla, Ant|floor",
  biacromial_breadth_mm: "Lt. Acromion|Rt. Acromion",
  bicristale_breadth_mm: "Lt. Iliocristale|Rt. Iliocristale",
  bigonial_breadth_mm: "Lt. Gonion|Rt. Gonion",
  bispinous_breadth_mm: "Lt. ASIS|Rt. ASIS",
  bitragion_breadth_mm: "Lt. Tragion|Rt. Tragion",
  bitrochanteric_breadth_mm: "Lt. Trochanterion|Rt. Trochanterion",
  bustpoint_breadth_mm: "Lt. Thelion/Bustpoint|Rt. Thelion/Bustpoint",
  cervicale_height_mm: "Cervicale|floor",
  elbow_height_standing_left_mm: "Lt. Olecranon|floor",
  elbow_height_standing_right_mm: "Rt. Olecranon|floor",
  foot_breadth_left_mm: "Lt. Metatarsal-Phal. I|Lt. Metatarsal-Phal. V",
  foot_breadth_right_mm: "Rt. Metatarsal-Phal. I|Rt. Metatarsal-Phal. V",
  infraorbitale_height_standing_left_mm: "Lt. Infraorbitale|floor",
  infraorbitale_height_standing_right_mm: "Rt. Infraorbitale|floor",
  knee_height_standing_left_mm: "Lt. Knee Crease|floor",
  knee_height_standing_right_mm: "Rt. Knee Crease|floor",
  malleolus_medial_left_mm: "Lt. Medial Malleolus|floor",
  malleolus_medial_right_mm: "Rt. Medial Malleolus|floor",
  radiale_stylion_length_left_mm: "Lt. Radiale|Lt. Radial Styloid",
  radiale_stylion_length_right_mm: "Rt. Radiale|Rt. Radial Styloid",
  sellion_supramenton_length_mm: "Sellion|Supramenton",
  sphyrion_height_left_mm: "Lt. Sphyrion|floor",
  sphyrion_height_right_mm: "Rt. Sphyrion|floor",
  suprasternale_height_mm: "Suprasternale|floor",
  trochanterion_height_left_mm: "Lt. Trochanterion|floor",
  trochanterion_height_right_mm: "Rt. Trochanterion|floor",
};

function record(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function string(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function humanize(value: string) {
  return value
    .replace(/_(mm|kg)$/u, "")
    .replace(/_/gu, " ")
    .replace(/\b(left|right)\b/gu, (side) => side === "left" ? "Left" : "Right")
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function categoryFor(key: string) {
  if (key.includes("circumference")) return "Circumference";
  if (key.includes("height") || key.includes("stature")) return "Height";
  if (key.includes("breadth") || key.includes("distance")) return "Breadth / distance";
  if (key.includes("length") || key.includes("inseam") || key.includes("outseam") || key.includes("reach")) return "Length / path";
  if (key.includes("skinfold")) return "Skinfold";
  if (key === "weight_kg") return "Profile";
  return "Other WEAR value";
}

function points(value: unknown): WearEverythingPoint[] {
  return Array.isArray(value) ? value.flatMap((entry) => {
    const point = record(entry);
    const x = nullableNumber(point.x);
    const y = nullableNumber(point.y);
    return x === null || y === null ? [] : [{ x, y, visible: point.visible !== false }];
  }) : [];
}

function contour(value: unknown): Array<[number, number]> {
  return Array.isArray(value) ? value.flatMap((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) return [];
    const x = nullableNumber(entry[0]);
    const y = nullableNumber(entry[1]);
    return x === null || y === null ? [] : [[x, y] as [number, number]];
  }) : [];
}

function values(group: "recorded" | "extracted", value: unknown): WearEverythingValue[] {
  return Object.entries(record(value)).flatMap(([key, raw]) => {
    const sourceValue = nullableNumber(raw);
    if (sourceValue === null) return [];
    const sourceUnit = key === "weight_kg" ? "kg" as const : "mm" as const;
    const overlayRef = group === "recorded"
      ? RECORDED_ROW_REFS[key] ?? RECORDED_PATH_REFS[key] ?? null
      : EXTRACTED_PATH_REFS[key] ?? EXTRACTED_LANDMARK_REFS[key] ?? null;
    const visualStatus = group === "recorded" && RECORDED_ROW_REFS[key]
      ? "exact-row" as const
      : (group === "recorded" ? RECORDED_PATH_REFS[key] : EXTRACTED_PATH_REFS[key])
        ? "exact-path" as const
        : group === "extracted" && EXTRACTED_LANDMARK_REFS[key]
          ? "exact-landmark" as const
          : "recorded-value-only" as const;
    return [{
      id: `${group}:${key}`,
      key,
      label: humanize(key),
      category: categoryFor(key),
      sourceValue,
      sourceUnit,
      displayValue: sourceUnit === "mm" ? sourceValue / 10 : sourceValue,
      displayUnit: sourceUnit === "mm" ? "cm" as const : "kg" as const,
      visualStatus,
      overlayRef,
    }];
  }).sort((left, right) => left.category.localeCompare(right.category) || left.label.localeCompare(right.label));
}

function imageKey(meshImage: string, chunkId: string) {
  if (meshImage.includes("/.local-ml/wear3d-v8-teacher-canary/")) {
    return `local-canary/${path.basename(meshImage)}`;
  }
  if (meshImage.startsWith(".local-ml/wear3d-v8-teacher-canary/")) {
    return `local-canary/${path.basename(meshImage)}`;
  }
  const marker = `/rendered/${chunkId}/`;
  const offset = meshImage.indexOf(marker);
  if (offset < 0) return "";
  return `${WEAR_V8_RENDER_PREFIX}/${chunkId}/${meshImage.slice(offset + marker.length)}`;
}

function buildModel(
  source: JsonRecord,
  chunkId: string,
  sourceTruth: JsonRecord,
  viewIds: string[],
  planeSweep: WearPlaneSweep | null,
): WearEverythingModel {
  const rawRows = record(source.rows);
  const rows = Object.entries(ROW_LABELS).map(([id, label]) => {
    const row = record(rawRows[id]);
    return {
      id,
      label,
      accepted: row.accepted === true,
      leftX: number(row.left_x_norm),
      rightX: number(row.right_x_norm),
      y: number(row.y_norm),
      widthCm: nullableNumber(row.mesh_width_mm) === null ? null : number(row.mesh_width_mm) / 10,
      depthCm: nullableNumber(row.mesh_depth_mm) === null ? null : number(row.mesh_depth_mm) / 10,
      tapeCm: nullableNumber(row.measurement_circumference_mm) === null ? null : number(row.measurement_circumference_mm) / 10,
      contour: contour(row.contour_points_normalized),
      protocol: string(row.measurement_protocol, "Not documented in this card"),
      meshProtocol: string(row.mesh_plane_protocol, "Not documented in this card"),
    };
  });
  const rawLandmarks = record(source.landmarks_2d);
  const rawLandmarks3d = record(sourceTruth.landmarks_3d_mm);
  const landmarks = Object.entries(rawLandmarks).flatMap(([label, rawPoint]) => {
    const [point] = points([rawPoint]);
    const point3d = Array.isArray(rawLandmarks3d[label]) ? rawLandmarks3d[label] : [];
    return point ? [{
      id: `landmark:${label}`,
      label,
      ...point,
      x3dMm: nullableNumber(point3d[0]),
      y3dMm: nullableNumber(point3d[1]),
      z3dMm: nullableNumber(point3d[2]),
    }] : [];
  });
  const segments = Object.entries(record(source.segments)).map(([id, rawPoints]) => ({
    id,
    label: SEGMENT_LABELS[id] ?? humanize(id),
    points: points(rawPoints),
  }));
  const render = record(source.render);
  const camera = record(source.camera);
  const sourceFiles = record(sourceTruth.source);
  const profileInputSources = record(sourceTruth.profile_input_sources);
  return {
    scanId: string(source.scan_id),
    subjectId: string(source.subject_id),
    gender: string(source.gender),
    heightCm: number(source.height_cm),
    weightKg: number(source.weight_kg),
    role: string(source.role),
    region: string(source.region),
    viewId: string(source.view_id),
    viewIds,
    pose: string(sourceTruth.pose, string(source.pose)),
    bmi: number(source.bmi),
    schemaVersion: `${source.schema_version ?? "unknown"}`,
    pipelineId: string(source.pipeline_id, "unknown"),
    imageKey: imageKey(string(source.mesh_image), chunkId),
    sourceFiles: {
      mesh: string(sourceFiles.mesh),
      landmarks: string(sourceFiles.landmarks),
      demographics: string(sourceFiles.demographics),
    },
    profileInputSources: {
      height: string(profileInputSources.height, "unknown"),
      weight: string(profileInputSources.weight, "unknown"),
    },
    surfaceSchema: {
      meaning: "Triangulated colored 3D body-surface scan",
      required: ["vertex x", "vertex y", "vertex z", "face.vertex_indices"],
      optional: ["confidence", "red", "green", "blue"],
      unitRule: "Normalize each PLY from its human vertical span; this corpus contains both metre-scale and millimetre-scale files.",
    },
    render: {
      width: number(render.width, 192),
      height: number(render.height, 256),
      blenderVersion: string(render.blender_version),
      source: string(render.source),
      camera: `${string(camera.projection, "unknown")} · ${number(camera.lens_mm).toFixed(0)} mm · yaw ${number(camera.yaw_deg).toFixed(0)}° · pitch ${number(camera.pitch_deg).toFixed(0)}°`,
    },
    rows,
    segments,
    landmarks,
    recorded: values("recorded", source.measurements_mm),
    extracted: values("extracted", source.extracted_standing_mm),
    planeSweep,
  };
}

function planeSweepCandidate(value: unknown): WearPlaneSweepCandidate | null {
  const candidate = record(value);
  const offsetMm = nullableNumber(candidate.offset_mm);
  const heightMm = nullableNumber(candidate.height_mm);
  if (offsetMm === null || heightMm === null) return null;
  const convertMm = (raw: unknown) => {
    const valueMm = nullableNumber(raw);
    return valueMm === null ? null : valueMm / 10;
  };
  return {
    offsetMm,
    heightMm,
    valid: candidate.valid === true,
    certified: candidate.certified === true,
    source: string(candidate.source) || null,
    rawPerimeterCm: convertMm(candidate.raw_perimeter_mm),
    walkedCm: convertMm(candidate.walked_perimeter_mm),
    tapeDifferenceCm: convertMm(candidate.tape_difference_mm),
    widthCm: convertMm(candidate.width_mm),
    depthCm: convertMm(candidate.depth_mm),
    yNorm: nullableNumber(candidate.y_norm),
    leftXNorm: nullableNumber(candidate.left_x_norm),
    rightXNorm: nullableNumber(candidate.right_x_norm),
    contour: contour(candidate.contour),
  };
}

async function readPlaneSweep(root: string, scanId: string, row = "waist"): Promise<WearPlaneSweep | null> {
  const reportPath = path.join(
    root,
    ".local-ml/reports/wear-plane-sweeps",
    `${scanId.toLowerCase()}-${row}.json`,
  );
  try {
    const source = record(JSON.parse(await readFile(reportPath, "utf8")));
    const candidates = Array.isArray(source.candidates)
      ? source.candidates.flatMap((candidate) => {
          const parsed = planeSweepCandidate(candidate);
          return parsed ? [parsed] : [];
        })
      : [];
    return {
      row: string(source.row, row),
      sourceHeightCm: number(source.source_height_mm) / 10,
      tapeCm: nullableNumber(source.recorded_tape_mm_reveal_only) === null
        ? null
        : number(source.recorded_tape_mm_reveal_only) / 10,
      current: planeSweepCandidate(source.current_source_plane),
      tapeBlind: planeSweepCandidate(source.tape_blind_candidate),
      oracle: planeSweepCandidate(source.tape_oracle_diagnostic_only),
      candidates,
      warning: string(source.warning),
    };
  } catch {
    return null;
  }
}

async function readSourceTruth(root: string, scanId: string) {
  const manifestPath = path.join(root, ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl");
  try {
    const lines = (await readFile(manifestPath, "utf8")).split(/\r?\n/u);
    for (const line of lines) {
      if (!line.trim()) continue;
      const source = record(JSON.parse(line));
      if (source.scan_id === scanId) return source;
    }
  } catch {
    // The rendered card remains usable even when the deeper source audit is not synced.
  }
  return {};
}

const CANARY_DIRECTORY = ".local-ml/wear3d-v8-teacher-canary/ten-final-v2";

async function readCanaryRecords(projectRoot: string) {
  const manifestPath = path.join(projectRoot, CANARY_DIRECTORY, "render-manifest.jsonl");
  try {
    return (await readFile(manifestPath, "utf8")).split(/\r?\n/u).flatMap((line) => {
      if (!line.trim()) return [];
      try {
        return [record(JSON.parse(line))];
      } catch {
        return [];
      }
    }).filter((source) => string(source.view_id) === "front-50" && !string(source.error));
  } catch {
    return [];
  }
}

export async function getWearEverythingCanaryIds() {
  const records = await readCanaryRecords(process.cwd());
  return [...new Set(records.map((source) => string(source.scan_id)).filter(Boolean))].sort();
}

export async function getWearEverythingModel(scanId = "IT-4028-A") {
  const projectRoot = process.cwd();
  const canaryRecords = await readCanaryRecords(projectRoot);
  const canarySource = canaryRecords.find((source) => string(source.scan_id) === scanId);
  if (canarySource) {
    const sourceTruth = await readSourceTruth(projectRoot, scanId);
    return buildModel(canarySource, "local-canary", sourceTruth, ["front-50"], null);
  }
  const root = path.join(projectRoot, ".local-ml/wear3d-v8-cloud-status/card-check");
  const sourceTruth = await readSourceTruth(projectRoot, scanId);
  const planeSweep = await readPlaneSweep(projectRoot, scanId);
  const files = (await readdir(root)).filter((name) => /^chunk-\d+-manifest\.jsonl$/u.test(name));
  for (const file of files) {
    const chunkId = file.replace(/-manifest\.jsonl$/u, "");
    const lines = (await readFile(path.join(root, file), "utf8")).split(/\r?\n/u);
    const records = lines.flatMap((line) => {
      if (!line.trim()) return [];
      const source = record(JSON.parse(line));
      return source.scan_id === scanId ? [source] : [];
    });
    const viewIds = records.map((source) => string(source.view_id)).filter(Boolean).sort();
    for (const source of records) {
      if (source.view_id !== "front-50") continue;
      return buildModel(source, chunkId, sourceTruth, viewIds, planeSweep);
    }
  }
  throw new Error(`${scanId} front-50 WEAR card is not available locally.`);
}
