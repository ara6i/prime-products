import { scanMaskBandWidth } from "./maskWidth";
import type {
  LocalMlWearShapeExponentModel,
  LocalMlWearShapeExponentResult,
} from "./localMlSizing";
import type { MeshShapePredictionRow } from "./meshShapeProviders";
import type { PoseResult } from "../types";

export type PhotoShapeRowKind = "waist" | "trouserWaist" | "hips";
export type PhotoBodyType = "auto" | "hourglass" | "rectangle" | "pear" | "apple" | "curvy";
export type ResolvedPhotoBodyType = Exclude<PhotoBodyType, "auto">;
export type PhotoCrossSectionHint = "auto" | "oval" | "between" | "boxy";

export interface PhotoShapeRowInput {
  kind: PhotoShapeRowKind;
  y: number;
  leftX: number;
  rightX: number;
}

export interface PhotoSilhouetteRowEvidence {
  kind: PhotoShapeRowKind;
  sampleCount: number;
  expectedSampleCount: number;
  maskWidthAtRowPx: number | null;
  redWidthPx: number;
  maskToRedWidthRatio: number | null;
  localCurvePct: number | null;
  centerDriftPct: number;
  widthNoisePct: number;
  evidenceQuality: number;
  contaminated: boolean;
}

export interface PhotoSilhouetteEvidence {
  detectedBodyType: ResolvedPhotoBodyType;
  bodyTypeConfidence: number;
  maskQuality: number;
  waistToHipRatio: number;
  shoulderToHipRatio: number | null;
  rows: PhotoSilhouetteRowEvidence[];
  warnings: string[];
}

export interface PhotoBodyShapeExponentResult {
  exponent: number;
  accepted: boolean;
  confidenceLabel: "high" | "check" | "low";
  evidenceConfidence: number;
  metaExponent: number;
  wearExponent: number | null;
  hintExponent: number | null;
  metaWeight: number;
  wearWeight: number;
  hintWeight: number;
  selectedBodyType: ResolvedPhotoBodyType;
  detectedBodyType: ResolvedPhotoBodyType;
  bodyTypeMatchesPhoto: boolean;
  modelDisagreement: number | null;
  reason: string;
}

const HINT_EXPONENTS: Record<Exclude<PhotoCrossSectionHint, "auto">, number> = {
  oval: 2,
  between: 2.6,
  boxy: 3.2,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function median(values: number[]): number {
  if (!values.length) return Number.NaN;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1]! + ordered[middle]!) / 2
    : ordered[middle]!;
}

function findMaskVerticalBounds(pose: PoseResult): { top: number; bottom: number } | null {
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
  const xStep = Math.max(1, Math.floor(pose.maskWidth / 700));
  const yStep = Math.max(1, Math.floor(pose.maskHeight / 900));
  const minimumHits = Math.max(3, Math.floor((pose.maskWidth / xStep) * 0.004));
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < pose.maskHeight; y += yStep) {
    const rowStart = y * pose.maskWidth;
    let hits = 0;
    for (let x = 0; x < pose.maskWidth; x += xStep) {
      if ((pose.mask[rowStart + x] ?? 0) >= 96) hits += 1;
    }
    if (hits < minimumHits) continue;
    if (top < 0) top = y;
    bottom = y;
  }
  return top >= 0 && bottom > top ? { top, bottom } : null;
}

function scanSourceRow(args: {
  pose: PoseResult;
  imageWidth: number;
  imageHeight: number;
  y: number;
  centerX: number;
}): { widthPx: number; centerX: number } | null {
  const { pose, imageWidth, imageHeight, y, centerX } = args;
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
  const maskY = (y / imageHeight) * pose.maskHeight;
  const maskX = (centerX / imageWidth) * pose.maskWidth;
  const bandPx = Math.max(1, Math.round(pose.maskHeight * 0.0015));
  for (const threshold of [128, 96, 64]) {
    const scan = scanMaskBandWidth(
      pose.mask,
      pose.maskWidth,
      pose.maskHeight,
      maskY,
      maskX,
      bandPx,
      threshold,
    );
    if (!scan) continue;
    return {
      widthPx: scan.widthPx * (imageWidth / pose.maskWidth),
      centerX: scan.centerX * (imageWidth / pose.maskWidth),
    };
  }
  return null;
}

