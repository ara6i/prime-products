/**
 * Pure waist computation — landmarks + mask only.
 *
 * Everything except π and one anatomical constant (depth/breadth=0.7
 * for human torso cross-section) is derived from the actual photo.
 *
 *  ── No BMI lookup tables.
 *  ── No "bone × 1.45" fallback.
 *  ── No hand-at-hip detector — hand bboxes excluded from the mask scan.
 *  ── No height-fraction guesses — full body span comes from foot landmarks.
 *  ── No weight bonus — the photo carries the body, not your scale.
 */

import type { Gender, PoseResult, WaistTrace } from "../types";
import { POSE_IDX } from "./poseDetector";
import { scanMaskBandWidth, type ExclusionBox } from "./maskWidth";

/**
 * Depth-to-breadth ratio for the waist cross-section, driven by BMI.
 *
 * A lean person's cross-section is flatter (depth ≈ 0.62 × breadth);
 * a heavier person's is rounder (depth approaches breadth). Front-photo
 * mask gives us breadth — depth is unobservable, so weight (via BMI)
 * is the right signal here and it's the ONLY place weight feeds in.
 *
 * Linear lerp from 0.62 at lean BMI 18 to 0.95 at obese BMI 40,
 * clamped at both ends. Continuous — no BMI cliffs.
 */
function depthRatioFromBMI(bmi: number): number {
  const t = (bmi - 18) / (40 - 18);
  const ratio = 0.62 + t * (0.95 - 0.62);
  return Math.max(0.62, Math.min(0.95, ratio));
}

