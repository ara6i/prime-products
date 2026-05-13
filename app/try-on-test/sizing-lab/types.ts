/**
 * AI Sizing Lab types — kept in one file so the UI components, hooks,
 * and pure-function lib all share a single source of truth.
 */

export type Gender = "male" | "female";
export type UnitSystem = "metric" | "imperial";
export type BraRegion = "US" | "UK" | "AU" | "EU" | "FR" | "IT" | "JP" | "KR";

export interface LabImageState {
  file: File | null;
  previewUrl: string | null;
  width: number;
  height: number;
}

export interface BraSize {
  region: BraRegion;
  band: number;
  cup: string;
}

export interface MetricsInput {
  heightCm: number;
  weightKg: number;
  gender: Gender;
  /** Display unit only — internal values stay cm/kg. */
  unitSystem: UnitSystem;
  /** SDK-style bra size, only used when gender === "female". */
  braSize?: BraSize | null;
}

/** A single MediaPipe BlazePose landmark in normalized (0..1) image coords. */
export interface PoseLandmark {
  x: number;
  y: number;
  /** Depth relative to hip midpoint, normalized (negative = forward). */
  z: number;
  /** Confidence 0..1. */
  visibility: number;
}

export interface PoseResult {
  /** Indexed by MediaPipe BlazePose landmark id (0..32). */
  landmarks: PoseLandmark[];
  /** Segmentation mask as a 0..255 Uint8 array (255 = body). */
  mask: Uint8ClampedArray | null;
  maskWidth: number;
  maskHeight: number;
}

export interface WaistInputs {
  metrics: MetricsInput;
  pose: PoseResult;
  imageWidth: number;
  imageHeight: number;
}

/** Step-by-step breakdown of the waist computation so the UI can show
 *  exactly which numbers feed into the final answer. */
export interface WaistTrace {
  /** Inputs */
  heightCm: number;
  weightKg: number;
  bmi: number;
  gender: Gender;

  /** Scale */
  noseToAnkleNormY: number;
  cmPerPx: number;

  /** Hip landmark */
  hipLeftPx: { x: number; y: number };
  hipRightPx: { x: number; y: number };
  hipBoneCm: number;

  /** Mask-derived width at hip Y (real outer-flesh silhouette). */
  hipMaskWidthPx: number;
  hipMaskWidthCm: number;

  /** Z-depth from BlazePose */
  shoulderZ: number;
  hipZ: number;
  zDepthDelta: number;
  zDepthCm: number;

  /** Trouser-waist computation */
  trouserWaistBreadthCm: number;
  depthRatio: number;
  trouserWaistDepthCm: number;
  trouserWaistCm: number;

  /** Direct weight lever */
  expectedWeightKg: number;
  weightDeltaKg: number;
  directWeightBonusCm: number;

  /** Final */
  finalTrouserWaistCm: number;
  finalTrouserWaistIn: number;

  /** Visualization: where the scan actually measured. All in normalized 0..1. */
  trouserWaistYNorm?: number;
  trouserWaistLeftXNorm?: number;
  trouserWaistRightXNorm?: number;
  narrowestYNorm?: number;
  narrowestLeftXNorm?: number;
  narrowestRightXNorm?: number;
  /** Full row-by-row width profile, for showing a chart later. */
  scanProfile?: Array<{ y: number; widthCm: number }>;
}
