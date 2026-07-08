/**
 * Hip circumference visual trace for the sizing lab.
 *
 * Production SDK/Shopify sizing is owned by the backend sizing service. Keep
 * this file as a debugging aid only; do not treat it as canonical product
 * sizing logic.
 *
 *  ── Male  : K-factor model (additive, calibrated bone expansion + BMI-driven pad)
 *  ── Female: Refined model (B = bone × k_b, T = continuous BMI lerp)
 */

import type { PoseResult, Gender, MeasurementDebugRow, MeasurementMaskMode } from "../types";
import { POSE_IDX } from "./poseDetector";
import { computePoseScale, measureMaskWidthAtY } from "./bodyMaskGeometry";

function computeMaleHipTissuePadCm(bmi: number): number {
  const lowBmi = 18, highBmi = 35;
  const lowPad = 2.5, highPad = 8;
  if (bmi <= lowBmi) return lowPad;
  if (bmi >= highBmi) return highPad;
  const t = (bmi - lowBmi) / (highBmi - lowBmi);
  return lowPad + (highPad - lowPad) * t;
}

// Mirrors backend `MALE_HIP_BONE_TO_BREADTH_K`.
// BlazePose hip landmarks are skeletal/internal; 1.10 was too low for men's
// outer hip circumference, producing ~34.3" where the target is ~39".
const MALE_HIP_BONE_TO_BREADTH_K = 1.28;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function frontOnlyHipDepthRatio(bmi: number, gender: Gender, maskToLandmarkRatio = 1): number {
  if (gender === "female") {
    // Width comes from the mask. Depth is the missing front-photo dimension, so
    // reduce depth when the mask is already much wider than the hip landmarks.
    const base = 0.58 + (bmi - 22) * 0.004;
    const wideMaskPenalty = clamp(maskToLandmarkRatio - 1.1, 0, 0.25) * 0.8;
    return clamp(base - wideMaskPenalty, 0.46, 0.60);
  }
  return clamp(0.535 + (bmi - 22) * 0.002, 0.52, 0.56);
}

