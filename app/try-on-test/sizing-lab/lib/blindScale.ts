export interface BlindScalePoint {
  x: number;
  y: number;
}

export interface BlindScaleSegment {
  id: string;
  start: BlindScalePoint;
  end: BlindScalePoint;
}

export interface BlindScalePrediction extends BlindScaleSegment {
  pixelSpan: number;
  predictedCm: number;
  averageCmPerPx: number;
  startRelativeDepth: number;
  endRelativeDepth: number;
  relativeDepthFitRmsePct: number;
  planePredictionCm: number;
  planeDepthSpreadPct: number;
  methodDisagreementPct: number;
  confidence: "high" | "medium" | "low";
}

export interface BlindScaleModel {
  version: string;
  modelKey: string;
  imageWidth: number;
  imageHeight: number;
  heightCm: number;
  heightTop: BlindScalePoint;
  heightBottom: BlindScalePoint;
  referenceXPx: number;
  referenceSearchRadiusPx: number;
  referenceCandidateCount: number;
  referenceSampleCount: number;
  referenceFitRmsePct: number;
  focalXPx: number;
  focalYPx: number;
  principalPointXPx: number;
  principalPointYPx: number;
  cameraPitchDeg: number;
  cameraRollDeg: number;
  cameraYawDeg: number;
  applePersonDistanceM: number;
  planeDepthReferenceYPx: number;
  appleGeometryQuality: "pass" | "check" | "reject";
  depthProPredictedFocalPx: number;
  denseFocalXPx: number;
  denseFocalYPx: number;
  densePrincipalPointXPx: number;
  densePrincipalPointYPx: number;
  absoluteScaleSource: "known-height-yellow-line";
  cameraSource: string;
  relativeDepthSource: string;
  heightNormalization: number;
  denseHeightNormalization: number;
  rawReferenceHeightM: number;
  rawDenseReferenceHeightM: number;
  heightClosureCm: number;
  fieldDistanceAtMidpointM: number;
  denseDistanceAtMidpointM: number;
  primaryFieldSource: string;
  appleDistanceDeltaPct: number | null;
  quality: "pass" | "check" | "reject";
}

export interface BlindScaleApiResult {
  sourceImageUrl: string;
  geometryKey: string;
  depthCacheKey: string;
  model: BlindScaleModel;
  segments: BlindScalePrediction[];
  modelCacheHit: boolean;
  depthCacheHit: boolean;
  elapsedMs: number;
}

export interface HiddenTapeScaleTest extends BlindScalePrediction {
  startTapeValue: number;
  endTapeValue: number;
  tapeUnit: "cm" | "in";
  expectedCm: number;
  errorCm: number;
  errorPct: number;
}
