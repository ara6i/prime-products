"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/app/shared/components/ui/button";
import { ImageUploader } from "./components/ImageUploader";
import { MetricsForm } from "./components/MetricsForm";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { ResultCard } from "./components/ResultCard";
import { FormulaPanel } from "./components/FormulaPanel";
import { LandmarkTable } from "./components/LandmarkTable";
import { MaskPreview } from "./components/MaskPreview";
import { HipsCard } from "./components/HipsCard";
import { GeminiCalibrationPanel } from "./components/GeminiCalibrationPanel";
import { GeminiGuidePanel } from "./components/GeminiGuidePanel";
import { ThirdPartyProviderPanel, type ThirdPartyScanResult } from "./components/ThirdPartyProviderPanel";
import { ShahnazPhotoPairPanel } from "./components/ShahnazPhotoPairPanel";
import { LocalMlTrainingDiagram } from "./components/LocalMlTrainingDiagram";
import { LocalMlRowEvidencePanel } from "./components/LocalMlRowEvidencePanel";
import {
  ManualCoordinateGuidePanel,
  type ManualHeightScaleOverride,
  type ManualScaleProofPreset,
} from "./components/ManualCoordinateGuidePanel";
import type { AppleVisionBodyScaleResult } from "./lib/appleVisionBodyScale";
import {
  buildLocalMlGuidePrediction,
  type LocalMlModelStage,
  type LocalMlModelStatusResponse,
  type LocalMlNormalizedRowPrediction,
  type LocalMlPredictionResponse,
  type LocalMlRunStatus,
} from "./lib/localMlSizing";
import { encodeLocalMlMaskDataUrl } from "./lib/localMlClient";
import { computeHips, type HipsTrace } from "./lib/hipsFormula";
import { computePoseScale, measureMaskWidthAtY } from "./lib/bodyMaskGeometry";
import { detectSegmenterMeasurementMask, removeBackgroundWithSegmenter } from "./lib/imageSegmenter";
import { detectPoseAndMask } from "./lib/poseDetector";
import { calibrateGeminiMaskMeasurements } from "./lib/geminiMaskCalibration";
import {
  DEFAULT_SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT,
  SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT_VERSION,
} from "./lib/geminiCameraCalibrationPrompt";
import { DEFAULT_SIZING_LAB_GEMINI_PROMPT } from "./lib/geminiNormalizePrompt";
import {
  buildGeminiGuideDebugRows,
  computeGeminiGuideImageMeasurement,
  computeGeminiGuideMeasurement,
  DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT,
  DEFAULT_SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT,
  NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT,
  NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION,
  NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT,
  NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION,
  SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION,
  SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT_VERSION,
  type GeminiBodyGuide,
  type GeminiGuideDepthRatioOverrides,
  type GeminiGuideLine,
} from "./lib/geminiGuide";
import {
  DEFAULT_SIZING_LAB_GEMINI_CORRECTION_PROMPT,
  type GeminiMeasurementCorrection,
  type GeminiMeasurementCorrectionRow,
} from "./lib/geminiMeasurementCorrection";
import {
  buildSdkBodyLandmarks,
  type SdkBackendTrace,
} from "./lib/sdkBackendRequest";
import { useImageInput } from "./hooks/useImageInput";
import { usePoseAnalysis } from "./hooks/usePoseAnalysis";
import { useWaistCalculation } from "./hooks/useWaistCalculation";
import type { MaskHeightScaleAudit, MeasurementDebugRow, MeasurementMaskMode, MetricsInput, PoseResult, WaistTrace } from "./types";

interface DatasetRow {
  setId: string;
  label: string;
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  age: number;
  chestCm: number;
  waistCm: number;
  waistTapeMarkCm?: number;
  waistTapeMarkIn?: number;
  waistTarget?: "natural" | "trouser";
  trouserWaistCm?: number;
  trouserWaistTapeMarkCm?: number;
  trouserWaistTapeMarkIn?: number;
  hipsCm: number;
  hipsTapeMarkCm?: number;
  hipsTapeMarkIn?: number;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  waistSideDepthCm?: number;
  trouserWaistSideDepthCm?: number;
  hipsSideDepthCm?: number;
  pelvisCm: number;
  underChestCm: number;
  cup?: string | null;
  bra: { band: number; cup: string } | null;
  frontImageUrl: string;
  alternateFrontImageUrl?: string;
  sideImageUrl: string;
}

const DEFAULT_METRICS: MetricsInput = {
  heightCm: 178,
  weightKg: 80,
  gender: "male",
  bustCm: null,
  unitSystem: "metric",
  braSize: null,
  cup: null,
};

type AnalysisPath = "raw" | "landmark" | "mask-guide" | "manual-guide" | "local-ml" | "segmenter" | "backend-sdk" | "gemini" | "gemini-calibrated" | "gemini-guide" | "gemini-guide-side" | "third-party";
type PoseSource = "original-raw" | "original-segmenter" | "gemini" | "gemini-calibrated" | "gemini-guide" | "gemini-guide-side" | "manual-guide" | "local-ml";
type ShahnazPhotoKey = "tape" | "second";
interface GuideInputImageDebug {
  originalKb: number;
  compressedKb: number;
  geminiPayloadKb?: number;
  width: number;
  height: number;
  sentWidth: number;
  sentHeight: number;
  dimensionsPreserved: boolean;
  coordinateScaleX: number;
  coordinateScaleY: number;
  prepMs: number;
}

interface GuideOutputImageDebug {
  mimeType?: string;
  kb?: number;
  width?: number;
  height?: number;
  requestedSize?: string;
}

interface GeminiGuideTimingDebug {
  browserPrepMs?: number;
  apiTotalMs?: number;
  serverPrepareMs?: number;
  geminiRoundTripMs?: number;
  geminiRequestMs?: number;
  redDetectMs?: number;
}

interface GeminiGuideCandidateDebug {
  redPixel?: GeminiBodyGuide | null;
  geminiJson?: GeminiBodyGuide | null;
}

interface GeminiGuideResponseDebug {
  rawText: string;
  returnedText: boolean;
  returnedImage: boolean;
  guideSource: string;
  inputImage?: GuideInputImageDebug;
  outputImage?: GuideOutputImageDebug | null;
  timings?: GeminiGuideTimingDebug;
  guideCandidates?: GeminiGuideCandidateDebug;
}

interface GeminiGuideRunResult {
  ok: boolean;
  error?: string;
  guide: GeminiBodyGuide | null;
  geminiMs: number | null;
  gridImageDataUrl: string | null;
  guideImageDataUrl: string | null;
  promptDebug: {
    source: string;
    version: string;
    preview: string;
  };
  responseDebug: GeminiGuideResponseDebug;
}

type GeminiImageModelCode =
  | "gemini-2.5-flash-image"
  | "gemini-3.1-flash-image"
  | "gemini-3.1-flash-lite-image"
  | "gemini-3-pro-image";
type GeminiGuideModelCode =
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash-image"
  | "gemini-3.1-flash-image"
  | "gemini-3.1-flash-lite-image"
  | "gemini-3-pro-image"
  | "openai:gpt-image-2"
  | "openai:gpt-5.5"
  | "openai:gpt-5.4-mini";

const GEMINI_IMAGE_MODELS: Array<{
  value: GeminiImageModelCode;
  label: string;
  description: string;
}> = [
  {
    value: "gemini-2.5-flash-image",
    label: "Nano Banana",
    description: "Original Gemini 2.5 Flash image model for fast conversational edits.",
  },
  {
    value: "gemini-3.1-flash-image",
    label: "Nano Banana 2",
    description: "Balanced quality and speed. Default comparison model.",
  },
  {
    value: "gemini-3.1-flash-lite-image",
    label: "Nano Banana Lite",
    description: "Fastest 1K option for quick iterations.",
  },
  {
    value: "gemini-3-pro-image",
    label: "Nano Banana Pro",
    description: "Highest-fidelity editing path for hard cases.",
  },
];

const GEMINI_GUIDE_MODELS: Array<{
  value: GeminiGuideModelCode;
  label: string;
  description: string;
}> = [
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast coordinate JSON model. Kept for comparison; often weaker on row endpoints.",
  },
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Slower reasoning model for difficult photos.",
  },
  {
    value: "gemini-2.5-flash-image",
    label: "Nano Banana",
    description: "Image model comparison path; may be less reliable for strict JSON.",
  },
  {
    value: "gemini-3.1-flash-image",
    label: "Nano Banana 2",
    description: "Better visual row picking on current lab tests. Default coordinate-guide model.",
  },
  {
    value: "gemini-3.1-flash-lite-image",
    label: "Nano Banana Lite",
    description: "Fast image model comparison path for coordinate prompts.",
  },
  {
    value: "gemini-3-pro-image",
    label: "Nano Banana Pro",
    description: "Higher-fidelity image model comparison path for coordinate prompts.",
  },
  {
    value: "openai:gpt-image-2",
    label: "OpenAI GPT Image 2",
    description: "OpenAI Image API edit path. Returns an annotated image so the red-pixel detector can measure visible red curves.",
  },
  {
    value: "openai:gpt-5.5",
    label: "OpenAI GPT-5.5 Vision JSON",
    description: "Text-only coordinate JSON comparison. Does not return red curves.",
  },
  {
    value: "openai:gpt-5.4-mini",
    label: "OpenAI GPT-5.4 Mini Vision JSON",
    description: "Faster text-only coordinate JSON comparison. Does not return red curves.",
  },
];

const ANALYSIS_PATHS: Array<{
  value: AnalysisPath;
  label: string;
  description: string;
}> = [
  {
    value: "raw",
    label: "Raw photo",
    description: "MediaPipe mask exactly as detected.",
  },
  {
    value: "landmark",
    label: "Landmark cleanup",
    description: "Original photo and raw mask preview; waist/hip rows ignore side hair and arm/hand blobs.",
  },
  {
    value: "mask-guide",
    label: "Mask/MediaPipe guide",
    description: "No Gemini. Shows the current mask-derived natural waist, estimated trouser waist, and hip guide rows.",
  },
  {
    value: "manual-guide",
    label: "Manual coordinate",
    description: "Drag waist, trouser-waist, and hip red guide points by hand. Optional Gemini camera-angle correction can become the test image first.",
  },
  {
    value: "local-ml",
    label: "Local ML",
    description: "Completely separate mode. WEAR 1D draws the three vertical rows and MediaPipe supplies temporary endpoints; the same Apple/Depth, slider, and circumference calculator as Manual Coordinate runs afterward.",
  },
  {
    value: "segmenter",
    label: "MediaPipe Segmenter",
    description: "Google multiclass mask removes background, hair, and face before row cleanup.",
  },
  {
    value: "backend-sdk",
    label: "SDK/backend formulas",
    description: "Runs MediaPipe on the original image, then calls the SDK backend /sizing/recommend route. No Gemini or prompt.",
  },
  {
    value: "gemini",
    label: "Gemini normalized",
    description: "Gemini creates the measurement image first. MediaPipe runs only on that generated image.",
  },
  {
    value: "gemini-calibrated",
    label: "Gemini calibrated",
    description: "Measures Gemini output, then corrects widths against the original cleaned mask at the same body rows.",
  },
  {
    value: "gemini-guide",
    label: "Coordinate curve guide",
    description: "A guide model gets the source photo plus grid overlay, then returns visible curved red lines and/or matching JSON coordinates.",
  },
  {
    value: "gemini-guide-side",
    label: "Gemini guide row + side photo",
    description: "Separate mode. Gemini draws front guide curves and side-profile guide curves; front width plus side-guide depth drives the ellipse formula.",
  },
  {
    value: "third-party",
    label: "Third parties",
    description: "Compare guided front + side scans from Bodygram, 3DLOOK, Size Stream, or TrueToForm. Test-lab only.",
  },
];

const FEATURED_ANALYSIS_PATHS = ANALYSIS_PATHS.filter(
  (path) => path.value === "manual-guide" || path.value === "local-ml",
);

const NEGAR_4_MANUAL_TAPE_ROW_PRESET = {
  sourceImageHeight: 2048,
  sourceImageWidth: 1136,
  waist: { tapeCm: 41, yPx: 774, leftXPx: 282, rightXPx: 654 },
  trouserWaist: { tapeCm: 48, yPx: 875, leftXPx: 269, rightXPx: 660 },
  hips: { tapeCm: 61, yPx: 1050, leftXPx: 240, rightXPx: 680 },
};

const NEGAR_2_MANUAL_ROW_PRESET = {
  sourceImageHeight: 1600,
  sourceImageWidth: 1200,
  waist: { yPx: 644, leftXPx: 498, rightXPx: 711 },
  trouserWaist: { yPx: 708, leftXPx: 482, rightXPx: 725 },
  hips: { yPx: 816, leftXPx: 458, rightXPx: 733 },
};

const SHANE_MANUAL_ROW_PRESET = {
  sourceImageHeight: 4284,
  sourceImageWidth: 5712,
  waist: { yPx: 2384, leftXPx: 2215, rightXPx: 2781 },
  trouserWaist: { yPx: 2150, leftXPx: 2236, rightXPx: 2773 },
  hips: { yPx: 2593, leftXPx: 2176, rightXPx: 2791 },
};

const SHANE_MANUAL_HEIGHT_PRESET = {
  sourceImageHeight: 4284,
  sourceImageWidth: 5712,
  topYPx: 1146,
  bottomYPx: 3958,
  centerXPx: 2493,
};

const SHANE_2_MANUAL_ROW_PRESET = {
  sourceImageHeight: 3024,
  sourceImageWidth: 4032,
  waist: { yPx: 1358, leftXPx: 1919, rightXPx: 2238 },
  trouserWaist: { yPx: 1576, leftXPx: 1896, rightXPx: 2235 },
  hips: { yPx: 1698, leftXPx: 1886, rightXPx: 2247 },
};

const SHANE_2_MANUAL_HEIGHT_PRESET = {
  sourceImageHeight: 3024,
  sourceImageWidth: 4032,
  topYPx: 817,
  bottomYPx: 2522,
  centerXPx: 2062,
};

const SHANE_2_SCALE_PROOF_PRESET: ManualScaleProofPreset = {
  sourceImageHeight: 3024,
  sourceImageWidth: 4032,
  start: { x: 2047.92, y: 1021.2 },
  end: { x: 2045, y: 1303.94 },
  intervalValue: 10,
  unit: "in",
};

const SHAHNAZ_2_MANUAL_ROW_PRESET = {
  sourceImageHeight: 5712,
  sourceImageWidth: 4284,
  waist: { yPx: 2235, leftXPx: 1730, rightXPx: 2778 },
  trouserWaist: { yPx: 2663, leftXPx: 1652, rightXPx: 2831 },
  hips: { yPx: 3077, leftXPx: 1676, rightXPx: 2828 },
};

// IMG_8444 was registered against the saved Shahnaz 2 tape photo. These are
// matching anatomical rows in the second image, not copied raw pixel spans.
const SHAHNAZ_2_SECOND_MANUAL_ROW_PRESET = {
  sourceImageHeight: 1600,
  sourceImageWidth: 1200,
  waist: { yPx: 630, leftXPx: 451, rightXPx: 759 },
  trouserWaist: { yPx: 758, leftXPx: 429, rightXPx: 770 },
  hips: { yPx: 879, leftXPx: 437, rightXPx: 765 },
};

const SHAHNAZ_2_MANUAL_HEIGHT_PRESET = {
  sourceImageHeight: 5712,
  sourceImageWidth: 4284,
  topYPx: 324,
  bottomYPx: 5472,
  centerXPx: 1854,
};

const SHAHNAZ_2_SECOND_MANUAL_HEIGHT_PRESET = {
  sourceImageHeight: 1600,
  sourceImageWidth: 1200,
  topYPx: 88,
  bottomYPx: 1514,
  centerXPx: 600,
};

const SHAHNAZ_2_SCALE_PROOF_PRESET: ManualScaleProofPreset = {
  sourceImageHeight: 5712,
  sourceImageWidth: 4284,
  start: { x: 2282, y: 1493 },
  end: { x: 2272, y: 1836 },
  intervalValue: 10,
  unit: "cm",
};

const BAHAR_TAPE_ROW_PRESET = {
  sourceImageHeight: 4080,
  sourceImageWidth: 3072,
  waist: { tapeCm: 40, yPx: 1792 },
  trouserWaist: { tapeCm: 51, yPx: 2000 },
  hips: { tapeCm: 62, yPx: 2200 },
};

const NADIA_TAPE_ROW_PRESET = {
  sourceImageHeight: 4080,
  sourceImageWidth: 3072,
  waist: { tapeCm: 42, yPx: 1728 },
  trouserWaist: { tapeCm: 53, yPx: 1962 },
  hips: { tapeCm: 64, yPx: 2176 },
};

const NADIA_MANUAL_ROW_PRESET = {
  sourceImageHeight: 4080,
  sourceImageWidth: 3072,
  waist: { yPx: 1733, leftXPx: 1406, rightXPx: 1901 },
  trouserWaist: { yPx: 1959, leftXPx: 1333, rightXPx: 1989 },
  hips: { yPx: 2185, leftXPx: 1311, rightXPx: 2001 },
};

function buildSavedManualHeightScaleOverride(
  setId: string,
  imageUrl: string,
): ManualHeightScaleOverride | null {
  const preset = setId === "shane"
    ? SHANE_MANUAL_HEIGHT_PRESET
    : setId === "shane-2"
      ? SHANE_2_MANUAL_HEIGHT_PRESET
    : setId === "shahnaz-2"
        ? SHAHNAZ_2_MANUAL_HEIGHT_PRESET
      : setId === "shahnaz-2-second"
        ? SHAHNAZ_2_SECOND_MANUAL_HEIGHT_PRESET
      : null;
  if (!preset) return null;
  return {
    sourceKey: `${imageUrl}:${preset.sourceImageWidth}x${preset.sourceImageHeight}`,
    topYNorm: preset.topYPx / preset.sourceImageHeight,
    bottomYNorm: preset.bottomYPx / preset.sourceImageHeight,
    centerXNorm: preset.centerXPx / preset.sourceImageWidth,
  };
}

