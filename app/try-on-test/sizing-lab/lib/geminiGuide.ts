import type { MeasurementDebugRow, MeasurementMaskMode, PoseResult, WaistTrace } from "../types";
import type { HipsTrace } from "./hipsFormula";
import { computePoseScale, measureMaskWidthAtY, type MaskWidthMeasurement } from "./bodyMaskGeometry";
import { ellipseCircumferenceCm } from "./waistFormula";

export const SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION = "curved-source-grid-v25";

export const DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT = [
  "Task: return exactly three measurement curves: waist, trouserWaist, and hips.",
  "You may receive two images of the same person:",
  "Image 1 = source photo. Use it to understand the body without the grid.",
  "Image 2 = the same source photo with the pixel grid overlay. Draw the red curves on Image 2 and return Image 2 pixel coordinates.",
  "If only one image is present, use that image for both visual reading and coordinates.",
  "Return JSON coordinates for the three curves. If this model can return images, also return the annotated grid image with the same three red curves.",
  "The JSON and the red curves must describe the exact same curves from the same response.",
  "Coordinates must be in the grid image sent-pixel coordinate system. The lab scales them back to the original measurement image.",
  "",
  "Definitions:",
  "1. waist = the narrowest part. Check the body and find where the body is the narrowest. Do not use lower belly. Do not use the trouser belt.",
  "2. trouserWaist = check where the body should wear belt. Use the trouser belt/waistband/top opening position on the body. Do not use hips or ass for this.",
  "3. hips = the widest part of ass. Use the widest ass/seat/hip body part, not crotch, thighs, hands, arms, shadows, or loose cloth.",
  "",
  "Be deterministic: if you see the same source/grid again, choose the same waist, trouserWaist, and hips curves. Do not move curves because of wrinkles, shadows, grid lines, labels, or small clothing folds.",
  "If two nearby rows are plausible, use the actual body/clothing meaning above, not a horizontal wrinkle or color boundary.",
  "",
  "Curve rules:",
  "- Draw exactly three red curved lines only: waist, trouserWaist, hips.",
  "- The top red curve is waist. The middle red curve is trouserWaist. The bottom red curve is hips.",
  "- Each red curve must go from the real left body/clothing edge to the real right body/clothing edge at that body part.",
  "- Do not draw short center-only segments. Do not draw extra dots, labels, arrows, masks, or helper lines.",
  "- Waist curve: check the body where it is narrowest. Use that narrowest body position.",
  "- TrouserWaist curve: check where the body should wear belt. Use the trouser belt/waistband/top opening level.",
  "- Hips curve: use the widest part of ass/seat/hip.",
  "- On black fitted tops, corsets, leggings, or high-waisted pants, ignore random compression wrinkles.",
  "- If clothing hides the exact edge, estimate the body edge under fitted clothing. Keep the line inside any loose clothing flare.",
  "- If arms/hands overlap, ignore them and continue the row to the real torso/hip edge behind them.",
  "- The three curves must be ordered top-to-bottom: waist, trouserWaist, hips.",
  "",
  "Common failure to avoid:",
  "- Do not put waist on the lower belly. Waist means the narrowest torso part.",
  "- Do not put trouserWaist on the widest pelvis/ass. TrouserWaist means where the body should wear belt.",
  "- Do not put hips on the waistband or crotch. Hips means widest part of ass.",
  "",
  "Coordinate rule for each curve: return y_px, left_x_px, right_x_px, confidence, and exactly 5 curve points in grid image sent pixels.",
  "left_x_px/right_x_px are the real left/right edge of the curve. Point 1 must be the left edge. Point 5 must be the right edge. Middle points must sit on the same red curve.",
  "Return x_px and y_px for every point. The returned points must sit on the red pixels you draw.",
  "",
  "Coordinates use the image pixel system:",
  "x_px = pixels from left edge",
  "y_px = pixels from top edge",
  "",
  "JSON:",
  "{",
  "  \"waist\": {",
  "    \"y_px\": number,",
  "    \"left_x_px\": number,",
  "    \"right_x_px\": number,",
  "    \"confidence\": number,",
  "    \"points\": [",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number }",
  "    ]",
  "  },",
  "  \"trouserWaist\": {",
  "    \"y_px\": number,",
  "    \"left_x_px\": number,",
  "    \"right_x_px\": number,",
  "    \"confidence\": number,",
  "    \"points\": [",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number }",
  "    ]",
  "  },",
  "  \"hips\": {",
  "    \"y_px\": number,",
  "    \"left_x_px\": number,",
  "    \"right_x_px\": number,",
  "    \"confidence\": number,",
  "    \"points\": [",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number },",
  "      { \"x_px\": number, \"y_px\": number }",
  "    ]",
  "  }",
  "}",
].join("\n");

