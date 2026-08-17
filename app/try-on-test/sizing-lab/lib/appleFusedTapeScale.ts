export interface AppleFusedTapePoint {
  x: number;
  y: number;
}

export interface AppleFusedTapePrediction {
  id: string;
  start: AppleFusedTapePoint;
  end: AppleFusedTapePoint;
  pixelSpan: number;
  predictedCm: number;
  averageCmPerPx: number;
  rayFitResidualCm: number;
  curveStabilityPct: number;
  geometryMode: "rigid-line-fallback" | "piecewise-depth-curve";
  appliedScaleFactor: number;
  followsDetectedTapePath?: boolean;
  confidence: "high" | "medium" | "low";
}

export interface AppleFusedTapeTargetProjection extends AppleFusedTapePrediction {
  targetCm: number;
  projectionErrorCm: number;
  direction: -1 | 1;
  inputPolicy: string;
}

export interface AppleFusedTapePlane {
  visibleTopYPx: number;
  visibleBottomYPx: number;
  visibleSpanPx: number;
  visibleRowCount: number;
  anchorWindowRows: number;
  topAnchor: { xPx: number; yPx: number; depthM: number; sampleCount: number };
  bottomAnchor: { xPx: number; yPx: number; depthM: number; sampleCount: number };
  pathStraightnessRmsPx: number;
  pathMaximumDeviationPx: number;
  geometryMode: "rigid-line-fallback" | "piecewise-depth-curve";
  curveSampleRadiusPx: number;
  curveSmoothingWindowPx: number;
  curveCoarseSmoothingWindowPx: number;
  curveSampleCount: number;
  curveSupportMarginPx: number;
  curveRmsDeviationCm: number;
  curveMaximumDeviationCm: number;
  curveDepthNoiseRmsCm: number;
  curveCoarseDeltaRmsCm: number;
  curveLengthToChordRatio: number;
  quality: "pass" | "check";
  direction: [number, number, number];
}

export interface AppleFusedTapeModel {
  version: string;
  imageWidth: number;
  imageHeight: number;
  depthProFocalPx: number;
  knownHeightCm: number;
  absoluteScaleSource: string;
  relativeDepthSource: string;
  torsoJointNames: string[];
  depthProTorsoDistanceM: number;
  appleTorsoDistanceM: number;
  depthProScaleFactor: number;
  appliedScaleFactor: number;
  tapePlane: AppleFusedTapePlane;
}

export interface AppleFusedTapeApiResult {
  cacheKey: string;
  model: AppleFusedTapeModel;
  segments: AppleFusedTapePrediction[];
  segmentErrors?: Array<{ id: string; error: string }>;
  targetProjections?: AppleFusedTapeTargetProjection[];
  targetErrors?: Array<{ id: string; error: string }>;
  elapsedMs: number;
  visualSource: "manual-color-only" | "ocr-cache";
  pathEvidence: "colour-mask" | "ocr-position-only";
}

export interface AppleFusedTapeTest extends AppleFusedTapePrediction {
  startTapeValue: number;
  endTapeValue: number;
  tapeUnit: "cm" | "in";
  expectedCm: number;
  errorCm: number;
  errorPct: number;
}
