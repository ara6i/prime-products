import type { MeasurementDebugRow, MeasurementMaskMode, PoseResult, WaistTrace } from "../types";
import type { HipsTrace } from "./hipsFormula";
import { computeMaskHeightScale, computePoseScale, measureMaskWidthAtY, type MaskWidthMeasurement } from "./bodyMaskGeometry";
import { estimateDepthRatioFromTable, type DepthRatioTableEstimate } from "./depthRatioTable";
import { ellipseCircumferenceCm } from "./waistFormula";

export const SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION = "anatomical-source-grid-v26";
export const SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT_VERSION = "side-anatomical-depth-grid-v1";
export const NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION = "negar-2-meter-rows-v2";
export const NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION = "negar-4-meter-rows-v1";

export const NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT = [
  "Task",
  "",
  "This prompt is for local Negar 2 grid-row verification only.",
  "Use the grid lines as reference and draw exactly three red curved guide lines.",
  "Limit each red curve within the model's visible body/clothing boundary.",
  "",
  "Draw red curved guide lines on these exact horizontal grid y_px rows:",
  "",
  "line 1 is natural waist on grid line 644.",
  "line 2 is trouser waist on grid line 708.",
  "line 3 is hips on grid line 816.",
  "",
  "Rules:",
  "",
  "- Each curve must cross the requested horizontal grid row exactly.",
  "- Extend each curve to the true left and right body/clothing boundaries at that same body level.",
  "- Do not use the normal anatomical vertical row search for this sample.",
  "- Do not move, blur, rewrite, or cover the tape numbers.",
  "- Do not draw labels, dots, helper lines, masks, or extra marks.",
  "- Return JSON points that exactly match the three red guide curves.",
  "",
  "Return exactly this JSON shape:",
  "{",
  "  \"line 1\": { \"y_px\": 644, \"left_x_px\": number, \"right_x_px\": number, \"confidence\": number, \"points\": [{ \"x_px\": number, \"y_px\": number }] },",
  "  \"line 2\": { \"y_px\": 708, \"left_x_px\": number, \"right_x_px\": number, \"confidence\": number, \"points\": [{ \"x_px\": number, \"y_px\": number }] },",
  "  \"line 3\": { \"y_px\": 816, \"left_x_px\": number, \"right_x_px\": number, \"confidence\": number, \"points\": [{ \"x_px\": number, \"y_px\": number }] }",
  "}",
].join("\n");

export const NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT = [
  "Task",
  "",
  "This prompt is for local Negar 4 grid-row verification only.",
  "Use the grid lines as reference and draw exactly three red curved guide lines.",
  "Limit each red curve within the model's visible body/clothing boundary.",
  "",
  "Draw red curved lines on these exact horizontal grid y_px rows:",
  "",
  "line 1 is on grid line 775.",
  "line 2 is on grid line 875.",
  "line 3 is on grid line 1050.",
  "",
  "Rules:",
  "",
  "- Each curve must cross the requested horizontal grid line exactly.",
  "- Each curve must also cross the visible measuring tape at the same y level.",
  "- Then extend that curve to the true left and right body/clothing boundaries at that same body level.",
  "- Do not use the normal anatomical vertical row search for this sample.",
  "- Do not move, blur, rewrite, or cover the tape numbers.",
  "- Do not draw labels, dots, helper lines, masks, or extra marks.",
  "- Return JSON points that exactly match the three red curves.",
  "",
  "Return exactly this JSON shape:",
  "{",
  "  \"line 1\": { \"y_px\": 775, \"left_x_px\": number, \"right_x_px\": number, \"confidence\": number, \"points\": [{ \"x_px\": number, \"y_px\": 775 }] },",
  "  \"line 2\": { \"y_px\": 875, \"left_x_px\": number, \"right_x_px\": number, \"confidence\": number, \"points\": [{ \"x_px\": number, \"y_px\": 875 }] },",
  "  \"line 3\": { \"y_px\": 1050, \"left_x_px\": number, \"right_x_px\": number, \"confidence\": number, \"points\": [{ \"x_px\": number, \"y_px\": 1050 }] }",
  "}",
].join("\n");

