export type V8BenchmarkRowName = "waist" | "hips";

export interface V8BenchmarkDistribution {
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
  rSquared?: number | null;
  betweenPersonVarianceRatio?: number | null;
}

export interface V8BenchmarkRowMetrics {
  yPixels: V8BenchmarkDistribution;
  edgePixels: V8BenchmarkDistribution;
  widthCm: V8BenchmarkDistribution;
  depthCm: V8BenchmarkDistribution;
  depthWidthRatio: V8BenchmarkDistribution;
  shapeCoordinate: V8BenchmarkDistribution;
  tapeCm: V8BenchmarkDistribution;
}

export interface V8BenchmarkShapePoint {
  x: number;
  depth: number;
}

export interface V8BenchmarkPersonRow {
  validGeometry: boolean;
  predicted: {
    yNorm: number;
    leftXNorm: number;
    rightXNorm: number;
    widthCm: number;
    depthCm: number;
    depthWidthRatio: number;
    tapeCm: number;
    shape: V8BenchmarkShapePoint[];
  };
  actual: {
    yNorm: number;
    leftXNorm: number;
    rightXNorm: number;
    widthCm: number;
    depthCm: number;
    depthWidthRatio: number;
    tapeCm: number | null;
    shape: V8BenchmarkShapePoint[];
  };
  errors: {
    yPixels: number;
    leftPixels: number;
    rightPixels: number;
    edgePixels: number;
    widthCm: number;
    depthCm: number;
    depthWidthRatio: number;
    shapeCoordinate: number;
    tapeCm?: number;
  };
}

export interface V8BenchmarkPersonListItem {
  scanId: string;
  subjectId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  meanTapeErrorCm: number | null;
  meanLineErrorPixels: number | null;
  worstTapeErrorCm: number | null;
  imageUrl: string;
}

export interface V8BenchmarkPersonDetail extends V8BenchmarkPersonListItem {
  rows: Record<V8BenchmarkRowName, V8BenchmarkPersonRow>;
}

export interface V8BenchmarkSummary {
  ok: true;
  benchmark: true;
  completedAt: string;
  model: {
    version: string;
    sha256: string;
    bestEpoch: number;
    bestValidationLoss: number;
  };
  cohort: {
    people: 448;
    uniquePeople: 448;
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
    importantLimit: string;
  };
  timing: {
    totalBatchInferenceMs: number;
    meanInferenceMsPerPerson: number;
    executionProvider: string;
  };
  metrics: {
    rows: Record<V8BenchmarkRowName, V8BenchmarkRowMetrics>;
  };
  gates: {
    validationGatePassedBeforeBenchmark: boolean;
    rows: Record<V8BenchmarkRowName, boolean>;
    benchmark448Passed: boolean;
    thresholds: Record<V8BenchmarkRowName, Record<string, number>>;
  };
  provenance: {
    usedForTraining: false;
    usedForValidationSelection: false;
    previousWeightsUsed: false;
    teacherInputsReadOnly: true;
    note: string;
  };
  people: V8BenchmarkPersonListItem[];
}

export interface V8BenchmarkPersonResponse {
  ok: true;
  benchmark: true;
  model: V8BenchmarkSummary["model"];
  person: V8BenchmarkPersonDetail;
}
