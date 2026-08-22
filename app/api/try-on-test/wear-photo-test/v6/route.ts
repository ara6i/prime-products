import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { heldoutWearPerson } from "@/app/api/try-on-test/sizing-lab/sdk-wear/_lib/heldout";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { getModelForgeTrainingStatus } from "@/app/try-on-test/model-forge/lib/modelForgeProgress";
import type { SdkWearPerson } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFERRED_PIPELINE_ID = "wear3d-standing-rgb-v7-20260816";
const V6R5_PIPELINE_ID = "wear3d-standing-rgb-v6r5-20260816";
const V6R4_PIPELINE_ID = "wear3d-standing-rgb-v6r4-20260816";
const V6R3_PIPELINE_ID = "wear3d-standing-rgb-v6r3-20260816";
const PIPELINE_IDS = [PREFERRED_PIPELINE_ID, V6R5_PIPELINE_ID, V6R4_PIPELINE_ID, V6R3_PIPELINE_ID] as const;
const IMAGE_WIDTH = 192;
const IMAGE_HEIGHT = 256;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const EXPECTED_SUBJECTS = { train: 3_451, validation: 427, test: 448 } as const;
const ROW_NAMES = ["neck", "chest", "underbust", "waist", "hips"] as const;
const POSE_ANCHOR_NAMES = ["leftShoulder", "rightShoulder", "leftHip", "rightHip"] as const;
const RELATIVE_ROW_FIELDS = ["y_shoulder_hip_ratio", "span_shoulder_ratio", "center_anchor_offset_ratio"] as const;
const ROW_LABELS: Record<RowName, string> = {
  neck: "Neck base",
  chest: "Chest",
  underbust: "Under-bust",
  waist: "Natural waist",
  hips: "Hips",
};
const ROW_COLORS: Record<RowName, string> = {
  neck: "#a855f7",
  chest: "#2563eb",
  underbust: "#f59e0b",
  waist: "#06b6d4",
  hips: "#22c55e",
};
const ROW_TARGET_SOURCES: Record<RowName, string> = {
  neck: "WEAR Clavicale + Suprasternale + Cervicale tilted neck-base plane",
  chest: "WEAR chest plane + arm-excluded closed torso cross-section",
  underbust: "WEAR Substernale landmark plane + recorded under-bust tape",
  waist: "WEAR natural-waist plane + closed torso cross-section",
  hips: "WEAR maximum-hip plane + closed body cross-section",
};

type RowName = typeof ROW_NAMES[number];
type Gender = "female" | "male";

interface NormalizationManifest {
  profile_mean: number[];
  profile_std: number[];
  pose_mean?: number[];
  pose_std?: number[];
  width_mean?: number[];
  width_std?: number[];
  row_geometry_mean?: number[];
  row_geometry_std?: number[];
  edge_mean: number[];
  edge_std: number[];
  measurement_mean: number[];
  measurement_std: number[];
}

interface QuantilePrior {
  count: number;
  p01: number;
  p50: number;
  p99: number;
}

interface RowGeometryPrior {
  y_shoulder_hip_ratio: QuantilePrior;
  span_shoulder_ratio: QuantilePrior;
  center_anchor_offset_ratio: QuantilePrior;
}

interface RuntimeManifest {
  schema_version: number;
  model_version: string;
  edge_keys: string[];
  measurement_keys: string[];
  profile_keys: string[];
  pose_keys?: string[];
  pose_mask_keys?: string[];
  row_width_keys?: string[];
  row_geometry_keys?: string[];
  row_geometry_mask_keys?: string[];
  normalization: NormalizationManifest;
  image_size: [number, number];
  rgb_mean: number[];
  rgb_std: number[];
  vision_backbone: string;
  runtime_mask_required: boolean;
  training_mask_use: string;
  circumference_method: string;
  depth_method: string;
  shape_method: string;
  pose_input_method: string;
  core_edge_method: string;
  core_measurement_method: string;
  metric_width_input?: string;
  breadth_method?: string;
  row_geometry_augmentation?: string;
  apple_anchor_training_coverage?: number;
  core_pose_method?: string;
  row_geometry_priors?: {
    source: string;
    anchor: string;
    cohort_key: string;
    buckets: Record<string, Partial<Record<RowName, RowGeometryPrior>>>;
  };
  syntheticCandidatePassed?: boolean;
  sdkReady?: boolean;
  subjects?: { train: number; validation: number; test: number };
}

interface MetricsManifest {
  synthetic_candidate_passed?: boolean;
  sdk_ready?: boolean;
  important_limit?: string;
  failures?: string[];
  edge_metrics?: Record<string, TargetMetric>;
  measurement_metrics?: Record<string, TargetMetric>;
  cross_section_metrics?: {
    coordinate_count?: number;
    mean_mae_normalized?: number;
    baseline_win_rate?: number;
  };
}

interface TargetMetric {
  count?: number;
  mae?: number;
  median_absolute_error?: number;
  train_mean_baseline_mae?: number;
  beats_train_mean_baseline?: boolean;
  unit?: string;
}

interface NormalizedBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface PredictBody {
  heldoutScanId?: string;
  imageDataUrl?: string;
  heightCm?: number;
  weightKg?: number;
  gender?: Gender;
  reportedChestCm?: number | null;
  personBox?: Partial<NormalizedBox>;
  poseAnchors?: Partial<Record<PoseAnchorName, Partial<NormalizedPoint>>>;
  rowWidthsCm?: Partial<Record<RowName, number>>;
  rowWidthSources?: Partial<Record<RowName, "apple-vision" | "apple-depth" | "manual-tape" | "manual-width">>;
  rowWidthConfidences?: Partial<Record<RowName, "high" | "medium" | "low">>;
  rowGeometry?: Partial<Record<RowName, { y: number; leftX: number; rightX: number }>>;
  evaluationMode?: "answer-free-real-photo-suite";
}

function heldoutPoint(person: SdkWearPerson, name: string) {
  const point = person.landmarks2d[name];
  if (!point || !finite(point.x) || !finite(point.y)) {
    throw new Error(`${person.scanId} is missing its WEAR ${name} landmark.`);
  }
  return { x: point.x, y: point.y };
}

function heldoutInferenceBody(person: SdkWearPerson): PredictBody {
  const rowWidthsCm = Object.fromEntries(ROW_NAMES.flatMap((name) => {
    const width = person.rows[name]?.frontWidthCm;
    return finite(width) ? [[name, width]] : [];
  })) as Partial<Record<RowName, number>>;
  const rowWidthSources = Object.fromEntries(
    Object.keys(rowWidthsCm).map((name) => [name, "manual-width"]),
  ) as Partial<Record<RowName, "manual-width">>;
  const rowWidthConfidences = Object.fromEntries(
    Object.keys(rowWidthsCm).map((name) => [name, "high"]),
  ) as Partial<Record<RowName, "high">>;
  const rowGeometry = Object.fromEntries(ROW_NAMES.flatMap((name) => {
    const row = person.rows[name];
    return row
      && finite(row.yNorm)
      && finite(row.leftXNorm)
      && finite(row.rightXNorm)
      ? [[name, { y: row.yNorm, leftX: row.leftXNorm, rightX: row.rightXNorm }]]
      : [];
  })) as Partial<Record<RowName, { y: number; leftX: number; rightX: number }>>;
  return {
    heldoutScanId: person.scanId,
    heightCm: person.heightCm,
    weightKg: person.weightKg,
    gender: person.gender,
    reportedChestCm: null,
    poseAnchors: {
      leftShoulder: heldoutPoint(person, "Lt. Acromion"),
      rightShoulder: heldoutPoint(person, "Rt. Acromion"),
      leftHip: heldoutPoint(person, "Lt. Trochanterion"),
      rightHip: heldoutPoint(person, "Rt. Trochanterion"),
    },
    rowWidthsCm,
    rowWidthSources,
    rowWidthConfidences,
    rowGeometry,
    evaluationMode: "answer-free-real-photo-suite",
  };
}

interface SourceImage {
  buffer: Buffer;
  width: number;
  height: number;
}

interface CropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface NormalizedPoint {
  x: number;
  y: number;
}

interface RgbEdgeSnapEvidence {
  kind: RowName;
  mode: "mask-free-local-rgb-contrast";
  applied: boolean;
  modelY: number;
  usedY: number;
  modelLeft: number;
  usedLeft: number;
  modelRight: number;
  usedRight: number;
  leftContrast: number | null;
  rightContrast: number | null;
}

type PoseAnchorName = typeof POSE_ANCHOR_NAMES[number];

interface LoadedPackage {
  root: string;
  modifiedMs: number;
  runtime: RuntimeManifest;
  metrics: MetricsManifest;
  privateDiagnosticAuthorized: boolean;
}

interface CandidateInstallManifest {
  pipelineId?: string;
  syntheticCandidatePassed?: boolean;
  syntheticTieReviewedForPrivateDiagnostic?: boolean;
  syntheticGateReviewSha256?: string | null;
  releaseAuthorized?: boolean;
  publishAuthorized?: boolean;
  deployAuthorized?: boolean;
  sdkReady?: boolean;
  artifacts?: Record<string, { sha256?: string }>;
}

interface SyntheticGateReview {
  schemaVersion?: number;
  pipelineId?: string;
  officialSyntheticPass?: boolean;
  acceptedForPrivateDiagnostic?: boolean;
  privateTestLabOnly?: boolean;
  releaseAuthorized?: boolean;
  publishAuthorized?: boolean;
  sdkReady?: boolean;
  metricsSha256?: string;
  target?: string;
  baselineGap?: number;
  mae?: number;
  absoluteLimit?: number;
  hardChecks?: Record<string, boolean>;
}

