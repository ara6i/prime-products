export interface FreshGeometryStatus {
  ok: boolean;
  modelVersion?: string;
  modelSha256?: string;
  targetCount?: number;
  bestEpoch?: number;
  bestValidationLoss?: number;
  train?: { subjects: number; records: number };
  validation?: { subjects: number; records: number };
  qualityGates?: Record<string, boolean>;
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
  } | null;
}

export type FreshGeometryLineOverride = {
  leftX: number;
  rightX: number;
  y: number;
};

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
  rowPositionSource: "fresh-onnx" | "manual";
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
    bestEpoch: number;
    bestValidationLoss: number;
    train: { subjects: number; records: number };
    validation: { subjects: number; records: number };
    qualityGates: Record<string, boolean>;
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
  };
  canonicalMaskDataUrl: string;
  rows: FreshGeometryRow[];
  ratios: Array<{ key: string; value: number | null }>;
  camera: Record<string, number | null>;
  cameraFusion?: FreshCameraFusion;
  timing: { inferenceMs: number; totalMs: number };
}