interface ManualScaleEvidence {
  source: "vertical-tape" | "mask-height" | "pose-landmarks" | "manual-height";
  activeCmPerPx: number;
  heightCmPerPx: number | null;
  pxPerCm: number;
  scaleDeltaPct: number | null;
  anchors: Array<{ label: string; tapeCm: number; yPx: number }>;
  heightAudit?: MaskHeightScaleAudit | null;
}

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function SizingLabPage() {
  const manualWorkbenchRef = useRef<HTMLDivElement | null>(null);
  const image = useImageInput();
  const geminiInputImage = useImageInput();
  const normalizedImage = useImageInput();
  const sideImage = useImageInput();
  const pose = usePoseAnalysis();
  const sidePose = usePoseAnalysis();
  const [metrics, setMetrics] = useState<MetricsInput>(DEFAULT_METRICS);
  const [showMask, setShowMask] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [useSidePhoto, setUseSidePhoto] = useState(false);
  const [analysisPath, setAnalysisPath] = useState<AnalysisPath>("raw");
  const [poseSource, setPoseSource] = useState<PoseSource | null>(null);
  const [geminiModel, setGeminiModel] = useState<GeminiImageModelCode>("gemini-3.1-flash-image");
  const [geminiGuideModel, setGeminiGuideModel] = useState<GeminiGuideModelCode>("gemini-3.1-flash-image");
  const [useDefaultGeminiPrompt, setUseDefaultGeminiPrompt] = useState(true);
  const [geminiPrompt, setGeminiPrompt] = useState(DEFAULT_SIZING_LAB_GEMINI_PROMPT);
  const [manualCameraCalibrationEnabled, setManualCameraCalibrationEnabled] = useState(false);
  const [useDefaultManualCameraCalibrationPrompt, setUseDefaultManualCameraCalibrationPrompt] = useState(true);
  const [manualCameraCalibrationPrompt, setManualCameraCalibrationPrompt] = useState(DEFAULT_SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT);
  const [manualCameraCalibrationStatus, setManualCameraCalibrationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [manualCameraCalibrationError, setManualCameraCalibrationError] = useState<string | null>(null);
  const [manualCameraCalibrationMs, setManualCameraCalibrationMs] = useState<number | null>(null);
  const [useDefaultGeminiGuidePrompt, setUseDefaultGeminiGuidePrompt] = useState(true);
  const [geminiGuidePrompt, setGeminiGuidePrompt] = useState(DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT);
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiMs, setGeminiMs] = useState<number | null>(null);
  const [geminiBgStatus, setGeminiBgStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [geminiBgError, setGeminiBgError] = useState<string | null>(null);
  const [geminiBgMs, setGeminiBgMs] = useState<number | null>(null);
  const [segmenterStatus, setSegmenterStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [segmenterError, setSegmenterError] = useState<string | null>(null);
  const [segmenterMs, setSegmenterMs] = useState<number | null>(null);
  const [originalCalibrationPose, setOriginalCalibrationPose] = useState<PoseResult | null>(null);
  const [calibrationStatus, setCalibrationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [calibrationMs, setCalibrationMs] = useState<number | null>(null);
  const [geminiGuideStatus, setGeminiGuideStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [geminiGuideError, setGeminiGuideError] = useState<string | null>(null);
  const [geminiGuideMs, setGeminiGuideMs] = useState<number | null>(null);
  const [geminiGuide, setGeminiGuide] = useState<GeminiBodyGuide | null>(null);
  const [geminiGuideGridImageUrl, setGeminiGuideGridImageUrl] = useState<string | null>(null);
  const [geminiGuideLineImageUrl, setGeminiGuideLineImageUrl] = useState<string | null>(null);
  const [sideGeminiGuideMs, setSideGeminiGuideMs] = useState<number | null>(null);
  const [sideGeminiGuide, setSideGeminiGuide] = useState<GeminiBodyGuide | null>(null);
  const [sideGeminiGuideGridImageUrl, setSideGeminiGuideGridImageUrl] = useState<string | null>(null);
  const [sideGeminiGuideLineImageUrl, setSideGeminiGuideLineImageUrl] = useState<string | null>(null);
  const [geminiGuidePromptDebug, setGeminiGuidePromptDebug] = useState<{
    source: string;
    version: string;
    preview: string;
  } | null>(null);
  const [geminiGuideResponseDebug, setGeminiGuideResponseDebug] = useState<GeminiGuideResponseDebug | null>(null);
  const [sideGeminiGuideResponseDebug, setSideGeminiGuideResponseDebug] = useState<GeminiGuideResponseDebug | null>(null);
  const [manualGuide, setManualGuide] = useState<GeminiBodyGuide | null>(null);
  const [shahnazActivePhoto, setShahnazActivePhoto] = useState<ShahnazPhotoKey>("tape");
  const [shahnazTapeGuide, setShahnazTapeGuide] = useState<GeminiBodyGuide | null>(null);
  const [shahnazSecondGuide, setShahnazSecondGuide] = useState<GeminiBodyGuide | null>(null);
  const [shahnazPhotoSwitchStatus, setShahnazPhotoSwitchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shahnazPhotoSwitchError, setShahnazPhotoSwitchError] = useState<string | null>(null);
  const [manualSideGuide, setManualSideGuide] = useState<GeminiBodyGuide | null>(null);
  const [manualAdjustedGeminiGuide, setManualAdjustedGeminiGuide] = useState<GeminiBodyGuide | null>(null);
  const [manualAdjustedSideGeminiGuide, setManualAdjustedSideGeminiGuide] = useState<GeminiBodyGuide | null>(null);
  const [manualHeightScaleOverride, setManualHeightScaleOverride] = useState<ManualHeightScaleOverride | null>(null);
  const [appleVisionBodyScale, setAppleVisionBodyScale] = useState<AppleVisionBodyScaleResult | null>(null);
  const [localMlGuide, setLocalMlGuide] = useState<GeminiBodyGuide | null>(null);
  const [localMlPredictedDepthRatios, setLocalMlPredictedDepthRatios] = useState<GeminiGuideDepthRatioOverrides>({});
  const [localMlDepthRatioOverrides, setLocalMlDepthRatioOverrides] = useState<GeminiGuideDepthRatioOverrides>({});
  const [localMlHeightScaleOverride, setLocalMlHeightScaleOverride] = useState<ManualHeightScaleOverride | null>(null);
  const [localMlAppleVisionBodyScale, setLocalMlAppleVisionBodyScale] = useState<AppleVisionBodyScaleResult | null>(null);
  const [localMlRunStatus, setLocalMlRunStatus] = useState<LocalMlRunStatus>("idle");
  const [localMlModelStatus, setLocalMlModelStatus] = useState<LocalMlModelStatusResponse | null>(null);
  const [localMlPredictionStage, setLocalMlPredictionStage] = useState<LocalMlModelStage | null>(null);
  const [localMlPredictionRows, setLocalMlPredictionRows] = useState<LocalMlNormalizedRowPrediction[]>([]);
  const [localMlDepthReady, setLocalMlDepthReady] = useState(false);
  const [localMlEndpointSource, setLocalMlEndpointSource] = useState<LocalMlPredictionResponse["endpointSource"] | null>(null);
  const [localMlMessage, setLocalMlMessage] = useState<string | null>(null);
  const [localMlElapsedMs, setLocalMlElapsedMs] = useState<number | null>(null);
  const [guideDepthRatioOverrides, setGuideDepthRatioOverrides] = useState<GeminiGuideDepthRatioOverrides>({});
  const [geminiCorrectionStatus, setGeminiCorrectionStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [geminiCorrectionError, setGeminiCorrectionError] = useState<string | null>(null);
  const [geminiCorrectionMs, setGeminiCorrectionMs] = useState<number | null>(null);
  const [geminiCorrection, setGeminiCorrection] = useState<GeminiMeasurementCorrection | null>(null);
  const [backendSdkStatus, setBackendSdkStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [backendSdkError, setBackendSdkError] = useState<string | null>(null);
  const [backendSdkTrace, setBackendSdkTrace] = useState<SdkBackendTrace | null>(null);
  const [thirdPartyStatus, setThirdPartyStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [thirdPartyMode, setThirdPartyMode] = useState<"photo" | "stats-only">("photo");
  const [thirdPartyError, setThirdPartyError] = useState<string | null>(null);
  const [thirdPartyResult, setThirdPartyResult] = useState<ThirdPartyScanResult | null>(null);
  const [backendResultUnit, setBackendResultUnit] = useState<"cm" | "in">("cm");
  const geminiCorrectionKeyRef = useRef("");
  const [analysisTotalMs, setAnalysisTotalMs] = useState<number | null>(null);
  const [runningStartedAt, setRunningStartedAt] = useState<number | null>(null);
  const [runningElapsedMs, setRunningElapsedMs] = useState<number>(0);
  const [manualAutoScrollToken, setManualAutoScrollToken] = useState(0);

  // Reset pose when image cleared
  useEffect(() => {
    if (!image.state.previewUrl) {
      pose.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.state.previewUrl]);

  useEffect(() => {
    if (!sideImage.state.previewUrl) sidePose.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideImage.state.previewUrl]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/try-on-test/sizing-lab/dataset", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ rows: DatasetRow[] }> : { rows: [] })
      .then((data) => {
        if (!cancelled) setDatasetRows(data.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setDatasetRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedDataset = datasetRows.find((row) => row.setId === selectedDatasetId) ?? null;
  const hasShahnazPhotoPair = selectedDataset?.setId === "shahnaz-2"
    && Boolean(selectedDataset.alternateFrontImageUrl);
  const shahnazTapeImageUrl = hasShahnazPhotoPair ? selectedDataset.frontImageUrl : null;
  const shahnazSecondImageUrl = hasShahnazPhotoPair ? selectedDataset.alternateFrontImageUrl ?? null : null;
  const selectedDatasetNaturalWaistCm = selectedDataset && selectedDataset.waistTarget !== "trouser" && selectedDataset.waistCm > 0
    ? selectedDataset.waistCm
    : undefined;
  const selectedDatasetTrouserWaistCm = selectedDataset?.trouserWaistCm && selectedDataset.trouserWaistCm > 0
    ? selectedDataset.trouserWaistCm
    : selectedDataset?.waistTarget === "trouser" && selectedDataset.waistCm > 0
      ? selectedDataset.waistCm
      : undefined;
  const usesBackendSdk = analysisPath === "backend-sdk";
  const usesThirdParty = analysisPath === "third-party";
  const usesGeminiCalibration = analysisPath === "gemini-calibrated";
  const usesGeminiGuide = analysisPath === "gemini-guide";
  const usesGeminiGuideWithSide = analysisPath === "gemini-guide-side";
  const usesManualGuide = analysisPath === "manual-guide";
  const usesLocalMl = analysisPath === "local-ml";
  const usesCoordinateWorkbench = usesManualGuide || usesLocalMl;
  const usesManualCameraCalibration = usesManualGuide && manualCameraCalibrationEnabled;
  const usesModelCoordinateGuide = usesGeminiGuide || usesGeminiGuideWithSide;
  const usesCoordinateGuide = usesModelCoordinateGuide || usesCoordinateWorkbench;
  const activeUseSidePhoto = (useSidePhoto || usesGeminiGuideWithSide || usesThirdParty) && !usesBackendSdk && !usesLocalMl;
  const usesMaskGuide = analysisPath === "mask-guide";
  const usesGemini = analysisPath === "gemini" || usesGeminiCalibration;
  const usesSegmenter = analysisPath === "segmenter";
  const selectedPoseSource: PoseSource = usesGeminiCalibration
    ? "gemini-calibrated"
    : usesGeminiGuideWithSide
    ? "gemini-guide-side"
    : usesGeminiGuide
    ? "gemini-guide"
    : usesLocalMl
    ? "local-ml"
    : usesManualGuide
    ? "manual-guide"
    : usesGemini
    ? "gemini"
    : usesSegmenter
      ? "original-segmenter"
      : "original-raw";
  const maskMode: MeasurementMaskMode = analysisPath === "landmark" || usesMaskGuide || usesSegmenter || usesCoordinateGuide ? "ignore-arms" : "raw";
  const poseMatchesPath = poseSource === selectedPoseSource;
  const displayPose = poseMatchesPath && pose.pose
    ? usesBackendSdk
      ? { ...pose.pose, mask: null, maskWidth: 0, maskHeight: 0 }
      : pose.pose
    : null;
  const manualCameraCalibrationResultActive = usesManualCameraCalibration && Boolean(normalizedImage.state.previewUrl);
  const usesShahnazPhotoPair = hasShahnazPhotoPair && usesManualGuide && !manualCameraCalibrationResultActive;
  const activeImageState = (usesGemini || manualCameraCalibrationResultActive) && normalizedImage.state.previewUrl
    ? normalizedImage.state
    : image.state;
  const selectedPathLabel = ANALYSIS_PATHS.find((path) => path.value === analysisPath)?.label ?? "Selected path";
  const selectedGeminiModel = GEMINI_IMAGE_MODELS.find((model) => model.value === geminiModel) ?? GEMINI_IMAGE_MODELS[0]!;
  const selectedGeminiGuideModel = GEMINI_GUIDE_MODELS.find((model) => model.value === geminiGuideModel) ?? GEMINI_GUIDE_MODELS[0]!;
  const displayedElapsedMs = runningStartedAt === null ? analysisTotalMs : runningElapsedMs;
  const usesNegar2MeterGuidePrompt = selectedDatasetId === "negar-2";
  const usesNegar4MeterGuidePrompt = selectedDatasetId === "negar-4";
  const defaultGeminiGuidePrompt = usesNegar2MeterGuidePrompt
    ? NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT
    : usesNegar4MeterGuidePrompt
    ? NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT
    : DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT;
  const defaultGeminiGuidePromptVersion = usesNegar2MeterGuidePrompt
    ? NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION
    : usesNegar4MeterGuidePrompt
    ? NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION
    : SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION;
  const activeGeminiPrompt = useDefaultGeminiPrompt
    ? DEFAULT_SIZING_LAB_GEMINI_PROMPT
    : geminiPrompt.trim() || DEFAULT_SIZING_LAB_GEMINI_PROMPT;
  const activeManualCameraCalibrationPrompt = useDefaultManualCameraCalibrationPrompt
    ? DEFAULT_SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT
    : manualCameraCalibrationPrompt.trim() || DEFAULT_SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT;
  const activeGeminiGuidePrompt = useDefaultGeminiGuidePrompt
    ? defaultGeminiGuidePrompt
    : geminiGuidePrompt.trim() || defaultGeminiGuidePrompt;
  const geminiGuideTimings = geminiGuideResponseDebug?.timings;

  const clearCalibration = () => {
    setOriginalCalibrationPose(null);
    setCalibrationStatus("idle");
    setCalibrationError(null);
    setCalibrationMs(null);
  };

  const clearGeminiGuide = (
    savedDepthRatioOverrides: GeminiGuideDepthRatioOverrides = selectedDataset?.depthRatioOverrides ?? {},
  ) => {
    setGeminiGuide(null);
    setManualAdjustedGeminiGuide(null);
    setManualAdjustedSideGeminiGuide(null);
    setGuideDepthRatioOverrides(savedDepthRatioOverrides);
    setGeminiGuideGridImageUrl(null);
    setGeminiGuideLineImageUrl(null);
    setSideGeminiGuide(null);
    setSideGeminiGuideGridImageUrl(null);
    setSideGeminiGuideLineImageUrl(null);
    setSideGeminiGuideResponseDebug(null);
    setSideGeminiGuideMs(null);
    setGeminiGuidePromptDebug(null);
    setGeminiGuideResponseDebug(null);
    setGeminiGuideStatus("idle");
    setGeminiGuideError(null);
    setGeminiGuideMs(null);
  };

  const updateGuideDepthRatioOverride = (
    kind: keyof GeminiGuideDepthRatioOverrides,
    ratio: number | null,
  ) => {
    setGuideDepthRatioOverrides((current) => {
      const next = { ...current };
      if (ratio == null || !Number.isFinite(ratio)) {
        delete next[kind];
      } else {
        next[kind] = ratio;
      }
      return next;
    });
  };

  const clearGeminiCorrection = () => {
    setGeminiCorrection(null);
    setGeminiCorrectionStatus("idle");
    setGeminiCorrectionError(null);
    setGeminiCorrectionMs(null);
    geminiCorrectionKeyRef.current = "";
  };

  const clearBackendSdkTrace = () => {
    setBackendSdkTrace(null);
    setBackendSdkStatus("idle");
    setBackendSdkError(null);
  };

  const clearLocalMlPrediction = (
    savedDepthRatioOverrides: GeminiGuideDepthRatioOverrides = {},
    savedHeightScaleOverride: ManualHeightScaleOverride | null = null,
  ) => {
    setLocalMlGuide(null);
    setLocalMlPredictedDepthRatios({});
    setLocalMlDepthRatioOverrides(savedDepthRatioOverrides);
    setLocalMlHeightScaleOverride(savedHeightScaleOverride);
    setLocalMlAppleVisionBodyScale(null);
    setLocalMlPredictionStage(null);
    setLocalMlPredictionRows([]);
    setLocalMlDepthReady(false);
    setLocalMlEndpointSource(null);
    setLocalMlRunStatus("idle");
    setLocalMlMessage(null);
    setLocalMlElapsedMs(null);
  };

  const selectShahnazCalculationPhoto = async (nextPhoto: ShahnazPhotoKey) => {
    if (!hasShahnazPhotoPair) return;
    const nextUrl = nextPhoto === "tape" ? shahnazTapeImageUrl : shahnazSecondImageUrl;
    if (!nextUrl) return;
    if (nextPhoto === shahnazActivePhoto && image.state.previewUrl === nextUrl) return;

    const startedAt = nowMs();
    setShahnazActivePhoto(nextPhoto);
    setShahnazPhotoSwitchStatus("loading");
    setShahnazPhotoSwitchError(null);
    setAppleVisionBodyScale(null);
    setManualGuide(null);
    const savedHeightScaleOverride = buildSavedManualHeightScaleOverride(
      nextPhoto === "tape" ? "shahnaz-2" : "shahnaz-2-second",
      nextUrl,
    );
    clearLocalMlPrediction(selectedDataset?.depthRatioOverrides ?? {}, savedHeightScaleOverride);
    setManualHeightScaleOverride(savedHeightScaleOverride);
    clearGeminiGuide();
    clearGeminiCorrection();
    clearBackendSdkTrace();
    normalizedImage.clear();
    geminiInputImage.clear();
    pose.reset();
    setPoseSource(null);
    setAnalysisTotalMs(null);
    setRunningStartedAt(startedAt);
    setRunningElapsedMs(0);

    try {
      await image.selectUrl(nextUrl);
      if (usesManualGuide) {
        const result = await pose.analyze(nextUrl, undefined, { includeMask: true });
        if (!result) throw new Error("MediaPipe could not detect Shahnaz in this photo.");
        setPoseSource("manual-guide");
        setManualAutoScrollToken((value) => value + 1);
      }
      const elapsed = Math.round(nowMs() - startedAt);
      setAnalysisTotalMs(elapsed);
      setRunningElapsedMs(elapsed);
      setShahnazPhotoSwitchStatus("ready");
    } catch (error) {
      setShahnazPhotoSwitchStatus("error");
      setShahnazPhotoSwitchError(error instanceof Error ? error.message : "Could not switch Shahnaz photo.");
    } finally {
      setRunningStartedAt(null);
    }
  };

  const clearManualCameraCalibrationResult = () => {
    normalizedImage.clear();
    setManualCameraCalibrationStatus("idle");
    setManualCameraCalibrationError(null);
    setManualCameraCalibrationMs(null);
  };

  const invalidateManualCameraCalibrationResult = () => {
    clearManualCameraCalibrationResult();
    pose.reset();
    setPoseSource(null);
    setManualGuide(null);
    clearLocalMlPrediction();
    setManualHeightScaleOverride(null);
    setAppleVisionBodyScale(null);
    setAnalysisTotalMs(null);
    setRunningStartedAt(null);
    setRunningElapsedMs(0);
  };

  useEffect(() => {
    if (runningStartedAt === null) return;
    const timer = window.setInterval(() => {
      setRunningElapsedMs(Math.round(nowMs() - runningStartedAt));
    }, 100);
    return () => window.clearInterval(timer);
  }, [runningStartedAt]);

  useEffect(() => {
    if (!manualAutoScrollToken || !usesCoordinateWorkbench || pose.status !== "ready") return undefined;
    const timeout = window.setTimeout(() => {
      const target = manualWorkbenchRef.current;
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [manualAutoScrollToken, pose.status, usesCoordinateWorkbench]);

  useEffect(() => {
    if (!usesLocalMl) return undefined;
    let cancelled = false;
    void fetch("/api/try-on-test/sizing-lab/local-ml/status", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as LocalMlModelStatusResponse & { error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not read local ML status.");
        if (cancelled) return;
        setLocalMlModelStatus(data);
        setLocalMlMessage(data.message);
        setLocalMlRunStatus((current) => current === "ready"
          ? current
          : data.checkpointReady ? "idle" : "waiting-for-checkpoint");
      })
      .catch((error) => {
        if (cancelled) return;
        setLocalMlRunStatus("error");
        setLocalMlMessage(error instanceof Error ? error.message : "Could not read local ML status.");
      });
    return () => {
      cancelled = true;
    };
  }, [usesLocalMl]);

  const selectDataset = (setId: string) => {
    setSelectedDatasetId(setId);
    const row = datasetRows.find((item) => item.setId === setId);
    if (!row) return;
    const savedHeightScaleOverride = buildSavedManualHeightScaleOverride(row.setId, row.frontImageUrl);
    pose.reset();
    sidePose.reset();
    geminiInputImage.clear();
    normalizedImage.clear();
    setManualCameraCalibrationStatus("idle");
    setManualCameraCalibrationError(null);
    setManualCameraCalibrationMs(null);
    setPoseSource(null);
    setGeminiStatus("idle");
    setGeminiError(null);
    setGeminiMs(null);
    setGeminiBgStatus("idle");
    setGeminiBgError(null);
    setGeminiBgMs(null);
    setSegmenterStatus("idle");
    setSegmenterError(null);
    setSegmenterMs(null);
    clearCalibration();
    clearGeminiGuide(row.depthRatioOverrides ?? {});
    setManualGuide(null);
    clearLocalMlPrediction(row.depthRatioOverrides ?? {}, savedHeightScaleOverride);
    setShahnazActivePhoto("tape");
    setShahnazTapeGuide(null);
    setShahnazSecondGuide(null);
    setShahnazPhotoSwitchStatus("idle");
    setShahnazPhotoSwitchError(null);
    setManualSideGuide(null);
    setAppleVisionBodyScale(null);
    setManualHeightScaleOverride(savedHeightScaleOverride);
    clearGeminiCorrection();
    clearBackendSdkTrace();
    setAnalysisTotalMs(null);
    setRunningStartedAt(null);
    setRunningElapsedMs(0);
    setMetrics((current) => ({
      ...current,
      gender: row.gender,
      heightCm: row.heightCm > 0 ? row.heightCm : current.heightCm,
      weightKg: row.weightKg > 0 ? row.weightKg : current.weightKg,
      bustCm: row.gender === "female" && row.chestCm > 0 ? row.chestCm : null,
      braSize: row.gender === "female" && row.bra
        ? { region: "US", band: row.bra.band, cup: row.bra.cup }
        : null,
      cup: row.gender === "female" ? row.cup ?? row.bra?.cup ?? null : null,
    }));
    void image.selectUrl(row.frontImageUrl);
    if (activeUseSidePhoto && row.sideImageUrl) {
      void sideImage.selectUrl(row.sideImageUrl);
    } else {
      sideImage.clear();
    }
  };

  const toggleSidePhoto = (enabled: boolean) => {
    setUseSidePhoto(enabled);
    sidePose.reset();
    if (!enabled) {
      sideImage.clear();
      setManualSideGuide(null);
      return;
    }
    if (selectedDataset?.sideImageUrl) {
      void sideImage.selectUrl(selectedDataset.sideImageUrl);
    }
  };

  const handleAnalysisPathChange = (nextPath: AnalysisPath) => {
    const nextUsesGeminiCalibration = nextPath === "gemini-calibrated";
    const nextUsesGeminiGuide = nextPath === "gemini-guide";
    const nextUsesGeminiGuideWithSide = nextPath === "gemini-guide-side";
    const nextUsesManualGuide = nextPath === "manual-guide";
    const nextUsesLocalMl = nextPath === "local-ml";
    const nextUsesGemini = nextPath === "gemini" || nextUsesGeminiCalibration;
    const nextSource: PoseSource = nextUsesGeminiCalibration
      ? "gemini-calibrated"
      : nextUsesGeminiGuideWithSide
      ? "gemini-guide-side"
      : nextUsesGeminiGuide
      ? "gemini-guide"
      : nextUsesLocalMl
      ? "local-ml"
      : nextUsesManualGuide
      ? "manual-guide"
      : nextUsesGemini
      ? "gemini"
      : nextPath === "segmenter"
        ? "original-segmenter"
        : "original-raw";
    setAnalysisPath(nextPath);
    setAnalysisTotalMs(null);
    geminiInputImage.clear();
    normalizedImage.clear();
    setManualCameraCalibrationStatus("idle");
    setManualCameraCalibrationError(null);
    setManualCameraCalibrationMs(null);
    setGeminiStatus("idle");
    setGeminiError(null);
    setGeminiMs(null);
    setGeminiBgStatus("idle");
    setGeminiBgError(null);
    setGeminiBgMs(null);
    setSegmenterStatus("idle");
    setSegmenterError(null);
    setSegmenterMs(null);
    clearCalibration();
    clearGeminiGuide();
    setManualGuide(null);
    clearLocalMlPrediction(
      nextUsesLocalMl ? selectedDataset?.depthRatioOverrides ?? {} : {},
      nextUsesLocalMl && selectedDataset
        ? buildSavedManualHeightScaleOverride(selectedDataset.setId, selectedDataset.frontImageUrl)
        : null,
    );
    setManualSideGuide(null);
    setAppleVisionBodyScale(null);
    clearGeminiCorrection();
    clearBackendSdkTrace();
    setRunningStartedAt(null);
    setRunningElapsedMs(0);
    if (poseSource && poseSource !== nextSource) {
      pose.reset();
      setPoseSource(null);
    }
    if (nextUsesGeminiGuideWithSide || nextPath === "third-party") {
      setUseSidePhoto(true);
      if (selectedDataset?.sideImageUrl && !sideImage.state.previewUrl) {
        void sideImage.selectUrl(selectedDataset.sideImageUrl);
      }
    }
  };

  const handleFrontSelect = async (file: File) => {
    pose.reset();
    sidePose.reset();
    geminiInputImage.clear();
    normalizedImage.clear();
    setManualCameraCalibrationStatus("idle");
    setManualCameraCalibrationError(null);
    setManualCameraCalibrationMs(null);
    setSelectedDatasetId("");
    setPoseSource(null);
    setGeminiStatus("idle");
    setGeminiError(null);
    setGeminiMs(null);
    setGeminiBgStatus("idle");
    setGeminiBgError(null);
    setGeminiBgMs(null);
    setSegmenterStatus("idle");
    setSegmenterError(null);
    setSegmenterMs(null);
    clearCalibration();
    clearGeminiGuide({});
    setManualGuide(null);
    clearLocalMlPrediction();
    setShahnazActivePhoto("tape");
    setShahnazTapeGuide(null);
    setShahnazSecondGuide(null);
    setShahnazPhotoSwitchStatus("idle");
    setShahnazPhotoSwitchError(null);
    setManualSideGuide(null);
    setAppleVisionBodyScale(null);
    clearGeminiCorrection();
    clearBackendSdkTrace();
    setAnalysisTotalMs(null);
    setRunningStartedAt(null);
    setRunningElapsedMs(0);
    await image.selectFile(file);
  };

  const handleFrontClear = () => {
    image.clear();
    geminiInputImage.clear();
    normalizedImage.clear();
    setManualCameraCalibrationStatus("idle");
    setManualCameraCalibrationError(null);
    setManualCameraCalibrationMs(null);
    pose.reset();
    sidePose.reset();
    setPoseSource(null);
    setGeminiStatus("idle");
    setGeminiError(null);
    setGeminiMs(null);
    setGeminiBgStatus("idle");
    setGeminiBgError(null);
    setGeminiBgMs(null);
    setSegmenterStatus("idle");
    setSegmenterError(null);
    setSegmenterMs(null);
    clearCalibration();
    clearGeminiGuide();
    setAppleVisionBodyScale(null);
    clearGeminiCorrection();
    setManualGuide(null);
    clearLocalMlPrediction();
    setManualSideGuide(null);
    clearBackendSdkTrace();
    setAnalysisTotalMs(null);
    setRunningStartedAt(null);
    setRunningElapsedMs(0);
  };

  const requestLocalMlPrediction = async (frontUrl: string, frontPose: PoseResult) => {
    setLocalMlRunStatus("predicting");
    setLocalMlMessage(localMlModelStatus?.activeStage === "wear-1d-row-prior"
      ? "MediaPipe is ready. Running the WEAR 1D vertical-row model…"
      : "MediaPipe is ready. Running the full local ONNX checkpoint…");
    setLocalMlGuide(null);
    setLocalMlPredictedDepthRatios({});
    setLocalMlAppleVisionBodyScale(null);
    setLocalMlPredictionStage(null);
    setLocalMlPredictionRows([]);
    setLocalMlDepthReady(false);
    setLocalMlEndpointSource(null);
    const maskDataUrl = encodeLocalMlMaskDataUrl(frontPose);
    if (!maskDataUrl) throw new Error("MediaPipe did not produce the person mask required by Local ML.");
    const imageDataUrl = await imageUrlToDataUrl(frontUrl);
    const response = await fetch("/api/try-on-test/sizing-lab/local-ml/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        maskDataUrl,
        imageWidth: image.state.width,
        imageHeight: image.state.height,
        heightCm: metrics.heightCm,
        weightKg: metrics.weightKg,
        gender: metrics.gender,
        landmarks: frontPose.landmarks.map((landmark) => ({
          x: landmark.x,
          y: landmark.y,
          visibility: landmark.visibility ?? 0,
        })),
      }),
    });
    const data = await response.json() as LocalMlPredictionResponse;
    if (!response.ok || !data.ok) throw new Error(data.error ?? "Local ML prediction failed.");
    const prediction = buildLocalMlGuidePrediction(data.rows, image.state.width, image.state.height);
    if (!prediction) throw new Error("Local ML returned unsafe or invalid red-line geometry.");
    setLocalMlGuide(prediction.guide);
    setLocalMlPredictedDepthRatios(prediction.depthRatios);
    // A future 3D checkpoint owns its initial depth ratios. The current
    // row-only checkpoint deliberately keeps the isolated Manual-calculator
    // sliders, including any dataset values the user explicitly saved.
    if (data.depthReady) setLocalMlDepthRatioOverrides({});
    setLocalMlPredictionStage(data.modelStage);
    setLocalMlPredictionRows(data.rows);
    setLocalMlDepthReady(data.depthReady);
    setLocalMlEndpointSource(data.endpointSource);
    setLocalMlElapsedMs(data.elapsedMs);
    setLocalMlRunStatus("ready");
    setLocalMlMessage(data.modelStage === "wear-1d-row-prior"
      ? `WEAR 1D placed all three vertical rows in ${(data.elapsedMs / 1000).toFixed(1)} s. MediaPipe supplied temporary visible endpoints. The Manual Coordinate Apple/Depth and circumference calculator runs next; this is not a learned 3D depth result.`
      : `Local ${data.modelVersion} predicted rows, endpoints and depth in ${(data.elapsedMs / 1000).toFixed(1)} s. Minimum confidence ${(prediction.minimumConfidence * 100).toFixed(0)}%. Apple scaling runs next.`);
  };

  const runAnalysis = async () => {
    if (!image.state.previewUrl) return;
    if (usesThirdParty) {
      if (!selectedDataset?.age || (thirdPartyMode === "photo" && !sideImage.state.previewUrl)) {
        setThirdPartyStatus("error");
        setThirdPartyError("Select a dataset person with age plus front and right-side photos.");
        return;
      }
      const totalStartedAt = nowMs();
      setThirdPartyStatus("loading");
      setThirdPartyError(null);
      setThirdPartyResult(null);
      setAnalysisTotalMs(null);
      setRunningStartedAt(totalStartedAt);
      setRunningElapsedMs(0);
      try {
        const [frontImageDataUrl, rightImageDataUrl] = thirdPartyMode === "photo"
          ? await Promise.all([
              imageUrlToDataUrl(image.state.previewUrl),
              imageUrlToDataUrl(sideImage.state.previewUrl!),
            ])
          : [undefined, undefined];
        const response = await fetch("/api/try-on-test/sizing-lab/third-party/bodygram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: thirdPartyMode,
            age: selectedDataset.age,
            gender: metrics.gender,
            heightCm: metrics.heightCm,
            weightKg: metrics.weightKg,
            frontImageDataUrl,
            rightImageDataUrl,
          }),
        });
        const data = await response.json().catch(() => ({ ok: false, error: `Bodygram route returned ${response.status}` }));
        if (!response.ok || !data.ok) throw new Error(data.error || `Bodygram route returned ${response.status}`);
        setThirdPartyResult(data as ThirdPartyScanResult);
        setThirdPartyStatus("ready");
      } catch (error) {
        setThirdPartyStatus("error");
        setThirdPartyError(error instanceof Error ? error.message : "Bodygram scan failed.");
      } finally {
        const elapsed = Math.round(nowMs() - totalStartedAt);
        setAnalysisTotalMs(elapsed);
        setRunningElapsedMs(elapsed);
        setRunningStartedAt(null);
      }
      return;
    }
    const totalStartedAt = nowMs();
    setGeminiError(null);
    setGeminiBgError(null);
    setSegmenterError(null);
    setSegmenterMs(null);
    setSegmenterStatus(usesSegmenter ? "loading" : "idle");
    if (usesLocalMl) {
      setLocalMlRunStatus("checking");
      setLocalMlMessage("Running MediaPipe before local model inference…");
      setLocalMlElapsedMs(null);
      setLocalMlGuide(null);
      setLocalMlPredictedDepthRatios({});
      setLocalMlAppleVisionBodyScale(null);
    }
    setOriginalCalibrationPose(null);
    setCalibrationStatus(usesGeminiCalibration ? "loading" : "idle");
    setCalibrationError(null);
    setCalibrationMs(null);
    setGeminiGuide(null);
    setGeminiGuideGridImageUrl(null);
    setGeminiGuideLineImageUrl(null);
    setSideGeminiGuide(null);
    setSideGeminiGuideGridImageUrl(null);
    setSideGeminiGuideLineImageUrl(null);
    setSideGeminiGuideResponseDebug(null);
    setSideGeminiGuideMs(null);
    setGeminiGuidePromptDebug(null);
    setGeminiGuideResponseDebug(null);
    setGeminiGuideStatus(usesModelCoordinateGuide ? "loading" : "idle");
    setGeminiGuideError(null);
    setGeminiGuideMs(null);
    setManualCameraCalibrationStatus(usesManualCameraCalibration ? "loading" : "idle");
    setManualCameraCalibrationError(null);
    setManualCameraCalibrationMs(null);
    clearGeminiCorrection();
    setBackendSdkTrace(null);
    setBackendSdkStatus("idle");
    setBackendSdkError(null);
    setAnalysisTotalMs(null);
    setRunningStartedAt(totalStartedAt);
    setRunningElapsedMs(0);

    let frontUrl = image.state.previewUrl;
    let currentOriginalCalibrationPose: PoseResult | null = null;
    if (usesGemini) {
      setGeminiBgStatus("loading");
      setGeminiBgMs(null);
      setGeminiStatus("loading");
      setGeminiMs(null);
      try {
        const backgroundRemoved = await removeBackgroundWithSegmenter(image.state.previewUrl);
        if (!backgroundRemoved) {
          throw new Error("MediaPipe background removal failed before Gemini");
        }
        setGeminiBgMs(backgroundRemoved.elapsedMs);
        setGeminiBgStatus("ready");
        await geminiInputImage.selectUrl(backgroundRemoved.imageDataUrl);
        const imageDataUrl = backgroundRemoved.imageDataUrl;
        const response = await fetch("/api/try-on-test/sizing-lab/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl,
            model: geminiModel,
            prompt: useDefaultGeminiPrompt ? undefined : activeGeminiPrompt,
          }),
        });
        const data = await response.json().catch(() => ({ ok: false, error: `Gemini route returned ${response.status}` }));
        if (!response.ok || !data.ok || !data.imageDataUrl) {
          throw new Error(data.error || `Gemini route returned ${response.status}`);
        }
        frontUrl = data.imageDataUrl;
        setGeminiMs(typeof data.geminiMs === "number" ? data.geminiMs : null);
        await normalizedImage.selectUrl(frontUrl);
        setGeminiStatus("ready");
        if (usesGeminiCalibration) {
          const calibrationStartedAt = nowMs();
          const calibrationPose = await detectPoseAndMask(image.state.previewUrl);
          if (!calibrationPose) {
            setCalibrationStatus("error");
            setCalibrationError("Original image calibration mask failed");
            setCalibrationMs(Math.round(nowMs() - calibrationStartedAt));
          } else {
            currentOriginalCalibrationPose = calibrationPose;
            setOriginalCalibrationPose(calibrationPose);
            setCalibrationMs(Math.round(nowMs() - calibrationStartedAt));
          }
        }
      } catch (error) {
        setGeminiBgStatus("error");
        setGeminiStatus("error");
        setCalibrationStatus(usesGeminiCalibration ? "error" : "idle");
        setGeminiError(error instanceof Error ? error.message : "Gemini normalization failed");
        setGeminiBgError(error instanceof Error ? error.message : "Background removal failed before Gemini");
        setCalibrationError(error instanceof Error ? error.message : "Gemini calibration failed");
        const elapsed = Math.round(nowMs() - totalStartedAt);
        setAnalysisTotalMs(elapsed);
        setRunningElapsedMs(elapsed);
        setRunningStartedAt(null);
        setSegmenterStatus("idle");
        return;
      }
    } else if (usesManualCameraCalibration) {
      geminiInputImage.clear();
      normalizedImage.clear();
      setManualGuide(null);
      clearLocalMlPrediction();
      setManualHeightScaleOverride(null);
      setGeminiStatus("idle");
      setGeminiMs(null);
      setGeminiBgStatus("idle");
      setGeminiBgMs(null);
      clearCalibration();
      try {
        const imageDataUrl = await imageUrlToDataUrl(image.state.previewUrl);
        const response = await fetch("/api/try-on-test/sizing-lab/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl,
            model: geminiModel,
            mode: "camera-calibration",
            prompt: useDefaultManualCameraCalibrationPrompt
              ? undefined
              : activeManualCameraCalibrationPrompt,
          }),
        });
        const data = await response.json().catch(() => ({
          ok: false,
          error: `Gemini camera calibration route returned ${response.status}`,
        }));
        if (!response.ok || !data.ok || !data.imageDataUrl) {
          throw new Error(data.error || `Gemini camera calibration route returned ${response.status}`);
        }
        frontUrl = data.imageDataUrl;
        setManualCameraCalibrationMs(typeof data.geminiMs === "number" ? data.geminiMs : null);
        await normalizedImage.selectUrl(frontUrl);
        setManualCameraCalibrationStatus("ready");
      } catch (error) {
        setManualCameraCalibrationStatus("error");
        setManualCameraCalibrationError(
          error instanceof Error ? error.message : "Gemini camera calibration failed",
        );
        const elapsed = Math.round(nowMs() - totalStartedAt);
        setAnalysisTotalMs(elapsed);
        setRunningElapsedMs(elapsed);
        setRunningStartedAt(null);
        setSegmenterStatus("idle");
        return;
      }
    } else {
      geminiInputImage.clear();
      normalizedImage.clear();
      setManualCameraCalibrationStatus("idle");
      setManualCameraCalibrationError(null);
      setManualCameraCalibrationMs(null);
      setGeminiStatus("idle");
      setGeminiMs(null);
      setGeminiBgStatus("idle");
      setGeminiBgMs(null);
      clearCalibration();
    }

    setPoseSource(null);
    let segmenterElapsedTotal = 0;
    const makeSegmenterRefiner = (imageUrl: string) => async (rawPose: PoseResult): Promise<PoseResult | null> => {
      const segmented = await detectSegmenterMeasurementMask(imageUrl);
      if (!segmented) {
        setSegmenterStatus("error");
        setSegmenterError("MediaPipe ImageSegmenter returned no usable multiclass mask");
        return null;
      }
      segmenterElapsedTotal += segmented.elapsedMs;
      setSegmenterMs(segmenterElapsedTotal);
      return {
        ...rawPose,
        mask: segmented.mask,
        maskWidth: segmented.width,
        maskHeight: segmented.height,
        maskSource: "segmenter-multiclass",
        maskLabels: segmented.labels,
      };
    };

    const [frontPoseResult, sidePoseResult] = await Promise.all([
      pose.analyze(
        frontUrl,
        usesSegmenter ? makeSegmenterRefiner(frontUrl) : undefined,
        { includeMask: !usesBackendSdk },
      ),
      activeUseSidePhoto && sideImage.state.previewUrl
        ? sidePose.analyze(sideImage.state.previewUrl, usesSegmenter ? makeSegmenterRefiner(sideImage.state.previewUrl) : undefined)
        : Promise.resolve(null),
    ]);
    if (usesLocalMl) {
      let currentLocalMlStatus = localMlModelStatus;
      try {
        const statusResponse = await fetch("/api/try-on-test/sizing-lab/local-ml/status", { cache: "no-store" });
        const statusData = await statusResponse.json() as LocalMlModelStatusResponse & { error?: string };
        if (!statusResponse.ok || !statusData.ok) throw new Error(statusData.error ?? "Could not read local ML status.");
        currentLocalMlStatus = statusData;
        setLocalMlModelStatus(statusData);
      } catch (error) {
        setLocalMlRunStatus("error");
        setLocalMlMessage(error instanceof Error ? error.message : "Could not read local ML status.");
        currentLocalMlStatus = null;
      }
      if (!frontPoseResult) {
        setLocalMlRunStatus("error");
        setLocalMlMessage("MediaPipe could not detect a usable person, so Local ML did not run.");
      } else if (!currentLocalMlStatus?.checkpointReady) {
        setLocalMlRunStatus("waiting-for-checkpoint");
        setLocalMlMessage(currentLocalMlStatus?.message ?? "No trained local checkpoint exists yet.");
      } else {
        try {
          await requestLocalMlPrediction(frontUrl, frontPoseResult);
        } catch (error) {
          setLocalMlRunStatus(error instanceof Error && error.message.includes("No local ML checkpoint")
            ? "waiting-for-checkpoint"
            : "error");
          setLocalMlMessage(error instanceof Error ? error.message : "Local ML prediction failed.");
        }
      }
    }
    if (usesBackendSdk) {
      if (!frontPoseResult) {
        setBackendSdkStatus("error");
        setBackendSdkError("MediaPipe landmarks failed, so the SDK/backend call cannot run");
	      } else {
	        try {
	          setBackendSdkStatus("loading");
	          const response = await fetch("/api/try-on-test/sizing-lab/backend-sdk", {
	            method: "POST",
	            headers: { "Content-Type": "application/json" },
	            body: JSON.stringify({
	              metrics,
	              bodyLandmarks: buildSdkBodyLandmarks(frontPoseResult, image.state.width, image.state.height),
	            }),
          });
          const data = await response.json().catch(() => ({ ok: false, error: `Backend SDK route returned ${response.status}` }));
          if (!response.ok || !data.ok) {
            const failedStage = Array.isArray(data.stages)
              ? data.stages.find((stage: { ok?: boolean; name?: string; status?: number; detail?: string }) => stage?.ok === false)
              : null;
            const stageDetail = failedStage
              ? `${failedStage.name ?? "backend.sizing.recommend"} ${failedStage.status ?? response.status}: ${failedStage.detail ?? "failed"}`
              : "";
            throw new Error(data.error || stageDetail || `Backend SDK route returned ${response.status}`);
          }
          setBackendSdkTrace({
            source: "backend",
            baseUrl: data.baseUrl,
            estimate: data.estimate ? {
              estimates: data.estimate.estimates,
              unit: data.estimate.unit,
              confidence: data.estimate.confidence,
              measurementSource: data.estimate.measurementSource,
              raw: data.estimate,
            } : null,
            recommend: data.recommend ? {
	              recommendedSize: data.recommend.recommendedSize,
	              confidence: data.recommend.confidence,
	              unit: data.recommend.unit,
	              estimates: data.recommend.estimates,
	              estimatesUnit: data.recommend.estimatesUnit,
	              reasoning: data.recommend.reasoning,
              matchedRowText: data.recommend.matchedRowText,
              matchDetails: data.recommend.matchDetails,
              sections: data.recommend.sections,
              raw: data.recommend,
            } : null,
            requestSummary: data.requestSummary,
            stages: data.stages ?? [],
          });
          setBackendSdkStatus("ready");
        } catch (error) {
          setBackendSdkStatus("error");
          setBackendSdkError(error instanceof Error ? error.message : "Backend SDK sizing failed");
        }
      }
    }
    if (usesModelCoordinateGuide) {
      if (!frontPoseResult) {
        setGeminiGuideStatus("error");
        setGeminiGuideError("MediaPipe landmarks failed, so the coordinate guide cannot run");
      } else {
        try {
          const frontGuideRun = await requestGeminiGuideRun({
            imageUrl: image.state.previewUrl,
            imageWidth: image.state.width,
            imageHeight: image.state.height,
            model: geminiGuideModel,
            prompt: activeGeminiGuidePrompt,
            useDefaultPrompt: useDefaultGeminiGuidePrompt,
            guideMode: "front",
            datasetSetId: selectedDatasetId || undefined,
            metrics,
            pose: frontPoseResult,
            errorPrefix: "Gemini guide",
          });
          setGeminiGuideMs(frontGuideRun.geminiMs);
          setGeminiGuide(frontGuideRun.guide);
          setManualAdjustedGeminiGuide(selectedDatasetId === "negar-2"
            ? buildManualGuideFromPreset(
                NEGAR_2_MANUAL_ROW_PRESET,
                image.state.width,
                image.state.height,
                "Manual adjustment seeded from Negar 2 user-confirmed rows and endpoints.",
              )
            : null);
          setManualAdjustedSideGeminiGuide(null);
          setGeminiGuideGridImageUrl(frontGuideRun.gridImageDataUrl);
          setGeminiGuideLineImageUrl(frontGuideRun.guideImageDataUrl);
          setGeminiGuidePromptDebug(frontGuideRun.promptDebug);
          setGeminiGuideResponseDebug(frontGuideRun.responseDebug);
          if (!frontGuideRun.ok) {
            throw new Error(frontGuideRun.error || "Gemini guide failed");
          }
          if (usesGeminiGuideWithSide) {
            if (!sideImage.state.previewUrl || !sidePoseResult) {
              throw new Error("Side guide mode requires a loaded side photo and side MediaPipe landmarks");
            }
            const sideGuideRun = await requestGeminiGuideRun({
              imageUrl: sideImage.state.previewUrl,
              imageWidth: sideImage.state.width,
              imageHeight: sideImage.state.height,
              model: geminiGuideModel,
              prompt: DEFAULT_SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT,
              useDefaultPrompt: true,
              guideMode: "side",
              datasetSetId: selectedDatasetId || undefined,
              metrics,
              pose: sidePoseResult,
              errorPrefix: "Side Gemini guide",
            });
            setSideGeminiGuideMs(sideGuideRun.geminiMs);
            setSideGeminiGuide(sideGuideRun.guide);
            setSideGeminiGuideGridImageUrl(sideGuideRun.gridImageDataUrl);
            setSideGeminiGuideLineImageUrl(sideGuideRun.guideImageDataUrl);
            setSideGeminiGuideResponseDebug(sideGuideRun.responseDebug);
            if (!sideGuideRun.ok) {
              throw new Error(sideGuideRun.error || "Side Gemini guide failed");
            }
          }
          setGeminiGuideStatus("ready");
        } catch (error) {
          setGeminiGuideStatus("error");
          setGeminiGuideError(error instanceof Error ? error.message : "Gemini guide failed");
        }
      }
    }
    if (usesSegmenter) {
      setSegmenterStatus(frontPoseResult && (!activeUseSidePhoto || !sideImage.state.previewUrl || sidePoseResult) ? "ready" : "error");
    }
    if (usesGeminiCalibration) {
      setCalibrationStatus(frontPoseResult && currentOriginalCalibrationPose ? "ready" : "error");
      if (!frontPoseResult) {
        setCalibrationError("Gemini pose failed, so calibration cannot be applied");
      } else if (!currentOriginalCalibrationPose) {
        setCalibrationError("Original image calibration mask is missing");
      }
    }
    setPoseSource(selectedPoseSource);
    const elapsed = Math.round(nowMs() - totalStartedAt);
    setAnalysisTotalMs(elapsed);
    setRunningElapsedMs(elapsed);
    setRunningStartedAt(null);
    if (usesCoordinateWorkbench) {
      setManualAutoScrollToken((value) => value + 1);
    }
  };

  const trace = useWaistCalculation(
    usesBackendSdk ? null : poseMatchesPath ? pose.pose : null,
    activeImageState.width,
    activeImageState.height,
    metrics,
    activeUseSidePhoto ? sidePose.pose : null,
    activeUseSidePhoto ? sideImage.state.width : 0,
    activeUseSidePhoto ? sideImage.state.height : 0,
    maskMode,
  );

  // Lab-only hip trace. Production SDK/Shopify measurements are computed by
  // the backend sizing service; this page is for visual formula debugging.
  const hipsTrace = trace && poseMatchesPath && pose.pose
    ? computeHips(
        pose.pose,
        activeImageState.width,
        activeImageState.height,
        metrics.heightCm,
        metrics.weightKg,
        metrics.gender,
        trace.cmPerPx,
        activeUseSidePhoto ? sidePose.pose : null,
        activeUseSidePhoto ? sideImage.state.width : 0,
        activeUseSidePhoto ? sideImage.state.height : 0,
    )
    : null;
  const hipDebugRows = hipsTrace?.debugRows ?? [];
  const geminiCalibration = usesGeminiCalibration && poseMatchesPath && pose.pose && originalCalibrationPose
    ? calibrateGeminiMaskMeasurements({
      geminiPose: pose.pose,
      geminiImageWidth: activeImageState.width,
      geminiImageHeight: activeImageState.height,
      originalPose: originalCalibrationPose,
      originalImageWidth: image.state.width,
      originalImageHeight: image.state.height,
      heightCm: metrics.heightCm,
      maskMode: "ignore-arms",
      waistTrace: trace,
      hipsTrace,
    })
    : null;
  const shahnazTapeGuideForDisplay = usesShahnazPhotoPair
    ? shahnazTapeGuide ?? buildManualGuideFromPreset(
        SHAHNAZ_2_MANUAL_ROW_PRESET,
        SHAHNAZ_2_MANUAL_ROW_PRESET.sourceImageWidth,
        SHAHNAZ_2_MANUAL_ROW_PRESET.sourceImageHeight,
        "Shahnaz 2 tape-photo rows saved by the user.",
      )
    : null;
  const shahnazSecondGuideForDisplay = usesShahnazPhotoPair
    ? shahnazSecondGuide ?? buildManualGuideFromPreset(
        SHAHNAZ_2_SECOND_MANUAL_ROW_PRESET,
        SHAHNAZ_2_SECOND_MANUAL_ROW_PRESET.sourceImageWidth,
        SHAHNAZ_2_SECOND_MANUAL_ROW_PRESET.sourceImageHeight,
        "IMG_8444 tape-free rows registered from the same anatomical locations in the tape photo.",
      )
    : null;
  const activeShahnazGuide = shahnazActivePhoto === "tape"
    ? shahnazTapeGuideForDisplay
    : shahnazSecondGuideForDisplay;
  const effectiveManualGuide = usesManualGuide
    ? usesShahnazPhotoPair
      ? activeShahnazGuide
      : manualGuide ?? buildManualGuideFromTrace(
          trace,
          hipsTrace,
          poseMatchesPath ? pose.pose : null,
          activeImageState.width,
          activeImageState.height,
          manualCameraCalibrationResultActive ? "" : selectedDatasetId,
          maskMode,
        )
    : null;
  const updateActiveManualGuide = (nextGuide: GeminiBodyGuide) => {
    setAppleVisionBodyScale(null);
    if (!usesShahnazPhotoPair) {
      setManualGuide(nextGuide);
      return;
    }
    if (shahnazActivePhoto === "tape") setShahnazTapeGuide(nextGuide);
    else setShahnazSecondGuide(nextGuide);
  };
  const resetActiveManualGuide = () => {
    setAppleVisionBodyScale(null);
    if (!usesShahnazPhotoPair) {
      setManualGuide(buildManualGuideFromTrace(
        trace,
        hipsTrace,
        poseMatchesPath ? pose.pose : null,
        activeImageState.width,
        activeImageState.height,
        manualCameraCalibrationResultActive ? "" : selectedDatasetId,
        maskMode,
      ));
      return;
    }
    if (shahnazActivePhoto === "tape") setShahnazTapeGuide(null);
    else setShahnazSecondGuide(null);
  };
  const effectiveManualSideGuide = usesManualGuide && activeUseSidePhoto
    ? manualSideGuide ?? buildManualSideGuideFromPose(
        activeUseSidePhoto ? sidePose.pose : null,
        activeUseSidePhoto ? sideImage.state.width : 0,
        activeUseSidePhoto ? sideImage.state.height : 0,
        metrics.heightCm,
        effectiveManualGuide,
        poseMatchesPath ? pose.pose : null,
        activeImageState.width,
        activeImageState.height,
      )
    : null;
  const effectiveCoordinateGuide = usesManualGuide
    ? effectiveManualGuide
    : usesLocalMl
      ? localMlGuide
    : usesModelCoordinateGuide
      ? manualAdjustedGeminiGuide ?? geminiGuide
      : null;
  const effectiveSideCoordinateGuide = usesManualGuide
    ? effectiveManualSideGuide
    : usesGeminiGuideWithSide
      ? manualAdjustedSideGeminiGuide ?? sideGeminiGuide
    : null;
  const effectiveCoordinateGuideSource = usesManualGuide
    ? "manual-coordinate"
    : usesLocalMl
      ? "local-ml-v1"
    : manualAdjustedGeminiGuide
      ? "manual-adjusted-coordinate"
      : geminiGuideResponseDebug?.guideSource ?? null;
  const manualTapeScalePreset = usesCoordinateWorkbench && !manualCameraCalibrationResultActive
    ? selectedDatasetId === "negar-4"
      ? NEGAR_4_MANUAL_TAPE_ROW_PRESET
      : selectedDatasetId === "nadia"
        ? NADIA_TAPE_ROW_PRESET
        : null
    : null;
  const frontManualHeightScaleSourceKey = `${activeImageState.previewUrl ?? ""}:${activeImageState.width}x${activeImageState.height}`;
  const selectedHeightScaleOverride = usesLocalMl ? localMlHeightScaleOverride : manualHeightScaleOverride;
  const activeManualHeightScaleOverride = usesCoordinateWorkbench && selectedHeightScaleOverride?.sourceKey === frontManualHeightScaleSourceKey
    ? selectedHeightScaleOverride
    : null;
  const manualHeightScaleEvidence = activeManualHeightScaleOverride
    ? buildManualHeightScaleEvidence(
        activeManualHeightScaleOverride,
        metrics.heightCm,
        trace?.cmPerPx ?? null,
        trace?.frontHeightScaleAudit,
        activeImageState.width,
        activeImageState.height,
      )
    : null;
  const manualTapeScaleEvidence = manualTapeScalePreset
    ? buildVerticalTapeScaleEvidence(manualTapeScalePreset, trace?.cmPerPx ?? null, trace?.frontHeightScaleAudit)
    : null;
  const activeFrontScaleOverrideCmPerPx = manualHeightScaleEvidence?.activeCmPerPx ?? null;
  const activeManualScaleEvidence = manualHeightScaleEvidence ?? buildHeightScaleEvidence(trace?.cmPerPx ?? null, trace?.scaleSource, trace?.frontHeightScaleAudit);
  const activeSideScaleEvidence = buildHeightScaleEvidence(trace?.sideCmPerPx ?? null, trace?.sideScaleSource, trace?.sideHeightScaleAudit);
  const updateDisplayedCoordinateGuide = (nextGuide: GeminiBodyGuide) => {
    if (!usesLocalMl) {
      updateActiveManualGuide(nextGuide);
      return;
    }
    setLocalMlAppleVisionBodyScale(null);
    setLocalMlGuide({ ...nextGuide, notes: "Local ML prediction manually adjusted in the isolated Local ML mode." });
    setLocalMlPredictionRows((current) => current.map((row) => {
      const line = nextGuide[row.kind];
      const yPx = line?.y_px;
      const leftXPx = line?.left_x_px;
      const rightXPx = line?.right_x_px;
      if (!Number.isFinite(yPx) || !Number.isFinite(leftXPx) || !Number.isFinite(rightXPx)) return row;
      return {
        ...row,
        yNorm: (yPx as number) / Math.max(1, activeImageState.height),
        leftXNorm: (leftXPx as number) / Math.max(1, activeImageState.width),
        rightXNorm: (rightXPx as number) / Math.max(1, activeImageState.width),
      };
    }));
    setLocalMlMessage("Local ML red lines were manually adjusted. Saved Manual Coordinate lines remain unchanged.");
  };
  const resetDisplayedCoordinateGuide = () => {
    if (!usesLocalMl) {
      resetActiveManualGuide();
      return;
    }
    setLocalMlGuide(null);
    setLocalMlPredictedDepthRatios({});
    setLocalMlDepthRatioOverrides(selectedDataset?.depthRatioOverrides ?? {});
    setLocalMlAppleVisionBodyScale(null);
    setLocalMlPredictionStage(null);
    setLocalMlPredictionRows([]);
    setLocalMlDepthReady(false);
    setLocalMlEndpointSource(null);
    setLocalMlRunStatus(localMlModelStatus?.checkpointReady ? "idle" : "waiting-for-checkpoint");
    setLocalMlMessage(localMlModelStatus?.message ?? "Run Analyze Local ML after a checkpoint is trained.");
  };
  const activeGuideDepthRatioOverrides = usesLocalMl ? localMlDepthRatioOverrides : guideDepthRatioOverrides;
  const updateActiveDepthRatioOverride = usesLocalMl
    ? (kind: keyof GeminiGuideDepthRatioOverrides, ratio: number | null) => {
        setLocalMlDepthRatioOverrides((current) => {
          const next = { ...current };
          if (ratio == null || !Number.isFinite(ratio)) delete next[kind];
          else next[kind] = ratio;
          return next;
        });
      }
    : updateGuideDepthRatioOverride;
  const activeAppleVisionBodyScale = usesLocalMl ? localMlAppleVisionBodyScale : appleVisionBodyScale;
  const appleVisionRowCmPerPxOverrides = usesCoordinateWorkbench
    && activeAppleVisionBodyScale?.sourceImageUrl === activeImageState.previewUrl
    // A "check" result is still shown as an explicitly unapproved review
    // candidate. The body-only gate remains responsible for approval; only a
    // hard geometry rejection blocks the circumference calculation entirely.
    && activeAppleVisionBodyScale.geometryQuality !== "reject"
    ? Object.fromEntries(activeAppleVisionBodyScale.rows.map((row) => [row.name, row.cmPerPx]))
    : undefined;
  const computedGeminiGuideMeasurement = computeGeminiGuideMeasurement({
    guide: effectiveCoordinateGuide,
    guideSource: effectiveCoordinateGuideSource,
    sideGuide: effectiveSideCoordinateGuide,
    sideGuideSource: usesManualGuide
      ? "manual-coordinate"
      : manualAdjustedSideGeminiGuide ? "manual-adjusted-coordinate" : sideGeminiGuideResponseDebug?.guideSource ?? null,
    pose: poseMatchesPath ? pose.pose : null,
    imageWidth: activeImageState.width,
    imageHeight: activeImageState.height,
    sidePose: activeUseSidePhoto ? sidePose.pose : null,
    sideImageWidth: activeUseSidePhoto ? sideImage.state.width : 0,
    sideImageHeight: activeUseSidePhoto ? sideImage.state.height : 0,
    maskMode,
    waistTrace: trace,
    hipsTrace,
    cmPerPxOverride: activeFrontScaleOverrideCmPerPx,
    rowCmPerPxOverrides: appleVisionRowCmPerPxOverrides,
    depthRatioOverrides: activeGuideDepthRatioOverrides,
    localMlDepthRatios: usesLocalMl ? localMlPredictedDepthRatios : undefined,
  });
  const localMlUsesManualCalculationFallback = usesLocalMl
    && localMlPredictionStage === "wear-1d-row-prior"
    && !localMlDepthReady;
  const geminiGuideMeasurement = usesCoordinateWorkbench && !appleVisionRowCmPerPxOverrides
    ? null
    : computedGeminiGuideMeasurement;
  const sideGeminiGuideMeasurement = computeGeminiGuideImageMeasurement({
    guide: effectiveSideCoordinateGuide,
    guideSource: usesManualGuide
      ? "manual-coordinate"
      : manualAdjustedSideGeminiGuide ? "manual-adjusted-coordinate" : sideGeminiGuideResponseDebug?.guideSource ?? null,
    pose: activeUseSidePhoto ? sidePose.pose : null,
    imageWidth: activeUseSidePhoto ? sideImage.state.width : 0,
    imageHeight: activeUseSidePhoto ? sideImage.state.height : 0,
    heightCm: metrics.heightCm,
    maskMode,
  });
  const guideDebugRows = geminiGuideMeasurement?.debugRows ?? [];
  const maskGuideDebugRows = usesMaskGuide ? buildMaskGuideDebugRows(trace, hipsTrace) : [];
  const sideMaskGuideDebugRows = usesGeminiGuideWithSide
    ? buildGeminiGuideDebugRows({
      guide: effectiveSideCoordinateGuide,
      guideSource: manualAdjustedSideGeminiGuide ? "manual-adjusted-coordinate" : sideGeminiGuideResponseDebug?.guideSource ?? null,
      pose: activeUseSidePhoto ? sidePose.pose : null,
      imageWidth: activeUseSidePhoto ? sideImage.state.width : 0,
      imageHeight: activeUseSidePhoto ? sideImage.state.height : 0,
      heightCm: metrics.heightCm,
      idPrefix: "side-gemini-guide",
      labelPrefix: "side Gemini",
      color: "#ef4444",
    })
    : usesManualGuide && effectiveManualSideGuide
      ? sideGeminiGuideMeasurement?.debugRows ?? []
      : usesMaskGuide ? buildSideMaskGuideDebugRows(hipsTrace) : [];
  const displayHipDebugRows = usesCoordinateGuide
    ? guideDebugRows
    : usesMaskGuide
      ? maskGuideDebugRows
      : [...hipDebugRows, ...guideDebugRows];

  useEffect(() => {
    if (analysisPath !== "gemini") return;
    if (!poseMatchesPath || !pose.pose || !trace || !hipsTrace) return;
    if (!image.state.previewUrl || !normalizedImage.state.previewUrl) return;
    const currentPose = pose.pose;

    const key = [
      image.state.previewUrl,
      normalizedImage.state.previewUrl,
      trace.finalNaturalWaistCm,
      trace.finalTrouserWaistCm,
      hipsTrace.hipsCm,
      geminiModel,
    ].join("|");
    if (key === geminiCorrectionKeyRef.current) return;

    let cancelled = false;
    geminiCorrectionKeyRef.current = key;

    const runCorrection = async () => {
      try {
        setGeminiCorrectionStatus("loading");
        setGeminiCorrectionError(null);
        setGeminiCorrectionMs(null);
        setGeminiCorrection(null);
        const [originalImageDataUrl, normalizedImageDataUrl] = await Promise.all([
          imageUrlToDataUrl(image.state.previewUrl),
          imageUrlToDataUrl(normalizedImage.state.previewUrl),
        ]);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 45000);
        const response = await fetch("/api/try-on-test/sizing-lab/correction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            originalImageDataUrl,
            normalizedImageDataUrl,
            prompt: DEFAULT_SIZING_LAB_GEMINI_CORRECTION_PROMPT,
            context: buildGeminiCorrectionContext({
              metrics,
              originalImage: image.state,
              normalizedImage: normalizedImage.state,
              pose: currentPose,
              trace,
              hipsTrace,
            }),
          }),
        });
        window.clearTimeout(timeoutId);
        const data = await response.json().catch(() => ({ ok: false, error: `Gemini correction route returned ${response.status}` }));
        if (!response.ok || !data.ok || !data.correction) {
          const rawText = typeof data.rawText === "string" ? data.rawText.trim() : "";
          const rawHint = rawText ? ` Raw: ${rawText.slice(0, 360)}` : "";
          throw new Error(`${data.error || `Gemini correction route returned ${response.status}`}${rawHint}`);
        }
        if (cancelled) return;
        setGeminiCorrection(data.correction as GeminiMeasurementCorrection);
        setGeminiCorrectionMs(typeof data.geminiMs === "number" ? data.geminiMs : null);
        setGeminiCorrectionStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setGeminiCorrectionStatus("error");
        setGeminiCorrectionError(
          error instanceof DOMException && error.name === "AbortError"
            ? "Gemini correction timed out after 45 seconds. The real mask trace result above is still valid."
            : error instanceof Error ? error.message : "Gemini correction failed",
        );
      }
    };

    void runCorrection();
    return () => {
      cancelled = true;
    };
  }, [
    analysisPath,
    geminiModel,
    hipsTrace,
    image.state,
    metrics,
    normalizedImage.state,
    pose,
    poseMatchesPath,
    trace,
  ]);

  const canAnalyze = !!image.state.previewUrl
    && (!usesGeminiGuideWithSide || !!sideImage.state.previewUrl)
    && (!usesThirdParty || (!!selectedDataset?.age && (thirdPartyMode === "stats-only" || !!sideImage.state.previewUrl)))
    && pose.status !== "loading"
    && geminiStatus !== "loading"
    && manualCameraCalibrationStatus !== "loading"
    && geminiBgStatus !== "loading"
    && calibrationStatus !== "loading"
    && localMlRunStatus !== "predicting"
    && geminiGuideStatus !== "loading"
    && backendSdkStatus !== "loading"
    && segmenterStatus !== "loading"
    && (!activeUseSidePhoto || sidePose.status !== "loading");

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-6 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">AI Sizing Lab</h1>
        <p className="text-sm text-text-secondary">
          Upload a photo, enter height + weight, and inspect the experimental
          visual waist/hip trace. Production SDK and Shopify sizing use the
          backend sizing service as the source of truth.
        </p>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This lab is visual debugging only. Do not compare these local waist/hip
        numbers directly against Shopify results; Shopify and the SDK use the
        backend estimator.
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Known dataset person</h3>
            <p className="mt-1 text-xs text-text-secondary">
              Select a local dataset person. The front photo, gender, height, weight, and estimated US bra size are filled automatically.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!usesBackendSdk ? (
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={activeUseSidePhoto}
                  disabled={usesGeminiGuideWithSide}
                  onChange={(event) => toggleSidePhoto(event.target.checked)}
                />
                {usesGeminiGuideWithSide ? "Side photo required" : "Use side photo"}
              </label>
            ) : null}
            <select
              value={selectedDatasetId}
              onChange={(event) => selectDataset(event.target.value)}
              className="min-w-[260px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Manual upload</option>
              {datasetRows.map((row) => (
                <option key={row.setId} value={row.setId}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedDataset ? (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4 lg:grid-cols-12">
            <DatasetStat label="Height" value={selectedDataset.heightCm > 0 ? `${selectedDataset.heightCm} cm` : "missing"} />
            <DatasetStat label="Weight" value={`${selectedDataset.weightKg} kg`} />
            <DatasetStat label="Gender" value={selectedDataset.gender} />
            <DatasetStat label="Natural waist" value={selectedDatasetNaturalWaistCm ? `${selectedDatasetNaturalWaistCm} cm` : "—"} />
            <DatasetStat label="Natural waist tape mark" value={formatDatasetTapeMark(selectedDataset.waistTapeMarkCm, selectedDataset.waistTapeMarkIn)} />
            <DatasetStat label="Lower waist" value={selectedDatasetTrouserWaistCm ? `${selectedDatasetTrouserWaistCm} cm` : "—"} />
            <DatasetStat label="Lower waist tape mark" value={formatDatasetTapeMark(selectedDataset.trouserWaistTapeMarkCm, selectedDataset.trouserWaistTapeMarkIn)} />
            <DatasetStat label="Hips" value={`${selectedDataset.hipsCm} cm`} />
            <DatasetStat label="Hip tape mark" value={formatDatasetTapeMark(selectedDataset.hipsTapeMarkCm, selectedDataset.hipsTapeMarkIn)} />
            <DatasetStat label="Side waist" value={selectedDataset.waistSideDepthCm ? `${selectedDataset.waistSideDepthCm} cm` : "—"} />
            <DatasetStat label="Side lower waist" value={selectedDataset.trouserWaistSideDepthCm ? `${selectedDataset.trouserWaistSideDepthCm} cm` : "—"} />
            <DatasetStat label="Side hips" value={selectedDataset.hipsSideDepthCm ? `${selectedDataset.hipsSideDepthCm} cm` : "—"} />
            <DatasetStat label="Chest" value={`${selectedDataset.chestCm} cm`} />
            <DatasetStat label="Under chest" value={selectedDataset.underChestCm > 0 ? `${selectedDataset.underChestCm} cm` : "—"} />
            <DatasetStat
              label="Bra / cup"
              value={selectedDataset.bra ? `${selectedDataset.bra.band}${selectedDataset.bra.cup}` : selectedDataset.cup ? `Cup ${selectedDataset.cup}` : "—"}
            />
          </div>
        ) : null}
      </section>

      <section className={`grid grid-cols-1 gap-5 ${activeUseSidePhoto ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <ImageUploader
          title="Front photo"
          emptyLabel="Upload front full-body photo"
          previewUrl={image.state.previewUrl}
          onSelect={handleFrontSelect}
          onClear={handleFrontClear}
          width={image.state.width}
          height={image.state.height}
        />
        {activeUseSidePhoto ? (
          <ImageUploader
            title="Side photo"
            emptyLabel="Upload side full-body photo"
            previewUrl={sideImage.state.previewUrl}
            onSelect={async (file) => {
              sidePose.reset();
              setManualSideGuide(null);
              await sideImage.selectFile(file);
            }}
            onClear={() => {
              sideImage.clear();
              sidePose.reset();
              setManualSideGuide(null);
            }}
            width={sideImage.state.width}
            height={sideImage.state.height}
          />
        ) : null}
        <MetricsForm metrics={metrics} onChange={setMetrics} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-sm font-semibold text-text-primary">Measurement path</h3>
            <p className="mt-1 text-xs text-text-secondary">
              Manual Coordinate and Local ML are shown below. Choose every other experimental method from the dropdown.
            </p>
          </div>
          <select
            aria-label="All measurement methods"
            value={analysisPath}
            onChange={(event) => handleAnalysisPathChange(event.target.value as AnalysisPath)}
            className="min-w-[300px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {ANALYSIS_PATHS.map((path) => (
              <option key={path.value} value={path.value}>
                {path.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {FEATURED_ANALYSIS_PATHS.map((path) => (
            <button
              key={path.value}
              type="button"
              onClick={() => handleAnalysisPathChange(path.value)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                analysisPath === path.value
                  ? "border-brand-blue bg-blue-50 text-brand-blue"
                  : "border-gray-200 bg-white text-text-secondary hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-semibold">{path.label}</div>
              <div className="mt-1 text-xs leading-relaxed">{path.description}</div>
            </button>
          ))}
        </div>
        {usesLocalMl ? (
          <LocalMlTrainingDiagram
            status={localMlRunStatus}
            checkpointReady={Boolean(localMlModelStatus?.checkpointReady)}
            rowPriorReady={Boolean(localMlModelStatus?.rowPriorReady)}
            fullCheckpointReady={Boolean(localMlModelStatus?.fullCheckpointReady)}
            activeStage={localMlModelStatus?.activeStage ?? null}
            message={localMlMessage}
          />
        ) : null}
        {usesGemini ? (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Gemini normalization is experimental
                </div>
                <p className="mt-1">
                  {usesGeminiCalibration
                    ? "Before Gemini, MediaPipe removes the background. After Gemini, this path compares the generated mask against the original cleaned mask and applies the visible width correction."
                    : "Before Gemini, MediaPipe removes only the background and sends a neutral-background person image."}
                </p>
              </div>
              <label className="flex min-w-[280px] flex-col gap-1 text-blue-950">
                <span className="font-semibold">Gemini image model</span>
                <select
                  value={geminiModel}
                  onChange={(event) => {
                    setGeminiModel(event.target.value as GeminiImageModelCode);
                    setPoseSource(null);
                    pose.reset();
                    normalizedImage.clear();
                    setGeminiStatus("idle");
                    setGeminiError(null);
                    setGeminiMs(null);
                    clearCalibration();
                    clearGeminiCorrection();
                    setAnalysisTotalMs(null);
                  }}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-text-primary"
                >
                  {GEMINI_IMAGE_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label} · {model.value}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-blue-800">{selectedGeminiModel.description}</span>
              </label>
            </div>
            <div className="mt-4 rounded-lg border border-blue-200 bg-white/70 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 font-semibold text-blue-950">
                  <input
                    type="checkbox"
                    checked={useDefaultGeminiPrompt}
                    onChange={(event) => setUseDefaultGeminiPrompt(event.target.checked)}
                  />
                  Use default Gemini prompt
                </label>
                {!useDefaultGeminiPrompt ? (
                  <button
                    type="button"
                    onClick={() => setGeminiPrompt(DEFAULT_SIZING_LAB_GEMINI_PROMPT)}
                    className="text-left text-[11px] font-semibold text-brand-blue hover:underline"
                  >
                    Reset to default
                  </button>
                ) : null}
              </div>
              <textarea
                value={useDefaultGeminiPrompt ? DEFAULT_SIZING_LAB_GEMINI_PROMPT : geminiPrompt}
                onChange={(event) => setGeminiPrompt(event.target.value)}
                readOnly={useDefaultGeminiPrompt}
                rows={8}
                className={`mt-2 w-full rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed text-text-primary ${
                  useDefaultGeminiPrompt
                    ? "border-blue-100 bg-slate-50"
                    : "border-blue-300 bg-white"
                }`}
              />
              <div className="mt-1 text-[11px] text-blue-800">
                {activeGeminiPrompt.length} / 8000 chars
              </div>
            </div>
          </div>
        ) : null}
        {usesModelCoordinateGuide ? (
          <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-950">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-semibold">Coordinate curve guide</div>
                <p className="mt-1 text-purple-900">
                  The selected guide model receives the source photo and the pixel-grid overlay, then returns visible curved red lines or coordinate JSON for waist, trouser-waist, and hips.
                </p>
              </div>
              <label className="flex min-w-[280px] flex-col gap-1">
                <span className="font-semibold">Coordinate model</span>
                <select
                  value={geminiGuideModel}
                  onChange={(event) => {
                    setGeminiGuideModel(event.target.value as GeminiGuideModelCode);
                    clearGeminiGuide();
                    setPoseSource(null);
                    pose.reset();
                    setAnalysisTotalMs(null);
                  }}
                  className="rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-text-primary"
                >
                  {GEMINI_GUIDE_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label} · {model.value}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-purple-800">{selectedGeminiGuideModel.description}</span>
              </label>
            </div>
            <div className="mt-4 rounded-lg border border-purple-200 bg-white/70 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={useDefaultGeminiGuidePrompt}
                    onChange={(event) => {
                      setUseDefaultGeminiGuidePrompt(event.target.checked);
                      clearGeminiGuide();
                      setPoseSource(null);
                      setAnalysisTotalMs(null);
                    }}
                  />
                  Use default coordinate prompt
                </label>
                <span className="text-[11px] font-mono text-purple-800">
                  default {defaultGeminiGuidePromptVersion}
                  {usesGeminiGuideWithSide ? ` · side ${SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT_VERSION}` : ""}
                </span>
                {!useDefaultGeminiGuidePrompt ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiGuidePrompt(defaultGeminiGuidePrompt);
                      clearGeminiGuide();
                      setPoseSource(null);
                      setAnalysisTotalMs(null);
                    }}
                    className="text-left text-[11px] font-semibold text-brand-blue hover:underline"
                  >
                    Reset to default
                  </button>
                ) : null}
              </div>
              <textarea
                value={useDefaultGeminiGuidePrompt ? defaultGeminiGuidePrompt : geminiGuidePrompt}
                onChange={(event) => {
                  setGeminiGuidePrompt(event.target.value);
                  clearGeminiGuide();
                  setPoseSource(null);
                  setAnalysisTotalMs(null);
                }}
                readOnly={useDefaultGeminiGuidePrompt}
                rows={8}
                className={`mt-2 w-full rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed text-text-primary ${
                  useDefaultGeminiGuidePrompt
                    ? "border-purple-100 bg-slate-50"
                    : "border-purple-300 bg-white"
                }`}
              />
              <div className="mt-1 text-[11px] text-purple-800">
                {activeGeminiGuidePrompt.length} / 8000 chars
              </div>
              {geminiGuidePromptDebug ? (
                <div className="mt-2 rounded-md border border-purple-100 bg-purple-50 px-2 py-1 font-mono text-[10px] text-purple-900">
                  Last run prompt: {geminiGuidePromptDebug.source} · {geminiGuidePromptDebug.version}
                </div>
              ) : null}
              {usesGeminiGuideWithSide ? (
                <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                  <div className="text-[11px] font-semibold text-indigo-950">
                    Side guide default {SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT_VERSION}
                  </div>
                  <textarea
                    value={DEFAULT_SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT}
                    readOnly
                    rows={6}
                    className="mt-2 w-full rounded-lg border border-indigo-100 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-text-primary"
                  />
                </div>
              ) : null}
              {!useDefaultGeminiGuidePrompt ? (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                  Custom prompt is active. Default prompt edits will not affect this run unless you reset or re-enable default.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {usesManualGuide ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Manual coordinate camera-angle test
                </div>
                <p className="mt-1 text-amber-900">
                  When enabled, Gemini receives the original photo, returns a camera-perspective-corrected image,
                  and that returned image becomes the source for MediaPipe, the yellow height scale, and all manual red coordinates.
                </p>
                <p className="mt-1 font-semibold text-red-800">
                  Experimental only: Gemini is generative. This tests its output; it does not prove that body geometry was preserved.
                </p>
              </div>
              <label className="inline-flex min-w-[300px] items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold">
                <input
                  type="checkbox"
                  checked={manualCameraCalibrationEnabled}
                  onChange={(event) => {
                    setManualCameraCalibrationEnabled(event.target.checked);
                    invalidateManualCameraCalibrationResult();
                  }}
                />
                Use Gemini result as manual test image
              </label>
            </div>

            {manualCameraCalibrationEnabled ? (
              <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-white/80 p-3">
                <label className="flex flex-col gap-1 text-amber-950">
                  <span className="font-semibold">Gemini image model</span>
                  <select
                    value={geminiModel}
                    onChange={(event) => {
                      setGeminiModel(event.target.value as GeminiImageModelCode);
                      invalidateManualCameraCalibrationResult();
                    }}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-text-primary"
                  >
                    {GEMINI_IMAGE_MODELS.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label} · {model.value}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-amber-800">{selectedGeminiModel.description}</span>
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={useDefaultManualCameraCalibrationPrompt}
                      onChange={(event) => {
                        setUseDefaultManualCameraCalibrationPrompt(event.target.checked);
                        invalidateManualCameraCalibrationResult();
                      }}
                    />
                    Use default camera-calibration prompt
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-amber-800">
                      {SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT_VERSION}
                    </span>
                    {!useDefaultManualCameraCalibrationPrompt ? (
                      <button
                        type="button"
                        onClick={() => {
                          setManualCameraCalibrationPrompt(DEFAULT_SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT);
                          invalidateManualCameraCalibrationResult();
                        }}
                        className="text-left text-[11px] font-semibold text-brand-blue hover:underline"
                      >
                        Reset to default
                      </button>
                    ) : null}
                  </div>
                </div>
                <textarea
                  value={useDefaultManualCameraCalibrationPrompt
                    ? DEFAULT_SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT
                    : manualCameraCalibrationPrompt}
                  onChange={(event) => {
                    setManualCameraCalibrationPrompt(event.target.value);
                    invalidateManualCameraCalibrationResult();
                  }}
                  readOnly={useDefaultManualCameraCalibrationPrompt}
                  rows={10}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed text-text-primary ${
                    useDefaultManualCameraCalibrationPrompt
                      ? "border-amber-100 bg-slate-50"
                      : "border-amber-300 bg-white"
                  }`}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800">
                  <span>{activeManualCameraCalibrationPrompt.length} / 8000 chars</span>
                  <span className="font-semibold">
                    {manualCameraCalibrationResultActive
                      ? `Active source: Gemini result ${normalizedImage.state.width}×${normalizedImage.state.height}`
                      : "Active source: original until Analyze completes"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-red-900">
                Gemini is off. Analyze uses the original photo, then manual red coordinates own the active formula width.
              </p>
            )}
          </div>
        ) : null}
        {usesMaskGuide ? (
          <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs text-cyan-950">
            <div className="font-semibold">Mask/MediaPipe guide</div>
            <p className="mt-1 text-cyan-900">
              No Gemini request. This path only exposes the current MediaPipe mask rows: natural waist is the narrowest cleaned torso row, trouser waist is the lab&apos;s lower belt-row estimate, and hips uses the widest pelvis-band mask row when available.
            </p>
          </div>
        ) : null}
        {usesSegmenter ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
            <div className="font-semibold">MediaPipe ImageSegmenter cleanup</div>
            <p className="mt-1">
              Keeps clothes, body-skin, and ambiguous person pixels; removes background, hair, and face-skin. Arm/hand cleanup still comes from landmarks at the measurement rows.
            </p>
          </div>
        ) : null}
        {usesBackendSdk ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800">
            <div className="font-semibold text-slate-950">SDK/backend formula mirror</div>
            <p className="mt-1">
              This uses the original photo landmarks like the SDK request. It does not use lab mask rows,
              prompts, Gemini, side-photo depth, Segmenter cleanup, or local formulas for the backend numbers.
              No Gemini. No prompt. Backend result only.
            </p>
          </div>
        ) : null}
        {usesThirdParty ? (
          <ThirdPartyProviderPanel
            mode={thirdPartyMode}
            onModeChange={(mode) => {
              setThirdPartyMode(mode);
              setThirdPartyStatus("idle");
              setThirdPartyError(null);
              setThirdPartyResult(null);
            }}
            result={thirdPartyResult}
            error={thirdPartyError}
          />
        ) : null}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            void runAnalysis();
          }}
          disabled={!canAnalyze}
          className="inline-flex items-center gap-2"
        >
          {pose.status === "loading" || localMlRunStatus === "predicting" || geminiStatus === "loading" || manualCameraCalibrationStatus === "loading" || geminiBgStatus === "loading" || calibrationStatus === "loading" || geminiGuideStatus === "loading" || backendSdkStatus === "loading" || thirdPartyStatus === "loading" || segmenterStatus === "loading" || (activeUseSidePhoto && sidePose.status === "loading") ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {geminiBgStatus === "loading"
                ? "Removing background…"
                : manualCameraCalibrationStatus === "loading"
                ? "Correcting camera angle with Gemini…"
                : geminiStatus === "loading"
                ? "Running Gemini…"
                : calibrationStatus === "loading"
                ? "Calibrating masks…"
                : geminiGuideStatus === "loading"
                ? "Getting guide rows…"
                : thirdPartyStatus === "loading"
                ? "Calling Bodygram…"
                : backendSdkStatus === "loading"
                ? "Calling backend sizing…"
                : localMlRunStatus === "predicting"
                ? "Running local ML…"
                : segmenterStatus === "loading"
                  ? "Running Segmenter…"
                  : "Running MediaPipe…"}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Analyze {selectedPathLabel}
            </>
          )}
        </Button>
        {runningStartedAt !== null ? (
          <span className="font-mono text-xs tabular-nums text-brand-blue">
            Running {selectedPathLabel} · {(runningElapsedMs / 1000).toFixed(1)}s
          </span>
        ) : null}
        {pose.status === "ready" && poseMatchesPath && (
          <span className="text-xs text-text-secondary">
            Path: {selectedPathLabel} ·
            {usesGemini ? ` ${selectedGeminiModel.label} · BG ${geminiBgMs ?? "—"} ms · Gemini ${geminiMs ?? "—"} ms ·` : ""}
            {usesGeminiCalibration ? ` Calibration ${calibrationMs ?? "—"} ms ·` : ""}
            {usesModelCoordinateGuide
              ? ` ${selectedGeminiGuideModel.label} front guide ${geminiGuideMs ?? "—"} ms${usesGeminiGuideWithSide ? ` · side guide ${sideGeminiGuideMs ?? "—"} ms` : ""} · browser prep ${geminiGuideTimings?.browserPrepMs ?? "—"} ms · model API wait ${geminiGuideTimings?.geminiRoundTripMs ?? "—"} ms · server prep ${geminiGuideTimings?.serverPrepareMs ?? "—"} ms ·`
              : ""}
            {usesManualGuide
              ? manualCameraCalibrationResultActive
                ? ` Manual coordinate guide · Gemini camera result ${activeImageState.width}×${activeImageState.height} · Gemini ${manualCameraCalibrationMs ?? "—"} ms ·`
                : " Manual coordinate guide · original image ·"
              : ""}
            {usesLocalMl ? ` Local ML ${localMlRunStatus}${localMlElapsedMs != null ? ` ${localMlElapsedMs} ms` : ""} ·` : ""}
            {usesSegmenter ? ` Segmenter ${segmenterMs ?? "—"} ms ·` : ""}
            {usesBackendSdk ? " SDK/backend formulas ·" : ""}
            MediaPipe {pose.elapsedMs + (activeUseSidePhoto && sidePose.status === "ready" ? sidePose.elapsedMs : 0)} ms ·
            Total {displayedElapsedMs ?? "—"} ms ·
            {usesBackendSdk ? (
              <>Front {pose.pose?.landmarks.length} landmarks only · backend sizing call</>
            ) : (
              <>Front {pose.pose?.landmarks.length} landmarks · mask {pose.pose?.mask ? `${pose.pose.maskWidth}×${pose.pose.maskHeight}` : "n/a"}</>
            )}
            {activeUseSidePhoto
              ? sidePose.status === "ready" && sidePose.pose
                ? ` · Side mask ${sidePose.pose.maskWidth}×${sidePose.pose.maskHeight}`
                : sideImage.state.previewUrl
                  ? " · Side pending"
                  : " · Side photo enabled but empty"
              : usesBackendSdk
                ? " · SDK front-only mode"
                : " · Front-only mode"}
          </span>
        )}
        {pose.status === "error" && (
          <span className="text-xs text-red-600">Error: {pose.error}</span>
        )}
        {geminiStatus === "error" && (
          <span className="text-xs text-red-600">Gemini error: {geminiError}</span>
        )}
        {manualCameraCalibrationStatus === "error" && (
          <span className="text-xs text-red-600">
            Gemini camera calibration error: {manualCameraCalibrationError ?? "Camera calibration failed"}
          </span>
        )}
        {geminiBgStatus === "error" && (
          <span className="text-xs text-red-600">Background removal error: {geminiBgError}</span>
        )}
        {segmenterStatus === "error" && (
          <span className="text-xs text-red-600">Segmenter error: {segmenterError ?? "ImageSegmenter failed"}</span>
        )}
        {calibrationStatus === "error" && (
          <span className="text-xs text-red-600">Calibration error: {calibrationError ?? "Gemini calibration failed"}</span>
        )}
        {geminiGuideStatus === "error" && (
          <span className="text-xs text-red-600">Coordinate guide error: {geminiGuideError ?? "Coordinate guide failed"}</span>
        )}
        {backendSdkStatus === "error" && (
          <span className="text-xs text-red-600">Backend SDK error: {backendSdkError ?? "Backend SDK sizing failed"}</span>
        )}
        {geminiCorrectionStatus === "error" && (
          <span className="text-xs text-red-600">Gemini correction error: {geminiCorrectionError ?? "Gemini correction failed"}</span>
        )}
        {usesLocalMl && localMlRunStatus === "waiting-for-checkpoint" ? (
          <span className="text-xs text-amber-700">Local ML: {localMlMessage ?? "Waiting for a trained checkpoint."}</span>
        ) : null}
        {usesLocalMl && localMlRunStatus === "error" ? (
          <span className="text-xs text-red-600">Local ML error: {localMlMessage ?? "Prediction failed."}</span>
        ) : null}
      </section>

      {usesThirdParty ? (
        <p className="-mt-3 text-xs text-amber-700">
          Select a known dataset person so age and body stats are explicit. Photo mode additionally requires a valid front A-pose and right-side photo with arms parallel to the torso.
        </p>
      ) : null}

      {pose.status === "ready" && (
        <section className="flex items-center gap-4 text-xs">
          {!usesBackendSdk ? (
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showMask} onChange={(e) => setShowMask(e.target.checked)} />
              Mask overlay
            </label>
          ) : null}
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showLandmarks} onChange={(e) => setShowLandmarks(e.target.checked)} />
            Landmark overlay
          </label>
        </section>
      )}

      <section className={`grid grid-cols-1 gap-5 ${usesCoordinateWorkbench ? "" : "lg:grid-cols-[minmax(0,1fr)_440px]"}`}>
        <div ref={manualWorkbenchRef} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">
            {usesLocalMl ? "Local ML prediction workbench" : usesManualGuide ? "Manual coordinate editor" : "Preview"}
          </h3>
          {image.state.previewUrl ? (
            <>
              {usesCoordinateWorkbench ? (
                <div className="space-y-4">
                  {usesLocalMl ? (
                    <LocalMlRowEvidencePanel
                      rows={localMlPredictionRows}
                      modelStage={localMlPredictionStage}
                      depthReady={localMlDepthReady}
                      endpointSource={localMlEndpointSource}
                      imageWidth={activeImageState.width}
                      imageHeight={activeImageState.height}
                      gender={metrics.gender}
                      heightCm={metrics.heightCm}
                      weightKg={metrics.weightKg}
                      profileLabel={selectedDataset?.label.split(" · ")[0] ?? "Current upload"}
                    />
                  ) : null}
                  {manualCameraCalibrationResultActive ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950">
                      <div className="font-semibold">Active measurement image: Gemini camera-corrected result</div>
                      <div className="mt-1 font-mono text-[11px]">
                        original {image.state.width}×{image.state.height} → returned {activeImageState.width}×{activeImageState.height}
                      </div>
                      <div className="mt-1 text-[11px] text-blue-800">
                        Red rows, green proof ruler, yellow height line, mask, and cm/px below all belong to the returned image. Original-image saved coordinates are intentionally not reused.
                      </div>
                    </div>
                  ) : null}
                  <ManualCoordinateGuidePanel
                    imageUrl={activeImageState.previewUrl}
                    imageWidth={activeImageState.width}
                    imageHeight={activeImageState.height}
                    guide={effectiveCoordinateGuide}
                    measurement={geminiGuideMeasurement}
                    pose={poseMatchesPath ? pose.pose : null}
                    scaleEvidence={activeManualScaleEvidence}
                    comparisonScaleEvidence={manualTapeScaleEvidence}
                    heightCm={metrics.heightCm}
                    manualHeightScaleOverride={activeManualHeightScaleOverride}
                    onManualHeightScaleOverrideChange={usesLocalMl ? setLocalMlHeightScaleOverride : setManualHeightScaleOverride}
                    wearRowPredictions={usesLocalMl ? localMlPredictionRows : undefined}
                    scaleProofPreset={!manualCameraCalibrationResultActive
                      ? selectedDatasetId === "shane-2"
                        ? SHANE_2_SCALE_PROOF_PRESET
                        : selectedDatasetId === "shahnaz-2"
                          ? shahnazActivePhoto === "tape"
                            ? SHAHNAZ_2_SCALE_PROOF_PRESET
                            : null
                          : null
                      : null}
                    targetNaturalWaistCm={selectedDatasetNaturalWaistCm}
                    targetTrouserWaistCm={selectedDatasetTrouserWaistCm}
                    targetHipsCm={selectedDataset?.hipsCm}
                    linkedEditor={usesManualGuide && activeUseSidePhoto && sideImage.state.previewUrl ? {
                      imageUrl: sideImage.state.previewUrl,
                      imageWidth: sideImage.state.width,
                      imageHeight: sideImage.state.height,
                      guide: effectiveManualSideGuide,
                      measurement: sideGeminiGuideMeasurement,
                      scaleEvidence: activeSideScaleEvidence,
                      title: "Side photo",
                      labelSuffix: "side manual coordinate",
                      measurementMode: "side-depth",
                      targetNaturalWaistCm: selectedDataset?.waistSideDepthCm,
                      targetTrouserWaistCm: selectedDataset?.trouserWaistSideDepthCm,
                      targetHipsCm: selectedDataset?.hipsSideDepthCm,
                      onChange: setManualSideGuide,
                      onReset: () => setManualSideGuide(buildManualSideGuideFromPose(sidePose.pose, sideImage.state.width, sideImage.state.height, metrics.heightCm)),
                    } : null}
                    depthRatioOverrides={activeGuideDepthRatioOverrides}
                    knownDepthRatioAnswers={selectedDataset?.depthRatioOverrides}
                    onDepthRatioOverrideChange={updateActiveDepthRatioOverride}
                    onAppleVisionBodyScaleChange={usesLocalMl ? setLocalMlAppleVisionBodyScale : setAppleVisionBodyScale}
                    fullScreenPhotoComparison={usesShahnazPhotoPair && shahnazTapeImageUrl && shahnazSecondImageUrl && shahnazTapeGuideForDisplay && shahnazSecondGuideForDisplay ? (
                      <ShahnazPhotoPairPanel
                        tapeImageUrl={shahnazTapeImageUrl}
                        secondImageUrl={shahnazSecondImageUrl}
                        tapeImageWidth={SHAHNAZ_2_MANUAL_ROW_PRESET.sourceImageWidth}
                        tapeImageHeight={SHAHNAZ_2_MANUAL_ROW_PRESET.sourceImageHeight}
                        secondImageWidth={SHAHNAZ_2_SECOND_MANUAL_ROW_PRESET.sourceImageWidth}
                        secondImageHeight={SHAHNAZ_2_SECOND_MANUAL_ROW_PRESET.sourceImageHeight}
                        tapeGuide={shahnazTapeGuideForDisplay}
                        secondGuide={shahnazSecondGuideForDisplay}
                        activePhoto={shahnazActivePhoto}
                        switchStatus={shahnazPhotoSwitchStatus}
                        switchError={shahnazPhotoSwitchError}
                        onSelectPhoto={(photo) => void selectShahnazCalculationPhoto(photo)}
                        large
                      />
                    ) : undefined}
                    title={usesLocalMl
                      ? "Local ML coordinate prediction"
                      : usesShahnazPhotoPair
                        ? `Active calculation · ${shahnazActivePhoto === "tape" ? "tape photo" : "IMG_8444 tape-free photo"}`
                        : undefined}
                    labelSuffix={usesLocalMl ? "local ML prediction" : undefined}
                    description={usesLocalMl
                      ? localMlUsesManualCalculationFallback
                        ? "Local ML draws the row positions and MediaPipe supplies temporary visible endpoints. From there, Apple/Depth scale, depth sliders, ellipse circumference, tape proof, free ruler and full screen are exactly the Manual Coordinate calculator. Saved Manual red lines remain separate. If this dataset has saved depth sliders, Local ML starts with an isolated copy; those ratios are calculator inputs, not ML predictions."
                        : "The full local checkpoint owns these red lines and initial depth ratios. Apple, tape proof, free ruler, full screen, sliders, and the final calculator are the same tools as Manual Coordinate. Manual saved coordinates are not loaded or changed."
                      : usesShahnazPhotoPair
                        ? "Open Full screen to compare both photos. The selected card alone feeds pixels to Apple Vision, Depth Pro and the circumference results."
                        : undefined}
                    resetLabel={usesLocalMl
                      ? "Clear Local ML prediction"
                      : usesShahnazPhotoPair
                        ? "Reset this photo's red lines"
                        : undefined}
                    onChange={updateDisplayedCoordinateGuide}
                    onReset={resetDisplayedCoordinateGuide}
                  />
                  <details className="rounded-xl border border-gray-200 bg-white p-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-text-hint">
                      Debug preview used for landmarks + mask
                    </summary>
                    <div className="mt-3">
                      <PreviewCanvas
                        imageUrl={activeImageState.previewUrl ?? image.state.previewUrl}
                        imageWidth={activeImageState.width}
                        imageHeight={activeImageState.height}
                        pose={displayPose}
                        showMask={usesBackendSdk ? false : showMask}
                        showLandmarks={showLandmarks}
                        maskMode={maskMode}
                        heightAudit={trace?.frontHeightScaleAudit ?? null}
                      />
                    </div>
                  </details>
                </div>
              ) : (
              <div className={`grid grid-cols-1 gap-4 ${activeUseSidePhoto || (usesGemini && (geminiInputImage.state.previewUrl || normalizedImage.state.previewUrl)) ? "md:grid-cols-2" : ""} ${usesGemini && geminiInputImage.state.previewUrl && normalizedImage.state.previewUrl ? usesGeminiCalibration && originalCalibrationPose ? "xl:grid-cols-5" : "xl:grid-cols-4" : usesGemini && normalizedImage.state.previewUrl ? "xl:grid-cols-3" : ""}`}>
                  {usesGemini && normalizedImage.state.previewUrl ? (
                <>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-hint">
                      Original input
                    </div>
                    <PreviewCanvas
                      imageUrl={image.state.previewUrl}
                      imageWidth={image.state.width}
                      imageHeight={image.state.height}
                      pose={null}
                      showMask={false}
                      showLandmarks={false}
                      maskMode={maskMode}
                    />
                  </div>
                  {usesGeminiCalibration && originalCalibrationPose ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                        Original calibration mask
                      </div>
                      <PreviewCanvas
                        imageUrl={image.state.previewUrl}
                        imageWidth={image.state.width}
                        imageHeight={image.state.height}
                        pose={originalCalibrationPose}
                        showMask={showMask}
                        showLandmarks={showLandmarks}
                        maskMode="ignore-arms"
                      />
                    </div>
                  ) : null}
                  {geminiInputImage.state.previewUrl ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        Gemini input after background removal
                      </div>
                      <PreviewCanvas
                        imageUrl={geminiInputImage.state.previewUrl}
                        imageWidth={geminiInputImage.state.width}
                        imageHeight={geminiInputImage.state.height}
                        pose={null}
                        showMask={false}
                        showLandmarks={false}
                        maskMode={maskMode}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                      Gemini output before MediaPipe
                    </div>
                    <PreviewCanvas
                      imageUrl={normalizedImage.state.previewUrl}
                      imageWidth={normalizedImage.state.width}
                      imageHeight={normalizedImage.state.height}
                      pose={null}
                      showMask={false}
                      showLandmarks={false}
                      maskMode={maskMode}
                    />
                  </div>
                  <div className="space-y-2">
	                    <div className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
	                      Image used for landmarks + mask
	                    </div>
                    <PreviewCanvas
                      imageUrl={normalizedImage.state.previewUrl}
                      imageWidth={normalizedImage.state.width}
                      imageHeight={normalizedImage.state.height}
                      pose={displayPose}
                      showMask={usesBackendSdk ? false : showMask}
                      showLandmarks={showLandmarks}
                      maskMode={maskMode}
                      heightAudit={trace?.frontHeightScaleAudit ?? null}
                    />
                  </div>
                </>
              ) : (
	                <div className="space-y-2">
	                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
	                    {usesBackendSdk ? "Original image used for SDK landmarks" : "Image used for landmarks + mask"}
	                  </div>
                  <PreviewCanvas
                    imageUrl={image.state.previewUrl}
                    imageWidth={image.state.width}
                    imageHeight={image.state.height}
                    pose={displayPose}
                    showMask={usesBackendSdk ? false : showMask}
                    showLandmarks={showLandmarks}
                    maskMode={maskMode}
                    heightAudit={trace?.frontHeightScaleAudit ?? null}
                  />
                </div>
              )}
              {usesCoordinateGuide && geminiGuideGridImageUrl ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                    Image 2: pixel grid overlay sent to coordinate model
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={geminiGuideGridImageUrl}
                    alt="Original photo with pixel grid overlay"
                    className="w-full rounded-xl border border-purple-200 bg-black object-contain"
                  />
                </div>
              ) : null}
              {usesCoordinateGuide && geminiGuideLineImageUrl ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-red-700">
                    Model returned curved-line image on grid overlay
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={geminiGuideLineImageUrl}
                    alt="Model returned image with waist, trouser-waist, and hip red curves"
                    className="w-full rounded-xl border border-red-200 bg-black object-contain"
                  />
                </div>
              ) : null}
              {usesGemini && !normalizedImage.state.previewUrl ? (
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-6 text-sm text-blue-900">
                  Run Gemini normalized to see the generated image before MediaPipe.
                </div>
              ) : null}
              {activeUseSidePhoto
                ? sideImage.state.previewUrl ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-hint">
                      Side photo
                    </div>
                    <PreviewCanvas
                      imageUrl={sideImage.state.previewUrl}
                      imageWidth={sideImage.state.width}
                      imageHeight={sideImage.state.height}
                      pose={sidePose.pose}
                      showMask={showMask}
                      showLandmarks={showLandmarks}
                      maskMode={maskMode}
                      heightAudit={trace?.sideHeightScaleAudit ?? null}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary py-8 text-center">Upload a side image to measure depth.</p>
                )
                : null}
              {usesGeminiGuideWithSide && sideGeminiGuideGridImageUrl ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                    Side image 2: pixel grid overlay sent to coordinate model
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sideGeminiGuideGridImageUrl}
                    alt="Side photo with pixel grid overlay"
                    className="w-full rounded-xl border border-purple-200 bg-black object-contain"
                  />
                </div>
              ) : null}
              {usesGeminiGuideWithSide && sideGeminiGuideLineImageUrl ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-red-700">
                    Side model returned curved-line image on grid overlay
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sideGeminiGuideLineImageUrl}
                    alt="Side returned image with waist, trouser-waist, and hip red depth curves"
                    className="w-full rounded-xl border border-red-200 bg-black object-contain"
                  />
                </div>
              ) : null}
              </div>
              )}
              <GeminiCalibrationPanel
                calibration={geminiCalibration}
                geminiPose={poseMatchesPath ? pose.pose : null}
                geminiImageWidth={activeImageState.width}
                geminiImageHeight={activeImageState.height}
                originalPose={originalCalibrationPose}
                originalImageWidth={image.state.width}
                originalImageHeight={image.state.height}
                heightCm={metrics.heightCm}
              />
              {usesModelCoordinateGuide ? (
                <div className="space-y-4">
                  {geminiGuide ? (
                    <ManualCoordinateGuidePanel
                      imageUrl={image.state.previewUrl}
                      imageWidth={image.state.width}
                      imageHeight={image.state.height}
                      guide={manualAdjustedGeminiGuide ?? geminiGuide}
                      measurement={geminiGuideMeasurement}
                      scaleEvidence={buildHeightScaleEvidence(trace?.cmPerPx ?? null, trace?.scaleSource, trace?.frontHeightScaleAudit)}
                      targetNaturalWaistCm={selectedDatasetNaturalWaistCm}
                      targetTrouserWaistCm={selectedDatasetTrouserWaistCm}
                      targetHipsCm={selectedDataset?.hipsCm}
                      linkedEditor={usesGeminiGuideWithSide && sideGeminiGuide && sideImage.state.previewUrl ? {
                        imageUrl: sideImage.state.previewUrl,
                        imageWidth: sideImage.state.width,
                        imageHeight: sideImage.state.height,
                        guide: manualAdjustedSideGeminiGuide ?? sideGeminiGuide,
                        measurement: sideGeminiGuideMeasurement,
                        scaleEvidence: activeSideScaleEvidence,
                        title: "Side photo",
                        labelSuffix: "side manual adjusted",
                        measurementMode: "side-depth",
                        targetNaturalWaistCm: selectedDataset?.waistSideDepthCm,
                        targetTrouserWaistCm: selectedDataset?.trouserWaistSideDepthCm,
                        targetHipsCm: selectedDataset?.hipsSideDepthCm,
                        onChange: setManualAdjustedSideGeminiGuide,
                        onReset: () => setManualAdjustedSideGeminiGuide(null),
                      } : null}
                      depthRatioOverrides={guideDepthRatioOverrides}
                      knownDepthRatioAnswers={selectedDataset?.depthRatioOverrides}
                      onDepthRatioOverrideChange={updateGuideDepthRatioOverride}
                      title="Manual adjustment over Gemini guide"
                      description="Gemini returned image and JSON stay visible below as evidence. Red guide owns the active formula span; blue dashed line is visible-edge evidence only."
	                      resetLabel="Reset to Gemini guide"
	                      labelSuffix="manual adjusted"
	                      onChange={setManualAdjustedGeminiGuide}
	                      onReset={() => setManualAdjustedGeminiGuide(null)}
	                    />
	                  ) : null}
	                  {usesGeminiGuideWithSide && sideGeminiGuide && sideImage.state.previewUrl ? (
	                    <ManualCoordinateGuidePanel
	                      imageUrl={sideImage.state.previewUrl}
	                      imageWidth={sideImage.state.width}
	                      imageHeight={sideImage.state.height}
                      guide={manualAdjustedSideGeminiGuide ?? sideGeminiGuide}
                      measurement={sideGeminiGuideMeasurement}
                      scaleEvidence={activeSideScaleEvidence}
                      measurementMode="side-depth"
                      targetNaturalWaistCm={selectedDataset?.waistSideDepthCm}
                      targetTrouserWaistCm={selectedDataset?.trouserWaistSideDepthCm}
                      targetHipsCm={selectedDataset?.hipsSideDepthCm}
                      title="Manual adjustment over side Gemini guide"
	                      description="Side guide is separate. Drag each side-photo line independently; its width becomes side depth evidence for the front ellipse in side-guide mode."
	                      resetLabel="Reset side Gemini guide"
	                      labelSuffix="side manual adjusted"
	                      onChange={setManualAdjustedSideGeminiGuide}
	                      onReset={() => setManualAdjustedSideGeminiGuide(null)}
	                    />
	                  ) : null}
	                  <GeminiGuidePanel
                    measurement={geminiGuideMeasurement}
                    status={geminiGuideStatus}
                    error={geminiGuideError}
                    elapsedMs={geminiGuideMs}
                    imageUrl={image.state.previewUrl}
                    imageWidth={image.state.width}
                    imageHeight={image.state.height}
                    targetNaturalWaistCm={selectedDatasetNaturalWaistCm}
                    targetTrouserWaistCm={selectedDatasetTrouserWaistCm}
                    targetHipsCm={selectedDataset?.hipsCm}
                    responseDebug={geminiGuideResponseDebug}
                  />
                </div>
              ) : null}
              {usesGeminiGuideWithSide ? (
                <GeminiGuidePanel
                  measurement={sideGeminiGuideMeasurement}
                  status={geminiGuideStatus}
                  error={geminiGuideError}
                  elapsedMs={sideGeminiGuideMs}
                  imageUrl={sideImage.state.previewUrl}
                  imageWidth={sideImage.state.width}
                  imageHeight={sideImage.state.height}
                  title="Side coordinate curve guide"
                  description="Separate side-photo guide. The side red curves are measured with the side photo cm/px and are used as depth for the front+side ellipse in this mode only."
                  sourceImageLabel="Side image with active depth guide coordinates"
                  responseDebug={sideGeminiGuideResponseDebug}
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-text-secondary py-8 text-center">Upload an image to see the overlay.</p>
          )}
        </div>
        {!usesCoordinateWorkbench ? (
        <div className="space-y-5">
	          {!usesBackendSdk ? (
	            <>
              <div className="space-y-5">
                <ResultCard
                  trace={trace}
                  actualWaistCm={selectedDatasetNaturalWaistCm}
                  actualTrouserWaistCm={selectedDatasetTrouserWaistCm}
                  calibration={geminiCalibration?.naturalWaist ?? null}
                  trouserCalibration={geminiCalibration?.trouserWaist ?? null}
                  guide={geminiGuideMeasurement?.waist ?? null}
                  trouserGuide={geminiGuideMeasurement?.trouserWaist ?? null}
                />
                <HipsCard
                  trace={hipsTrace}
                  actualHipsCm={selectedDataset?.hipsCm}
                  calibration={geminiCalibration?.hips ?? null}
                  guide={geminiGuideMeasurement?.hips ?? null}
                />
                <GeminiCorrectionPanel
                  status={geminiCorrectionStatus}
                  correction={geminiCorrection}
                  error={geminiCorrectionError}
		                  elapsedMs={geminiCorrectionMs}
		                />
              </div>
		            </>
		          ) : (
	            <BackendDatasetResults
	              trace={backendSdkTrace}
	              status={backendSdkStatus}
	              actualWaistCm={selectedDataset?.waistCm}
	              actualHipsCm={selectedDataset?.hipsCm}
	              unit={backendResultUnit}
	              onUnitChange={setBackendResultUnit}
	            />
	          )}
	        </div>
        ) : null}
	      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LandmarkTable pose={displayPose} />
        {!usesBackendSdk ? (
          <MaskPreview
            pose={displayPose}
            trace={trace}
            maskMode={maskMode}
            debugRows={displayHipDebugRows}
            showTraceRows={!usesCoordinateGuide && !usesMaskGuide}
            debugRowsLabel={usesLocalMl ? "Local ML predicted row width" : usesManualGuide ? "Manual coordinate row width" : usesCoordinateGuide ? "Coordinate guide row width" : usesMaskGuide ? "Mask/MediaPipe guide rows" : "selected hip row"}
          />
        ) : null}
        {activeUseSidePhoto && sidePose.pose && (
          <MaskPreview
            pose={sidePose.pose}
            trace={trace}
            mode="side"
            maskMode={maskMode}
            debugRows={sideMaskGuideDebugRows}
            debugRowsLabel={usesGeminiGuideWithSide ? "Side coordinate guide depth rows" : "side hip depth row"}
          />
        )}
      </section>

      {!usesCoordinateWorkbench ? (
        <section>
          <FormulaPanel trace={trace} backendTrace={backendSdkTrace} />
        </section>
      ) : null}
    </main>
  );
}

