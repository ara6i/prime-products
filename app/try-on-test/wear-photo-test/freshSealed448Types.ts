export type FreshSealedRowName = "neck" | "chest" | "underbust" | "waist" | "hips";

export interface FreshSealedDistribution {
  count: number;
  mae: number | null;
  median: number | null;
  p90: number | null;
  p95: number | null;
  maximum: number | null;
  within1Rate?: number | null;
  within2Rate?: number | null;
  within3Rate?: number | null;
  within5Rate?: number | null;
  within6Rate?: number | null;
}

export interface FreshSealedRowMetrics {
  yPixels: FreshSealedDistribution;
  edgePixels: FreshSealedDistribution;
  widthCm: FreshSealedDistribution;
  depthCm: FreshSealedDistribution;
  depthWidthRatio: FreshSealedDistribution;
  shapeCoordinate: FreshSealedDistribution;
  tapeCm: FreshSealedDistribution;
}

export interface FreshSealedPersonListItem {
  scanId: string;
  subjectId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  meanTapeErrorCm: number | null;
  meanLineErrorPixels: number | null;
  imageUrl: string;
}

export interface FreshSealedSummary {
  ok: true;
  finalTest: true;
  completedAt: string;
  weightsFrozenBeforeLabelsOpened: true;
  usedForTraining: false;
  usedForValidationSelection: false;
  tuningAfterThisResultForbidden: true;
  model: {
    version: string;
    sha256: string;
    targetCount: number;
    bestEpoch: number;
    bestValidationLoss: number;
  };
  cohort: {
    people: number;
    records: number;
    uniquePeople: number;
    role: "test-only";
    views: Record<string, number>;
    women: number;
    men: number;
    indexSha256: string;
  };
  input: {
    source: string;
    preprocessing: string;
    profile: string[];
    labelsHiddenUntilAfterOnnx: boolean;
    canonicalViewsOnly: boolean;
    importantLimit: string;
  };
  timing: {
    totalBatchInferenceMs: number;
    meanInferenceMsPerPerson: number;
    executionProvider: string;
  };
  metrics: {
    rows: Record<FreshSealedRowName, FreshSealedRowMetrics>;
    ratios: Record<string, FreshSealedDistribution>;
    meanRatioMae: number;
    camera: Record<string, FreshSealedDistribution>;
  };
  gates: {
    criticalLineGate: boolean;
    waistHipTapeGate: boolean;
    sealed448Passed: boolean;
    thresholds: Record<string, number>;
  };
  people: FreshSealedPersonListItem[];
}

export interface FreshSealedShapePoint {
  x: number;
  depth: number;
}

export interface FreshSealedPersonRow {
  validGeometry: boolean;
  predicted: {
    yNorm: number;
    leftXNorm: number;
    rightXNorm: number;
    widthCm: number;
    depthCm: number;
    depthWidthRatio: number;
    tapeCm: number;
    shape: FreshSealedShapePoint[];
  };
  actual: {
    yNorm?: number;
    leftXNorm?: number;
    rightXNorm?: number;
    widthCm?: number;
    depthCm?: number;
    depthWidthRatio?: number;
    tapeCm?: number | null;
    shape?: FreshSealedShapePoint[];
  };
  errors: {
    yPixels?: number;
    edgePixels?: number;
    widthCm?: number;
    depthCm?: number;
    depthWidthRatio?: number;
    shapeCoordinate?: number;
    tapeCm?: number;
  };
}

export interface FreshSealedPersonDetail extends FreshSealedPersonListItem {
  foregroundPixels: number;
  rows: Record<FreshSealedRowName, FreshSealedPersonRow>;
  ratios: Record<string, { predicted: number; actual: number | null; error: number | null }>;
  camera: Record<string, { predicted: number; actual: number; error: number }>;
}

export interface FreshSealedPersonResponse {
  ok: true;
  finalTest: true;
  model: FreshSealedSummary["model"];
  person: FreshSealedPersonDetail;
}
