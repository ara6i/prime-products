import type { MaskHeightScaleAudit, MeasurementMaskMode, PoseResult } from "../types";
import { POSE_IDX } from "./poseDetector";
import { scanMaskBandWidth, type ExclusionBox } from "./maskWidth";

export interface PoseScale {
  cmPerPx: number;
  topYNorm: number;
  bottomYNorm: number;
  shoulderYNorm: number;
  hipYNorm: number;
  hipCenterXNorm: number;
  hipBoneCm: number;
  hipLeftPx: { x: number; y: number };
  hipRightPx: { x: number; y: number };
}

export interface MaskWidthMeasurement {
  widthPx: number;
  widthCm: number;
  threshold: number;
  yNorm: number;
  leftXNorm: number;
  rightXNorm: number;
}

export interface MaskWidthOptions {
  excludeLimbs?: boolean;
  segmentMode?: "center-walk" | "widest";
  exclusionMode?: "hands" | "limb-capsules" | "none";
}

interface ExclusionCapsule {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  radius: number;
}

interface BodyCoreBounds {
  left: number;
  right: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function computePoseScale(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
): PoseScale | null {
  const lm = pose.landmarks;
  const nose = lm[POSE_IDX.NOSE];
  const lHip = lm[POSE_IDX.LEFT_HIP];
  const rHip = lm[POSE_IDX.RIGHT_HIP];
  const lShoulder = lm[POSE_IDX.LEFT_SHOULDER];
  const rShoulder = lm[POSE_IDX.RIGHT_SHOULDER];
  if (!nose || !lHip || !rHip || !lShoulder || !rShoulder) return null;

  const lFootIdx = lm[31];
  const rFootIdx = lm[32];
  const lHeel = lm[29];
  const rHeel = lm[30];
  const bottomYNorm = Math.max(
    lFootIdx?.y ?? 0,
    rFootIdx?.y ?? 0,
    lHeel?.y ?? 0,
    rHeel?.y ?? 0,
  );
  const mouth = lm[9];
  const halfFace = mouth ? Math.max(0, mouth.y - nose.y) : 0;
  const topYNorm = Math.max(0, nose.y - halfFace);
  const fullBodyNorm = bottomYNorm - topYNorm;
  if (fullBodyNorm <= 0) return null;

  const cmPerPx = heightCm / (fullBodyNorm * imageHeight);
  const hipLeftPx = { x: lHip.x * imageWidth, y: lHip.y * imageHeight };
  const hipRightPx = { x: rHip.x * imageWidth, y: rHip.y * imageHeight };
  const hipBoneCm = Math.hypot(hipRightPx.x - hipLeftPx.x, hipRightPx.y - hipLeftPx.y) * cmPerPx;

  return {
    cmPerPx,
    topYNorm,
    bottomYNorm,
    shoulderYNorm: (lShoulder.y + rShoulder.y) / 2,
    hipYNorm: (lHip.y + rHip.y) / 2,
    hipCenterXNorm: (lHip.x + rHip.x) / 2,
    hipBoneCm,
    hipLeftPx,
    hipRightPx,
  };
}

export function computeMaskHeightScale(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
): MaskHeightScaleAudit | null {
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0 || imageHeight <= 0 || heightCm <= 0) return null;
  const minPixels = Math.max(4, Math.round(pose.maskWidth * 0.006));
  for (const threshold of [96, 64, 32]) {
    let topRow = -1;
    let bottomRow = -1;
    let leftX = pose.maskWidth;
    let rightX = -1;
    for (let y = 0; y < pose.maskHeight; y++) {
      let count = 0;
      let rowLeftX = pose.maskWidth;
      let rowRightX = -1;
      const rowStart = y * pose.maskWidth;
      for (let x = 0; x < pose.maskWidth; x++) {
        if (pose.mask[rowStart + x]! >= threshold) {
          count++;
          if (x < rowLeftX) rowLeftX = x;
          if (x > rowRightX) rowRightX = x;
        }
      }
      if (count < minPixels) continue;
      if (topRow < 0) topRow = y;
      bottomRow = y;
      if (rowLeftX < leftX) leftX = rowLeftX;
      if (rowRightX > rightX) rightX = rowRightX;
    }
    if (topRow >= 0 && bottomRow > topRow) {
      const topYNorm = topRow / pose.maskHeight;
      const bottomYNorm = bottomRow / pose.maskHeight;
      const bodyPx = (bottomYNorm - topYNorm) * imageHeight;
      if (bodyPx > 0) {
        const safeLeftX = leftX <= rightX ? leftX : 0;
        const safeRightX = leftX <= rightX ? rightX : pose.maskWidth - 1;
        return {
          cmPerPx: heightCm / bodyPx,
          heightCm,
          topYNorm,
          bottomYNorm,
          leftXNorm: safeLeftX / pose.maskWidth,
          rightXNorm: safeRightX / pose.maskWidth,
          centerXNorm: ((safeLeftX + safeRightX) / 2) / pose.maskWidth,
          bodySpanPx: bodyPx,
          threshold,
          imageWidth,
          imageHeight,
        };
      }
    }
  }
  return null;
}

