import type { MeasurementMaskMode, PoseResult, WaistTrace } from "../types";
import type { HipsTrace } from "./hipsFormula";
import {
  computePoseScale,
  measureMaskWidthAtY,
  torsoFractionFromY,
  yFromTorsoFraction,
} from "./bodyMaskGeometry";
import { ellipseCircumferenceCm } from "./waistFormula";

type CalibrationKind = "naturalWaist" | "trouserWaist" | "hips";

export interface GeminiCalibrationRow {
  kind: CalibrationKind;
  label: string;
  geminiYNorm: number;
  originalYNorm: number;
  geminiWidthCm: number;
  originalCleanWidthCm: number;
  widthDeltaCm: number;
  rawCm: number;
  calibratedCm: number;
  circumferenceDeltaCm: number;
}

export interface GeminiMaskCalibration {
  naturalWaist: GeminiCalibrationRow | null;
  trouserWaist: GeminiCalibrationRow | null;
  hips: GeminiCalibrationRow | null;
  rows: GeminiCalibrationRow[];
}

function round(n: number, d = 1): number {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
}

function mapGeminiYToOriginalY(
  geminiPose: PoseResult,
  geminiImageWidth: number,
  geminiImageHeight: number,
  originalPose: PoseResult,
  originalImageWidth: number,
  originalImageHeight: number,
  heightCm: number,
  geminiYNorm: number,
): number | null {
  const geminiScale = computePoseScale(geminiPose, geminiImageWidth, geminiImageHeight, heightCm);
  const originalScale = computePoseScale(originalPose, originalImageWidth, originalImageHeight, heightCm);
  if (!geminiScale || !originalScale) return null;
  const torsoFraction = torsoFractionFromY(geminiScale, geminiYNorm);
  return yFromTorsoFraction(originalScale, torsoFraction);
}

function measureOriginalCleanWidth(
  originalPose: PoseResult,
  originalImageWidth: number,
  originalImageHeight: number,
  heightCm: number,
  originalYNorm: number,
  maskMode: MeasurementMaskMode,
) {
  const originalScale = computePoseScale(originalPose, originalImageWidth, originalImageHeight, heightCm);
  if (!originalScale) return null;
  return measureMaskWidthAtY(
    originalPose,
    originalImageWidth,
    originalImageHeight,
    originalScale.cmPerPx,
    originalYNorm,
    originalScale.hipCenterXNorm,
    3,
    maskMode === "ignore-arms"
      ? { excludeLimbs: true, segmentMode: "center-walk", exclusionMode: "limb-capsules" }
      : { excludeLimbs: false, segmentMode: "widest", exclusionMode: "none" },
  );
}

function buildRow(args: {
  kind: CalibrationKind;
  label: string;
  geminiPose: PoseResult;
  geminiImageWidth: number;
  geminiImageHeight: number;
  originalPose: PoseResult;
  originalImageWidth: number;
  originalImageHeight: number;
  heightCm: number;
  maskMode: MeasurementMaskMode;
  geminiYNorm?: number;
  geminiWidthCm: number;
  rawCm: number;
  depthRatio: number;
  sideDepthCm?: number;
}): GeminiCalibrationRow | null {
  if (args.geminiYNorm == null || args.geminiWidthCm <= 0 || args.rawCm <= 0) return null;
  const originalYNorm = mapGeminiYToOriginalY(
    args.geminiPose,
    args.geminiImageWidth,
    args.geminiImageHeight,
    args.originalPose,
    args.originalImageWidth,
    args.originalImageHeight,
    args.heightCm,
    args.geminiYNorm,
  );
  if (originalYNorm == null) return null;
  const originalMeasured = measureOriginalCleanWidth(
    args.originalPose,
    args.originalImageWidth,
    args.originalImageHeight,
    args.heightCm,
    originalYNorm,
    args.maskMode,
  );
  if (!originalMeasured || originalMeasured.widthCm <= 0) return null;

  const calibratedBreadthCm = originalMeasured.widthCm;
  const calibratedDepthCm = args.sideDepthCm && args.sideDepthCm > 0
    ? args.sideDepthCm
    : calibratedBreadthCm * args.depthRatio;
  const calibratedCm = ellipseCircumferenceCm(calibratedBreadthCm, calibratedDepthCm);

  return {
    kind: args.kind,
    label: args.label,
    geminiYNorm: round(args.geminiYNorm, 4),
    originalYNorm: round(originalYNorm, 4),
    geminiWidthCm: round(args.geminiWidthCm, 1),
    originalCleanWidthCm: round(originalMeasured.widthCm, 1),
    widthDeltaCm: round(originalMeasured.widthCm - args.geminiWidthCm, 1),
    rawCm: round(args.rawCm, 1),
    calibratedCm: round(calibratedCm, 1),
    circumferenceDeltaCm: round(calibratedCm - args.rawCm, 1),
  };
}

export function calibrateGeminiMaskMeasurements(args: {
  geminiPose: PoseResult;
  geminiImageWidth: number;
  geminiImageHeight: number;
  originalPose: PoseResult;
  originalImageWidth: number;
  originalImageHeight: number;
  heightCm: number;
  maskMode: MeasurementMaskMode;
  waistTrace: WaistTrace | null;
  hipsTrace: HipsTrace | null;
}): GeminiMaskCalibration | null {
  const { waistTrace, hipsTrace } = args;
  if (!waistTrace && !hipsTrace) return null;

  const naturalWaist = waistTrace
    ? buildRow({
        ...args,
        kind: "naturalWaist",
        label: "Natural waist",
        geminiYNorm: waistTrace.naturalWaistYNorm,
        geminiWidthCm: waistTrace.naturalWaistMaskWidthCm,
        rawCm: waistTrace.finalNaturalWaistCm,
        depthRatio: waistTrace.naturalWaistDepthRatio,
        sideDepthCm: waistTrace.naturalWaistDepthSource === "side-mask"
          ? waistTrace.sideNaturalWaistDepthCm
          : undefined,
      })
    : null;

  const trouserWaist = waistTrace
    ? buildRow({
        ...args,
        kind: "trouserWaist",
        label: "Trouser waist",
        geminiYNorm: waistTrace.trouserWaistYNorm,
        geminiWidthCm: waistTrace.trouserWaistMaskWidthCm,
        rawCm: waistTrace.finalTrouserWaistCm,
        depthRatio: waistTrace.depthRatio,
        sideDepthCm: waistTrace.trouserWaistDepthSource === "side-mask"
          ? waistTrace.sideTrouserWaistDepthCm
          : undefined,
      })
    : null;

  const hipDepthRatio = hipsTrace?.hipBreadthCm
    ? hipsTrace.hipDepthCm / hipsTrace.hipBreadthCm
    : 0;
  const hipRow = hipsTrace?.debugRows.find((row) => row.id === "hip-selected");
  const hips = hipsTrace
    ? buildRow({
        ...args,
        kind: "hips",
        label: "Hips",
        geminiYNorm: hipRow?.yNorm,
        geminiWidthCm: hipsTrace.hipMaskWidthCm,
        rawCm: hipsTrace.hipsCm,
        depthRatio: hipDepthRatio || 0.5,
        sideDepthCm: hipsTrace.method === "front-side-mask" ? hipsTrace.sideHipDepthCm : undefined,
      })
    : null;

  const rows = [naturalWaist, trouserWaist, hips].filter((row): row is GeminiCalibrationRow => !!row);
  return rows.length ? { naturalWaist, trouserWaist, hips, rows } : null;
}
