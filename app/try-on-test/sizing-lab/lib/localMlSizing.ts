import type {
  GeminiBodyGuide,
  GeminiGuideDepthRatioOverrides,
  GeminiGuideLine,
  GeminiGuideRowKind,
} from "./geminiGuide";
import { calculateCircumferenceCm } from "./circumferenceMethods";

export const LOCAL_ML_MODEL_VERSION = "front-multitask-v1";
export const LOCAL_ML_CHECKPOINT_RELATIVE_PATH = ".local-ml/checkpoints/front-multitask-v1.onnx";
export const WEAR_ROW_PRIOR_MODEL_VERSION = "wear-1d-row-prior-v1";
export const WEAR_ROW_PRIOR_RELATIVE_PATH = "app/try-on-test/sizing-lab/models/wear-1d-row-prior-v1.json";
export const WEAR_DIRECT_DEPTH_MODEL_VERSION = "wear-1d-direct-depth-cohorts-v1";
export const WEAR_DIRECT_DEPTH_RELATIVE_PATH = "app/try-on-test/sizing-lab/models/wear-1d-direct-depth-cohorts-v1.json";
export const WEAR_ABSOLUTE_DEPTH_MODEL_VERSION = "wear-1d-absolute-depth-v1";
export const WEAR_ABSOLUTE_DEPTH_RELATIVE_PATH = "app/try-on-test/sizing-lab/models/wear-1d-absolute-depth-v1.json";
export const WEAR_SHAPE_EXPONENT_MODEL_VERSION = "wear-1d-shape-exponent-v2";
export const WEAR_SHAPE_EXPONENT_RELATIVE_PATH = "app/try-on-test/sizing-lab/models/wear-1d-shape-exponent-v2.json";

export type LocalMlModelStage = "wear-1d-row-prior" | "front-multitask-3d";
export type LocalMlDepthMethod = "wear-ratio" | "wear-absolute-depth";

export type LocalMlRunStatus = "idle" | "checking" | "waiting-for-checkpoint" | "predicting" | "ready" | "error";

export interface LocalMlWearReferenceCohort {
  gender: "male" | "female";
  averageHeightCm: number;
  averageBmi: number;
  sampleCount: number;
  measuredHeightFromFloorCm: number;
  sourceColumn: string;
  genderMatched: boolean;
}

export interface LocalMlWearDirectDepthCohort {
  gender: "male" | "female";
  heightMinCm: number;
  heightMaxCm: number;
  bmiMin: number;
  bmiMax: number;
  sampleCount: number;
  medianDepthRatio: number;
  p10DepthRatio: number;
  p90DepthRatio: number;
  medianBreadthCm: number;
  medianDepthCm: number;
  surveys: string[];
  measurement: string;
}

export type LocalMlWearAbsoluteDepthFeatureName =
  | "breadthCm"
  | "bmi"
  | "heightCm"
  | "isMale"
  | "breadthMale"
  | "bmiMale";

export interface LocalMlWearAbsoluteDepthModel {
  label: string;
  measurement: string;
  validationMethod: string;
  trainingSubjects: number;
  trainingSurveyCount: number;
  genderCounts: Record<"female" | "male", number>;
  featureNames: LocalMlWearAbsoluteDepthFeatureName[];
  featureCenters: Partial<Record<LocalMlWearAbsoluteDepthFeatureName, number>>;
  interceptCm: number;
  coefficients: Partial<Record<LocalMlWearAbsoluteDepthFeatureName, number>>;
  supportedDepthMinCm: number;
  supportedDepthMaxCm: number;
  featureP05: Partial<Record<LocalMlWearAbsoluteDepthFeatureName, number>>;
  featureP95: Partial<Record<LocalMlWearAbsoluteDepthFeatureName, number>>;
  validationMaeCm: number;
  validationP90AbsErrorCm: number;
  validationP95AbsErrorCm: number;
}

export interface LocalMlWearAbsoluteDepthResult {
  depthCm: number;
  outsideTypicalFeatures: LocalMlWearAbsoluteDepthFeatureName[];
}