let cachedPackage: LoadedPackage | null = null;
let cachedSession: {
  root: string;
  modifiedMs: number;
  session: import("onnxruntime-node").InferenceSession;
} | null = null;

function checkpointPath(root: string, fileName: string) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), root, fileName);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

async function privateDiagnosticAuthorization(
  root: string,
  runtimeText: string,
  metricsText: string,
  runtimeManifest: RuntimeManifest,
  metrics: MetricsManifest,
) {
  if (
    runtimeManifest.model_version !== V6R5_PIPELINE_ID
    || runtimeManifest.syntheticCandidatePassed !== false
    || metrics.synthetic_candidate_passed !== false
  ) return false;
  try {
    const [installText, reviewText] = await Promise.all([
      readFile(checkpointPath(root, "candidate-install-manifest.json"), "utf8"),
      readFile(checkpointPath(root, "synthetic-gate-review.json"), "utf8"),
    ]);
    const install = JSON.parse(installText) as CandidateInstallManifest;
    const review = JSON.parse(reviewText) as SyntheticGateReview;
    const hardChecks = Object.values(review.hardChecks ?? {});
    return install.pipelineId === V6R5_PIPELINE_ID
      && install.syntheticCandidatePassed === false
      && install.syntheticTieReviewedForPrivateDiagnostic === true
      && install.syntheticGateReviewSha256 === sha256(reviewText)
      && install.releaseAuthorized === false
      && install.publishAuthorized === false
      && install.deployAuthorized === false
      && install.sdkReady === false
      && install.artifacts?.["runtime.json"]?.sha256 === sha256(runtimeText)
      && install.artifacts?.["test-metrics.json"]?.sha256 === sha256(metricsText)
      && review.schemaVersion === 1
      && review.pipelineId === V6R5_PIPELINE_ID
      && review.officialSyntheticPass === false
      && review.acceptedForPrivateDiagnostic === true
      && review.privateTestLabOnly === true
      && review.releaseAuthorized === false
      && review.publishAuthorized === false
      && review.sdkReady === false
      && review.metricsSha256 === sha256(metricsText)
      && review.target === "row.underbust.y_shoulder_hip_ratio"
      && finite(review.baselineGap)
      && review.baselineGap <= 0.001
      && finite(review.mae)
      && finite(review.absoluteLimit)
      && review.mae <= review.absoluteLimit
      && hardChecks.length > 0
      && hardChecks.every((passed) => passed === true);
  } catch {
    return false;
  }
}

function parseDataUrl(value: string): Buffer {
  const match = /^data:image\/(?:png|jpe?g|webp);base64,([a-zA-Z0-9+/=\s]+)$/.exec(value);
  if (!match?.[1]) throw new Error("A PNG, JPEG, or WebP photo is required.");
  const buffer = Buffer.from(match[1].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("The photo must be smaller than 15 MB.");
  }
  return buffer;
}

function assertVector(values: unknown, length: number, label: string): asserts values is number[] {
  if (!Array.isArray(values) || values.length !== length || !values.every(finite)) {
    throw new Error(`The v6 ${label} vector is incomplete.`);
  }
}

async function candidateRoot() {
  for (const pipelineId of PIPELINE_IDS) {
    const root = `.local-ml/checkpoints/${pipelineId}`;
    try {
      await stat(checkpointPath(root, "runtime.json"));
      return root;
    } catch {
      // Installation is atomic. Keep serving the proven baseline until the
      // preferred private candidate is fully present.
    }
  }
  throw new Error("The audited WEAR v6 artifact is still training and is not installed yet.");
}

async function loadPackage(): Promise<LoadedPackage> {
  const root = await candidateRoot();
  const runtimePath = checkpointPath(root, "runtime.json");
  const [runtimeStat, installStat] = await Promise.all([
    stat(runtimePath),
    stat(checkpointPath(root, "candidate-install-manifest.json")).catch(() => null),
  ]);
  const packageModifiedMs = Math.max(runtimeStat.mtimeMs, installStat?.mtimeMs ?? 0);
  if (cachedPackage?.root === root && cachedPackage.modifiedMs === packageModifiedMs) return cachedPackage;
  const [runtimeText, metricsText] = await Promise.all([
    readFile(runtimePath, "utf8"),
    readFile(checkpointPath(root, "test-metrics.json"), "utf8"),
  ]);
  const runtimeManifest = JSON.parse(runtimeText) as RuntimeManifest;
  const metrics = JSON.parse(metricsText) as MetricsManifest;
  const privateDiagnosticAuthorized = await privateDiagnosticAuthorization(
    root,
    runtimeText,
    metricsText,
    runtimeManifest,
    metrics,
  );
  const compatibleV7 = runtimeManifest.model_version === PREFERRED_PIPELINE_ID
    && runtimeManifest.schema_version === 7
    && runtimeManifest.pose_input_method === "none-WEAR-RGB-only"
    && runtimeManifest.core_edge_method === "independent-front-only-WEAR-RGB-row-heads"
    && runtimeManifest.core_measurement_method
      === "independent-mask-free-RGB-profile-plus-own-normalized-row-geometry-front-50-only"
    && runtimeManifest.metric_width_input === "forbidden"
    && runtimeManifest.breadth_method === "direct-raw-WEAR-mesh-supervision";
  const compatibleV6r5 = runtimeManifest.model_version === V6R5_PIPELINE_ID
    && runtimeManifest.schema_version === 6
    && runtimeManifest.apple_anchor_training_coverage === 4_326
    && runtimeManifest.core_pose_method === "separate-Apple-on-WEAR-front-pose-projection"
    && runtimeManifest.pose_input_method
      === "Apple-Vision-shoulder-and-hip-joints-on-training-teachers-and-runtime-no-mask"
    && runtimeManifest.core_edge_method
      === "independent-front-only-row-heads-with-learned-WEAR-rows-in-true-Apple-anchor-frame"
    && runtimeManifest.core_measurement_method
      === "independent-mask-free-RGB-profile-pose-plus-own-row-width-heads-front-50-only";
  const compatibleV6r4 = runtimeManifest.model_version === V6R4_PIPELINE_ID
    && runtimeManifest.schema_version === 5
    && runtimeManifest.pose_input_method === "Apple-Vision-shoulder-and-hip-joints-no-runtime-mask"
    && runtimeManifest.core_edge_method === "independent-row-heads-with-learned-WEAR-shoulder-hip-relative-geometry"
    && runtimeManifest.core_measurement_method
      === "independent-mask-free-RGB-profile-pose-plus-own-row-width-heads-front-50-only";
  const compatibleV6r3 = runtimeManifest.model_version === V6R3_PIPELINE_ID
    && runtimeManifest.schema_version === 4
    && runtimeManifest.pose_input_method === "Apple-Vision-shoulder-and-hip-joints-no-runtime-mask"
    && runtimeManifest.core_edge_method === "independent-row-heads-with-learned-WEAR-shoulder-hip-relative-geometry"
    && runtimeManifest.core_measurement_method
      === "independent-profile-plus-own-row-width-heads-front-50-only";
  if (
    (!compatibleV7 && !compatibleV6r5 && !compatibleV6r4 && !compatibleV6r3)
    || runtimeManifest.runtime_mask_required !== false
    || runtimeManifest.circumference_method !== "direct-learned-WEAR-label"
    || runtimeManifest.depth_method !== "raw-WEAR-mesh-supervision"
    || runtimeManifest.shape_method !== "32-point-normalized-closed-WEAR-cross-section-supervision"
    || runtimeManifest.sdkReady !== false
    || metrics.sdk_ready !== false
    || runtimeManifest.image_size?.[0] !== IMAGE_WIDTH
    || runtimeManifest.image_size?.[1] !== IMAGE_HEIGHT
  ) {
    throw new Error("The formula-free WEAR v6 runtime package is incompatible.");
  }
  if (
    runtimeManifest.subjects?.train !== EXPECTED_SUBJECTS.train
    || runtimeManifest.subjects?.validation !== EXPECTED_SUBJECTS.validation
    || runtimeManifest.subjects?.test !== EXPECTED_SUBJECTS.test
  ) {
    throw new Error("The WEAR v6 runtime does not contain the exact audited 4,326-person split.");
  }
  if (
    typeof runtimeManifest.syntheticCandidatePassed !== "boolean"
    || typeof metrics.synthetic_candidate_passed !== "boolean"
    || runtimeManifest.syntheticCandidatePassed !== metrics.synthetic_candidate_passed
  ) {
    throw new Error("The WEAR v6 candidate result is missing or inconsistent.");
  }
  assertVector(runtimeManifest.normalization.profile_mean, 4, "profile mean");
  assertVector(runtimeManifest.normalization.profile_std, 4, "profile standard deviation");
  assertVector(runtimeManifest.normalization.edge_mean, runtimeManifest.edge_keys.length, "edge mean");
  assertVector(runtimeManifest.normalization.edge_std, runtimeManifest.edge_keys.length, "edge standard deviation");
  assertVector(runtimeManifest.normalization.measurement_mean, runtimeManifest.measurement_keys.length, "measurement mean");
  assertVector(runtimeManifest.normalization.measurement_std, runtimeManifest.measurement_keys.length, "measurement standard deviation");
  assertVector(runtimeManifest.rgb_mean, 3, "RGB mean");
  assertVector(runtimeManifest.rgb_std, 3, "RGB standard deviation");
  if (compatibleV7) {
    const expectedGeometryKeys = ROW_NAMES.flatMap((name) => (
      ["y_norm", "left_x_norm", "right_x_norm"].map((field) => `${name}_${field}`)
    ));
    assertVector(runtimeManifest.normalization.row_geometry_mean, expectedGeometryKeys.length, "row geometry mean");
    assertVector(runtimeManifest.normalization.row_geometry_std, expectedGeometryKeys.length, "row geometry standard deviation");
    if (
      runtimeManifest.row_geometry_keys?.length !== expectedGeometryKeys.length
      || runtimeManifest.row_geometry_keys.some((key, index) => key !== expectedGeometryKeys[index])
      || runtimeManifest.row_geometry_mask_keys?.length !== ROW_NAMES.length
      || runtimeManifest.row_geometry_mask_keys.some((key, index) => key !== ROW_NAMES[index])
    ) {
      throw new Error("The WEAR v7 normalized row-geometry input contract is incomplete.");
    }
    if (runtimeManifest.vision_backbone !== "torchvision-mobilenet-v3-small-imagenet-WEAR-only-partial-finetune") {
      throw new Error("The WEAR v7 visual backbone is incompatible.");
    }
  } else {
    assertVector(runtimeManifest.normalization.pose_mean, 8, "pose mean");
    assertVector(runtimeManifest.normalization.pose_std, 8, "pose standard deviation");
    assertVector(runtimeManifest.normalization.width_mean, ROW_NAMES.length, "width mean");
    assertVector(runtimeManifest.normalization.width_std, ROW_NAMES.length, "width standard deviation");
    if (
      runtimeManifest.pose_keys?.length !== 8
      || runtimeManifest.pose_mask_keys?.length !== POSE_ANCHOR_NAMES.length
      || runtimeManifest.pose_mask_keys.some((name, index) => name !== ["left_shoulder", "right_shoulder", "left_hip", "right_hip"][index])
    ) {
      throw new Error("The WEAR v6 pose input contract is incomplete.");
    }
    const requiredRelativeEdges = ROW_NAMES.flatMap((name) => (
      RELATIVE_ROW_FIELDS.map((field) => `row.${name}.${field}`)
    ));
    if (requiredRelativeEdges.some((key) => !runtimeManifest.edge_keys.includes(key))) {
      throw new Error("The WEAR v6 shoulder/hip-relative row outputs are incomplete.");
    }
    const globalPriors = runtimeManifest.row_geometry_priors?.buckets?.global;
    if (
      !globalPriors
      || ROW_NAMES.some((name) => {
        const prior = globalPriors[name];
        return !prior
          || !finite(prior.y_shoulder_hip_ratio?.p01)
          || !finite(prior.span_shoulder_ratio?.p99)
          || !finite(prior.center_anchor_offset_ratio?.p50);
      })
    ) {
      throw new Error("The WEAR v6 shoulder/hip-relative row guard is incomplete.");
    }
    if (runtimeManifest.vision_backbone !== "torchvision-mobilenet-v3-small-imagenet-pose-aware-partial-finetune-WEAR") {
      throw new Error("The WEAR v6 visual backbone is incompatible.");
    }
  }
  cachedPackage = {
    root,
    modifiedMs: packageModifiedMs,
    runtime: runtimeManifest,
    metrics,
    privateDiagnosticAuthorized,
  };
  return cachedPackage;
}

