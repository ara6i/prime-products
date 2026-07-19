export type AppleFusedBodyRowName = "waist" | "trouserWaist" | "hips";

export interface AppleFusedBodyScaleRow {
  name: AppleFusedBodyRowName;
  y: number;
  leftX: number;
  rightX: number;
  pixelSpan: number;
  rawPlaneDepthM: number;
  correctedPlaneDepthM: number;
  leftEdgeDepthM: number;
  rightEdgeDepthM: number;
  correctedLeftEdgeDepthM: number;
  correctedRightEdgeDepthM: number;
  rawWidthCm: number;
  predictedWidthCm: number;
  cmPerPx: number;
  depthSpreadPct: number;
  edgeDepthAsymmetryPct: number;
  bodyMaskCoveragePct: number;
  sampleCount: number;
  edgeBandPx: number;
  confidence: "high" | "medium" | "low";
  valid: boolean;
}

export interface AppleFusedBodyScaleModel {
  version: string;
  imageWidth: number;
  imageHeight: number;
  depthProFocalPx: number;
  knownHeightCm: number;
  absoluteScaleSource: string;
  relativeDepthSource: string;
  bodySupportSource: string;
  endpointSource: string;
  qualityRules: {
    minimumEdgeSamples: number;
    minimumMaskCoveragePct: number;
    maximumEdgeSpreadPct: number;
    maximumEdgeDepthAsymmetryPct: number;
  };
  excludedInputs: string[];
  depthProTorsoDistanceM: number;
  appleTorsoDistanceM: number;
  depthProScaleFactor: number;
}

export interface AppleFusedBodyScaleApiResult {
  cacheKey: string;
  model: AppleFusedBodyScaleModel;
  rows: AppleFusedBodyScaleRow[];
  elapsedMs: number;
}
