import type { Gender } from "../sizing-lab/types";

export type WearV6RowKind = "neck" | "chest" | "underbust" | "waist" | "hips";
export type WearV6WidthConfidence = "high" | "medium" | "low";
export type WearV6WidthMethod = "apple-vision" | "apple-depth";
export type WearV6PoseAnchorName = "leftShoulder" | "rightShoulder" | "leftHip" | "rightHip";

export interface WearV6Point {
  x: number;
  y: number;
}

export interface WearV6Line {
  leftX: number;
  rightX: number;
  y: number;
}

export interface WearV6CrossSection {
  kind: WearV6RowKind;
  label: string;
  source: "wear-v6-rgb-cross-section";
  points: Array<{ breadthNorm: number; depthNorm: number }>;
  syntheticMeanMaeNormalized: number | null;
}

export interface WearV6Row {
  kind: WearV6RowKind;
  label: string;
  color: string;
  edgeSource:
    | "wear-v6r3-pose-relative"
    | "wear-v6r3-pose-relative-rgb-snap"
    | "wear-v6r4-pose-relative"
    | "wear-v6r4-pose-relative-rgb-snap"
    | "wear-v6r5-apple-teacher-pose-relative"
    | "wear-v6r5-apple-teacher-pose-relative-rgb-snap"
    | "wear-v7-rgb-row-head"
    | "wear-heldout-exact-mesh-projection";
  targetSource: string;
  canonical: { left: WearV6Point; right: WearV6Point };
  photo: { left: WearV6Point; right: WearV6Point };
  syntheticEdgeMae: {
    yNorm: number | null;
    leftXNorm: number | null;
    rightXNorm: number | null;
  };
}

export interface WearV6Measurement {
  kind: WearV6RowKind;
  label: string;
  valueCm: number;
  rawMeshDepthCm: number | null;
  appleCorrectedWidthCm: number;
  widthSource: WearV6WidthMethod | "manual-tape" | "manual-width" | "wear-v7-direct";
  confidence: WearV6WidthConfidence;
  syntheticMaeCm: number | null;
  syntheticTestCount: number | null;
  formulaUsed: false;
}

export interface WearV6HeldoutGeometry {
  frontWidthCm: number | null;
  depthCm: number | null;
  contour32Normalized: Array<{ breadthNorm: number; depthNorm: number }>;
  tapeCm: number | null;
  geometryPerimeterCm: number | null;
}

export interface WearV6Segment {
  kind: string;
  label: string;
  canonical: WearV6Point[];
  photo: WearV6Point[];
}

export interface WearV6Landmark {
  name: string;
  canonical: WearV6Point;
  photo: WearV6Point;
}

export interface WearV6Prediction {
  ok: true;
  model: {
    version: string;
    trainingPose: string;
    runtimeMaskRequired: false;
    trainingMaskUse: string;
    poseInputMethod: string;
    coreEdgeMethod: string;
    coreMeasurementMethod: string;
    circumferenceMethod: string;
    shapeMethod: string;
    formulaUsed: false;
    syntheticCandidatePassed: boolean;
    privateDiagnosticOnly?: boolean;
    releaseAuthorized?: false;
    publishAuthorized?: false;
    sdkReady: boolean;
    split?: { train: number; validation: number; test: number };
    importantLimit: string;
  };
  inputContract: {
    usedByRgbModel: string[];
    usedByMeasurementHead: string[];
    usedByProductProfile: string[];
    neverUsed: string[];
  };
  profile: {
    heightCm: number;
    weightKg: number;
    bmi: number;
    gender: Gender;
    reportedChestCm: number | null;
  };
  preprocessing: {
    sourceImageSize: [number, number];
    modelImageSize: [number, number];
    crop: { left: number; top: number; width: number; height: number };
    cropSource: string;
    poseAnchorSource: string;
    poseAnchorsCanonical: Partial<Record<WearV6PoseAnchorName, WearV6Point>>;
    rowGeometryAccepted?: Partial<Record<WearV6RowKind, WearV6Line>>;
    poseGeometryGuard: Array<{
      kind: WearV6RowKind;
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
    }>;
    rgbEdgeSnap: Array<{
      kind: WearV6RowKind;
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
    }>;
    warnings: string[];
    quality: "good" | "review";
  };
  calibration: {
    status:
      | "camera-widths-applied"
      | "mesh-front-widths-applied"
      | "wear-row-geometry-applied"
      | "wear-rgb-predicted"
      | "rows-only-awaiting-widths";
    acceptedWidthsCm: Partial<Record<WearV6RowKind, number>>;
  };
  heldoutEvaluation?: {
    scanId: string;
    subjectId: string;
    role: "test";
    includedInTraining: false;
    onnxMeasurementsOnly: true;
    displayRowsSource: "model-prediction-and-exact-heldout-wear-mesh-projection";
    appleVisionUsed: false;
    depthProUsed: false;
    rgbEdgeSnapUsed: false;
    geometryGuardsUsed: false;
    inputs: string[];
    actuals: Partial<Record<WearV6RowKind, number | null>>;
    predictedRows: WearV6Row[];
    realRows: WearV6Row[];
    realGeometry: Partial<Record<WearV6RowKind, WearV6HeldoutGeometry>>;
  } | null;
  rows: WearV6Row[];
  crossSections: WearV6CrossSection[];
  measurements: WearV6Measurement[];
  segments: WearV6Segment[];
  landmarks: WearV6Landmark[];
  allPredictions: Array<{ key: string; value: number; unit: "cm" | "normalized" }>;
  timing: { inferenceMs: number; totalMs: number };
}

export interface WearV6ModelStatus {
  ok: boolean;
  training?: boolean;
  modelVersion?: string;
  targetCount?: number;
  edgeTargetCount?: number;
  measurementTargetCount?: number;
  runtimeMaskRequired?: boolean;
  poseAnchorsRequired?: boolean;
  circumferenceMethod?: string;
  shapeMethod?: string;
  syntheticCandidatePassed?: boolean;
  privateDiagnosticOnly?: boolean;
  inferenceEnabled?: boolean;
  sdkReady?: boolean;
  split?: { train: number; validation: number; test: number };
  importantLimit?: string;
  failures?: string[];
  trainingState?: string;
  trainingPercent?: number;
  trainingStageLabel?: string;
  trainingDetail?: string;
  error?: string;
}

export interface WearV6AppleRow {
  name: WearV6RowKind;
  y: number;
  leftX: number;
  rightX: number;
  pixelSpan: number;
  bodyDepthM: number;
  cmPerPx: number;
  frontPlaneWidthCm: number;
}

export interface WearV6AppleResult {
  cacheKey: string;
  cacheHit: boolean;
  geometryQuality: "pass" | "check" | "reject";
  focalMismatchPct: number;
  normalizedRmsePct: number;
  estimatedFocalXPx: number;
  estimatedFocalYPx: number;
  principalPointXPx: number;
  principalPointYPx: number;
  elapsedMs: number;
  estimatedCameraPitchDeg?: number;
  estimatedCameraRollDeg?: number;
  estimatedCameraYawDeg?: number;
  joints: Array<{
    name: string;
    xPx: number;
    yPx: number;
    xM: number;
    yM: number;
    zM: number;
  }>;
  rows: WearV6AppleRow[];
}

export type WearV6MetaState = "idle" | "loading" | "ready" | "error" | "unavailable";

export interface WearV6MetaStatus {
  state: WearV6MetaState;
  available: boolean;
  detail: string;
  elapsedMs: number | null;
  cameraIntrinsicsSource: "apple-vision" | "meta-default" | null;
}