export type LocalMlWearShapeFeatureName =
  | "bmi"
  | "depthToBreadth"
  | "breadthToHeight"
  | "isMale"
  | "bmiSquared"
  | "depthToBreadthSquared"
  | "breadthToHeightSquared"
  | "bmiDepthToBreadth"
  | "bmiBreadthToHeight"
  | "depthToBreadthBreadthToHeight"
  | "isMaleBmi"
  | "isMaleDepthToBreadth"
  | "isMaleBreadthToHeight"
  | "heightCm"
  | "breadthCm"
  | "depthCm"
  | "heightCmSquared"
  | "breadthCmSquared"
  | "depthCmSquared"
  | "bmiBreadthCm"
  | "bmiDepthCm"
  | "breadthDepthCm2"
  | "isMaleBreadthCm"
  | "isMaleDepthCm";

export interface LocalMlWearShapeExponentModel {
  label: string;
  measurement: string;
  validationMethod: string;
  trainingWeighting?: string;
  ridgeAlpha?: number;
  trainingSubjects: number;
  sameLevelSubjects: number;
  coveragePct: number;
  trainingSurveyCount: number;
  trainingSurveys: string[];
  genderCounts: Record<"female" | "male", number>;
  featureNames: LocalMlWearShapeFeatureName[];
  featureCenters: Partial<Record<LocalMlWearShapeFeatureName, number>>;
  featureScales: Partial<Record<LocalMlWearShapeFeatureName, number>>;
  interceptPosition: number;
  coefficients: Partial<Record<LocalMlWearShapeFeatureName, number>>;
  featureP05: Partial<Record<LocalMlWearShapeFeatureName, number>>;
  featureP95: Partial<Record<LocalMlWearShapeFeatureName, number>>;
  minimumExponent: number;
  maximumExponent: number;
  validationMaeCm: number;
  validationP90AbsErrorCm: number;
  validationMeanAbsPercentError: number;
  validationP90AbsPercentError: number;
  validationFemaleMaeCm?: number;
  validationFemaleP90AbsErrorCm?: number;
  validationMaleMaeCm?: number;
  validationMaleP90AbsErrorCm?: number;
  ellipseBaselineMaeCm: number;
  ellipseBaselineP90AbsErrorCm: number;
  baselineV1ValidationMaeCm?: number;
  baselineV1ValidationP90AbsErrorCm?: number;
}

export interface LocalMlWearShapeExponentResult {
  exponent: number;
  normalizedPosition: number;
  targetCircumferenceCm: number;
  outsideTypicalFeatures: LocalMlWearShapeFeatureName[];
}

export interface LocalMlWearRowFormulaEvidence {
  featureNames: string[];
  featureValues: number[];
  coefficients: number[];
  rawBodyFraction: number;
  activeBodyFraction: number;
  outputMin: number;
  outputMax: number;
  maskTopNorm: number;
  maskBottomNorm: number;
}

export interface LocalMlModelStatusResponse {
  ok: boolean;
  localOnly: true;
  modelVersion: string;
  checkpointReady: boolean;
  rowPriorReady: boolean;
  directDepthCohortReady: boolean;
  absoluteDepthModelReady: boolean;
  shapeExponentModelReady: boolean;
  fullCheckpointReady: boolean;
  activeStage: LocalMlModelStage | null;
  checkpointPath: string;
  rowPriorPath: string;
  directDepthCohortPath: string;
  absoluteDepthModelPath: string;
  shapeExponentModelPath: string;
  trainingManifestPath: string;
  message: string;
}

export interface LocalMlNormalizedRowPrediction {
  kind: GeminiGuideRowKind;
  yNorm: number;
  leftXNorm: number;
  rightXNorm: number;
  /**
   * A reviewed test-lab coordinate may temporarily replace the model/mask
   * coordinate while keeping the original prediction visible for comparison.
   * This is never training evidence and never counts as Local ML accuracy.
   */
  reviewedCoordinateOverride?: {
    source: "saved-review" | "manual-adjustment";
    label: string;
    modelYPx: number;
    modelLeftXPx: number;
    modelRightXPx: number;
  };
  /** WEAR 1D anatomical landmark height measured upward from the floor. */
  heightFromFloorCm?: number;
  depthRatio: number | null;
  confidence: number;
  trainingSamples?: number;
  trainingSurveys?: number;
  trainingGenderCounts?: Partial<Record<"male" | "female", number>>;
  validationMode?: string;
  validationMaeAt170Cm?: number;
  validationP90At170Cm?: number;
  definition?: string;
  /** Anonymous aggregate shown for explanation only; never used to calculate the row. */
  referenceCohort?: LocalMlWearReferenceCohort;
  /** Direct measured WEAR cohort used as the temporary Local ML body-depth ratio. No regression. */
  wearDepthCohort?: LocalMlWearDirectDepthCohort;
  /** WEAR-only formula that predicts front-to-back depth directly in centimetres. */
  wearAbsoluteDepthModel?: LocalMlWearAbsoluteDepthModel;
  /** WEAR-only formula for the final superellipse shape. Width and depth stay unchanged. */
  wearShapeExponentModel?: LocalMlWearShapeExponentModel;
  /** Exact WEAR row-regression inputs and coefficients used to choose Y. */
  rowFormula?: LocalMlWearRowFormulaEvidence;
}