function buildManualGuideFromTrace(
  trace: WaistTrace | null,
  hipsTrace: HipsTrace | null,
  pose: PoseResult | null,
  imageWidth: number,
  imageHeight: number,
  selectedDatasetId: string,
  maskMode: MeasurementMaskMode,
): GeminiBodyGuide | null {
  if (!trace || imageWidth <= 0 || imageHeight <= 0) return null;
  const hipsRow = hipsTrace?.debugRows.find((row) => row.id === "hip-selected")
    ?? hipsTrace?.debugRows.find((row) => row.id === "hip-widest-band");
  const tapeRowPreset = selectedDatasetId === "bahar"
    ? BAHAR_TAPE_ROW_PRESET
    : null;
  if (tapeRowPreset) {
    return buildManualGuideFromTapeRowPreset(
      tapeRowPreset,
      pose,
      trace.cmPerPx,
      imageWidth,
      imageHeight,
      maskMode,
      `Manual coordinate guide seeded from ${selectedDatasetId} visible tape rows. Red endpoints start from visible mask edge and stay editable.`,
    );
  }
  if (selectedDatasetId === "nadia") {
    return buildManualGuideFromPreset(
      NADIA_MANUAL_ROW_PRESET,
      imageWidth,
      imageHeight,
      "Manual coordinate guide seeded from Nadia saved rows and endpoints.",
    );
  }
  const negar2Preset = selectedDatasetId === "negar-2"
    ? NEGAR_2_MANUAL_ROW_PRESET
    : null;
  if (negar2Preset) {
    return buildManualGuideFromPreset(
      negar2Preset,
      imageWidth,
      imageHeight,
      "Manual coordinate guide seeded from Negar 2 user-confirmed rows and endpoints.",
    );
  }
  const shanePreset = selectedDatasetId === "shane"
    ? SHANE_MANUAL_ROW_PRESET
    : selectedDatasetId === "shane-2"
      ? SHANE_2_MANUAL_ROW_PRESET
      : null;
  if (shanePreset) {
    return buildManualGuideFromPreset(
      shanePreset,
      imageWidth,
      imageHeight,
      `Manual coordinate guide seeded from ${selectedDatasetId === "shane-2" ? "Shane 2" : "Shane"} saved rows and endpoints.`,
    );
  }
  if (selectedDatasetId === "shahnaz-2") {
    return buildManualGuideFromPreset(
      SHAHNAZ_2_MANUAL_ROW_PRESET,
      imageWidth,
      imageHeight,
      "Manual coordinate guide seeded from Shahnaz 2 saved rows and endpoints.",
    );
  }
  const negar4TapePreset = selectedDatasetId === "negar-4"
    ? NEGAR_4_MANUAL_TAPE_ROW_PRESET
    : null;
  if (negar4TapePreset) {
    return buildManualGuideFromPreset(
      negar4TapePreset,
      imageWidth,
      imageHeight,
      `Manual coordinate guide seeded from Negar 4 visible tape rows and user-confirmed endpoints: waist tape ${negar4TapePreset.waist.tapeCm}, trouser ${negar4TapePreset.trouserWaist.tapeCm}, hips ${negar4TapePreset.hips.tapeCm}.`,
    );
  }
  const guide: GeminiBodyGuide = {
    waist: buildManualGuideLine(
      trace.naturalWaistYNorm,
      trace.naturalWaistLeftXNorm,
      trace.naturalWaistRightXNorm,
      imageWidth,
      imageHeight,
    ),
    trouserWaist: buildManualGuideLine(
      trace.trouserWaistYNorm,
      trace.trouserWaistLeftXNorm,
      trace.trouserWaistRightXNorm,
      imageWidth,
      imageHeight,
    ),
    hips: buildManualGuideLine(
      hipsRow?.yNorm,
      hipsRow?.leftXNorm,
      hipsRow?.rightXNorm,
      imageWidth,
      imageHeight,
    ),
    notes: "Manual coordinate guide seeded from local mask rows.",
  };
  return guide.waist || guide.trouserWaist || guide.hips ? guide : null;
}

