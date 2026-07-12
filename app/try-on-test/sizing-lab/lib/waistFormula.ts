/**
 * Pure waist computation — landmarks + mask only.
 *
 * This lab intentionally separates natural waist from trouser waist:
 * - natural waist = narrowest central torso mask row
 * - trouser waist = lower row below natural waist, useful for waistband debug
 *
 *  ── No BMI lookup tables.
 *  ── No "bone × 1.45" fallback.
 *  ── No hand-at-hip detector — hand bboxes excluded from the mask scan.
 *  ── No height-fraction guesses — full body span comes from foot landmarks.
 *  ── No weight bonus — the photo carries the body, not your scale.
 */

import type { Gender, MeasurementMaskMode, PoseResult, WaistTrace } from "../types";
import { POSE_IDX } from "./poseDetector";
import {
  applyMaskHeightScaleToPoseScale,
  computeMaskHeightScale,
  computePoseScale,
  measureMaskWidthAtY,
  type MaskWidthMeasurement,
  type PoseScale,
} from "./bodyMaskGeometry";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Depth-to-breadth ratio for the natural waist cross-section, driven by BMI.
 *
 * Front-photo mask gives visible breadth; front-to-back depth is unobservable.
 * Keep this conservative for natural waist. A too-large depth ratio is one of
 * the ways a correct-looking mask width becomes an inflated circumference.
 *
 * Front-only natural waist depth. Natural waist is normally flatter than the
 * lower/trouser waist, so keep this conservative unless the visible waist is
 * broad relative to hip landmarks. Continuous — no BMI cliffs and no target fit.
 */
function naturalWaistDepthRatioFromGeometry(
  bmi: number,
  waistToHipBoneRatio = 1.4,
  waistBandFraction = 0.5,
): number {
  const bmiRoundness = 0.04 * clamp((bmi - 22) / 12, -0.25, 1);
  const verticalRoundness = 0.42 * clamp(waistBandFraction, 0, 1);
  const visibleBreadthShape = 0.07 * clamp(waistToHipBoneRatio - 1.35, 0, 0.45);
  const ratio = 0.47 + bmiRoundness + verticalRoundness + visibleBreadthShape;
  return clamp(ratio, 0.48, 0.78);
}

/**
 * Trouser waist sits lower and is usually rounder than natural waist.
 * This is debug output only; it should not be shown as body waist.
 */
function trouserDepthRatioFromBMI(bmi: number): number {
  const t = (bmi - 18) / (40 - 18);
  const ratio = 0.58 + t * (0.94 - 0.58);
  return Math.max(0.58, Math.min(0.94, ratio));
}

