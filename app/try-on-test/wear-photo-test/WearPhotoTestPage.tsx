"use client";

import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleDashed,
  Database,
  Eye,
  FileImage,
  ImageIcon,
  Layers3,
  Loader2,
  Ruler,
  ScanLine,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/app/shared/lib/utils";
import { detectPoseAndMask } from "../sizing-lab/lib/poseDetector";
import type {
  MeshProjectedPhotoEdge,
  MeshShapePredictionResponse,
} from "../sizing-lab/lib/meshShapeProviders";
import type { Gender, PoseResult } from "../sizing-lab/types";
import { WearLineWorkbench } from "./WearLineWorkbench";

type RunStatus = "idle" | "masking" | "predicting" | "ready" | "error";
type MetaEdgeStatus = "idle" | "loading" | "ready" | "error";
type VisualSpace = "photo" | "canonical";

interface DatasetRow {
  setId: string;
  label: string;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  chestCm?: number;
  underChestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  frontImageUrl: string;
  alternateFrontImageUrl?: string;
}

interface ModelStatus {
  ok: boolean;
  modelVersion?: string;
  targetCount?: number;
  syntheticCandidatePassed?: boolean;
  sdkReady?: boolean;
  split?: { train: number; validation: number; test: number };
  importantLimit?: string;
  error?: string;
}

interface OverlayPoint {
  x: number;
  y: number;
}

interface PredictionRow {
  kind: string;
  label: string;
  color: string;
  edgeSource: "trained-model" | "mediapipe-torso-fallback";
  canonical: { left: OverlayPoint; right: OverlayPoint };
  photo: { left: OverlayPoint; right: OverlayPoint };
  edgeCandidates?: {
    wear: {
      source: "trained-model" | "mediapipe-torso-fallback";
      canonical: { left: OverlayPoint; right: OverlayPoint };
      photo: { left: OverlayPoint; right: OverlayPoint };
    };
    visible: {
      source: "mediapipe-torso-mask";
      canonical: { left: OverlayPoint; right: OverlayPoint };
      photo: { left: OverlayPoint; right: OverlayPoint };
    } | null;
  };
}

interface PredictionSegment {
  kind: string;
  label: string;
  color: string;
  canonical: OverlayPoint[];
  photo: OverlayPoint[];
}

interface PredictionLandmark {
  name: string;
  canonical: OverlayPoint;
  photo: OverlayPoint;
}

interface MeasurementPrediction {
  kind: string;
  label: string;
  key: string;
  valueCm: number;
  syntheticMaeCm: number | null;
  syntheticTestCount: number | null;
}

interface WearPrediction {
  ok: true;
  model: {
    version: string;
    targetCount: number;
    trainingPose: string;
    syntheticCandidatePassed: boolean;
    sdkReady: boolean;
    split: { train: number; validation: number; test: number };
    importantLimit: string;
  };
  inputContract: {
    usedByModel: string[];
    notUsedByModel: string[];
    usedAfterPrediction?: string[];
  };
  profile: { heightCm: number; weightKg: number; bmi: number; gender: Gender };
  preprocessing: {
    rawMaskSize: [number, number];
    canonicalMaskSize: [number, number];
    sourceBodyBox: { left: number; top: number; right: number; bottom: number; width: number; height: number };
    canonicalBodyBox: { left: number; top: number; right: number; bottom: number; width: number; height: number };
    removedForegroundPixels: number;
    warnings: string[];
    quality: "good" | "review" | "retake";
  };
  canonicalMaskDataUrl: string;
  measurements: MeasurementPrediction[];
  rows: PredictionRow[];
  segments: PredictionSegment[];
  landmarks: PredictionLandmark[];
  allPredictions: Array<{ key: string; value: number; unit: "cm" | "normalized" }>;
  timing: { inferenceMs: number; totalMs: number };
}

interface ActualMeasurements {
  chest: number | null;
  underbust: number | null;
  waist: number | null;
  hips: number | null;
}

const EMPTY_ACTUALS: ActualMeasurements = {
  chest: null,
  underbust: null,
  waist: null,
  hips: null,
};

const MAIN_MEASUREMENT_KINDS = new Set(["chest", "underbust", "waist", "hips"]);
const KNOWN_CROPPED_DATASET_IDS = new Set(["tanaz"]);

function validAnswer(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function datasetTestImage(row: DatasetRow) {
  return row.alternateFrontImageUrl || row.frontImageUrl;
}

function maskDataUrl(pose: PoseResult): string | null {
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
  const maximumSide = 512;
  const scale = Math.min(1, maximumSide / Math.max(pose.maskWidth, pose.maskHeight));
  const width = Math.max(1, Math.round(pose.maskWidth * scale));
  const height = Math.max(1, Math.round(pose.maskHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const imageData = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(pose.maskHeight - 1, Math.floor(((y + 0.5) / height) * pose.maskHeight));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(pose.maskWidth - 1, Math.floor(((x + 0.5) / width) * pose.maskWidth));
      const value = (pose.mask[sourceY * pose.maskWidth + sourceX] ?? 0) >= 128 ? 255 : 0;
      const target = (y * width + x) * 4;
      imageData.data[target] = value;
      imageData.data[target + 1] = value;
      imageData.data[target + 2] = value;
      imageData.data[target + 3] = 255;
    }
  }
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function imageDimensions(source: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Could not load this photo."));
    image.src = source;
  });
}