export function applyMaskHeightScaleToPoseScale(
  scale: PoseScale | null,
  maskScale: ReturnType<typeof computeMaskHeightScale>,
): PoseScale | null {
  if (!scale || !maskScale || maskScale.cmPerPx <= 0) return scale;
  const scaleRatio = maskScale.cmPerPx / scale.cmPerPx;
  return {
    ...scale,
    cmPerPx: maskScale.cmPerPx,
    topYNorm: maskScale.topYNorm,
    bottomYNorm: maskScale.bottomYNorm,
    hipBoneCm: scale.hipBoneCm * scaleRatio,
  };
}

export function torsoFractionFromY(scale: PoseScale, yNorm: number): number {
  const span = Math.max(0.001, scale.hipYNorm - scale.shoulderYNorm);
  return Math.max(0, Math.min(1, (yNorm - scale.shoulderYNorm) / span));
}

export function yFromTorsoFraction(scale: PoseScale, fraction: number): number {
  const span = Math.max(0.001, scale.hipYNorm - scale.shoulderYNorm);
  return scale.shoulderYNorm + span * Math.max(0, Math.min(1, fraction));
}

export function buildHandExclusions(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
): ExclusionBox[] {
  const lm = pose.landmarks;
  const boxes: ExclusionBox[] = [];
  const build = (idxs: number[]): ExclusionBox | null => {
    const pts = idxs.map((i) => lm[i]).filter(Boolean) as typeof lm;
    if (pts.length < 2) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) * (pose.maskWidth || imageWidth);
    const maxX = Math.max(...xs) * (pose.maskWidth || imageWidth);
    const minY = Math.min(...ys) * (pose.maskHeight || imageHeight);
    const maxY = Math.max(...ys) * (pose.maskHeight || imageHeight);
    const pad = Math.max(maxX - minX, maxY - minY) * 0.25;
    return { x0: minX - pad, y0: minY - pad, x1: maxX + pad, y1: maxY + pad };
  };
  const leftHand = build([15, 17, 19, 21]);
  const rightHand = build([16, 18, 20, 22]);
  if (leftHand) boxes.push(leftHand);
  if (rightHand) boxes.push(rightHand);
  return boxes;
}

function buildLimbCapsules(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
): ExclusionCapsule[] {
  const lm = pose.landmarks;
  const maskWidth = pose.maskWidth || imageWidth;
  const maskHeight = pose.maskHeight || imageHeight;
  const capsules: ExclusionCapsule[] = [];
  const add = (
    fromIdx: number,
    toIdx: number,
    radiusScale = 0.11,
    minRadius = 6,
    maxRadius = 24,
  ) => {
    const from = lm[fromIdx];
    const to = lm[toIdx];
    if (!from || !to) return;
    const x0 = from.x * maskWidth;
    const y0 = from.y * maskHeight;
    const x1 = to.x * maskWidth;
    const y1 = to.y * maskHeight;
    const length = Math.hypot(x1 - x0, y1 - y0);
    const radius = Math.max(minRadius, Math.min(maxRadius, length * radiusScale));
    capsules.push({ x0, y0, x1, y1, radius });
  };

  // Full arm → hand landmark corridors. The capsules are narrow enough to
  // avoid rectangular torso cuts, but they remove upper-arm pixels too.
  add(11, 13, 0.10, 6, 22);
  add(13, 15, 0.12, 7, 24);
  add(15, 17, 0.18, 7, 28);
  add(15, 19, 0.18, 7, 28);
  add(15, 21, 0.18, 7, 28);
  add(12, 14, 0.10, 6, 22);
  add(14, 16, 0.12, 7, 24);
  add(16, 18, 0.18, 7, 28);
  add(16, 20, 0.18, 7, 28);
  add(16, 22, 0.18, 7, 28);
  return capsules;
}