async function loadSession(root: string) {
  const modelPath = checkpointPath(root, "model.onnx");
  const modelStat = await stat(modelPath);
  if (cachedSession?.root === root && cachedSession.modifiedMs === modelStat.mtimeMs) return cachedSession.session;
  const ort = await import("onnxruntime-node");
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  cachedSession = { root, modifiedMs: modelStat.mtimeMs, session };
  return session;
}

function profileInput(body: PredictBody, manifest: RuntimeManifest) {
  if (!finite(body.heightCm) || body.heightCm < 100 || body.heightCm > 240) {
    throw new Error("Height must be between 100 and 240 cm.");
  }
  if (!finite(body.weightKg) || body.weightKg < 25 || body.weightKg > 300) {
    throw new Error("Weight must be between 25 and 300 kg.");
  }
  if (body.gender !== "female" && body.gender !== "male") throw new Error("Gender is required.");
  if (body.reportedChestCm != null && (!finite(body.reportedChestCm) || body.reportedChestCm < 40 || body.reportedChestCm > 220)) {
    throw new Error("Reported chest must be between 40 and 220 cm.");
  }
  if (
    body.gender === "male"
    && !finite(body.reportedChestCm)
    && body.evaluationMode !== "answer-free-real-photo-suite"
  ) {
    throw new Error("Men must provide their known chest size for the product profile. It is not used as a hidden WEAR answer.");
  }
  const bmi = body.weightKg / ((body.heightCm / 100) ** 2);
  const native = [body.heightCm, body.weightKg, bmi, body.gender === "female" ? 1 : 0];
  const normalized = native.map((value, index) => (
    (value - manifest.normalization.profile_mean[index]!)
    / Math.max(manifest.normalization.profile_std[index]!, 1e-6)
  ));
  return { bmi, normalized };
}

function isV7Manifest(manifest: RuntimeManifest) {
  return manifest.schema_version === 7 && manifest.model_version === PREFERRED_PIPELINE_ID;
}

function widthInput(body: PredictBody, manifest: RuntimeManifest) {
  const mean = manifest.normalization.width_mean;
  const std = manifest.normalization.width_std;
  if (!mean || !std) throw new Error("The WEAR v6 width normalization is unavailable.");
  const values = new Float32Array(ROW_NAMES.length);
  const mask = new Float32Array(ROW_NAMES.length);
  const accepted: Partial<Record<RowName, number>> = {};
  for (let index = 0; index < ROW_NAMES.length; index += 1) {
    const name = ROW_NAMES[index]!;
    const supplied = body.rowWidthsCm?.[name];
    const isExpected = name !== "underbust" || body.gender === "female";
    const valid = isExpected && finite(supplied) && supplied >= 5 && supplied <= 100;
    const native = valid ? supplied : mean[index]!;
    values[index] = (
      native - mean[index]!
    ) / Math.max(std[index]!, 1e-6);
    mask[index] = valid ? 1 : 0;
    if (valid) accepted[name] = supplied;
  }
  return { values, mask, accepted };
}

function v7RowGeometryInput(body: PredictBody, manifest: RuntimeManifest) {
  const keys = manifest.row_geometry_keys;
  const mean = manifest.normalization.row_geometry_mean;
  const std = manifest.normalization.row_geometry_std;
  if (!keys || !mean || !std) throw new Error("The WEAR v7 row-geometry normalization is unavailable.");
  const values = new Float32Array(keys.length);
  const mask = new Float32Array(ROW_NAMES.length);
  const accepted: Partial<Record<RowName, { y: number; leftX: number; rightX: number }>> = {};
  for (let rowIndex = 0; rowIndex < ROW_NAMES.length; rowIndex += 1) {
    const name = ROW_NAMES[rowIndex]!;
    const supplied = body.rowGeometry?.[name];
    const expected = name !== "underbust" || body.gender === "female";
    const valid = expected
      && finite(supplied?.y)
      && finite(supplied?.leftX)
      && finite(supplied?.rightX)
      && supplied.y >= 0
      && supplied.y <= 1
      && supplied.leftX >= 0
      && supplied.rightX <= 1
      && supplied.rightX - supplied.leftX >= 0.02;
    const native = valid
      ? [supplied.y, supplied.leftX, supplied.rightX]
      : [mean[rowIndex * 3]!, mean[rowIndex * 3 + 1]!, mean[rowIndex * 3 + 2]!];
    for (let fieldIndex = 0; fieldIndex < 3; fieldIndex += 1) {
      const index = rowIndex * 3 + fieldIndex;
      values[index] = (native[fieldIndex]! - mean[index]!) / Math.max(std[index]!, 1e-6);
    }
    mask[rowIndex] = valid ? 1 : 0;
    if (valid) accepted[name] = supplied;
  }
  return { values, mask, accepted };
}

async function sourceImage(buffer: Buffer): Promise<SourceImage> {
  const normalizedBuffer = await sharp(buffer, { failOn: "error" }).rotate().toBuffer();
  const metadata = await sharp(normalizedBuffer).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100) {
    throw new Error("The photo is too small.");
  }
  if (metadata.width * metadata.height > 40_000_000) throw new Error("The photo has too many pixels.");
  return { buffer: normalizedBuffer, width: metadata.width, height: metadata.height };
}

function safePersonBox(value: PredictBody["personBox"]): NormalizedBox | null {
  if (!value || !finite(value.left) || !finite(value.top) || !finite(value.right) || !finite(value.bottom)) return null;
  const box = {
    left: clamp(value.left),
    top: clamp(value.top),
    right: clamp(value.right),
    bottom: clamp(value.bottom),
  };
  return box.right - box.left >= 0.08 && box.bottom - box.top >= 0.45 ? box : null;
}

function canonicalCrop(image: SourceImage, personBox: NormalizedBox | null): CropBox {
  if (!personBox) return { left: 0, top: 0, width: image.width, height: image.height };
  const centerX = ((personBox.left + personBox.right) / 2) * image.width;
  const centerY = ((personBox.top + personBox.bottom) / 2) * image.height;
  let height = (personBox.bottom - personBox.top) * image.height * 1.10;
  let width = Math.max((personBox.right - personBox.left) * image.width * 1.18, height * IMAGE_WIDTH / IMAGE_HEIGHT);
  height = Math.max(height, width * IMAGE_HEIGHT / IMAGE_WIDTH);
  width = height * IMAGE_WIDTH / IMAGE_HEIGHT;
  width = Math.min(width, image.width);
  height = Math.min(height, image.height);
  const roundedWidth = Math.max(1, Math.min(image.width, Math.round(width)));
  const roundedHeight = Math.max(1, Math.min(image.height, Math.round(height)));
  const left = Math.round(clamp(centerX - roundedWidth / 2, 0, image.width - roundedWidth));
  const top = Math.round(clamp(centerY - roundedHeight / 2, 0, image.height - roundedHeight));
  return {
    left,
    top,
    width: roundedWidth,
    height: roundedHeight,
  };
}