/** Ramanujan's approximation for the perimeter of an ellipse. */
export function ellipseCircumferenceCm(widthCm: number, depthCm: number): number {
  if (!widthCm || !depthCm || widthCm <= 0 || depthCm <= 0) return 0;
  const a = widthCm / 2;
  const b = depthCm / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

export function computeTrouserWaist(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
  weightKg: number,
  gender: Gender,
): WaistTrace | null {
  if (!pose.landmarks?.length) return null;
  const lm = pose.landmarks;
  const nose = lm[POSE_IDX.NOSE];
  const lHip = lm[POSE_IDX.LEFT_HIP];
  const rHip = lm[POSE_IDX.RIGHT_HIP];
  const lShoulder = lm[POSE_IDX.LEFT_SHOULDER];
  const rShoulder = lm[POSE_IDX.RIGHT_SHOULDER];
  if (!nose || !lHip || !rHip || !lShoulder || !rShoulder) return null;

  // ── 1. Scale: full top-of-head to bottom-of-foot span.
  // Top: nose Y minus ~half head height (eye-to-mouth × 2 from landmarks).
  // Bottom: lowest foot/heel landmark Y.
  const lFootIdx = lm[31];
  const rFootIdx = lm[32];
  const lHeel = lm[29];
  const rHeel = lm[30];
  const bottomY = Math.max(
    lFootIdx?.y ?? 0, rFootIdx?.y ?? 0,
    lHeel?.y ?? 0, rHeel?.y ?? 0,
  );
  // Top-of-head ≈ nose - (mouth_y - nose_y) (half a face above the nose).
  const mouth = lm[9];
  const halfFace = mouth ? Math.max(0, mouth.y - nose.y) : 0;
  const topY = Math.max(0, nose.y - halfFace);
  const totalNormY = bottomY - topY;
  if (totalNormY <= 0) return null;
  const cmPerPx = heightCm / (totalNormY * imageHeight);

  // ── 2. Hip landmark in pixels (joint-to-joint).
  const hipLeftPx = { x: lHip.x * imageWidth, y: lHip.y * imageHeight };
  const hipRightPx = { x: rHip.x * imageWidth, y: rHip.y * imageHeight };
  const hipBoneCm = Math.hypot(hipRightPx.x - hipLeftPx.x, hipRightPx.y - hipLeftPx.y) * cmPerPx;

  // ── 3. Hand exclusion boxes (so the mask walker can't merge body+hand).
  // Each hand bbox covers wrist + pinky + index + thumb landmarks, padded.
  const handBboxes: ExclusionBox[] = [];
  const buildHandBbox = (idxs: number[]): ExclusionBox | null => {
    const pts = idxs.map((i) => lm[i]).filter(Boolean) as typeof lm;
    if (pts.length < 2) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) * (pose.maskWidth || imageWidth);
    const maxX = Math.max(...xs) * (pose.maskWidth || imageWidth);
    const minY = Math.min(...ys) * (pose.maskHeight || imageHeight);
    const maxY = Math.max(...ys) * (pose.maskHeight || imageHeight);
    // Pad by 25% of the larger axis for safety.
    const pad = Math.max(maxX - minX, maxY - minY) * 0.25;
    return { x0: minX - pad, y0: minY - pad, x1: maxX + pad, y1: maxY + pad };
  };
  const lHand = buildHandBbox([15, 17, 19, 21]); // wrist, pinky, index, thumb (left)
  const rHand = buildHandBbox([16, 18, 20, 22]);
  if (lHand) handBboxes.push(lHand);
  if (rHand) handBboxes.push(rHand);

  // ── 4. Scan mask widths from shoulder Y to hip Y, find narrowest row.
  // No offsets, no skipping rib cage — let the silhouette decide.
  const shoulderYNorm = (lShoulder.y + rShoulder.y) / 2;
  const hipYNorm = (lHip.y + rHip.y) / 2;
  const cxInMask = (hipLeftPx.x + hipRightPx.x) / 2 / imageWidth * (pose.maskWidth || imageWidth);

  let narrowestYNorm = hipYNorm;
  let narrowestWidthCm = 0;
  let narrowestLeftXNorm = 0;
  let narrowestRightXNorm = 0;
  const scanProfile: Array<{ y: number; widthCm: number }> = [];

  if (pose.mask && pose.maskWidth > 0 && pose.maskHeight > 0) {
    const step = 1 / pose.maskHeight;
    let minWidthCm = Infinity;
    for (let y = shoulderYNorm; y <= hipYNorm; y += step * 4) {
      const yInMask = y * pose.maskHeight;
      const band = scanMaskBandWidth(pose.mask, pose.maskWidth, pose.maskHeight, yInMask, cxInMask, 1, 4, handBboxes);
      if (band) {
        const widthCm = band.widthPx * (imageWidth / pose.maskWidth) * cmPerPx;
        scanProfile.push({ y: round(y, 3), widthCm: round(widthCm, 1) });
        if (widthCm < minWidthCm) {
          minWidthCm = widthCm;
          narrowestYNorm = y;
          narrowestLeftXNorm = band.leftX / pose.maskWidth;
          narrowestRightXNorm = band.rightX / pose.maskWidth;
        }
      }
    }
    if (minWidthCm < Infinity) narrowestWidthCm = minWidthCm;
  }

  // ── 5. Trouser-waist row = LOCAL widening below the narrowest.
  let trouserYNorm = narrowestYNorm;
  let trouserWidthCm = narrowestWidthCm;
  let trouserLeftXNorm = narrowestLeftXNorm;
  let trouserRightXNorm = narrowestRightXNorm;
  if (pose.mask && narrowestWidthCm > 0) {
    const target = narrowestWidthCm * 1.10;
    for (const p of scanProfile) {
      if (p.y > narrowestYNorm && p.widthCm >= target) {
        trouserYNorm = p.y;
        trouserWidthCm = p.widthCm;
        // Re-scan that exact Y to grab edges for visualization
        const yInMask = p.y * pose.maskHeight;
        const reBand = scanMaskBandWidth(pose.mask, pose.maskWidth, pose.maskHeight, yInMask, cxInMask, 1, 4, handBboxes);
        if (reBand) {
          trouserLeftXNorm = reBand.leftX / pose.maskWidth;
          trouserRightXNorm = reBand.rightX / pose.maskWidth;
        }
        break;
      }
    }
  }

  // ── 6. BMI (informational only — not used in waist math anymore).
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  // ── 7. Z-depth signal (informational).
  const shoulderZ = (lShoulder.z + rShoulder.z) / 2;
  const hipZ = (lHip.z + rHip.z) / 2;
  const zDepthDelta = hipZ - shoulderZ;
  const zDepthCm = Math.abs(zDepthDelta) * imageWidth * cmPerPx;

  // ── 8. Waist ellipse — depth driven by weight (via BMI).
  const breadthCm = trouserWidthCm || narrowestWidthCm || hipBoneCm;
  const depthRatio = depthRatioFromBMI(bmi);
  const depthCm = breadthCm * depthRatio;
  const trouserWaistCm = ellipseCircumferenceCm(breadthCm, depthCm);
  const trouserWaistIn = trouserWaistCm / 2.54;

  return {
    heightCm,
    weightKg,
    bmi: round(bmi, 2),
    gender,
    noseToAnkleNormY: round(totalNormY, 4),
    cmPerPx: round(cmPerPx, 4),
    hipLeftPx: { x: round(hipLeftPx.x, 1), y: round(hipLeftPx.y, 1) },
    hipRightPx: { x: round(hipRightPx.x, 1), y: round(hipRightPx.y, 1) },
    hipBoneCm: round(hipBoneCm, 1),
    hipMaskWidthPx: 0,
    hipMaskWidthCm: round(trouserWidthCm, 1),
    shoulderZ: round(shoulderZ, 4),
    hipZ: round(hipZ, 4),
    zDepthDelta: round(zDepthDelta, 4),
    zDepthCm: round(zDepthCm, 2),
    trouserWaistBreadthCm: round(breadthCm, 1),
    depthRatio: round(depthRatio, 3),
    trouserWaistDepthCm: round(depthCm, 1),
    trouserWaistCm: round(trouserWaistCm, 1),
    expectedWeightKg: 0,
    weightDeltaKg: 0,
    directWeightBonusCm: 0,
    finalTrouserWaistCm: round(trouserWaistCm, 1),
    finalTrouserWaistIn: round(trouserWaistIn, 1),
    trouserWaistYNorm: round(trouserYNorm, 4),
    trouserWaistLeftXNorm: round(trouserLeftXNorm, 4),
    trouserWaistRightXNorm: round(trouserRightXNorm, 4),
    narrowestYNorm: round(narrowestYNorm, 4),
    narrowestLeftXNorm: round(narrowestLeftXNorm, 4),
    narrowestRightXNorm: round(narrowestRightXNorm, 4),
    scanProfile,
  };
}

function round(n: number, d: number): number {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
}
