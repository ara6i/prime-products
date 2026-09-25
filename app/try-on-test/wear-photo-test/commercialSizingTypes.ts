export type CommercialSizingModel = "aiad" | "v8";
export type CommercialSizingResult = "Exact" | "Adjacent" | "2+ Sizes Wrong" | "No Recommendation";
export type CommercialSizingConfidence = "High" | "Medium" | "Low" | "N/A";
export type CommercialSizingConclusion = "Unanswered" | "YES" | "CONDITIONALLY" | "NO";

export interface CommercialSizingRangeCm {
  min: number;
  max: number;
  center: number;
}

export interface CommercialSizingDecisionV1 {
  schema: "CommercialSizingDecisionV1";
  decisionId: string;
  model: CommercialSizingModel;
  manifestPersonProductKey: string;
  person: {
    scanId: string;
    subjectId: string;
    gender: "female" | "male";
    heightCm: number;
    weightKg: number;
    bmi: number;
    bmiBand: string;
  };
  product: {
    id: string;
    sourceProductId: string | null;
    title: string;
    category: string;
    groupId: string;
    supplier: string | null;
    brand: string | null;
    imageUrl: string | null;
    rawMaterial: string | null;
    stretchEvidence: string[];
  };
  purchasableSizes: string[];
  chart: {
    sourceUnit: string;
    normalizedUnit: "cm";
    basis: string;
    sourceTitle: string | null;
    chartSha256: string;
    relevantMeasurements: string[];
    orderedSizes: string[];
    valuesBySizeCm: Record<string, Partial<Record<"waist" | "hips", CommercialSizingRangeCm>>>;
  };
  actualTapeCm: Record<"waist" | "hips" | "chest" | "thigh", number | null>;
  predictedTapeCm: Record<"waist" | "hips" | "chest" | "thigh", number | null>;
  signedErrorCm: Record<"waist" | "hips" | "chest" | "thigh", number | null>;
  sigmaCm: Record<"waist" | "hips" | "chest" | "thigh", number | null> | null;
  referenceSize: string;
  predictedSize: string | null;
  referenceSizeIndex: number;
  predictedSizeIndex: number | null;
  chartSteps: number | null;
  result: CommercialSizingResult;
  adjacentGap: { cm: number; measurement: "waist" | "hips"; neighbourSize: string; direction: "smaller" | "larger" } | null;
  nearestBoundary: { distanceCm: number; boundaryCm: number; measurement: "waist" | "hips"; neighbourSize: string; direction: "smaller" | "larger"; predictedTapeCm: number; rangesOverlap: boolean } | null;
  confidence: { label: CommercialSizingConfidence; ratio: number | null; reason: string; sigmaCm: number | null };
  gapErrorRatio: { value: number | null; display: string; infinite: boolean } | null;
  apple: { status: "OFF / not run"; version: null; changedModelTape: false };
  dataQualityFlag: string[];
  keepExchange: { outcome: "Unknown"; keepRateContribution: null };
  notes: string[];
}

export interface CommercialSizingMetric {
  status: "available" | "N/A";
  count: number;
  maeCm: number | null;
  medianAbsoluteErrorCm: number | null;
  p90AbsoluteErrorCm: number | null;
  within1_27CmPct: number | null;
  within2_54CmPct: number | null;
  within4CmPct: number | null;
  worstAbsoluteErrorCm: number | null;
}

export interface CommercialSizingModelSummaryV1 {
  model: CommercialSizingModel;
  denominator: 100;
  outcomes: Record<"exact" | "adjacent" | "withinOneSize" | "severe" | "noRecommendation", { count: number; pct: number | null }>;
  categoryMix: Array<{ category: string; count: number; pct: number | null }>;
  confidence: {
    high: { count: number; coveragePct: number | null; exactPct: number | null; withinOneSizePct: number | null; severeCount: number };
    medium: { count: number; coveragePct: number | null; exactPct: number | null; withinOneSizePct: number | null; severeCount: number };
    low: { count: number; coveragePct: number | null; exactPct: number | null; withinOneSizePct: number | null; severeCount: number };
    seriousMissesCaughtByLowConfidence: number;
  } | { status: "N/A"; reason: string };
  gapBuckets: Array<{ id: string; label: string; count: number; pct: number | null }>;
  boundaryBuckets: Array<{ id: string; label: string; count: number; pct: number | null }>;
  measurementStats: Record<"waist" | "hips" | "chest" | "thigh", CommercialSizingMetric>;
  chartSpacing: Record<"waist" | "hips" | "chest" | "thigh", string>;
}

export interface CommercialSizingReviewV1 {
  conclusion: CommercialSizingConclusion;
  rationale: string;
  updatedAt: string | null;
  reviewer: string | null;
}

export interface CommercialSizingReportV1 {
  schema: "CommercialSizingReportV1";
  reportId: string;
  createdAt: string;
  privateTestLabOnly: true;
  manifest: {
    fileName: string;
    fileSha256: string;
    selectionSha256: string;
    people: Array<{ scanId: string; subjectId: string; gender: "female" | "male"; heightCm: number; weightKg: number; bmi: number; bmiBand: string }>;
    assignments: Array<{ decisionId: string; personScanId: string; groupId: string; category: string; product: { styleRagId: string; title: string }; realTapeReferenceSize: string }>;
  };
  sources: Record<string, unknown> & {
    aiadReport: { sha256: string; modelSha256: string; people: number };
    v8: { version: string; modelSha256: string; executionProvider: "cpu"; previous448ResultReused: false };
    apple: { status: "OFF / not run"; version: null; reason: string };
  };
  scope: { description: string; commercialQuestion: string; correctSizeDefinition: string; purchaseKeepValidation: string };
  warnings: string[];
  summaries: Record<CommercialSizingModel, CommercialSizingModelSummaryV1>;
  decisions: Record<CommercialSizingModel, CommercialSizingDecisionV1[]>;
  review: CommercialSizingReviewV1;
}

export interface CommercialSizingApiResponse {
  ok: boolean;
  report?: CommercialSizingReportV1;
  workbookFileName?: string;
  error?: string;
}