export interface LocalMlPredictionResponse {
  ok: boolean;
  modelVersion: string;
  modelStage: LocalMlModelStage;
  depthReady: boolean;
  endpointSource: "local-ml" | "mediapipe-visible-mask" | "mediapipe-central-torso-mask";
  checkpointFingerprint: string;
  elapsedMs: number;
  rows: LocalMlNormalizedRowPrediction[];
  error?: string;
}

export interface LocalMlGuidePrediction {
  guide: GeminiBodyGuide;
  depthRatios: GeminiGuideDepthRatioOverrides;
  directWearDepthRatios: GeminiGuideDepthRatioOverrides;
  confidenceByRow: Partial<Record<GeminiGuideRowKind, number>>;
  minimumConfidence: number;
  depthReady: boolean;
  directWearDepthReady: boolean;
  absoluteWearDepthReady: boolean;
}

const ROW_ORDER: GeminiGuideRowKind[] = ["waist", "trouserWaist", "hips"];

function absoluteDepthFeatureValues(args: {
  breadthCm: number;
  heightCm: number;
  weightKg: number;
  gender: "male" | "female";
}): Record<LocalMlWearAbsoluteDepthFeatureName, number> {
  const bmi = args.weightKg / ((args.heightCm / 100) ** 2);
  const isMale = args.gender === "male" ? 1 : 0;
  return {
    breadthCm: args.breadthCm,
    bmi,
    heightCm: args.heightCm,
    isMale,
    breadthMale: args.breadthCm * isMale,
    bmiMale: bmi * isMale,
  };
}

export function predictWearAbsoluteDepthCm(
  model: LocalMlWearAbsoluteDepthModel | undefined,
  args: {
    breadthCm: number;
    heightCm: number;
    weightKg: number;
    gender: "male" | "female";
  },
): LocalMlWearAbsoluteDepthResult | null {
  if (
    !model
    || !Number.isFinite(args.breadthCm)
    || args.breadthCm <= 0
    || !Number.isFinite(args.heightCm)
    || args.heightCm <= 0
    || !Number.isFinite(args.weightKg)
    || args.weightKg <= 0
  ) return null;
  const values = absoluteDepthFeatureValues(args);
  let depthCm = model.interceptCm;
  const outsideTypicalFeatures: LocalMlWearAbsoluteDepthFeatureName[] = [];
  for (const feature of model.featureNames) {
    const center = model.featureCenters[feature];
    const coefficient = model.coefficients[feature];
    if (!Number.isFinite(center) || !Number.isFinite(coefficient)) return null;
    depthCm += coefficient! * (values[feature] - center!);
    const p05 = model.featureP05[feature];
    const p95 = model.featureP95[feature];
    if (
      Number.isFinite(p05)
      && Number.isFinite(p95)
      && (values[feature] < p05! || values[feature] > p95!)
    ) outsideTypicalFeatures.push(feature);
  }
  if (!Number.isFinite(depthCm) || depthCm <= 0) return null;
  return { depthCm, outsideTypicalFeatures };
}