function analyzeRow(args: {
  pose: PoseResult;
  imageWidth: number;
  imageHeight: number;
  bodySpanPx: number;
  row: PhotoShapeRowInput;
}): PhotoSilhouetteRowEvidence {
  const { pose, imageWidth, imageHeight, bodySpanPx, row } = args;
  const redWidthPx = Math.max(1, Math.abs(row.rightX - row.leftX));
  const rowCenterX = (row.leftX + row.rightX) / 2;
  const offsetPx = clamp(bodySpanPx * 0.022, imageHeight * 0.008, imageHeight * 0.035);
  const offsets = [-2, -1, 0, 1, 2];
  const scans = offsets.flatMap((offset) => {
    const scan = scanSourceRow({
      pose,
      imageWidth,
      imageHeight,
      y: clamp(row.y + offset * offsetPx, 0, imageHeight - 1),
      centerX: rowCenterX,
    });
    if (!scan) return [];
    const ratioToRed = scan.widthPx / redWidthPx;
    if (ratioToRed < 0.48 || ratioToRed > 1.65) return [];
    return [{ offset, ...scan }];
  });
  const centerScan = scans.find((scan) => scan.offset === 0) ?? null;
  const widths = scans.map((scan) => scan.widthPx);
  const centers = scans.map((scan) => scan.centerX);
  const typicalWidth = median(widths);
  const widthNoisePct = Number.isFinite(typicalWidth) && typicalWidth > 0
    ? median(widths.map((width) => Math.abs(width - typicalWidth))) / typicalWidth * 100
    : 100;
  const centerDriftPct = centers.length && redWidthPx > 0
    ? Math.max(...centers.map((center) => Math.abs(center - rowCenterX))) / redWidthPx * 100
    : 100;
  const above = scans.find((scan) => scan.offset === -2)?.widthPx;
  const below = scans.find((scan) => scan.offset === 2)?.widthPx;
  const centerWidth = centerScan?.widthPx;
  const localCurvePct = above != null && below != null && centerWidth != null && centerWidth > 0
    ? (((above + below) / 2 - centerWidth) / centerWidth) * 100
    : null;
  const maskToRedWidthRatio = centerWidth == null ? null : centerWidth / redWidthPx;
  const contaminated = maskToRedWidthRatio != null
    && (maskToRedWidthRatio < 0.72 || maskToRedWidthRatio > 1.28);
  const coverage = scans.length / offsets.length;
  const noiseScore = Math.exp(-widthNoisePct / 12);
  const centerScore = Math.exp(-centerDriftPct / 12);
  const redAgreementScore = maskToRedWidthRatio == null
    ? 0
    : Math.exp(-Math.abs(maskToRedWidthRatio - 1) / 0.22);
  const evidenceQuality = clamp(
    coverage * 0.35 + noiseScore * 0.25 + centerScore * 0.2 + redAgreementScore * 0.2,
    0,
    1,
  ) * (contaminated ? 0.62 : 1);

  return {
    kind: row.kind,
    sampleCount: scans.length,
    expectedSampleCount: offsets.length,
    maskWidthAtRowPx: centerWidth ?? null,
    redWidthPx,
    maskToRedWidthRatio,
    localCurvePct,
    centerDriftPct,
    widthNoisePct,
    evidenceQuality: clamp(evidenceQuality, 0, 1),
    contaminated,
  };
}