function buildManualSideGuideFromPose(
  pose: PoseResult | null,
  imageWidth: number,
  imageHeight: number,
  heightCm: number,
  frontGuide: GeminiBodyGuide | null = null,
  frontPose: PoseResult | null = null,
  frontImageWidth = 0,
  frontImageHeight = 0,
): GeminiBodyGuide | null {
  if (!pose || imageWidth <= 0 || imageHeight <= 0) return null;
  const scale = computePoseScale(pose, imageWidth, imageHeight, heightCm);
  if (!scale) return null;
  const frontScale = frontPose && frontImageWidth > 0 && frontImageHeight > 0
    ? computePoseScale(frontPose, frontImageWidth, frontImageHeight, heightCm)
    : null;
  const torsoSpan = Math.max(0.04, scale.hipYNorm - scale.shoulderYNorm);
  const legSpan = Math.max(0.08, scale.bottomYNorm - scale.hipYNorm);
  const fallbackY = {
    waist: scale.shoulderYNorm + torsoSpan * 0.58,
    trouserWaist: scale.shoulderYNorm + torsoSpan * 0.78,
    hips: scale.hipYNorm + legSpan * 0.13,
  };
  const sideYFor = (kind: "waist" | "trouserWaist" | "hips") => {
    const frontLine = kind === "waist"
      ? frontGuide?.waist
      : kind === "trouserWaist"
        ? frontGuide?.trouserWaist
        : frontGuide?.hips;
    const frontYNorm = guideLineYNormForImage(frontLine, frontImageHeight);
    if (frontYNorm != null && frontScale) {
      return mapFrontYNormToSideYNorm(frontYNorm, frontScale, scale);
    }
    return fallbackY[kind];
  };
  const guide: GeminiBodyGuide = {
    waist: buildManualGuideLineFromYNormMask({
      yNorm: sideYFor("waist"),
      pose,
      imageWidth,
      imageHeight,
      cmPerPx: scale.cmPerPx,
      centerXNorm: scale.hipCenterXNorm,
      maskMode: "raw",
      fallbackWidthNorm: 0.09,
    }),
    trouserWaist: buildManualGuideLineFromYNormMask({
      yNorm: sideYFor("trouserWaist"),
      pose,
      imageWidth,
      imageHeight,
      cmPerPx: scale.cmPerPx,
      centerXNorm: scale.hipCenterXNorm,
      maskMode: "raw",
      fallbackWidthNorm: 0.1,
    }),
    hips: buildManualGuideLineFromYNormMask({
      yNorm: sideYFor("hips"),
      pose,
      imageWidth,
      imageHeight,
      cmPerPx: scale.cmPerPx,
      centerXNorm: scale.hipCenterXNorm,
      maskMode: "raw",
      fallbackWidthNorm: 0.11,
    }),
    notes: "Manual side coordinate guide seeded from side photo mask at the active front row heights. Dataset side widths are comparison only.",
  };
  return guide.waist || guide.trouserWaist || guide.hips ? guide : null;
}