async function imageUrlToDataUrl(source: string): Promise<string> {
  if (source.startsWith("data:image/")) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error("Could not open the photo for Meta 3D Body.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("Could not encode the photo for Meta 3D Body."));
    reader.onerror = () => reject(new Error("Could not encode the photo for Meta 3D Body."));
    reader.readAsDataURL(blob);
  });
}

function errorStyle(errorCm: number | null) {
  if (errorCm === null) return {
    badge: "border-gray-200 bg-gray-50 text-gray-600",
    panel: "border-gray-200 bg-white",
    label: "No tape answer",
  };
  const absolute = Math.abs(errorCm);
  if (absolute <= 3) return {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    panel: "border-emerald-200 bg-emerald-50/40",
    label: `${errorCm >= 0 ? "+" : ""}${errorCm.toFixed(1)} cm`,
  };
  if (absolute <= 5) return {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    panel: "border-amber-200 bg-amber-50/40",
    label: `${errorCm >= 0 ? "+" : ""}${errorCm.toFixed(1)} cm`,
  };
  return {
    badge: "border-red-200 bg-red-50 text-red-700",
    panel: "border-red-200 bg-red-50/40",
    label: `${errorCm >= 0 ? "+" : ""}${errorCm.toFixed(1)} cm`,
  };
}

