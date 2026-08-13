import "server-only";

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type ModelForgeStageStatus = "complete" | "active" | "waiting";

export interface ModelForgeStage {
  title: string;
  detail: string;
  status: ModelForgeStageStatus;
}

export type ModelForgeTrainingState = "preparing" | "running" | "waiting" | "complete" | "failed" | "blocked";
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
    instanceType: string | null;
    maxRuntimeHours: number;
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
  usableStandingBodies: 4_323,
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
const PILOT_ROOT = ".local-ml/wear3d-pilot";
const SOURCE_MANIFEST = `${PILOT_ROOT}/source-manifest-100.jsonl`;

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
    subjects: 4_323,
    sourceScans: 13_209,
    targetExamples: 13_209,
    completedExamples: 0,
    failedExamples: 0,
  },
  aws: {
    executionArn: null,
    processingJobName: null,
    trainingJobName: null,
    instanceType: null,
    maxRuntimeHours: 8,
  },
  stages: [
    { key: "inventory", label: "Check the protected data", explanation: "Confirm every uploaded file and classify meshes, landmarks, and measurements.", state: "running", percent: 0 },
    { key: "manifest", label: "Pair scans with answers", explanation: "Join each body scan to its landmarks and known body measurements without mixing people across train and test.", state: "queued", percent: 0 },
    { key: "render", label: "Make labeled 2D examples", explanation: "Turn each usable 3D scan into a body mask with exact chest, waist, hip, neck, sleeve, and inseam targets.", state: "queued", percent: 0 },
    { key: "train", label: "Train the photo model", explanation: "Teach the model to predict body rows and measurements from a front-photo body mask plus height, weight, and gender.", state: "queued", percent: 0 },
    { key: "evaluate", label: "Test unseen WEAR people", explanation: "Measure error only on subjects excluded from training and save the best checkpoint.", state: "queued", percent: 0 },
    { key: "real_photos", label: "Prove it on real photos", explanation: "A separate real-photo set is required before this can be trusted in the SDK.", state: "queued", percent: 0 },
  ],
};

function clampPercent(value: unknown): number {
  return Math.min(100, Math.max(0, numberValue(value)));
}

export async function getModelForgeTrainingStatus(): Promise<ModelForgeTrainingStatus> {
  const projectRoot = process.cwd();
  const raw = await readReviewReport(
    path.join(/* turbopackIgnore: true */ projectRoot, TRAINING_STATUS),
  );
  if (!raw) return DEFAULT_TRAINING_STATUS;

  const dataset = asRecord(raw.dataset);
  const aws = asRecord(raw.aws);
  const rawStages = Array.isArray(raw.stages) ? raw.stages : [];
  const stages = DEFAULT_TRAINING_STATUS.stages.map((fallback) => {
    const candidate = rawStages
      .map(asRecord)
      .find((stage) => stage?.key === fallback.key);
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
    state: state === "preparing" || state === "running" || state === "waiting" || state === "complete" || state === "failed" || state === "blocked"
      ? state
      : DEFAULT_TRAINING_STATUS.state,
    overallPercent: clampPercent(raw.overallPercent),
    currentStage: currentStage === "inventory" || currentStage === "manifest" || currentStage === "render" || currentStage === "train" || currentStage === "evaluate" || currentStage === "real_photos"
      ? currentStage
      : DEFAULT_TRAINING_STATUS.currentStage,
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
      instanceType: typeof aws?.instanceType === "string" ? aws.instanceType : null,
      maxRuntimeHours: numberValue(aws?.maxRuntimeHours) || DEFAULT_TRAINING_STATUS.aws.maxRuntimeHours,
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
        ? `Private encrypted S3 is verified. One capped ${training.aws.instanceType ?? "AWS GPU"} worker is active.`
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
        ? "All 100 bodies passed chest, women’s under-bust, waist, and hip line checks. Extra apparel labels remain a later stage."
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
            : `Not started · ${AWS_SNAPSHOT.gpuJobs} GPU jobs · no full photo checkpoint.`,
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