function detectBodyType(args: {
  waistWidth: number;
  trouserWidth: number;
  hipWidth: number;
  shoulderWidth: number | null;
}): { type: ResolvedPhotoBodyType; confidence: number; waistToHipRatio: number; shoulderToHipRatio: number | null } {
  const { waistWidth, trouserWidth, hipWidth, shoulderWidth } = args;
  const waistToHipRatio = waistWidth / hipWidth;
  const trouserToHipRatio = trouserWidth / hipWidth;
  const shoulderToHipRatio = shoulderWidth == null ? null : shoulderWidth / hipWidth;
  let type: ResolvedPhotoBodyType;
  let confidence = 0.58;
  if (waistToHipRatio >= 0.94 || trouserToHipRatio >= 0.99) {
    type = "apple";
    confidence += clamp((Math.max(waistToHipRatio - 0.94, trouserToHipRatio - 0.99)) * 3, 0, 0.25);
  } else if (waistToHipRatio >= 0.86) {
    type = "rectangle";
    confidence += clamp((waistToHipRatio - 0.86) * 2, 0, 0.18);
  } else if (shoulderToHipRatio != null && shoulderToHipRatio < 0.93) {
    type = "pear";
    confidence += clamp((0.93 - shoulderToHipRatio) * 2, 0, 0.24);
  } else if (shoulderToHipRatio != null && Math.abs(shoulderToHipRatio - 1) <= 0.16) {
    type = "hourglass";
    confidence += clamp((0.86 - waistToHipRatio) * 1.5, 0, 0.25);
  } else if (waistToHipRatio < 0.86) {
    type = "curvy";
    confidence = 0.5;
  } else {
    type = "rectangle";
    confidence = 0.42;
  }
  return {
    type,
    confidence: clamp(confidence, 0.35, 0.9),
    waistToHipRatio,
    shoulderToHipRatio,
  };
}

/**
 * Read only visible front-silhouette evidence. This deliberately does not turn
 * a vertical hourglass/pear/rectangle label directly into a hidden horizontal
 * cross-section number. It grades whether the image-conditioned 3D evidence is
 * safe to trust and exposes contamination instead.
 */
export function analyzePhotoSilhouette(args: {
  pose: PoseResult | null | undefined;
  imageWidth: number;
  imageHeight: number;
  rows: PhotoShapeRowInput[];
}): PhotoSilhouetteEvidence | null {
  const { pose, imageWidth, imageHeight, rows } = args;
  if (!pose?.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) return null;
  const rowByKind = Object.fromEntries(rows.map((row) => [row.kind, row])) as Partial<Record<PhotoShapeRowKind, PhotoShapeRowInput>>;
  const waist = rowByKind.waist;
  const trouser = rowByKind.trouserWaist;
  const hips = rowByKind.hips;
  if (!waist || !trouser || !hips) return null;
  const bounds = findMaskVerticalBounds(pose);
  const bodySpanPx = bounds
    ? ((bounds.bottom - bounds.top) / pose.maskHeight) * imageHeight
    : imageHeight * 0.78;
  const rowEvidence = rows.map((row) => analyzeRow({ pose, imageWidth, imageHeight, bodySpanPx, row }));
  const hipWidth = Math.max(1, Math.abs(hips.rightX - hips.leftX));
  const waistWidth = Math.max(1, Math.abs(waist.rightX - waist.leftX));
  const trouserWidth = Math.max(1, Math.abs(trouser.rightX - trouser.leftX));
  const leftShoulder = pose.landmarks[11];
  const rightShoulder = pose.landmarks[12];
  let shoulderWidth: number | null = null;
  if (leftShoulder && rightShoulder && leftShoulder.visibility >= 0.25 && rightShoulder.visibility >= 0.25) {
    const shoulderCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * imageWidth;
    const shoulderY = ((leftShoulder.y + rightShoulder.y) / 2) * imageHeight + bodySpanPx * 0.025;
    const shoulderScan = scanSourceRow({ pose, imageWidth, imageHeight, y: shoulderY, centerX: shoulderCenterX });
    if (shoulderScan && shoulderScan.widthPx >= hipWidth * 0.62 && shoulderScan.widthPx <= hipWidth * 1.45) {
      shoulderWidth = shoulderScan.widthPx;
    }
  }
  const bodyType = detectBodyType({ waistWidth, trouserWidth, hipWidth, shoulderWidth });
  const maskQuality = clamp(median(rowEvidence.map((row) => row.evidenceQuality)), 0, 1);
  const warnings: string[] = [];
  const contaminatedRows = rowEvidence.filter((row) => row.contaminated).map((row) => row.kind);
  if (contaminatedRows.length) warnings.push(`Mask and red endpoints disagree at ${contaminatedRows.join(", ")}.`);
  if (maskQuality < 0.45) warnings.push("Visible silhouette is noisy or partly joined to arms/clothing.");
  if (shoulderWidth == null) warnings.push("Shoulder outline was not clean enough to separate pear from hourglass reliably.");

  return {
    detectedBodyType: bodyType.type,
    bodyTypeConfidence: bodyType.confidence * (0.6 + maskQuality * 0.4),
    maskQuality,
    waistToHipRatio: bodyType.waistToHipRatio,
    shoulderToHipRatio: bodyType.shoulderToHipRatio,
    rows: rowEvidence,
    warnings,
  };
}

