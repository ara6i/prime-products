import "server-only";

import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const WEAR_V8_BUCKET = "primestyleai-wear3d-921049726279-us-east-1";
export const WEAR_V8_REGION = "us-east-1";
export const WEAR_V8_PROFILE = "primestyle-wear";
export const WEAR_V8_STATUS_KEY = "jobs/wear3d-v8/status.json";
export const WEAR_V8_RENDER_PREFIX = "processed/wear3d-standing-mesh-teacher-v8-20260821/rendered";

const STATUS_TTL_MS = 5_000;
const CHUNK_LIST_TTL_MS = 60_000;
const execEnvironment = { ...process.env, AWS_PAGER: "" };

type JsonRecord = Record<string, unknown>;

export interface WearCpuStage {
  key: string;
  label: string;
  explanation: string;
  state: "complete" | "running" | "queued" | "failed" | "blocked";
  percent: number;
}

export interface WearCpuStatus {
  ok: true;
  pipelineId: string;
  state: string;
  overallPercent: number;
  currentStage: string;
  currentStageLabel: string;
  detail: string;
  startedAt: string | null;
  updatedAt: string;
  dataset: {
    subjects: number;
    completedPeople: number;
    targetCards: number;
    completedCards: number;
    failedCards: number;
  };
  cpu: {
    instanceId: string | null;
    instanceType: string | null;
    region: string;
    state: string;
    systemStatus: string;
    instanceStatus: string;
  };
  model: {
    gpuStarted: false;
    trainingStarted: boolean;
    sdkReady: boolean;
  };
  stages: WearCpuStage[];
}

export interface WearTeacherRowPreview {
  kind: "neck" | "chest" | "underbust" | "waist" | "hips";
  label: string;
  accepted: boolean;
  leftPercent: number;
  rightPercent: number;
  yPercent: number;
  widthCm: number | null;
  depthCm: number | null;
  shapeCircumferenceCm: number | null;
  recordedTapeCm: number | null;
  contourPointsNormalized: Array<[number, number]>;
  tapeTargetValid: boolean;
  perimeterDeltaPercent: number | null;
  geometrySource: string;
  measurementProtocol: string;
  meshPlaneProtocol: string;
  reasons: string[];
}

export interface WearTeacherCardPreview {
  sampleId: string;
  scanId: string;
  subjectId: string;
  role: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  viewId: string;
  chunkId: string;
  imageKey: string;
  rows: WearTeacherRowPreview[];
  acceptedRows: number;
  tapeConnectedRows: number;
  rejectedRows: number;
}

let statusCache: { at: number; value: WearCpuStatus } | null = null;
let chunkCache: { at: number; values: string[] } | null = null;

function record(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function contourPoints(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => {
    if (!Array.isArray(point) || point.length < 2) return [];
    const x = point[0];
    const y = point[1];
    return typeof x === "number" && Number.isFinite(x)
      && typeof y === "number" && Number.isFinite(y)
      ? [[x, y] as [number, number]]
      : [];
  });
}

async function awsText(args: string[], timeout = 12_000, maxBuffer = 8 * 1024 * 1024) {
  const { stdout } = await execFileAsync("aws", args, {
    timeout,
    maxBuffer,
    env: execEnvironment,
  });
  return stdout;
}

