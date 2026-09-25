import type { AIAD_FRAMING_REVISION, AiadMeasure } from "./aiadPreprocessing";

export interface AiadBenchmarkPerson {
  scanId: string;
  subjectId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  imageUrl: string;
}
export interface AiadBenchmarkRow extends AiadBenchmarkPerson {
  ok: boolean;
  error?: string;
  predicted: Partial<Record<AiadMeasure, number | null>>;
  sigma?: Partial<Record<AiadMeasure, number | null>>;
  actuals: Partial<Record<AiadMeasure, number | null>>;
  inferenceMs?: number;
}
export interface AiadBenchmarkMetric {
  count: number;
  maeCm: number | null;
  medianCm: number | null;
  p90Cm: number | null;
  p95Cm: number | null;
  worstCm: number | null;
  withinHalfInchPct: number | null;
  withinOneInchPct: number | null;
  catastrophicAbove5Cm: number;
}
export interface AiadConfidenceBucket {
  id: "highest-50" | "next-30" | "lowest-20";
  label: string;
  count: number;
  sharePct: number;
  meanSigmaCm: number | null;
  maeCm: number | null;
  medianCm: number | null;
  p90Cm: number | null;
  p95Cm: number | null;
  withinHalfInchPct: number | null;
  withinOneInchPct: number | null;
  catastrophicAbove5Cm: number;
  bmiMix: {
    under25: { count: number; pct: number | null };
    from25To30: { count: number; pct: number | null };
    thirtyPlus: { count: number; pct: number | null };
  };
}
export interface AiadWaistConfidenceEvaluation {
  status: "clean-render-proxy";
  cohort: "WEAR 448 clean front renders";
  requestedCohort: "BodyM 487 real photos";
  requestedCohortAvailable: false;
  rankingSignal: "Aiad waist sigma ascending";
  scoredCount: number;
  buckets: AiadConfidenceBucket[];
  limitation: string;
}
export interface AiadBenchmarkReport {
  schema: "aiad-render-benchmark-v1";
  modelSha256: string;
  preprocessing: "threshold127-largest8-fill4-close5-aiad-framing" | `threshold127-largest8-fill4-close5-${typeof AIAD_FRAMING_REVISION}`;
  createdAt: string;
  personCount: 448;
  inputSource: "existing-WEAR-front-50-render";
  labelSource: "recorded-WEAR-tape-only";
  completed: number;
  failures: number;
  metrics: Record<AiadMeasure, AiadBenchmarkMetric>;
  waistConfidence?: AiadWaistConfidenceEvaluation | null;
  rows: AiadBenchmarkRow[];
}