function shapeFeatureValues(args: {
  breadthCm: number;
  depthCm: number;
  heightCm: number;
  weightKg: number;
  gender: "male" | "female";
}): Record<LocalMlWearShapeFeatureName, number> {
  const bmi = args.weightKg / ((args.heightCm / 100) ** 2);
  const depthToBreadth = args.depthCm / args.breadthCm;
  const breadthToHeight = args.breadthCm / args.heightCm;
  const isMale = args.gender === "male" ? 1 : 0;
  return {
    bmi,
    heightCm: args.heightCm,
    breadthCm: args.breadthCm,
    depthCm: args.depthCm,
    depthToBreadth,
    breadthToHeight,
    isMale,
    bmiSquared: bmi * bmi,
    heightCmSquared: args.heightCm * args.heightCm,
    breadthCmSquared: args.breadthCm * args.breadthCm,
    depthCmSquared: args.depthCm * args.depthCm,
    depthToBreadthSquared: depthToBreadth * depthToBreadth,
    breadthToHeightSquared: breadthToHeight * breadthToHeight,
    bmiDepthToBreadth: bmi * depthToBreadth,
    bmiBreadthToHeight: bmi * breadthToHeight,
    depthToBreadthBreadthToHeight: depthToBreadth * breadthToHeight,
    bmiBreadthCm: bmi * args.breadthCm,
    bmiDepthCm: bmi * args.depthCm,
    breadthDepthCm2: args.breadthCm * args.depthCm,
    isMaleBmi: isMale * bmi,
    isMaleBreadthCm: isMale * args.breadthCm,
    isMaleDepthCm: isMale * args.depthCm,
    isMaleDepthToBreadth: isMale * depthToBreadth,
    isMaleBreadthToHeight: isMale * breadthToHeight,
  };
}

export function predictWearShapeExponent(
  model: LocalMlWearShapeExponentModel | undefined,
  args: {
    breadthCm: number;
    depthCm: number;
    heightCm: number;
    weightKg: number;
    gender: "male" | "female";
  },
): LocalMlWearShapeExponentResult | null {
  if (
    !model
    || !Number.isFinite(args.breadthCm)
    || args.breadthCm <= 0
    || !Number.isFinite(args.depthCm)
    || args.depthCm <= 0
    || !Number.isFinite(args.heightCm)
    || args.heightCm <= 0
    || !Number.isFinite(args.weightKg)
    || args.weightKg <= 0
  ) return null;
  const values = shapeFeatureValues(args);
  let normalizedPosition = model.interceptPosition;
  const outsideTypicalFeatures: LocalMlWearShapeFeatureName[] = [];
  for (const feature of model.featureNames) {
    const center = model.featureCenters[feature];
    const scale = model.featureScales[feature];
    const coefficient = model.coefficients[feature];
    if (!Number.isFinite(center) || !Number.isFinite(scale) || scale! <= 0 || !Number.isFinite(coefficient)) return null;
    normalizedPosition += coefficient! * ((values[feature] - center!) / scale!);
    const p05 = model.featureP05[feature];
    const p95 = model.featureP95[feature];
    if (
      Number.isFinite(p05)
      && Number.isFinite(p95)
      && (values[feature] < p05! || values[feature] > p95!)
    ) outsideTypicalFeatures.push(feature);
  }
  normalizedPosition = Math.min(1, Math.max(0, normalizedPosition));
  const minimumPerimeterCm = calculateCircumferenceCm(
    args.breadthCm,
    args.depthCm,
    "superellipse",
    model.minimumExponent,
  );
  const maximumPerimeterCm = calculateCircumferenceCm(
    args.breadthCm,
    args.depthCm,
    "superellipse",
    model.maximumExponent,
  );
  if (
    minimumPerimeterCm == null
    || maximumPerimeterCm == null
    || maximumPerimeterCm <= minimumPerimeterCm
  ) return null;
  const targetCircumferenceCm = minimumPerimeterCm
    + normalizedPosition * (maximumPerimeterCm - minimumPerimeterCm);
  let low = model.minimumExponent;
  let high = model.maximumExponent;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const middle = (low + high) / 2;
    const middlePerimeterCm = calculateCircumferenceCm(args.breadthCm, args.depthCm, "superellipse", middle);
    if (middlePerimeterCm == null) return null;
    if (middlePerimeterCm < targetCircumferenceCm) low = middle;
    else high = middle;
  }
  return {
    exponent: (low + high) / 2,
    normalizedPosition,
    targetCircumferenceCm,
    outsideTypicalFeatures,
  };
}

function finiteUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function buildLine(
  prediction: LocalMlNormalizedRowPrediction,
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine {
  const yPx = prediction.yNorm * imageHeight;
  const leftXPx = prediction.leftXNorm * imageWidth;
  const rightXPx = prediction.rightXNorm * imageWidth;
  const spanPx = rightXPx - leftXPx;
  return {
    y_px: Math.round(yPx),
    left_x_px: Math.round(leftXPx),
    right_x_px: Math.round(rightXPx),
    confidence: prediction.confidence,
    points: [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
      x_px: Math.round(leftXPx + spanPx * fraction),
      y_px: Math.round(yPx),
    })),
  };
}

