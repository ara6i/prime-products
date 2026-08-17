import "server-only";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

export type ModelForgeStageStatus = "complete" | "active" | "waiting";

export interface ModelForgeStage {
  title: string;
  detail: string;
  status: ModelForgeStageStatus;
}

export type ModelForgeTrainingState = "preparing" | "running" | "waiting" | "awaiting_real_photo_validation" | "complete" | "failed" | "blocked";
export type ModelForgeTrainingStageState = "complete" | "running" | "queued" | "failed" | "blocked";

export interface ModelForgeTrainingStage {
  key: "inventory" | "manifest" | "render" | "train" | "evaluate" | "real_photos";
  label: string;
  explanation: string;
  state: ModelForgeTrainingStageState;
  percent: number;
}

export interface ModelForgeTrainingStatus {
  schemaVersion: number;
  pipelineId: string;
  state: ModelForgeTrainingState;
  overallPercent: number;
  currentStage: ModelForgeTrainingStage["key"];
  currentStageLabel: string;
  detail: string;
  startedAt: string | null;
  updatedAt: string;
  dataset: {
    subjects: number;
    sourceScans: number;
    targetExamples: number;
    completedExamples: number;
    failedExamples: number;
  };
  aws: {
    executionArn: string | null;
    processingJobName: string | null;
    trainingJobName: string | null;
    instanceId: string | null;
    region: string | null;
    instanceType: string | null;
    maxRuntimeHours: number;
    estimatedHourlyUsd: number | null;
  };
  stages: ModelForgeTrainingStage[];
}

export interface ModelForgePilotProofRow {
  key: "chest" | "underbust" | "waist" | "hips" | "neck";
  label: string;
  circumferenceCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  closed: boolean | null;
  reconstructed: boolean;
  perimeterDeltaPct: number | null;
}

export interface ModelForgeSnapshot {
  generatedAt: string;
  usbConnected: boolean;
  inventory: {
    meshFiles: number;
    landmarkFiles: number;
    usableStandingBodies: number;
    lastScannedOn: string;
  };
  pilot: {
    selected: number;
    rendered: number;
    reviewed: number;
    train: number;
    validation: number;
    test: number;
    regions: number;
    openTorsoContours: number;
    reconstructedTorsoContours: number;
    renderErrors: number;
    reviewFlags: number;
  };
  proof: {
    available: boolean;
    label: string;
    gender: string | null;
    heightCm: number | null;
    weightKg: number | null;
    bmi: number | null;
    landmarkCount: number;
    measurementCount: number;
    rows: ModelForgePilotProofRow[];
  };
  aws: {
    infrastructureReady: boolean;
    lastVerifiedOn: string;
    safeOperatorLoginReady: boolean;
    uploadState: "waiting" | "running" | "complete" | "needs_resume";
    uploadStarted: boolean;
    uploadCompleted: boolean;
    uploadedBytes: number;
    targetBytes: number;
    gpuJobs: number;
  };
  maskPilot: {
    ready: boolean;
    records: number;
    testSubjects: number;
    modelKilobytes: number;
    circumferenceMaeCm: {
      chest: number | null;
      underbust: number | null;
      waist: number | null;
      hips: number | null;
    };
  };
  training: ModelForgeTrainingStatus;
  numericBaselineArtifacts: number;
  fullPhotoCheckpointReady: boolean;
  stages: ModelForgeStage[];
  counts: Record<ModelForgeStageStatus, number>;
}

const PILOT_TARGET = 100;
const INVENTORY_SNAPSHOT = {
  meshFiles: 13_209,
  landmarkFiles: 8_680,
  usableStandingBodies: 4_326,
  lastScannedOn: "12 Aug 2026",
};

const AWS_SNAPSHOT = {
  infrastructureReady: true,
  lastVerifiedOn: "13 Aug 2026",
  safeOperatorLoginReady: true,
  uploadState: "waiting" as const,
  uploadStarted: true,
  uploadCompleted: false,
  uploadedBytes: 0,
  targetBytes: 33_497_610_937,
  gpuJobs: 0,
};

const BASELINE_ARTIFACTS = [
  "app/try-on-test/sizing-lab/models/wear-1d-row-prior-v1.json",
  "app/try-on-test/sizing-lab/models/wear-1d-direct-depth-cohorts-v1.json",
  "app/try-on-test/sizing-lab/models/wear-1d-absolute-depth-v1.json",
  "app/try-on-test/sizing-lab/models/wear-1d-shape-exponent-v2.json",
];

