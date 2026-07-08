import type { MetricsInput, PoseResult } from "../types";

export interface SdkBackendStage {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  detail: string;
}

export interface SdkBackendTrace {
  source: "backend";
  baseUrl: string;
  estimate: {
    estimates?: Record<string, number>;
    unit?: string;
    confidence?: string;
    measurementSource?: string;
    raw: unknown;
  } | null;
	  recommend: {
	    recommendedSize?: string;
	    confidence?: string;
	    unit?: string;
	    estimates?: Record<string, number>;
	    estimatesUnit?: string;
	    reasoning?: string;
	    matchedRowText?: string;
	    matchDetails?: Array<Record<string, unknown>>;
    sections?: Record<string, unknown>;
    raw: unknown;
  } | null;
  requestSummary: {
    fields: string[];
    landmarkCount: number;
    imageWidth: number;
    imageHeight: number;
	    heightCm: number;
	    weightKg: number;
	    sdkHeightIn?: number;
	    sdkWeightLb?: number;
	    gender: MetricsInput["gender"];
	    braSize?: string;
	  };
  stages: SdkBackendStage[];
}

const BODY_LANDMARK_NAMES = [
  "nose",
  "leftEyeInner",
  "leftEye",
  "leftEyeOuter",
  "rightEyeInner",
  "rightEye",
  "rightEyeOuter",
  "leftEar",
  "rightEar",
  "mouthLeft",
  "mouthRight",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftPinky",
  "rightPinky",
  "leftIndex",
  "rightIndex",
  "leftThumb",
  "rightThumb",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
  "leftHeel",
  "rightHeel",
  "leftFootIndex",
  "rightFootIndex",
] as const;

export const SDK_BACKEND_REQUIRED_FIELDS = [
  "waist",
  "hips",
  "chest",
  "bust",
  "shoulderWidth",
  "sleeveLength",
  "inseam",
  "neckCircumference",
  "thighCircumference",
] as const;

export function buildSdkBodyLandmarks(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
): Record<string, { x: number; y: number; z?: number; visibility?: number } | number> {
  const out: Record<string, { x: number; y: number; z?: number; visibility?: number } | number> = {
    imageWidth,
    imageHeight,
  };
  pose.landmarks.forEach((landmark, index) => {
    const name = BODY_LANDMARK_NAMES[index];
    if (!name) return;
    out[name] = {
      x: round(landmark.x, 6),
      y: round(landmark.y, 6),
      z: round(landmark.z, 6),
      visibility: round(landmark.visibility, 4),
    };
  });
  return out;
}

function round(value: number, digits: number): number {
  const multiplier = Math.pow(10, digits);
  return Math.round(value * multiplier) / multiplier;
}