function poseInput(
  body: PredictBody,
  image: SourceImage,
  crop: CropBox,
  manifest: RuntimeManifest,
) {
  const mean = manifest.normalization.pose_mean;
  const std = manifest.normalization.pose_std;
  if (!mean || !std) throw new Error("The WEAR v6 pose normalization is unavailable.");
  const native = new Float32Array(POSE_ANCHOR_NAMES.length * 2);
  const mask = new Float32Array(POSE_ANCHOR_NAMES.length);
  const canonical = {} as Record<PoseAnchorName, NormalizedPoint>;
  for (let index = 0; index < POSE_ANCHOR_NAMES.length; index += 1) {
    const name = POSE_ANCHOR_NAMES[index]!;
    const supplied = body.poseAnchors?.[name];
    if (!finite(supplied?.x) || !finite(supplied?.y) || supplied.x < 0 || supplied.x > 1 || supplied.y < 0 || supplied.y > 1) {
      throw new Error(`Apple Vision ${name} anchor is required before WEAR edge inference.`);
    }
    const point = {
      x: clamp((supplied.x * image.width - crop.left) / crop.width),
      y: clamp((supplied.y * image.height - crop.top) / crop.height),
    };
    canonical[name] = point;
    native[index * 2] = (
      point.x - mean[index * 2]!
    ) / Math.max(std[index * 2]!, 1e-6);
    native[index * 2 + 1] = (
      point.y - mean[index * 2 + 1]!
    ) / Math.max(std[index * 2 + 1]!, 1e-6);
    mask[index] = 1;
  }
  const shoulderSpan = Math.abs(canonical.rightShoulder.x - canonical.leftShoulder.x);
  const hipSpan = Math.abs(canonical.rightHip.x - canonical.leftHip.x);
  if (shoulderSpan < 0.04 || hipSpan < 0.025) {
    throw new Error("Apple Vision shoulder/hip anchors are too close for reliable torso edges.");
  }
  const shoulderY = (canonical.leftShoulder.y + canonical.rightShoulder.y) / 2;
  const hipY = (canonical.leftHip.y + canonical.rightHip.y) / 2;
  if (hipY - shoulderY < 0.08) {
    throw new Error("Apple Vision shoulder/hip anchors do not form a reliable upright torso.");
  }
  return { values: native, mask, canonical };
}

function bmiBand(bmi: number) {
  if (bmi < 18.5) return "under-18.5";
  if (bmi < 25) return "18.5-24.9";
  if (bmi < 30) return "25.0-29.9";
  if (bmi < 35) return "30.0-34.9";
  return "35-plus";
}

function geometryPriorFor(
  name: RowName,
  body: PredictBody,
  manifest: RuntimeManifest,
) {
  const bmi = body.weightKg! / ((body.heightCm! / 100) ** 2);
  const cohort = `${body.gender}:${bmiBand(bmi)}`;
  const buckets = manifest.row_geometry_priors?.buckets;
  if (!buckets) throw new Error("The WEAR v6 row-geometry priors are unavailable.");
  const selectedBucket = buckets[cohort]?.[name]
    ? cohort
    : buckets[body.gender!]?.[name]
      ? body.gender!
      : "global";
  const prior = buckets[selectedBucket]?.[name] ?? buckets.global?.[name];
  if (!prior) throw new Error(`The WEAR ${name} geometry prior is missing.`);
  return { prior, selectedBucket };
}

function constrainCoreRows(
  edges: Map<string, number>,
  pose: ReturnType<typeof poseInput>,
  body: PredictBody,
  manifest: RuntimeManifest,
) {
  const anchors = pose.canonical;
  const shoulderSpan = Math.abs(anchors.rightShoulder.x - anchors.leftShoulder.x);
  const shoulderCenter = (anchors.leftShoulder.x + anchors.rightShoulder.x) / 2;
  const shoulderY = (anchors.leftShoulder.y + anchors.rightShoulder.y) / 2;
  const hipCenter = (anchors.leftHip.x + anchors.rightHip.x) / 2;
  const hipY = (anchors.leftHip.y + anchors.rightHip.y) / 2;
  const torsoHeight = Math.max(0.05, hipY - shoulderY);
  const evidence: Array<{
    kind: RowName;
    priorBucket: string;
    rawYRatio: number;
    usedYRatio: number;
    rawSpanRatio: number;
    usedSpanRatio: number;
    rawCenterOffsetRatio: number;
    usedCenterOffsetRatio: number;
    yGuardApplied: boolean;
    spanGuardApplied: boolean;
    centerGuardApplied: boolean;
    orderGuardApplied: boolean;
  }> = [];
  const guarded = new Map<RowName, {
    priorBucket: string;
    rawYRatio: number;
    yRatio: number;
    rawSpanRatio: number;
    spanRatio: number;
    rawCenterOffsetRatio: number;
    centerOffsetRatio: number;
    orderGuardApplied: boolean;
  }>();
  for (const name of ROW_NAMES) {
    const rawYRatio = edges.get(`row.${name}.y_shoulder_hip_ratio`);
    const rawSpanRatio = edges.get(`row.${name}.span_shoulder_ratio`);
    const rawCenterOffsetRatio = edges.get(`row.${name}.center_anchor_offset_ratio`);
    if (!finite(rawYRatio) || !finite(rawSpanRatio) || !finite(rawCenterOffsetRatio)) {
      throw new Error(`The WEAR ${name} shoulder/hip-relative edge output is missing.`);
    }
    const { prior, selectedBucket } = geometryPriorFor(name, body, manifest);
    const yRatio = clamp(
      rawYRatio,
      prior.y_shoulder_hip_ratio.p01 - 0.025,
      prior.y_shoulder_hip_ratio.p99 + 0.025,
    );
    const spanRatio = clamp(
      rawSpanRatio,
      Math.max(0.05, prior.span_shoulder_ratio.p01 - 0.035),
      prior.span_shoulder_ratio.p99 + 0.035,
    );
    const centerOffsetRatio = clamp(
      rawCenterOffsetRatio,
      prior.center_anchor_offset_ratio.p01 - 0.03,
      prior.center_anchor_offset_ratio.p99 + 0.03,
    );
    guarded.set(name, {
      priorBucket: selectedBucket,
      rawYRatio,
      yRatio,
      rawSpanRatio,
      spanRatio,
      rawCenterOffsetRatio,
      centerOffsetRatio,
      orderGuardApplied: false,
    });
  }

  // Preserve the learned ratios, but fail closed if a real-photo domain shift
  // would put one anatomical row on top of or below the next row.
  for (let index = 1; index < ROW_NAMES.length; index += 1) {
    const previous = guarded.get(ROW_NAMES[index - 1]!)!;
    const current = guarded.get(ROW_NAMES[index]!)!;
    const minimum = previous.yRatio + 0.035;
    if (current.yRatio < minimum) {
      current.yRatio = minimum;
      current.orderGuardApplied = true;
    }
  }
  for (let index = ROW_NAMES.length - 2; index >= 0; index -= 1) {
    const current = guarded.get(ROW_NAMES[index]!)!;
    const next = guarded.get(ROW_NAMES[index + 1]!)!;
    const maximum = next.yRatio - 0.035;
    if (current.yRatio > maximum) {
      current.yRatio = maximum;
      current.orderGuardApplied = true;
    }
  }

  for (const name of ROW_NAMES) {
    const item = guarded.get(name)!;
    const y = shoulderY + item.yRatio * torsoHeight;
    const span = clamp(shoulderSpan * item.spanRatio, 0.02, 0.96);
    const anchorCenter = shoulderCenter + (hipCenter - shoulderCenter) * item.yRatio;
    const rawCenter = anchorCenter + item.centerOffsetRatio * shoulderSpan;
    const center = clamp(rawCenter, span / 2, 1 - span / 2);
    const usedCenterOffsetRatio = (center - anchorCenter) / shoulderSpan;
    const left = center - span / 2;
    const right = center + span / 2;
    edges.set(`row.${name}.y_shoulder_hip_ratio`, item.yRatio);
    edges.set(`row.${name}.span_shoulder_ratio`, item.spanRatio);
    edges.set(`row.${name}.center_anchor_offset_ratio`, usedCenterOffsetRatio);
    edges.set(`row.${name}.y_norm`, clamp(y));
    edges.set(`row.${name}.left_x_norm`, clamp(left));
    edges.set(`row.${name}.right_x_norm`, clamp(right));
    evidence.push({
      kind: name,
      priorBucket: item.priorBucket,
      rawYRatio: Number(item.rawYRatio.toFixed(6)),
      usedYRatio: Number(item.yRatio.toFixed(6)),
      rawSpanRatio: Number(item.rawSpanRatio.toFixed(6)),
      usedSpanRatio: Number(item.spanRatio.toFixed(6)),
      rawCenterOffsetRatio: Number(item.rawCenterOffsetRatio.toFixed(6)),
      usedCenterOffsetRatio: Number(usedCenterOffsetRatio.toFixed(6)),
      yGuardApplied: Math.abs(item.yRatio - item.rawYRatio) > 1e-6,
      spanGuardApplied: Math.abs(item.spanRatio - item.rawSpanRatio) > 1e-6,
      centerGuardApplied: Math.abs(usedCenterOffsetRatio - item.rawCenterOffsetRatio) > 1e-6,
      orderGuardApplied: item.orderGuardApplied,
    });
  }
  return evidence;
}

