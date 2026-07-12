/**
 * AI Sizing Lab types — kept in one file so the UI components, hooks,
 * and pure-function lib all share a single source of truth.
 */

export type Gender = "male" | "female";
export type UnitSystem = "metric" | "imperial";
export type BraRegion = "US" | "UK" | "AU" | "EU" | "FR" | "IT" | "JP" | "KR";
export type MeasurementMaskMode = "raw" | "ignore-arms";
export type MeasurementMaskSource = "pose" | "segmenter-multiclass";

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
  /** Direct bust/chest circumference when known from the dataset or manual input. */
  bustCm?: number | null;
  /** Display unit only — internal values stay cm/kg. */
  unitSystem: UnitSystem;
  /** SDK-style bra size, only used when gender === "female". */
  braSize?: BraSize | null;
  /** Cup-only label when a full bra band is not known. */
  cup?: string | null;
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
  maskSource?: MeasurementMaskSource;
  maskLabels?: string[];
}

export interface MaskHeightScaleAudit {
  cmPerPx: number;
  heightCm: number;
  topYNorm: number;
  bottomYNorm: number;
  leftXNorm: number;
  rightXNorm: number;
  centerXNorm: number;
  bodySpanPx: number;
  threshold: number;
  imageWidth: number;
  imageHeight: number;
}

export interface WaistInputs {
  metrics: MetricsInput;
  pose: PoseResult;
  imageWidth: number;
  imageHeight: number;
}

export interface MeasurementDebugRow {
  id: string;
  label: string;
  yNorm: number;
  leftXNorm?: number;
  rightXNorm?: number;
  widthPx?: number;
  widthCm?: number;
  color: string;
  dashed?: boolean;
  selected?: boolean;
}

/** Step-by-step breakdown of the waist computation so the UI can show
 *  exactly which numbers feed into the final answer. */
export interface WaistTrace {
  /** Inputs */
  heightCm: number;
  weightKg: number;
  bmi: number;
  gender: Gender;
  maskMode: MeasurementMaskMode;

  /** Scale */
  scaleSource?: "mask-height" | "pose-landmarks";
  frontHeightScaleAudit?: MaskHeightScaleAudit;
  noseToAnkleNormY: number;
  cmPerPx: number;
  sideScaleSource?: "mask-height" | "pose-landmarks";
  sideHeightScaleAudit?: MaskHeightScaleAudit;
  sideNoseToAnkleNormY?: number;
  sideCmPerPx?: number;
  sideImageWidth?: number;
  sideImageHeight?: number;

  /** Hip landmark */
  hipLeftPx: { x: number; y: number };
  hipRightPx: { x: number; y: number };
  hipBoneCm: number;

  /** Mask-derived width at hip Y (real visible silhouette). */
  hipMaskWidthPx: number;
  hipMaskWidthCm: number;

  /** Z-depth from BlazePose */
  shoulderZ: number;
  hipZ: number;
  zDepthDelta: number;
  zDepthCm: number;

  /** Natural waist computation: narrowest central torso row from the mask. */
  naturalWaistMaskWidthPx: number;
  naturalWaistMaskWidthCm: number;
  naturalWaistDepthRatio: number;
  naturalWaistDepthCm: number;
  naturalWaistCm: number;
  naturalWaistIn: number;
  naturalWaistDepthSource: "side-mask" | "front-estimate";
  sideNaturalWaistDepthPx: number;
  sideNaturalWaistDepthCm: number;
  sideNaturalWaistRawDepthRatio?: number;
  sideNaturalWaistCorrectedDepthRatio?: number;
  sideNaturalWaistProjectionLeakRatio?: number;
  sideNaturalWaistCorrectedDepthCm?: number;
  sideNaturalWaistYNorm?: number;
  sideNaturalWaistLeftXNorm?: number;
  sideNaturalWaistRightXNorm?: number;

  /** Trouser-waist computation: lower row below natural waist. */
  trouserWaistMaskWidthPx: number;
  trouserWaistMaskWidthCm: number;
  trouserWaistBreadthCm: number;
  depthRatio: number;
  trouserWaistDepthCm: number;
  trouserWaistCm: number;
  trouserWaistDepthSource: "side-mask" | "front-estimate";
  sideTrouserWaistDepthPx: number;
  sideTrouserWaistDepthCm: number;
  sideTrouserWaistRawDepthRatio?: number;
  sideTrouserWaistCorrectedDepthRatio?: number;
  sideTrouserWaistProjectionLeakRatio?: number;
  sideTrouserWaistCorrectedDepthCm?: number;
  sideTrouserWaistYNorm?: number;
  sideTrouserWaistLeftXNorm?: number;
  sideTrouserWaistRightXNorm?: number;

  /** Direct weight lever */
  expectedWeightKg: number;
  weightDeltaKg: number;
  directWeightBonusCm: number;

  /** Final */
  finalNaturalWaistCm: number;
  finalNaturalWaistIn: number;
  finalTrouserWaistCm: number;
  finalTrouserWaistIn: number;

  /** Mask scan diagnostics. */
  maskThreshold: number;
  torsoScanStartYNorm?: number;
  torsoScanEndYNorm?: number;

  /** Visualization: where the scan actually measured. All in normalized 0..1. */
  naturalWaistYNorm?: number;
  naturalWaistLeftXNorm?: number;
  naturalWaistRightXNorm?: number;
  trouserWaistYNorm?: number;
  trouserWaistLeftXNorm?: number;
  trouserWaistRightXNorm?: number;
  narrowestYNorm?: number;
  narrowestLeftXNorm?: number;
  narrowestRightXNorm?: number;
  /** Full row-by-row width profile, for showing a chart later. */
  scanProfile?: Array<{ y: number; widthCm: number }>;
}