const FULL_PHOTO_CHECKPOINT = ".local-ml/checkpoints/front-multitask-v1.onnx";
const MASK_PILOT_ROOT = ".local-ml/checkpoints/wear3d-mask-pilot-v1";
const MASK_PILOT_MODEL = `${MASK_PILOT_ROOT}/model.json`;
const MASK_PILOT_REPORT = `${MASK_PILOT_ROOT}/test-report.json`;
const UPLOAD_STATUS = ".local-ml/wear3d-upload-status.json";
const TRAINING_STATUS = ".local-ml/model-forge-training-status.json";
const V6_PRIVATE_WATCHER_STATUS = ".local-ml/reports/wear3d-v6r5-private-watcher.json";
const V6_APPLE_ANCHOR_STATUS = ".local-ml/v6r5-apple-pose/apple-pose-status.json";
const V6_STATUS_URI = "s3://primestyleai-wear3d-921049726279-us-east-1/jobs/wear3d-v6r5/status.json";
const V6_AWS_PROFILE = "primestyle-wear";
const V6_AWS_REGION = "us-east-1";
const PILOT_ROOT = ".local-ml/wear3d-pilot";
const SOURCE_MANIFEST = `${PILOT_ROOT}/source-manifest-100.jsonl`;
const execFileAsync = promisify(execFile);
let cloudTrainingCache: { checkedAt: number; value: Record<string, unknown> | null } | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function readJsonLines(filePath: string): Promise<Record<string, unknown>[]> {
  try {
    const contents = await readFile(filePath, "utf8");
    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const parsed = asRecord(JSON.parse(line));
          return parsed ? [parsed] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

async function pilotArtifactPaths(projectRoot: string) {
  const pilotRoot = path.join(/* turbopackIgnore: true */ projectRoot, PILOT_ROOT);
  try {
    const entries = await readdir(pilotRoot, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .sort((first, second) => first.name.localeCompare(second.name, undefined, { numeric: true }));
    return {
      renderManifests: directories.map((entry) => path.join(pilotRoot, entry.name, "render-manifest.jsonl")),
      reviewReports: directories.map((entry) => path.join(pilotRoot, entry.name, "review", "review-report.json")),
    };
  } catch {
    return { renderManifests: [], reviewReports: [] };
  }
}

async function readReviewReport(filePath: string) {
  try {
    return asRecord(JSON.parse(await readFile(filePath, "utf8")));
  } catch {
    return null;
  }
}

async function readCloudTrainingStatus() {
  const now = Date.now();
  if (cloudTrainingCache && now - cloudTrainingCache.checkedAt < 4_000) return cloudTrainingCache.value;
  try {
    const { stdout } = await execFileAsync("aws", [
      "s3", "cp", V6_STATUS_URI, "-",
      "--profile", V6_AWS_PROFILE,
      "--region", V6_AWS_REGION,
      "--only-show-errors",
    ], {
      timeout: 4_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, AWS_PAGER: "" },
    });
    const value = asRecord(JSON.parse(stdout));
    cloudTrainingCache = { checkedAt: now, value };
    return value;
  } catch {
    cloudTrainingCache = { checkedAt: now, value: null };
    return null;
  }
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metricMae(metrics: Record<string, unknown> | null, name: string): number | null {
  return optionalNumber(asRecord(metrics?.[name])?.mae);
}

function millimetersToCentimeters(value: unknown): number | null {
  const millimeters = optionalNumber(value);
  return millimeters === null ? null : Math.round(millimeters) / 10;
}

function reviewIssueCount(value: unknown): number {
  const issues = asRecord(value);
  if (!issues) return 0;
  return Object.values(issues).reduce<number>((total, issue) => {
    if (Array.isArray(issue)) return total + issue.length;
    return total + numberValue(issue);
  }, 0);
}

const DEFAULT_TRAINING_STATUS: ModelForgeTrainingStatus = {
  schemaVersion: 1,
  pipelineId: "wear3d-full-v1",
  state: "preparing",
  overallPercent: 0,
  currentStage: "inventory",
  currentStageLabel: "Preparing the full pipeline",
  detail: "The protected upload is ready. The full-data workflow has not reported progress yet.",
  startedAt: null,
  updatedAt: new Date(0).toISOString(),
  dataset: {
    subjects: 4_326,
    sourceScans: 13_209,
    targetExamples: 38_934,
    completedExamples: 0,
    failedExamples: 0,
  },
  aws: {
    executionArn: null,
    processingJobName: null,
    trainingJobName: null,
    instanceId: null,
    region: null,
    instanceType: null,
    maxRuntimeHours: 8,
    estimatedHourlyUsd: null,
  },
  stages: [
    { key: "inventory", label: "Check the protected data", explanation: "Confirm every uploaded file and classify meshes, landmarks, and measurements.", state: "running", percent: 0 },
    { key: "manifest", label: "Pair scans with answers", explanation: "Join each body scan to its landmarks and known body measurements without mixing people across train and test.", state: "queued", percent: 0 },
    { key: "render", label: "Make labeled RGB examples", explanation: "Turn each standing 3D scan into camera-aware RGB views with protocol-correct rows, torso-only edges, 32-point cross-sections, raw depth, landmarks, segments, and recorded measurements.", state: "queued", percent: 0 },
    { key: "train", label: "Train the mask-free photo model", explanation: "Teach RGB plus height, weight, gender, and Apple-corrected widths to predict rows, hidden cross-section shape, depth, and direct WEAR circumference without a runtime mask or formula.", state: "queued", percent: 0 },
    { key: "evaluate", label: "Test unseen WEAR people", explanation: "Measure error only on subjects excluded from training and save the best checkpoint.", state: "queued", percent: 0 },
    { key: "real_photos", label: "Prove it on real photos", explanation: "A separate real-photo set is required before this can be trusted in the SDK.", state: "queued", percent: 0 },
  ],
};

function clampPercent(value: unknown): number {
  return Math.min(100, Math.max(0, numberValue(value)));
}

export async function getModelForgeTrainingStatus(): Promise<ModelForgeTrainingStatus> {
  const projectRoot = process.cwd();
  const [local, cloud, watcher, appleAnchors] = await Promise.all([
    readReviewReport(path.join(/* turbopackIgnore: true */ projectRoot, TRAINING_STATUS)),
    readCloudTrainingStatus(),
    readReviewReport(path.join(/* turbopackIgnore: true */ projectRoot, V6_PRIVATE_WATCHER_STATUS)),
    readReviewReport(path.join(/* turbopackIgnore: true */ projectRoot, V6_APPLE_ANCHOR_STATUS)),
  ]);
  const localUpdated = typeof local?.updatedAt === "string" ? new Date(local.updatedAt).valueOf() : 0;
  const cloudUpdated = typeof cloud?.updatedAt === "string" ? new Date(cloud.updatedAt).valueOf() : 0;
  let raw = cloud && (!local || cloudUpdated >= localUpdated) ? cloud : local;
  const appleUpdated = typeof appleAnchors?.updated_at === "string" ? new Date(appleAnchors.updated_at).valueOf() : 0;
  const appleState = typeof appleAnchors?.state === "string" ? appleAnchors.state : "";
  if (
    appleUpdated > Math.max(localUpdated, cloudUpdated)
    && (appleState === "running" || appleState === "complete")
  ) {
    const accepted = numberValue(appleAnchors?.accepted);
    const expected = numberValue(appleAnchors?.expected) || 4_326;
    const applePercent = clampPercent(appleAnchors?.percent);
    raw = {
      schemaVersion: 2,
      pipelineId: "wear3d-standing-rgb-v6r5-20260816",
      state: "running",
      overallPercent: 75 + applePercent / 100,
      currentStage: "render-v6",
      currentStageLabel: appleState === "complete"
        ? "All Apple-on-WEAR anchors are ready"
        : `Aligning Apple joints ${accepted.toLocaleString()} / ${expected.toLocaleString()}`,
      detail: appleState === "complete"
        ? "All 4,326 approved front teachers now carry the same Apple shoulder/hip anchors used by real photos. Numerical and visual gates run next."
        : "All 38,934 WEAR views are already audited. Apple Vision is now measuring shoulder and hip joints on each of the 4,326 exact front teachers; no guessed landmark-conversion formula is used.",
      startedAt: typeof appleAnchors?.started_at === "string" ? appleAnchors.started_at : null,
      updatedAt: appleAnchors?.updated_at,
      dataset: {
        subjects: 4_326,
        sourceScans: 13_209,
        targetExamples: expected,
        completedExamples: accepted,
        failedExamples: numberValue(appleAnchors?.failed),
      },
      aws: { region: "us-east-1", instanceId: null, instanceType: "Mac Apple Vision preparation", maxRuntimeHours: 0, estimatedHourlyUsd: 0 },
      stages: [
        { key: "inventory-v6", state: "complete", percent: 100 },
        { key: "manifest-v6", state: "complete", percent: 100 },
        { key: "render-v6", state: appleState === "complete" ? "complete" : "running", percent: 99 + applePercent / 100 },
        { key: "train-v6", state: "queued", percent: 0 },
        { key: "evaluate-v6", state: "queued", percent: 0 },
        { key: "real_photos", state: "queued", percent: 0 },
      ],
    };
  }
  const watcherState = typeof watcher?.state === "string" ? watcher.state : "";
  const watcherPipeline = typeof watcher?.pipeline_id === "string" ? watcher.pipeline_id : "";
  if (raw && watcherPipeline === raw.pipelineId && watcherState && watcherState !== "watching_gpu") {
    const realPhotoStageState = watcherState === "synthetic_failed" || watcherState === "private_gate_failed" ? "failed" : "running";
    const stages = Array.isArray(raw.stages)
      ? raw.stages.map((item) => {
          const stage = asRecord(item);
          return stage?.key === "real_photos"
            ? { ...stage, state: realPhotoStageState, percent: watcherState === "ready_for_human_review" || watcherState === "private_gate_failed" ? 100 : 35 }
            : item;
        })
      : [];
    const quantitativeMae = optionalNumber(watcher?.quantitative_mean_absolute_error_cm);
    const officialSyntheticPass = watcher?.official_synthetic_pass === true;
    const watcherDisplay = (() => {
      if (watcherState === "installing_private_candidate") return { percent: 97, label: "Installing the synthetic-pass v6r5 candidate privately", detail: "The prior private model remains available until the atomic v6r5 install passes its runtime contract." };
      if (watcherState === "waiting_for_local_api") return { percent: 97.5, label: "Loading v6r5 inside private Test Lab", detail: "The local API is switching to the validated candidate; nothing is released or published." };
      if (watcherState === "running_answer_free_real_photos") return { percent: 98, label: "Testing Shane, Shahnaz, and Negar automatically", detail: "Saved tape answers are withheld from inference. Apple camera widths and WEAR predictions are being compared afterward." };
      if (watcherState === "ready_for_human_review") return { percent: 99, label: "Private v6r5 evidence is ready for review", detail: quantitativeMae === null ? "Automated checks finished. The generated contact sheet still needs one visual review." : `Automated real-photo MAE is ${quantitativeMae.toFixed(2)} cm. The generated contact sheet still needs one visual review.` };
      if (watcherState === "private_gate_passed") return { percent: 100, label: "Private v6r5 gate passed; release remains locked", detail: quantitativeMae === null ? "Private validation finished. No release, publication, deployment, or SDK promotion was performed." : `Private real-photo MAE is ${quantitativeMae.toFixed(2)} cm. No release, publication, deployment, or SDK promotion was performed.` };
      if (watcherState === "private_gate_failed") return {
        percent: 100,
        label: "Private v6r5 validation finished: failed",
        detail: quantitativeMae === null
          ? "The candidate remains private because one synthetic gate and the real-photo gates failed."
          : officialSyntheticPass
            ? `Synthetic testing passed, but real-photo MAE is ${quantitativeMae.toFixed(2)} cm and multiple WEAR rows failed visual review. The candidate remains private.`
            : `Official synthetic pass is false, real-photo MAE is ${quantitativeMae.toFixed(2)} cm, and two hip rows failed visual review. The candidate remains private and SDK-ready is false.`,
      };
      if (watcherState === "synthetic_failed") return { percent: 96, label: "v6r5 synthetic gate failed", detail: "The private candidate was preserved for diagnosis and was not installed or released." };
      if (watcherState === "timed_out_waiting_for_gpu") return { percent: numberValue(raw?.overallPercent), label: "The private completion watcher timed out", detail: "Training evidence remains preserved, but automatic private installation is blocked." };
      if (watcherState === "awaiting_local_api") return { percent: 97.5, label: "Private v6r5 install needs the local Test Lab", detail: "The candidate was downloaded, but the local API did not switch to it in time." };
      return { percent: numberValue(raw?.overallPercent), label: "Private v6r5 validation needs attention", detail: `Watcher state: ${watcherState}` };
    })();
    raw = {
      ...raw,
      state: watcherState === "private_gate_passed" ? "complete" : watcherState === "synthetic_failed" ? "failed" : watcherState === "private_gate_failed" || watcherState === "timed_out_waiting_for_gpu" || watcherState === "awaiting_local_api" ? "blocked" : "awaiting_real_photo_validation",
      overallPercent: watcherDisplay.percent,
      currentStage: "real_photos",
      currentStageLabel: watcherDisplay.label,
      detail: watcherDisplay.detail,
      updatedAt: typeof watcher?.updated_at === "string" ? watcher.updated_at : raw.updatedAt,
      stages,
    };
  }
  if (!raw) return DEFAULT_TRAINING_STATUS;

  const dataset = asRecord(raw.dataset);
  const aws = asRecord(raw.aws);
  const rawStages = Array.isArray(raw.stages) ? raw.stages : [];
  const stages = DEFAULT_TRAINING_STATUS.stages.map((fallback) => {
    const candidate = rawStages
      .map(asRecord)
      .find((stage) => stage?.key === fallback.key || stage?.key === `${fallback.key}-v6`);
    const state = candidate?.state;
    return {
      ...fallback,
      label: typeof candidate?.label === "string" ? candidate.label : fallback.label,
      explanation: typeof candidate?.explanation === "string" ? candidate.explanation : fallback.explanation,
      state: state === "complete" || state === "running" || state === "queued" || state === "failed" || state === "blocked"
        ? state
        : fallback.state,
      percent: clampPercent(candidate?.percent),
    };
  });
  const state = raw.state;
  const currentStage = raw.currentStage;

  return {
    schemaVersion: numberValue(raw.schemaVersion) || 1,
    pipelineId: typeof raw.pipelineId === "string" ? raw.pipelineId : DEFAULT_TRAINING_STATUS.pipelineId,
    state: state === "preparing" || state === "running" || state === "waiting" || state === "awaiting_real_photo_validation" || state === "complete" || state === "failed" || state === "blocked"
      ? state
      : DEFAULT_TRAINING_STATUS.state,
    overallPercent: clampPercent(raw.overallPercent),
    currentStage: (() => {
      const normalized = typeof currentStage === "string" ? currentStage.replace(/-v6$/, "") : "";
      return normalized === "inventory" || normalized === "manifest" || normalized === "render" || normalized === "train" || normalized === "evaluate" || normalized === "real_photos"
        ? normalized
        : DEFAULT_TRAINING_STATUS.currentStage;
    })(),
    currentStageLabel: typeof raw.currentStageLabel === "string" ? raw.currentStageLabel : DEFAULT_TRAINING_STATUS.currentStageLabel,
    detail: typeof raw.detail === "string" ? raw.detail : DEFAULT_TRAINING_STATUS.detail,
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : DEFAULT_TRAINING_STATUS.updatedAt,
    dataset: {
      subjects: numberValue(dataset?.subjects) || DEFAULT_TRAINING_STATUS.dataset.subjects,
      sourceScans: numberValue(dataset?.sourceScans) || DEFAULT_TRAINING_STATUS.dataset.sourceScans,
      targetExamples: numberValue(dataset?.targetExamples) || DEFAULT_TRAINING_STATUS.dataset.targetExamples,
      completedExamples: numberValue(dataset?.completedExamples),
      failedExamples: numberValue(dataset?.failedExamples),
    },
    aws: {
      executionArn: typeof aws?.executionArn === "string" ? aws.executionArn : null,
      processingJobName: typeof aws?.processingJobName === "string" ? aws.processingJobName : null,
      trainingJobName: typeof aws?.trainingJobName === "string" ? aws.trainingJobName : null,
      instanceId: typeof aws?.instanceId === "string" ? aws.instanceId : null,
      region: typeof aws?.region === "string" ? aws.region : null,
      instanceType: typeof aws?.instanceType === "string" ? aws.instanceType : null,
      maxRuntimeHours: numberValue(aws?.maxRuntimeHours) || DEFAULT_TRAINING_STATUS.aws.maxRuntimeHours,
      estimatedHourlyUsd: optionalNumber(aws?.estimatedHourlyUsd),
    },
    stages,
  };
}

export async function getModelForgeSnapshot(): Promise<ModelForgeSnapshot> {
  const projectRoot = process.cwd();
  const sourceRecords = await readJsonLines(path.join(/* turbopackIgnore: true */ projectRoot, SOURCE_MANIFEST));
  const { renderManifests, reviewReports } = await pilotArtifactPaths(projectRoot);
  const renderedBatches = await Promise.all(renderManifests.map(readJsonLines));
  const activeBatchIndex = renderedBatches.reduce((bestIndex, records, index) => {
    const successful = records.filter((record) => (
      typeof record.subject_id === "string" && typeof record.image === "string"
    )).length;
    const bestSuccessful = renderedBatches[bestIndex]?.filter((record) => (
      typeof record.subject_id === "string" && typeof record.image === "string"
    )).length ?? -1;
    return successful >= bestSuccessful ? index : bestIndex;
  }, 0);
  const allRenderedRecords = renderedBatches[activeBatchIndex] ?? [];
  const renderedBySubject = new Map<string, Record<string, unknown>>();
  for (const record of allRenderedRecords) {
    if (typeof record.subject_id === "string") renderedBySubject.set(record.subject_id, record);
  }
  const renderedRecords = [...renderedBySubject.values()];
  const activeReport = reviewReports[activeBatchIndex]
    ? await readReviewReport(reviewReports[activeBatchIndex])
    : null;
  const reports = activeReport ? [activeReport] : [];

  const firstRenderedRecord = renderedRecords.find((record) => (
    typeof record.subject_id === "string" && typeof record.image === "string"
  )) ?? null;
  const firstRenderedSubjectId = typeof firstRenderedRecord?.subject_id === "string"
    ? firstRenderedRecord.subject_id
    : null;
  const firstSourceRecord = firstRenderedSubjectId
    ? sourceRecords.find((record) => record.subject_id === firstRenderedSubjectId) ?? null
    : null;
  const firstRows = asRecord(firstRenderedRecord?.rows);
  const proofRows = ([
    ["chest", "Chest"],
    ["underbust", "Under-bust"],
    ["waist", "Waist"],
    ["hips", "Hips"],
    ["neck", "Neck"],
  ] as const).map(([key, label]): ModelForgePilotProofRow => {
    const row = asRecord(firstRows?.[key]);
    return {
      key,
      label,
      circumferenceCm: millimetersToCentimeters(row?.measurement_circumference_mm),
      widthCm: millimetersToCentimeters(row?.mesh_width_mm),
      depthCm: millimetersToCentimeters(row?.mesh_depth_mm),
      closed: typeof row?.slice_closed === "boolean" ? row.slice_closed : null,
      reconstructed: row?.slice_reconstructed === true,
      perimeterDeltaPct: optionalNumber(row?.perimeter_delta_to_measurement_pct),
    };
  });
  const sourceLandmarks = asRecord(firstSourceRecord?.landmarks_3d_mm);
  const sourceMeasurements = asRecord(firstSourceRecord?.measurements_mm);

  const renderedSubjects = new Set<string>();
  const openContourKeys = new Set<string>();
  const reconstructedContourKeys = new Set<string>();
  let manifestRenderErrors = 0;

  for (const record of renderedRecords) {
    const subjectId = typeof record.subject_id === "string" ? record.subject_id : null;
    if (subjectId && typeof record.image === "string") renderedSubjects.add(subjectId);
    if (record.error || record.render_error) manifestRenderErrors += 1;

    const rows = asRecord(record.rows);
    if (!subjectId || !rows) continue;
    for (const rowName of ["chest", "underbust", "waist", "hips"] as const) {
      const row = asRecord(rows[rowName]);
      if (row?.accepted !== false && row?.slice_closed === false) {
        openContourKeys.add(`${subjectId}:${rowName}`);
      }
      if (row?.accepted !== false && row?.slice_reconstructed === true) {
        reconstructedContourKeys.add(`${subjectId}:${rowName}`);
      }
    }
  }

  const reviewed = Math.min(
    renderedSubjects.size,
    reports.reduce((total, report) => total + numberValue(report.records), 0),
  );
  const reportRenderErrors = reports.reduce((total, report) => {
    const errors = report.render_errors;
    return total + (Array.isArray(errors) ? errors.length : numberValue(errors));
  }, 0);
  const reviewFlags = reports.reduce((total, report) => total + reviewIssueCount(report.label_issues), 0);

  const roleCount = (role: string) => sourceRecords.filter((record) => record.role === role).length;
  const regionCount = new Set(sourceRecords.flatMap((record) => (
    typeof record.region === "string" ? [record.region] : []
  ))).size;
  const numericBaselineArtifacts = BASELINE_ARTIFACTS.filter((relativePath) => (
    existsSync(path.join(/* turbopackIgnore: true */ projectRoot, relativePath))
  )).length;
  const fullPhotoCheckpointReady = existsSync(
    path.join(/* turbopackIgnore: true */ projectRoot, FULL_PHOTO_CHECKPOINT),
  );
  const maskPilotModelPath = path.join(/* turbopackIgnore: true */ projectRoot, MASK_PILOT_MODEL);
  const maskPilotReport = await readReviewReport(
    path.join(/* turbopackIgnore: true */ projectRoot, MASK_PILOT_REPORT),
  );
  const maskPilotMetrics = asRecord(maskPilotReport?.metrics);
  const maskPilotSplit = asRecord(maskPilotReport?.split);
  const maskPilotModelBytes = existsSync(maskPilotModelPath)
    ? (await readFile(maskPilotModelPath)).byteLength
    : 0;
  const maskPilot = {
    ready: maskPilotModelBytes > 0 && Boolean(maskPilotMetrics),
    records: numberValue(maskPilotReport?.records),
    testSubjects: numberValue(maskPilotSplit?.test),
    modelKilobytes: Math.round(maskPilotModelBytes / 1024),
    circumferenceMaeCm: {
      chest: metricMae(maskPilotMetrics, "chest.circumference_cm"),
      underbust: metricMae(maskPilotMetrics, "underbust.circumference_cm"),
      waist: metricMae(maskPilotMetrics, "waist.circumference_cm"),
      hips: metricMae(maskPilotMetrics, "hips.circumference_cm"),
    },
  };
  const training = await getModelForgeTrainingStatus();
  const paidComputeActive = training.state === "running" || training.state === "preparing";
  const uploadReport = await readReviewReport(
    path.join(/* turbopackIgnore: true */ projectRoot, UPLOAD_STATUS),
  );
  const rawUploadState = uploadReport?.state;
  const uploadState: ModelForgeSnapshot["aws"]["uploadState"] = rawUploadState === "running"
    || rawUploadState === "complete"
    || rawUploadState === "needs_resume"
    ? rawUploadState
    : "waiting";
  const awsSnapshot = {
    ...AWS_SNAPSHOT,
    uploadState,
    uploadStarted: uploadState !== "waiting",
    uploadCompleted: uploadState === "complete",
    uploadedBytes: numberValue(uploadReport?.remoteBytes),
    targetBytes: numberValue(uploadReport?.localBytes) || AWS_SNAPSHOT.targetBytes,
    gpuJobs: paidComputeActive ? 1 : 0,
  };

  const selected = sourceRecords.length;
  const rendered = renderedSubjects.size;
  const openTorsoContours = openContourKeys.size;
  const reconstructedTorsoContours = reconstructedContourKeys.size;
  const renderErrors = manifestRenderErrors + reportRenderErrors;
  const pilotLabelsReady = selected >= PILOT_TARGET
    && rendered >= PILOT_TARGET
    && reviewed >= PILOT_TARGET
    && openTorsoContours === 0
    && renderErrors === 0
    && reviewFlags === 0;

  const stages: ModelForgeStage[] = [
    {
      title: "Dataset checked",
      detail: `${INVENTORY_SNAPSHOT.meshFiles.toLocaleString("en-US")} meshes, ${INVENTORY_SNAPSHOT.landmarkFiles.toLocaleString("en-US")} landmark files, ${INVENTORY_SNAPSHOT.usableStandingBodies.toLocaleString("en-US")} usable standing bodies.`,
      status: selected > 0 ? "complete" : "active",
    },
    {
      title: "Private AWS vault ready",
      detail: paidComputeActive
        ? `Private encrypted S3 is verified. One capped ${training.aws.instanceType ?? "AWS"} worker is active.`
        : "Private encrypted S3 storage and the bounded worker role are verified.",
      status: AWS_SNAPSHOT.infrastructureReady ? "complete" : "active",
    },
    {
      title: "100-body pilot selected",
      detail: selected > 0
        ? `${selected}/${PILOT_TARGET} selected · ${roleCount("train")} train · ${roleCount("validation")} validation · ${roleCount("test")} test.`
        : "Waiting for the local pilot manifest.",
      status: selected >= PILOT_TARGET ? "complete" : "active",
    },
    {
      title: "Validate core photo labels",
      detail: rendered > 0
        ? `${rendered}/${PILOT_TARGET} rendered · ${reviewed} reviewed · ${openTorsoContours} open · ${reconstructedTorsoContours} reconstructed torso contours.`
        : "Render the first front-view proof from the 3D mesh and exact WEAR labels.",
      status: pilotLabelsReady ? "complete" : "active",
    },
    {
      title: "Approve the core-label pilot",
      detail: pilotLabelsReady
        ? "All 100 core-row bodies passed. Full v6 now trains every eligible WEAR row, landmark, segment, and measurement."
        : "Waiting until all 100 bodies have correct chest, women’s under-bust, waist, and hip lines.",
      status: pilotLabelsReady ? "complete" : "waiting",
    },
    {
      title: "Train the small local pilot",
      detail: maskPilot.ready
        ? `${maskPilot.records} synthetic bodies trained · ${maskPilot.testSubjects} unseen bodies tested · ${maskPilot.modelKilobytes} KB model.`
        : "Waiting for the corrected 100-body label review; this stays local and costs $0 in GPU time.",
      status: maskPilot.ready ? "complete" : pilotLabelsReady ? "active" : "waiting",
    },
    {
      title: "Upload the protected dataset",
      detail: awsSnapshot.uploadCompleted
        ? "S3 file count and byte count match the USB. The protected copy is verified complete."
        : awsSnapshot.uploadState === "needs_resume"
          ? "The copy stopped before verification. Reconnect the USB and resume; existing S3 files stay safe."
          : awsSnapshot.uploadStarted
          ? "Upload is running from the USB to private encrypted S3. Keep the USB connected until file counts match."
        : "Not started. The 34 GB stays off AWS until the pilot passes.",
      status: awsSnapshot.uploadCompleted ? "complete" : awsSnapshot.uploadStarted ? "active" : "waiting",
    },
    {
      title: "Train the full photo model",
      detail: fullPhotoCheckpointReady
        ? "The full front-photo checkpoint exists."
        : training.state === "running" || training.state === "preparing"
          ? `${training.currentStageLabel} · ${training.overallPercent.toFixed(1)}% overall.`
          : training.state === "failed" || training.state === "blocked"
            ? training.detail
            : `Not started · ${AWS_SNAPSHOT.gpuJobs} paid workers · no full photo checkpoint.`,
      status: fullPhotoCheckpointReady || training.state === "complete"
        ? "complete"
        : training.state === "running" || training.state === "preparing" ? "active" : "waiting",
    },
    {
      title: "Test with real photos",
      detail: "Measure error on people the model never saw, then add confidence and retake rules.",
      status: "waiting",
    },
    {
      title: "Connect the SDK",
      detail: "Only after the real-photo test passes: photo + height + weight in, measurements + size + confidence out.",
      status: "waiting",
    },
  ];

  const counts = stages.reduce<Record<ModelForgeStageStatus, number>>(
    (totals, stage) => ({ ...totals, [stage.status]: totals[stage.status] + 1 }),
    { complete: 0, active: 0, waiting: 0 },
  );

  return {
    generatedAt: new Date().toISOString(),
    usbConnected: existsSync("/Volumes/WEAR3DDATA"),
    inventory: INVENTORY_SNAPSHOT,
    pilot: {
      selected,
      rendered,
      reviewed,
      train: roleCount("train"),
      validation: roleCount("validation"),
      test: roleCount("test"),
      regions: regionCount,
      openTorsoContours,
      reconstructedTorsoContours,
      renderErrors,
      reviewFlags,
    },
    proof: {
      available: Boolean(firstRenderedRecord && firstSourceRecord),
      label: "Pilot body 001",
      gender: typeof firstSourceRecord?.gender === "string" ? firstSourceRecord.gender : null,
      heightCm: optionalNumber(firstSourceRecord?.height_cm),
      weightKg: optionalNumber(firstSourceRecord?.weight_kg),
      bmi: optionalNumber(firstSourceRecord?.bmi),
      landmarkCount: sourceLandmarks ? Object.keys(sourceLandmarks).length : 0,
      measurementCount: sourceMeasurements ? Object.keys(sourceMeasurements).length : 0,
      rows: proofRows,
    },
    aws: awsSnapshot,
    maskPilot,
    training,
    numericBaselineArtifacts,
    fullPhotoCheckpointReady,
    stages,
    counts,
  };
}