export async function getWearCpuStatus(): Promise<WearCpuStatus> {
  const now = Date.now();
  if (statusCache && now - statusCache.at < STATUS_TTL_MS) return statusCache.value;

  const raw = JSON.parse(await awsText([
    "s3", "cp",
    `s3://${WEAR_V8_BUCKET}/${WEAR_V8_STATUS_KEY}`,
    "-",
    "--profile", WEAR_V8_PROFILE,
    "--region", WEAR_V8_REGION,
    "--only-show-errors",
  ])) as JsonRecord;
  const dataset = record(raw.dataset);
  const aws = record(raw.aws);
  const model = record(raw.model);
  const stages = Array.isArray(raw.stages) ? raw.stages.map(record) : [];
  const instanceId = stringValue(aws.instanceId) || null;
  const currentStage = stringValue(raw.currentStage);
  const workerReporting = stringValue(raw.state) === "running" && currentStage === "render-v8";

  const value: WearCpuStatus = {
    ok: true,
    pipelineId: stringValue(raw.pipelineId, "wear3d-standing-mesh-v8"),
    state: stringValue(raw.state, "unknown"),
    overallPercent: finiteNumber(raw.overallPercent),
    currentStage,
    currentStageLabel: stringValue(raw.currentStageLabel, "Waiting for CPU status"),
    detail: stringValue(raw.detail),
    startedAt: stringValue(raw.startedAt) || null,
    updatedAt: stringValue(raw.updatedAt, new Date(0).toISOString()),
    dataset: {
      subjects: finiteNumber(dataset.subjects),
      completedPeople: Math.round(finiteNumber(dataset.completedExamples) / 9),
      targetCards: finiteNumber(dataset.targetExamples),
      completedCards: finiteNumber(dataset.completedExamples),
      failedCards: finiteNumber(dataset.failedExamples),
    },
    cpu: {
      instanceId,
      instanceType: stringValue(aws.instanceType) || null,
      region: stringValue(aws.region, WEAR_V8_REGION),
      state: workerReporting ? "running" : stringValue(raw.state, "unknown"),
      systemStatus: workerReporting ? "reporting" : "unknown",
      instanceStatus: workerReporting ? "reporting" : "unknown",
    },
    model: {
      gpuStarted: false,
      trainingStarted: currentStage.startsWith("train"),
      sdkReady: model.sdkReady === true,
    },
    stages: stages.map((stage) => ({
      key: stringValue(stage.key),
      label: stringValue(stage.label),
      explanation: stringValue(stage.explanation),
      state: stringValue(stage.state, "queued") as WearCpuStage["state"],
      percent: finiteNumber(stage.percent),
    })),
  };
  statusCache = { at: now, value };
  return value;
}

async function listCompletedChunks() {
  const now = Date.now();
  if (chunkCache && now - chunkCache.at < CHUNK_LIST_TTL_MS) return chunkCache.values;
  const output = await awsText([
    "s3api", "list-objects-v2",
    "--bucket", WEAR_V8_BUCKET,
    "--prefix", `${WEAR_V8_RENDER_PREFIX}/`,
    "--delimiter", "/",
    "--profile", WEAR_V8_PROFILE,
    "--region", WEAR_V8_REGION,
    "--query", "CommonPrefixes[].Prefix",
    "--output", "json",
  ], 20_000, 2 * 1024 * 1024);
  const parsed = JSON.parse(output) as unknown;
  const values = Array.isArray(parsed)
    ? parsed.flatMap((value) => {
      if (typeof value !== "string") return [];
      const match = value.match(/\/(chunk-\d+)\/$/u);
      return match?.[1] ? [match[1]] : [];
    })
    : [];
  chunkCache = { at: now, values };
  return values;
}

function shuffled<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  }
  return copy;
}

function rowPreview(kind: WearTeacherRowPreview["kind"], value: unknown): WearTeacherRowPreview {
  const row = record(value);
  const labels: Record<WearTeacherRowPreview["kind"], string> = {
    neck: "Neck",
    chest: "Chest",
    underbust: "Under-bust",
    waist: "Natural waist",
    hips: "Hips",
  };
  const reasons = Array.isArray(row.teacher_rejection_reasons)
    ? row.teacher_rejection_reasons.filter((reason): reason is string => typeof reason === "string")
    : [];
  return {
    kind,
    label: labels[kind],
    accepted: row.accepted === true,
    leftPercent: finiteNumber(row.left_x_norm) * 100,
    rightPercent: finiteNumber(row.right_x_norm) * 100,
    yPercent: finiteNumber(row.y_norm) * 100,
    widthCm: nullableNumber(row.mesh_width_mm) === null ? null : finiteNumber(row.mesh_width_mm) / 10,
    depthCm: nullableNumber(row.mesh_depth_mm) === null ? null : finiteNumber(row.mesh_depth_mm) / 10,
    shapeCircumferenceCm: nullableNumber(row.shape_walk_circumference_mm) === null
      ? null
      : finiteNumber(row.shape_walk_circumference_mm) / 10,
    recordedTapeCm: nullableNumber(row.measurement_circumference_mm) === null
      ? null
      : finiteNumber(row.measurement_circumference_mm) / 10,
    contourPointsNormalized: contourPoints(row.contour_points_normalized),
    tapeTargetValid: row.tape_target_valid === true,
    perimeterDeltaPercent: nullableNumber(row.perimeter_delta_to_measurement_pct),
    geometrySource: stringValue(row.slice_method, "not available"),
    measurementProtocol: stringValue(row.measurement_protocol, "not available"),
    meshPlaneProtocol: stringValue(row.mesh_plane_protocol, "not available"),
    reasons,
  };
}

