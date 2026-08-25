export const TEACHER_ROW_IDS = ["neck", "chest", "underbust", "waist", "hips"] as const;

export type TeacherRowId = (typeof TEACHER_ROW_IDS)[number];

export type TeacherCertificationStatus = "certified" | "core-ready" | "review";
export type TeacherRowState = "certified" | "partial-geometry" | "rejected-geometry" | "measurement-only" | "not-applicable";
export type TeacherRatioState = "eligible" | "masked" | "not-applicable";
export type TeacherRatioBasis = "front-width" | "tape-number";

export interface TeacherProofSelection {
  schemaVersion: number;
  purpose: string;
  seed: number;
  count: number;
  populationCount: number;
  population: string;
  heldOutRolesSelected: number;
  geometryUsedForSelection: boolean;
  tapeUsedForSelection: boolean;
  modelPredictionUsedForSelection: boolean;
  v9ArtifactUsed: boolean;
  selectedScanIds: string[];
}

export interface TeacherProofPoint {
  x: number;
  y: number;
}

export interface TeacherProofRow {
  id: TeacherRowId;
  label: string;
  state: TeacherRowState;
  applicable: boolean;
  measurementAvailable: boolean;
  available: boolean;
  accepted: boolean;
  geometryEligible: boolean;
  tapeEligible: boolean;
  ratioEligible: boolean;
  trainingMask: {
    edge: boolean;
    depth: boolean;
    shape: boolean;
    tape: boolean;
    ratio: boolean;
  };
  certifiedSection: boolean;
  rawLoopClosed: boolean;
  reconstructed: boolean;
  yNorm: number | null;
  leftXNorm: number | null;
  rightXNorm: number | null;
  sliceHeightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  depthWidthRatio: number | null;
  rawPerimeterCm: number | null;
  walkedPerimeterCm: number | null;
  tapeCm: number | null;
  tapeDeltaCm: number | null;
  tapeDeltaPct: number | null;
  closureGapCm: number | null;
  contour: Array<readonly [number, number]>;
  frontPath: Array<readonly [number, number]>;
  worldPathMeters: Array<readonly [number, number, number]>;
  worldPathSegmentsMeters: Array<Array<readonly [number, number, number]>>;
  worldCenterMeters: readonly [number, number, number] | null;
  surfacePathNonplanar: boolean;
  surfaceAttachment: {
    testedPoints: number;
    medianDistanceMm: number | null;
    p95DistanceMm: number | null;
    maximumDistanceMm: number | null;
    p95AllowedMm: number | null;
    maximumAllowedMm: number | null;
    certified: boolean;
  };
  nominalSliceHeightCm: number | null;
  sliceRobustnessOffsetCm: number | null;
  planeProtocol: string;
  tapeProtocol: string;
  geometrySource: string;
  depthSource: string;
  tapeSource: string;
  rejectionReasons: string[];
  qualityFlags: string[];
}

export interface TeacherProofRatio {
  id: string;
  label: string;
  basis: TeacherRatioBasis;
  state: TeacherRatioState;
  value: number | null;
  numeratorLabel: string;
  numeratorCm: number | null;
  denominatorLabel: string;
  denominatorCm: number | null;
  runtimeContract: string;
  reason: string | null;
}

export interface TeacherProofPerson {
  scanId: string;
  subjectId: string;
  gender: string;
  region: string;
  role: string;
  pose: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  trainingPoseValid: boolean;
  renderer: string;
  pipelineId: string;
  imageKey: string;
  source: {
    mesh: string;
    landmarks: string;
    demographics: string;
    height: string;
    weight: string;
  };
  shoulder: {
    breadthCm: number | null;
    frontPoints: TeacherProofPoint[];
  };
  rows: TeacherProofRow[];
  ratios: TeacherProofRatio[];
  acceptedRows: number;
  applicableRows: number;
  rejectedRows: number;
  partialRows: number;
  measurementOnlyRows: number;
  notApplicableRows: number;
  eligibleRatios: number;
  applicableRatios: number;
  coreReady: boolean;
  status: TeacherCertificationStatus;
}

export interface TeacherBlenderMetadata {
  scanId: string;
  heightCm: number;
  weightKg: number;
  source: string;
  truthBoundary: string;
  generator: {
    application: string;
    version: string;
    headless: boolean;
    pythonApi: boolean;
  };
  geometry: {
    originalFaces: number;
    browserFaces: number;
    browserVertices: number;
    uniformScaleToRecordedStature: number;
  };
  renderSchemaVersion: number;
  cameraCorrectionTruth?: {
    input: string;
    target: string;
    operation: string;
  };
  cameraCards: Array<{
    id: string;
    file: string;
    yawDeg: number;
    pitchDeg: number;
    rollDeg: number;
    lensMm: number;
    projection: string;
    knownTransform: boolean;
  }>;
}

export interface TeacherBlenderResponse {
  ok?: boolean;
  cached?: boolean;
  error?: string;
  metadata?: TeacherBlenderMetadata;
  artifacts?: {
    glbUrl: string;
    pngUrl: string;
    blendUrl: string;
    cameraCards: Record<string, string>;
  };
}