function guideLineYNormForImage(line: GeminiGuideLine | undefined, imageHeight: number): number | null {
  if (!line || imageHeight <= 0) return null;
  const yPx = typeof line.y_px === "number" && Number.isFinite(line.y_px)
    ? line.y_px
    : typeof line.y_percent === "number" && Number.isFinite(line.y_percent)
      ? (line.y_percent / 100) * imageHeight
      : null;
  if (yPx == null) return null;
  return clampManualGuideCoord(yPx / imageHeight, 0.02, 0.98);
}

function mapFrontYNormToSideYNorm(
  frontYNorm: number,
  frontScale: NonNullable<ReturnType<typeof computePoseScale>>,
  sideScale: NonNullable<ReturnType<typeof computePoseScale>>,
): number {
  const sideYNorm = frontYNorm <= frontScale.hipYNorm
    ? sideScale.shoulderYNorm +
      ((frontYNorm - frontScale.shoulderYNorm) / Math.max(0.01, frontScale.hipYNorm - frontScale.shoulderYNorm)) *
        (sideScale.hipYNorm - sideScale.shoulderYNorm)
    : sideScale.hipYNorm +
      ((frontYNorm - frontScale.hipYNorm) / Math.max(0.01, frontScale.bottomYNorm - frontScale.hipYNorm)) *
        (sideScale.bottomYNorm - sideScale.hipYNorm);
  return clampManualGuideCoord(sideYNorm, 0.02, 0.98);
}