export const DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT = [
  "Task",
  "",
  "Identify the correct anatomical waist, trouserWaist, and hips landmarks, then return exactly three measurement curves:",
  "",
  "1. waist",
  "2. trouserWaist",
  "3. hips",
  "",
  "You may receive two images of the same person:",
  "",
  "Image 1 = original source image without a grid.",
  "Use this image to understand the person's anatomy and clothing.",
  "",
  "Image 2 = the same image with a pixel grid overlay.",
  "Draw the three red curves on Image 2 and return all coordinates using Image 2's pixel coordinate system.",
  "",
  "If only one image is present, use that image for both visual reading and coordinates.",
  "",
  "Return:",
  "",
  "- JSON containing the three measurement curves.",
  "- If image output is supported, also return the annotated grid image with exactly the same three red curves.",
  "",
  "The JSON coordinates and the red curves MUST represent the exact same curves.",
  "Coordinates must use the pixel coordinate system of the supplied grid image.",
  "",
  "--------------------------------------------------",
  "LANDMARK DEFINITIONS",
  "--------------------------------------------------",
  "",
  "1. waist",
  "",
  "The waist is the anatomically narrowest part of the torso.",
  "Use the body's natural narrowing.",
  "Do NOT use lower belly, abdomen bulge, trouser waistband, belt, wrinkles, folds, shadows, compression marks.",
  "",
  "2. trouserWaist",
  "",
  "The trouserWaist is where trousers are intended to be worn.",
  "Use waistband, belt position, or top opening of the trousers.",
  "Do NOT use widest pelvis, hips, or buttocks.",
  "",
  "3. hips",
  "",
  "The hips are the widest part of the seat/buttocks.",
  "Do NOT use crotch, thighs, hands, arms, shadows, loose clothing, or temporary folds.",
  "",
  "--------------------------------------------------",
  "UNDERLYING BODY INTERPRETATION",
  "--------------------------------------------------",
  "",
  "Identify the underlying body anatomy rather than temporary surface appearance.",
  "Treat fitted garments as though the fabric were perfectly smooth.",
  "Ignore wrinkles, folds, fabric bunching, compression marks, stretch lines, temporary deformation, shadows, highlights, lighting changes, logos, printed patterns, fabric texture, stitching, JPEG artifacts, and image noise.",
  "These features are NOT anatomical landmarks.",
  "Estimate the smooth underlying garment contour that best represents the body beneath the clothing.",
  "Never allow temporary wrinkles, folds, seams, shadows, or texture to change the selected anatomical landmark.",
  "",
  "--------------------------------------------------",
  "LANDMARK PRIORITY",
  "--------------------------------------------------",
  "",
  "Always determine landmarks using the following priority:",
  "",
  "1. Underlying body anatomy",
  "2. Overall garment silhouette",
  "3. Waistband location only for trouserWaist",
  "4. Permanent garment construction",
  "5. Temporary wrinkles",
  "6. Temporary folds",
  "7. Shadows",
  "8. Lighting",
  "9. Fabric texture",
  "",
  "Lower-priority visual information must never override higher-priority anatomical information.",
  "",
  "--------------------------------------------------",
  "CONSISTENCY REQUIREMENT",
  "--------------------------------------------------",
  "",
  "For identical images, always identify the same anatomical landmarks.",
  "Base every decision on the underlying body anatomy and overall garment silhouette.",
  "Never change landmarks because of wrinkles, folds, shadows, lighting, compression marks, seams, image noise, JPEG compression, grid lines, labels, or temporary fabric deformation.",
  "If multiple nearby rows appear plausible, select the row representing the underlying anatomical landmark.",
  "Do NOT choose a row simply because a wrinkle, seam, fold, or color boundary creates a stronger visual edge.",
  "Favor anatomical consistency over local image appearance.",
  "",
  "--------------------------------------------------",
  "CURVE RULES",
  "--------------------------------------------------",
  "",
  "Draw exactly three red curved lines.",
  "Top curve: waist.",
  "Middle curve: trouserWaist.",
  "Bottom curve: hips.",
  "",
  "Each curve must begin at the true left body/clothing boundary, end at the true right body/clothing boundary, follow the underlying body contour, and ignore temporary surface deformation.",
  "Do NOT draw labels, arrows, dots, helper lines, masks, or extra curves.",
  "If clothing partially hides the body edge, estimate the smooth underlying body contour beneath the fitted garment.",
  "Keep the curve aligned with the natural body silhouette rather than wrinkles or loose fabric.",
  "If arms or hands overlap the torso, ignore them and continue the curve through the hidden torso location.",
  "",
  "--------------------------------------------------",
  "COMMON FAILURES TO AVOID",
  "--------------------------------------------------",
  "",
  "Do NOT place waist on the lower abdomen.",
  "Waist means the anatomically narrowest torso location.",
  "Do NOT place trouserWaist on the widest pelvis or buttocks.",
  "TrouserWaist means where the body naturally wears trousers or a belt.",
  "Do NOT place hips on waistband, crotch, or thighs.",
  "Hips means the widest part of the seat/buttocks.",
  "",
  "--------------------------------------------------",
  "MEASUREMENT STABILITY",
  "--------------------------------------------------",
  "",
  "Small visual changes must NOT change the selected landmarks.",
  "Ignore wrinkles, folds, lighting changes, shadows, compression, image sharpening, JPEG compression, slight color changes, and grid placement.",
  "The returned waist, trouserWaist, and hips should remain at the same anatomical locations whenever the underlying body shape has not changed.",
  "Prioritize landmark stability over reacting to temporary visual details.",
  "",
  "--------------------------------------------------",
  "COORDINATE RULES",
  "--------------------------------------------------",
  "",
  "For each curve return y_px, left_x_px, right_x_px, confidence, and exactly five curve points.",
  "left_x_px and right_x_px must represent the true left and right body/clothing boundaries.",
  "Point 1 must be the left edge.",
  "Point 5 must be the right edge.",
  "Points 2-4 must lie on the same curve.",
  "Each returned point must exactly match the red curve drawn on the annotated image.",
  "Coordinates use the supplied image pixel system.",
  "",
  "x_px = pixels from left edge",
  "y_px = pixels from top edge",
  "",
  "--------------------------------------------------",
  "IMPORTANT",
  "--------------------------------------------------",
  "",
  "Your task is anatomical landmark identification.",
  "Do NOT optimize using wrinkles, folds, shadows, seams, or temporary clothing deformation.",
  "Return the anatomically correct waist, trouserWaist, and hips landmarks.",
  "PrimeStyleAI performs deterministic pixel refinement after landmark detection.",
  "Always return the anatomically correct landmark even if nearby pixels appear visually stronger.",
  "",
  "--------------------------------------------------",
  "JSON:",
  "--------------------------------------------------",
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

export const DEFAULT_SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT = [
  "Task",
  "",
  "Identify the correct side-profile anatomical depth rows for waist, trouserWaist, and hips, then return exactly three horizontal depth curves:",
  "",
  "1. waist",
  "2. trouserWaist",
  "3. hips",
  "",
  "This prompt is for a TRUE SIDE PHOTO, not the front photo.",
  "The goal is not front body width. The goal is side depth: the visible front-to-back body thickness at each anatomical landmark.",
  "",
  "You may receive two side-profile images of the same person:",
  "",
  "Image 1 = original side source image without a grid.",
  "Use this image to understand the person's anatomy, clothing, facing direction, front edge, and back edge.",
  "",
  "Image 2 = the same side image with a pixel grid overlay.",
  "Draw the three red depth curves on Image 2 and return all coordinates using Image 2's pixel coordinate system.",
  "",
  "If only one image is provided, use that image for both anatomical interpretation and coordinate output.",
  "",
  "Return JSON containing the three measurement curves.",
  "If image output is supported, also return the annotated grid image with exactly the same three red curves.",
  "The JSON coordinates and red curves MUST represent the exact same curves.",
  "",
  "SIDE-PROFILE COORDINATE MEANING",
  "",
  "For side photo curves, left_x_px and right_x_px are image coordinates, not anatomical left/right.",
  "Each curve must run across the visible side depth of the body at that body part.",
  "One endpoint must be the true anterior/front body or fitted-clothing boundary.",
  "The other endpoint must be the true posterior/back body or fitted-clothing boundary.",
  "Because the person may face left or right, always return:",
  "",
  "left_x_px = smaller x pixel of the two body-depth endpoints",
  "right_x_px = larger x pixel of the two body-depth endpoints",
  "",
  "Do NOT return the vertical height of the body.",
  "Do NOT draw along the side outline.",
  "Do NOT draw a diagonal shoulder-to-hip line.",
  "Draw horizontal or gently curved front-to-back depth lines only.",
  "",
  "LANDMARK DEFINITIONS FOR SIDE PHOTO",
  "",
  "1. waist",
  "",
  "The side waist is the side-profile row of the anatomically narrowest torso location.",
  "Use the natural waist level under the ribs and above the lower belly.",
  "Use the same anatomical waist level that would be selected on the front photo.",
  "Do NOT use the belly protrusion, bust/chest, trouser waistband, belt, wrinkles, compression marks, or shirt hem.",
  "",
  "2. trouserWaist",
  "",
  "The side trouserWaist is the side-profile row where trousers are intended to be worn.",
  "Use waistband, belt position, or top opening of the trousers.",
  "Do NOT use natural waist unless the waistband is truly there.",
  "Do NOT use hips, buttocks, belly maximum, or widest pelvis depth.",
  "",
  "3. hips",
  "",
  "The side hips row is the widest side-profile depth of the seat/buttocks area.",
  "Use the maximum buttocks/seat depth: front lower-pelvis boundary to posterior buttocks boundary.",
  "The hips row must be below the trouserWaist and above the crotch/upper-thigh transition.",
  "Do NOT use the abdomen, waistband, crotch, thigh, knee, calf, foot, arm, hand, shadow, or loose clothing flare.",
  "",
  "UNDERLYING BODY INTERPRETATION",
  "",
  "Identify the underlying body anatomy rather than temporary surface appearance.",
  "Treat fitted garments as though the fabric were perfectly smooth.",
  "Ignore wrinkles, folds, fabric bunching, compression marks, stretch lines, seams, pockets, stitching, logos, printed patterns, shadows, highlights, lighting, JPEG artifacts, and image noise.",
  "These features are NOT anatomical landmarks.",
  "Estimate the smooth underlying side contour that best represents the body beneath fitted clothing.",
  "Never allow temporary wrinkles, folds, seams, shadows, or texture to move the selected body row.",
  "",
  "ARM AND HAND OCCLUSION",
  "",
  "If arms or hands extend in front of the torso, ignore them completely.",
  "Do not let arms, hands, fingers, sleeves, or arm shadows become part of side depth.",
  "If an arm hides the torso edge, continue the curve through the hidden torso location using the smooth body contour.",
  "",
  "CONSISTENCY REQUIREMENT",
  "",
  "For identical side images, always identify the same waist, trouserWaist, and hips rows.",
  "Base every decision on anatomical body part identity and the smooth side silhouette.",
  "Never change landmarks because of wrinkles, folds, shadows, lighting, compression marks, seams, image noise, JPEG compression, grid lines, labels, or temporary fabric deformation.",
  "If multiple nearby rows appear plausible, choose the row with the correct anatomical body-part meaning, not the strongest local visual edge.",
  "Favor stable body-part identity over local pixel appearance.",
  "",
  "ROW ORDER AND FAILURE RULES",
  "",
  "Draw exactly three red curved depth lines.",
  "Top curve: waist.",
  "Middle curve: trouserWaist.",
  "Bottom curve: hips.",
  "",
  "The rows must remain anatomically ordered top-to-bottom.",
  "The hips row must not be on the waistband.",
  "The hips row must not be on the crotch or thighs.",
  "The waist row must not be on the lower belly.",
  "The trouserWaist row must not jump to the widest pelvis or buttocks.",
  "",
  "Each curve must begin at one true side body/clothing boundary and end at the opposite true side body/clothing boundary at that same y row.",
  "Do NOT draw labels, arrows, dots, helper lines, masks, or extra curves.",
  "Keep the curve aligned with the smooth body depth at the anatomical row, not with wrinkles or loose fabric.",
  "",
  "COORDINATE RULES",
  "",
  "For each curve return y_px, left_x_px, right_x_px, confidence, and exactly five curve points.",
  "left_x_px must be the smaller x coordinate of the side-depth endpoints.",
  "right_x_px must be the larger x coordinate of the side-depth endpoints.",
  "Point 1 must be the smaller-x endpoint.",
  "Point 5 must be the larger-x endpoint.",
  "Points 2-4 must lie on the same red depth curve.",
  "Each returned point must exactly match the red curve drawn on the annotated image.",
  "Coordinates use the supplied image pixel system.",
  "",
  "x_px = pixels from left edge",
  "y_px = pixels from top edge",
  "",
  "IMPORTANT",
  "",
  "Your task is consistent side-profile anatomical row identification and side-depth marking.",
  "Do NOT optimize using wrinkles, folds, shadows, seams, or temporary clothing deformation.",
  "Return the anatomically correct waist, trouserWaist, and hips side-depth curves.",
  "PrimeStyleAI performs deterministic pixel refinement after landmark detection.",
  "Always return the anatomically correct body-part row even if nearby pixels appear visually stronger.",
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

export type GeminiGuideRowKind = "waist" | "trouserWaist" | "hips";
export type GeminiGuideDepthRatioOverrides = Partial<Record<GeminiGuideRowKind, number>>;
export type GeminiGuideAbsoluteDepthPredictors = Partial<Record<GeminiGuideRowKind, (frontWidthCm: number) => number | null>>;
export type GeminiGuideCircumferenceModel = "ellipse" | "body-shape-superellipse" | "hip-flare-superellipse";
export type GeminiGuideDepthRatioTableRangeStatus = "inside" | "table-fallback-low" | "table-fallback-high";
export type GeminiGuideEdgeTrust =
  | "manual-body-edge"
  | "local-ml-predicted-edge"
  | "visible-mask-edge"
  | "model-red-edge"
  | "loose-clothing-untrusted"
  | "fallback";

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

export interface GeminiGuideDepthRatioTableComparison {
  table: DepthRatioTableEstimate;
  formulaDepthRatio: number;
  acceptedDepthRatio: number;
  rangeStatus: GeminiGuideDepthRatioTableRangeStatus;
  rangeMin: number;
  rangeMax: number;
  depthCm: number;
  guidedCm: number;
  circumferenceModel: GeminiGuideCircumferenceModel;
  shapeExponent: number | null;
  shapeFlareRatio: number | null;
}

export interface GeminiGuideMeasurementRow {
  kind: GeminiGuideRowKind;
  label: string;
  rowSource: "red-pixel-detector" | "gemini-json" | "manual-coordinate" | "manual-adjusted-coordinate" | "local-ml-v1" | "pose-mask-fallback";
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
  calculationWidthCm: number;
  /** Unrounded red-endpoint breadth used by the calculation. */
  calculationWidthExactCm: number;
  calculationWidthSource: "red-line";
  cmPerPx: number;
  scaleSource: "global-height" | "apple-vision-body-depth";
  formulaWidthSource: "gemini-red-line" | "gemini-json-endpoints" | "manual-coordinates" | "local-ml-v1" | "fallback-line";
  formulaLeftXNorm: number;
  formulaRightXNorm: number;
  maskLeftXNorm: number | null;
  maskRightXNorm: number | null;
  maskYNorm: number | null;
  edgeTrust: GeminiGuideEdgeTrust;
  depthSource: "side-mask-at-guide-row" | "side-guide-red-pixel" | "side-guide-json" | "side-guide-manual-coordinate" | "front-formula" | "manual-tape-front-formula" | "manual-depth-ratio" | "local-ml-depth-ratio" | "wear-cohort-median" | "wear-absolute-depth" | "wear-depth-ratio-formula";
  sideDepthCandidateCm: number | null;
  sideDepthCandidateRatio: number | null;
  sideDepthRawCm: number | null;
  sideDepthRawRatio: number | null;
  sideDepthProjectionLeakRatio: number | null;
  sideDepthAccepted: boolean;
  baseDepthRatio: number;
  depthRatioOverride: number | null;
  depthRatio: number;
  depthCm: number;
  /** Unrounded selected/predicted front-to-back depth used by the calculation. */
  calculationDepthExactCm: number;
  depthRatioTable: GeminiGuideDepthRatioTableComparison | null;
  maskWidthCm: number | null;
  curveHorizontalCm: number;
  curveChordCm: number;
  curveArcCm: number;
  curveArcDeltaCm: number;
  rawCm: number;
  guidedCm: number;
  circumferenceDeltaCm: number;
  circumferenceModel: GeminiGuideCircumferenceModel;
  shapeExponent: number | null;
  shapeFlareRatio: number | null;
}

interface SideDepthMeasurement {
  depthCm: number;
  rawCm: number;
  projectionLeakRatio: number | null;
}

export interface GeminiGuideMeasurement {
  guide: GeminiBodyGuide;
  activeCmPerPx: number;
  activeScaleSource: "global-height" | "apple-vision-body-depth";
  frontHeightCmPerPx: number | null;
  sideHeightCmPerPx: number | null;
  sideHeightScaleSource: "mask-height" | "pose-landmarks" | null;
  sideScaleDeltaPct: number | null;
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

function measureSideSilhouetteMaskWidth(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  cmPerPx: number,
  yNorm: number,
  centerXNorm: number,
): MaskWidthMeasurement | null {
  const measured = measureMaskWidthAtY(
    pose,
    imageWidth,
    imageHeight,
    cmPerPx,
    yNorm,
    centerXNorm,
    6,
    { excludeLimbs: false, segmentMode: "center-walk", exclusionMode: "none" },
  );
  return measured ?? null;
}

function resolveFormulaSpan(args: {
  lineLeftXNorm: number;
  lineRightXNorm: number;
  imageWidth: number;
  cmPerPx: number;
}): {
  widthCm: number;
  widthPx: number;
  leftXNorm: number;
  rightXNorm: number;
  usedMaskFallback: boolean;
  clampedToMask: boolean;
} {
  const lineLeftXNorm = Math.min(args.lineLeftXNorm, args.lineRightXNorm);
  const lineRightXNorm = Math.max(args.lineLeftXNorm, args.lineRightXNorm);
  const lineWidthPx = Math.max(0, (lineRightXNorm - lineLeftXNorm) * args.imageWidth);

  return {
    widthCm: lineWidthPx * args.cmPerPx,
    widthPx: lineWidthPx,
    leftXNorm: lineLeftXNorm,
    rightXNorm: lineRightXNorm,
    usedMaskFallback: false,
    clampedToMask: false,
  };
}

function sideProjectionLeakRatio(frontScale: NonNullable<ReturnType<typeof computePoseScale>>, sideScale: NonNullable<ReturnType<typeof computePoseScale>> | null): number {
  if (!sideScale) return 0;
  const frontHipSpreadCm = Math.abs(frontScale.hipRightPx.x - frontScale.hipLeftPx.x) * frontScale.cmPerPx;
  const sideHipSpreadCm = Math.abs(sideScale.hipRightPx.x - sideScale.hipLeftPx.x) * sideScale.cmPerPx;
  if (frontHipSpreadCm <= 0 || sideHipSpreadCm <= 0) return 0;
  return clamp(sideHipSpreadCm / frontHipSpreadCm, 0, 0.7);
}

function projectionCorrectedSideDepth(rawDepthCm: number, leakBreadthCm: number, leakRatio: number): number {
  if (rawDepthCm <= 0 || leakBreadthCm <= 0 || leakRatio <= 0) return rawDepthCm;
  const sideComponent = Math.sqrt(Math.max(0.001, 1 - leakRatio * leakRatio));
  return Math.max(0, (rawDepthCm - leakBreadthCm * leakRatio) / sideComponent);
}

function superellipseCircumferenceCm(widthCm: number, depthCm: number, exponent: number): number {
  if (widthCm <= 0 || depthCm <= 0 || exponent <= 0) {
    return ellipseCircumferenceCm(widthCm, depthCm);
  }
  if (Math.abs(exponent - 2) <= 0.001) {
    return ellipseCircumferenceCm(widthCm, depthCm);
  }
  const a = widthCm / 2;
  const b = depthCm / 2;
  const steps = 128;
  let length = 0;
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i <= steps; i += 1) {
    const theta = (Math.PI / 2) * (i / steps);
    const x = a * Math.pow(Math.cos(theta), 2 / exponent);
    const y = b * Math.pow(Math.sin(theta), 2 / exponent);
    if (prev) length += Math.hypot(x - prev.x, y - prev.y);
    prev = { x, y };
  }
  return length * 4;
}

function hipFlareShapeCircumference(args: {
  hipGuideWidthCm: number;
  hipDepthCm: number;
  waistGuideWidthCm: number | null;
  trouserGuideWidthCm: number | null;
}): {
  guidedCm: number;
  model: GeminiGuideMeasurementRow["circumferenceModel"];
  shapeExponent: number | null;
  shapeFlareRatio: number | null;
} {
  const hipGuideWidthCm = args.hipGuideWidthCm;
  const baselineWidthCm = Math.max(args.waistGuideWidthCm ?? 0, args.trouserGuideWidthCm ?? 0);
  if (hipGuideWidthCm <= 0 || args.hipDepthCm <= 0 || baselineWidthCm <= 0) {
    return {
      guidedCm: ellipseCircumferenceCm(hipGuideWidthCm, args.hipDepthCm),
      model: "ellipse",
      shapeExponent: null,
      shapeFlareRatio: null,
    };
  }

  const flareRatio = clamp((hipGuideWidthCm - baselineWidthCm) / hipGuideWidthCm, 0, 0.35);
  const flareT = clamp((flareRatio - 0.06) / 0.07, 0, 1);
  const exponent = 2 + 1.75 * flareT;
  if (exponent <= 2.02) {
    return {
      guidedCm: ellipseCircumferenceCm(hipGuideWidthCm, args.hipDepthCm),
      model: "ellipse",
      shapeExponent: 2,
      shapeFlareRatio: flareRatio,
    };
  }

  return {
    guidedCm: superellipseCircumferenceCm(hipGuideWidthCm, args.hipDepthCm, exponent),
    model: "hip-flare-superellipse",
    shapeExponent: exponent,
    shapeFlareRatio: flareRatio,
  };
}

function bodyShapeCircumference(args: {
  kind: GeminiGuideRowKind;
  widthCm: number;
  depthCm: number;
  waistWidthCm: number | null;
  waistDepthCm: number | null;
  trouserWidthCm: number | null;
  trouserDepthCm: number | null;
  hipWidthCm: number | null;
  hipDepthCm: number | null;
}): {
  guidedCm: number;
  model: GeminiGuideMeasurementRow["circumferenceModel"];
  shapeExponent: number | null;
  shapeFlareRatio: number | null;
} {
  const ellipse = () => ({
    guidedCm: ellipseCircumferenceCm(args.widthCm, args.depthCm),
    model: "ellipse" as const,
    shapeExponent: 2,
    shapeFlareRatio: null,
  });
  if (args.widthCm <= 0 || args.depthCm <= 0) return ellipse();

  if (
    args.kind === "waist" &&
    args.trouserWidthCm &&
    args.trouserDepthCm &&
    args.trouserWidthCm > args.widthCm &&
    args.trouserDepthCm > args.depthCm
  ) {
    const pinchIndex = Math.min(args.trouserWidthCm / args.widthCm, args.trouserDepthCm / args.depthCm);
    const pinchT = clamp((pinchIndex - 1.18) / 0.1, 0, 1);
    const exponent = 2 - 0.9 * pinchT;
    if (exponent < 1.98) {
      return {
        guidedCm: superellipseCircumferenceCm(args.widthCm, args.depthCm, exponent),
        model: "body-shape-superellipse",
        shapeExponent: exponent,
        shapeFlareRatio: pinchIndex - 1,
      };
    }
    return ellipse();
  }

  if (
    args.kind === "trouserWaist" &&
    args.hipWidthCm &&
    args.hipWidthCm > 0
  ) {
    const hipFlareRatio = clamp((args.hipWidthCm - args.widthCm) / args.hipWidthCm, 0, 0.25);
    const exponent = clamp(1.5 + 6.25 * hipFlareRatio, 1.55, 2.35);
    if (Math.abs(exponent - 2) > 0.02) {
      return {
        guidedCm: superellipseCircumferenceCm(args.widthCm, args.depthCm, exponent),
        model: "body-shape-superellipse",
        shapeExponent: exponent,
        shapeFlareRatio: hipFlareRatio,
      };
    }
    return ellipse();
  }

  if (args.kind === "hips") {
    return hipFlareShapeCircumference({
      hipGuideWidthCm: args.widthCm,
      hipDepthCm: args.depthCm,
      waistGuideWidthCm: args.waistWidthCm,
      trouserGuideWidthCm: args.trouserWidthCm,
    });
  }

  return ellipse();
}

function applyCircumferenceModel(
  row: GeminiGuideMeasurementRow | null,
  circumference: {
    guidedCm: number;
    model: GeminiGuideMeasurementRow["circumferenceModel"];
    shapeExponent: number | null;
    shapeFlareRatio: number | null;
  },
): GeminiGuideMeasurementRow | null {
  if (!row) return null;
  return {
    ...row,
    guidedCm: round(circumference.guidedCm, 1),
    circumferenceDeltaCm: round(circumference.guidedCm - row.rawCm, 1),
    circumferenceModel: circumference.model,
    shapeExponent: circumference.shapeExponent == null ? null : round(circumference.shapeExponent, 3),
    shapeFlareRatio: circumference.shapeFlareRatio == null ? null : round(circumference.shapeFlareRatio, 3),
  };
}

function applyDepthRatioTableComparison(args: {
  row: GeminiGuideMeasurementRow | null;
  gender: WaistTrace["gender"];
  bmi: number;
  heightCm: number;
  waistWidthCm: number | null;
  waistDepthCm: number | null;
  trouserWidthCm: number | null;
  trouserDepthCm: number | null;
  hipWidthCm: number | null;
  hipDepthCm: number | null;
  useBodyShapeCircumference: boolean;
}): GeminiGuideMeasurementRow | null {
  const { row } = args;
  if (!row || row.formulaWidthCm <= 0 || !Number.isFinite(args.bmi) || args.bmi <= 0) return row;
  const table = estimateDepthRatioFromTable({
    rowKind: row.kind,
    gender: args.gender,
    bmi: args.bmi,
    heightCm: args.heightCm,
    waistWidthCm: args.waistWidthCm,
    trouserWidthCm: args.trouserWidthCm,
    hipWidthCm: args.hipWidthCm,
  });
  if (!table) return row;
  const rangeMin = table.supportedMin;
  const rangeMax = table.supportedMax;
  const formulaDepthRatio = row.baseDepthRatio;
  const rangeStatus: GeminiGuideDepthRatioTableRangeStatus = formulaDepthRatio < rangeMin
    ? "table-fallback-low"
    : formulaDepthRatio > rangeMax
      ? "table-fallback-high"
      : "inside";
  const manualOverrideActive = row.depthRatioOverride != null;
  const acceptedDepthRatio = manualOverrideActive ? row.depthRatio : table.depthRatio;

  const shouldUseBodyShapeCircumference = args.useBodyShapeCircumference || row.circumferenceModel !== "ellipse";
  const tableDepthCm = row.formulaWidthCm * table.depthRatio;
  const tableCircumference = shouldUseBodyShapeCircumference
    ? bodyShapeCircumference({
        kind: row.kind,
        widthCm: row.formulaWidthCm,
        depthCm: tableDepthCm,
        waistWidthCm: args.waistWidthCm,
        waistDepthCm: args.waistDepthCm,
        trouserWidthCm: args.trouserWidthCm,
        trouserDepthCm: args.trouserDepthCm,
        hipWidthCm: args.hipWidthCm,
        hipDepthCm: args.hipDepthCm,
      })
    : {
        guidedCm: ellipseCircumferenceCm(row.formulaWidthCm, tableDepthCm),
        model: "ellipse" as const,
        shapeExponent: null,
        shapeFlareRatio: null,
      };

  const tableComparison: GeminiGuideDepthRatioTableComparison = {
    table,
    formulaDepthRatio: round(formulaDepthRatio, 3),
    acceptedDepthRatio: round(acceptedDepthRatio, 3),
    rangeStatus,
    rangeMin: round(rangeMin, 3),
    rangeMax: round(rangeMax, 3),
    depthCm: round(tableDepthCm, 1),
    guidedCm: round(tableCircumference.guidedCm, 1),
    circumferenceModel: tableCircumference.model,
    shapeExponent: tableCircumference.shapeExponent == null ? null : round(tableCircumference.shapeExponent, 3),
    shapeFlareRatio: tableCircumference.shapeFlareRatio == null ? null : round(tableCircumference.shapeFlareRatio, 3),
  };

  if (row.sideDepthAccepted) {
    return {
      ...row,
      depthRatioTable: {
        ...tableComparison,
        acceptedDepthRatio: round(row.depthRatio, 3),
      },
    };
  }

  const acceptedDepthCm = row.formulaWidthCm * acceptedDepthRatio;
  const acceptedCircumference = shouldUseBodyShapeCircumference
    ? bodyShapeCircumference({
        kind: row.kind,
        widthCm: row.formulaWidthCm,
        depthCm: acceptedDepthCm,
        waistWidthCm: args.waistWidthCm,
        waistDepthCm: args.waistDepthCm,
        trouserWidthCm: args.trouserWidthCm,
        trouserDepthCm: args.trouserDepthCm,
        hipWidthCm: args.hipWidthCm,
        hipDepthCm: args.hipDepthCm,
      })
    : {
        guidedCm: ellipseCircumferenceCm(row.formulaWidthCm, acceptedDepthCm),
        model: "ellipse" as const,
        shapeExponent: null,
        shapeFlareRatio: null,
      };

  return {
    ...row,
    depthSource: manualOverrideActive ? "manual-depth-ratio" : "wear-depth-ratio-formula",
    sideDepthAccepted: false,
    depthRatio: round(acceptedDepthRatio, 3),
    depthCm: round(acceptedDepthCm, 1),
    guidedCm: round(acceptedCircumference.guidedCm, 1),
    circumferenceDeltaCm: round(acceptedCircumference.guidedCm - row.rawCm, 1),
    circumferenceModel: acceptedCircumference.model,
    shapeExponent: acceptedCircumference.shapeExponent == null ? null : round(acceptedCircumference.shapeExponent, 3),
    shapeFlareRatio: acceptedCircumference.shapeFlareRatio == null ? null : round(acceptedCircumference.shapeFlareRatio, 3),
    depthRatioTable: {
      ...tableComparison,
      acceptedDepthRatio: round(acceptedDepthRatio, 3),
    },
  };
}

function applyMaskHeightScale<T extends NonNullable<ReturnType<typeof computePoseScale>>>(
  scale: T | null,
  maskScale: ReturnType<typeof computeMaskHeightScale>,
): T | null {
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
  scaleSource?: GeminiGuideMeasurementRow["scaleSource"];
  depthRatio: number | ((geminiWidthCm: number) => number);
  absoluteDepthCm?: number | ((formulaWidthCm: number) => number | null);
  absoluteDepthSource?: GeminiGuideMeasurementRow["depthSource"];
  requireAbsoluteDepth?: boolean;
  depthRatioBounds?: { min: number; max: number };
  sideDepthCm?: (line: {
    yNorm: number;
    leftXNorm: number;
    rightXNorm: number;
    centerXNorm: number;
    formulaWidthCm: number;
  }) => number | SideDepthMeasurement | null;
  sideDepthSource?: GeminiGuideMeasurementRow["depthSource"];
  depthSourceOverride?: GeminiGuideMeasurementRow["depthSource"];
  depthRatioOverride?: number | null;
  allowSideDepthOutsideBounds?: boolean;
  circumferenceModel?: (line: {
    formulaWidthCm: number;
    depthCm: number;
  }) => {
    guidedCm: number;
    model: GeminiGuideMeasurementRow["circumferenceModel"];
    shapeExponent: number | null;
    shapeFlareRatio: number | null;
  };
  looseClothing?: boolean;
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
  const usesLocalMlEndpoints = rowSource === "local-ml-v1";
  const usesManualEndpoints = rowSource === "manual-coordinate" || rowSource === "manual-adjusted-coordinate";
  const usesDirectEndpoints = usesManualEndpoints || usesLocalMlEndpoints;
  const maskLeftXNorm = maskMeasurement?.leftXNorm ?? null;
  const maskRightXNorm = maskMeasurement?.rightXNorm ?? null;
  const maskYNorm = maskMeasurement?.yNorm ?? null;
  const formulaSpan = resolveFormulaSpan({
    lineLeftXNorm: normalized.leftXNorm,
    lineRightXNorm: normalized.rightXNorm,
    imageWidth: args.imageWidth,
    cmPerPx: args.cmPerPx,
  });
  const selectedFormulaWidthCm = formulaSpan.widthCm;
  if (selectedFormulaWidthCm <= 0) return null;
  const selectedFormulaWidthPx = formulaSpan.widthPx;
  const cmPerFormulaPx = selectedFormulaWidthPx > 0 ? selectedFormulaWidthCm / selectedFormulaWidthPx : args.cmPerPx;
  const formulaLeftXNorm = formulaSpan.leftXNorm;
  const formulaRightXNorm = formulaSpan.rightXNorm;
  const formulaCenterXNorm = (formulaLeftXNorm + formulaRightXNorm) / 2;
  const activePoints = normalized.points.map((point) => ({
    xPx: point.xPx,
    yPx: point.yPx,
    xNorm: round(point.xNorm, 4),
    yNorm: round(point.yNorm, 4),
  }));
  const formulaWidthSource: GeminiGuideMeasurementRow["formulaWidthSource"] = rowSource === "red-pixel-detector"
    ? "gemini-red-line"
    : usesLocalMlEndpoints
      ? "local-ml-v1"
    : rowSource === "manual-coordinate" || rowSource === "manual-adjusted-coordinate"
      ? "manual-coordinates"
    : rowSource === "pose-mask-fallback"
      ? "fallback-line"
      : "gemini-json-endpoints";
  const edgeTrust: GeminiGuideEdgeTrust = args.looseClothing && !usesDirectEndpoints
    ? "loose-clothing-untrusted"
    : usesLocalMlEndpoints
      ? "local-ml-predicted-edge"
    : usesManualEndpoints
      ? "manual-body-edge"
      : rowSource === "pose-mask-fallback"
        ? "fallback"
        : "model-red-edge";
  const depthRatio = typeof args.depthRatio === "function"
    ? args.depthRatio(selectedFormulaWidthCm)
    : args.depthRatio;
  const depthRatioBounds = args.depthRatioBounds ?? { min: 0.35, max: 0.8 };
  const manualDepthRatioOverride = typeof args.depthRatioOverride === "number" && Number.isFinite(args.depthRatioOverride)
    ? clamp(args.depthRatioOverride, depthRatioBounds.min, depthRatioBounds.max)
    : null;
  const absoluteDepthCm = typeof args.absoluteDepthCm === "function"
    ? args.absoluteDepthCm(selectedFormulaWidthCm)
    : args.absoluteDepthCm ?? null;
  const absoluteDepthRatio = absoluteDepthCm && selectedFormulaWidthCm > 0
    ? absoluteDepthCm / selectedFormulaWidthCm
    : 0;
  const sideDepthEvidence = args.sideDepthCm?.({
    yNorm: normalized.yNorm,
    leftXNorm: formulaLeftXNorm,
    rightXNorm: formulaRightXNorm,
    centerXNorm: formulaCenterXNorm,
    formulaWidthCm: selectedFormulaWidthCm,
  }) ?? null;
  const sideDepthCm = typeof sideDepthEvidence === "number" ? sideDepthEvidence : sideDepthEvidence?.depthCm ?? null;
  const sideDepthRawCm = typeof sideDepthEvidence === "object" && sideDepthEvidence
    ? sideDepthEvidence.rawCm
    : null;
  const sideDepthProjectionLeakRatio = typeof sideDepthEvidence === "object" && sideDepthEvidence
    ? sideDepthEvidence.projectionLeakRatio
    : null;
  const sideDepthRatio = sideDepthCm && selectedFormulaWidthCm > 0
    ? sideDepthCm / selectedFormulaWidthCm
    : 0;
  const sideDepthRawRatio = sideDepthRawCm && selectedFormulaWidthCm > 0
    ? sideDepthRawCm / selectedFormulaWidthCm
    : null;
  const useSideDepth = !args.requireAbsoluteDepth &&
    sideDepthCm != null &&
    sideDepthCm > 0 &&
    manualDepthRatioOverride == null &&
    (args.allowSideDepthOutsideBounds ||
      (sideDepthRatio >= depthRatioBounds.min && sideDepthRatio <= depthRatioBounds.max));
  const useAbsoluteDepth = !useSideDepth &&
    absoluteDepthCm != null &&
    Number.isFinite(absoluteDepthCm) &&
    absoluteDepthCm > 0 &&
    manualDepthRatioOverride == null &&
    absoluteDepthRatio >= depthRatioBounds.min &&
    absoluteDepthRatio <= depthRatioBounds.max;
  if (args.requireAbsoluteDepth && !useAbsoluteDepth) return null;
  const calculationWidthCm = selectedFormulaWidthCm;
  const baseDepthRatio = useSideDepth
    ? sideDepthRatio
    : useAbsoluteDepth
      ? absoluteDepthRatio
      : clamp(depthRatio, depthRatioBounds.min, depthRatioBounds.max);
  const boundedDepthRatio = manualDepthRatioOverride ?? baseDepthRatio;
  const depthCm = useSideDepth
    ? sideDepthCm
    : useAbsoluteDepth
      ? absoluteDepthCm
      : selectedFormulaWidthCm * boundedDepthRatio;
  const circumference = args.circumferenceModel?.({
    formulaWidthCm: calculationWidthCm,
    depthCm,
  }) ?? {
    guidedCm: ellipseCircumferenceCm(calculationWidthCm, depthCm),
    model: "ellipse" as const,
    shapeExponent: null,
    shapeFlareRatio: null,
  };
  const guidedCm = circumference.guidedCm;
  const curveGeometry = computeCurveGeometry(normalized.points, normalized.leftXPx, normalized.yPx, normalized.rightXPx, normalized.yPx);

  return {
    kind: args.kind,
    label: args.label,
    rowSource,
    yPx: normalized.yPx,
    leftXPx: Math.round(formulaLeftXNorm * args.imageWidth),
    rightXPx: Math.round(formulaRightXNorm * args.imageWidth),
    yNorm: round(normalized.yNorm, 4),
    leftXNorm: round(formulaLeftXNorm, 4),
    rightXNorm: round(formulaRightXNorm, 4),
    points: activePoints,
    confidence: round(normalized.confidence, 2),
    geminiWidthCm: round(geminiWidthCm, 1),
    formulaWidthCm: round(selectedFormulaWidthCm, 1),
    calculationWidthCm: round(calculationWidthCm, 1),
    calculationWidthExactCm: calculationWidthCm,
    calculationWidthSource: "red-line",
    cmPerPx: round(args.cmPerPx, 6),
    scaleSource: args.scaleSource ?? "global-height",
    formulaWidthSource,
    formulaLeftXNorm: round(formulaLeftXNorm, 4),
    formulaRightXNorm: round(formulaRightXNorm, 4),
    maskLeftXNorm: maskLeftXNorm == null ? null : round(maskLeftXNorm, 4),
    maskRightXNorm: maskRightXNorm == null ? null : round(maskRightXNorm, 4),
    maskYNorm: maskYNorm == null ? null : round(maskYNorm, 4),
    edgeTrust,
    depthSource: manualDepthRatioOverride != null
      ? "manual-depth-ratio"
      : useSideDepth
        ? args.sideDepthSource ?? "side-mask-at-guide-row"
        : useAbsoluteDepth
          ? args.absoluteDepthSource ?? "wear-absolute-depth"
          : args.depthSourceOverride ?? "front-formula",
    sideDepthCandidateCm: sideDepthCm == null ? null : round(sideDepthCm, 1),
    sideDepthCandidateRatio: sideDepthCm == null || selectedFormulaWidthCm <= 0 ? null : round(sideDepthRatio, 3),
    sideDepthRawCm: sideDepthRawCm == null ? null : round(sideDepthRawCm, 1),
    sideDepthRawRatio: sideDepthRawRatio == null ? null : round(sideDepthRawRatio, 3),
    sideDepthProjectionLeakRatio: sideDepthProjectionLeakRatio == null ? null : round(sideDepthProjectionLeakRatio, 3),
    sideDepthAccepted: useSideDepth,
    baseDepthRatio: round(baseDepthRatio, 3),
    depthRatioOverride: manualDepthRatioOverride == null ? null : round(manualDepthRatioOverride, 3),
    depthRatio: round(boundedDepthRatio, 3),
    depthCm: round(depthCm, 1),
    calculationDepthExactCm: depthCm,
    depthRatioTable: null,
    maskWidthCm: maskWidthCm == null ? null : round(maskWidthCm, 1),
    curveHorizontalCm: round(selectedFormulaWidthCm, 1),
    curveChordCm: round(curveGeometry.chordPx * cmPerFormulaPx, 1),
    curveArcCm: round(curveGeometry.arcPx * cmPerFormulaPx, 1),
    curveArcDeltaCm: round((curveGeometry.arcPx * cmPerFormulaPx) - selectedFormulaWidthCm, 1),
    rawCm: round(args.rawCm, 1),
    guidedCm: round(guidedCm, 1),
    circumferenceDeltaCm: round(guidedCm - args.rawCm, 1),
    circumferenceModel: circumference.model,
    shapeExponent: circumference.shapeExponent == null ? null : round(circumference.shapeExponent, 3),
    shapeFlareRatio: circumference.shapeFlareRatio == null ? null : round(circumference.shapeFlareRatio, 3),
  };
}

export function computeGeminiGuideMeasurement(args: {
  guide: GeminiBodyGuide | null;
  guideSource?: string | null;
  sideGuide?: GeminiBodyGuide | null;
  sideGuideSource?: string | null;
  pose: PoseResult | null;
  imageWidth: number;
  imageHeight: number;
  sidePose?: PoseResult | null;
  sideImageWidth?: number;
  sideImageHeight?: number;
  maskMode: MeasurementMaskMode;
  waistTrace: WaistTrace | null;
  hipsTrace: HipsTrace | null;
  cmPerPxOverride?: number | null;
  rowCmPerPxOverrides?: Partial<Record<GeminiGuideRowKind, number>>;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  localMlDepthRatios?: GeminiGuideDepthRatioOverrides;
  localMlAbsoluteDepthCm?: GeminiGuideAbsoluteDepthPredictors;
  localMlDepthSource?: "local-ml-depth-ratio" | "wear-cohort-median";
  requireCompleteLocalMlDepthRatios?: boolean;
  requireCompleteLocalMlAbsoluteDepth?: boolean;
  applyWearDepthFormula?: boolean;
}): GeminiGuideMeasurement | null {
  const { guide, pose, waistTrace, hipsTrace } = args;
  if (!guide || !pose || !waistTrace) return null;
  if (
    args.requireCompleteLocalMlDepthRatios
    && (["waist", "trouserWaist", "hips"] as const).some((kind) => {
      const value = args.localMlDepthRatios?.[kind];
      return typeof value !== "number" || !Number.isFinite(value);
    })
  ) return null;
  if (
    args.requireCompleteLocalMlAbsoluteDepth
    && (["waist", "trouserWaist", "hips"] as const).some((kind) => typeof args.localMlAbsoluteDepthCm?.[kind] !== "function")
  ) return null;
  const usesRedPixelGuide = typeof args.guideSource === "string" && args.guideSource.startsWith("red-pixel-detector");
  const usesGeminiJsonGuide = typeof args.guideSource === "string" && args.guideSource.startsWith("gemini-json");
  const usesManualGuide = args.guideSource === "manual-coordinate";
  const usesManualAdjustedGuide = args.guideSource === "manual-adjusted-coordinate";
  const usesLocalMlGuide = args.guideSource === "local-ml-v1";
  const usesManualCoordinateGuide = usesManualGuide || usesManualAdjustedGuide || usesLocalMlGuide;
  const usesDirectCoordinateGuide = usesManualGuide || usesLocalMlGuide;
  const sideGuideDepthSource = getSideGuideDepthSource(args.sideGuideSource);
  const frontScale = computePoseScale(pose, args.imageWidth, args.imageHeight, waistTrace.heightCm);
  const rawSideScale = args.sidePose && args.sideImageWidth && args.sideImageHeight
    ? computePoseScale(args.sidePose, args.sideImageWidth, args.sideImageHeight, waistTrace.heightCm)
    : null;
  const sideMaskScale = args.sidePose && args.sideImageWidth && args.sideImageHeight
    ? computeMaskHeightScale(args.sidePose, args.sideImageWidth, args.sideImageHeight, waistTrace.heightCm)
    : null;
  const sideScale = applyMaskHeightScale(rawSideScale, sideMaskScale);
  const rowScaleValues = Object.values(args.rowCmPerPxOverrides ?? {})
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const rowScaleMedian = rowScaleValues.length
    ? rowScaleValues[Math.floor(rowScaleValues.length / 2)]!
    : null;
  const activeCmPerPx = rowScaleMedian
    ?? (args.cmPerPxOverride && args.cmPerPxOverride > 0 ? args.cmPerPxOverride : waistTrace.cmPerPx);
  const activeScaleSource: GeminiGuideMeasurement["activeScaleSource"] = rowScaleMedian
    ? "apple-vision-body-depth"
    : "global-height";
  const scaleForRow = (kind: GeminiGuideRowKind): number => {
    const rowScale = args.rowCmPerPxOverrides?.[kind];
    return typeof rowScale === "number" && Number.isFinite(rowScale) && rowScale > 0 ? rowScale : activeCmPerPx;
  };
  const activeScaleRatio = waistTrace.cmPerPx > 0 ? activeCmPerPx / waistTrace.cmPerPx : 1;
  const scaledHipsTrace = hipsTrace && Number.isFinite(activeScaleRatio) && activeScaleRatio > 0
    ? {
        ...hipsTrace,
        hipBoneCm: hipsTrace.hipBoneCm * activeScaleRatio,
        hipBreadthCm: hipsTrace.hipBreadthCm * activeScaleRatio,
        hipDepthCm: hipsTrace.hipDepthCm * activeScaleRatio,
        sideHipDepthCm: hipsTrace.sideHipDepthCm * activeScaleRatio,
      }
    : hipsTrace;
  const activeHipBoneCm = (scaledHipsTrace?.hipBoneCm || waistTrace.hipBoneCm) || 0;
  let waistLine = guide.waist;
  let trouserWaistLine = guide.trouserWaist;
  let hipsLine = guide.hips;
  const manualRowSource: GeminiGuideMeasurementRow["rowSource"] = usesLocalMlGuide
    ? "local-ml-v1"
    : usesManualAdjustedGuide
      ? "manual-adjusted-coordinate"
      : "manual-coordinate";
  let waistRowSource: GeminiGuideMeasurementRow["rowSource"] = usesManualCoordinateGuide ? manualRowSource : usesRedPixelGuide ? "red-pixel-detector" : "gemini-json";
  let trouserWaistRowSource: GeminiGuideMeasurementRow["rowSource"] = usesManualCoordinateGuide ? manualRowSource : usesRedPixelGuide ? "red-pixel-detector" : "gemini-json";
  let hipsRowSource: GeminiGuideMeasurementRow["rowSource"] = usesManualCoordinateGuide ? manualRowSource : usesRedPixelGuide ? "red-pixel-detector" : "gemini-json";
  const looseClothing = Boolean(guide.occlusion?.loose_clothing);

  if (frontScale && !usesRedPixelGuide && !usesGeminiJsonGuide && !usesManualCoordinateGuide) {
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

  const hasSideMaskDepth = Boolean(args.sidePose && args.sideImageWidth && args.sideImageHeight && sideScale);
  const scaleProjectionLeakRatio = frontScale && sideScale ? sideProjectionLeakRatio(frontScale, sideScale) : 0;
  const guideProjectionLeakRatio = (kind: "waist" | "trouserWaist" | "hips"): number => {
    if (kind === "hips") return scaledHipsTrace?.sideHipProjectionLeakRatio ?? scaleProjectionLeakRatio;
    if (kind === "trouserWaist") {
      return waistTrace.sideTrouserWaistProjectionLeakRatio ?? waistTrace.sideNaturalWaistProjectionLeakRatio ?? scaleProjectionLeakRatio;
    }
    return waistTrace.sideNaturalWaistProjectionLeakRatio ?? scaleProjectionLeakRatio;
  };
  const measureSideDepthAtFrontY = (
    frontYNorm: number,
    rowKind: "waist" | "trouserWaist" | "hips" = "hips",
    frontWidthCm: number,
  ): SideDepthMeasurement | null => {
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
      ? { excludeLimbs: true, segmentMode: "center-walk" as const, exclusionMode: "hands" as const }
      : { excludeLimbs: false, segmentMode: "center-walk" as const, exclusionMode: "none" as const };
    const measured = measureMaskWidthAtY(
      args.sidePose,
      args.sideImageWidth,
      args.sideImageHeight,
      sideScale.cmPerPx,
      clamp(sideYNorm, 0.02, 0.98),
      sideScale.hipCenterXNorm,
      2,
      maskOptions,
    );
    if (!measured || measured.widthCm <= 0) return null;
    const leakRatio = guideProjectionLeakRatio(rowKind);
    return {
      depthCm: projectionCorrectedSideDepth(measured.widthCm, frontWidthCm, leakRatio),
      rawCm: measured.widthCm,
      projectionLeakRatio: leakRatio,
    };
  };
  const measureSideGuideDepth = (kind: "waist" | "trouserWaist" | "hips", frontWidthCm: number): number | SideDepthMeasurement | null => {
    if (!args.sideGuide || !args.sidePose || !args.sideImageWidth || !args.sideImageHeight || !sideScale) return null;
    const line = kind === "waist"
      ? args.sideGuide.waist
      : kind === "trouserWaist"
        ? args.sideGuide.trouserWaist
        : args.sideGuide.hips;
    const normalized = normalizeLine(line, args.sideImageWidth, args.sideImageHeight);
    if (!normalized) return null;
    const endpointWidthCm = (normalized.rightXNorm - normalized.leftXNorm) * args.sideImageWidth * sideScale.cmPerPx;
    const sideFormulaSpan = resolveFormulaSpan({
      lineLeftXNorm: normalized.leftXNorm,
      lineRightXNorm: normalized.rightXNorm,
      imageWidth: args.sideImageWidth,
      cmPerPx: sideScale.cmPerPx,
    });
    const rawDepthCm = sideFormulaSpan.widthCm > 0 ? sideFormulaSpan.widthCm : endpointWidthCm;
    if (rawDepthCm <= 0) return null;
    if (sideGuideDepthSource === "side-guide-manual-coordinate") {
      return {
        depthCm: rawDepthCm,
        rawCm: rawDepthCm,
        projectionLeakRatio: 0,
      };
    }
    const leakRatio = guideProjectionLeakRatio(kind);
    return {
      depthCm: projectionCorrectedSideDepth(rawDepthCm, frontWidthCm, leakRatio),
      rawCm: rawDepthCm,
      projectionLeakRatio: leakRatio,
    };
  };
  const waist = buildGuideRow({
    kind: "waist",
    label: "Gemini waist row",
    line: waistLine,
    rowSource: waistRowSource,
    pose,
    imageWidth: args.imageWidth,
    imageHeight: args.imageHeight,
    cmPerPx: scaleForRow("waist"),
    scaleSource: args.rowCmPerPxOverrides?.waist ? "apple-vision-body-depth" : activeScaleSource,
    depthRatio: args.localMlDepthRatios?.waist ?? ((waistGuideWidthCm) => scaledHipsTrace
      ? guideWaistDepthRatio({
          gender: scaledHipsTrace.gender,
          bmi: scaledHipsTrace.bmi,
          waistGuideWidthCm,
          hipBoneCm: activeHipBoneCm,
        })
      : waistTrace.naturalWaistDepthRatio),
    depthSourceOverride: args.localMlDepthRatios?.waist != null ? args.localMlDepthSource ?? "local-ml-depth-ratio" : undefined,
    absoluteDepthCm: args.localMlAbsoluteDepthCm?.waist,
    absoluteDepthSource: args.localMlAbsoluteDepthCm?.waist ? "wear-absolute-depth" : undefined,
    requireAbsoluteDepth: args.requireCompleteLocalMlAbsoluteDepth,
    depthRatioOverride: args.depthRatioOverrides?.waist,
    // The BMI table can legitimately expose waist ratios above 0.800 (for
    // example Shahnaz 2 reaches 0.827). Keep the formula's manual safety
    // bound wide enough for every value shown by the slider to take effect.
    depthRatioBounds: { min: 0.35, max: 0.9 },
    rawCm: waistTrace.finalNaturalWaistCm,
    sideDepthCm: sideGuideDepthSource
      ? (line) => measureSideGuideDepth("waist", line.formulaWidthCm)
      : hasSideMaskDepth
        ? (line) => measureSideDepthAtFrontY(line.yNorm, "waist", line.formulaWidthCm)
        : undefined,
    sideDepthSource: sideGuideDepthSource ?? (hasSideMaskDepth ? "side-mask-at-guide-row" : undefined),
    allowSideDepthOutsideBounds: sideGuideDepthSource === "side-guide-manual-coordinate",
    looseClothing,
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
    cmPerPx: scaleForRow("trouserWaist"),
    scaleSource: args.rowCmPerPxOverrides?.trouserWaist ? "apple-vision-body-depth" : activeScaleSource,
    depthRatio: args.localMlDepthRatios?.trouserWaist ?? ((trouserGuideWidthCm) => scaledHipsTrace
      ? guideTrouserWaistDepthRatio({
          gender: scaledHipsTrace.gender,
          bmi: scaledHipsTrace.bmi,
          trouserGuideWidthCm,
          hipBoneCm: activeHipBoneCm,
          fallbackRatio: waistTrace.depthRatio,
        })
      : waistTrace.depthRatio),
    depthSourceOverride: args.localMlDepthRatios?.trouserWaist != null ? args.localMlDepthSource ?? "local-ml-depth-ratio" : undefined,
    absoluteDepthCm: args.localMlAbsoluteDepthCm?.trouserWaist,
    absoluteDepthSource: args.localMlAbsoluteDepthCm?.trouserWaist ? "wear-absolute-depth" : undefined,
    requireAbsoluteDepth: args.requireCompleteLocalMlAbsoluteDepth,
    depthRatioOverride: args.depthRatioOverrides?.trouserWaist,
    depthRatioBounds: { min: 0.35, max: 1.1 },
    rawCm: waistTrace.finalTrouserWaistCm,
    sideDepthCm: sideGuideDepthSource
      ? (line) => measureSideGuideDepth("trouserWaist", line.formulaWidthCm)
      : hasSideMaskDepth
        ? (line) => measureSideDepthAtFrontY(line.yNorm, "trouserWaist", line.formulaWidthCm)
        : undefined,
    sideDepthSource: sideGuideDepthSource ?? (hasSideMaskDepth ? "side-mask-at-guide-row" : undefined),
    allowSideDepthOutsideBounds: sideGuideDepthSource === "side-guide-manual-coordinate",
    looseClothing,
    maskMode: args.maskMode,
  });

  const hipDepthRatio = scaledHipsTrace?.hipBreadthCm
    ? scaledHipsTrace.hipDepthCm / scaledHipsTrace.hipBreadthCm
    : 0.5;
  const waistGuideWidthCm = waist?.formulaWidthCm ?? null;
  const hips = scaledHipsTrace
    ? buildGuideRow({
        kind: "hips",
        label: "Gemini hip row",
        line: hipsLine,
        rowSource: hipsRowSource,
        pose,
        imageWidth: args.imageWidth,
        imageHeight: args.imageHeight,
        cmPerPx: scaleForRow("hips"),
        scaleSource: args.rowCmPerPxOverrides?.hips ? "apple-vision-body-depth" : activeScaleSource,
        depthRatio: args.localMlDepthRatios?.hips ?? ((hipGuideWidthCm) => guideHipDepthRatio({
            hipsTrace: scaledHipsTrace,
            hipGuideWidthCm,
            waistGuideWidthCm,
            fallbackRatio: hipDepthRatio || 0.5,
          })),
        depthSourceOverride: args.localMlDepthRatios?.hips != null ? args.localMlDepthSource ?? "local-ml-depth-ratio" : undefined,
        absoluteDepthCm: args.localMlAbsoluteDepthCm?.hips,
        absoluteDepthSource: args.localMlAbsoluteDepthCm?.hips ? "wear-absolute-depth" : undefined,
        requireAbsoluteDepth: args.requireCompleteLocalMlAbsoluteDepth,
        depthRatioOverride: args.depthRatioOverrides?.hips,
        sideDepthCm: sideGuideDepthSource
          ? (line) => measureSideGuideDepth("hips", line.formulaWidthCm)
          : (line) => measureSideDepthAtFrontY(line.yNorm, "hips", line.formulaWidthCm),
        sideDepthSource: sideGuideDepthSource ?? "side-mask-at-guide-row",
        allowSideDepthOutsideBounds: sideGuideDepthSource === "side-guide-manual-coordinate",
        depthRatioBounds: { min: 0.35, max: 0.9 },
        looseClothing,
        rawCm: scaledHipsTrace.hipsCm,
        maskMode: args.maskMode,
      })
    : null;

  // The local Manual coordinate path is direct geometry evidence: red front
  // endpoints provide breadth, and either the side endpoints or the exposed
  // front-only ratio provides depth. Keep that result as the plain ellipse.
  // The cross-row superellipse heuristic is not measured by either photo and
  // must not silently alter a manually placed span.
  const modeledWaist = usesDirectCoordinateGuide
    ? waist
    : applyCircumferenceModel(
        waist,
        bodyShapeCircumference({
          kind: "waist",
          widthCm: waist?.formulaWidthCm ?? 0,
          depthCm: waist?.depthCm ?? 0,
          waistWidthCm: waist?.formulaWidthCm ?? null,
          waistDepthCm: waist?.depthCm ?? null,
          trouserWidthCm: trouserWaist?.formulaWidthCm ?? null,
          trouserDepthCm: trouserWaist?.depthCm ?? null,
          hipWidthCm: hips?.formulaWidthCm ?? null,
          hipDepthCm: hips?.depthCm ?? null,
        }),
      );
  const modeledTrouserWaist = usesDirectCoordinateGuide
    ? trouserWaist
    : applyCircumferenceModel(
        trouserWaist,
        bodyShapeCircumference({
          kind: "trouserWaist",
          widthCm: trouserWaist?.formulaWidthCm ?? 0,
          depthCm: trouserWaist?.depthCm ?? 0,
          waistWidthCm: modeledWaist?.formulaWidthCm ?? waist?.formulaWidthCm ?? null,
          waistDepthCm: modeledWaist?.depthCm ?? waist?.depthCm ?? null,
          trouserWidthCm: trouserWaist?.formulaWidthCm ?? null,
          trouserDepthCm: trouserWaist?.depthCm ?? null,
          hipWidthCm: hips?.formulaWidthCm ?? null,
          hipDepthCm: hips?.depthCm ?? null,
        }),
      );
  const modeledHips = usesDirectCoordinateGuide
    ? hips
    : applyCircumferenceModel(
        hips,
        bodyShapeCircumference({
          kind: "hips",
          widthCm: hips?.formulaWidthCm ?? 0,
          depthCm: hips?.depthCm ?? 0,
          waistWidthCm: modeledWaist?.formulaWidthCm ?? waist?.formulaWidthCm ?? null,
          waistDepthCm: modeledWaist?.depthCm ?? waist?.depthCm ?? null,
          trouserWidthCm: modeledTrouserWaist?.formulaWidthCm ?? trouserWaist?.formulaWidthCm ?? null,
          trouserDepthCm: modeledTrouserWaist?.depthCm ?? trouserWaist?.depthCm ?? null,
          hipWidthCm: hips?.formulaWidthCm ?? null,
          hipDepthCm: hips?.depthCm ?? null,
        }),
      );

  const tableGender = scaledHipsTrace?.gender ?? waistTrace.gender;
  const tableBmi = scaledHipsTrace?.bmi ?? waistTrace.bmi;
  const tableHeightCm = waistTrace.heightCm;
  // Local ML owns row placement only. After its rows are drawn, reuse the same
  // WEAR recommendation + manual-slider circumference calculator as Manual
  // Coordinate. This does not make the WEAR depth formula part of row training.
  const tableWaist = args.applyWearDepthFormula === false ? modeledWaist : applyDepthRatioTableComparison({
    row: modeledWaist,
    gender: tableGender,
    bmi: tableBmi,
    heightCm: tableHeightCm,
    waistWidthCm: modeledWaist?.formulaWidthCm ?? null,
    waistDepthCm: null,
    trouserWidthCm: modeledTrouserWaist?.formulaWidthCm ?? null,
    trouserDepthCm: null,
    hipWidthCm: modeledHips?.formulaWidthCm ?? null,
    hipDepthCm: null,
    useBodyShapeCircumference: false,
  });
  const tableTrouserWaist = args.applyWearDepthFormula === false ? modeledTrouserWaist : applyDepthRatioTableComparison({
    row: modeledTrouserWaist,
    gender: tableGender,
    bmi: tableBmi,
    heightCm: tableHeightCm,
    waistWidthCm: modeledWaist?.formulaWidthCm ?? null,
    waistDepthCm: null,
    trouserWidthCm: modeledTrouserWaist?.formulaWidthCm ?? null,
    trouserDepthCm: null,
    hipWidthCm: modeledHips?.formulaWidthCm ?? null,
    hipDepthCm: null,
    useBodyShapeCircumference: false,
  });
  const tableHips = args.applyWearDepthFormula === false ? modeledHips : applyDepthRatioTableComparison({
    row: modeledHips,
    gender: tableGender,
    bmi: tableBmi,
    heightCm: tableHeightCm,
    waistWidthCm: modeledWaist?.formulaWidthCm ?? null,
    waistDepthCm: null,
    trouserWidthCm: modeledTrouserWaist?.formulaWidthCm ?? null,
    trouserDepthCm: null,
    hipWidthCm: modeledHips?.formulaWidthCm ?? null,
    hipDepthCm: null,
    useBodyShapeCircumference: false,
  });

  const rows = [tableWaist, tableTrouserWaist, tableHips].filter((row): row is GeminiGuideMeasurementRow => Boolean(row));
  if (!rows.length) return null;

  return {
    guide,
    activeCmPerPx: round(activeCmPerPx, 5),
    activeScaleSource,
    frontHeightCmPerPx: frontScale ? round(frontScale.cmPerPx, 5) : null,
    sideHeightCmPerPx: sideScale ? round(sideScale.cmPerPx, 5) : null,
    sideHeightScaleSource: sideScale ? (sideMaskScale ? "mask-height" : "pose-landmarks") : null,
    sideScaleDeltaPct: sideScale && activeCmPerPx > 0 ? round(((sideScale.cmPerPx / activeCmPerPx) - 1) * 100, 1) : null,
    waist: tableWaist,
    trouserWaist: tableTrouserWaist,
    hips: tableHips,
    rows,
    debugRows: rows.map((row) => ({
      id: `${row.rowSource === "pose-mask-fallback" ? "fallback-guide" : row.rowSource === "local-ml-v1" ? "local-ml-guide" : row.rowSource === "manual-adjusted-coordinate" ? "manual-adjusted-guide" : row.rowSource === "manual-coordinate" ? "manual-guide" : "gemini-guide"}-${row.kind}`,
      label: row.kind === "waist"
        ? row.rowSource === "pose-mask-fallback" ? "fallback waist guide" : row.rowSource === "local-ml-v1" ? "Local ML waist guide" : row.rowSource === "manual-adjusted-coordinate" ? "manual-adjusted waist guide" : row.rowSource === "manual-coordinate" ? "manual waist guide" : "Gemini waist guide"
        : row.kind === "trouserWaist"
          ? row.rowSource === "pose-mask-fallback" ? "fallback trouser waist guide" : row.rowSource === "local-ml-v1" ? "Local ML trouser waist guide" : row.rowSource === "manual-adjusted-coordinate" ? "manual-adjusted trouser waist guide" : row.rowSource === "manual-coordinate" ? "manual trouser waist guide" : "Gemini trouser waist guide"
          : row.rowSource === "pose-mask-fallback" ? "fallback hip guide" : row.rowSource === "local-ml-v1" ? "Local ML hip guide" : row.rowSource === "manual-adjusted-coordinate" ? "manual-adjusted hip guide" : row.rowSource === "manual-coordinate" ? "manual hip guide" : "Gemini hip guide",
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

export function buildGeminiGuideDebugRows(args: {
  guide: GeminiBodyGuide | null;
  guideSource?: string | null;
  pose: PoseResult | null;
  imageWidth: number;
  imageHeight: number;
  heightCm: number;
  idPrefix: string;
  labelPrefix: string;
  color?: string;
}): MeasurementDebugRow[] {
  if (!args.guide || args.imageWidth <= 0 || args.imageHeight <= 0) return [];
  const scale = args.pose ? computePoseScale(args.pose, args.imageWidth, args.imageHeight, args.heightCm) : null;
  const sourceLabel = args.guideSource?.startsWith("red-pixel-detector") ? "red-pixel" : "JSON";
  return [
    { kind: "waist" as const, line: args.guide.waist, label: "waist" },
    { kind: "trouserWaist" as const, line: args.guide.trouserWaist, label: "trouser waist" },
    { kind: "hips" as const, line: args.guide.hips, label: "hips" },
  ].flatMap(({ kind, line, label }) => {
    const normalized = normalizeLine(line, args.imageWidth, args.imageHeight);
    if (!normalized) return [];
    const widthPx = normalized.rightXPx - normalized.leftXPx;
    return [{
      id: `${args.idPrefix}-${kind}`,
      label: `${args.labelPrefix} ${label} ${sourceLabel}`,
      yNorm: round(normalized.yNorm, 4),
      leftXNorm: round(normalized.leftXNorm, 4),
      rightXNorm: round(normalized.rightXNorm, 4),
      widthPx,
      widthCm: scale ? round(widthPx * scale.cmPerPx, 1) : undefined,
      color: args.color ?? "#ef4444",
      selected: true,
    }];
  });
}

export function computeGeminiGuideImageMeasurement(args: {
  guide: GeminiBodyGuide | null;
  guideSource?: string | null;
  pose: PoseResult | null;
  imageWidth: number;
  imageHeight: number;
  heightCm: number;
  maskMode: MeasurementMaskMode;
}): GeminiGuideMeasurement | null {
  if (!args.guide || !args.pose || args.imageWidth <= 0 || args.imageHeight <= 0) return null;
  const poseScale = computePoseScale(args.pose, args.imageWidth, args.imageHeight, args.heightCm);
  const maskScale = computeMaskHeightScale(args.pose, args.imageWidth, args.imageHeight, args.heightCm);
  const scale = applyMaskHeightScale(poseScale, maskScale);
  if (!scale) return null;
  const rowSource: GeminiGuideMeasurementRow["rowSource"] = args.guideSource === "manual-coordinate"
    ? "manual-coordinate"
    : args.guideSource === "local-ml-v1"
      ? "local-ml-v1"
    : args.guideSource === "manual-adjusted-coordinate"
      ? "manual-adjusted-coordinate"
      : args.guideSource?.startsWith("red-pixel-detector")
      ? "red-pixel-detector"
      : "gemini-json";
  const rows = [
    buildImageGuideRow({
      kind: "waist",
      label: "Side waist row",
      line: args.guide.waist,
      rowSource,
      pose: args.pose,
      imageWidth: args.imageWidth,
      imageHeight: args.imageHeight,
      cmPerPx: scale.cmPerPx,
      maskMode: args.maskMode,
    }),
    buildImageGuideRow({
      kind: "trouserWaist",
      label: "Side trouser waist row",
      line: args.guide.trouserWaist,
      rowSource,
      pose: args.pose,
      imageWidth: args.imageWidth,
      imageHeight: args.imageHeight,
      cmPerPx: scale.cmPerPx,
      maskMode: args.maskMode,
    }),
    buildImageGuideRow({
      kind: "hips",
      label: "Side hip row",
      line: args.guide.hips,
      rowSource,
      pose: args.pose,
      imageWidth: args.imageWidth,
      imageHeight: args.imageHeight,
      cmPerPx: scale.cmPerPx,
      maskMode: args.maskMode,
    }),
  ].filter((row): row is GeminiGuideMeasurementRow => Boolean(row));
  if (!rows.length) return null;
  return {
    guide: args.guide,
    activeCmPerPx: round(scale.cmPerPx, 5),
    activeScaleSource: "global-height",
    frontHeightCmPerPx: round(scale.cmPerPx, 5),
    sideHeightCmPerPx: null,
    sideHeightScaleSource: null,
    sideScaleDeltaPct: null,
    waist: rows.find((row) => row.kind === "waist") ?? null,
    trouserWaist: rows.find((row) => row.kind === "trouserWaist") ?? null,
    hips: rows.find((row) => row.kind === "hips") ?? null,
    rows,
    debugRows: rows.map((row) => ({
      id: `side-gemini-guide-${row.kind}`,
      label: row.kind === "waist"
        ? "side Gemini waist guide"
        : row.kind === "trouserWaist"
          ? "side Gemini trouser waist guide"
          : "side Gemini hip guide",
      yNorm: row.yNorm,
      leftXNorm: row.formulaLeftXNorm,
      rightXNorm: row.formulaRightXNorm,
      widthCm: row.formulaWidthCm,
      color: "#ef4444",
      selected: true,
    })),
  };
}

function getSideGuideDepthSource(source: string | null | undefined): GeminiGuideMeasurementRow["depthSource"] | null {
  if (!source) return null;
  if (source.startsWith("red-pixel-detector")) return "side-guide-red-pixel";
  if (source.startsWith("gemini-json")) return "side-guide-json";
  if (source === "manual-coordinate") return "side-guide-manual-coordinate";
  if (source === "manual-adjusted-coordinate") return "side-guide-manual-coordinate";
  return null;
}

function computeCurveGeometry(
  points: Array<{ xPx: number; yPx: number }>,
  fallbackLeftX: number,
  fallbackLeftY: number,
  fallbackRightX: number,
  fallbackRightY: number,
): { chordPx: number; arcPx: number } {
  const usablePoints = points.length >= 2
    ? points
    : [
        { xPx: fallbackLeftX, yPx: fallbackLeftY },
        { xPx: fallbackRightX, yPx: fallbackRightY },
      ];
  const first = usablePoints[0]!;
  const last = usablePoints[usablePoints.length - 1]!;
  const chordPx = distancePx(first, last);
  let arcPx = 0;
  for (let index = 1; index < usablePoints.length; index += 1) {
    arcPx += distancePx(usablePoints[index - 1]!, usablePoints[index]!);
  }
  return { chordPx, arcPx: arcPx > 0 ? arcPx : chordPx };
}

function distancePx(a: { xPx: number; yPx: number }, b: { xPx: number; yPx: number }): number {
  return Math.hypot(b.xPx - a.xPx, b.yPx - a.yPx);
}

function buildImageGuideRow(args: {
  kind: "waist" | "trouserWaist" | "hips";
  label: string;
  line: GeminiGuideLine | undefined;
  rowSource: GeminiGuideMeasurementRow["rowSource"];
  pose: PoseResult;
  imageWidth: number;
  imageHeight: number;
  cmPerPx: number;
  maskMode: MeasurementMaskMode;
}): GeminiGuideMeasurementRow | null {
  const normalized = normalizeLine(args.line, args.imageWidth, args.imageHeight);
  if (!normalized || args.cmPerPx <= 0) return null;
  const widthPx = normalized.rightXPx - normalized.leftXPx;
  const widthCm = widthPx * args.cmPerPx;
  if (widthCm <= 0) return null;
  const centerXNorm = (normalized.leftXNorm + normalized.rightXNorm) / 2;
  const maskMeasurement = measureSideSilhouetteMaskWidth(
    args.pose,
    args.imageWidth,
    args.imageHeight,
    args.cmPerPx,
    normalized.yNorm,
    centerXNorm,
  );
  const usesLocalMlEndpoints = args.rowSource === "local-ml-v1";
  const usesManualEndpoints = args.rowSource === "manual-adjusted-coordinate" || args.rowSource === "manual-coordinate";
  const usesDirectEndpoints = usesManualEndpoints || usesLocalMlEndpoints;
  const maskLeftXNorm = maskMeasurement?.leftXNorm ?? null;
  const maskRightXNorm = maskMeasurement?.rightXNorm ?? null;
  const maskYNorm = maskMeasurement?.yNorm ?? null;
  const formulaSpan = resolveFormulaSpan({
    lineLeftXNorm: normalized.leftXNorm,
    lineRightXNorm: normalized.rightXNorm,
    imageWidth: args.imageWidth,
    cmPerPx: args.cmPerPx,
  });
  const selectedFormulaWidthCm = formulaSpan.widthCm;
  if (selectedFormulaWidthCm <= 0) return null;
  const formulaLeftXNorm = formulaSpan.leftXNorm;
  const formulaRightXNorm = formulaSpan.rightXNorm;
  const activePoints = normalized.points.map((point) => ({
    xPx: point.xPx,
    yPx: point.yPx,
    xNorm: round(point.xNorm, 4),
    yNorm: round(point.yNorm, 4),
  }));
  const curveGeometry = computeCurveGeometry(normalized.points, normalized.leftXPx, normalized.yPx, normalized.rightXPx, normalized.yPx);
  const formulaWidthSource: GeminiGuideMeasurementRow["formulaWidthSource"] = args.rowSource === "red-pixel-detector"
      ? "gemini-red-line"
      : usesLocalMlEndpoints
        ? "local-ml-v1"
      : usesManualEndpoints
        ? "manual-coordinates"
        : "gemini-json-endpoints";
  const edgeTrust: GeminiGuideEdgeTrust = usesLocalMlEndpoints
    ? "local-ml-predicted-edge"
    : usesDirectEndpoints
      ? "manual-body-edge"
    : "model-red-edge";
  return {
    kind: args.kind,
    label: args.label,
    rowSource: args.rowSource,
    yPx: normalized.yPx,
    leftXPx: Math.round(formulaLeftXNorm * args.imageWidth),
    rightXPx: Math.round(formulaRightXNorm * args.imageWidth),
    yNorm: round(normalized.yNorm, 4),
    leftXNorm: round(normalized.leftXNorm, 4),
    rightXNorm: round(normalized.rightXNorm, 4),
    points: activePoints,
    confidence: round(normalized.confidence, 2),
    geminiWidthCm: round(widthCm, 1),
    formulaWidthCm: round(selectedFormulaWidthCm, 1),
    calculationWidthCm: round(selectedFormulaWidthCm, 1),
    calculationWidthExactCm: selectedFormulaWidthCm,
    calculationWidthSource: "red-line",
    cmPerPx: round(args.cmPerPx, 6),
    scaleSource: "global-height",
    formulaWidthSource,
    formulaLeftXNorm: round(formulaLeftXNorm, 4),
    formulaRightXNorm: round(formulaRightXNorm, 4),
    maskLeftXNorm: maskLeftXNorm == null ? null : round(maskLeftXNorm, 4),
    maskRightXNorm: maskRightXNorm == null ? null : round(maskRightXNorm, 4),
    maskYNorm: maskYNorm == null ? null : round(maskYNorm, 4),
    edgeTrust,
    depthSource: "front-formula",
    sideDepthCandidateCm: null,
    sideDepthCandidateRatio: null,
    sideDepthRawCm: null,
    sideDepthRawRatio: null,
    sideDepthProjectionLeakRatio: null,
    sideDepthAccepted: false,
    baseDepthRatio: 0,
    depthRatioOverride: null,
    depthRatio: 0,
    depthCm: 0,
    calculationDepthExactCm: 0,
    depthRatioTable: null,
    maskWidthCm: maskMeasurement?.widthCm == null ? null : round(maskMeasurement.widthCm, 1),
    curveHorizontalCm: round(selectedFormulaWidthCm, 1),
    curveChordCm: round(curveGeometry.chordPx * args.cmPerPx, 1),
    curveArcCm: round(curveGeometry.arcPx * args.cmPerPx, 1),
    curveArcDeltaCm: round((curveGeometry.arcPx * args.cmPerPx) - selectedFormulaWidthCm, 1),
    rawCm: 0,
    guidedCm: 0,
    circumferenceDeltaCm: 0,
    circumferenceModel: "ellipse",
    shapeExponent: null,
    shapeFlareRatio: null,
  };
}