function ellipseCm(w: number, d: number): number {
  const a = w / 2;
  const b = d / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

function isPlausibleSideHipDepth(depthCm: number, frontBreadthCm: number): boolean {
  if (depthCm <= 0 || frontBreadthCm <= 0) return false;
  const ratio = depthCm / frontBreadthCm;
  return ratio >= 0.35 && ratio <= 0.9;
}

function projectionLeakRatio(frontHipSpreadCm: number, sideHipSpreadCm: number): number {
  if (frontHipSpreadCm <= 0 || sideHipSpreadCm <= 0) return 0;
  return clamp(sideHipSpreadCm / frontHipSpreadCm, 0, 0.7);
}

function correctedSideDepth(
  rawDepthCm: number,
  frontBreadthCm: number,
  leakRatio: number,
  minRatio: number,
  maxRatio: number,
): { depthCm: number; ratio: number } | null {
  if (rawDepthCm <= 0 || frontBreadthCm <= 0) return null;
  const sideComponent = Math.sqrt(Math.max(0.001, 1 - leakRatio * leakRatio));
  const depthCm = Math.max(0, (rawDepthCm - frontBreadthCm * leakRatio) / sideComponent);
  const ratio = depthCm / frontBreadthCm;
  if (ratio < minRatio || ratio > maxRatio) return null;
  return { depthCm, ratio };
}

export interface HipsTrace {
  gender: Gender;
  bmi: number;
  maskMode: MeasurementMaskMode;
  hipBoneCm: number;
  hipMaskWidthPx: number;
  hipMaskWidthCm: number;
  sideHipDepthPx: number;
  sideHipDepthCm: number;
  sideHipRawDepthRatio?: number;
  sideHipCorrectedDepthCm?: number;
  sideHipCorrectedDepthRatio?: number;
  sideHipProjectionLeakRatio?: number;
  sideHipYNorm?: number;
  sideHipLeftXNorm?: number;
  sideHipRightXNorm?: number;
  maskThreshold: number;
  method: "front-side-mask" | "front-only-estimate" | "landmark";
  /** Female: k_b × bone (refined). Male: calibrated bone expansion + tissue. */
  hipBreadthCm: number;
  hipDepthCm: number;
  hipsCm: number;
  hipsIn: number;
  /** Pretty-printed formula for the UI. */
  formula: string;
  /** Detail rows for the UI grid. */
  details: Array<{ label: string; value: string }>;
  /** Visual row probes used by the lab to confirm row selection. */
  debugRows: MeasurementDebugRow[];
}

export function computeHips(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
  weightKg: number,
  gender: Gender,
  cmPerPx: number,
  sidePose: PoseResult | null = null,
  sideImageWidth = 0,
  sideImageHeight = 0,
  maskMode: MeasurementMaskMode = "ignore-arms",
): HipsTrace | null {
  const lm = pose.landmarks;
  const lHip = lm[POSE_IDX.LEFT_HIP];
  const rHip = lm[POSE_IDX.RIGHT_HIP];
  if (!lHip || !rHip) return null;

  const dx = (lHip.x - rHip.x) * imageWidth;
  const dy = (lHip.y - rHip.y) * imageHeight;
  const hipBoneCm = Math.hypot(dx, dy) * cmPerPx;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const hipYNorm = (lHip.y + rHip.y) / 2;
  const hipCenterXNorm = (lHip.x + rHip.x) / 2;
  let hipMaskWidthPx = 0;
  let hipMaskWidthCm = 0;
  let sideHipDepthPx = 0;
  let sideHipDepthCm = 0;
  let sideHipRawDepthRatio: number | undefined;
  let sideHipCorrectedDepthCm = 0;
  let sideHipCorrectedDepthRatio: number | undefined;
  let sideHipProjectionLeakRatio: number | undefined;
  let sideHipYNorm: number | undefined;
  let sideHipLeftXNorm: number | undefined;
  let sideHipRightXNorm: number | undefined;
  let maskThreshold = 0;
  const debugRows: MeasurementDebugRow[] = [];
  const maskOptions = maskMode === "ignore-arms"
    ? { excludeLimbs: true, segmentMode: "center-walk" as const, exclusionMode: "limb-capsules" as const }
    : { excludeLimbs: false, segmentMode: "widest" as const, exclusionMode: "none" as const };
  const sideMaskOptions = maskMode === "ignore-arms"
    ? { excludeLimbs: true, segmentMode: "center-walk" as const, exclusionMode: "hands" as const }
    : { excludeLimbs: false, segmentMode: "center-walk" as const, exclusionMode: "none" as const };

  const measureDebugRow = (
    id: string,
    label: string,
    yNorm: number,
    color: string,
    selected = false,
    dashed = false,
  ): MeasurementDebugRow | null => {
    if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
    const measured = measureMaskWidthAtY(
      pose,
      imageWidth,
      imageHeight,
      cmPerPx,
      clamp(yNorm, 0.02, 0.98),
      hipCenterXNorm,
      3,
      maskOptions,
    );
    if (!measured) return null;
    return {
      id,
      label,
      yNorm: measured.yNorm,
      leftXNorm: measured.leftXNorm,
      rightXNorm: measured.rightXNorm,
      widthPx: measured.widthPx,
      widthCm: measured.widthCm,
      color,
      dashed,
      selected,
    };
  };

  if (pose.mask && pose.maskWidth > 0 && pose.maskHeight > 0) {
    const measuredFront = measureMaskWidthAtY(
      pose,
      imageWidth,
      imageHeight,
      cmPerPx,
      hipYNorm,
      hipCenterXNorm,
      3,
      maskOptions,
    );
    if (measuredFront) {
      hipMaskWidthPx = measuredFront.widthPx;
      hipMaskWidthCm = measuredFront.widthCm;
      maskThreshold = measuredFront.threshold;
    }
  }

  const frontScale = computePoseScale(pose, imageWidth, imageHeight, heightCm);
  const torsoSpanNorm = frontScale
    ? Math.max(0.04, frontScale.hipYNorm - frontScale.shoulderYNorm)
    : 0.22;
  const legSpanNorm = frontScale
    ? Math.max(0.08, frontScale.bottomYNorm - frontScale.hipYNorm)
    : 0.34;
  const selectedHipRow = measureDebugRow(
    "hip-selected",
    "selected hip row",
    hipYNorm,
    "#ef4444",
    true,
  );
  const hipCandidateRows: MeasurementDebugRow[] = [];
  const widestPelvisRow = (() => {
    if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
    const start = clamp(hipYNorm - torsoSpanNorm * 0.12, 0.02, 0.98);
    const end = clamp(hipYNorm + legSpanNorm * 0.16, start, 0.98);
    const steps = 16;
    let best: MeasurementDebugRow | null = null;
    for (let i = 0; i <= steps; i++) {
      const y = start + ((end - start) * i) / steps;
      const measured = measureDebugRow(
        `hip-scan-candidate-${i}`,
        "hip scan row",
        y,
        "#94a3b8",
        false,
        true,
      );
      if (measured) hipCandidateRows.push(measured);
      if (measured && (!best || (measured.widthCm ?? 0) > (best.widthCm ?? 0))) {
        best = {
          ...measured,
          id: "hip-widest-band",
          label: "widest pelvis band",
          color: "#22c55e",
          dashed: false,
        };
      }
    }
    return best;
  })();

  for (const row of [...hipCandidateRows, selectedHipRow, widestPelvisRow]) {
    if (row) debugRows.push(row);
  }

  const sideScale = sidePose && sideImageWidth && sideImageHeight
    ? computePoseScale(sidePose, sideImageWidth, sideImageHeight, heightCm)
    : null;
  if (sidePose && sideScale) {
    const measuredSide = measureMaskWidthAtY(
      sidePose,
      sideImageWidth,
      sideImageHeight,
      sideScale.cmPerPx,
      sideScale.hipYNorm,
      sideScale.hipCenterXNorm,
      3,
      sideMaskOptions,
    );
    if (measuredSide && isPlausibleSideHipDepth(measuredSide.widthCm, hipMaskWidthCm)) {
      const frontHipSpreadCm = Math.abs(lHip.x - rHip.x) * imageWidth * cmPerPx;
      const sideHipSpreadCm = Math.abs(sideScale.hipRightPx.x - sideScale.hipLeftPx.x) * sideScale.cmPerPx;
      const leakRatio = projectionLeakRatio(frontHipSpreadCm, sideHipSpreadCm);
      const corrected = correctedSideDepth(measuredSide.widthCm, hipMaskWidthCm, leakRatio, 0.45, 0.75);
      sideHipDepthPx = measuredSide.widthPx;
      sideHipDepthCm = measuredSide.widthCm;
      sideHipRawDepthRatio = measuredSide.widthCm / hipMaskWidthCm;
      sideHipProjectionLeakRatio = leakRatio;
      sideHipCorrectedDepthCm = corrected?.depthCm ?? 0;
      sideHipCorrectedDepthRatio = corrected?.ratio;
      sideHipYNorm = measuredSide.yNorm;
      sideHipLeftXNorm = measuredSide.leftXNorm;
      sideHipRightXNorm = measuredSide.rightXNorm;
    }
  }

  const r = (n: number, d = 1) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

  let hipBreadthCm: number;
  let hipDepthCm: number;
  let formula = "";
  const details: Array<{ label: string; value: string }> = [];
  const useMask = hipMaskWidthCm > 0;
  const useSideDepth = useMask && sideHipCorrectedDepthCm > 0;

  if (gender === "female") {
    const k_b = 1.49, s = 2.0;
    const B = hipBoneCm * k_b;
    const T = Math.max(1.0, Math.min(5.0, 0.12 * (bmi - 18) + s));
    const landmarkBreadthCm = B + T;
    const ratio = useMask ? hipMaskWidthCm / landmarkBreadthCm : 0;
    const frontDepthRatio = frontOnlyHipDepthRatio(bmi, gender, ratio || 1);
    hipBreadthCm = useSideDepth
      ? hipMaskWidthCm
      : useMask
        ? hipMaskWidthCm
        : landmarkBreadthCm;
    hipDepthCm = useSideDepth ? sideHipCorrectedDepthCm : hipBreadthCm * frontDepthRatio;
    formula =
      (useSideDepth
        ? `H_b = front hip mask width = ${r(hipMaskWidthCm)} cm (threshold ${maskThreshold})\n` +
          `raw side ratio = ${r(sideHipDepthCm)} / ${r(hipMaskWidthCm)} = ${r(sideHipRawDepthRatio ?? 0, 3)}\n` +
          `projection leak = ${r(sideHipProjectionLeakRatio ?? 0, 3)}, corrected side depth = ${r(sideHipCorrectedDepthCm)} cm\n`
        : useMask
        ? `L_b = bone × k_b + tissue = ${r(hipBoneCm)} × ${k_b} + ${r(T)} = ${r(landmarkBreadthCm)} cm\n` +
          `M_b = raw hip mask width = ${r(hipMaskWidthCm)} cm (threshold ${maskThreshold})\n` +
          `H_b = M_b = ${r(hipBreadthCm)} cm\n`
        : `B = bone × k_b = ${r(hipBoneCm)} × ${k_b} = ${r(B)} cm\n` +
          `T = clamp(0.12·(BMI − 18) + ${s}, 1, 5) = ${r(T)} cm\n` +
          `H_b = B + T = ${r(hipBreadthCm)} cm\n`) +
      (useSideDepth
        ? `C = ellipse(H_b, H_d) = ellipse(${r(hipBreadthCm)}, ${r(hipDepthCm)})`
        : `H_d = H_b × boundedDepthRatio = ${r(hipBreadthCm)} × ${frontDepthRatio.toFixed(3)} = ${r(hipDepthCm)} cm`);
    details.push(
      { label: "Method", value: useSideDepth ? "front + side mask" : useMask ? "front-only estimate" : "landmark fallback" },
      { label: "Mask path", value: maskMode === "ignore-arms" ? "row cleanup (arms/hair ignored)" : "raw silhouette" },
      { label: "Raw hip mask width", value: useMask ? `${r(hipMaskWidthCm)} cm` : "—" },
      { label: "Raw side hip depth", value: sideHipDepthCm > 0 ? `${r(sideHipDepthCm)} cm` : "—" },
      { label: "Raw side depth ratio", value: sideHipRawDepthRatio != null ? r(sideHipRawDepthRatio, 3).toFixed(3) : "—" },
      { label: "Side projection leak", value: sideHipProjectionLeakRatio != null ? r(sideHipProjectionLeakRatio, 3).toFixed(3) : "—" },
      { label: "Corrected side depth ratio", value: sideHipCorrectedDepthRatio != null ? r(sideHipCorrectedDepthRatio, 3).toFixed(3) : "—" },
      { label: "Corrected side depth", value: useSideDepth ? `${r(sideHipCorrectedDepthCm)} cm` : "—" },
      { label: "Mask / landmark ratio", value: useMask ? r(ratio, 2).toFixed(2) : "—" },
      { label: "Breadth source", value: useMask ? "front mask width" : "landmark fallback" },
      { label: "k_b (bone→flesh)", value: k_b.toFixed(3) },
      { label: "B = bone × k_b", value: `${r(B)} cm` },
      { label: "T (tissue, BMI)", value: `${r(T)} cm` },
      { label: "Depth ratio", value: frontDepthRatio.toFixed(3) },
    );
  } else {
    const tissuePadCm = computeMaleHipTissuePadCm(bmi);
    const landmarkBreadthCm = hipBoneCm * MALE_HIP_BONE_TO_BREADTH_K + tissuePadCm;
    const ratio = useMask ? hipMaskWidthCm / landmarkBreadthCm : 0;
    const frontDepthRatio = frontOnlyHipDepthRatio(bmi, gender, ratio || 1);
    hipBreadthCm = useSideDepth
      ? hipMaskWidthCm
      : useMask
        ? hipMaskWidthCm
        : landmarkBreadthCm;
    hipDepthCm = useSideDepth ? sideHipCorrectedDepthCm : hipBreadthCm * frontDepthRatio;
    formula =
      (useSideDepth
        ? `H_b = front hip mask width = ${r(hipMaskWidthCm)} cm (threshold ${maskThreshold})\n` +
          `raw side ratio = ${r(sideHipDepthCm)} / ${r(hipMaskWidthCm)} = ${r(sideHipRawDepthRatio ?? 0, 3)}\n` +
          `projection leak = ${r(sideHipProjectionLeakRatio ?? 0, 3)}, corrected side depth = ${r(sideHipCorrectedDepthCm)} cm\n`
        : useMask
        ? `L_b = bone × ${MALE_HIP_BONE_TO_BREADTH_K.toFixed(2)} + tissue = ${r(landmarkBreadthCm)} cm\n` +
          `M_b = raw hip mask width = ${r(hipMaskWidthCm)} cm (threshold ${maskThreshold})\n` +
          `H_b = M_b = ${r(hipBreadthCm)} cm\n`
        : `H_b = bone × ${MALE_HIP_BONE_TO_BREADTH_K.toFixed(2)} + tissue = ${r(hipBoneCm)} × ${MALE_HIP_BONE_TO_BREADTH_K.toFixed(2)} + ${r(tissuePadCm)} = ${r(hipBreadthCm)} cm\n`) +
      (useSideDepth
        ? `C = ellipse(H_b, H_d) = ellipse(${r(hipBreadthCm)}, ${r(hipDepthCm)})`
        : `H_d = H_b × boundedDepthRatio = ${r(hipBreadthCm)} × ${frontDepthRatio.toFixed(3)} = ${r(hipDepthCm)} cm`);
    details.push(
      { label: "Method", value: useSideDepth ? "front + side mask" : useMask ? "front-only estimate" : "landmark fallback" },
      { label: "Mask path", value: maskMode === "ignore-arms" ? "row cleanup (arms/hair ignored)" : "raw silhouette" },
      { label: "Raw hip mask width", value: useMask ? `${r(hipMaskWidthCm)} cm` : "—" },
      { label: "Raw side hip depth", value: sideHipDepthCm > 0 ? `${r(sideHipDepthCm)} cm` : "—" },
      { label: "Raw side depth ratio", value: sideHipRawDepthRatio != null ? r(sideHipRawDepthRatio, 3).toFixed(3) : "—" },
      { label: "Side projection leak", value: sideHipProjectionLeakRatio != null ? r(sideHipProjectionLeakRatio, 3).toFixed(3) : "—" },
      { label: "Corrected side depth ratio", value: sideHipCorrectedDepthRatio != null ? r(sideHipCorrectedDepthRatio, 3).toFixed(3) : "—" },
      { label: "Corrected side depth", value: useSideDepth ? `${r(sideHipCorrectedDepthCm)} cm` : "—" },
      { label: "Mask / landmark ratio", value: useMask ? r(ratio, 2).toFixed(2) : "—" },
      { label: "Breadth source", value: useMask ? "front mask width" : "landmark fallback" },
      { label: `bone × ${MALE_HIP_BONE_TO_BREADTH_K.toFixed(2)}`, value: `${r(hipBoneCm * MALE_HIP_BONE_TO_BREADTH_K)} cm` },
      { label: "Tissue pad (BMI lerp)", value: `${r(tissuePadCm)} cm` },
      { label: "Depth ratio", value: frontDepthRatio.toFixed(3) },
    );
  }

  const hipsCm = ellipseCm(hipBreadthCm, hipDepthCm);
  return {
    gender,
    bmi: r(bmi, 2),
    maskMode,
    hipBoneCm: r(hipBoneCm),
    hipMaskWidthPx: r(hipMaskWidthPx),
    hipMaskWidthCm: r(hipMaskWidthCm),
    sideHipDepthPx: r(sideHipDepthPx),
    sideHipDepthCm: r(sideHipDepthCm),
    sideHipRawDepthRatio: sideHipRawDepthRatio != null ? r(sideHipRawDepthRatio, 3) : undefined,
    sideHipCorrectedDepthCm: sideHipCorrectedDepthCm > 0 ? r(sideHipCorrectedDepthCm) : undefined,
    sideHipCorrectedDepthRatio: sideHipCorrectedDepthRatio != null ? r(sideHipCorrectedDepthRatio, 3) : undefined,
    sideHipProjectionLeakRatio: sideHipProjectionLeakRatio != null ? r(sideHipProjectionLeakRatio, 3) : undefined,
    sideHipYNorm,
    sideHipLeftXNorm,
    sideHipRightXNorm,
    maskThreshold,
    method: useSideDepth ? "front-side-mask" : useMask ? "front-only-estimate" : "landmark",
    hipBreadthCm: r(hipBreadthCm),
    hipDepthCm: r(hipDepthCm),
    hipsCm: r(hipsCm),
    hipsIn: r(hipsCm / 2.54),
    formula,
    details,
    debugRows,
  };
}