/**
 * Combine image-conditioned Meta shape, a WEAR population prior, the visible
 * silhouette quality, and an optional plain-language row-shape hint. No target
 * circumference or named-person answer is accepted by this function.
 */
export function predictPhotoBodyShapeExponent(args: {
  kind: PhotoShapeRowKind;
  silhouette: PhotoSilhouetteEvidence | null;
  meshRow: MeshShapePredictionRow | null;
  wearPrediction: LocalMlWearShapeExponentResult | null;
  wearModel: LocalMlWearShapeExponentModel | null;
  selectedBodyType: PhotoBodyType;
  crossSectionHint: PhotoCrossSectionHint;
}): PhotoBodyShapeExponentResult | null {
  const {
    kind,
    silhouette,
    meshRow,
    wearPrediction,
    wearModel,
    selectedBodyType,
    crossSectionHint,
  } = args;
  if (!silhouette || !meshRow || !Number.isFinite(meshRow.superellipseExponent)) return null;
  const rowEvidence = silhouette.rows.find((row) => row.kind === kind);
  if (!rowEvidence) return null;

  const detectedBodyType = silhouette.detectedBodyType;
  const resolvedBodyType = selectedBodyType === "auto" ? detectedBodyType : selectedBodyType;
  const bodyTypeMatchesPhoto = selectedBodyType === "auto"
    || selectedBodyType === detectedBodyType
    || (detectedBodyType === "curvy" && (selectedBodyType === "hourglass" || selectedBodyType === "pear"));
  const shapeEvidence = meshRow.shapeEvidence;
  const metaStability = shapeEvidence
    ? clamp(shapeEvidence.stability * Math.exp(-shapeEvidence.exponentSpread / 0.8), 0.12, 1)
    : 0.32;
  const silhouetteReliability = clamp(
    silhouette.maskQuality * 0.45 + rowEvidence.evidenceQuality * 0.55,
    0,
    1,
  );
  const wearReliability = wearPrediction && wearModel
    ? clamp(
        Math.sqrt(clamp(wearModel.coveragePct / 100, 0.15, 1))
          / (1 + wearPrediction.outsideTypicalFeatures.length * 0.22),
        0.15,
        1,
      )
    : 0;

  const metaExponent = clamp(meshRow.superellipseExponent, 1.2, 4);
  const wearExponent = wearPrediction ? clamp(wearPrediction.exponent, 1.2, 4) : null;
  const hintExponent = crossSectionHint === "auto" ? null : HINT_EXPONENTS[crossSectionHint];
  let metaRawWeight = 0.72 * metaStability * (0.45 + silhouetteReliability * 0.55);
  let wearRawWeight = wearExponent == null ? 0 : 0.28 * wearReliability;
  const hintRawWeight = hintExponent == null ? 0 : 0.3 * (0.7 + silhouetteReliability * 0.3);

  // A plain-language hint may choose between conflicting model sources, but it
  // remains visibly capped and never becomes an invisible target correction.
  if (hintExponent != null && wearExponent != null) {
    const metaDistance = Math.abs(metaExponent - hintExponent);
    const wearDistance = Math.abs(wearExponent - hintExponent);
    if (metaDistance + 0.2 < wearDistance) wearRawWeight *= 0.25;
    if (wearDistance + 0.2 < metaDistance) metaRawWeight *= 0.6;
  }
  // This source promises that the photo-conditioned model is primary. WEAR is
  // a population guide and may never own more than 35% of the final number.
  wearRawWeight = Math.min(
    wearRawWeight,
    (metaRawWeight + hintRawWeight) * (0.35 / 0.65),
  );
  const totalWeight = metaRawWeight + wearRawWeight + hintRawWeight;
  if (totalWeight <= 0) return null;
  const metaWeight = metaRawWeight / totalWeight;
  const wearWeight = wearRawWeight / totalWeight;
  const hintWeight = hintRawWeight / totalWeight;
  const exponent = clamp(
    metaExponent * metaWeight
      + (wearExponent ?? 0) * wearWeight
      + (hintExponent ?? 0) * hintWeight,
    1.2,
    4,
  );

  const modelDisagreement = wearExponent == null ? null : Math.abs(metaExponent - wearExponent);
  const supportedDistance = hintExponent == null
    ? modelDisagreement ?? 0.5
    : Math.min(
        Math.abs(metaExponent - hintExponent),
        wearExponent == null ? Number.POSITIVE_INFINITY : Math.abs(wearExponent - hintExponent),
      );
  const agreementScore = Math.exp(-0.5 * (supportedDistance / 0.52) ** 2);
  const bodyTypeAgreement = bodyTypeMatchesPhoto ? 1 : 0.72;
  const contaminationPenalty = rowEvidence.contaminated ? 0.62 : 1;
  const outlierPenalty = hintExponent != null && modelDisagreement != null && modelDisagreement > 1 ? 0.84 : 1;
  const evidenceConfidence = clamp(
    (silhouetteReliability * 0.38 + metaStability * 0.34 + agreementScore * 0.28)
      * bodyTypeAgreement
      * contaminationPenalty
      * outlierPenalty,
    0,
    1,
  );
  const conflictAccepted = hintExponent == null
    ? modelDisagreement == null || modelDisagreement <= 0.78
    : supportedDistance <= 0.62;
  const accepted = evidenceConfidence >= 0.42 && conflictAccepted;
  const confidenceLabel = accepted && evidenceConfidence >= 0.7
    ? "high"
    : accepted
      ? "check"
      : "low";
  const reason = accepted
    ? hintExponent == null
      ? "Photo mask is usable and the image model does not strongly conflict with WEAR."
      : "Your visible row-shape hint agrees with at least one image/population source."
    : rowEvidence.contaminated
      ? "The mask does not agree with the red body span at this row."
      : modelDisagreement != null && modelDisagreement > 0.78 && hintExponent == null
        ? "Meta and WEAR disagree too much; choose a visible row-shape hint or use the manual slider."
        : "The photo evidence is too weak to activate this shape number safely.";

  return {
    exponent: Math.round(exponent * 100) / 100,
    accepted,
    confidenceLabel,
    evidenceConfidence,
    metaExponent,
    wearExponent,
    hintExponent,
    metaWeight,
    wearWeight,
    hintWeight,
    selectedBodyType: resolvedBodyType,
    detectedBodyType,
    bodyTypeMatchesPhoto,
    modelDisagreement,
    reason,
  };
}
