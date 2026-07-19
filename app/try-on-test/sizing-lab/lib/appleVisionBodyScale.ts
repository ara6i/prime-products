export type AppleVisionBodyRowName = "waist" | "trouserWaist" | "hips";

export interface AppleVisionSkeletonJoint {
  name: string;
  xPx: number;
  yPx: number;
  xM: number;
  yM: number;
  zM: number;
}

export interface AppleVisionBodyScaleRow {
  name: AppleVisionBodyRowName;
  y: number;
  leftX: number;
  rightX: number;
  pixelSpan: number;
  bodyDepthM: number;
  cmPerPx: number;
  frontPlaneWidthCm: number;
}

export interface AppleVisionBodyScaleResult {
  sourceImageUrl: string;
  geometryKey: string;
  model: string;
  cacheKey: string;
  cacheHit: boolean;
  elapsedMs: number;
  heightSource: "reference-rescaled" | "measured-rescaled";
  referenceBodyHeightM: number;
  inputHeightCm: number;
  heightScaleFactor: number;
  jointCount: number;
  estimatedFocalXPx: number;
  estimatedFocalYPx: number;
  principalPointXPx: number;
  principalPointYPx: number;
  reprojectionRmseXPx: number;
  reprojectionRmseYPx: number;
  focalMismatchPct: number;
  normalizedRmsePct: number;
  geometryQuality: "pass" | "check" | "reject";
  bodyDistanceM: number;
  bodyReferenceXPx: number;
  bodyReferenceYPx: number;
  estimatedCameraPitchDeg: number;
  estimatedCameraRollDeg: number;
  estimatedCameraYawDeg: number;
  joints: AppleVisionSkeletonJoint[];
  rows: AppleVisionBodyScaleRow[];
}