function rgbPatchMean(
  data: Buffer,
  width: number,
  height: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(left)));
  const x1 = Math.max(x0 + 1, Math.min(width, Math.ceil(right)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(top)));
  const y1 = Math.max(y0 + 1, Math.min(height, Math.ceil(bottom)));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const offset = (y * width + x) * 3;
      red += data[offset]!;
      green += data[offset + 1]!;
      blue += data[offset + 2]!;
      count += 1;
    }
  }
  const divisor = Math.max(1, count);
  return [red / divisor, green / divisor, blue / divisor] as const;
}

function rgbDistance(left: readonly number[], right: readonly number[]) {
  return Math.hypot(left[0]! - right[0]!, left[1]! - right[1]!, left[2]! - right[2]!);
}

function findRgbBoundary(
  data: Buffer,
  width: number,
  height: number,
  y: number,
  centerX: number,
  shoulderSpan: number,
  expectedX: number,
  distanceWeight: number,
  direction: "left" | "right",
) {
  // Search around the WEAR model/prior span. There is no hand-written
  // BMI-to-width formula here; RGB contrast only refines a WEAR seed.
  const expected = Math.abs(expectedX - centerX) / Math.max(1, shoulderSpan);
  const minimumRatio = clamp(expected - 0.24, 0.14, 0.82);
  const maximumRatio = clamp(expected + 0.34, minimumRatio + 0.10, 1.05);
  const minimumOffset = shoulderSpan * minimumRatio;
  const maximumOffset = shoulderSpan * maximumRatio;
  const xStart = direction === "left" ? centerX - maximumOffset : centerX + minimumOffset;
  const xEnd = direction === "left" ? centerX - minimumOffset : centerX + maximumOffset;
  const window = Math.max(3, Math.round(width * 0.006));
  const halfBand = Math.max(2, Math.round(height * 0.003));
  let best: { x: number; contrast: number; score: number } | null = null;
  for (let x = Math.ceil(xStart); x <= Math.floor(xEnd); x += 1) {
    if (x - window < 0 || x + window >= width) continue;
    const inside = direction === "left"
      ? rgbPatchMean(data, width, height, x + 1, x + window + 1, y - halfBand, y + halfBand + 1)
      : rgbPatchMean(data, width, height, x - window, x, y - halfBand, y + halfBand + 1);
    const outside = direction === "left"
      ? rgbPatchMean(data, width, height, x - window, x, y - halfBand, y + halfBand + 1)
      : rgbPatchMean(data, width, height, x + 1, x + window + 1, y - halfBand, y + halfBand + 1);
    const contrast = rgbDistance(inside, outside);
    const offsetRatio = Math.abs(x - centerX) / Math.max(1, shoulderSpan);
    const score = contrast - Math.abs(offsetRatio - expected) * distanceWeight;
    if (!best || score > best.score) best = { x, contrast, score };
  }
  return best && best.contrast >= 12 ? best : null;
}

function findRgbPair(
  data: Buffer,
  width: number,
  height: number,
  yNorm: number,
  centerNorm: number,
  shoulderSpanNorm: number,
  kind: RowName,
  expectedLeftNorm: number,
  expectedRightNorm: number,
) {
  const y = clamp(yNorm) * height;
  const center = clamp(centerNorm) * width;
  const shoulderSpan = Math.max(1, shoulderSpanNorm * width);
  const distanceWeight = kind === "hips" ? 100 : 28;
  const left = findRgbBoundary(data, width, height, y, center, shoulderSpan, expectedLeftNorm * width, distanceWeight, "left");
  const right = findRgbBoundary(data, width, height, y, center, shoulderSpan, expectedRightNorm * width, distanceWeight, "right");
  if (!left || !right || right.x - left.x < shoulderSpan * 0.45) return null;
  return {
    y: clamp(y / height),
    left: clamp(left.x / width),
    right: clamp(right.x / width),
    leftContrast: left.contrast,
    rightContrast: right.contrast,
    score: left.score + right.score,
  };
}

async function snapCoreRowsToVisibleRgb(
  edges: Map<string, number>,
  pose: ReturnType<typeof poseInput>,
  crop: CropBox,
  image: SourceImage,
  body: PredictBody,
  manifest: RuntimeManifest,
  poseGeometryGuard: ReturnType<typeof constrainCoreRows>,
) {
  const targetWidth = Math.min(512, crop.width);
  const targetHeight = Math.max(128, Math.round(targetWidth * crop.height / crop.width));
  const decoded = await sharp(image.buffer)
    .extract(crop)
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (decoded.info.channels !== 3) throw new Error("The photo could not be inspected for visible RGB torso edges.");
  const anchors = pose.canonical;
  const shoulderSpan = Math.abs(anchors.rightShoulder.x - anchors.leftShoulder.x);
  const shoulderCenter = (anchors.leftShoulder.x + anchors.rightShoulder.x) / 2;
  const shoulderY = (anchors.leftShoulder.y + anchors.rightShoulder.y) / 2;
  const hipCenter = (anchors.leftHip.x + anchors.rightHip.x) / 2;
  const hipY = (anchors.leftHip.y + anchors.rightHip.y) / 2;
  const torsoHeight = Math.max(0.05, hipY - shoulderY);
  const evidence: RgbEdgeSnapEvidence[] = [];

  for (const kind of ROW_NAMES) {
    const modelY = edges.get(`row.${kind}.y_norm`);
    const modelLeft = edges.get(`row.${kind}.left_x_norm`);
    const modelRight = edges.get(`row.${kind}.right_x_norm`);
    if (!finite(modelY) || !finite(modelLeft) || !finite(modelRight) || kind === "neck") {
      if (finite(modelY) && finite(modelLeft) && finite(modelRight)) {
        evidence.push({
          kind,
          mode: "mask-free-local-rgb-contrast",
          applied: false,
          modelY,
          usedY: modelY,
          modelLeft,
          usedLeft: modelLeft,
          modelRight,
          usedRight: modelRight,
          leftContrast: null,
          rightContrast: null,
        });
      }
      continue;
    }
    const modelCenter = (modelLeft + modelRight) / 2;
    const guard = poseGeometryGuard.find((item) => item.kind === kind);
    let candidateY = modelY;
    let expectedLeft = modelLeft;
    let expectedRight = modelRight;
    const repairingLegacyV6r3 = manifest.model_version === V6R3_PIPELINE_ID;
    if (repairingLegacyV6r3 && kind === "hips") {
      // Maximum-hip height comes from the matching WEAR cohort median; RGB
      // then finds the visible outer endpoints at that learned anatomical row.
      // This is only a safe fallback for the preserved v6r3 model. Newer RGB
      // prove that its new RGB row head can place the uploaded person itself.
      const { prior } = geometryPriorFor(kind, body, manifest);
      candidateY = shoulderY + prior.y_shoulder_hip_ratio.p50 * torsoHeight;
      const expectedSpan = prior.span_shoulder_ratio.p50 * shoulderSpan;
      expectedLeft = modelCenter - expectedSpan / 2;
      expectedRight = modelCenter + expectedSpan / 2;
    } else if (repairingLegacyV6r3 && kind === "waist" && guard && finite(guard.rawYRatio)) {
      // The raw learned waist row often remains useful even when a defensive
      // ordering guard moved it. RGB decides the visible contour around that
      // learned seed without consulting any saved red line or tape answer.
      // v6r4/v6r5 instead keep the independently learned RGB row position.
      const { prior } = geometryPriorFor(kind, body, manifest);
      const rawRatio = clamp(
        guard.rawYRatio,
        prior.y_shoulder_hip_ratio.p01 - 0.16,
        prior.y_shoulder_hip_ratio.p99 + 0.12,
      );
      candidateY = shoulderY + rawRatio * torsoHeight;
    }
    const pair = findRgbPair(
      decoded.data,
      targetWidth,
      targetHeight,
      candidateY,
      modelCenter,
      shoulderSpan,
      kind,
      expectedLeft,
      expectedRight,
    );
    if (!pair) {
      evidence.push({
        kind,
        mode: "mask-free-local-rgb-contrast",
        applied: false,
        modelY,
        usedY: modelY,
        modelLeft,
        usedLeft: modelLeft,
        modelRight,
        usedRight: modelRight,
        leftContrast: null,
        rightContrast: null,
      });
      continue;
    }
    const usedCenter = (pair.left + pair.right) / 2;
    const usedYRatio = (pair.y - shoulderY) / torsoHeight;
    const anchorCenter = shoulderCenter + (hipCenter - shoulderCenter) * usedYRatio;
    edges.set(`row.${kind}.y_norm`, pair.y);
    edges.set(`row.${kind}.left_x_norm`, pair.left);
    edges.set(`row.${kind}.right_x_norm`, pair.right);
    edges.set(`row.${kind}.y_shoulder_hip_ratio`, usedYRatio);
    edges.set(`row.${kind}.span_shoulder_ratio`, (pair.right - pair.left) / shoulderSpan);
    edges.set(`row.${kind}.center_anchor_offset_ratio`, (usedCenter - anchorCenter) / shoulderSpan);
    evidence.push({
      kind,
      mode: "mask-free-local-rgb-contrast",
      applied: true,
      modelY: Number(modelY.toFixed(6)),
      usedY: Number(pair.y.toFixed(6)),
      modelLeft: Number(modelLeft.toFixed(6)),
      usedLeft: Number(pair.left.toFixed(6)),
      modelRight: Number(modelRight.toFixed(6)),
      usedRight: Number(pair.right.toFixed(6)),
      leftContrast: Number(pair.leftContrast.toFixed(3)),
      rightContrast: Number(pair.rightContrast.toFixed(3)),
    });
  }
  return evidence;
}

