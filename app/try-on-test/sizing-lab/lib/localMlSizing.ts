import type {
  GeminiBodyGuide,
  GeminiGuideDepthRatioOverrides,
  GeminiGuideLine,
  GeminiGuideRowKind,
} from "./geminiGuide";

export const LOCAL_ML_MODEL_VERSION = "front-multitask-v1";
export const LOCAL_ML_CHECKPOINT_RELATIVE_PATH = ".local-ml/checkpoints/front-multitask-v1.onnx";
export const WEAR_ROW_PRIOR_MODEL_VERSION = "wear-1d-row-prior-v1";
export const WEAR_ROW_PRIOR_RELATIVE_PATH = "app/try-on-test/sizing-lab/models/wear-1d-row-prior-v1.json";

export type LocalMlModelStage = "wear-1d-row-prior" | "front-multitask-3d";

export type LocalMlRunStatus = "idle" | "checking" | "waiting-for-checkpoint" | "predicting" | "ready" | "error";

export interface LocalMlModelStatusResponse {
  ok: boolean;
  localOnly: true;
  modelVersion: string;
  checkpointReady: boolean;
  rowPriorReady: boolean;
  fullCheckpointReady: boolean;
  activeStage: LocalMlModelStage | null;
  checkpointPath: string;
  rowPriorPath: string;
  trainingManifestPath: string;
  message: string;
}

export interface LocalMlNormalizedRowPrediction {
  kind: GeminiGuideRowKind;
  yNorm: number;
  leftXNorm: number;
  rightXNorm: number;
  depthRatio: number | null;
  confidence: number;
  trainingSamples?: number;
  trainingSurveys?: number;
  trainingGenderCounts?: Partial<Record<"male" | "female", number>>;
  validationMode?: string;
  validationMaeAt170Cm?: number;
  validationP90At170Cm?: number;
  definition?: string;
}

export interface LocalMlPredictionResponse {
  ok: boolean;
  modelVersion: string;
  modelStage: LocalMlModelStage;
  depthReady: boolean;
  endpointSource: "local-ml" | "mediapipe-visible-mask";
  checkpointFingerprint: string;
  elapsedMs: number;
  rows: LocalMlNormalizedRowPrediction[];
  error?: string;
}

export interface LocalMlGuidePrediction {
  guide: GeminiBodyGuide;
  depthRatios: GeminiGuideDepthRatioOverrides;
  confidenceByRow: Partial<Record<GeminiGuideRowKind, number>>;
  minimumConfidence: number;
  depthReady: boolean;
}

const ROW_ORDER: GeminiGuideRowKind[] = ["waist", "trouserWaist", "hips"];

function finiteUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function buildLine(
  prediction: LocalMlNormalizedRowPrediction,
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine {
  const yPx = prediction.yNorm * imageHeight;
  const leftXPx = prediction.leftXNorm * imageWidth;
  const rightXPx = prediction.rightXNorm * imageWidth;
  const spanPx = rightXPx - leftXPx;
  return {
    y_px: Math.round(yPx),
    left_x_px: Math.round(leftXPx),
    right_x_px: Math.round(rightXPx),
    confidence: prediction.confidence,
    points: [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
      x_px: Math.round(leftXPx + spanPx * fraction),
      y_px: Math.round(yPx),
    })),
  };
}

export function buildLocalMlGuidePrediction(
  rows: LocalMlNormalizedRowPrediction[],
  imageWidth: number,
  imageHeight: number,
): LocalMlGuidePrediction | null {
  if (imageWidth <= 0 || imageHeight <= 0 || rows.length !== ROW_ORDER.length) return null;
  const ordered = ROW_ORDER.map((kind) => rows.find((row) => row.kind === kind) ?? null);
  if (ordered.some((row) => !row)) return null;
  const safeRows = ordered as LocalMlNormalizedRowPrediction[];

  for (const row of safeRows) {
    if (
      !finiteUnit(row.yNorm)
      || !finiteUnit(row.leftXNorm)
      || !finiteUnit(row.rightXNorm)
      || row.rightXNorm - row.leftXNorm < 0.03
      || (row.depthRatio != null && (
        !Number.isFinite(row.depthRatio)
        || row.depthRatio < 0.35
        || row.depthRatio > 1.1
      ))
      || !finiteUnit(row.confidence)
    ) return null;
  }
  if (!(safeRows[0]!.yNorm < safeRows[1]!.yNorm && safeRows[1]!.yNorm < safeRows[2]!.yNorm)) return null;

  const guide: GeminiBodyGuide = {
    waist: buildLine(safeRows[0]!, imageWidth, imageHeight),
    trouserWaist: buildLine(safeRows[1]!, imageWidth, imageHeight),
    hips: buildLine(safeRows[2]!, imageWidth, imageHeight),
    notes: safeRows.every((row) => row.depthRatio != null)
      ? "Local ML front-multitask-v1 prediction. Apple owns row scale; the existing ellipse calculation owns circumference."
      : "WEAR 1D predicts vertical anatomical rows only. MediaPipe supplies visible mask endpoints. Circumference waits for future 3D depth training.",
  };
  const depthRows = safeRows.filter((row) => row.depthRatio != null);
  return {
    guide,
    depthRatios: Object.fromEntries(depthRows.map((row) => [row.kind, row.depthRatio])) as GeminiGuideDepthRatioOverrides,
    confidenceByRow: Object.fromEntries(safeRows.map((row) => [row.kind, row.confidence])),
    minimumConfidence: Math.min(...safeRows.map((row) => row.confidence)),
    depthReady: depthRows.length === ROW_ORDER.length,
  };
}