function humanTargetLabel(key: string) {
  return key
    .replace(/^measurements_mm\./, "")
    .replace(/^extracted_standing_mm\./, "")
    .replace(/^row\./, "row · ")
    .replace(/^segment\./, "guide · ")
    .replace(/^landmark\./, "landmark · ")
    .replace(/_mm$/, "")
    .replace(/\.y_norm$/, " position")
    .replace(/\.left_x_norm$/, " left edge")
    .replace(/\.right_x_norm$/, " right edge")
    .replace(/\.depth_ratio$/, " depth ratio")
    .replace(/\.visible_width_cm$/, " visible width")
    .replace(/\.depth_cm$/, " depth")
    .replaceAll(".", " · ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function ModelOverlay({
  rows,
  segments,
  landmarks,
  space,
}: {
  rows: PredictionRow[];
  segments: PredictionSegment[];
  landmarks: PredictionLandmark[];
  space: VisualSpace;
}) {
  return (
    <svg
      aria-label="Predicted WEAR body guides"
      className="pointer-events-none absolute inset-0 size-full"
      preserveAspectRatio="none"
      viewBox="0 0 1000 1000"
    >
      {landmarks.map((landmark) => {
        const point = landmark[space];
        return (
          <circle
            aria-label={landmark.name}
            cx={point.x * 1000}
            cy={point.y * 1000}
            fill="#22d3ee"
            key={landmark.name}
            r="5"
            stroke="rgba(15,23,42,0.9)"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {segments.map((segment) => {
        const points = segment[space];
        return (
          <g key={segment.kind}>
            <polyline
              fill="none"
              points={points.map((point) => `${point.x * 1000},${point.y * 1000}`).join(" ")}
              stroke="rgba(15,23,42,0.75)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="10"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              fill="none"
              points={points.map((point) => `${point.x * 1000},${point.y * 1000}`).join(" ")}
              stroke={segment.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
              vectorEffect="non-scaling-stroke"
            />
            {points.map((point, index) => (
              <circle
                key={`${segment.kind}-${index}`}
                cx={point.x * 1000}
                cy={point.y * 1000}
                fill={segment.color}
                r="7"
                stroke="white"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        );
      })}
      {rows.map((row) => {
        const line = row[space];
        const labelWidth = Math.max(92, row.label.length * 10 + 28);
        const labelX = clampOverlay(line.left.x * 1000, 8, 1000 - labelWidth - 8);
        const labelY = clampOverlay(line.left.y * 1000 - 35, 8, 955);
        return (
          <g key={row.kind}>
            <line
              x1={line.left.x * 1000}
              x2={line.right.x * 1000}
              y1={line.left.y * 1000}
              y2={line.right.y * 1000}
              stroke="rgba(15,23,42,0.75)"
              strokeLinecap="round"
              strokeWidth="11"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={line.left.x * 1000}
              x2={line.right.x * 1000}
              y1={line.left.y * 1000}
              y2={line.right.y * 1000}
              stroke={row.color}
              strokeLinecap="round"
              strokeWidth="6"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={line.left.x * 1000} cy={line.left.y * 1000} fill={row.color} r="8" stroke="white" strokeWidth="3" />
            <circle cx={line.right.x * 1000} cy={line.right.y * 1000} fill={row.color} r="8" stroke="white" strokeWidth="3" />
            <rect fill="rgba(15,23,42,0.88)" height="31" rx="9" width={labelWidth} x={labelX} y={labelY} />
            <text fill="white" fontSize="19" fontWeight="700" x={labelX + 13} y={labelY + 21}>{row.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function clampOverlay(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function VisualCard({
  title,
  detail,
  imageUrl,
  imageAlt,
  rows,
  segments,
  landmarks,
  space,
  dark = false,
  pixelated = false,
}: {
  title: string;
  detail: string;
  imageUrl: string;
  imageAlt: string;
  rows: PredictionRow[];
  segments: PredictionSegment[];
  landmarks: PredictionLandmark[];
  space: VisualSpace;
  dark?: boolean;
  pixelated?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="font-bold text-text-primary">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{detail}</p>
      </div>
      <div className={cn("relative flex min-h-80 items-center justify-center overflow-hidden", dark ? "bg-slate-950" : "bg-slate-100")}>
        {/* Uploaded/blob images are intentionally rendered with a normal img element. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={imageAlt}
          className={cn("block h-auto max-h-[720px] w-full object-contain", pixelated && "[image-rendering:pixelated]")}
          src={imageUrl}
        />
        <ModelOverlay landmarks={landmarks} rows={rows} segments={segments} space={space} />
      </div>
    </article>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  minimum,
  maximum,
  step = 0.1,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  minimum: number;
  maximum: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">{label}</span>
      <span className="flex items-center rounded-xl border border-gray-200 bg-white px-3 shadow-sm focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-blue-100">
        <input
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-semibold text-text-primary outline-none"
          max={maximum}
          min={minimum}
          onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
          step={step}
          type="number"
          value={value ?? ""}
        />
        <span className="text-xs font-medium text-text-secondary">{suffix}</span>
      </span>
    </label>
  );
}

function PipelineStep({
  number,
  label,
  detail,
  state,
}: {
  number: number;
  label: string;
  detail: string;
  state: "done" | "active" | "waiting";
}) {
  return (
    <div className={cn(
      "min-w-0 flex-1 rounded-2xl border p-4 transition-colors",
      state === "done" && "border-emerald-400/30 bg-emerald-400/10",
      state === "active" && "border-blue-400/40 bg-blue-400/15",
      state === "waiting" && "border-white/10 bg-white/[0.04]",
    )}>
      <div className="flex items-center gap-3">
        <span className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-black",
          state === "done" && "border-emerald-300 bg-emerald-400 text-emerald-950",
          state === "active" && "border-blue-300 bg-brand-blue text-white",
          state === "waiting" && "border-white/15 bg-white/5 text-slate-400",
        )}>
          {state === "done" ? <Check className="size-4" aria-hidden="true" /> : number}
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-bold", state === "waiting" ? "text-slate-400" : "text-white")}>{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function WearPhotoTestPage() {
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>("female");
  const [actuals, setActuals] = useState<ActualMeasurements>(EMPTY_ACTUALS);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [rawMaskUrl, setRawMaskUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<WearPrediction | null>(null);
  const [metaEdgeStatus, setMetaEdgeStatus] = useState<MetaEdgeStatus>("idle");
  const [metaEdgeRows, setMetaEdgeRows] = useState<MeshProjectedPhotoEdge[]>([]);
  const [metaEdgeError, setMetaEdgeError] = useState<string | null>(null);
  const [metaEdgeElapsedMs, setMetaEdgeElapsedMs] = useState<number | null>(null);
  const [outputSearch, setOutputSearch] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadedObjectUrlRef = useRef<string | null>(null);
  const activeRunRef = useRef(0);

  const resetRun = useCallback(() => {
    activeRunRef.current += 1;
    setRunStatus("idle");
    setRunError(null);
    setRawMaskUrl(null);
    setPrediction(null);
    setMetaEdgeStatus("idle");
    setMetaEdgeRows([]);
    setMetaEdgeError(null);
    setMetaEdgeElapsedMs(null);
  }, []);

  const applyDataset = useCallback(async (row: DatasetRow) => {
    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
      uploadedObjectUrlRef.current = null;
    }
    setSelectedDatasetId(row.setId);
    setHeightCm(row.heightCm);
    setWeightKg(row.weightKg);
    setGender(row.gender);
    setActuals({
      chest: validAnswer(row.chestCm),
      underbust: validAnswer(row.underChestCm),
      waist: validAnswer(row.waistCm),
      hips: validAnswer(row.hipsCm),
    });
    const testImageUrl = datasetTestImage(row);
    setImageUrl(testImageUrl);
    setImageSize(await imageDimensions(testImageUrl));
    resetRun();
  }, [resetRun]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/try-on-test/sizing-lab/dataset", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/try-on-test/wear-photo-test/predict", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([datasetResponse, statusResponse]) => {
      if (!active) return;
      const availableRows = ((datasetResponse.rows ?? []) as DatasetRow[]).filter((row) => (
        row.frontImageUrl && !row.frontImageUrl.startsWith("/api/try-on-test/model-forge")
      ));
      setDatasets(availableRows);
      setModelStatus(statusResponse as ModelStatus);
      // Shahnaz 2 has a neutral, no-tape alternate with the complete head and both feet visible.
      // Tanaz is intentionally not the default because her saved frame crops the top of her head.
      const initial = availableRows.find((row) => row.setId === "shahnaz-2") ?? availableRows[0];
      if (initial) void applyDataset(initial);
    }).catch((error) => {
      if (!active) return;
      setModelStatus({ ok: false, error: error instanceof Error ? error.message : "Could not inspect the local model." });
    });
    return () => {
      active = false;
      if (uploadedObjectUrlRef.current) URL.revokeObjectURL(uploadedObjectUrlRef.current);
    };
  }, [applyDataset]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setRunError("Please choose an image file.");
      return;
    }
    if (uploadedObjectUrlRef.current) URL.revokeObjectURL(uploadedObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    uploadedObjectUrlRef.current = objectUrl;
    setSelectedDatasetId("upload");
    setImageUrl(objectUrl);
    setImageSize(await imageDimensions(objectUrl));
    setActuals(EMPTY_ACTUALS);
    resetRun();
  }, [resetRun]);

  const runModel = useCallback(async () => {
    if (!imageUrl || !heightCm || !weightKg) {
      setRunError("Choose a photo and enter height and weight first.");
      setRunStatus("error");
      return;
    }
    if (gender === "male" && validAnswer(actuals.chest) === null) {
      setRunError("Enter the required chest measurement for men first.");
      setRunStatus("error");
      return;
    }
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    setPrediction(null);
    setRawMaskUrl(null);
    setMetaEdgeStatus("idle");
    setMetaEdgeRows([]);
    setMetaEdgeError(null);
    setMetaEdgeElapsedMs(null);
    setRunError(null);
    setRunStatus("masking");
    try {
      const pose = await detectPoseAndMask(imageUrl, { includeMask: true });
      if (activeRunRef.current !== runId) return;
      if (!pose?.mask || pose.landmarks.length !== 33) {
        throw new Error("MediaPipe could not find one complete standing body in this photo.");
      }
      const encodedMask = maskDataUrl(pose);
      if (!encodedMask) throw new Error("Could not turn the MediaPipe result into a model mask.");
      setRawMaskUrl(encodedMask);
      setRunStatus("predicting");
      const response = await fetch("/api/try-on-test/wear-photo-test/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maskDataUrl: encodedMask,
          heightCm,
          weightKg,
          gender,
          landmarks: pose.landmarks,
        }),
      });
      const payload = await response.json() as WearPrediction | { ok: false; error?: string };
      if (activeRunRef.current !== runId) return;
      if (!response.ok || !payload.ok) throw new Error("error" in payload && payload.error ? payload.error : "The trained model could not process this photo.");
      setPrediction(payload);
      setRunStatus("ready");

      setMetaEdgeStatus("loading");
      try {
        const imageDataUrl = await imageUrlToDataUrl(imageUrl);
        if (activeRunRef.current !== runId) return;
        const edgeRows = payload.rows
          .filter((row) => ["neck", "chest", "underbust", "waist", "hips"].includes(row.kind))
          .map((row) => {
            const wearPhoto = row.edgeCandidates?.wear.photo ?? row.photo;
            const leftXNorm = Math.min(wearPhoto.left.x, wearPhoto.right.x);
            const rightXNorm = Math.max(wearPhoto.left.x, wearPhoto.right.x);
            return {
              kind: row.kind,
              yNorm: (wearPhoto.left.y + wearPhoto.right.y) / 2,
              leftXNorm,
              rightXNorm,
              centerXNorm: (leftXNorm + rightXNorm) / 2,
            };
          });
        if (edgeRows.length < 2) throw new Error("WEAR did not provide enough body rows for Meta edge projection.");

        const [maskWidth, maskHeight] = payload.preprocessing.rawMaskSize;
        const sourceBox = payload.preprocessing.sourceBodyBox;
        const scaleX = (imageSize.width - 1) / Math.max(1, maskWidth - 1);
        const scaleY = (imageSize.height - 1) / Math.max(1, maskHeight - 1);
        const personBoxPx: [number, number, number, number] = [
          sourceBox.left * scaleX,
          sourceBox.top * scaleY,
          sourceBox.right * scaleX,
          sourceBox.bottom * scaleY,
        ];
        const geometryKey = JSON.stringify({
          imageUrl,
          imageSize,
          heightCm,
          edgeRows,
          personBoxPx,
          source: "wear-photo-test-meta-projected-edges-v1",
        });
        const metaResponse = await fetch("/api/try-on-test/sizing-lab/shape-models/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "sam-3d-body",
            mode: "photo-edges",
            imageDataUrl,
            maskDataUrl: null,
            imageWidth: imageSize.width,
            imageHeight: imageSize.height,
            heightCm,
            cameraIntrinsics: null,
            sourceImageKey: imageUrl,
            geometryKey,
            personBoxPx,
            edgeRows,
          }),
        });
        const metaPayload = await metaResponse.json() as MeshShapePredictionResponse & { error?: string };
        if (activeRunRef.current !== runId) return;
        if (!metaResponse.ok || !metaPayload.ok || !metaPayload.projectedEdgeRows?.length) {
          throw new Error(metaPayload.error || "Meta 3D Body did not return projected body edges.");
        }
        setMetaEdgeRows(metaPayload.projectedEdgeRows);
        setMetaEdgeElapsedMs(metaPayload.elapsedMs);
        setMetaEdgeStatus("ready");
      } catch (error) {
        if (activeRunRef.current !== runId) return;
        setMetaEdgeError(error instanceof Error ? error.message : "Meta 3D Body edge projection failed.");
        setMetaEdgeStatus("error");
      }
    } catch (error) {
      if (activeRunRef.current !== runId) return;
      setRunError(error instanceof Error ? error.message : "The photo test failed.");
      setRunStatus("error");
    }
  }, [actuals.chest, gender, heightCm, imageSize, imageUrl, weightKg]);

  const comparisons = useMemo(() => {
    if (!prediction) return [];
    return prediction.measurements
      .filter((measurement) => MAIN_MEASUREMENT_KINDS.has(measurement.kind))
      .map((measurement) => {
        const actual = actuals[measurement.kind as keyof ActualMeasurements] ?? null;
        return {
          ...measurement,
          actual,
          errorCm: actual === null ? null : measurement.valueCm - actual,
        };
      });
  }, [actuals, prediction]);

  const knownComparisons = comparisons.filter((row) => row.actual !== null);
  const invalidPhoto = prediction?.preprocessing.quality === "retake";
  const realPhotoMae = !invalidPhoto && knownComparisons.length
    ? knownComparisons.reduce((sum, row) => sum + Math.abs(row.errorCm ?? 0), 0) / knownComparisons.length
    : null;
  const needsMoreTraining = !invalidPhoto && knownComparisons.some((row) => Math.abs(row.errorCm ?? 0) > 5);
  const selectedDataset = datasets.find((row) => row.setId === selectedDatasetId);
  const allRowEdgesLearned = prediction?.rows.length
    ? prediction.rows.every((row) => row.edgeSource === "trained-model")
    : false;
  const maleChestMissing = gender === "male" && validAnswer(actuals.chest) === null;

  const visibleOutputs = useMemo(() => {
    if (!prediction) return [];
    const query = outputSearch.trim().toLowerCase();
    return prediction.allPredictions.filter((output) => (
      !query || humanTargetLabel(output.key).toLowerCase().includes(query) || output.key.toLowerCase().includes(query)
    ));
  }, [outputSearch, prediction]);

  const stageState = (stage: number): "done" | "active" | "waiting" => {
    if (stage === 1) return imageUrl ? "done" : "active";
    if (stage === 2) return rawMaskUrl ? "done" : runStatus === "masking" ? "active" : "waiting";
    if (stage === 3) return prediction ? "done" : runStatus === "predicting" ? "active" : "waiting";
    if (stage === 4) return prediction ? "done" : "waiting";
    if (metaEdgeStatus === "loading") return "active";
    return runStatus === "ready" ? "done" : "waiting";
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8" data-testid="wear-photo-test-page">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-200">
        <div className="grid gap-7 px-6 py-8 sm:px-8 lg:grid-cols-[1.35fr_0.65fr] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
              <Eye className="size-3.5" aria-hidden="true" />
              Real checkpoint · visual debugger
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">WEAR 3D Sizing Lab</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Upload one standing photo and see exactly what the trained WEAR model sees, where it places every body line, and how far its answer is from saved tape measurements.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Current truth</p>
            <div className="mt-4 flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                <ShieldAlert className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold">Real-photo approval: not passed</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  The synthetic WEAR test passed. This page exposes the real-photo gap instead of hiding it.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
              <div><p className="text-lg font-black text-white">{modelStatus?.split?.train?.toLocaleString() ?? "—"}</p><p className="text-[11px] text-slate-400">trained</p></div>
              <div><p className="text-lg font-black text-white">{modelStatus?.split?.test?.toLocaleString() ?? "—"}</p><p className="text-[11px] text-slate-400">unseen tested</p></div>
              <div><p className="text-lg font-black text-white">{modelStatus?.targetCount ?? "—"}</p><p className="text-[11px] text-slate-400">outputs</p></div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.025] px-6 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
            <PipelineStep number={1} label="Photo + profile" detail="Front photo, height, weight, gender." state={stageState(1)} />
            <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-slate-600 xl:rotate-0" aria-hidden="true" />
            <PipelineStep number={2} label="MediaPipe mask" detail="Background becomes black; person becomes white." state={stageState(2)} />
            <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-slate-600 xl:rotate-0" aria-hidden="true" />
            <PipelineStep number={3} label="Clean model input" detail="Largest body shape is centered to 192 × 256." state={stageState(3)} />
            <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-slate-600 xl:rotate-0" aria-hidden="true" />
            <PipelineStep number={4} label="WEAR model" detail={`Predicts ${modelStatus?.targetCount ?? 286} measurements, rows, landmarks and guides.`} state={stageState(4)} />
            <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-slate-600 xl:rotate-0" aria-hidden="true" />
            <PipelineStep number={5} label="Visual proof" detail="Compare photo, WEAR and local Meta 3D edges." state={stageState(5)} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">1 · Choose a test photo</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Dataset or your own upload</h2>
            </div>
            <FileImage className="size-6 text-brand-blue" aria-hidden="true" />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">Saved dataset</span>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-text-primary shadow-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                onChange={(event) => {
                  const row = datasets.find((item) => item.setId === event.target.value);
                  if (row) void applyDataset(row);
                }}
                value={selectedDatasetId === "upload" ? "" : selectedDatasetId}
              >
                <option value="" disabled>Choose saved person</option>
                {datasets.map((row) => (
                  <option key={row.setId} value={row.setId}>
                    {row.label}{KNOWN_CROPPED_DATASET_IDS.has(row.setId) ? " · cropped — debug only" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="self-end">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-brand-blue transition hover:bg-blue-100 sm:w-auto"
                onClick={() => uploadRef.current?.click()}
                type="button"
              >
                <Upload className="size-4" aria-hidden="true" /> Upload photo
              </button>
              <input
                ref={uploadRef}
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = "";
                }}
                type="file"
              />
            </div>
          </div>
          {imageUrl ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Selected standing test" className="mx-auto block max-h-[560px] w-auto max-w-full object-contain" src={imageUrl} />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3 text-xs text-text-secondary">
                <span>{selectedDataset?.label ?? "Uploaded photo"}</span>
                <span>{imageSize.width.toLocaleString()} × {imageSize.height.toLocaleString()} px</span>
              </div>
            </div>
          ) : (
            <button className="mt-5 flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 text-text-secondary" onClick={() => uploadRef.current?.click()} type="button">
              <ImageIcon className="size-8" aria-hidden="true" />
              <span className="text-sm font-semibold">Upload one full-body front photo</span>
            </button>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">2 · Give model inputs</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Profile and tape answers</h2>
            </div>
            <Ruler className="size-6 text-brand-blue" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Blue fields feed the model. Tape answers are hidden from the model and used only after prediction for an honest comparison.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <NumberField label="Height" value={heightCm} onChange={(value) => { setHeightCm(value); resetRun(); }} suffix="cm" minimum={100} maximum={240} />
            <NumberField label="Weight" value={weightKg} onChange={(value) => { setWeightKg(value); resetRun(); }} suffix="kg" minimum={25} maximum={300} />
          </div>
          <div className="mt-3">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">Gender input</span>
            <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
              {(["female", "male"] as const).map((value) => (
                <button
                  className={cn("rounded-lg px-3 py-2 text-sm font-bold capitalize transition", gender === value ? "bg-brand-blue text-white shadow-sm" : "text-text-secondary hover:bg-white")}
                  key={value}
                  onClick={() => { setGender(value); resetRun(); }}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-text-primary">{gender === "male" ? "Tape answers · chest required" : "Optional real tape answers"}</p>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-600">Never sent into model</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumberField label={gender === "female" ? "Bust / chest (optional)" : "Chest (required)"} value={actuals.chest} onChange={(value) => setActuals((current) => ({ ...current, chest: value }))} suffix="cm" minimum={40} maximum={200} />
              {gender === "female" ? <NumberField label="Under-bust" value={actuals.underbust} onChange={(value) => setActuals((current) => ({ ...current, underbust: value }))} suffix="cm" minimum={40} maximum={180} /> : null}
              <NumberField label="Waist" value={actuals.waist} onChange={(value) => setActuals((current) => ({ ...current, waist: value }))} suffix="cm" minimum={40} maximum={220} />
              <NumberField label="Hips" value={actuals.hips} onChange={(value) => setActuals((current) => ({ ...current, hips: value }))} suffix="cm" minimum={40} maximum={240} />
            </div>
          </div>
          <button
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!imageUrl || !heightCm || !weightKg || maleChestMissing || runStatus === "masking" || runStatus === "predicting" || metaEdgeStatus === "loading" || modelStatus?.ok === false}
            onClick={() => void runModel()}
            type="button"
          >
            {runStatus === "masking" || runStatus === "predicting" || metaEdgeStatus === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BrainCircuit className="size-4" aria-hidden="true" />}
            {runStatus === "masking"
              ? "Finding body and background…"
              : runStatus === "predicting"
                ? "Running trained WEAR model…"
                : metaEdgeStatus === "loading"
                  ? "Projecting Meta 3D body edges…"
                  : maleChestMissing ? "Enter required men’s chest" : "Run visual model test"}
          </button>
          {runError ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{runError}</span>
            </div>
          ) : null}
          {modelStatus?.ok === false ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>Checkpoint unavailable: {modelStatus.error}</span>
            </div>
          ) : null}
        </div>
      </section>

      {prediction && rawMaskUrl && imageUrl ? (
        <>
          <section className={cn(
            "rounded-3xl border p-6 shadow-sm sm:p-8",
            invalidPhoto || needsMoreTraining ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
          )} data-testid="wear-photo-test-verdict">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="flex items-start gap-4">
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", invalidPhoto || needsMoreTraining ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                  {invalidPhoto || needsMoreTraining ? <ShieldAlert className="size-6" aria-hidden="true" /> : <Sparkles className="size-6" aria-hidden="true" />}
                </span>
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-[0.16em]", invalidPhoto || needsMoreTraining ? "text-red-700" : "text-amber-700")}>Honest real-photo result</p>
                  <h2 className={cn("mt-2 text-2xl font-black tracking-tight", invalidPhoto || needsMoreTraining ? "text-red-950" : "text-amber-950")}>
                    {invalidPhoto
                      ? "Invalid photo — use a complete head-to-feet image"
                      : knownComparisons.length === 0
                        ? "Visual inspection only — add tape answers to score it"
                        : needsMoreTraining
                          ? "This photo proves more real-photo training is needed"
                          : "Promising on this photo, but not SDK-approved"}
                  </h2>
                  <p className={cn("mt-2 max-w-3xl text-sm leading-6", invalidPhoto || needsMoreTraining ? "text-red-900" : "text-amber-900")}>
                    {invalidPhoto
                      ? "The model output is shown for debugging, but this photo is excluded from accuracy scoring. The full head, both feet and a neutral standing pose are required."
                      : realPhotoMae === null
                      ? "The rows and body guides below are real model outputs. There are no tape answers to calculate accuracy."
                      : `Across ${knownComparisons.length} available tape answers, this photo's mean absolute error is ${realPhotoMae.toFixed(1)} cm.`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-xs font-black text-slate-700">{prediction.timing.totalMs.toFixed(0)} ms total</span>
                <span className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-xs font-black text-red-700">SDK ready: no</span>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">3 · See every visual step</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Photo → mask → exact model input</h2>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-bold text-text-secondary">
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-600" /> chest</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-500" /> under-bust</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500" /> waist</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-pink-500" /> hips</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green-500" /> sleeves</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" /> inseams</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-cyan-400" /> 73 landmarks</span>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <VisualCard
                title="A · Uploaded photo + predictions"
                detail={allRowEdgesLearned
                  ? "The retrained model predicts all five body rows, arm-free torso edges and 73 WEAR landmarks."
                  : "A trained row edge was invalid, so this result used the MediaPipe torso safety fallback."}
                imageUrl={imageUrl}
                imageAlt="Original person with WEAR model guides"
                landmarks={prediction.landmarks}
                rows={prediction.rows}
                segments={prediction.segments}
                space="photo"
              />
              <VisualCard
                title="B · Raw MediaPipe mask"
                detail="White is person plus clothing. Black is background. The model never sees the room or face identity."
                imageUrl={rawMaskUrl}
                imageAlt="Raw MediaPipe body mask with model guides"
                landmarks={prediction.landmarks}
                rows={prediction.rows}
                segments={prediction.segments}
                space="photo"
                dark
                pixelated
              />
              <VisualCard
                title="C · Exact 192 × 256 model input"
                detail="Noise is removed; the connected silhouette is centered exactly like the synthetic WEAR training examples."
                imageUrl={prediction.canonicalMaskDataUrl}
                imageAlt="Canonical body mask sent to the trained model"
                landmarks={prediction.landmarks}
                rows={prediction.rows}
                segments={prediction.segments}
                space="canonical"
                dark
                pixelated
              />
            </div>
          </section>

          <WearLineWorkbench
            actuals={actuals}
            imageSize={imageSize}
            imageUrl={imageUrl}
            key={`${imageUrl}:${prediction.timing.totalMs}`}
            metaEdgeElapsedMs={metaEdgeElapsedMs}
            metaEdgeError={metaEdgeError}
            metaEdgeRows={metaEdgeRows}
            metaEdgeStatus={metaEdgeStatus}
            onClearPrediction={resetRun}
            prediction={prediction}
            selectedDatasetId={selectedDatasetId}
          />

          {prediction.preprocessing.warnings.length ? (
            <section className={cn(
              "rounded-3xl border p-6",
              invalidPhoto ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
            )}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn("mt-0.5 size-5 shrink-0", invalidPhoto ? "text-red-700" : "text-amber-700")} aria-hidden="true" />
                <div>
                  <h2 className={cn("font-black", invalidPhoto ? "text-red-950" : "text-amber-950")}>
                    {invalidPhoto ? "Photo rejected for accuracy testing" : "Photo warnings"}
                  </h2>
                  <ul className={cn("mt-2 space-y-1.5 text-sm leading-6", invalidPhoto ? "text-red-900" : "text-amber-900")}>
                    {prediction.preprocessing.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                  </ul>
                </div>
              </div>
            </section>
          ) : (
            <section className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-900">
              <Check className="size-5 text-emerald-600" aria-hidden="true" /> Photo framing and mask passed the basic input checks.
            </section>
          )}

          <section>
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">4 · Compare numbers</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">Prediction versus saved tape answer</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">The model predicted first. The saved tape answer is used only in this comparison.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {comparisons.map((row) => {
                const style = errorStyle(row.errorCm);
                return (
                  <article className={cn("rounded-2xl border p-5 shadow-sm", style.panel)} key={row.kind}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.13em] text-text-secondary">{row.label}</p>
                        <p className="mt-3 text-3xl font-black tracking-tight text-text-primary">{row.valueCm.toFixed(1)} <span className="text-sm font-bold text-text-secondary">cm</span></p>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", style.badge)}>{style.label}</span>
                    </div>
                    <div className="mt-4 border-t border-black/5 pt-3 text-xs leading-5 text-text-secondary">
                      <p>Real tape: <span className="font-bold text-text-primary">{row.actual === null ? "not available" : `${row.actual.toFixed(1)} cm`}</span></p>
                      <p>Synthetic WEAR MAE: <span className="font-bold text-text-primary">{row.syntheticMaeCm === null ? "—" : `${row.syntheticMaeCm.toFixed(1)} cm`}</span></p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">What the model used</p>
                  <h2 className="mt-2 text-xl font-black text-text-primary">Only five inputs</h2>
                </div>
                <BrainCircuit className="size-6 text-brand-blue" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-2">
                {prediction.inputContract.usedByModel.map((input) => (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-900" key={input}>
                    <Check className="size-4 text-brand-blue" aria-hidden="true" /> {input}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-gray-600">Not used for prediction</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{prediction.inputContract.notUsedByModel.join(" · ")}</p>
              </div>
            </article>

            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">More learned body data</p>
                  <h2 className="mt-2 text-xl font-black text-text-primary">Neck, shoulder, arm, armscye and thigh</h2>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-black text-gray-600">model estimates</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {prediction.measurements.filter((row) => !MAIN_MEASUREMENT_KINDS.has(row.kind)).map((row) => (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4" key={row.kind}>
                    <p className="text-xs font-bold text-text-secondary">{row.label}</p>
                    <p className="mt-2 text-xl font-black text-text-primary">{row.valueCm.toFixed(1)} <span className="text-xs font-semibold text-text-secondary">cm</span></p>
                    <p className="mt-1 text-[11px] text-text-secondary">Synthetic MAE {row.syntheticMaeCm === null ? "not summarized" : `${row.syntheticMaeCm.toFixed(1)} cm`}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <details className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-brand-blue"><Database className="size-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="font-black text-text-primary">All {prediction.model.targetCount} raw model outputs</h2>
                  <p className="mt-1 text-xs text-text-secondary">Measurements, five body rows, 73 landmarks, shoulders, sleeves and inseams.</p>
                </div>
              </div>
              <ChevronDown className="size-5 text-text-secondary transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-gray-100 px-6 py-5">
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3">
                <Search className="size-4 text-gray-400" aria-hidden="true" />
                <input className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" onChange={(event) => setOutputSearch(event.target.value)} placeholder="Search waist, sleeve, neck…" value={outputSearch} />
              </label>
              <div className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-gray-200">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.12em] text-text-secondary">
                    <tr><th className="px-4 py-3">Output</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Exact key</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleOutputs.map((output) => (
                      <tr key={output.key}>
                        <td className="px-4 py-3 font-semibold text-text-primary">{humanTargetLabel(output.key)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-brand-blue">{output.value.toFixed(output.unit === "cm" ? 2 : 4)} {output.unit === "cm" ? "cm" : ""}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-text-secondary">{output.key}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">Simple conclusion</p>
                <h2 className="mt-2 text-2xl font-black">The model works technically. Real-photo accuracy is the remaining job.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Use this tab to collect honest photo-by-photo results. We should not move the checkpoint into the customer SDK until different real people consistently stay inside the agreed error limit.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4"><p className="text-xl font-black text-emerald-300">Passed</p><p className="mt-1 text-xs text-slate-400">synthetic WEAR</p></div>
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4"><p className="text-xl font-black text-red-300">Blocked</p><p className="mt-1 text-xs text-slate-400">customer SDK</p></div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-3xl border-2 border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            {runStatus === "masking" || runStatus === "predicting" ? <Loader2 className="size-7 animate-spin" aria-hidden="true" /> : <Layers3 className="size-7" aria-hidden="true" />}
          </span>
          <h2 className="mt-4 text-xl font-black text-text-primary">Your visual proof will appear here</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">Run the test to see the original photo, raw MediaPipe mask, exact 192 × 256 model input, colored body rows, sleeve/inseam guides and tape comparison.</p>
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2 text-xs font-bold text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1.5"><ScanLine className="mr-1 inline size-3.5" /> body rows</span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5"><Ruler className="mr-1 inline size-3.5" /> measurements</span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5"><CircleDashed className="mr-1 inline size-3.5" /> mask</span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5"><BrainCircuit className="mr-1 inline size-3.5" /> trained model</span>
          </div>
        </section>
      )}
    </main>
  );
}