function cardPreview(card: JsonRecord, chunkId: string): WearTeacherCardPreview | null {
  if (stringValue(card.view_id) !== "front-50") return null;
  const meshImage = stringValue(card.mesh_image);
  const relativeMarker = `/rendered/${chunkId}/`;
  const relativeIndex = meshImage.indexOf(relativeMarker);
  if (relativeIndex < 0) return null;
  const imageKey = `${WEAR_V8_RENDER_PREFIX}/${chunkId}/${meshImage.slice(relativeIndex + relativeMarker.length)}`;
  const rawRows = record(card.rows);
  const kinds: WearTeacherRowPreview["kind"][] = ["neck", "chest", "underbust", "waist", "hips"];
  const rows = kinds.map((kind) => rowPreview(kind, rawRows[kind]));
  return {
    sampleId: stringValue(card.sample_id),
    scanId: stringValue(card.scan_id),
    subjectId: stringValue(card.subject_id),
    role: stringValue(card.role),
    gender: stringValue(card.gender),
    heightCm: finiteNumber(card.height_cm),
    weightKg: finiteNumber(card.weight_kg),
    viewId: stringValue(card.view_id),
    chunkId,
    imageKey,
    rows,
    acceptedRows: rows.filter((row) => row.accepted).length,
    tapeConnectedRows: rows.filter((row) => row.tapeTargetValid).length,
    rejectedRows: rows.filter((row) => !row.accepted).length,
  };
}

async function readChunkCards(chunkId: string) {
  try {
    const manifest = await awsText([
      "s3", "cp",
      `s3://${WEAR_V8_BUCKET}/${WEAR_V8_RENDER_PREFIX}/${chunkId}/chunk-manifest.jsonl`,
      "-",
      "--profile", WEAR_V8_PROFILE,
      "--region", WEAR_V8_REGION,
      "--only-show-errors",
    ], 15_000, 8 * 1024 * 1024);
    return manifest.split(/\r?\n/u).flatMap((line) => {
      if (!line.trim()) return [];
      try {
        const preview = cardPreview(record(JSON.parse(line)), chunkId);
        return preview ? [preview] : [];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

async function readLocallySyncedCards() {
  const root = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".local-ml/wear3d-v8-cloud-status/card-check",
  );
  try {
    const files = (await readdir(root)).filter((name) => /^chunk-\d+-manifest\.jsonl$/u.test(name));
    const groups = await Promise.all(files.map(async (name) => {
      const chunkId = name.replace(/-manifest\.jsonl$/u, "");
      const manifest = await readFile(path.join(root, name), "utf8");
      return manifest.split(/\r?\n/u).flatMap((line) => {
        if (!line.trim()) return [];
        try {
          const preview = cardPreview(record(JSON.parse(line)), chunkId);
          return preview ? [preview] : [];
        } catch {
          return [];
        }
      });
    }));
    return groups.flat();
  } catch {
    return [];
  }
}

export async function getRandomWearTeacherCards(count = 4) {
  const desired = Math.max(1, Math.min(8, count));
  const localCards = await readLocallySyncedCards();
  if (localCards.length >= desired) return shuffled(localCards).slice(0, desired);

  const chunks = shuffled(await listCompletedChunks()).slice(0, 1);
  const cloudCards = (await Promise.all(chunks.map(readChunkCards))).flat();
  return shuffled([...localCards, ...cloudCards]).slice(0, desired);
}

export function isAllowedTeacherImageKey(key: string) {
  return key.startsWith(`${WEAR_V8_RENDER_PREFIX}/chunk-`)
    && /\/attempts\/[a-z0-9-]+\/mesh-cards\/[A-Z0-9-]+-front-50\.png$/u.test(key);
}

export async function readTeacherImage(key: string) {
  if (!isAllowedTeacherImageKey(key)) throw new Error("Invalid teacher image key");
  const fileName = key.split("/").at(-1) ?? "";
  const localPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".local-ml/wear3d-v8-cloud-status/card-check",
    fileName,
  );
  try {
    return await readFile(localPath);
  } catch {
    // Most random cards stay private in S3 and are streamed below.
  }
  const { stdout } = await execFileAsync("aws", [
    "s3", "cp",
    `s3://${WEAR_V8_BUCKET}/${key}`,
    "-",
    "--profile", WEAR_V8_PROFILE,
    "--region", WEAR_V8_REGION,
    "--only-show-errors",
  ], {
    timeout: 15_000,
    maxBuffer: 12 * 1024 * 1024,
    encoding: "buffer",
    env: execEnvironment,
  });
  return stdout;
}