function buildManualGuideFromTapeRowPreset(
  preset: {
    sourceImageHeight: number;
    sourceImageWidth: number;
    waist: { tapeCm: number; yPx: number };
    trouserWaist: { tapeCm: number; yPx: number };
    hips: { tapeCm: number; yPx: number };
  },
  pose: PoseResult | null,
  cmPerPx: number,
  imageWidth: number,
  imageHeight: number,
  maskMode: MeasurementMaskMode,
  notes: string,
): GeminiBodyGuide {
  return {
    waist: buildManualGuideLineFromTapeRow(preset.waist, preset, pose, cmPerPx, imageWidth, imageHeight, maskMode),
    trouserWaist: buildManualGuideLineFromTapeRow(preset.trouserWaist, preset, pose, cmPerPx, imageWidth, imageHeight, maskMode),
    hips: buildManualGuideLineFromTapeRow(preset.hips, preset, pose, cmPerPx, imageWidth, imageHeight, maskMode),
    notes,
  };
}

function buildManualGuideFromPreset(
  preset: {
    sourceImageHeight: number;
    sourceImageWidth: number;
    waist: { yPx: number; leftXPx: number; rightXPx: number };
    trouserWaist: { yPx: number; leftXPx: number; rightXPx: number };
    hips: { yPx: number; leftXPx: number; rightXPx: number };
  },
  imageWidth: number,
  imageHeight: number,
  notes: string,
): GeminiBodyGuide {
  return {
    waist: buildManualGuideLineFromPreset(preset.waist, preset, imageWidth, imageHeight),
    trouserWaist: buildManualGuideLineFromPreset(preset.trouserWaist, preset, imageWidth, imageHeight),
    hips: buildManualGuideLineFromPreset(preset.hips, preset, imageWidth, imageHeight),
    notes,
  };
}