async function rgbInput(image: SourceImage, crop: CropBox, manifest: RuntimeManifest) {
  const decoded = await sharp(image.buffer)
    .extract(crop)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "fill" })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (decoded.info.channels !== 3) throw new Error("The photo could not be converted to RGB.");
  const plane = IMAGE_WIDTH * IMAGE_HEIGHT;
  const output = new Float32Array(plane * 3);
  for (let index = 0; index < plane; index += 1) {
    output[index] = (decoded.data[index * 3]! / 255 - manifest.rgb_mean[0]!) / manifest.rgb_std[0]!;
    output[plane + index] = (decoded.data[index * 3 + 1]! / 255 - manifest.rgb_mean[1]!) / manifest.rgb_std[1]!;
    output[plane * 2 + index] = (decoded.data[index * 3 + 2]! / 255 - manifest.rgb_mean[2]!) / manifest.rgb_std[2]!;
  }
  return output;
}

function denormalizedOutput(
  data: readonly number[] | Float32Array,
  keys: string[],
  mean: number[],
  std: number[],
) {
  const output = new Map<string, number>();
  for (let index = 0; index < keys.length; index += 1) {
    output.set(keys[index]!, Number(data[index]!) * std[index]! + mean[index]!);
  }
  return output;
}

function pointToPhoto(crop: CropBox, image: SourceImage, x: number, y: number) {
  return {
    x: clamp((crop.left + clamp(x) * crop.width) / image.width),
    y: clamp((crop.top + clamp(y) * crop.height) / image.height),
  };
}

function metricFor(metrics: MetricsManifest, namespace: "edge" | "measurement", key: string) {
  return namespace === "edge" ? metrics.edge_metrics?.[key] ?? null : metrics.measurement_metrics?.[key] ?? null;
}

function buildRows(
  edges: Map<string, number>,
  crop: CropBox,
  image: SourceImage,
  metrics: MetricsManifest,
  gender: Gender,
  rgbEdgeSnap: RgbEdgeSnapEvidence[],
  modelVersion: string,
) {
  const snappedKinds = new Set(rgbEdgeSnap.filter((item) => item.applied).map((item) => item.kind));
  return ROW_NAMES.flatMap((name) => {
    if (name === "underbust" && gender !== "female") return [];
    const y = edges.get(`row.${name}.y_norm`);
    const left = edges.get(`row.${name}.left_x_norm`);
    const right = edges.get(`row.${name}.right_x_norm`);
    if (!finite(y) || !finite(left) || !finite(right) || right - left < 0.02) return [];
    const canonical = {
      left: { x: clamp(left), y: clamp(y) },
      right: { x: clamp(right), y: clamp(y) },
    };
    return [{
      kind: name,
      label: gender === "female" && name === "chest" ? "Bust / chest" : ROW_LABELS[name],
      color: ROW_COLORS[name],
      edgeSource: modelVersion === PREFERRED_PIPELINE_ID
        ? "wear-v7-rgb-row-head" as const
        : modelVersion === V6R5_PIPELINE_ID
        ? snappedKinds.has(name)
          ? "wear-v6r5-apple-teacher-pose-relative-rgb-snap" as const
          : "wear-v6r5-apple-teacher-pose-relative" as const
        : modelVersion === V6R4_PIPELINE_ID
          ? snappedKinds.has(name)
            ? "wear-v6r4-pose-relative-rgb-snap" as const
            : "wear-v6r4-pose-relative" as const
          : snappedKinds.has(name)
            ? "wear-v6r3-pose-relative-rgb-snap" as const
            : "wear-v6r3-pose-relative" as const,
      targetSource: ROW_TARGET_SOURCES[name],
      canonical,
      photo: {
        left: pointToPhoto(crop, image, canonical.left.x, canonical.left.y),
        right: pointToPhoto(crop, image, canonical.right.x, canonical.right.y),
      },
      syntheticEdgeMae: {
        yNorm: metricFor(metrics, "edge", `row.${name}.y_norm`)?.mae ?? null,
        leftXNorm: metricFor(metrics, "edge", `row.${name}.left_x_norm`)?.mae ?? null,
        rightXNorm: metricFor(metrics, "edge", `row.${name}.right_x_norm`)?.mae ?? null,
      },
    }];
  });
}

function buildHeldoutRows(
  person: SdkWearPerson,
  crop: CropBox,
  image: SourceImage,
  metrics: MetricsManifest,
) {
  return ROW_NAMES.flatMap((name) => {
    if (name === "underbust" && person.gender !== "female") return [];
    const source = person.rows[name];
    if (
      !source
      || !finite(source.yNorm)
      || !finite(source.leftXNorm)
      || !finite(source.rightXNorm)
      || source.rightXNorm - source.leftXNorm < 0.02
    ) return [];
    const canonical = {
      left: { x: clamp(source.leftXNorm), y: clamp(source.yNorm) },
      right: { x: clamp(source.rightXNorm), y: clamp(source.yNorm) },
    };
    return [{
      kind: name,
      label: person.gender === "female" && name === "chest" ? "Bust / chest" : ROW_LABELS[name],
      color: ROW_COLORS[name],
      edgeSource: "wear-heldout-exact-mesh-projection" as const,
      targetSource: ROW_TARGET_SOURCES[name],
      canonical,
      photo: {
        left: pointToPhoto(crop, image, canonical.left.x, canonical.left.y),
        right: pointToPhoto(crop, image, canonical.right.x, canonical.right.y),
      },
      syntheticEdgeMae: {
        yNorm: metricFor(metrics, "edge", `row.${name}.y_norm`)?.mae ?? null,
        leftXNorm: metricFor(metrics, "edge", `row.${name}.left_x_norm`)?.mae ?? null,
        rightXNorm: metricFor(metrics, "edge", `row.${name}.right_x_norm`)?.mae ?? null,
      },
    }];
  });
}

function predictedRowGeometryFromEdges(edges: Map<string, number>, gender: Gender) {
  return Object.fromEntries(ROW_NAMES.flatMap((name) => {
    if (name === "underbust" && gender !== "female") return [];
    const y = edges.get(`row.${name}.y_norm`);
    const leftX = edges.get(`row.${name}.left_x_norm`);
    const rightX = edges.get(`row.${name}.right_x_norm`);
    if (!finite(y) || !finite(leftX) || !finite(rightX)) return [];
    const normalized = {
      y: clamp(y),
      leftX: clamp(leftX),
      rightX: clamp(rightX),
    };
    return normalized.rightX - normalized.leftX >= 0.02 ? [[name, normalized]] : [];
  })) as Partial<Record<RowName, { y: number; leftX: number; rightX: number }>>;
}

function buildHeldoutRealGeometry(person: SdkWearPerson) {
  return Object.fromEntries(ROW_NAMES.flatMap((name) => {
    if (name === "underbust" && person.gender !== "female") return [];
    const row = person.rows[name];
    if (!row) return [];
    const reveal = person.revealOnly.rowTapeAndCircumferenceCm[name];
    const contour32Normalized = (row.contour32Normalized ?? []).flatMap((point) => (
      Array.isArray(point) && finite(point[0]) && finite(point[1])
        ? [{ breadthNorm: point[0], depthNorm: point[1] }]
        : []
    ));
    return [[name, {
      frontWidthCm: finite(row.frontWidthCm) ? row.frontWidthCm : null,
      depthCm: finite(row.depthCm) ? row.depthCm : null,
      contour32Normalized,
      tapeCm: finite(reveal?.tape) ? reveal.tape : null,
      geometryPerimeterCm: finite(reveal?.geometryPerimeter) ? reveal.geometryPerimeter : null,
    }]];
  }));
}

function buildSegments(edges: Map<string, number>, crop: CropBox, image: SourceImage) {
  const names = ["shoulders", "right_sleeve", "left_sleeve", "right_inseam", "left_inseam"];
  return names.flatMap((name) => {
    const points = [];
    for (let index = 0; index < 4; index += 1) {
      const x = edges.get(`segment.${name}.${index}.x`);
      const y = edges.get(`segment.${name}.${index}.y`);
      if (!finite(x) || !finite(y)) break;
      points.push({ x: clamp(x), y: clamp(y) });
    }
    if (points.length < 2) return [];
    return [{
      kind: name,
      label: name.replaceAll("_", " "),
      canonical: points,
      photo: points.map((point) => pointToPhoto(crop, image, point.x, point.y)),
    }];
  });
}

function buildLandmarks(edges: Map<string, number>, crop: CropBox, image: SourceImage) {
  const names = new Set<string>();
  for (const key of edges.keys()) {
    const match = /^landmark\.(.+)\.x$/.exec(key);
    if (match?.[1]) names.add(match[1]);
  }
  return [...names].flatMap((name) => {
    const x = edges.get(`landmark.${name}.x`);
    const y = edges.get(`landmark.${name}.y`);
    if (!finite(x) || !finite(y)) return [];
    const canonical = { x: clamp(x), y: clamp(y) };
    return [{ name, canonical, photo: pointToPhoto(crop, image, canonical.x, canonical.y) }];
  });
}