function getTorsoAnchors(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
) {
  const lm = pose.landmarks;
  const maskWidth = pose.maskWidth || imageWidth;
  const maskHeight = pose.maskHeight || imageHeight;
  const lShoulder = lm[POSE_IDX.LEFT_SHOULDER];
  const rShoulder = lm[POSE_IDX.RIGHT_SHOULDER];
  const lHip = lm[POSE_IDX.LEFT_HIP];
  const rHip = lm[POSE_IDX.RIGHT_HIP];
  if (!lShoulder || !rShoulder || !lHip || !rHip) return null;

  const shoulderCenterX = ((lShoulder.x + rShoulder.x) / 2) * maskWidth;
  const hipCenterX = ((lHip.x + rHip.x) / 2) * maskWidth;
  const shoulderY = ((lShoulder.y + rShoulder.y) / 2) * maskHeight;
  const hipY = ((lHip.y + rHip.y) / 2) * maskHeight;
  const shoulderHalf = Math.abs(lShoulder.x - rShoulder.x) * maskWidth * 0.5;
  const hipBoneHalf = Math.abs(lHip.x - rHip.x) * maskWidth * 0.5;
  const lKnee = lm[POSE_IDX.LEFT_KNEE];
  const rKnee = lm[POSE_IDX.RIGHT_KNEE];
  const kneeCenterX = lKnee && rKnee ? ((lKnee.x + rKnee.x) / 2) * maskWidth : hipCenterX;
  const kneeY = lKnee && rKnee ? ((lKnee.y + rKnee.y) / 2) * maskHeight : hipY + Math.max(1, hipY - shoulderY);
  return {
    maskWidth,
    shoulderCenterX,
    hipCenterX,
    kneeCenterX,
    shoulderY,
    hipY,
    kneeY,
    shoulderHalf,
    hipBoneHalf,
  };
}

function bodyCoreBoundsAtY(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  y: number,
): BodyCoreBounds | null {
  const anchors = getTorsoAnchors(pose, imageWidth, imageHeight);
  if (!anchors) return null;
  const torsoSpan = Math.max(1, anchors.hipY - anchors.shoulderY);
  let centerX = anchors.hipCenterX;
  let halfWidth = Math.max(anchors.shoulderHalf, anchors.hipBoneHalf * 2.2);

  if (y <= anchors.hipY) {
    const t = clamp((y - anchors.shoulderY) / torsoSpan, 0, 1);
    centerX = lerp(anchors.shoulderCenterX, anchors.hipCenterX, t);
    const shoulderCore = Math.max(anchors.shoulderHalf * 0.82, anchors.hipBoneHalf * 1.45);
    const waistCore = Math.max(anchors.shoulderHalf * 0.78, anchors.hipBoneHalf * 1.55);
    const hipCore = Math.max(anchors.shoulderHalf * 0.96, anchors.hipBoneHalf * 2.15);
    halfWidth = t < 0.58
      ? lerp(shoulderCore, waistCore, t / 0.58)
      : lerp(waistCore, hipCore, (t - 0.58) / 0.42);
  } else {
    const t = clamp((y - anchors.hipY) / Math.max(1, anchors.kneeY - anchors.hipY), 0, 1);
    centerX = lerp(anchors.hipCenterX, anchors.kneeCenterX, t * 0.35);
    const hipCore = Math.max(anchors.shoulderHalf * 1.0, anchors.hipBoneHalf * 2.25);
    const thighCore = Math.max(anchors.shoulderHalf * 0.62, anchors.hipBoneHalf * 1.45);
    halfWidth = lerp(hipCore, thighCore, t);
  }

  const pad = Math.max(4, anchors.maskWidth * 0.008);
  return {
    left: clamp(centerX - halfWidth - pad, 0, anchors.maskWidth - 1),
    right: clamp(centerX + halfWidth + pad, 0, anchors.maskWidth - 1),
  };
}

function isCleanupBandY(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  y: number,
): boolean {
  const anchors = getTorsoAnchors(pose, imageWidth, imageHeight);
  if (!anchors) return false;
  const torsoSpan = Math.max(1, anchors.hipY - anchors.shoulderY);
  const legSpan = Math.max(1, anchors.kneeY - anchors.hipY);
  return y >= anchors.shoulderY - torsoSpan * 0.2 && y <= anchors.hipY + legSpan * 0.35;
}

function shouldExcludeCleanupPixel(
  x: number,
  y: number,
  capsules: ExclusionCapsule[],
  core: BodyCoreBounds | null,
  cleanupBand: boolean,
): boolean {
  const outsideCore = core ? x < core.left || x > core.right : true;
  if (cleanupBand && outsideCore) return true;
  return outsideCore && isInsideAnyCapsule(x, y, capsules);
}

export function createMeasurementMask(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  mode: MeasurementMaskMode,
): Uint8ClampedArray | null {
  void imageWidth;
  void imageHeight;
  void mode;
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
  return pose.mask;
}

