export type AppleVisionBodyRowName = "waist" | "trouserWaist" | "hips";

export interface AppleVisionSkeletonJoint {
  name: string;
  xPx: number;
  yPx: number;
  xM: number;
  yM: number;
  zM: number;
}

export interface AppleVisionCameraVector {
  x: number;
  y: number;
  z: number;
}

export interface AppleVisionRayPlaneModel {
  estimatedFocalXPx: number;
  estimatedFocalYPx: number;
  principalPointXPx: number;
  principalPointYPx: number;
  bodyOriginCameraM: AppleVisionCameraVector;
  bodyPlaneNormalCamera: AppleVisionCameraVector;
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

export interface AppleVisionBodyScaleResult extends AppleVisionRayPlaneModel {
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
  bodyPlaneRightCamera: AppleVisionCameraVector;
  bodyPlaneUpCamera: AppleVisionCameraVector;
  bodyReferenceXPx: number;
  bodyReferenceYPx: number;
  estimatedCameraPitchDeg: number;
  estimatedCameraRollDeg: number;
  estimatedCameraYawDeg: number;
  joints: AppleVisionSkeletonJoint[];
  rows: AppleVisionBodyScaleRow[];
}

export interface AppleVisionSegmentMeasurement {
  lengthCm: number;
  assumedDepthM: number;
  startDepthM: number;
  endDepthM: number;
  bodyPlaneTiltDeg: number;
  focalXPx: number;
  focalYPx: number;
  pixelSpan: number;
}

/**
 * Measures an arbitrary image segment using only Apple's solved camera model.
 *
 * Each endpoint becomes a camera ray. Both rays intersect the same body plane
 * derived from Apple's camera-relative hip transform, so pitch, roll, yaw, and
 * perspective are applied before the 3D distance is measured. Tape labels, an
 * expected length, Depth Pro, and WEAR data never enter this helper.
 */
export function measureAppleVisionSegmentAtBodyPlane(
  result: AppleVisionBodyScaleResult,
  start: { x: number; y: number },
  end: { x: number; y: number },
): AppleVisionSegmentMeasurement | null {
  return measureAppleVisionSegmentOnPlane(result, start, end);
}

export function measureAppleVisionSegmentOnPlane(
  model: AppleVisionRayPlaneModel,
  start: { x: number; y: number },
  end: { x: number; y: number },
): AppleVisionSegmentMeasurement | null {
  const focalXPx = model.estimatedFocalXPx;
  const focalYPx = model.estimatedFocalYPx;
  if (
    !Number.isFinite(focalXPx)
    || !Number.isFinite(focalYPx)
    || focalXPx <= 0
    || focalYPx <= 0
  ) return null;

  const planeNormal = normalizeVector(model.bodyPlaneNormalCamera);
  const planeOrigin = model.bodyOriginCameraM;
  if (!planeNormal || !isFiniteVector(planeOrigin) || planeOrigin.z <= 0) return null;

  const startRay = imagePointToCameraRay(model, start);
  const endRay = imagePointToCameraRay(model, end);
  const startPoint = intersectCameraRayWithPlane(startRay, planeOrigin, planeNormal);
  const endPoint = intersectCameraRayWithPlane(endRay, planeOrigin, planeNormal);
  if (!startPoint || !endPoint) return null;

  const delta = subtractVectors(endPoint, startPoint);
  const lengthCm = vectorLength(delta) * 100;
  if (!Number.isFinite(lengthCm) || lengthCm <= 0) return null;

  return {
    lengthCm,
    assumedDepthM: (startPoint.z + endPoint.z) / 2,
    startDepthM: startPoint.z,
    endDepthM: endPoint.z,
    bodyPlaneTiltDeg: Math.acos(clamp(Math.abs(planeNormal.z), 0, 1)) * 180 / Math.PI,
    focalXPx,
    focalYPx,
    pixelSpan: Math.hypot(end.x - start.x, end.y - start.y),
  };
}

function imagePointToCameraRay(
  model: AppleVisionRayPlaneModel,
  point: { x: number; y: number },
): AppleVisionCameraVector {
  return {
    x: (point.x - model.principalPointXPx) / model.estimatedFocalXPx,
    y: -(point.y - model.principalPointYPx) / model.estimatedFocalYPx,
    z: 1,
  };
}

function intersectCameraRayWithPlane(
  ray: AppleVisionCameraVector,
  planeOrigin: AppleVisionCameraVector,
  planeNormal: AppleVisionCameraVector,
): AppleVisionCameraVector | null {
  const denominator = dotVectors(planeNormal, ray);
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-6) return null;
  const distanceAlongRay = dotVectors(planeNormal, planeOrigin) / denominator;
  if (!Number.isFinite(distanceAlongRay) || distanceAlongRay <= 0) return null;
  return scaleVector(ray, distanceAlongRay);
}

function normalizeVector(vector: AppleVisionCameraVector): AppleVisionCameraVector | null {
  if (!isFiniteVector(vector)) return null;
  const length = vectorLength(vector);
  return length > 1e-8 ? scaleVector(vector, 1 / length) : null;
}

function isFiniteVector(vector: AppleVisionCameraVector): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function dotVectors(left: AppleVisionCameraVector, right: AppleVisionCameraVector): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function subtractVectors(left: AppleVisionCameraVector, right: AppleVisionCameraVector): AppleVisionCameraVector {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function scaleVector(vector: AppleVisionCameraVector, scale: number): AppleVisionCameraVector {
  return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
}

function vectorLength(vector: AppleVisionCameraVector): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
