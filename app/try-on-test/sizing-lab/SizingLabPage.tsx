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
import { computeHips, type HipsTrace } from "./lib/hipsFormula";
import { detectSegmenterMeasurementMask, removeBackgroundWithSegmenter } from "./lib/imageSegmenter";
import { detectPoseAndMask } from "./lib/poseDetector";
import { calibrateGeminiMaskMeasurements } from "./lib/geminiMaskCalibration";
import { DEFAULT_SIZING_LAB_GEMINI_PROMPT } from "./lib/geminiNormalizePrompt";
import {
  computeGeminiGuideMeasurement,
  DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT,
  SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION,
  type GeminiBodyGuide,
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
import type { MeasurementDebugRow, MeasurementMaskMode, MetricsInput, PoseResult, WaistTrace } from "./types";

interface DatasetRow {
  setId: string;
  label: string;
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  age: number;
  chestCm: number;
  waistCm: number;
  waistTarget?: "natural" | "trouser";
  trouserWaistCm?: number;
  hipsCm: number;
  pelvisCm: number;
  underChestCm: number;
  cup?: string | null;
  bra: { band: number; cup: string } | null;
  frontImageUrl: string;
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

type AnalysisPath = "raw" | "landmark" | "mask-guide" | "segmenter" | "backend-sdk" | "gemini" | "gemini-calibrated" | "gemini-guide";
type PoseSource = "original-raw" | "original-segmenter" | "gemini" | "gemini-calibrated" | "gemini-guide";
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
];

export function SizingLabPage() {
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
  const [geminiGuidePromptDebug, setGeminiGuidePromptDebug] = useState<{
    source: string;
    version: string;
    preview: string;
  } | null>(null);
  const [geminiGuideResponseDebug, setGeminiGuideResponseDebug] = useState<{
    rawText: string;
    returnedText: boolean;
    returnedImage: boolean;
	    guideSource: string;
	    inputImage?: GuideInputImageDebug;
	    timings?: GeminiGuideTimingDebug;
	    guideCandidates?: GeminiGuideCandidateDebug;
	  } | null>(null);
  const [geminiCorrectionStatus, setGeminiCorrectionStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [geminiCorrectionError, setGeminiCorrectionError] = useState<string | null>(null);
  const [geminiCorrectionMs, setGeminiCorrectionMs] = useState<number | null>(null);
  const [geminiCorrection, setGeminiCorrection] = useState<GeminiMeasurementCorrection | null>(null);
  const [backendSdkStatus, setBackendSdkStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [backendSdkError, setBackendSdkError] = useState<string | null>(null);
  const [backendSdkTrace, setBackendSdkTrace] = useState<SdkBackendTrace | null>(null);
  const [backendResultUnit, setBackendResultUnit] = useState<"cm" | "in">("cm");
  const geminiCorrectionKeyRef = useRef("");
  const [analysisTotalMs, setAnalysisTotalMs] = useState<number | null>(null);
  const [runningStartedAt, setRunningStartedAt] = useState<number | null>(null);
  const [runningElapsedMs, setRunningElapsedMs] = useState<number>(0);

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
  const selectedDatasetNaturalWaistCm = selectedDataset && selectedDataset.waistTarget !== "trouser" && selectedDataset.waistCm > 0
    ? selectedDataset.waistCm
    : undefined;
  const selectedDatasetTrouserWaistCm = selectedDataset?.trouserWaistCm && selectedDataset.trouserWaistCm > 0
    ? selectedDataset.trouserWaistCm
    : selectedDataset?.waistTarget === "trouser" && selectedDataset.waistCm > 0
      ? selectedDataset.waistCm
      : undefined;
  const usesBackendSdk = analysisPath === "backend-sdk";
  const activeUseSidePhoto = useSidePhoto && !usesBackendSdk;
  const usesGeminiCalibration = analysisPath === "gemini-calibrated";
  const usesGeminiGuide = analysisPath === "gemini-guide";
  const usesMaskGuide = analysisPath === "mask-guide";
  const usesGemini = analysisPath === "gemini" || usesGeminiCalibration;
  const usesSegmenter = analysisPath === "segmenter";
  const selectedPoseSource: PoseSource = usesGeminiCalibration
    ? "gemini-calibrated"
    : usesGeminiGuide
    ? "gemini-guide"
    : usesGemini
    ? "gemini"
    : usesSegmenter
      ? "original-segmenter"
      : "original-raw";
  const maskMode: MeasurementMaskMode = analysisPath === "landmark" || usesMaskGuide || usesSegmenter || usesGeminiGuide ? "ignore-arms" : "raw";
  const poseMatchesPath = poseSource === selectedPoseSource;
  const displayPose = poseMatchesPath && pose.pose
    ? usesBackendSdk
      ? { ...pose.pose, mask: null, maskWidth: 0, maskHeight: 0 }
      : pose.pose
    : null;
  const activeImageState = usesGemini && normalizedImage.state.previewUrl ? normalizedImage.state : image.state;
  const selectedPathLabel = ANALYSIS_PATHS.find((path) => path.value === analysisPath)?.label ?? "Selected path";
  const selectedGeminiModel = GEMINI_IMAGE_MODELS.find((model) => model.value === geminiModel) ?? GEMINI_IMAGE_MODELS[0]!;
  const selectedGeminiGuideModel = GEMINI_GUIDE_MODELS.find((model) => model.value === geminiGuideModel) ?? GEMINI_GUIDE_MODELS[0]!;
  const displayedElapsedMs = runningStartedAt === null ? analysisTotalMs : runningElapsedMs;
  const activeGeminiPrompt = useDefaultGeminiPrompt
    ? DEFAULT_SIZING_LAB_GEMINI_PROMPT
    : geminiPrompt.trim() || DEFAULT_SIZING_LAB_GEMINI_PROMPT;
  const activeGeminiGuidePrompt = useDefaultGeminiGuidePrompt
    ? DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT
    : geminiGuidePrompt.trim() || DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT;
  const geminiGuideTimings = geminiGuideResponseDebug?.timings;

  const clearCalibration = () => {
    setOriginalCalibrationPose(null);
    setCalibrationStatus("idle");
    setCalibrationError(null);
    setCalibrationMs(null);
  };

  const clearGeminiGuide = () => {
    setGeminiGuide(null);
    setGeminiGuideGridImageUrl(null);
    setGeminiGuideLineImageUrl(null);
    setGeminiGuidePromptDebug(null);
    setGeminiGuideResponseDebug(null);
    setGeminiGuideStatus("idle");
    setGeminiGuideError(null);
    setGeminiGuideMs(null);
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

  useEffect(() => {
    if (runningStartedAt === null) return;
    const timer = window.setInterval(() => {
      setRunningElapsedMs(Math.round(performance.now() - runningStartedAt));
    }, 100);
    return () => window.clearInterval(timer);
  }, [runningStartedAt]);

  const selectDataset = (setId: string) => {
    setSelectedDatasetId(setId);
    const row = datasetRows.find((item) => item.setId === setId);
    if (!row) return;
    pose.reset();
    sidePose.reset();
    geminiInputImage.clear();
    normalizedImage.clear();
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
      return;
    }
    if (selectedDataset?.sideImageUrl) {
      void sideImage.selectUrl(selectedDataset.sideImageUrl);
    }
  };

  const handleAnalysisPathChange = (nextPath: AnalysisPath) => {
    const nextUsesGeminiCalibration = nextPath === "gemini-calibrated";
    const nextUsesGeminiGuide = nextPath === "gemini-guide";
    const nextUsesGemini = nextPath === "gemini" || nextUsesGeminiCalibration;
    const nextSource: PoseSource = nextUsesGeminiCalibration
      ? "gemini-calibrated"
      : nextUsesGeminiGuide
      ? "gemini-guide"
      : nextUsesGemini
      ? "gemini"
      : nextPath === "segmenter"
        ? "original-segmenter"
        : "original-raw";
    setAnalysisPath(nextPath);
    setAnalysisTotalMs(null);
    geminiInputImage.clear();
    normalizedImage.clear();
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
    clearGeminiCorrection();
    clearBackendSdkTrace();
    setRunningStartedAt(null);
    setRunningElapsedMs(0);
    if (poseSource && poseSource !== nextSource) {
      pose.reset();
      setPoseSource(null);
    }
  };

  const handleFrontSelect = async (file: File) => {
    pose.reset();
    sidePose.reset();
    geminiInputImage.clear();
    normalizedImage.clear();
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
    clearGeminiGuide();
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
    clearGeminiCorrection();
    clearBackendSdkTrace();
    setAnalysisTotalMs(null);
    setRunningStartedAt(null);
    setRunningElapsedMs(0);
  };

  const runAnalysis = async () => {
    if (!image.state.previewUrl) return;
    const totalStartedAt = performance.now();
    setGeminiError(null);
    setGeminiBgError(null);
    setSegmenterError(null);
    setSegmenterMs(null);
    setSegmenterStatus(usesSegmenter ? "loading" : "idle");
    setOriginalCalibrationPose(null);
    setCalibrationStatus(usesGeminiCalibration ? "loading" : "idle");
    setCalibrationError(null);
    setCalibrationMs(null);
    setGeminiGuide(null);
    setGeminiGuideGridImageUrl(null);
    setGeminiGuideLineImageUrl(null);
    setGeminiGuidePromptDebug(null);
    setGeminiGuideResponseDebug(null);
    setGeminiGuideStatus(usesGeminiGuide ? "loading" : "idle");
    setGeminiGuideError(null);
    setGeminiGuideMs(null);
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
          const calibrationStartedAt = performance.now();
          const calibrationPose = await detectPoseAndMask(image.state.previewUrl);
          if (!calibrationPose) {
            setCalibrationStatus("error");
            setCalibrationError("Original image calibration mask failed");
            setCalibrationMs(Math.round(performance.now() - calibrationStartedAt));
          } else {
            currentOriginalCalibrationPose = calibrationPose;
            setOriginalCalibrationPose(calibrationPose);
            setCalibrationMs(Math.round(performance.now() - calibrationStartedAt));
          }
        }
      } catch (error) {
        setGeminiBgStatus("error");
        setGeminiStatus("error");
        setCalibrationStatus(usesGeminiCalibration ? "error" : "idle");
        setGeminiError(error instanceof Error ? error.message : "Gemini normalization failed");
        setGeminiBgError(error instanceof Error ? error.message : "Background removal failed before Gemini");
        setCalibrationError(error instanceof Error ? error.message : "Gemini calibration failed");
        const elapsed = Math.round(performance.now() - totalStartedAt);
        setAnalysisTotalMs(elapsed);
        setRunningElapsedMs(elapsed);
        setRunningStartedAt(null);
        setSegmenterStatus("idle");
        return;
      }
    } else {
      geminiInputImage.clear();
      normalizedImage.clear();
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
    if (usesGeminiGuide) {
      if (!frontPoseResult) {
        setGeminiGuideStatus("error");
        setGeminiGuideError("MediaPipe landmarks failed, so the coordinate guide cannot run");
      } else {
        try {
          const guideInputImage = await imageUrlToCompressedDataUrl(
            image.state.previewUrl,
            image.state.width,
            image.state.height,
          );
          const response = await fetch("/api/try-on-test/sizing-lab/guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageDataUrl: guideInputImage.dataUrl,
              model: geminiGuideModel,
              prompt: useDefaultGeminiGuidePrompt ? undefined : activeGeminiGuidePrompt,
              imageWidth: image.state.width,
              imageHeight: image.state.height,
              inputImageWidth: guideInputImage.debug.sentWidth,
              inputImageHeight: guideInputImage.debug.sentHeight,
              metrics: {
                heightCm: metrics.heightCm,
                weightKg: metrics.weightKg,
                gender: metrics.gender,
              },
              landmarks: buildGeminiGuideLandmarks(frontPoseResult, image.state.width, image.state.height),
            }),
          });
          const data = await response.json().catch(() => ({ ok: false, error: `Gemini guide route returned ${response.status}` }));
          if (!response.ok || !data.ok || !data.guide) {
            setGeminiGuideMs(typeof data.geminiMs === "number" ? data.geminiMs : null);
            setGeminiGuideGridImageUrl(typeof data.gridImageDataUrl === "string" ? data.gridImageDataUrl : null);
            setGeminiGuideLineImageUrl(typeof data.guideImageDataUrl === "string" ? data.guideImageDataUrl : null);
            setGeminiGuidePromptDebug({
              source: typeof data.promptSource === "string" ? data.promptSource : "unknown",
              version: typeof data.promptVersion === "string" ? data.promptVersion : "unknown",
              preview: typeof data.promptPreview === "string" ? data.promptPreview : "",
            });
            setGeminiGuideResponseDebug({
              rawText: typeof data.rawText === "string" ? data.rawText : "",
              returnedText: Boolean(data.returnedText),
              returnedImage: Boolean(data.returnedImage),
	              guideSource: typeof data.guideSource === "string" ? data.guideSource : "failed",
	              inputImage: mergeGuideInputDebug(guideInputImage.debug, data.inputImage),
	              timings: normalizeGeminiGuideTimings(data.timings, guideInputImage.debug),
	              guideCandidates: extractGeminiGuideCandidates(data.guideCandidates),
	            });
            const rawText = typeof data.rawText === "string" ? data.rawText.trim() : "";
            const rawHint = rawText
              ? ` Raw: ${rawText.slice(0, 360)}`
              : data.error === "Gemini did not return usable coordinate JSON."
                ? " Raw: empty/non-text response."
                : "";
            throw new Error(`${data.error || `Gemini guide route returned ${response.status}`}${rawHint}`);
          }
          setGeminiGuideMs(typeof data.geminiMs === "number" ? data.geminiMs : null);
          setGeminiGuide(data.guide as GeminiBodyGuide);
          setGeminiGuideGridImageUrl(typeof data.gridImageDataUrl === "string" ? data.gridImageDataUrl : null);
          setGeminiGuideLineImageUrl(typeof data.guideImageDataUrl === "string" ? data.guideImageDataUrl : null);
          setGeminiGuidePromptDebug({
            source: typeof data.promptSource === "string" ? data.promptSource : "unknown",
            version: typeof data.promptVersion === "string" ? data.promptVersion : "unknown",
            preview: typeof data.promptPreview === "string" ? data.promptPreview : "",
          });
          setGeminiGuideResponseDebug({
            rawText: typeof data.rawText === "string" ? data.rawText : "",
            returnedText: Boolean(data.returnedText),
            returnedImage: Boolean(data.returnedImage),
	            guideSource: typeof data.guideSource === "string" ? data.guideSource : "unknown",
	            inputImage: mergeGuideInputDebug(guideInputImage.debug, data.inputImage),
	            timings: normalizeGeminiGuideTimings(data.timings, guideInputImage.debug),
	            guideCandidates: extractGeminiGuideCandidates(data.guideCandidates),
	          });
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
    const elapsed = Math.round(performance.now() - totalStartedAt);
    setAnalysisTotalMs(elapsed);
    setRunningElapsedMs(elapsed);
    setRunningStartedAt(null);
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
        maskMode,
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
  const geminiGuideMeasurement = computeGeminiGuideMeasurement({
    guide: usesGeminiGuide ? geminiGuide : null,
    guideSource: geminiGuideResponseDebug?.guideSource ?? null,
    pose: poseMatchesPath ? pose.pose : null,
    imageWidth: activeImageState.width,
    imageHeight: activeImageState.height,
    sidePose: activeUseSidePhoto ? sidePose.pose : null,
    sideImageWidth: activeUseSidePhoto ? sideImage.state.width : 0,
    sideImageHeight: activeUseSidePhoto ? sideImage.state.height : 0,
    maskMode,
    waistTrace: trace,
    hipsTrace,
  });
  const guideDebugRows = geminiGuideMeasurement?.debugRows ?? [];
  const maskGuideDebugRows = usesMaskGuide ? buildMaskGuideDebugRows(trace, hipsTrace) : [];
  const sideMaskGuideDebugRows = usesMaskGuide ? buildSideMaskGuideDebugRows(hipsTrace) : [];
  const displayHipDebugRows = usesGeminiGuide
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
    && pose.status !== "loading"
    && geminiStatus !== "loading"
    && geminiBgStatus !== "loading"
    && calibrationStatus !== "loading"
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
                  checked={useSidePhoto}
                  onChange={(event) => toggleSidePhoto(event.target.checked)}
                />
                Use side photo
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
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4 lg:grid-cols-9">
            <DatasetStat label="Height" value={selectedDataset.heightCm > 0 ? `${selectedDataset.heightCm} cm` : "missing"} />
            <DatasetStat label="Weight" value={`${selectedDataset.weightKg} kg`} />
            <DatasetStat label="Gender" value={selectedDataset.gender} />
            <DatasetStat label="Natural waist" value={selectedDatasetNaturalWaistCm ? `${selectedDatasetNaturalWaistCm} cm` : "—"} />
            <DatasetStat label="Lower waist" value={selectedDatasetTrouserWaistCm ? `${selectedDatasetTrouserWaistCm} cm` : "—"} />
            <DatasetStat label="Hips" value={`${selectedDataset.hipsCm} cm`} />
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
            onSelect={sideImage.selectFile}
            onClear={sideImage.clear}
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
              Select the source for landmarks, mask, and formulas. If Gemini is selected, the generated Gemini image becomes the analysis source.
            </p>
          </div>
          <select
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
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          {ANALYSIS_PATHS.map((path) => (
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
        {usesGeminiGuide ? (
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
                  default {SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION}
                </span>
                {!useDefaultGeminiGuidePrompt ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiGuidePrompt(DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT);
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
                value={useDefaultGeminiGuidePrompt ? DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT : geminiGuidePrompt}
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
              {!useDefaultGeminiGuidePrompt ? (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                  Custom prompt is active. Default prompt edits will not affect this run unless you reset or re-enable default.
                </div>
              ) : null}
            </div>
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
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            void runAnalysis();
          }}
          disabled={!canAnalyze}
          className="inline-flex items-center gap-2"
        >
          {pose.status === "loading" || geminiStatus === "loading" || geminiBgStatus === "loading" || calibrationStatus === "loading" || geminiGuideStatus === "loading" || backendSdkStatus === "loading" || segmenterStatus === "loading" || (activeUseSidePhoto && sidePose.status === "loading") ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {geminiBgStatus === "loading"
                ? "Removing background…"
                : geminiStatus === "loading"
                ? "Running Gemini…"
                : calibrationStatus === "loading"
                ? "Calibrating masks…"
                : geminiGuideStatus === "loading"
                ? "Getting guide rows…"
                : backendSdkStatus === "loading"
                ? "Calling backend sizing…"
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
            {usesGeminiGuide
              ? ` ${selectedGeminiGuideModel.label} guide total ${geminiGuideMs ?? "—"} ms · browser prep ${geminiGuideTimings?.browserPrepMs ?? "—"} ms · model API wait ${geminiGuideTimings?.geminiRoundTripMs ?? "—"} ms · server prep ${geminiGuideTimings?.serverPrepareMs ?? "—"} ms ·`
              : ""}
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
      </section>

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

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Preview</h3>
          {image.state.previewUrl ? (
            <>
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
                  />
                </div>
              )}
              {usesGeminiGuide && geminiGuideGridImageUrl ? (
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
              {usesGeminiGuide && geminiGuideLineImageUrl ? (
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
                    />
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary py-8 text-center">Upload a side image to measure depth.</p>
                )
                : null}
              </div>
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
              <GeminiGuidePanel
                measurement={geminiGuideMeasurement}
                status={geminiGuideStatus}
                error={geminiGuideError}
                elapsedMs={geminiGuideMs}
                imageUrl={image.state.previewUrl}
                imageWidth={image.state.width}
                imageHeight={image.state.height}
                responseDebug={geminiGuideResponseDebug}
              />
            </>
          ) : (
            <p className="text-sm text-text-secondary py-8 text-center">Upload an image to see the overlay.</p>
          )}
        </div>
        <div className="space-y-5">
	          {!usesBackendSdk ? (
	            <>
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
	      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LandmarkTable pose={displayPose} />
        {!usesBackendSdk ? (
          <MaskPreview
            pose={displayPose}
            trace={trace}
            maskMode={maskMode}
            debugRows={displayHipDebugRows}
            showTraceRows={!usesGeminiGuide && !usesMaskGuide}
            debugRowsLabel={usesGeminiGuide ? "Coordinate guide row width" : usesMaskGuide ? "Mask/MediaPipe guide rows" : "selected hip row"}
          />
        ) : null}
        {activeUseSidePhoto && sidePose.pose && (
          <MaskPreview
            pose={sidePose.pose}
            trace={trace}
            mode="side"
            maskMode={maskMode}
            debugRows={sideMaskGuideDebugRows}
            debugRowsLabel="side hip depth row"
          />
        )}
      </section>

      <section>
        <FormulaPanel trace={trace} backendTrace={backendSdkTrace} />
      </section>
    </main>
  );
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

const GEMINI_GUIDE_INPUT_MAX_LONG_EDGE = 1536;
const GEMINI_GUIDE_INPUT_JPEG_QUALITY = 0.68;

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
  const startedAt = performance.now();
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
        prepMs: Math.round(performance.now() - startedAt),
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
        prepMs: Math.round(performance.now() - startedAt),
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