export function measureMaskWidthAtY(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  cmPerPx: number,
  yNorm: number,
  centerXNorm: number,
  bandPx = 2,
  options: MaskWidthOptions = {},
): MaskWidthMeasurement | null {
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
  const yInMask = yNorm * pose.maskHeight;
  const cxInMask = centerXNorm * pose.maskWidth;
  const exclusionMode = options.excludeLimbs === false ? "none" : options.exclusionMode ?? "hands";
  const boxExclusions = exclusionMode === "hands" ? buildHandExclusions(pose, imageWidth, imageHeight) : [];
  if (exclusionMode === "limb-capsules") {
    const core = bodyCoreBoundsAtY(pose, imageWidth, imageHeight, yInMask);
    if (core) {
      const y0 = Math.max(0, yInMask - bandPx - 2);
      const y1 = Math.min(pose.maskHeight - 1, yInMask + bandPx + 2);
      boxExclusions.push(
        { x0: 0, y0, x1: core.left, y1 },
        { x0: core.right, y0, x1: pose.maskWidth - 1, y1 },
      );
    }
  }
  const capsuleExclusions = exclusionMode === "limb-capsules" ? buildLimbCapsules(pose, imageWidth, imageHeight) : [];
  for (const threshold of [96, 64, 32]) {
    const band = options.segmentMode === "widest"
      ? scanWidestMaskBandWidth(
          pose.mask,
          pose,
          imageWidth,
          imageHeight,
          pose.maskWidth,
          pose.maskHeight,
          yInMask,
          bandPx,
          threshold,
          boxExclusions,
          capsuleExclusions,
        )
      : scanMaskBandWidth(
          pose.mask,
          pose.maskWidth,
          pose.maskHeight,
          yInMask,
          cxInMask,
          bandPx,
          threshold,
          boxExclusions,
        );
    if (!band) continue;
    const widthPx = band.widthPx * (imageWidth / pose.maskWidth);
    return {
      widthPx,
      widthCm: widthPx * cmPerPx,
      threshold,
      yNorm,
      leftXNorm: band.leftX / pose.maskWidth,
      rightXNorm: band.rightX / pose.maskWidth,
    };
  }
  return null;
}

function isInsideAnyBox(x: number, y: number, boxes: ExclusionBox[]): boolean {
  for (const b of boxes) {
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true;
  }
  return false;
}

function isInsideAnyCapsule(x: number, y: number, capsules: ExclusionCapsule[]): boolean {
  for (const c of capsules) {
    const dx = c.x1 - c.x0;
    const dy = c.y1 - c.y0;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0
      ? Math.max(0, Math.min(1, ((x - c.x0) * dx + (y - c.y0) * dy) / lenSq))
      : 0;
    const px = c.x0 + t * dx;
    const py = c.y0 + t * dy;
    if (Math.hypot(x - px, y - py) <= c.radius) return true;
  }
  return false;
}

function scanWidestMaskRow(
  mask: Uint8ClampedArray,
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  y: number,
  threshold: number,
  boxExclusions: ExclusionBox[],
  capsuleExclusions: ExclusionCapsule[],
): { widthPx: number; leftX: number; rightX: number } | null {
  const row = Math.max(0, Math.min(height - 1, Math.round(y)));
  const rowStart = row * width;
  const core = capsuleExclusions.length
    ? bodyCoreBoundsAtY(pose, imageWidth, imageHeight, row)
    : null;
  const cleanupBand = capsuleExclusions.length
    ? isCleanupBandY(pose, imageWidth, imageHeight, row)
    : false;
  let best: { widthPx: number; leftX: number; rightX: number } | null = null;
  let x = 0;
  while (x < width) {
    while (
      x < width &&
      (
        mask[rowStart + x]! < threshold ||
        isInsideAnyBox(x, row, boxExclusions) ||
        shouldExcludeCleanupPixel(x, row, capsuleExclusions, core, cleanupBand)
      )
    ) {
      x++;
    }
    if (x >= width) break;
    const leftX = x;
    while (
      x < width &&
      mask[rowStart + x]! >= threshold &&
      !isInsideAnyBox(x, row, boxExclusions) &&
      !shouldExcludeCleanupPixel(x, row, capsuleExclusions, core, cleanupBand)
    ) {
      x++;
    }
    const rightX = x - 1;
    const widthPx = rightX - leftX + 1;
    if (!best || widthPx > best.widthPx) best = { widthPx, leftX, rightX };
  }
  return best;
}

function scanWidestMaskBandWidth(
  mask: Uint8ClampedArray,
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  centerY: number,
  bandPx: number,
  threshold: number,
  boxExclusions: ExclusionBox[],
  capsuleExclusions: ExclusionCapsule[],
): { widthPx: number; leftX: number; rightX: number } | null {
  const rows: Array<{ widthPx: number; leftX: number; rightX: number }> = [];
  for (let dy = -bandPx; dy <= bandPx; dy++) {
    const row = scanWidestMaskRow(
      mask,
      pose,
      imageWidth,
      imageHeight,
      width,
      height,
      centerY + dy,
      threshold,
      boxExclusions,
      capsuleExclusions,
    );
    if (!row) continue;
    rows.push(row);
  }
  if (!rows.length) return null;
  rows.sort((a, b) => a.widthPx - b.widthPx);
  return rows[Math.floor(rows.length / 2)]!;
}