/** Ramanujan's approximation for the perimeter of an ellipse. */
export function ellipseCircumferenceCm(widthCm: number, depthCm: number): number {
  if (!widthCm || !depthCm || widthCm <= 0 || depthCm <= 0) return 0;
  const a = widthCm / 2;
  const b = depthCm / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

type ScanRow = {
  y: number;
  widthCm: number;
  widthPx: number;
  threshold: number;
  leftXNorm: number;
  rightXNorm: number;
};

type SideDepthSignal = {
  rawDepthRatio: number;
  correctedDepthCm: number;
  correctedDepthRatio: number;
  projectionLeakRatio: number;
};

function toScanRow(measured: MaskWidthMeasurement): ScanRow {
  return {
    y: measured.yNorm,
    widthCm: measured.widthCm,
    widthPx: measured.widthPx,
    threshold: measured.threshold,
    leftXNorm: measured.leftXNorm,
    rightXNorm: measured.rightXNorm,
  };
}

const FRONT_NATURAL_BAND = { start: 0.58, end: 0.78 };
const FRONT_TROUSER_BAND = { start: 0.76, end: 0.98 };
function scanTorsoRows(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  scale: PoseScale,
  startFactor: number,
  endFactor: number,
  excludeLimbs = true,
  segmentMode: "center-walk" | "widest" = "center-walk",
  exclusionMode: "hands" | "limb-capsules" | "none" = "hands",
): ScanRow[] {
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return [];
  const torsoSpan = Math.max(0.001, scale.hipYNorm - scale.shoulderYNorm);
  const startYNorm = scale.shoulderYNorm + torsoSpan * startFactor;
  const endYNorm = scale.shoulderYNorm + torsoSpan * endFactor;
  const step = 4 / pose.maskHeight;
  const rows: ScanRow[] = [];
  for (let y = startYNorm; y <= endYNorm; y += step) {
    const measured = measureMaskWidthAtY(
      pose,
      imageWidth,
      imageHeight,
      scale.cmPerPx,
      y,
      scale.hipCenterXNorm,
      2,
      { excludeLimbs, segmentMode, exclusionMode },
    );
    if (measured) rows.push(toScanRow(measured));
  }
  return rows;
}

function maskOptions(maskMode: MeasurementMaskMode): {
  excludeLimbs: boolean;
  segmentMode: "center-walk" | "widest";
  exclusionMode: "limb-capsules" | "none";
} {
  return maskMode === "ignore-arms"
    ? { excludeLimbs: true, segmentMode: "center-walk", exclusionMode: "limb-capsules" }
    : { excludeLimbs: false, segmentMode: "widest", exclusionMode: "none" };
}

function pickNarrowestRow(rows: ScanRow[]): ScanRow | null {
  let minRow: ScanRow | null = null;
  for (const row of rows) {
    if (!minRow || row.widthCm < minRow.widthCm) minRow = row;
  }
  return minRow;
}

function pickNaturalWaistRow(rows: ScanRow[]): ScanRow | null {
  if (rows.length < 5) return pickNarrowestRow(rows);
  const firstY = rows[0]?.y ?? 0;
  const lastY = rows[rows.length - 1]?.y ?? firstY;
  const span = Math.max(0, lastY - firstY);
  if (span <= 0) return pickNarrowestRow(rows);

  const edgeGuard = span * 0.12;
  const interiorRows = rows.filter((row) => (
    row.y >= firstY + edgeGuard &&
    row.y <= lastY - edgeGuard
  ));
  return pickNarrowestRow(interiorRows.length ? interiorRows : rows);
}

function pickLowerWidenedRow(rows: ScanRow[], fromY: number, baseWidthCm: number): ScanRow | null {
  const target = baseWidthCm * 1.06;
  for (const row of rows) {
    if (row.y > fromY && row.widthCm >= target) return row;
  }
  return null;
}

function isPlausibleSideDepth(row: ScanRow | null, frontBreadthCm: number, minRatio: number, maxRatio: number): row is ScanRow {
  if (!row || frontBreadthCm <= 0 || row.widthCm <= 0) return false;
  const ratio = row.widthCm / frontBreadthCm;
  return ratio >= minRatio && ratio <= maxRatio;
}

function sideProjectionLeakRatio(frontScale: PoseScale, sideScale: PoseScale | null): number {
  if (!sideScale) return 0;
  const frontHipSpreadCm = Math.abs(frontScale.hipRightPx.x - frontScale.hipLeftPx.x) * frontScale.cmPerPx;
  const sideHipSpreadCm = Math.abs(sideScale.hipRightPx.x - sideScale.hipLeftPx.x) * sideScale.cmPerPx;
  if (frontHipSpreadCm <= 0 || sideHipSpreadCm <= 0) return 0;
  return clamp(sideHipSpreadCm / frontHipSpreadCm, 0, 0.7);
}

function sideDepthSignal(
  row: ScanRow | null,
  frontBreadthCm: number,
  projectionLeakRatio: number,
  minCorrectedRatio: number,
  maxCorrectedRatio: number,
): SideDepthSignal | null {
  if (!row || frontBreadthCm <= 0 || row.widthCm <= 0) return null;
  const rawDepthRatio = row.widthCm / frontBreadthCm;
  const sideComponent = Math.sqrt(Math.max(0.001, 1 - projectionLeakRatio * projectionLeakRatio));
  const correctedDepthCm = Math.max(0, (row.widthCm - frontBreadthCm * projectionLeakRatio) / sideComponent);
  const correctedDepthRatio = correctedDepthCm / frontBreadthCm;
  if (correctedDepthRatio < minCorrectedRatio || correctedDepthRatio > maxCorrectedRatio) return null;
  return {
    rawDepthRatio,
    correctedDepthCm,
    correctedDepthRatio,
    projectionLeakRatio,
  };
}

function torsoFractionForY(scale: PoseScale, yNorm: number): number {
  const torsoSpan = Math.max(0.001, scale.hipYNorm - scale.shoulderYNorm);
  return clamp((yNorm - scale.shoulderYNorm) / torsoSpan, 0, 1);
}

function sideYFromTorsoFraction(scale: PoseScale, fraction: number): number {
  const torsoSpan = Math.max(0.001, scale.hipYNorm - scale.shoulderYNorm);
  return scale.shoulderYNorm + torsoSpan * clamp(fraction, 0, 1);
}

function measureSideDepthAtTorsoFraction(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  scale: PoseScale,
  torsoFraction: number,
  excludeLimbs: boolean,
  exclusionMode: "hands" | "limb-capsules" | "none",
): ScanRow | null {
  const measured = measureMaskWidthAtY(
    pose,
    imageWidth,
    imageHeight,
    scale.cmPerPx,
    sideYFromTorsoFraction(scale, torsoFraction),
    scale.hipCenterXNorm,
    3,
    { excludeLimbs, segmentMode: "center-walk", exclusionMode },
  );
  return measured ? toScanRow(measured) : null;
}

export function computeTrouserWaist(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
  weightKg: number,
  gender: Gender,
  sidePose: PoseResult | null = null,
  sideImageWidth = 0,
  sideImageHeight = 0,
  maskMode: MeasurementMaskMode = "ignore-arms",
): WaistTrace | null {
  if (!pose.landmarks?.length) return null;
  const lm = pose.landmarks;
  const lShoulder = lm[POSE_IDX.LEFT_SHOULDER];
  const rShoulder = lm[POSE_IDX.RIGHT_SHOULDER];
  if (!lShoulder || !rShoulder) return null;
  const rawFrontScale = computePoseScale(pose, imageWidth, imageHeight, heightCm);
  const frontMaskScale = computeMaskHeightScale(pose, imageWidth, imageHeight, heightCm);
  const frontScale = applyMaskHeightScaleToPoseScale(rawFrontScale, frontMaskScale);
  if (!frontScale) return null;
  const rawSideScale = sidePose && sideImageWidth && sideImageHeight
    ? computePoseScale(sidePose, sideImageWidth, sideImageHeight, heightCm)
    : null;
  const sideMaskScale = sidePose && sideImageWidth && sideImageHeight
    ? computeMaskHeightScale(sidePose, sideImageWidth, sideImageHeight, heightCm)
    : null;
  const sideScale = applyMaskHeightScaleToPoseScale(rawSideScale, sideMaskScale);
  const scanMaskOptions = maskOptions(maskMode);
  const sideScanMaskOptions = maskMode === "ignore-arms"
    ? { excludeLimbs: true, exclusionMode: "hands" as const }
    : { excludeLimbs: false, exclusionMode: "none" as const };

  // ── 4. Scan mask widths from shoulder Y to hip Y.
  // Natural waist and trouser waist use separate anatomical bands. A broad
  // shoulder→hip scan can accidentally pick underbust, arm, or hip rows.
  const torsoSpan = Math.max(0.001, frontScale.hipYNorm - frontScale.shoulderYNorm);
  const torsoScanStartYNorm = frontScale.shoulderYNorm + torsoSpan * FRONT_NATURAL_BAND.start;
  const naturalScanEndYNorm = frontScale.shoulderYNorm + torsoSpan * FRONT_NATURAL_BAND.end;
  const torsoScanEndYNorm = frontScale.shoulderYNorm + torsoSpan * FRONT_TROUSER_BAND.end;

  let maskThreshold = 0;
  let naturalWaistYNorm = frontScale.hipYNorm;
  let naturalWaistWidthCm = 0;
  let naturalWaistWidthPx = 0;
  let naturalWaistLeftXNorm = 0;
  let naturalWaistRightXNorm = 0;
  let trouserYNorm = frontScale.hipYNorm;
  let trouserWidthCm = 0;
  let trouserWidthPx = 0;
  let trouserLeftXNorm = 0;
  let trouserRightXNorm = 0;
  const scanProfile: Array<{ y: number; widthCm: number }> = [];
  const scanRows: ScanRow[] = [];
  const naturalRows: ScanRow[] = [];
  const trouserRows: ScanRow[] = [];

  if (pose.mask && pose.maskWidth > 0 && pose.maskHeight > 0) {
    naturalRows.push(
      ...scanTorsoRows(
        pose,
        imageWidth,
        imageHeight,
        frontScale,
        FRONT_NATURAL_BAND.start,
        FRONT_NATURAL_BAND.end,
        scanMaskOptions.excludeLimbs,
        scanMaskOptions.segmentMode,
        scanMaskOptions.exclusionMode,
      ),
    );
    trouserRows.push(
      ...scanTorsoRows(
        pose,
        imageWidth,
        imageHeight,
        frontScale,
        FRONT_TROUSER_BAND.start,
        FRONT_TROUSER_BAND.end,
        scanMaskOptions.excludeLimbs,
        scanMaskOptions.segmentMode,
        scanMaskOptions.exclusionMode,
      ),
    );
    scanRows.push(...naturalRows, ...trouserRows);

    for (const row of scanRows) {
      scanProfile.push({ y: round(row.y, 3), widthCm: round(row.widthCm, 1) });
    }
    const minRow = pickNaturalWaistRow(naturalRows);
    if (minRow) {
      naturalWaistYNorm = minRow.y;
      naturalWaistWidthCm = minRow.widthCm;
      naturalWaistWidthPx = minRow.widthPx;
      naturalWaistLeftXNorm = minRow.leftXNorm;
      naturalWaistRightXNorm = minRow.rightXNorm;
      maskThreshold = minRow.threshold;
    }
  }

  // ── 5. Trouser-waist row = lower waist/pelvis band.
  // Keep this separate. Do not use it as the natural body waist.
  trouserYNorm = naturalWaistYNorm;
  trouserWidthCm = naturalWaistWidthCm;
  trouserWidthPx = naturalWaistWidthPx;
  trouserLeftXNorm = naturalWaistLeftXNorm;
  trouserRightXNorm = naturalWaistRightXNorm;
  if (naturalWaistWidthCm > 0) {
    const row = pickNarrowestRow(trouserRows) ?? pickLowerWidenedRow(scanRows, naturalWaistYNorm, naturalWaistWidthCm);
    if (row) {
      trouserYNorm = row.y;
      trouserWidthCm = row.widthCm;
      trouserWidthPx = row.widthPx;
      trouserLeftXNorm = row.leftXNorm;
      trouserRightXNorm = row.rightXNorm;
    }
  }

  // ── 6. BMI (informational only — not used in waist math anymore).
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  // ── 7. Z-depth signal (informational).
  const shoulderZ = (lShoulder.z + rShoulder.z) / 2;
  const lHip = lm[POSE_IDX.LEFT_HIP];
  const rHip = lm[POSE_IDX.RIGHT_HIP];
  if (!lHip || !rHip) return null;
  const hipZ = (lHip.z + rHip.z) / 2;
  const zDepthDelta = hipZ - shoulderZ;
  const zDepthCm = Math.abs(zDepthDelta) * imageWidth * frontScale.cmPerPx;

  // ── 8. Waist ellipses. If side photo exists and passes ratio guards, side
  // mask supplies depth; otherwise the lab falls back to front-only estimate.
  const naturalBreadthCm = naturalWaistWidthCm || frontScale.hipBoneCm;
  const projectionLeakRatio = sideProjectionLeakRatio(frontScale, sideScale);
  const rawSideNaturalRow = sidePose && sideScale
    ? measureSideDepthAtTorsoFraction(
        sidePose,
        sideImageWidth,
        sideImageHeight,
        sideScale,
        torsoFractionForY(frontScale, naturalWaistYNorm),
        sideScanMaskOptions.excludeLimbs,
        sideScanMaskOptions.exclusionMode,
      )
    : null;
  const sideNaturalRow = isPlausibleSideDepth(rawSideNaturalRow, naturalBreadthCm, 0.5, 0.9)
    ? rawSideNaturalRow
    : null;
  const sideNaturalSignal = sideDepthSignal(sideNaturalRow, naturalBreadthCm, projectionLeakRatio, 0.46, 0.78);
  const sideNatural = sideNaturalRow
    ? {
        widthPx: sideNaturalRow.widthPx,
        widthCm: sideNaturalRow.widthCm,
        yNorm: sideNaturalRow.y,
        leftXNorm: sideNaturalRow.leftXNorm,
        rightXNorm: sideNaturalRow.rightXNorm,
      }
    : null;
  const naturalWaistBandFraction = (naturalWaistYNorm - torsoScanStartYNorm) /
    Math.max(0.001, naturalScanEndYNorm - torsoScanStartYNorm);
  const naturalEstimatedDepthRatio = naturalWaistDepthRatioFromGeometry(
    bmi,
    frontScale.hipBoneCm > 0 ? naturalBreadthCm / frontScale.hipBoneCm : 1.4,
    naturalWaistBandFraction,
  );
  const naturalDepthCm = sideNaturalSignal?.correctedDepthCm ?? naturalBreadthCm * naturalEstimatedDepthRatio;
  const naturalDepthRatio = naturalBreadthCm > 0 ? naturalDepthCm / naturalBreadthCm : naturalEstimatedDepthRatio;
  const naturalWaistCm = ellipseCircumferenceCm(naturalBreadthCm, naturalDepthCm);
  const naturalWaistIn = naturalWaistCm / 2.54;

  const trouserBreadthCm = trouserWidthCm || naturalBreadthCm;
  const rawSideTrouserRow = sidePose && sideScale
    ? measureSideDepthAtTorsoFraction(
        sidePose,
        sideImageWidth,
        sideImageHeight,
        sideScale,
        torsoFractionForY(frontScale, trouserYNorm),
        sideScanMaskOptions.excludeLimbs,
        sideScanMaskOptions.exclusionMode,
      )
    : null;
  const sideTrouserRow = isPlausibleSideDepth(rawSideTrouserRow, trouserBreadthCm, 0.45, 0.95)
    ? rawSideTrouserRow
    : null;
  const sideTrouserSignal = sideDepthSignal(sideTrouserRow, trouserBreadthCm, projectionLeakRatio, 0.45, 0.9);
  const sideTrouser = sideTrouserRow
    ? {
        widthPx: sideTrouserRow.widthPx,
        widthCm: sideTrouserRow.widthCm,
        yNorm: sideTrouserRow.y,
        leftXNorm: sideTrouserRow.leftXNorm,
        rightXNorm: sideTrouserRow.rightXNorm,
      }
    : null;
  const trouserEstimatedDepthRatio = trouserDepthRatioFromBMI(bmi);
  const trouserDepthCm = sideTrouserSignal?.correctedDepthCm ?? trouserBreadthCm * trouserEstimatedDepthRatio;
  const trouserDepthRatio = trouserBreadthCm > 0 ? trouserDepthCm / trouserBreadthCm : trouserEstimatedDepthRatio;
  const trouserWaistCm = ellipseCircumferenceCm(trouserBreadthCm, trouserDepthCm);
  const trouserWaistIn = trouserWaistCm / 2.54;

  return {
    heightCm,
    weightKg,
    bmi: round(bmi, 2),
    gender,
    maskMode,
    scaleSource: frontMaskScale ? "mask-height" : "pose-landmarks",
    frontHeightScaleAudit: frontMaskScale ? roundMaskHeightScaleAudit(frontMaskScale) : undefined,
    noseToAnkleNormY: round(frontScale.bottomYNorm - frontScale.topYNorm, 4),
    cmPerPx: round(frontScale.cmPerPx, 4),
    sideScaleSource: sideScale ? (sideMaskScale ? "mask-height" : "pose-landmarks") : undefined,
    sideHeightScaleAudit: sideMaskScale ? roundMaskHeightScaleAudit(sideMaskScale) : undefined,
    sideNoseToAnkleNormY: sideScale ? round(sideScale.bottomYNorm - sideScale.topYNorm, 4) : undefined,
    sideCmPerPx: sideScale ? round(sideScale.cmPerPx, 4) : undefined,
    sideImageWidth: sideScale ? sideImageWidth : undefined,
    sideImageHeight: sideScale ? sideImageHeight : undefined,
    hipLeftPx: { x: round(frontScale.hipLeftPx.x, 1), y: round(frontScale.hipLeftPx.y, 1) },
    hipRightPx: { x: round(frontScale.hipRightPx.x, 1), y: round(frontScale.hipRightPx.y, 1) },
    hipBoneCm: round(frontScale.hipBoneCm, 1),
    hipMaskWidthPx: 0,
    hipMaskWidthCm: 0,
    shoulderZ: round(shoulderZ, 4),
    hipZ: round(hipZ, 4),
    zDepthDelta: round(zDepthDelta, 4),
    zDepthCm: round(zDepthCm, 2),
    naturalWaistMaskWidthPx: round(naturalWaistWidthPx, 1),
    naturalWaistMaskWidthCm: round(naturalWaistWidthCm, 1),
    naturalWaistDepthRatio: round(naturalDepthRatio, 3),
    naturalWaistDepthCm: round(naturalDepthCm, 1),
    naturalWaistCm: round(naturalWaistCm, 1),
    naturalWaistIn: round(naturalWaistIn, 1),
    naturalWaistDepthSource: sideNaturalSignal ? "side-mask" : "front-estimate",
    sideNaturalWaistDepthPx: round(sideNatural?.widthPx ?? 0, 1),
    sideNaturalWaistDepthCm: round(sideNatural?.widthCm ?? 0, 1),
    sideNaturalWaistRawDepthRatio: sideNaturalSignal ? round(sideNaturalSignal.rawDepthRatio, 3) : undefined,
    sideNaturalWaistCorrectedDepthRatio: sideNaturalSignal ? round(sideNaturalSignal.correctedDepthRatio, 3) : undefined,
    sideNaturalWaistProjectionLeakRatio: sideNaturalSignal ? round(sideNaturalSignal.projectionLeakRatio, 3) : undefined,
    sideNaturalWaistCorrectedDepthCm: sideNaturalSignal ? round(sideNaturalSignal.correctedDepthCm, 1) : undefined,
    sideNaturalWaistYNorm: sideNatural ? round(sideNatural.yNorm, 4) : undefined,
    sideNaturalWaistLeftXNorm: sideNatural ? round(sideNatural.leftXNorm, 4) : undefined,
    sideNaturalWaistRightXNorm: sideNatural ? round(sideNatural.rightXNorm, 4) : undefined,
    trouserWaistMaskWidthPx: round(trouserWidthPx, 1),
    trouserWaistMaskWidthCm: round(trouserWidthCm, 1),
    trouserWaistBreadthCm: round(trouserBreadthCm, 1),
    depthRatio: round(trouserDepthRatio, 3),
    trouserWaistDepthCm: round(trouserDepthCm, 1),
    trouserWaistCm: round(trouserWaistCm, 1),
    trouserWaistDepthSource: sideTrouserSignal ? "side-mask" : "front-estimate",
    sideTrouserWaistDepthPx: round(sideTrouser?.widthPx ?? 0, 1),
    sideTrouserWaistDepthCm: round(sideTrouser?.widthCm ?? 0, 1),
    sideTrouserWaistRawDepthRatio: sideTrouserSignal ? round(sideTrouserSignal.rawDepthRatio, 3) : undefined,
    sideTrouserWaistCorrectedDepthRatio: sideTrouserSignal ? round(sideTrouserSignal.correctedDepthRatio, 3) : undefined,
    sideTrouserWaistProjectionLeakRatio: sideTrouserSignal ? round(sideTrouserSignal.projectionLeakRatio, 3) : undefined,
    sideTrouserWaistCorrectedDepthCm: sideTrouserSignal ? round(sideTrouserSignal.correctedDepthCm, 1) : undefined,
    sideTrouserWaistYNorm: sideTrouser ? round(sideTrouser.yNorm, 4) : undefined,
    sideTrouserWaistLeftXNorm: sideTrouser ? round(sideTrouser.leftXNorm, 4) : undefined,
    sideTrouserWaistRightXNorm: sideTrouser ? round(sideTrouser.rightXNorm, 4) : undefined,
    expectedWeightKg: 0,
    weightDeltaKg: 0,
    directWeightBonusCm: 0,
    finalNaturalWaistCm: round(naturalWaistCm, 1),
    finalNaturalWaistIn: round(naturalWaistIn, 1),
    finalTrouserWaistCm: round(trouserWaistCm, 1),
    finalTrouserWaistIn: round(trouserWaistIn, 1),
    maskThreshold,
    torsoScanStartYNorm: round(torsoScanStartYNorm, 4),
    torsoScanEndYNorm: round(torsoScanEndYNorm, 4),
    naturalWaistYNorm: round(naturalWaistYNorm, 4),
    naturalWaistLeftXNorm: round(naturalWaistLeftXNorm, 4),
    naturalWaistRightXNorm: round(naturalWaistRightXNorm, 4),
    trouserWaistYNorm: round(trouserYNorm, 4),
    trouserWaistLeftXNorm: round(trouserLeftXNorm, 4),
    trouserWaistRightXNorm: round(trouserRightXNorm, 4),
    narrowestYNorm: round(naturalWaistYNorm, 4),
    narrowestLeftXNorm: round(naturalWaistLeftXNorm, 4),
    narrowestRightXNorm: round(naturalWaistRightXNorm, 4),
    scanProfile,
  };
}

function round(n: number, d: number): number {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
}

function roundMaskHeightScaleAudit<T extends {
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
}>(audit: T): T {
  return {
    ...audit,
    cmPerPx: round(audit.cmPerPx, 5),
    topYNorm: round(audit.topYNorm, 4),
    bottomYNorm: round(audit.bottomYNorm, 4),
    leftXNorm: round(audit.leftXNorm, 4),
    rightXNorm: round(audit.rightXNorm, 4),
    centerXNorm: round(audit.centerXNorm, 4),
    bodySpanPx: round(audit.bodySpanPx, 1),
  };
}
