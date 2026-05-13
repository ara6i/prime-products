/**
 * Hip circumference — mirrors backend formulas in
 * `sizing.service.ts → synthesizeBaselinesFromAnchors`.
 *
 *  ── Male  : K-factor model (additive, bone × 1.10 + BMI-driven pad)
 *  ── Female: Refined model (B = bone × k_b, T = continuous BMI lerp)
 */

import type { PoseResult, Gender } from "../types";
import { POSE_IDX } from "./poseDetector";

// ── Female K-factor depth anchors (for hipsD only). hipsW replaced
//    by the refined `k_b` constant; tissue replaced by continuous T.
const FEMALE_HIPSD_ANCHORS: Array<{ bmi: number; hipsD: number }> = [
  { bmi: 16,   hipsD: 0.58 },
  { bmi: 18.5, hipsD: 0.62 },
  { bmi: 25,   hipsD: 0.70 },
  { bmi: 30,   hipsD: 0.76 },
  { bmi: 35,   hipsD: 0.82 },
  { bmi: 40,   hipsD: 0.88 },
];

// ── Male K-factor anchors (hipsW × hipsD, used by backend for males).
const MALE_HIPS_ANCHORS: Array<{ bmi: number; hipsW: number; hipsD: number }> = [
  { bmi: 16,   hipsW: 1.36, hipsD: 0.60 },
  { bmi: 18.5, hipsW: 1.42, hipsD: 0.66 },
  { bmi: 25,   hipsW: 1.52, hipsD: 0.74 },
  { bmi: 30,   hipsW: 1.62, hipsD: 0.85 },
  { bmi: 35,   hipsW: 1.70, hipsD: 0.90 },
  { bmi: 40,   hipsW: 1.76, hipsD: 0.94 },
];

function interpHipsD(bmi: number, anchors: typeof FEMALE_HIPSD_ANCHORS): number {
  if (bmi <= anchors[0]!.bmi) return anchors[0]!.hipsD;
  const last = anchors[anchors.length - 1]!;
  if (bmi >= last.bmi) return last.hipsD;
  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i]!;
    const hi = anchors[i + 1]!;
    if (bmi >= lo.bmi && bmi <= hi.bmi) {
      const t = (bmi - lo.bmi) / (hi.bmi - lo.bmi);
      return lo.hipsD + (hi.hipsD - lo.hipsD) * t;
    }
  }
  return last.hipsD;
}

function interpMaleHips(bmi: number): { hipsW: number; hipsD: number } {
  const anchors = MALE_HIPS_ANCHORS;
  if (bmi <= anchors[0]!.bmi) return { hipsW: anchors[0]!.hipsW, hipsD: anchors[0]!.hipsD };
  const last = anchors[anchors.length - 1]!;
  if (bmi >= last.bmi) return { hipsW: last.hipsW, hipsD: last.hipsD };
  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i]!;
    const hi = anchors[i + 1]!;
    if (bmi >= lo.bmi && bmi <= hi.bmi) {
      const t = (bmi - lo.bmi) / (hi.bmi - lo.bmi);
      return {
        hipsW: lo.hipsW + (hi.hipsW - lo.hipsW) * t,
        hipsD: lo.hipsD + (hi.hipsD - lo.hipsD) * t,
      };
    }
  }
  return { hipsW: last.hipsW, hipsD: last.hipsD };
}

function computeMaleHipTissuePadCm(bmi: number): number {
  const lowBmi = 18, highBmi = 35;
  const lowPad = 6, highPad = 16;
  if (bmi <= lowBmi) return lowPad;
  if (bmi >= highBmi) return highPad;
  const t = (bmi - lowBmi) / (highBmi - lowBmi);
  return lowPad + (highPad - lowPad) * t;
}

function ellipseCm(w: number, d: number): number {
  const a = w / 2;
  const b = d / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

export interface HipsTrace {
  gender: Gender;
  bmi: number;
  hipBoneCm: number;
  /** Female: k_b × bone (refined). Male: bone × 1.10 + tissue (additive K-factor). */
  hipBreadthCm: number;
  hipDepthCm: number;
  hipsCm: number;
  hipsIn: number;
  /** Pretty-printed formula for the UI. */
  formula: string;
  /** Detail rows for the UI grid. */
  details: Array<{ label: string; value: string }>;
}

export function computeHips(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
  weightKg: number,
  gender: Gender,
  cmPerPx: number,
): HipsTrace | null {
  const lm = pose.landmarks;
  const lHip = lm[POSE_IDX.LEFT_HIP];
  const rHip = lm[POSE_IDX.RIGHT_HIP];
  if (!lHip || !rHip) return null;

  const dx = (lHip.x - rHip.x) * imageWidth;
  const dy = (lHip.y - rHip.y) * imageHeight;
  const hipBoneCm = Math.hypot(dx, dy) * cmPerPx;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  const r = (n: number, d = 1) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

  let hipBreadthCm: number;
  let hipDepthCm: number;
  let formula = "";
  const details: Array<{ label: string; value: string }> = [];

  if (gender === "female") {
    const k_b = 1.49, s = 2.0, r_d = 0.82, g = 0, p = 0;
    const B = hipBoneCm * k_b;
    const T = Math.max(1.0, Math.min(5.0, 0.12 * (bmi - 18) + s));
    hipBreadthCm = B + T;
    hipDepthCm = hipBreadthCm * (r_d + g + p);
    formula =
      `B = bone × k_b = ${r(hipBoneCm)} × ${k_b} = ${r(B)} cm\n` +
      `T = clamp(0.12·(BMI − 18) + ${s}, 1, 5) = ${r(T)} cm\n` +
      `H_b = B + T = ${r(hipBreadthCm)} cm\n` +
      `H_d = H_b × (r_d + g + p) = ${r(hipBreadthCm)} × ${(r_d + g + p).toFixed(2)} = ${r(hipDepthCm)} cm`;
    details.push(
      { label: "k_b (bone→flesh)", value: k_b.toFixed(3) },
      { label: "B = bone × k_b", value: `${r(B)} cm` },
      { label: "T (tissue, BMI)", value: `${r(T)} cm` },
      { label: "r_d (depth ratio)", value: r_d.toFixed(2) },
    );
  } else {
    const { hipsD } = interpMaleHips(bmi);
    const tissuePadCm = computeMaleHipTissuePadCm(bmi);
    hipBreadthCm = hipBoneCm * 1.10 + tissuePadCm;
    hipDepthCm = hipBreadthCm * hipsD;
    formula =
      `H_b = bone × 1.10 + tissue = ${r(hipBoneCm)} × 1.10 + ${r(tissuePadCm)} = ${r(hipBreadthCm)} cm\n` +
      `H_d = H_b × hipsD(BMI) = ${r(hipBreadthCm)} × ${hipsD.toFixed(3)} = ${r(hipDepthCm)} cm`;
    details.push(
      { label: "bone × 1.10", value: `${r(hipBoneCm * 1.10)} cm` },
      { label: "Tissue pad (BMI lerp)", value: `${r(tissuePadCm)} cm` },
      { label: "hipsD(BMI)", value: hipsD.toFixed(3) },
    );
  }

  const hipsCm = ellipseCm(hipBreadthCm, hipDepthCm);
  void FEMALE_HIPSD_ANCHORS; // exported but unused in current female path
  return {
    gender,
    bmi: r(bmi, 2),
    hipBoneCm: r(hipBoneCm),
    hipBreadthCm: r(hipBreadthCm),
    hipDepthCm: r(hipDepthCm),
    hipsCm: r(hipsCm),
    hipsIn: r(hipsCm / 2.54),
    formula,
    details,
  };
}