function buildMeasurements(
  values: Map<string, number>,
  widths: ReturnType<typeof widthInput>,
  body: PredictBody,
  metrics: MetricsManifest,
  profileOutOfRange: boolean,
  useDirectWearBreadth = false,
) {
  return ROW_NAMES.flatMap((name) => {
    if (name === "underbust" && body.gender !== "female") return [];
    const widthCm = useDirectWearBreadth
      ? values.get(`row.${name}.breadth_cm`)
      : widths.accepted[name];
    const circumferenceCm = values.get(`row.${name}.circumference_cm`);
    const depthCm = values.get(`row.${name}.depth_cm`);
    if (
      !finite(widthCm)
      || !finite(circumferenceCm)
      || circumferenceCm < 20
      || circumferenceCm > 300
      || (finite(depthCm) && (depthCm < 3 || depthCm > 100))
    ) return [];
    const metric = metricFor(metrics, "measurement", `row.${name}.circumference_cm`);
    const cameraConfidence = useDirectWearBreadth
      ? body.rowGeometry?.[name] ? "high" : "low"
      : body.rowWidthConfidences?.[name] ?? "low";
    const hasTestEvidence = finite(metric?.mae) && Number(metric?.count ?? 0) >= 100;
    const confidence = !hasTestEvidence || profileOutOfRange || Number(metric?.mae) > 4
      ? "low"
      : cameraConfidence === "high" && Number(metric?.mae) <= 2.5
        ? "high"
        : "medium";
    return [{
      kind: name,
      label: body.gender === "female" && name === "chest" ? "Bust / chest" : ROW_LABELS[name],
      valueCm: Number(circumferenceCm.toFixed(2)),
      rawMeshDepthCm: finite(depthCm) ? Number(depthCm.toFixed(2)) : null,
      appleCorrectedWidthCm: Number(widthCm.toFixed(2)),
      widthSource: useDirectWearBreadth
        ? "wear-v7-direct"
        : body.rowWidthSources?.[name] ?? "manual-width",
      confidence,
      syntheticMaeCm: metric?.mae ?? null,
      syntheticTestCount: metric?.count ?? null,
      formulaUsed: false,
    }];
  });
}

function profileOutsideTrainingRange(body: PredictBody, manifest: RuntimeManifest) {
  const profile = [body.heightCm!, body.weightKg!, body.weightKg! / ((body.heightCm! / 100) ** 2)];
  return profile.some((value, index) => (
    Math.abs((value - manifest.normalization.profile_mean[index]!) / Math.max(manifest.normalization.profile_std[index]!, 1e-6)) > 3.5
  ));
}

function buildCrossSections(values: Map<string, number>, metrics: MetricsManifest, gender: Gender) {
  return ROW_NAMES.flatMap((name) => {
    if (name === "underbust" && gender !== "female") return [];
    const points = [];
    const pointErrors: number[] = [];
    for (let index = 0; index < 32; index += 1) {
      const prefix = `row.${name}.shape.${String(index).padStart(2, "0")}`;
      const breadthNorm = values.get(`${prefix}.x`);
      const depthNorm = values.get(`${prefix}.y`);
      if (!finite(breadthNorm) || !finite(depthNorm)) return [];
      points.push({
        breadthNorm: Number(breadthNorm.toFixed(6)),
        depthNorm: Number(depthNorm.toFixed(6)),
      });
      for (const axis of ["x", "y"] as const) {
        const mae = metricFor(metrics, "measurement", `${prefix}.${axis}`)?.mae;
        if (finite(mae)) pointErrors.push(mae);
      }
    }
    return [{
      kind: name,
      label: gender === "female" && name === "chest" ? "Bust / chest" : ROW_LABELS[name],
      source: "wear-v6-rgb-cross-section" as const,
      points,
      syntheticMeanMaeNormalized: pointErrors.length
        ? Number((pointErrors.reduce((sum, value) => sum + value, 0) / pointErrors.length).toFixed(6))
        : metrics.cross_section_metrics?.mean_mae_normalized ?? null,
    }];
  });
}

