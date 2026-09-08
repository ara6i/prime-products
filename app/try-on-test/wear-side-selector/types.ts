import type { SdkWearPart } from "../sizing-lab/sdkWearMatcher";

export type WearRankingMode = "overall" | SdkWearPart;

/** Server-only source truth. Never serialize this object in a ranking response. */
export interface WearSideRow {
  frontWidthCm: number;
  sideDepthCm: number;
  meshPerimeterCm: number | null;
  tapeCalibratedDepthCm: number | null;
  sliceReconstructed: boolean;
  heightFractionFromFeet: number | null;
  tapeCm: number | null;
}

/** Server-only catalog record. Public responses use WearFrontCandidate. */
export interface WearSideCatalogPerson {
  scanId: string;
  subjectId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  role: "train" | "validation" | "test";
  rows: Partial<Record<SdkWearPart, WearSideRow>>;
}

export interface WearArtifactReference {
  scanId: string;
  catalogVersion: string;
  artifactVersion: string;
  availableViews: readonly ("front" | "side")[];
}

export interface WearFrontCandidate {
  scanId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  ring: number;
  heightDifferenceCm: number;
  weightDifferenceKg: number;
  profileDifference: number;
  frontWidthCmByPart: Partial<Record<SdkWearPart, number>>;
  frontDifferenceCmByPart: Partial<Record<SdkWearPart, number>>;
  overallMeanGapCm: number | null;
  overallWorstGapCm: number | null;
  overallRowsCompared: number;
  overallCoverage: string;
  artifact: WearArtifactReference;
}

export interface WearFrontLeaderboard {
  mode: WearRankingMode;
  candidateIds: string[];
}

export interface WearFrontRing {
  ring: number;
  label: string;
  lowerExclusive: number;
  upperInclusive: number;
  candidateCount: number;
  candidates: WearFrontCandidate[];
  leaderboards: Record<WearRankingMode, WearFrontLeaderboard>;
}

export interface WearFrontWinner {
  scanId: string;
  ring: number;
  overallMeanGapCm: number;
  overallWorstGapCm: number;
  overallRowsCompared: number;
}

export interface WearRankingResponse {
  ok: true;
  runId: string;
  catalogVersion: string;
  artifactVersion: string;
  catalog: {
    personCount: number;
    sourceRecordCount: number;
    excludedPersonCount: number;
    exclusions: string[];
  };
  input: {
    scanId: string;
    gender: "female" | "male";
    heightCm: number;
    weightKg: number;
    frontWidthCmByPart: Partial<Record<SdkWearPart, number>>;
    overallRows: SdkWearPart[];
    overallCoverage: string;
    frontArtifact: WearArtifactReference;
  };
  rings: WearFrontRing[];
  globalFrontWinner: WearFrontWinner | null;
  rankingBoundary: string;
}

export interface WearEvaluationRow {
  part: SdkWearPart;
  inputCm: number;
  candidateCm: number;
  signedErrorCm: number;
  absoluteErrorCm: number;
}

export interface WearEvaluationMetric {
  rows: WearEvaluationRow[];
  meanAbsoluteErrorCm: number | null;
  worstRowErrorCm: number | null;
  coverage: string;
}

export interface WearRevealedCandidate {
  scanId: string;
  side: WearEvaluationMetric;
  tape: WearEvaluationMetric;
}

export interface WearRevealResponse {
  ok: true;
  runId: string;
  ring: number;
  mode: WearRankingMode;
  displayedCandidateIds: string[];
  selectedScanId: string;
  globalFrontWinner: WearFrontWinner | null;
  oracleSideWinnerScanId: string | null;
  oracleTapeWinnerScanId: string | null;
  candidates: WearRevealedCandidate[];
  inputSideArtifact: WearArtifactReference;
  validationBoundary: string;
}