export interface GeminiGuideLine {
  y_px?: number;
  left_x_px?: number;
  right_x_px?: number;
  points?: Array<{ x_px: number; y_px: number }>;
  y_percent?: number;
  left_x_percent?: number;
  right_x_percent?: number;
  confidence: number;
}

export interface GeminiBodyGuide {
  waist?: GeminiGuideLine;
  trouserWaist?: GeminiGuideLine;
  hips?: GeminiGuideLine;
  occlusion?: {
    hair_blocks_torso?: boolean;
    hands_near_hips?: boolean;
    loose_clothing?: boolean;
  };
  notes?: string;
}

export interface GeminiGuideMeasurementRow {
  kind: "waist" | "trouserWaist" | "hips";
  label: string;
  rowSource: "red-pixel-detector" | "gemini-json" | "pose-mask-fallback";
  yPx: number;
  leftXPx: number;
  rightXPx: number;
  yNorm: number;
  leftXNorm: number;
  rightXNorm: number;
  points: Array<{ xPx: number; yPx: number; xNorm: number; yNorm: number }>;
  confidence: number;
  geminiWidthCm: number;
  formulaWidthCm: number;
  formulaWidthSource: "mask-at-gemini-row" | "gemini-red-line" | "gemini-json-endpoints" | "fallback-line";
  formulaLeftXNorm: number;
  formulaRightXNorm: number;
  depthSource: "side-mask-at-guide-row" | "front-formula";
  depthRatio: number;
  depthCm: number;
  maskWidthCm: number | null;
  rawCm: number;
  guidedCm: number;
  circumferenceDeltaCm: number;
}