function profileWarnings(
  body: PredictBody,
  manifest: RuntimeManifest,
  widths: ReturnType<typeof widthInput>,
  directWearBreadth = false,
) {
  const warnings: string[] = [];
  const outOfRange = profileOutsideTrainingRange(body, manifest);
  if (outOfRange) warnings.push("Profile is outside the main WEAR training range; treat the result as low confidence.");
  if (!directWearBreadth && !Object.keys(widths.accepted).length) {
    warnings.push("Rows are predicted, but circumference is withheld until Apple Vision or a manual tape scale supplies corrected widths.");
  }
  for (const name of directWearBreadth ? [] : Object.keys(widths.accepted) as RowName[]) {
    if ((body.rowWidthConfidences?.[name] ?? "low") === "low") {
      warnings.push(`${ROW_LABELS[name]} width has low camera-scale confidence.`);
    }
  }
  return warnings;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "This model test is available only inside Test Lab." }, { status: 403 });
  }
  try {
    const loaded = await loadPackage();
    const { runtime: manifest, metrics } = loaded;
    await loadSession(loaded.root);
    return NextResponse.json({
      ok: true,
      modelVersion: manifest.model_version,
      edgeTargetCount: manifest.edge_keys.length,
      measurementTargetCount: manifest.measurement_keys.length,
      targetCount: manifest.edge_keys.length + manifest.measurement_keys.length,
      runtimeMaskRequired: false,
      poseAnchorsRequired: !isV7Manifest(manifest),
      circumferenceMethod: "direct learned WEAR target",
      shapeMethod: manifest.shape_method,
      syntheticCandidatePassed: metrics.synthetic_candidate_passed === true,
      privateDiagnosticOnly: metrics.synthetic_candidate_passed !== true
        && loaded.privateDiagnosticAuthorized,
      inferenceEnabled: metrics.synthetic_candidate_passed === true
        || loaded.privateDiagnosticAuthorized,
      sdkReady: false,
      split: manifest.subjects,
      importantLimit: metrics.important_limit ?? "Private Test Lab candidate only. Release and publishing are disabled.",
      failures: metrics.failures ?? [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const trainingStatus = await getModelForgeTrainingStatus().catch(() => null);
    const message = error instanceof Error && !error.message.includes("ENOENT")
      ? error.message
      : "The audited WEAR v6 artifact is still training and is not installed yet.";
    return NextResponse.json({
      ok: false,
      modelVersion: PREFERRED_PIPELINE_ID,
      training: trainingStatus?.state === "preparing" || trainingStatus?.state === "running",
      trainingState: trainingStatus?.state,
      trainingPercent: trainingStatus?.overallPercent,
      trainingStageLabel: trainingStatus?.currentStageLabel,
      trainingDetail: trainingStatus?.detail,
      error: message,
    }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "This model test is available only inside Test Lab." }, { status: 403 });
  }
  try {
    const requestBody = await request.json() as PredictBody;
    const heldoutPerson = requestBody.heldoutScanId
      ? await heldoutWearPerson(requestBody.heldoutScanId)
      : null;
    if (requestBody.heldoutScanId && !heldoutPerson) throw new Error("Choose a valid held-out WEAR test model.");
    const body = heldoutPerson ? heldoutInferenceBody(heldoutPerson) : requestBody;
    if (!heldoutPerson && !body.imageDataUrl) throw new Error("A full-body RGB photo is required.");
    const loaded = await loadPackage();
    const { runtime: manifest, metrics } = loaded;
    const officialSyntheticPass = manifest.syntheticCandidatePassed === true
      && metrics.synthetic_candidate_passed === true;
    if (!officialSyntheticPass && !loaded.privateDiagnosticAuthorized) {
      return NextResponse.json({
        ok: false,
        error: "The WEAR v6 synthetic candidate failed validation. Inference is blocked until it is corrected and retrained.",
        failures: metrics.failures ?? [],
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const session = await loadSession(loaded.root);
    const v7 = isV7Manifest(manifest);
    const profile = profileInput(body, manifest);
    const widths = v7
      ? { values: new Float32Array(ROW_NAMES.length), mask: new Float32Array(ROW_NAMES.length), accepted: {} as Partial<Record<RowName, number>> }
      : widthInput(body, manifest);
    // Held-out v7 must first predict its rows from RGB. Exact WEAR row geometry
    // is truth for comparison only and must not enter the automatic pipeline.
    const rowGeometry = v7
      ? v7RowGeometryInput(heldoutPerson ? { ...body, rowGeometry: {} } : body, manifest)
      : null;
    const image = heldoutPerson?.imagePath
      ? await sourceImage(await readFile(path.join(process.cwd(), heldoutPerson.imagePath)))
      : await sourceImage(parseDataUrl(body.imageDataUrl!));
    const crop = canonicalCrop(image, safePersonBox(body.personBox));
    const pose = v7 ? null : poseInput(body, image, crop, manifest);
    const rgb = await rgbInput(image, crop, manifest);
    const ort = await import("onnxruntime-node");
    const inferenceStartedAt = performance.now();
    const sharedInputs = {
      rgb: new ort.Tensor("float32", rgb, [1, 3, IMAGE_HEIGHT, IMAGE_WIDTH]),
      profile: new ort.Tensor("float32", Float32Array.from(profile.normalized), [1, 4]),
    };
    let output = await session.run(v7 ? {
      ...sharedInputs,
      row_geometry: new ort.Tensor("float32", rowGeometry!.values, [1, ROW_NAMES.length * 3]),
      row_geometry_mask: new ort.Tensor("float32", rowGeometry!.mask, [1, ROW_NAMES.length]),
    } : {
      ...sharedInputs,
      pose: new ort.Tensor("float32", pose!.values, [1, POSE_ANCHOR_NAMES.length * 2]),
      pose_mask: new ort.Tensor("float32", pose!.mask, [1, POSE_ANCHOR_NAMES.length]),
      row_widths: new ort.Tensor("float32", widths.values, [1, ROW_NAMES.length]),
      row_width_mask: new ort.Tensor("float32", widths.mask, [1, ROW_NAMES.length]),
    });
    if (!output.edges || output.edges.data.length !== manifest.edge_keys.length) {
      throw new Error("The v6 edge output is incompatible with its runtime manifest.");
    }
    if (!output.measurements || output.measurements.data.length !== manifest.measurement_keys.length) {
      throw new Error("The v6 measurement output is incompatible with its runtime manifest.");
    }
    const edgeValues = denormalizedOutput(
      Array.from(output.edges.data as Float32Array),
      manifest.edge_keys,
      manifest.normalization.edge_mean,
      manifest.normalization.edge_std,
    );
    const predictedRowGeometry = v7
      ? predictedRowGeometryFromEdges(edgeValues, body.gender!)
      : null;
    if (heldoutPerson && v7) {
      const automaticGeometry = v7RowGeometryInput({ ...body, rowGeometry: predictedRowGeometry ?? {} }, manifest);
      output = await session.run({
        ...sharedInputs,
        row_geometry: new ort.Tensor("float32", automaticGeometry.values, [1, ROW_NAMES.length * 3]),
        row_geometry_mask: new ort.Tensor("float32", automaticGeometry.mask, [1, ROW_NAMES.length]),
      });
      if (!output.measurements || output.measurements.data.length !== manifest.measurement_keys.length) {
        throw new Error("The v7 automatic measurement output is incompatible with its runtime manifest.");
      }
    }
    const rawCoreRows = ROW_NAMES.map((kind) => ({
      kind,
      yNorm: edgeValues.get(`row.${kind}.y_norm`) ?? null,
      leftXNorm: edgeValues.get(`row.${kind}.left_x_norm`) ?? null,
      rightXNorm: edgeValues.get(`row.${kind}.right_x_norm`) ?? null,
      yShoulderHipRatio: edgeValues.get(`row.${kind}.y_shoulder_hip_ratio`) ?? null,
      spanShoulderRatio: edgeValues.get(`row.${kind}.span_shoulder_ratio`) ?? null,
      centerAnchorOffsetRatio: edgeValues.get(`row.${kind}.center_anchor_offset_ratio`) ?? null,
    }));
    // The held-out evaluator is intentionally the raw ONNX path. Applying the
    // photo RGB snap here can lock chest/under-bust endpoints onto A-pose arms,
    // which makes the displayed torso rows wider than the ONNX prediction.
    const poseGeometryGuard = heldoutPerson || v7 ? [] : constrainCoreRows(edgeValues, pose!, body, manifest);
    const rgbEdgeSnap = heldoutPerson || v7 ? [] : await snapCoreRowsToVisibleRgb(
      edgeValues,
      pose!,
      crop,
      image,
      body,
      manifest,
      poseGeometryGuard,
    );
    const measurementValues = denormalizedOutput(
      Array.from(output.measurements.data as Float32Array),
      manifest.measurement_keys,
      manifest.normalization.measurement_mean,
      manifest.normalization.measurement_std,
    );
    const predictedRows = buildRows(
        edgeValues,
        crop,
        image,
        metrics,
        body.gender!,
        rgbEdgeSnap,
        manifest.model_version,
      );
    const realRows = heldoutPerson
      ? buildHeldoutRows(heldoutPerson, crop, image, metrics)
      : [];
    const rows = predictedRows;
    const measurements = buildMeasurements(
      measurementValues,
      widths,
      body,
      metrics,
      profileOutsideTrainingRange(body, manifest),
      v7,
    );
    const warnings = profileWarnings(body, manifest, widths, v7);
    const allPredictions = [
      ...[...edgeValues.entries()].map(([key, value]) => ({ key, value: Number(value.toFixed(6)), unit: "normalized" as const })),
      ...[...measurementValues.entries()].map(([key, value]) => ({
        key,
        value: Number(value.toFixed(5)),
        unit: key.includes(".shape.") ? "normalized" as const : "cm" as const,
      })),
    ];
    return NextResponse.json({
      ok: true,
      model: {
        version: manifest.model_version,
        trainingPose: "standing A only",
        runtimeMaskRequired: false,
        trainingMaskUse: manifest.training_mask_use,
        poseInputMethod: manifest.pose_input_method,
        coreEdgeMethod: manifest.core_edge_method,
        coreMeasurementMethod: manifest.core_measurement_method,
        circumferenceMethod: "direct learned WEAR target",
        shapeMethod: manifest.shape_method,
        formulaUsed: false,
        syntheticCandidatePassed: metrics.synthetic_candidate_passed === true,
        privateDiagnosticOnly: !officialSyntheticPass && loaded.privateDiagnosticAuthorized,
        releaseAuthorized: false,
        publishAuthorized: false,
        sdkReady: false,
        split: manifest.subjects,
        importantLimit: metrics.important_limit ?? "Private Test Lab candidate only. Release and publishing are disabled.",
      },
      inputContract: {
        usedByRgbModel: v7
          ? [heldoutPerson ? "held-out WEAR front render" : "RGB photo", "height", "weight", "BMI", "gender"]
          : heldoutPerson
          ? ["held-out WEAR front render", "height", "weight", "BMI", "gender", "WEAR shoulder/hip landmarks"]
          : ["RGB photo", "height", "weight", "BMI", "gender", "Apple shoulder/hip anchors", "mask-free local RGB edge contrast"],
        usedByMeasurementHead: v7
          ? [
            "mask-free RGB body shape",
            "height, weight, BMI, and gender profile",
            heldoutPerson ? "the model's own predicted row y/left/right coordinates" : "this row's normalized y/left/right photo coordinates when supplied",
            "no centimetre width input",
          ]
          : manifest.schema_version >= 5
          ? ["mask-free RGB body shape", heldoutPerson ? "WEAR shoulder/hip landmarks" : "Apple shoulder/hip pose", "profile", heldoutPerson ? "exact WEAR mesh front width for that body part" : "exactly one Apple-corrected width for that body part"]
          : ["profile", heldoutPerson ? "exact WEAR mesh front width for that body part" : "exactly one Apple-corrected width for that body part"],
        usedByProductProfile: [
          heldoutPerson || body.evaluationMode === "answer-free-real-photo-suite"
            ? "product-only chest field intentionally omitted during answer-free model evaluation"
            : body.gender === "male"
              ? "reported chest (required)"
              : "reported bust / chest (optional)",
        ],
        neverUsed: [
          "MediaPipe silhouette mask",
          ...(heldoutPerson || v7 ? ["Apple Vision", "Depth Pro"] : []),
          ...(heldoutPerson || v7 ? ["post-ONNX RGB edge snap", "post-ONNX geometry guards"] : []),
          ...(v7 ? ["px-to-cm conversion", "metric front-width input"] : []),
          "saved tape answers",
          "ellipse formula",
          "nearest-person lookup",
          "another body part's width inside a core row head",
        ],
      },
      profile: {
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        bmi: Number(profile.bmi.toFixed(2)),
        gender: body.gender,
        reportedChestCm: finite(body.reportedChestCm) ? body.reportedChestCm : null,
      },
      preprocessing: {
        sourceImageSize: [image.width, image.height],
        modelImageSize: [IMAGE_WIDTH, IMAGE_HEIGHT],
        crop,
        cropSource: heldoutPerson ? "complete held-out WEAR render" : safePersonBox(body.personBox) ? "person box only; no silhouette pixels enter the model" : "full photo",
        poseAnchorSource: v7 ? "not used by WEAR v7" : heldoutPerson ? "held-out WEAR acromion/trochanterion landmarks" : "Apple Vision shoulder/hip joints; no silhouette mask",
        poseAnchorsCanonical: pose?.canonical ?? {},
        rowGeometryAccepted: heldoutPerson && v7 ? predictedRowGeometry ?? {} : rowGeometry?.accepted ?? {},
        rawCoreRows,
        poseGeometryGuard,
        rgbEdgeSnap,
        warnings,
        quality: warnings.length ? "review" : "good",
      },
      calibration: {
        status: measurements.length
          ? v7
            ? Object.keys(rowGeometry?.accepted ?? {}).length
              ? "wear-row-geometry-applied"
              : "wear-rgb-predicted"
            : heldoutPerson ? "mesh-front-widths-applied" : "camera-widths-applied"
          : "rows-only-awaiting-widths",
        acceptedWidthsCm: v7
          ? Object.fromEntries(measurements.map((measurement) => [measurement.kind, measurement.appleCorrectedWidthCm]))
          : widths.accepted,
      },
      heldoutEvaluation: heldoutPerson ? {
        scanId: heldoutPerson.scanId,
        subjectId: heldoutPerson.subjectId,
        role: "test",
        includedInTraining: false,
        onnxMeasurementsOnly: true,
        displayRowsSource: "model-prediction-and-exact-heldout-wear-mesh-projection",
        appleVisionUsed: false,
        depthProUsed: false,
        rgbEdgeSnapUsed: false,
        geometryGuardsUsed: false,
        inputs: v7
          ? ["front-50 RGB render", "height", "weight", "gender", "model-predicted row coordinates"]
          : ["front-50 RGB render", "height", "weight", "gender", "WEAR shoulder/hip landmarks", "WEAR mesh front widths"],
        actuals: {
          neck: heldoutPerson.revealOnly.rowTapeAndCircumferenceCm.neck?.tape ?? null,
          chest: heldoutPerson.revealOnly.rowTapeAndCircumferenceCm.chest?.tape ?? null,
          underbust: heldoutPerson.gender === "female"
            ? heldoutPerson.revealOnly.rowTapeAndCircumferenceCm.underbust?.tape ?? null
            : null,
          waist: heldoutPerson.revealOnly.rowTapeAndCircumferenceCm.waist?.tape ?? null,
          hips: heldoutPerson.revealOnly.rowTapeAndCircumferenceCm.hips?.tape ?? null,
        },
        predictedRows,
        realRows,
        realGeometry: buildHeldoutRealGeometry(heldoutPerson),
      } : null,
      rows,
      crossSections: buildCrossSections(measurementValues, metrics, body.gender!),
      measurements,
      segments: buildSegments(edgeValues, crop, image),
      landmarks: buildLandmarks(edgeValues, crop, image),
      allPredictions,
      timing: {
        inferenceMs: Number((performance.now() - inferenceStartedAt).toFixed(2)),
        totalMs: Number((performance.now() - startedAt).toFixed(2)),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "The WEAR v6 photo test failed.",
    }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