function buildManualGuideLineFromTapeRow(
  row: { yPx: number },
  source: { sourceImageWidth: number; sourceImageHeight: number },
  pose: PoseResult | null,
  cmPerPx: number,
  imageWidth: number,
  imageHeight: number,
  maskMode: MeasurementMaskMode,
): GeminiGuideLine {
  const scaleY = imageHeight / source.sourceImageHeight;
  const yNorm = clampManualGuideCoord((row.yPx * scaleY) / imageHeight, 0.02, 0.98);
  return buildManualGuideLineFromYNormMask({
    yNorm,
    pose,
    imageWidth,
    imageHeight,
    cmPerPx,
    centerXNorm: inferPoseCenterXNorm(pose),
    maskMode,
    fallbackWidthNorm: 0.18,
  }) ?? buildManualGuideLine(yNorm, 0.4, 0.6, imageWidth, imageHeight)!;
}

function buildManualGuideLineFromYNormMask(args: {
  yNorm: number;
  pose: PoseResult | null;
  imageWidth: number;
  imageHeight: number;
  cmPerPx: number;
  centerXNorm: number;
  maskMode: MeasurementMaskMode;
  segmentMode?: "center-walk" | "widest";
  fallbackWidthNorm: number;
}): GeminiGuideLine | undefined {
  const yNorm = clampManualGuideCoord(args.yNorm, 0.02, 0.98);
  const measured = args.pose?.mask
    ? measureMaskWidthAtY(
        args.pose,
        args.imageWidth,
        args.imageHeight,
        args.cmPerPx > 0 ? args.cmPerPx : 1,
        yNorm,
        args.centerXNorm,
        3,
        manualSeedMaskOptions(args.maskMode, args.segmentMode ?? "center-walk"),
      )
    : null;
  const centerXNorm = measured
    ? (measured.leftXNorm + measured.rightXNorm) / 2
    : args.centerXNorm;
  let leftXNorm = measured?.leftXNorm ?? centerXNorm - args.fallbackWidthNorm / 2;
  let rightXNorm = measured?.rightXNorm ?? centerXNorm + args.fallbackWidthNorm / 2;
  if (leftXNorm < 0.02) {
    rightXNorm += 0.02 - leftXNorm;
    leftXNorm = 0.02;
  }
  if (rightXNorm > 0.98) {
    leftXNorm -= rightXNorm - 0.98;
    rightXNorm = 0.98;
  }
  leftXNorm = clampManualGuideCoord(leftXNorm, 0.02, 0.96);
  rightXNorm = clampManualGuideCoord(rightXNorm, 0.04, 0.98);
  return buildManualGuideLine(yNorm, leftXNorm, rightXNorm, args.imageWidth, args.imageHeight);
}

function manualSeedMaskOptions(maskMode: MeasurementMaskMode, segmentMode: "center-walk" | "widest") {
  return maskMode === "ignore-arms"
    ? { excludeLimbs: true, segmentMode, exclusionMode: "limb-capsules" as const }
    : { excludeLimbs: false, segmentMode, exclusionMode: "none" as const };
}

function inferPoseCenterXNorm(pose: PoseResult | null): number {
  const leftHip = pose?.landmarks[23];
  const rightHip = pose?.landmarks[24];
  if (leftHip && rightHip) return clampManualGuideCoord((leftHip.x + rightHip.x) / 2, 0.05, 0.95);
  return 0.5;
}

function buildVerticalTapeScaleEvidence(
  preset: {
    waist: { tapeCm: number; yPx: number };
    trouserWaist: { tapeCm: number; yPx: number };
    hips: { tapeCm: number; yPx: number };
  },
  heightCmPerPx: number | null,
  heightAudit?: MaskHeightScaleAudit | null,
): ManualScaleEvidence {
  const anchors = [
    { label: "waist tape row", tapeCm: preset.waist.tapeCm, yPx: preset.waist.yPx },
    { label: "trouser tape row", tapeCm: preset.trouserWaist.tapeCm, yPx: preset.trouserWaist.yPx },
    { label: "hip tape row", tapeCm: preset.hips.tapeCm, yPx: preset.hips.yPx },
  ];
  const first = anchors[0]!;
  const last = anchors[anchors.length - 1]!;
  const pxPerCm = (last.yPx - first.yPx) / (last.tapeCm - first.tapeCm);
  const activeCmPerPx = 1 / pxPerCm;
  return {
    source: "vertical-tape",
    activeCmPerPx,
    heightCmPerPx,
    pxPerCm,
    scaleDeltaPct: heightCmPerPx && heightCmPerPx > 0
      ? ((heightCmPerPx / activeCmPerPx) - 1) * 100
      : null,
    anchors,
    heightAudit,
  };
}

function buildManualHeightScaleEvidence(
  override: ManualHeightScaleOverride,
  heightCm: number,
  referenceHeightCmPerPx: number | null,
  heightAudit: MaskHeightScaleAudit | null | undefined,
  imageWidth: number,
  imageHeight: number,
): ManualScaleEvidence | null {
  if (heightCm <= 0 || imageWidth <= 0 || imageHeight <= 0) return null;
  const topY = clampManualGuideCoord(override.topYNorm * imageHeight, 0, imageHeight - 1);
  const bottomY = clampManualGuideCoord(override.bottomYNorm * imageHeight, topY + 1, imageHeight);
  const bodySpanPx = Math.abs(bottomY - topY);
  if (bodySpanPx <= 0) return null;
  const activeCmPerPx = heightCm / bodySpanPx;
  return {
    source: "manual-height",
    activeCmPerPx,
    heightCmPerPx: referenceHeightCmPerPx,
    pxPerCm: 1 / activeCmPerPx,
    scaleDeltaPct: referenceHeightCmPerPx && referenceHeightCmPerPx > 0
      ? ((referenceHeightCmPerPx / activeCmPerPx) - 1) * 100
      : null,
    anchors: [],
    heightAudit,
  };
}

function buildHeightScaleEvidence(
  heightCmPerPx: number | null,
  source: ManualScaleEvidence["source"] | undefined = "pose-landmarks",
  heightAudit?: MaskHeightScaleAudit | null,
): ManualScaleEvidence | null {
  if (!heightCmPerPx || heightCmPerPx <= 0) return null;
  return {
    source: source === "vertical-tape" ? "pose-landmarks" : source,
    activeCmPerPx: heightCmPerPx,
    heightCmPerPx,
    pxPerCm: 1 / heightCmPerPx,
    scaleDeltaPct: 0,
    anchors: [],
    heightAudit,
  };
}