export interface GeminiGuideMeasurement {
  guide: GeminiBodyGuide;
  waist: GeminiGuideMeasurementRow | null;
  trouserWaist: GeminiGuideMeasurementRow | null;
  hips: GeminiGuideMeasurementRow | null;
  rows: GeminiGuideMeasurementRow[];
  debugRows: MeasurementDebugRow[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, d = 1): number {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeLine(line: GeminiGuideLine | undefined, imageWidth: number, imageHeight: number): {
  yPx: number;
  leftXPx: number;
  rightXPx: number;
  yNorm: number;
  leftXNorm: number;
  rightXNorm: number;
  points: Array<{ xPx: number; yPx: number; xNorm: number; yNorm: number }>;
  confidence: number;
} | null {
  if (!line) return null;
  const yPxRaw = numeric(line.y_px) ?? (numeric(line.y_percent) == null ? null : numeric(line.y_percent)! / 100 * imageHeight);
  const leftXPxRaw = numeric(line.left_x_px) ?? (numeric(line.left_x_percent) == null ? null : numeric(line.left_x_percent)! / 100 * imageWidth);
  const rightXPxRaw = numeric(line.right_x_px) ?? (numeric(line.right_x_percent) == null ? null : numeric(line.right_x_percent)! / 100 * imageWidth);
  if (yPxRaw == null || leftXPxRaw == null || rightXPxRaw == null || imageWidth <= 0 || imageHeight <= 0) return null;
  const yPx = clamp(yPxRaw, 0, imageHeight - 1);
  const sortedLeftXPx = Math.min(leftXPxRaw, rightXPxRaw);
  const sortedRightXPx = Math.max(leftXPxRaw, rightXPxRaw);
  const leftXPx = clamp(sortedLeftXPx, 0, imageWidth - 1);
  const rightXPx = clamp(sortedRightXPx, 0, imageWidth - 1);
  const yNorm = clamp(yPx / imageHeight, 0.02, 0.98);
  const leftXNorm = clamp(leftXPx / imageWidth, 0.02, 0.98);
  const rightXNorm = clamp(rightXPx / imageWidth, 0.02, 0.98);
  if (rightXNorm <= leftXNorm) return null;
  const points = Array.isArray(line.points)
    ? line.points
        .filter((point) => Number.isFinite(point.x_px) && Number.isFinite(point.y_px))
        .map((point) => {
          const xPx = clamp(point.x_px, 0, imageWidth - 1);
          const yPxForPoint = clamp(point.y_px, 0, imageHeight - 1);
          return {
            xPx: Math.round(xPx),
            yPx: Math.round(yPxForPoint),
            xNorm: clamp(xPx / imageWidth, 0.02, 0.98),
            yNorm: clamp(yPxForPoint / imageHeight, 0.02, 0.98),
          };
        })
    : [];
  return {
    yPx: Math.round(yPx),
    leftXPx: Math.round(leftXPx),
    rightXPx: Math.round(rightXPx),
    yNorm,
    leftXNorm,
    rightXNorm,
    points,
    confidence: clamp(line.confidence, 0, 1),
  };
}

function measureGuideMaskWidth(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  cmPerPx: number,
  yNorm: number,
  centerXNorm: number,
  maskMode: MeasurementMaskMode,
): MaskWidthMeasurement | null {
  const measured = measureMaskWidthAtY(
    pose,
    imageWidth,
    imageHeight,
    cmPerPx,
    yNorm,
    centerXNorm,
    3,
    maskMode === "ignore-arms"
      ? { excludeLimbs: true, segmentMode: "center-walk", exclusionMode: "limb-capsules" }
      : { excludeLimbs: false, segmentMode: "widest", exclusionMode: "none" },
  );
  return measured ?? null;
}

function lineFromNormRow(args: {
  yNorm: number | undefined;
  leftXNorm: number | undefined;
  rightXNorm: number | undefined;
  imageWidth: number;
  imageHeight: number;
  confidence: number;
}): GeminiGuideLine | undefined {
  const { yNorm, leftXNorm, rightXNorm, imageWidth, imageHeight, confidence } = args;
  if (yNorm == null || leftXNorm == null || rightXNorm == null) return undefined;
  if (!Number.isFinite(yNorm) || !Number.isFinite(leftXNorm) || !Number.isFinite(rightXNorm)) return undefined;
  const left = clamp(Math.min(leftXNorm, rightXNorm), 0.02, 0.98);
  const right = clamp(Math.max(leftXNorm, rightXNorm), 0.02, 0.98);
  if (right <= left) return undefined;
  const y = clamp(yNorm, 0.02, 0.98);
  const leftXPx = left * imageWidth;
  const rightXPx = right * imageWidth;
  const yPx = y * imageHeight;
  return {
    y_px: yPx,
    left_x_px: leftXPx,
    right_x_px: rightXPx,
    confidence,
    points: [
      { x_px: leftXPx, y_px: yPx },
      { x_px: (leftXPx + rightXPx) / 2, y_px: yPx },
      { x_px: rightXPx, y_px: yPx },
    ],
  };
}

function waistTraceFallbackLine(
  trace: WaistTrace,
  kind: "waist" | "trouserWaist",
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine | undefined {
  return lineFromNormRow({
    yNorm: kind === "waist" ? trace.naturalWaistYNorm : trace.trouserWaistYNorm,
    leftXNorm: kind === "waist" ? trace.naturalWaistLeftXNorm : trace.trouserWaistLeftXNorm,
    rightXNorm: kind === "waist" ? trace.naturalWaistRightXNorm : trace.trouserWaistRightXNorm,
    imageWidth,
    imageHeight,
    confidence: 0.55,
  });
}

function hipsTraceFallbackLine(
  hipsTrace: HipsTrace | null,
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine | undefined {
  const row =
    hipsTrace?.debugRows.find((candidate) => candidate.id === "hip-widest-band") ??
    hipsTrace?.debugRows.find((candidate) => candidate.id === "hip-selected");
  return lineFromNormRow({
    yNorm: row?.yNorm,
    leftXNorm: row?.leftXNorm,
    rightXNorm: row?.rightXNorm,
    imageWidth,
    imageHeight,
    confidence: 0.55,
  });
}

function guideLineYNorm(line: GeminiGuideLine | undefined, imageWidth: number, imageHeight: number): number | null {
  return normalizeLine(line, imageWidth, imageHeight)?.yNorm ?? null;
}

function guideWaistDepthRatio(args: {
  gender: HipsTrace["gender"];
  bmi: number;
  waistGuideWidthCm: number;
  hipBoneCm: number;
}): number {
  const { gender, bmi, waistGuideWidthCm, hipBoneCm } = args;
  const lineToHipBone = hipBoneCm > 0 ? waistGuideWidthCm / hipBoneCm : 1.6;

  if (gender === "female") {
    const ratio =
      0.55 +
      0.004 * (bmi - 22) +
      0.02 * clamp(lineToHipBone - 1.4, 0, 0.5);
    return clamp(ratio, 0.5, 0.62);
  }

  const ratio =
    0.535 +
    0.007 * (bmi - 24) +
    0.015 * clamp(lineToHipBone - 1.55, 0, 0.5);
  return clamp(ratio, 0.42, 0.62);
}

function guideHipDepthRatio(args: {
  hipsTrace: HipsTrace;
  hipGuideWidthCm: number;
  waistGuideWidthCm: number | null;
  fallbackRatio: number;
}): number {
  const { hipsTrace, hipGuideWidthCm, waistGuideWidthCm } = args;
  if (hipGuideWidthCm <= 0) return args.fallbackRatio || 0.5;

  if (hipsTrace.sideHipDepthCm > 0) {
    return clamp(hipsTrace.sideHipDepthCm / hipGuideWidthCm, 0.35, 0.9);
  }

  const lineToHipBone = hipsTrace.hipBoneCm > 0 ? hipGuideWidthCm / hipsTrace.hipBoneCm : 1.7;
  const hipToWaistLine = waistGuideWidthCm && waistGuideWidthCm > 0
    ? hipGuideWidthCm / waistGuideWidthCm
    : 1.08;

  if (hipsTrace.gender === "female") {
    // Front-only guide mode has no real depth. This lab heuristic is driven by
    // visible hip breadth, hip-bone scale, waist-to-hip shape, and BMI so the
    // UI can show the uncertainty instead of hiding it behind the red line.
    const ratio =
      0.569 +
      0.021 * (hipsTrace.bmi - 22) -
      0.023 * (hipGuideWidthCm - 38) +
      0.107 * (hipToWaistLine - 1.25) +
      0.745 * (lineToHipBone - 1.9);
    return clamp(ratio, 0.45, 0.78);
  }

  const ratio =
    0.38 +
    0.006 * (hipsTrace.bmi - 26) +
    0.04 * clamp(hipToWaistLine - 1.1, 0, 0.35) -
    0.03 * clamp(lineToHipBone - 2.1, 0, 0.5);
  return clamp(ratio, 0.35, 0.52);
}

function guideTrouserWaistDepthRatio(args: {
  gender: HipsTrace["gender"];
  bmi: number;
  trouserGuideWidthCm: number;
  hipBoneCm: number;
  fallbackRatio: number;
}): number {
  const { gender, bmi, trouserGuideWidthCm, hipBoneCm, fallbackRatio } = args;
  const lineToHipBone = hipBoneCm > 0 ? trouserGuideWidthCm / hipBoneCm : 1.55;

  if (gender === "male") {
    const ratio = 4.43 - 2.45 * lineToHipBone + 0.012 * (bmi - 26);
    const bmiFloor = 0.36 + 0.055 * clamp(bmi - 25.5, 0, 3);
    return clamp(Math.max(ratio, bmiFloor), 0.35, 1.1);
  }

  const ratio = fallbackRatio + 0.2 * clamp(1.5 - lineToHipBone, 0, 0.4);
  return clamp(ratio, 0.45, 0.95);
}

function buildGuideRow(args: {
  kind: "waist" | "trouserWaist" | "hips";
  label: string;
  line: GeminiGuideLine | undefined;
  rowSource?: GeminiGuideMeasurementRow["rowSource"];
  pose: PoseResult;
  imageWidth: number;
  imageHeight: number;
  cmPerPx: number;
  depthRatio: number | ((geminiWidthCm: number) => number);
  depthRatioBounds?: { min: number; max: number };
  sideDepthCm?: (line: {
    yNorm: number;
    leftXNorm: number;
    rightXNorm: number;
    centerXNorm: number;
  }) => number | null;
  rawCm: number;
  maskMode: MeasurementMaskMode;
}): GeminiGuideMeasurementRow | null {
  const normalized = normalizeLine(args.line, args.imageWidth, args.imageHeight);
  if (!normalized || args.rawCm <= 0 || args.cmPerPx <= 0) return null;
  const rowSource = args.rowSource ?? "gemini-json";
  const centerXNorm = (normalized.leftXNorm + normalized.rightXNorm) / 2;
  const geminiWidthCm = (normalized.rightXNorm - normalized.leftXNorm) * args.imageWidth * args.cmPerPx;
  if (geminiWidthCm <= 0) return null;
  const maskMeasurement = measureGuideMaskWidth(
    args.pose,
    args.imageWidth,
    args.imageHeight,
    args.cmPerPx,
    normalized.yNorm,
    centerXNorm,
    args.maskMode,
  );
  const maskWidthCm = maskMeasurement?.widthCm ?? null;
  const selectedFormulaWidthCm = geminiWidthCm;
  if (selectedFormulaWidthCm <= 0) return null;
  const formulaLeftXNorm = normalized.leftXNorm;
  const formulaRightXNorm = normalized.rightXNorm;
  const formulaCenterXNorm = (formulaLeftXNorm + formulaRightXNorm) / 2;
  const activeLeftXPx = normalized.leftXPx;
  const activeRightXPx = normalized.rightXPx;
  const activePoints = normalized.points.map((point) => ({
    xPx: point.xPx,
    yPx: point.yPx,
    xNorm: round(point.xNorm, 4),
    yNorm: round(point.yNorm, 4),
  }));
  const formulaWidthSource: GeminiGuideMeasurementRow["formulaWidthSource"] = rowSource === "red-pixel-detector"
    ? "gemini-red-line"
    : rowSource === "pose-mask-fallback"
      ? "fallback-line"
      : "gemini-json-endpoints";
  const depthRatio = typeof args.depthRatio === "function"
    ? args.depthRatio(selectedFormulaWidthCm)
    : args.depthRatio;
  const depthRatioBounds = args.depthRatioBounds ?? { min: 0.35, max: 0.8 };
  const sideDepthCm = args.sideDepthCm?.({
    yNorm: normalized.yNorm,
    leftXNorm: formulaLeftXNorm,
    rightXNorm: formulaRightXNorm,
    centerXNorm: formulaCenterXNorm,
  }) ?? null;
  const sideDepthRatio = sideDepthCm && selectedFormulaWidthCm > 0
    ? sideDepthCm / selectedFormulaWidthCm
    : 0;
  const useSideDepth = sideDepthCm != null &&
    sideDepthCm > 0 &&
    sideDepthRatio >= depthRatioBounds.min &&
    sideDepthRatio <= depthRatioBounds.max;
  const boundedDepthRatio = useSideDepth
    ? sideDepthRatio
    : clamp(depthRatio, depthRatioBounds.min, depthRatioBounds.max);
  const depthCm = useSideDepth ? sideDepthCm : selectedFormulaWidthCm * boundedDepthRatio;
  const guidedCm = ellipseCircumferenceCm(selectedFormulaWidthCm, depthCm);

  return {
    kind: args.kind,
    label: args.label,
    rowSource,
    yPx: normalized.yPx,
    leftXPx: activeLeftXPx,
    rightXPx: activeRightXPx,
    yNorm: round(normalized.yNorm, 4),
    leftXNorm: round(formulaLeftXNorm, 4),
    rightXNorm: round(formulaRightXNorm, 4),
    points: activePoints,
    confidence: round(normalized.confidence, 2),
    geminiWidthCm: round(geminiWidthCm, 1),
    formulaWidthCm: round(selectedFormulaWidthCm, 1),
    formulaWidthSource,
    formulaLeftXNorm: round(formulaLeftXNorm, 4),
    formulaRightXNorm: round(formulaRightXNorm, 4),
    depthSource: useSideDepth ? "side-mask-at-guide-row" : "front-formula",
    depthRatio: round(boundedDepthRatio, 3),
    depthCm: round(depthCm, 1),
    maskWidthCm: maskWidthCm == null ? null : round(maskWidthCm, 1),
    rawCm: round(args.rawCm, 1),
    guidedCm: round(guidedCm, 1),
    circumferenceDeltaCm: round(guidedCm - args.rawCm, 1),
  };
}

export function computeGeminiGuideMeasurement(args: {
  guide: GeminiBodyGuide | null;
  guideSource?: string | null;
  pose: PoseResult | null;
  imageWidth: number;
  imageHeight: number;
  sidePose?: PoseResult | null;
  sideImageWidth?: number;
  sideImageHeight?: number;
  maskMode: MeasurementMaskMode;
  waistTrace: WaistTrace | null;
  hipsTrace: HipsTrace | null;
}): GeminiGuideMeasurement | null {
  const { guide, pose, waistTrace, hipsTrace } = args;
  if (!guide || !pose || !waistTrace) return null;
  const usesRedPixelGuide = typeof args.guideSource === "string" && args.guideSource.startsWith("red-pixel-detector");
  const usesGeminiJsonGuide = typeof args.guideSource === "string" && args.guideSource.startsWith("gemini-json");
  const frontScale = computePoseScale(pose, args.imageWidth, args.imageHeight, waistTrace.heightCm);
  const sideScale = args.sidePose && args.sideImageWidth && args.sideImageHeight
    ? computePoseScale(args.sidePose, args.sideImageWidth, args.sideImageHeight, waistTrace.heightCm)
    : null;
  let waistLine = guide.waist;
  let trouserWaistLine = guide.trouserWaist;
  let hipsLine = guide.hips;
  let waistRowSource: GeminiGuideMeasurementRow["rowSource"] = usesRedPixelGuide ? "red-pixel-detector" : "gemini-json";
  let trouserWaistRowSource: GeminiGuideMeasurementRow["rowSource"] = usesRedPixelGuide ? "red-pixel-detector" : "gemini-json";
  let hipsRowSource: GeminiGuideMeasurementRow["rowSource"] = usesRedPixelGuide ? "red-pixel-detector" : "gemini-json";

  if (frontScale && !usesRedPixelGuide && !usesGeminiJsonGuide) {
    const torsoSpanNorm = Math.max(0.04, frontScale.hipYNorm - frontScale.shoulderYNorm);
    const legSpanNorm = Math.max(0.08, frontScale.bottomYNorm - frontScale.hipYNorm);
    const minSpacingNorm = Math.max(0.025, torsoSpanNorm * 0.13);

    const waistYNorm = guideLineYNorm(waistLine, args.imageWidth, args.imageHeight);
    const waistMinYNorm = frontScale.shoulderYNorm + torsoSpanNorm * 0.32;
    const waistMaxYNorm = frontScale.hipYNorm + torsoSpanNorm * 0.10;
    if (waistYNorm == null || waistYNorm < waistMinYNorm || waistYNorm > waistMaxYNorm) {
      const fallback = waistTraceFallbackLine(waistTrace, "waist", args.imageWidth, args.imageHeight);
      if (fallback) {
        waistLine = fallback;
        waistRowSource = "pose-mask-fallback";
      }
    }

    const effectiveWaistYNorm = guideLineYNorm(waistLine, args.imageWidth, args.imageHeight);
    const trouserWaistYNorm = guideLineYNorm(trouserWaistLine, args.imageWidth, args.imageHeight);
    const trouserMinYNorm = Math.max(
      frontScale.shoulderYNorm + torsoSpanNorm * 0.50,
      effectiveWaistYNorm == null ? 0 : effectiveWaistYNorm + minSpacingNorm,
    );
    const trouserMaxYNorm = frontScale.hipYNorm + Math.min(legSpanNorm * 0.08, torsoSpanNorm * 0.18);
    if (trouserWaistYNorm == null || trouserWaistYNorm < trouserMinYNorm || trouserWaistYNorm > trouserMaxYNorm) {
      const fallback = waistTraceFallbackLine(waistTrace, "trouserWaist", args.imageWidth, args.imageHeight);
      if (fallback) {
        trouserWaistLine = fallback;
        trouserWaistRowSource = "pose-mask-fallback";
      }
    }

    const effectiveTrouserYNorm = guideLineYNorm(trouserWaistLine, args.imageWidth, args.imageHeight);
    const hipsYNorm = guideLineYNorm(hipsLine, args.imageWidth, args.imageHeight);
    const hipsMinYNorm = Math.max(
      frontScale.hipYNorm - torsoSpanNorm * 0.12,
      effectiveTrouserYNorm == null ? 0 : effectiveTrouserYNorm + Math.max(0.035, torsoSpanNorm * 0.16),
    );
    const hipsMaxYNorm = frontScale.hipYNorm + legSpanNorm * 0.24;
    if (hipsYNorm == null || hipsYNorm < hipsMinYNorm || hipsYNorm > hipsMaxYNorm) {
      const fallback = hipsTraceFallbackLine(hipsTrace, args.imageWidth, args.imageHeight);
      if (fallback) {
        hipsLine = fallback;
        hipsRowSource = "pose-mask-fallback";
      }
    }
  }

  const measureSideDepthAtFrontY = (frontYNorm: number, rowKind: "waist" | "trouserWaist" | "hips" = "hips"): number | null => {
    if (!args.sidePose || !args.sideImageWidth || !args.sideImageHeight || !frontScale || !sideScale) return null;
    if (!args.sidePose.mask || args.sidePose.maskWidth <= 0 || args.sidePose.maskHeight <= 0) return null;
    const sideYNorm = frontYNorm <= frontScale.hipYNorm
      ? sideScale.shoulderYNorm +
        ((frontYNorm - frontScale.shoulderYNorm) / Math.max(0.01, frontScale.hipYNorm - frontScale.shoulderYNorm)) *
          (sideScale.hipYNorm - sideScale.shoulderYNorm)
      : sideScale.hipYNorm +
        ((frontYNorm - frontScale.hipYNorm) / Math.max(0.01, frontScale.bottomYNorm - frontScale.hipYNorm)) *
          (sideScale.bottomYNorm - sideScale.hipYNorm);
    const maskOptions = args.maskMode === "ignore-arms"
      ? { excludeLimbs: true, segmentMode: "widest" as const, exclusionMode: "hands" as const }
      : { excludeLimbs: false, segmentMode: "widest" as const, exclusionMode: "none" as const };
    const legSpanNorm = Math.max(0.08, sideScale.bottomYNorm - sideScale.hipYNorm);
    const scanStartYNorm = rowKind === "hips"
      ? clamp(sideYNorm - 0.035, 0.02, 0.98)
      : clamp(sideYNorm - Math.max(0.018, Math.min(0.055, legSpanNorm * 0.12)), 0.02, 0.98);
    const scanEndYNorm = rowKind === "hips"
      ? clamp(sideYNorm + Math.min(0.18, legSpanNorm * 0.34), scanStartYNorm, 0.98)
      : clamp(sideYNorm + Math.max(0.018, Math.min(0.055, legSpanNorm * 0.12)), scanStartYNorm, 0.98);
    let bestWidthCm = 0;
    const steps = rowKind === "hips" ? 18 : 10;
    for (let i = 0; i <= steps; i++) {
      const measured = measureMaskWidthAtY(
        args.sidePose,
        args.sideImageWidth,
        args.sideImageHeight,
        sideScale.cmPerPx,
        scanStartYNorm + ((scanEndYNorm - scanStartYNorm) * i) / steps,
        sideScale.hipCenterXNorm,
        3,
        maskOptions,
      );
      if (measured && measured.widthCm > bestWidthCm) bestWidthCm = measured.widthCm;
    }
    return bestWidthCm > 0 ? bestWidthCm : null;
  };
  const waist = buildGuideRow({
    kind: "waist",
    label: "Gemini waist row",
    line: waistLine,
    rowSource: waistRowSource,
    pose,
    imageWidth: args.imageWidth,
    imageHeight: args.imageHeight,
    cmPerPx: waistTrace.cmPerPx,
    depthRatio: (waistGuideWidthCm) => hipsTrace
      ? guideWaistDepthRatio({
          gender: hipsTrace.gender,
          bmi: hipsTrace.bmi,
          waistGuideWidthCm,
          hipBoneCm: hipsTrace.hipBoneCm,
        })
      : waistTrace.naturalWaistDepthRatio,
    rawCm: waistTrace.finalNaturalWaistCm,
    maskMode: args.maskMode,
  });
  const trouserWaist = buildGuideRow({
    kind: "trouserWaist",
    label: "Gemini trouser waist row",
    line: trouserWaistLine,
    rowSource: trouserWaistRowSource,
    pose,
    imageWidth: args.imageWidth,
    imageHeight: args.imageHeight,
    cmPerPx: waistTrace.cmPerPx,
    depthRatio: (trouserGuideWidthCm) => hipsTrace
      ? guideTrouserWaistDepthRatio({
          gender: hipsTrace.gender,
          bmi: hipsTrace.bmi,
          trouserGuideWidthCm,
          hipBoneCm: hipsTrace.hipBoneCm || waistTrace.hipBoneCm,
          fallbackRatio: waistTrace.depthRatio,
        })
      : waistTrace.depthRatio,
    depthRatioBounds: { min: 0.35, max: 1.1 },
    rawCm: waistTrace.finalTrouserWaistCm,
    maskMode: args.maskMode,
  });

  const hipDepthRatio = hipsTrace?.hipBreadthCm
    ? hipsTrace.hipDepthCm / hipsTrace.hipBreadthCm
    : 0.5;
  const waistGuideWidthCm = waist?.formulaWidthCm ?? null;
  const hips = hipsTrace
    ? buildGuideRow({
        kind: "hips",
        label: "Gemini hip row",
        line: hipsLine,
        rowSource: hipsRowSource,
        pose,
        imageWidth: args.imageWidth,
        imageHeight: args.imageHeight,
        cmPerPx: waistTrace.cmPerPx,
        depthRatio: (hipGuideWidthCm) => guideHipDepthRatio({
            hipsTrace,
            hipGuideWidthCm,
            waistGuideWidthCm,
            fallbackRatio: hipDepthRatio || 0.5,
          }),
        sideDepthCm: (line) => measureSideDepthAtFrontY(line.yNorm, "hips"),
        depthRatioBounds: { min: 0.35, max: 0.9 },
        rawCm: hipsTrace.hipsCm,
        maskMode: args.maskMode,
      })
    : null;

  const rows = [waist, trouserWaist, hips].filter((row): row is GeminiGuideMeasurementRow => Boolean(row));
  if (!rows.length) return null;

  return {
    guide,
    waist,
    trouserWaist,
    hips,
    rows,
    debugRows: rows.map((row) => ({
      id: `${row.rowSource === "pose-mask-fallback" ? "fallback-guide" : "gemini-guide"}-${row.kind}`,
      label: row.kind === "waist"
        ? row.rowSource === "pose-mask-fallback" ? "fallback waist guide" : "Gemini waist guide"
        : row.kind === "trouserWaist"
          ? row.rowSource === "pose-mask-fallback" ? "fallback trouser waist guide" : "Gemini trouser waist guide"
          : row.rowSource === "pose-mask-fallback" ? "fallback hip guide" : "Gemini hip guide",
      yNorm: row.yNorm,
      leftXNorm: row.formulaLeftXNorm,
      rightXNorm: row.formulaRightXNorm,
      widthCm: row.formulaWidthCm,
      color: row.rowSource === "pose-mask-fallback" ? "#f97316" : "#ef4444",
      selected: true,
      dashed: false,
    })),
  };
}