export function buildLocalMlGuidePrediction(
  rows: LocalMlNormalizedRowPrediction[],
  imageWidth: number,
  imageHeight: number,
): LocalMlGuidePrediction | null {
  if (imageWidth <= 0 || imageHeight <= 0 || rows.length !== ROW_ORDER.length) return null;
  const ordered = ROW_ORDER.map((kind) => rows.find((row) => row.kind === kind) ?? null);
  if (ordered.some((row) => !row)) return null;
  const safeRows = ordered as LocalMlNormalizedRowPrediction[];

  for (const row of safeRows) {
    if (
      !finiteUnit(row.yNorm)
      || !finiteUnit(row.leftXNorm)
      || !finiteUnit(row.rightXNorm)
      || row.rightXNorm - row.leftXNorm < 0.03
      || (row.depthRatio != null && (
        !Number.isFinite(row.depthRatio)
        || row.depthRatio < 0.35
        || row.depthRatio > 1.1
      ))
      || (row.wearDepthCohort != null && (
        !Number.isFinite(row.wearDepthCohort.medianDepthRatio)
        || row.wearDepthCohort.medianDepthRatio < 0.35
        || row.wearDepthCohort.medianDepthRatio > 1.1
      ))
      || (row.wearAbsoluteDepthModel != null && (
        !Number.isFinite(row.wearAbsoluteDepthModel.interceptCm)
        || !Number.isFinite(row.wearAbsoluteDepthModel.validationMaeCm)
        || row.wearAbsoluteDepthModel.featureNames.length < 1
      ))
      || (row.wearShapeExponentModel != null && (
        !Number.isFinite(row.wearShapeExponentModel.interceptPosition)
        || !Number.isFinite(row.wearShapeExponentModel.validationMaeCm)
        || row.wearShapeExponentModel.featureNames.length < 1
      ))
      || !finiteUnit(row.confidence)
    ) return null;
  }
  if (!(safeRows[0]!.yNorm < safeRows[1]!.yNorm && safeRows[1]!.yNorm < safeRows[2]!.yNorm)) return null;

  const guide: GeminiBodyGuide = {
    waist: buildLine(safeRows[0]!, imageWidth, imageHeight),
    trouserWaist: buildLine(safeRows[1]!, imageWidth, imageHeight),
    hips: buildLine(safeRows[2]!, imageWidth, imageHeight),
    notes: safeRows.every((row) => row.depthRatio != null)
      ? "Local ML front-multitask-v1 prediction. Apple owns row scale; the existing ellipse calculation owns circumference."
      : safeRows.every((row) => row.wearDepthCohort != null)
        ? "WEAR 1D predicts vertical rows; MediaPipe supplies temporary endpoints; direct similar-person WEAR medians supply body depth without regression."
        : "WEAR 1D predicts vertical anatomical rows only and MediaPipe supplies visible mask endpoints. Body depth is unavailable because a safe direct WEAR cohort was not found.",
  };
  const depthRows = safeRows.filter((row) => row.depthRatio != null);
  const directWearDepthRows = safeRows.filter((row) => row.wearDepthCohort != null);
  const absoluteWearDepthRows = safeRows.filter((row) => row.wearAbsoluteDepthModel != null);
  return {
    guide,
    depthRatios: Object.fromEntries(depthRows.map((row) => [row.kind, row.depthRatio])) as GeminiGuideDepthRatioOverrides,
    directWearDepthRatios: Object.fromEntries(
      directWearDepthRows.map((row) => [row.kind, row.wearDepthCohort!.medianDepthRatio]),
    ) as GeminiGuideDepthRatioOverrides,
    confidenceByRow: Object.fromEntries(safeRows.map((row) => [row.kind, row.confidence])),
    minimumConfidence: Math.min(...safeRows.map((row) => row.confidence)),
    depthReady: depthRows.length === ROW_ORDER.length,
    directWearDepthReady: directWearDepthRows.length === ROW_ORDER.length,
    absoluteWearDepthReady: absoluteWearDepthRows.length === ROW_ORDER.length,
  };
}