function buildManualGuideLineFromPreset(
  preset: { yPx: number; leftXPx: number; rightXPx: number },
  source: { sourceImageWidth: number; sourceImageHeight: number },
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine {
  const scaleX = imageWidth / source.sourceImageWidth;
  const scaleY = imageHeight / source.sourceImageHeight;
  const yPx = clampManualGuideCoord(Math.round(preset.yPx * scaleY), 0, imageHeight - 1);
  const leftXPx = clampManualGuideCoord(Math.round(preset.leftXPx * scaleX), 0, imageWidth - 1);
  const rightXPx = clampManualGuideCoord(Math.round(preset.rightXPx * scaleX), 0, imageWidth - 1);
  return {
    y_px: yPx,
    left_x_px: leftXPx,
    right_x_px: rightXPx,
    confidence: 1,
    points: [
      { x_px: leftXPx, y_px: yPx },
      { x_px: rightXPx, y_px: yPx },
    ],
  };
}

function buildManualGuideLine(
  yNorm: number | undefined,
  leftXNorm: number | undefined,
  rightXNorm: number | undefined,
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine | undefined {
  if (yNorm == null || leftXNorm == null || rightXNorm == null) return undefined;
  if (!Number.isFinite(yNorm) || !Number.isFinite(leftXNorm) || !Number.isFinite(rightXNorm)) return undefined;
  const yPx = clampManualGuideCoord(yNorm * imageHeight, 0, imageHeight - 1);
  const leftXPx = clampManualGuideCoord(Math.min(leftXNorm, rightXNorm) * imageWidth, 0, imageWidth - 1);
  const rightXPx = clampManualGuideCoord(Math.max(leftXNorm, rightXNorm) * imageWidth, 0, imageWidth - 1);
  if (rightXPx <= leftXPx) return undefined;
  const points = [leftXPx, rightXPx].map((xPx) => ({
    x_px: Math.round(xPx),
    y_px: Math.round(yPx),
  }));
  return {
    y_px: Math.round(yPx),
    left_x_px: Math.round(leftXPx),
    right_x_px: Math.round(rightXPx),
    confidence: 1,
    points,
  };
}

function clampManualGuideCoord(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildMaskGuideDebugRows(trace: WaistTrace | null, hipsTrace: HipsTrace | null): MeasurementDebugRow[] {
  const rows: MeasurementDebugRow[] = [];
  if (
    trace?.naturalWaistYNorm != null &&
    trace.naturalWaistLeftXNorm != null &&
    trace.naturalWaistRightXNorm != null
  ) {
    rows.push({
      id: "mask-guide-waist",
      label: "mask natural waist",
      yNorm: trace.naturalWaistYNorm,
      leftXNorm: trace.naturalWaistLeftXNorm,
      rightXNorm: trace.naturalWaistRightXNorm,
      widthPx: trace.naturalWaistMaskWidthPx,
      widthCm: trace.naturalWaistMaskWidthCm,
      color: "#facc15",
      selected: true,
    });
  }
  if (
    trace?.trouserWaistYNorm != null &&
    trace.trouserWaistLeftXNorm != null &&
    trace.trouserWaistRightXNorm != null
  ) {
    rows.push({
      id: "mask-guide-trouser",
      label: "mask trouser waist",
      yNorm: trace.trouserWaistYNorm,
      leftXNorm: trace.trouserWaistLeftXNorm,
      rightXNorm: trace.trouserWaistRightXNorm,
      widthPx: trace.trouserWaistMaskWidthPx,
      widthCm: trace.trouserWaistMaskWidthCm,
      color: "#3b82f6",
      selected: true,
    });
  }

  const hipsRow = hipsTrace?.debugRows.find((row) => row.id === "hip-selected")
    ?? hipsTrace?.debugRows.find((row) => row.id === "hip-widest-band");
  if (hipsRow) {
    rows.push({
      ...hipsRow,
      id: "mask-guide-hips",
      label: hipsRow.id === "hip-selected" ? "mask hips landmark row" : "mask hips widest band",
      color: "#ef4444",
      dashed: false,
      selected: true,
    });
  }

  return rows;
}

function buildSideMaskGuideDebugRows(hipsTrace: HipsTrace | null): MeasurementDebugRow[] {
  if (
    hipsTrace?.sideHipYNorm == null ||
    hipsTrace.sideHipLeftXNorm == null ||
    hipsTrace.sideHipRightXNorm == null
  ) {
    return [];
  }
  return [{
    id: "side-hip-depth",
    label: "side hip depth",
    yNorm: hipsTrace.sideHipYNorm,
    leftXNorm: hipsTrace.sideHipLeftXNorm,
    rightXNorm: hipsTrace.sideHipRightXNorm,
    widthPx: hipsTrace.sideHipDepthPx,
    widthCm: hipsTrace.sideHipDepthCm,
    color: "#ef4444",
    selected: true,
  }];
}

function formatDatasetTapeMark(markCm?: number, markIn?: number): string {
  if (markCm != null && Number.isFinite(markCm)) return `${markCm} cm`;
  if (markIn != null && Number.isFinite(markIn)) return `${markIn}\"`;
  return "—";
}

function DatasetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-text-hint">{label}</div>
      <div className="mt-0.5 font-mono text-sm tabular-nums text-text-primary">{value}</div>
    </div>
  );
}

function GeminiCorrectionPanel({
  status,
  correction,
  error,
  elapsedMs,
}: {
  status: "idle" | "loading" | "ready" | "error";
  correction: GeminiMeasurementCorrection | null;
  error: string | null;
  elapsedMs: number | null;
}) {
  if (status === "idle" && !correction) return null;
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-violet-950">Gemini correction result</h3>
          <p className="mt-1 text-xs text-violet-900">
            Separate review only. This does not replace the real mask trace result.
            {elapsedMs != null ? ` Gemini ${elapsedMs} ms.` : ""}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
          {status}
        </span>
      </div>
      {status === "loading" ? (
        <p className="mt-3 text-xs text-violet-900">Waiting for Gemini correction JSON…</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 text-xs text-red-700">{error ?? "Gemini correction failed"}</p>
      ) : null}
      {correction ? (
        <div className="mt-4 grid gap-3 text-xs">
          <GeminiCorrectionRow label="Waist" row={correction.waist} />
          <GeminiCorrectionRow label="Hips" row={correction.hips} />
          {correction.notes ? (
            <div className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-[11px] text-text-secondary">
              {correction.notes}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GeminiCorrectionRow({ label, row }: { label: string; row?: GeminiMeasurementCorrectionRow }) {
  if (!row) {
    return (
      <div className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-text-secondary">
        {label}: —
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-violet-100 bg-white px-3 py-2">
      <div className="font-semibold text-violet-950">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px] text-text-primary">
        <span>raw {row.raw_cm.toFixed(1)} cm</span>
        <span>corrected {row.corrected_cm.toFixed(1)} cm</span>
        <span>delta {formatSignedNumber(row.delta_cm)} cm</span>
        <span>conf. {row.confidence.toFixed(2)}</span>
      </div>
      {row.reason ? (
        <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">{row.reason}</p>
      ) : null}
    </div>
  );
}

function formatSignedNumber(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

const POSE_LANDMARK_NAMES = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
] as const;

function buildGeminiGuideLandmarks(pose: PoseResult, imageWidth: number, imageHeight: number) {
  return pose.landmarks.map((landmark, id) => ({
    id,
    name: POSE_LANDMARK_NAMES[id] ?? `landmark_${id}`,
    x_norm: roundForPayload(landmark.x, 5),
    y_norm: roundForPayload(landmark.y, 5),
    x_px: Math.round(landmark.x * imageWidth),
    y_px: Math.round(landmark.y * imageHeight),
    z: roundForPayload(landmark.z, 5),
    visibility: roundForPayload(landmark.visibility, 3),
  }));
}

function buildGeminiCorrectionContext({
  metrics,
  originalImage,
  normalizedImage,
  pose,
  trace,
  hipsTrace,
}: {
  metrics: MetricsInput;
  originalImage: { width: number; height: number };
  normalizedImage: { width: number; height: number };
  pose: PoseResult;
  trace: WaistTrace;
  hipsTrace: HipsTrace;
}) {
  return {
    metrics: {
      height_cm: metrics.heightCm,
      weight_kg: metrics.weightKg,
      gender: metrics.gender,
      bmi: hipsTrace.bmi,
    },
    images: {
      original_px: { width: originalImage.width, height: originalImage.height },
      normalized_px: { width: normalizedImage.width, height: normalizedImage.height },
    },
    segmentation_mask: {
      width: pose.maskWidth,
      height: pose.maskHeight,
      source: pose.maskSource ?? "mediapipe",
      labels: pose.maskLabels ?? null,
    },
    measurements_cm: {
      natural_waist: {
        circumference: trace.finalNaturalWaistCm,
        front_width: trace.naturalWaistMaskWidthCm,
        depth: trace.naturalWaistDepthCm,
        depth_ratio: trace.naturalWaistDepthRatio,
        y_norm: trace.naturalWaistYNorm,
        left_x_norm: trace.naturalWaistLeftXNorm,
        right_x_norm: trace.naturalWaistRightXNorm,
      },
      trouser_waist: {
        circumference: trace.finalTrouserWaistCm,
        front_width: trace.trouserWaistMaskWidthCm,
        breadth: trace.trouserWaistBreadthCm,
        depth: trace.trouserWaistDepthCm,
        depth_ratio: trace.depthRatio,
        y_norm: trace.trouserWaistYNorm,
        left_x_norm: trace.trouserWaistLeftXNorm,
        right_x_norm: trace.trouserWaistRightXNorm,
      },
      hips: {
        circumference: hipsTrace.hipsCm,
        front_width: hipsTrace.hipMaskWidthCm,
        breadth: hipsTrace.hipBreadthCm,
        depth: hipsTrace.hipDepthCm,
        method: hipsTrace.method,
      },
    },
    landmarks: buildGeminiGuideLandmarks(pose, normalizedImage.width, normalizedImage.height),
  };
}

function roundForPayload(value: number, digits: number): number {
  const multiplier = Math.pow(10, digits);
  return Math.round(value * multiplier) / multiplier;
}

function normalizeGeminiGuideTimings(value: unknown, inputDebug: GuideInputImageDebug): GeminiGuideTimingDebug {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const geminiRoundTripMs = typeof record.geminiRoundTripMs === "number"
    ? record.geminiRoundTripMs
    : typeof record.geminiRequestMs === "number"
      ? record.geminiRequestMs
      : undefined;
  return {
    browserPrepMs: inputDebug.prepMs,
    apiTotalMs: typeof record.apiTotalMs === "number" ? record.apiTotalMs : undefined,
    serverPrepareMs: typeof record.serverPrepareMs === "number" ? record.serverPrepareMs : undefined,
    geminiRoundTripMs,
    geminiRequestMs: typeof record.geminiRequestMs === "number" ? record.geminiRequestMs : geminiRoundTripMs,
    redDetectMs: typeof record.redDetectMs === "number" ? record.redDetectMs : undefined,
  };
}

function extractGeminiGuideCandidates(value: unknown): GeminiGuideCandidateDebug | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    redPixel: record.redPixel && typeof record.redPixel === "object" ? record.redPixel as GeminiBodyGuide : null,
    geminiJson: record.geminiJson && typeof record.geminiJson === "object" ? record.geminiJson as GeminiBodyGuide : null,
  };
}

function mergeGuideInputDebug(
  browserDebug: GuideInputImageDebug,
  serverValue: unknown,
): GuideInputImageDebug {
  const server = serverValue && typeof serverValue === "object" ? serverValue as Record<string, unknown> : {};
  return {
    ...browserDebug,
    geminiPayloadKb: typeof server.sentKb === "number" ? server.sentKb : undefined,
    sentWidth: typeof server.sentWidth === "number" ? server.sentWidth : browserDebug.sentWidth,
    sentHeight: typeof server.sentHeight === "number" ? server.sentHeight : browserDebug.sentHeight,
    coordinateScaleX: typeof server.coordinateScaleX === "number" ? server.coordinateScaleX : browserDebug.coordinateScaleX,
    coordinateScaleY: typeof server.coordinateScaleY === "number" ? server.coordinateScaleY : browserDebug.coordinateScaleY,
  };
}

async function requestGeminiGuideRun(args: {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  model: GeminiGuideModelCode;
  prompt: string;
  useDefaultPrompt: boolean;
  metrics: MetricsInput;
  pose: PoseResult;
  errorPrefix: string;
  guideMode?: "front" | "side";
  datasetSetId?: string;
}): Promise<GeminiGuideRunResult> {
  const guideInputImage = await imageUrlToCompressedDataUrl(
    args.imageUrl,
    args.imageWidth,
    args.imageHeight,
  );
  const response = await fetch("/api/try-on-test/sizing-lab/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageDataUrl: guideInputImage.dataUrl,
      model: args.model,
      prompt: args.useDefaultPrompt ? undefined : args.prompt,
      guideMode: args.guideMode ?? "front",
      datasetSetId: args.datasetSetId,
      imageWidth: args.imageWidth,
      imageHeight: args.imageHeight,
      inputImageWidth: guideInputImage.debug.sentWidth,
      inputImageHeight: guideInputImage.debug.sentHeight,
      metrics: {
        heightCm: args.metrics.heightCm,
        weightKg: args.metrics.weightKg,
        gender: args.metrics.gender,
      },
      landmarks: buildGeminiGuideLandmarks(args.pose, args.imageWidth, args.imageHeight),
    }),
  });
  const data = await response.json().catch(() => ({ ok: false, error: `${args.errorPrefix} route returned ${response.status}` }));
  const responseDebug: GeminiGuideResponseDebug = {
    rawText: typeof data.rawText === "string" ? data.rawText : "",
    returnedText: Boolean(data.returnedText),
    returnedImage: Boolean(data.returnedImage),
    guideSource: typeof data.guideSource === "string" ? data.guideSource : response.ok ? "unknown" : "failed",
    inputImage: mergeGuideInputDebug(guideInputImage.debug, data.inputImage),
    outputImage: data.outputImage && typeof data.outputImage === "object"
      ? data.outputImage as GuideOutputImageDebug
      : null,
    timings: normalizeGeminiGuideTimings(data.timings, guideInputImage.debug),
    guideCandidates: extractGeminiGuideCandidates(data.guideCandidates),
  };
  const result: GeminiGuideRunResult = {
    ok: Boolean(response.ok && data.ok && data.guide),
    guide: data.guide ? data.guide as GeminiBodyGuide : null,
    geminiMs: typeof data.geminiMs === "number" ? data.geminiMs : null,
    gridImageDataUrl: typeof data.gridImageDataUrl === "string" ? data.gridImageDataUrl : null,
    guideImageDataUrl: typeof data.guideImageDataUrl === "string" ? data.guideImageDataUrl : null,
    promptDebug: {
      source: typeof data.promptSource === "string" ? data.promptSource : "unknown",
      version: typeof data.promptVersion === "string" ? data.promptVersion : "unknown",
      preview: typeof data.promptPreview === "string" ? data.promptPreview : "",
    },
    responseDebug,
  };
  if (!result.ok) {
    const rawText = responseDebug.rawText.trim();
    const rawHint = rawText
      ? ` Raw: ${rawText.slice(0, 360)}`
      : data.error === "Gemini did not return usable coordinate JSON."
        ? " Raw: empty/non-text response."
        : "";
    result.error = `${data.error || `${args.errorPrefix} route returned ${response.status}`}${rawHint}`;
  }
  return result;
}

function BackendDatasetResults({
  trace,
  status,
  actualWaistCm,
  actualHipsCm,
  unit,
  onUnitChange,
}: {
  trace: SdkBackendTrace | null;
  status: "idle" | "loading" | "ready" | "error";
  actualWaistCm?: number;
  actualHipsCm?: number;
  unit: "cm" | "in";
  onUnitChange: (unit: "cm" | "in") => void;
}) {
  const estimates = trace?.recommend?.estimates ?? {};
  const waistCm = numericEstimate(estimates.waist);
  const hipsCm = numericEstimate(estimates.hips);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">Backend dataset result</h3>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
          {(["cm", "in"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onUnitChange(value)}
              className={`rounded-md px-2 py-1 font-semibold ${unit === value ? "bg-white text-brand-blue shadow-sm" : "text-text-secondary"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      {!trace ? (
        <p className="text-sm text-text-secondary">
          {status === "loading" ? "Calling backend sizing..." : "Run SDK/backend formulas to compare backend waist and hips."}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MeasurementResult label="Backend waist" valueCm={waistCm} unit={unit} accent="blue" />
            <MeasurementResult label="Backend hips" valueCm={hipsCm} unit={unit} accent="pink" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <CompareStat label="Dataset waist" valueCm={actualWaistCm} unit={unit} />
            <CompareStat label="Waist diff" valueCm={diffCm(waistCm, actualWaistCm)} unit={unit} signed />
            <CompareStat label="Dataset hips" valueCm={actualHipsCm} unit={unit} />
            <CompareStat label="Hips diff" valueCm={diffCm(hipsCm, actualHipsCm)} unit={unit} signed />
            <DatasetStat label="Recommended size" value={trace.recommend?.recommendedSize ?? "n/a"} />
            <DatasetStat label="Estimate unit" value={trace.recommend?.estimatesUnit ?? "cm"} />
          </div>
          <p className="text-xs text-text-secondary">
            These numbers are returned by backend /api/v1/sizing/recommend from the SDK-style request, not from lab mask rows.
          </p>
        </div>
      )}
    </div>
  );
}

function MeasurementResult({
  label,
  valueCm,
  unit,
  accent,
}: {
  label: string;
  valueCm: number | null;
  unit: "cm" | "in";
  accent: "blue" | "pink";
}) {
  const color = accent === "pink" ? "text-pink-600" : "text-brand-blue";
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-text-hint">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>
        {formatMeasurement(valueCm, unit)}
      </div>
      <div className="font-mono text-xs text-text-secondary">
        {valueCm == null ? "backend did not return" : unit === "cm" ? `${(valueCm / 2.54).toFixed(1)} in` : `${valueCm.toFixed(1)} cm`}
      </div>
    </div>
  );
}

function CompareStat({
  label,
  valueCm,
  unit,
  signed = false,
}: {
  label: string;
  valueCm: number | null | undefined;
  unit: "cm" | "in";
  signed?: boolean;
}) {
  const value = valueCm == null
    ? "n/a"
    : formatMeasurement(valueCm, unit, signed);
  return <DatasetStat label={label} value={value} />;
}

function formatMeasurement(valueCm: number | null | undefined, unit: "cm" | "in", signed = false): string {
  if (valueCm == null) return "n/a";
  const value = unit === "cm" ? valueCm : valueCm / 2.54;
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(1)} ${unit}`;
}

function numericEstimate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function diffCm(predicted: number | null, actual: number | undefined): number | null {
  return predicted != null && actual != null ? predicted - actual : null;
}

const GEMINI_GUIDE_INPUT_MAX_LONG_EDGE = 4096;
const GEMINI_GUIDE_INPUT_JPEG_QUALITY = 0.86;

async function imageUrlToDataUrl(url: string | null): Promise<string> {
  if (!url) throw new Error("Missing image URL");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load image (${response.status})`);
  return blobToDataUrl(await response.blob());
}

async function imageUrlToCompressedDataUrl(
  url: string | null,
  expectedWidth: number,
  expectedHeight: number,
): Promise<{ dataUrl: string; debug: GuideInputImageDebug }> {
  const startedAt = nowMs();
  if (!url) throw new Error("Missing image URL for Gemini guide");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load image for Gemini guide (${response.status})`);
  const blob = await response.blob();
  const originalDataUrl = await blobToDataUrl(blob);
  try {
    const image = await createImageBitmap(blob);
    const originalWidth = image.width;
    const originalHeight = image.height;
    const longEdge = Math.max(originalWidth, originalHeight);
    const resizeScale = longEdge > GEMINI_GUIDE_INPUT_MAX_LONG_EDGE
      ? GEMINI_GUIDE_INPUT_MAX_LONG_EDGE / longEdge
      : 1;
    const sentWidth = Math.max(1, Math.round(originalWidth * resizeScale));
    const sentHeight = Math.max(1, Math.round(originalHeight * resizeScale));
    const canvas = document.createElement("canvas");
    canvas.width = sentWidth;
    canvas.height = sentHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas compression unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, sentWidth, sentHeight);
    image.close();
    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", GEMINI_GUIDE_INPUT_JPEG_QUALITY);
    });
    if (!compressedBlob) throw new Error("Canvas JPEG compression failed");
    const compressedDataUrl = await blobToDataUrl(compressedBlob);
    return {
      dataUrl: compressedDataUrl,
      debug: {
        originalKb: Math.round(blob.size / 102.4) / 10,
        compressedKb: Math.round(compressedBlob.size / 102.4) / 10,
        width: originalWidth,
        height: originalHeight,
        sentWidth,
        sentHeight,
        dimensionsPreserved:
          sentWidth === originalWidth &&
          sentHeight === originalHeight &&
          (!expectedWidth || originalWidth === expectedWidth) &&
          (!expectedHeight || originalHeight === expectedHeight),
        coordinateScaleX: originalWidth / sentWidth,
        coordinateScaleY: originalHeight / sentHeight,
        prepMs: Math.round(nowMs() - startedAt),
      },
    };
  } catch {
    return {
      dataUrl: originalDataUrl,
      debug: {
        originalKb: Math.round(blob.size / 102.4) / 10,
        compressedKb: Math.round(blob.size / 102.4) / 10,
        width: expectedWidth,
        height: expectedHeight,
        sentWidth: expectedWidth,
        sentHeight: expectedHeight,
        dimensionsPreserved: true,
        coordinateScaleX: 1,
        coordinateScaleY: 1,
        prepMs: Math.round(nowMs() - startedAt),
      },
    };
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Could not convert image to base64"));
    };
    reader.onerror = () => reject(new Error("Could not read image for Gemini guide"));
    reader.readAsDataURL(blob);
  });
}
