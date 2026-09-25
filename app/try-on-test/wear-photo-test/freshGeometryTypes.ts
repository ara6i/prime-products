import type { AiadLevel, AiadRowEndpoints } from "./aiadPreprocessing";

export interface FreshQualityGates {
  [key: string]: unknown;
  rows?: Partial<Record<"waist" | "hips", boolean>>;
  validationReadyFor448Benchmark?: boolean;
}

export interface FreshGeometryStatus {
  ok: boolean;
  modelVersion?: string;
  modelSha256?: string;
  targetCount?: number;
  bestEpoch?: number;
  bestValidationLoss?: number;
  train?: { subjects: number; records: number };
  validation?: { subjects: number; records: number };
  qualityGates?: FreshQualityGates;
  syntheticWearValidated?: boolean;
  realPhotoValidated?: boolean;
  sdkReady?: boolean;
  sealedTestSubjectsUsed?: number;
  importantLimit?: string;
  error?: string;
}

export interface FreshGeometryRow {
  kind: "neck" | "chest" | "underbust" | "waist" | "hips";
  label: string;
  color: string;
  yNorm: number | null;
  leftXNorm: number | null;
  rightXNorm: number | null;
  line: {
    canonical: {
      left: { x: number; y: number };
      right: { x: number; y: number };
    };
    photo: {
      left: { x: number; y: number };
      right: { x: number; y: number };
    };
  } | null;
  widthCm: number | null;
  depthCm: number | null;
  depthWidthRatio: number | null;
  tapeCm: number | null;
  shape: Array<{ x: number; depth: number }>;
  syntheticValidation: {
    yPixelMaeAt256?: number;
    edgePixelMaeAt192?: number;
    widthCmMae?: number;
    depthCmMae?: number;
    tapeCmMae?: number;
    tapeP95Cm?: number;
    tapeWorstCm?: number;
    shapeRSquared?: number;
  } | null;
}

export type FreshGeometryLineOverride = {
  leftX: number;
  rightX: number;
  y: number;
};

/** Aiad's six levels are kept separate from the legacy five-row model schema. */
export type AiadGeometryLevel = Pick<FreshGeometryRow,
  "label" | "color" | "line" | "widthCm" | "depthCm" | "depthWidthRatio" | "tapeCm"
> & { kind: AiadLevel; endpoints: AiadRowEndpoints | null };

export type FreshGeometryLineOverrideMap = Partial<Record<
  FreshGeometryRow["kind"],
  FreshGeometryLineOverride
>>;

export interface FreshCameraFusionRow {
  kind: FreshGeometryRow["kind"];
  rawWidthCm: number | null;
  appleVisionWidthCm: number | null;
  depthProWidthCm: number | null;
  fusedWidthCm: number | null;
  rawDepthCm: number | null;
  fusedDepthCm: number | null;
  learnedDepthWidthRatio: number | null;
  directTapeCm: number | null;
  rawGeometryCircumferenceCm: number | null;
  cameraGeometryCircumferenceCm: number | null;
  widthSource: "apple-depth" | "apple-vision" | "fresh-onnx";
  confidence: "high" | "medium" | "low";
  widthChangePct: number | null;
}

export interface FreshCameraFusion {
  state: "applied" | "partial" | "failed";
  method: "apple-vision-depth-pro-post-onnx-v1";
  appleVision: {
    geometryQuality: "pass" | "check" | "reject" | null;
    focalMismatchPct: number | null;
    estimatedCameraPitchDeg: number | null;
    estimatedCameraRollDeg: number | null;
    estimatedCameraYawDeg: number | null;
  };
  depthPro: {
    modelVersion: string | null;
    validRows: number;
    totalRows: number;
    scaleFactor: number | null;
  };
  rows: FreshCameraFusionRow[];
  rowPositionSource: "fresh-onnx" | "height-fraction-guide" | "manual";
  manuallyEditedRows: FreshGeometryRow["kind"][];
  warnings: string[];
  tapeHandling: "direct-fresh-head-unchanged";
  importantLimit: string;
}

export interface FreshGeometryPrediction {
  ok: true;
  model: {
    version: string;
    sha256: string;
    targetCount: number;
    bestEpoch: number | null;
    bestValidationLoss: number | null;
    train: { subjects: number; records: number } | null;
    validation: { subjects: number; records: number } | null;
    qualityGates: FreshQualityGates;
    syntheticWearValidated: boolean;
    realPhotoValidated: boolean;
    sealedTestSubjectsUsed: number;
    sdkReady: boolean;
    importantLimit: string;
  };
  inputContract: {
    usedByOnnx: string[];
    usedBeforeOnnx: string[];
    notUsedByOnnx: string[];
    cameraHandling: string;
  };
  profile: {
    heightCm: number;
    weightKg: number;
    bmi: number;
    gender: "female" | "male";
  };
  preprocessing: {
    rawMaskSize: [number, number];
    canonicalMaskSize: [number, number];
    modelInputSize: [number, number];
    sourceBodyBox: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
    canonicalBodyBox: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
    removedForegroundPixels: number;
    warnings: string[];
    quality: "transfer-test" | "review";
    framingRevision?: string;
  };
  canonicalMaskDataUrl: string;
  rows: FreshGeometryRow[];
  ratios: Array<{ key: string; value: number | null }>;
  camera: Record<string, number | null>;
  cameraFusion?: FreshCameraFusion;
  aiad?: {
    ensembleSize: 4;
    segmentation: "aiad-rembg-photo" | "mediapipe-photo" | "thresholded-WEAR-render";
    lineSource: "height-fraction-guide";
    maskFill: number;
    measurements: Array<{
      kind: "waist" | "hips" | "chest" | "underbust" | "neck" | "thigh";
      valueCm: number | null;
      sigmaCm: number | null;
    }>;
    shoulder: { widthCm: number; depthCm: number };
    /** All six original helper outputs, including shoulder and male under-bust geometry. */
    levels?: AiadGeometryLevel[];
    guideSource?: "deployment/wear_measure/predict.py:row_endpoints";
    shapeCode: number[];
    manuallyEditedRows?: FreshGeometryRow["kind"][];
  };
  timing: { inferenceMs: number; totalMs: number };
}
