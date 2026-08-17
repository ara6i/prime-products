"use client";

import {
  AlertTriangle,
  BrainCircuit,
  Check,
  Database,
  ImageIcon,
  Loader2,
  Maximize2,
  Ruler,
  ScanLine,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/app/shared/lib/utils";
import { measureMaskWidthAtY } from "../sizing-lab/lib/bodyMaskGeometry";
import type { AppleFusedBodyScaleApiResult } from "../sizing-lab/lib/appleFusedBodyScale";
import { detectPoseAndMask } from "../sizing-lab/lib/poseDetector";
import type { Gender, PoseResult } from "../sizing-lab/types";
import type {
  MeshShapePredictionResponse,
  MeshShapeStatusResponse,
} from "../sizing-lab/lib/meshShapeProviders";
import { WearV6Workbench } from "./WearV6Workbench";
import type {
  WearV6AppleResult,
  WearV6Line,
  WearV6MetaStatus,
  WearV6ModelStatus,
  WearV6PoseAnchorName,
  WearV6Prediction,
  WearV6RowKind,
  WearV6WidthConfidence,
  WearV6WidthMethod,
} from "./wearV6Types";

type RunState = "idle" | "pose" | "wear-edges" | "apple" | "wear-measurements" | "ready" | "error";
type AppleState = "idle" | "loading" | "ready" | "error";

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

interface ActualMeasurements {
  neck: number | null;
  chest: number | null;
  underbust: number | null;
  waist: number | null;
  hips: number | null;
}

interface BodyMaskSupportRow {
  name: WearV6RowKind;
  threshold: number;
  maskWidth: number;
  maskHeight: number;
  maskSource: string;
  scanlines: Array<{ y: number; runs: Array<{ startX: number; endX: number }> }>;
}

interface WidthCalibration {
  widths: Partial<Record<WearV6RowKind, number>>;
  confidences: Partial<Record<WearV6RowKind, WearV6WidthConfidence>>;
}

interface ForgeStatus {
  pipelineId?: string;
  overallPercent?: number;
  currentStageLabel?: string;
  detail?: string;
  updatedAt?: string;
  state?: string;
  dataset?: {
    subjects?: number;
    targetExamples?: number;
    completedExamples?: number;
    failedExamples?: number;
  };
  stages?: Array<{
    key?: string;
    label?: string;
    explanation?: string;
    state?: string;
    percent?: number;
  }>;
}

const EMPTY_META_STATUS: WearV6MetaStatus = {
  state: "idle",
  available: false,
  detail: "Meta 3D comparison has not run yet.",
  elapsedMs: null,
  cameraIntrinsicsSource: null,
};

const EMPTY_ACTUALS: ActualMeasurements = {
  neck: null,
  chest: null,
  underbust: null,
  waist: null,
  hips: null,
};

const APPLE_POSE_JOINTS: Record<WearV6PoseAnchorName, string> = {
  leftShoulder: "human_left_shoulder_3D",
  rightShoulder: "human_right_shoulder_3D",
  leftHip: "human_left_hip_3D",
  rightHip: "human_right_hip_3D",
};

function finitePositive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function datasetImage(row: DatasetRow) {
  return row.alternateFrontImageUrl || row.frontImageUrl;
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
  if (!response.ok) throw new Error("Could not read the selected photo.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("Could not encode the selected photo."));
    reader.onerror = () => reject(new Error("Could not encode the selected photo."));
    reader.readAsDataURL(blob);
  });
}

function posePersonBox(pose: PoseResult) {
  const points = pose.landmarks.filter((point) => point.visibility >= 0.35);
  if (points.length < 12) return undefined;
  const left = Math.min(...points.map((point) => point.x));
  const right = Math.max(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const bottom = Math.max(...points.map((point) => point.y));
  const height = bottom - top;
  const width = right - left;
  return {
    left: clamp(left - width * 0.06),
    right: clamp(right + width * 0.06),
    top: clamp(top - height * 0.13),
    bottom: clamp(bottom + height * 0.035),
  };
}

function applePoseAnchors(result: WearV6AppleResult, width: number, height: number) {
  const joints = new Map(result.joints.map((joint) => [joint.name, joint]));
  return Object.fromEntries((Object.entries(APPLE_POSE_JOINTS) as Array<[WearV6PoseAnchorName, string]>).map(([name, jointName]) => {
    const joint = joints.get(jointName);
    if (!joint || !Number.isFinite(joint.xPx) || !Number.isFinite(joint.yPx)) {
      throw new Error(`Apple Vision did not return ${jointName}.`);
    }
    return [name, {
      x: clamp(joint.xPx / width),
      y: clamp(joint.yPx / height),
    }];
  })) as Record<WearV6PoseAnchorName, { x: number; y: number }>;
}

function requireCompleteStandingPose(pose: PoseResult) {
  const point = (index: number) => {
    const value = pose.landmarks[index];
    return value && value.visibility >= 0.35 ? value : null;
  };
  const head = [point(0), point(7), point(8)].filter(Boolean);
  const leftFoot = [point(27), point(29), point(31)].filter(Boolean);
  const rightFoot = [point(28), point(30), point(32)].filter(Boolean);
  const shouldersAndHips = [point(11), point(12), point(23), point(24)];
  if (head.length < 2 || leftFoot.length < 2 || rightFoot.length < 2 || shouldersAndHips.some((value) => !value)) {
    throw new Error("Use one front-facing photo showing the complete head, torso, and both feet.");
  }
  const headY = Math.min(...head.map((value) => value!.y));
  const feetY = Math.max(
    ...leftFoot.map((value) => value!.y),
    ...rightFoot.map((value) => value!.y),
  );
  if (headY <= 0.01 || feetY >= 0.995 || feetY - headY < 0.35) {
    throw new Error("The photo is cropped. Keep the complete head and both feet inside the frame.");
  }
}

function torsoCenterX(pose: PoseResult, yNorm: number) {
  const leftShoulder = pose.landmarks[11];
  const rightShoulder = pose.landmarks[12];
  const leftHip = pose.landmarks[23];
  const rightHip = pose.landmarks[24];
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0.5;
  const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipX = (leftHip.x + rightHip.x) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const fraction = clamp((yNorm - shoulderY) / Math.max(0.01, hipY - shoulderY));
  return shoulderX + (hipX - shoulderX) * fraction;
}

function buildMaskLines(pose: PoseResult, prediction: WearV6Prediction) {
  const lines: Partial<Record<WearV6RowKind, WearV6Line>> = {};
  if (!pose.mask || pose.maskWidth < 1 || pose.maskHeight < 1) return lines;
  for (const row of prediction.rows) {
    const y = (row.photo.left.y + row.photo.right.y) / 2;
    const measured = measureMaskWidthAtY(
      pose,
      pose.maskWidth,
      pose.maskHeight,
      1,
      y,
      torsoCenterX(pose, y),
      3,
      {
        excludeLimbs: true,
        segmentMode: "center-walk",
        exclusionMode: "limb-capsules",
      },
    );
    if (!measured) continue;
    lines[row.kind] = {
      leftX: clamp(measured.leftXNorm),
      rightX: clamp(measured.rightXNorm),
      y,
    };
  }
  return lines;
}

function lineMapFromPrediction(prediction: WearV6Prediction) {
  return Object.fromEntries(prediction.rows.map((row) => [row.kind, {
    leftX: Math.min(row.photo.left.x, row.photo.right.x),
    rightX: Math.max(row.photo.left.x, row.photo.right.x),
    y: (row.photo.left.y + row.photo.right.y) / 2,
  }])) as Partial<Record<WearV6RowKind, WearV6Line>>;
}

function lineGeometryKey(lines: Partial<Record<WearV6RowKind, WearV6Line>>) {
  return Object.entries(lines)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, line]) => line
      ? `${kind}:${line.leftX.toFixed(6)}:${line.rightX.toFixed(6)}:${line.y.toFixed(6)}`
      : `${kind}:-`)
    .join("|");
}

function buildBodyMaskSupport(
  pose: PoseResult,
  imageWidth: number,
  imageHeight: number,
  lines: Partial<Record<WearV6RowKind, WearV6Line>>,
): BodyMaskSupportRow[] {
  const mask = pose.mask;
  const maskWidth = pose.maskWidth;
  const maskHeight = pose.maskHeight;
  if (!mask || maskWidth < 1 || maskHeight < 1 || imageWidth < 1 || imageHeight < 1) return [];

  const threshold = 128;
  const rowRadiusPx = clamp(Math.round(imageHeight * 0.0015), 3, 9);
  const maskValueAtSourcePixel = (x: number, y: number) => {
    const maskX = clamp(Math.floor(((x + 0.5) / imageWidth) * maskWidth), 0, maskWidth - 1);
    const maskY = clamp(Math.floor(((y + 0.5) / imageHeight) * maskHeight), 0, maskHeight - 1);
    return mask[maskY * maskWidth + maskX] ?? 0;
  };

  return Object.entries(lines).flatMap(([name, line]) => {
    if (!line) return [];
    const leftX = clamp(Math.floor(Math.min(line.leftX, line.rightX) * imageWidth), 0, imageWidth - 1);
    const rightXExclusive = clamp(Math.ceil(Math.max(line.leftX, line.rightX) * imageWidth) + 1, leftX + 1, imageWidth);
    const centerY = clamp(Math.round(line.y * imageHeight), 0, imageHeight - 1);
    const startY = clamp(centerY - rowRadiusPx, 0, imageHeight - 1);
    const endY = clamp(centerY + rowRadiusPx, 0, imageHeight - 1);
    const scanlines: BodyMaskSupportRow["scanlines"] = [];
    for (let y = startY; y <= endY; y += 1) {
      const runs: Array<{ startX: number; endX: number }> = [];
      let runStart: number | null = null;
      for (let x = leftX; x < rightXExclusive; x += 1) {
        const isBody = maskValueAtSourcePixel(x, y) >= threshold;
        if (isBody && runStart == null) runStart = x;
        if (!isBody && runStart != null) {
          if (x - runStart >= 2) runs.push({ startX: runStart, endX: x });
          runStart = null;
        }
      }
      if (runStart != null && rightXExclusive - runStart >= 2) {
        runs.push({ startX: runStart, endX: rightXExclusive });
      }
      scanlines.push({ y, runs });
    }
    return [{
      name: name as WearV6RowKind,
      threshold,
      maskWidth,
      maskHeight,
      maskSource: pose.maskSource ?? "pose",
      scanlines,
    }];
  });
}

function stageLabel(state: RunState) {
  if (state === "pose") return "Finding one standing person and Apple anchors";
  if (state === "wear-edges") return "WEAR RGB is predicting body rows and edges";
  if (state === "apple") return "Apple Vision is correcting camera scale at every row";
  if (state === "wear-measurements") return "WEAR is predicting direct tape circumferences";
  if (state === "ready") return "Photo processed";
  return "Run the complete v6 test";
}

function NumberField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}{required ? " · required" : ""}</span>
      <span className="flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-bold outline-none" min="1" onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} step="0.1" type="number" value={value ?? ""} />
        <span className="text-xs font-bold text-slate-400">cm</span>
      </span>
    </label>
  );
}

export function WearV6PhotoLab() {
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>("female");
  const [reportedChestCm, setReportedChestCm] = useState<number | null>(null);
  const [actuals, setActuals] = useState<ActualMeasurements>(EMPTY_ACTUALS);
  const [modelStatus, setModelStatus] = useState<WearV6ModelStatus | null>(null);
  const [forgeStatus, setForgeStatus] = useState<ForgeStatus | null>(null);
  const [trainingExpanded, setTrainingExpanded] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<WearV6Prediction | null>(null);
  const [maskLines, setMaskLines] = useState<Partial<Record<WearV6RowKind, WearV6Line>>>({});
  const [metaLines, setMetaLines] = useState<Partial<Record<WearV6RowKind, WearV6Line>>>({});
  const [metaStatus, setMetaStatus] = useState<WearV6MetaStatus>(EMPTY_META_STATUS);
  const [appleState, setAppleState] = useState<AppleState>("idle");
  const [appleDetail, setAppleDetail] = useState("Apple Vision has not run yet");
  const [appleResult, setAppleResult] = useState<WearV6AppleResult | null>(null);
  const [widthMethod, setWidthMethod] = useState<WearV6WidthMethod>("apple-vision");
  const [appleVisionWidths, setAppleVisionWidths] = useState<Partial<Record<WearV6RowKind, number>>>({});
  const [appleDepthWidths, setAppleDepthWidths] = useState<Partial<Record<WearV6RowKind, number>>>({});
  const [appleDepthState, setAppleDepthState] = useState<AppleState>("idle");
  const [appleDepthDetail, setAppleDepthDetail] = useState("Apple + Depth Pro has not run yet");
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadedObjectUrlRef = useRef<string | null>(null);
  const activeRunRef = useRef(0);
  const sourceDataUrlRef = useRef<string | null>(null);
  const poseRef = useRef<PoseResult | null>(null);
  const personBoxRef = useRef<ReturnType<typeof posePersonBox>>(undefined);
  const appleCacheKeyRef = useRef<string | null>(null);
  const poseAnchorsRef = useRef<Record<WearV6PoseAnchorName, { x: number; y: number }> | null>(null);
  const appleVisionWidthsRef = useRef<Partial<Record<WearV6RowKind, number>>>({});
  const appleVisionConfidencesRef = useRef<Partial<Record<WearV6RowKind, WearV6WidthConfidence>>>({});
  const appleDepthWidthsRef = useRef<Partial<Record<WearV6RowKind, number>>>({});
  const appleDepthConfidencesRef = useRef<Partial<Record<WearV6RowKind, WearV6WidthConfidence>>>({});
  const appleDepthGeometryRef = useRef("");

  const resetResult = useCallback(() => {
    activeRunRef.current += 1;
    sourceDataUrlRef.current = null;
    poseRef.current = null;
    personBoxRef.current = undefined;
    appleCacheKeyRef.current = null;
    poseAnchorsRef.current = null;
    appleVisionWidthsRef.current = {};
    appleVisionConfidencesRef.current = {};
    appleDepthWidthsRef.current = {};
    appleDepthConfidencesRef.current = {};
    appleDepthGeometryRef.current = "";
    setRunState("idle");
    setRunError(null);
    setPrediction(null);
    setMaskLines({});
    setMetaLines({});
    setMetaStatus(EMPTY_META_STATUS);
    setAppleState("idle");
    setAppleDetail("Apple Vision has not run yet");
    setAppleResult(null);
    setWidthMethod("apple-vision");
    setAppleVisionWidths({});
    setAppleDepthWidths({});
    setAppleDepthState("idle");
    setAppleDepthDetail("Apple + Depth Pro has not run yet");
  }, []);

  const applyDataset = useCallback(async (row: DatasetRow) => {
    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
      uploadedObjectUrlRef.current = null;
    }
    const source = datasetImage(row);
    setSelectedDatasetId(row.setId);
    setImageUrl(source);
    setImageSize(await imageDimensions(source));
    setHeightCm(row.heightCm);
    setWeightKg(row.weightKg);
    setGender(row.gender);
    setReportedChestCm(finitePositive(row.chestCm));
    setActuals({
      neck: null,
      chest: finitePositive(row.chestCm),
      underbust: finitePositive(row.underChestCm),
      waist: finitePositive(row.waistCm),
      hips: finitePositive(row.hipsCm),
    });
    resetResult();
  }, [resetResult]);

  const refreshStatus = useCallback(async () => {
    const [modelResponse, forgeResponse] = await Promise.all([
      fetch("/api/try-on-test/wear-photo-test/v6", { cache: "no-store" }),
      fetch("/api/try-on-test/model-forge/status", { cache: "no-store" }),
    ]);
    setModelStatus(await modelResponse.json() as WearV6ModelStatus);
    const forgePayload = await forgeResponse.json() as { status?: ForgeStatus } & ForgeStatus;
    setForgeStatus(forgePayload.status ?? forgePayload);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/try-on-test/sizing-lab/dataset", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/try-on-test/wear-photo-test/v6", { cache: "no-store" }).then((response) => response.json() as Promise<WearV6ModelStatus>),
      fetch("/api/try-on-test/model-forge/status", { cache: "no-store" }).then((response) => response.json() as Promise<{ status?: ForgeStatus } & ForgeStatus>),
    ]).then(([datasetPayload, modelPayload, forgePayload]) => {
      if (!active) return;
      setModelStatus(modelPayload);
      setForgeStatus(forgePayload.status ?? forgePayload);
      const rows = ((datasetPayload.rows ?? []) as DatasetRow[]).filter((row) => row.frontImageUrl);
      setDatasets(rows);
      const initial = rows.find((row) => row.setId === "shahnaz-2") ?? rows[0];
      if (initial) void applyDataset(initial);
    }).catch((error) => {
      if (active) setRunError(error instanceof Error ? error.message : "Could not load the v6 photo lab.");
    });
    const timer = window.setInterval(() => void refreshStatus().catch(() => undefined), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      if (uploadedObjectUrlRef.current) URL.revokeObjectURL(uploadedObjectUrlRef.current);
    };
  }, [applyDataset, refreshStatus]);

  useEffect(() => {
    if (!trainingExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setTrainingExpanded(false);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [trainingExpanded]);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setRunError("Choose a PNG, JPEG, or WebP photo.");
      return;
    }
    if (uploadedObjectUrlRef.current) URL.revokeObjectURL(uploadedObjectUrlRef.current);
    const source = URL.createObjectURL(file);
    uploadedObjectUrlRef.current = source;
    setSelectedDatasetId("upload");
    setImageUrl(source);
    setImageSize(await imageDimensions(source));
    setReportedChestCm(null);
    setActuals(EMPTY_ACTUALS);
    resetResult();
  }, [resetResult]);

  const appleSeedForPhoto = useCallback(async (sourceDataUrl: string) => {
    if (!heightCm || imageSize.width < 1 || imageSize.height < 1) {
      throw new Error("Height and photo dimensions are required for Apple pose anchors.");
    }
    const response = await fetch("/api/try-on-test/sizing-lab/apple-vision-pose3d", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageDataUrl: sourceDataUrl,
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        heightCm,
        rows: [{
          name: "waist",
          y: imageSize.height * 0.5,
          leftX: imageSize.width * 0.4,
          rightX: imageSize.width * 0.6,
        }],
      }),
    });
    const payload = await response.json() as { ok?: boolean; error?: string; result?: WearV6AppleResult };
    if (!response.ok || !payload.ok || !payload.result) {
      throw new Error(payload.error ?? "Apple Vision pose anchors failed.");
    }
    return payload.result;
  }, [heightCm, imageSize.height, imageSize.width]);

  const callV6 = useCallback(async (
    sourceDataUrl: string,
    rowWidthsCm?: Partial<Record<WearV6RowKind, number>>,
    rowWidthSources?: Partial<Record<WearV6RowKind, WearV6WidthMethod>>,
    rowWidthConfidences?: Partial<Record<WearV6RowKind, WearV6WidthConfidence>>,
  ) => {
    if (!heightCm || !weightKg) throw new Error("Height and weight are required.");
    if (!poseAnchorsRef.current) throw new Error("Apple shoulder/hip anchors are required before WEAR inference.");
    const resolvedWidthSources = rowWidthsCm
      ? rowWidthSources ?? Object.fromEntries(Object.keys(rowWidthsCm).map((key) => [key, "apple-vision"]))
      : undefined;
    const resolvedWidthConfidences = rowWidthsCm
      ? rowWidthConfidences ?? Object.fromEntries(Object.keys(rowWidthsCm).map((key) => [key, "low"]))
      : undefined;
    const response = await fetch("/api/try-on-test/wear-photo-test/v6", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageDataUrl: sourceDataUrl,
        heightCm,
        weightKg,
        gender,
        reportedChestCm,
        personBox: personBoxRef.current,
        poseAnchors: poseAnchorsRef.current,
        rowWidthsCm,
        rowWidthSources: resolvedWidthSources,
        rowWidthConfidences: resolvedWidthConfidences,
      }),
    });
    const payload = await response.json() as WearV6Prediction | { ok: false; error?: string };
    if (!response.ok || !payload.ok) throw new Error("error" in payload && payload.error ? payload.error : "WEAR v6 inference failed.");
    return payload;
  }, [gender, heightCm, reportedChestCm, weightKg]);

  const appleWidthsForLines = useCallback(async (
    lines: Partial<Record<WearV6RowKind, WearV6Line>>,
    sourceDataUrl: string,
  ) => {
    if (!heightCm) throw new Error("Height is required for Apple camera scale.");
    const rows = Object.entries(lines).flatMap(([name, line]) => line ? [{
      name: name as WearV6RowKind,
      y: line.y * imageSize.height,
      leftX: line.leftX * imageSize.width,
      rightX: line.rightX * imageSize.width,
    }] : []);
    if (rows.length < 2) throw new Error("WEAR must provide at least two valid rows before Apple correction.");
    const response = await fetch("/api/try-on-test/sizing-lab/apple-vision-pose3d", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageDataUrl: appleCacheKeyRef.current ? undefined : sourceDataUrl,
        cacheKey: appleCacheKeyRef.current,
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        heightCm,
        rows,
      }),
    });
    const payload = await response.json() as { ok?: boolean; error?: string; result?: WearV6AppleResult };
    if (!response.ok || !payload.ok || !payload.result) throw new Error(payload.error ?? "Apple Vision camera correction failed.");
    if (payload.result.geometryQuality === "reject") {
      throw new Error(`Apple rejected the camera geometry (focal mismatch ${payload.result.focalMismatchPct.toFixed(1)}%). Retake the photo straighter.`);
    }
    const widths = Object.fromEntries(payload.result.rows.flatMap((row) => (
      Number.isFinite(row.frontPlaneWidthCm) && row.frontPlaneWidthCm >= 5 && row.frontPlaneWidthCm <= 100
        ? [[row.name, row.frontPlaneWidthCm]]
        : []
    ))) as Partial<Record<WearV6RowKind, number>>;
    if (Object.keys(widths).length < 2) throw new Error("Apple did not return enough valid camera-corrected widths.");
    const confidence: WearV6WidthConfidence = payload.result.geometryQuality === "pass" ? "high" : "medium";
    const confidences = Object.fromEntries(Object.keys(widths).map((key) => [key, confidence])) as Partial<Record<WearV6RowKind, WearV6WidthConfidence>>;
    return { result: payload.result, widths, confidences };
  }, [heightCm, imageSize.height, imageSize.width]);

  const appleDepthWidthsForLines = useCallback(async (
    lines: Partial<Record<WearV6RowKind, WearV6Line>>,
    sourceDataUrl: string,
  ): Promise<WidthCalibration> => {
    if (!heightCm) throw new Error("Height is required for Apple + Depth Pro.");
    const pose = poseRef.current;
    if (!pose?.mask) throw new Error("The person mask is unavailable for safe Depth Pro body sampling.");
    const rows = Object.entries(lines).flatMap(([name, line]) => line ? [{
      name: name as WearV6RowKind,
      y: line.y * imageSize.height,
      leftX: line.leftX * imageSize.width,
      rightX: line.rightX * imageSize.width,
    }] : []);
    const bodySupport = buildBodyMaskSupport(pose, imageSize.width, imageSize.height, lines);
    if (rows.length < 2 || bodySupport.length !== rows.length) {
      throw new Error("At least two complete WEAR rows are required for Apple + Depth Pro.");
    }

    setAppleDepthState("loading");
    setAppleDepthDetail("Depth Pro is reading body-surface distance. It does not read tape numbers.");
    const requestDepthCache = (includeImage: boolean) => fetch("/api/try-on-test/sizing-lab/depth-pro-cache", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageDataUrl: includeImage ? sourceDataUrl : undefined,
        cacheKey: appleCacheKeyRef.current,
      }),
    });
    let depthResponse = await requestDepthCache(false);
    if (depthResponse.status === 409) depthResponse = await requestDepthCache(true);
    const depthPayload = await depthResponse.json() as { ok?: boolean; error?: string; result?: { cacheKey?: string; cacheHit?: boolean } };
    if (!depthResponse.ok || !depthPayload.ok || !depthPayload.result?.cacheKey) {
      throw new Error(depthPayload.error ?? "Depth Pro could not build a body-surface map.");
    }

    const fusedResponse = await fetch("/api/try-on-test/sizing-lab/apple-fused-body-scale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cacheKey: depthPayload.result.cacheKey,
        heightCm,
        rows,
        bodySupport,
      }),
    });
    const fusedPayload = await fusedResponse.json() as { ok?: boolean; error?: string; result?: AppleFusedBodyScaleApiResult };
    if (!fusedResponse.ok || !fusedPayload.ok || !fusedPayload.result) {
      throw new Error(fusedPayload.error ?? "Apple + Depth Pro body width failed.");
    }
    const validRows = fusedPayload.result.rows.filter((row) => row.valid && Number.isFinite(row.predictedWidthCm) && row.predictedWidthCm >= 5 && row.predictedWidthCm <= 100);
    const widths = Object.fromEntries(validRows.map((row) => [row.name, row.predictedWidthCm])) as Partial<Record<WearV6RowKind, number>>;
    const confidences = Object.fromEntries(validRows.map((row) => [row.name, row.confidence])) as Partial<Record<WearV6RowKind, WearV6WidthConfidence>>;
    if (Object.keys(widths).length < 2) {
      throw new Error("Apple + Depth Pro rejected too many body rows. Apple Vision remains available.");
    }
    setAppleDepthState("ready");
    setAppleDepthDetail(`Apple + Depth Pro ready · ${validRows.length}/${rows.length} valid rows · rejected rows keep Apple Vision · no tape input`);
    return { widths, confidences };
  }, [heightCm, imageSize.height, imageSize.width]);

  const runFullTest = useCallback(async () => {
    if (!imageUrl || !heightCm || !weightKg) {
      setRunError("Choose one full-body photo and enter height and weight.");
      return;
    }
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    setRunError(null);
    setPrediction(null);
      setMaskLines({});
      setAppleResult(null);
      setAppleState("idle");
      setWidthMethod("apple-vision");
      setAppleVisionWidths({});
      setAppleDepthWidths({});
      setAppleDepthState("idle");
      setAppleDepthDetail("Apple + Depth Pro has not run yet");
      appleVisionWidthsRef.current = {};
      appleVisionConfidencesRef.current = {};
      appleDepthWidthsRef.current = {};
      appleDepthConfidencesRef.current = {};
      appleDepthGeometryRef.current = "";
    try {
      const sourceDataUrl = await imageUrlToDataUrl(imageUrl);
      sourceDataUrlRef.current = sourceDataUrl;
      setRunState("pose");
      setAppleState("loading");
      setAppleDetail("Apple Vision is finding shoulder and hip anchors");
      const [pose, appleSeed] = await Promise.all([
        detectPoseAndMask(imageUrl, { includeMask: true }),
        appleSeedForPhoto(sourceDataUrl),
      ]);
      if (activeRunRef.current !== runId) return;
      if (!pose || pose.landmarks.length !== 33) throw new Error("Could not find one complete standing person.");
      requireCompleteStandingPose(pose);
      poseRef.current = pose;
      personBoxRef.current = posePersonBox(pose);
      appleCacheKeyRef.current = appleSeed.cacheKey;
      poseAnchorsRef.current = applePoseAnchors(appleSeed, imageSize.width, imageSize.height);
      setAppleResult(appleSeed);
      setAppleState("ready");
      setAppleDetail(`Apple shoulder/hip anchors ready · ${appleSeed.cacheHit ? "cache reused" : `${appleSeed.elapsedMs} ms`}`);

      setRunState("wear-edges");
      const edgePrediction = await callV6(sourceDataUrl);
      if (activeRunRef.current !== runId) return;
      setPrediction(edgePrediction);
      setMaskLines(buildMaskLines(pose, edgePrediction));

      setRunState("apple");
      setAppleState("loading");
      setAppleDetail("Apple Vision is correcting every WEAR row for camera perspective");
      const calibrated = await appleWidthsForLines(lineMapFromPrediction(edgePrediction), sourceDataUrl);
      if (activeRunRef.current !== runId) return;
      appleCacheKeyRef.current = calibrated.result.cacheKey;
      setAppleResult(calibrated.result);
      appleVisionWidthsRef.current = calibrated.widths;
      appleVisionConfidencesRef.current = calibrated.confidences;
      setAppleVisionWidths(calibrated.widths);
      setAppleState("ready");
      setAppleDetail(`Apple camera geometry ${calibrated.result.geometryQuality} · ${calibrated.result.cacheHit ? "cache reused" : `${calibrated.result.elapsedMs} ms`}`);

      setRunState("wear-measurements");
      const sources = Object.fromEntries(Object.keys(calibrated.widths).map((key) => [key, "apple-vision"])) as Partial<Record<WearV6RowKind, WearV6WidthMethod>>;
      const calibratedPrediction = await callV6(sourceDataUrl, calibrated.widths, sources, calibrated.confidences);
      if (activeRunRef.current !== runId) return;
      setPrediction(calibratedPrediction);
      setMaskLines(buildMaskLines(pose, calibratedPrediction));
      setRunState("ready");
    } catch (error) {
      if (activeRunRef.current !== runId) return;
      const message = error instanceof Error ? error.message : "The complete v6 test failed.";
      setRunError(message);
      setRunState("error");
      setAppleState("error");
      setAppleDetail(message);
    }
  }, [appleSeedForPhoto, appleWidthsForLines, callV6, heightCm, imageSize.height, imageSize.width, imageUrl, weightKg]);

  const changeWidthMethod = useCallback(async (
    nextMethod: WearV6WidthMethod,
    lines: Partial<Record<WearV6RowKind, WearV6Line>>,
  ) => {
    if (nextMethod === widthMethod) return;
    const sourceDataUrl = sourceDataUrlRef.current;
    if (!sourceDataUrl || !Object.keys(appleVisionWidthsRef.current).length) {
      throw new Error("Run the WEAR photo test before switching width methods.");
    }
    setRunError(null);
    try {
      let activeWidths = appleVisionWidthsRef.current;
      let activeConfidences = appleVisionConfidencesRef.current;
      let sources = Object.fromEntries(Object.keys(activeWidths).map((key) => [key, "apple-vision"])) as Partial<Record<WearV6RowKind, WearV6WidthMethod>>;
      if (nextMethod === "apple-depth") {
        const geometryKey = lineGeometryKey(lines);
        if (appleDepthGeometryRef.current !== geometryKey || !Object.keys(appleDepthWidthsRef.current).length) {
          const calibrated = await appleDepthWidthsForLines(lines, sourceDataUrl);
          appleDepthWidthsRef.current = calibrated.widths;
          appleDepthConfidencesRef.current = calibrated.confidences;
          appleDepthGeometryRef.current = geometryKey;
          setAppleDepthWidths(calibrated.widths);
        }
        activeWidths = { ...appleVisionWidthsRef.current, ...appleDepthWidthsRef.current };
        activeConfidences = { ...appleVisionConfidencesRef.current, ...appleDepthConfidencesRef.current };
        sources = Object.fromEntries(Object.keys(activeWidths).map((key) => [
          key,
          appleDepthWidthsRef.current[key as WearV6RowKind] != null ? "apple-depth" : "apple-vision",
        ])) as Partial<Record<WearV6RowKind, WearV6WidthMethod>>;
      }
      const updated = await callV6(sourceDataUrl, activeWidths, sources, activeConfidences);
      setPrediction((current) => current ? { ...updated, rows: current.rows } : updated);
      setWidthMethod(nextMethod);
      setAppleDetail(nextMethod === "apple-depth"
        ? "Apple + Depth Pro body-surface widths are entering WEAR. Tape numbers are excluded."
        : "Apple Vision skeleton-plane widths are entering WEAR.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Width method switch failed.";
      if (nextMethod === "apple-depth") {
        setAppleDepthState("error");
        setAppleDepthDetail(message);
      }
      throw error;
    }
  }, [appleDepthWidthsForLines, callV6, widthMethod]);

  const recalculateLines = useCallback(async (lines: Partial<Record<WearV6RowKind, WearV6Line>>) => {
    const sourceDataUrl = sourceDataUrlRef.current;
    if (!sourceDataUrl) throw new Error("Run the photo once before editing lines.");
    setAppleState("loading");
    setAppleDetail("Apple Vision is recalculating the moved line widths");
    try {
      const calibrated = await appleWidthsForLines(lines, sourceDataUrl);
      appleCacheKeyRef.current = calibrated.result.cacheKey;
      setAppleResult(calibrated.result);
      appleVisionWidthsRef.current = calibrated.widths;
      appleVisionConfidencesRef.current = calibrated.confidences;
      setAppleVisionWidths(calibrated.widths);
      let activeWidths = calibrated.widths;
      let activeConfidences = calibrated.confidences;
      let sources = Object.fromEntries(Object.keys(activeWidths).map((key) => [key, "apple-vision"])) as Partial<Record<WearV6RowKind, WearV6WidthMethod>>;
      appleDepthWidthsRef.current = {};
      appleDepthConfidencesRef.current = {};
      appleDepthGeometryRef.current = "";
      setAppleDepthWidths({});
      if (widthMethod === "apple-depth") {
        const depthCalibrated = await appleDepthWidthsForLines(lines, sourceDataUrl);
        appleDepthWidthsRef.current = depthCalibrated.widths;
        appleDepthConfidencesRef.current = depthCalibrated.confidences;
        appleDepthGeometryRef.current = lineGeometryKey(lines);
        setAppleDepthWidths(depthCalibrated.widths);
        activeWidths = { ...calibrated.widths, ...depthCalibrated.widths };
        activeConfidences = { ...calibrated.confidences, ...depthCalibrated.confidences };
        sources = Object.fromEntries(Object.keys(activeWidths).map((key) => [
          key,
          depthCalibrated.widths[key as WearV6RowKind] != null ? "apple-depth" : "apple-vision",
        ])) as Partial<Record<WearV6RowKind, WearV6WidthMethod>>;
      }
      const updated = await callV6(sourceDataUrl, activeWidths, sources, activeConfidences);
      setPrediction((current) => current ? { ...updated, rows: current.rows } : updated);
      setAppleState("ready");
      setAppleDetail(`Moved lines recalculated · ${widthMethod === "apple-depth" ? "Apple + Depth Pro" : "Apple Vision"} active`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Line recalculation failed.";
      setAppleState("error");
      setAppleDetail(message);
      throw error;
    }
  }, [appleDepthWidthsForLines, appleWidthsForLines, callV6, widthMethod]);

  const runMetaEdges = useCallback(async (lines: Partial<Record<WearV6RowKind, WearV6Line>>) => {
    const sourceDataUrl = sourceDataUrlRef.current;
    if (!sourceDataUrl || !imageUrl || !heightCm || imageSize.width < 1 || imageSize.height < 1) {
      throw new Error("Run the WEAR photo test before the Meta comparison.");
    }
    setMetaStatus({
      state: "loading",
      available: true,
      detail: "Meta is building an independent 3D body mesh on this Mac.",
      elapsedMs: null,
      cameraIntrinsicsSource: null,
    });
    try {
      const statusResponse = await fetch("/api/try-on-test/sizing-lab/shape-models/status", { cache: "no-store" });
      const providerPayload = await statusResponse.json() as MeshShapeStatusResponse & { error?: string };
      const metaProvider = providerPayload.providers?.find((provider) => provider.id === "sam-3d-body");
      if (!statusResponse.ok || !providerPayload.ok || !metaProvider?.available) {
        const message = metaProvider?.reason ?? providerPayload.error ?? "Meta SAM 3D Body is not ready on this Mac.";
        setMetaStatus({ ...EMPTY_META_STATUS, state: "unavailable", detail: message });
        throw new Error(message);
      }
      const edgeRows = Object.entries(lines).flatMap(([kind, line]) => line ? [{
        kind: kind as WearV6RowKind,
        yNorm: line.y,
        leftXNorm: Math.min(line.leftX, line.rightX),
        rightXNorm: Math.max(line.leftX, line.rightX),
        centerXNorm: (line.leftX + line.rightX) / 2,
      }] : []);
      if (edgeRows.length < 2) throw new Error("At least two WEAR rows are needed for the Meta comparison.");
      const box = personBoxRef.current;
      const cameraIntrinsics = appleResult && appleResult.geometryQuality !== "reject"
        ? {
            focalXPx: appleResult.estimatedFocalXPx,
            focalYPx: appleResult.estimatedFocalYPx,
            principalPointXPx: appleResult.principalPointXPx,
            principalPointYPx: appleResult.principalPointYPx,
          }
        : null;
      const response = await fetch("/api/try-on-test/sizing-lab/shape-models/predict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "photo-edges",
          provider: "sam-3d-body",
          imageDataUrl: sourceDataUrl,
          imageWidth: imageSize.width,
          imageHeight: imageSize.height,
          heightCm,
          cameraIntrinsics,
          sourceImageKey: imageUrl,
          geometryKey: JSON.stringify({ imageUrl, heightCm, apple: appleResult?.cacheKey ?? null, edgeRows }),
          edgeRows,
          personBoxPx: box ? [
            box.left * imageSize.width,
            box.top * imageSize.height,
            box.right * imageSize.width,
            box.bottom * imageSize.height,
          ] : undefined,
        }),
      });
      const payload = await response.json() as MeshShapePredictionResponse & { error?: string };
      if (!response.ok || !payload.ok || !payload.projectedEdgeRows?.length) {
        throw new Error(payload.error || "Meta did not return usable 3D body edges.");
      }
      const projected = Object.fromEntries(payload.projectedEdgeRows.map((row) => [row.kind, {
        leftX: row.leftXNorm,
        rightX: row.rightXNorm,
        y: row.yNorm,
      }])) as Partial<Record<WearV6RowKind, WearV6Line>>;
      setMetaLines(projected);
      setMetaStatus({
        state: "ready",
        available: true,
        detail: payload.warning ?? "Meta projected closed 3D body slices at the WEAR row heights.",
        elapsedMs: payload.elapsedMs,
        cameraIntrinsicsSource: payload.cameraIntrinsicsSource ?? "meta-default",
      });
      return projected;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Meta 3D edge comparison failed.";
      setMetaStatus((current) => current.state === "unavailable"
        ? current
        : { ...current, state: "error", detail: message });
      throw error;
    }
  }, [appleResult, heightCm, imageSize.height, imageSize.width, imageUrl]);

  const selectedDataset = datasets.find((row) => row.setId === selectedDatasetId);
  const running = ["pose", "wear-edges", "apple", "wear-measurements"].includes(runState);
  const forgeCandidateVisible = Boolean(
    forgeStatus?.pipelineId?.includes("v6r5")
    && forgeStatus.state !== "complete",
  );
  const forgeCandidateBlocked = forgeStatus?.state === "blocked" || forgeStatus?.state === "failed";
  const profileReady = Boolean(heightCm && weightKg && (gender === "female" || reportedChestCm));
  const knownComparisons = useMemo(() => prediction?.measurements.flatMap((measurement) => {
    const actual = actuals[measurement.kind];
    return actual == null ? [] : [{ kind: measurement.kind, error: measurement.valueCm - actual }];
  }) ?? [], [actuals, prediction?.measurements]);
  const realPhotoMae = knownComparisons.length
    ? knownComparisons.reduce((sum, row) => sum + Math.abs(row.error), 0) / knownComparisons.length
    : null;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6" data-testid="wear-v6-photo-lab">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-200">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_420px] lg:px-9">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-200">
              <Sparkles className="size-3.5" /> Formula-free WEAR v6
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">WEAR 3D Photo Lab</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">One standing RGB photo → Apple shoulder/hip anchors → independent WEAR body rows → Apple camera-corrected widths → independent learned tape measurements. MediaPipe and Meta stay separate comparison views.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Current v6 truth</p>
              {forgeCandidateVisible
                ? <span className={`rounded-full px-2.5 py-1 text-xs font-black ${forgeCandidateBlocked ? "bg-rose-400/15 text-rose-200" : "bg-blue-400/15 text-blue-200"}`}>{forgeCandidateBlocked ? "Private v6r5 blocked" : "Private v6r5 process"}</span>
                : modelStatus?.ok
                ? <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-black text-emerald-300">Installed</span>
                : <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-300">{modelStatus?.training === false ? "Waiting for review" : "Training"}</span>}
            </div>
            <p className="mt-3 text-lg font-black">{forgeCandidateVisible ? forgeStatus?.currentStageLabel : modelStatus?.ok ? modelStatus.modelVersion : modelStatus?.trainingStageLabel ?? forgeStatus?.currentStageLabel ?? "Preparing full v6 data"}</p>
            {forgeCandidateVisible && forgeStatus?.detail ? <p className="mt-2 text-xs leading-5 text-slate-300">{forgeStatus.detail}</p> : null}
            {!forgeCandidateVisible && !modelStatus?.ok && (modelStatus?.trainingDetail || forgeStatus?.detail) ? <p className="mt-2 text-xs leading-5 text-slate-300">{modelStatus?.trainingDetail ?? forgeStatus?.detail}</p> : null}
            {forgeCandidateVisible && modelStatus?.ok ? <p className="mt-2 text-[11px] font-bold text-slate-400">Private Test Lab candidate installed: {modelStatus.modelVersion}. {modelStatus.privateDiagnosticOnly ? "Official synthetic pass is false; hash-locked diagnostic inference only." : "Synthetic gate passed."} Release, publish, deploy, and SDK remain blocked.</p> : null}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${forgeCandidateBlocked ? "bg-rose-400" : "bg-blue-400"}`} style={{ width: `${forgeCandidateVisible ? forgeStatus?.overallPercent ?? 1 : modelStatus?.ok ? 100 : forgeStatus?.overallPercent ?? 1}%` }} /></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/5 p-2"><p className="font-black text-white">4,326</p><p className="text-slate-400">people</p></div>
              <div className="rounded-lg bg-white/5 p-2"><p className="font-black text-white">38,934</p><p className="text-slate-400">RGB views</p></div>
              <div className="rounded-lg bg-white/5 p-2"><p className="font-black text-white">0</p><p className="text-slate-400">formulas</p></div>
            </div>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100 hover:bg-blue-400/20" onClick={() => setTrainingExpanded(true)} type="button"><Maximize2 className="size-3.5" /> Full-screen process</button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">1 · Photo</p><h2 className="mt-1 text-xl font-black">Choose a complete standing person</h2></div>
            <ImageIcon className="size-6 text-blue-700" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <select className="min-w-56 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold" onChange={(event) => { const row = datasets.find((item) => item.setId === event.target.value); if (row) void applyDataset(row); }} value={selectedDatasetId === "upload" ? "" : selectedDatasetId}>
              <option value="">Choose saved photo</option>
              {datasets.map((row) => <option key={row.setId} value={row.setId}>{row.label}</option>)}
            </select>
            <input accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); }} ref={uploadRef} type="file" />
            <button className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800" onClick={() => uploadRef.current?.click()} type="button"><Upload className="size-4" /> Upload</button>
          </div>
          {imageUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              {/* Local uploads and data URLs require a normal image element. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={selectedDataset?.label ?? "Uploaded standing person"} className="max-h-[520px] w-full object-contain" src={imageUrl} />
              <div className="flex justify-between gap-3 border-t border-white/10 px-3 py-2 text-xs font-bold text-slate-300"><span>{selectedDataset?.label ?? "Uploaded photo"}</span><span>{imageSize.width.toLocaleString()} × {imageSize.height.toLocaleString()} px</span></div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">2 · Inputs</p><h2 className="mt-1 text-xl font-black">Customer profile and private checks</h2></div>
            <Ruler className="size-6 text-blue-700" />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Tape answers are never sent to v6. They appear only after prediction to show the error.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="Height" onChange={(value) => { setHeightCm(value); resetResult(); }} required value={heightCm} />
            <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Weight · required</span><span className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-blue-500"><input className="min-w-0 flex-1 py-2.5 text-sm font-bold outline-none" min="25" onChange={(event) => { setWeightKg(event.target.value ? Number(event.target.value) : null); resetResult(); }} step="0.1" type="number" value={weightKg ?? ""} /><span className="text-xs font-bold text-slate-400">kg</span></span></label>
          </div>
          <div className="mt-3 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["female", "male"] as const).map((value) => <button className={cn("rounded-lg px-3 py-2 text-sm font-black capitalize", gender === value ? "bg-blue-700 text-white" : "text-slate-500")} key={value} onClick={() => { setGender(value); resetResult(); }} type="button">{value}</button>)}
          </div>
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3">
            <NumberField
              label={gender === "male" ? "Customer chest" : "Customer bust / chest"}
              onChange={(value) => { setReportedChestCm(value); resetResult(); }}
              required={gender === "male"}
              value={reportedChestCm}
            />
            <p className="mt-2 text-[11px] leading-4 text-blue-800">{gender === "male" ? "Required by the product profile." : "Optional for women."} It is shown in the contract but never used as a saved WEAR training answer.</p>
          </div>
          <p className="mt-4 text-sm font-black text-slate-900">Private tape checks · answer-free validation only</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumberField label={gender === "female" ? "Tape bust / chest" : "Tape chest"} onChange={(value) => setActuals((current) => ({ ...current, chest: value }))} value={actuals.chest} />
            {gender === "female" ? <NumberField label="Under-bust" onChange={(value) => setActuals((current) => ({ ...current, underbust: value }))} value={actuals.underbust} /> : null}
            <NumberField label="Natural waist" onChange={(value) => setActuals((current) => ({ ...current, waist: value }))} value={actuals.waist} />
            <NumberField label="Hips" onChange={(value) => setActuals((current) => ({ ...current, hips: value }))} value={actuals.hips} />
          </div>
          <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none" disabled={!modelStatus?.ok || !imageUrl || !profileReady || running} onClick={() => void runFullTest()} type="button">
            {running ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
            {stageLabel(runState)}
          </button>
          {!modelStatus?.ok ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">The full v6 artifact is still training. This button unlocks automatically after the audited model is installed.</p> : null}
          {runError ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-800"><AlertTriangle className="mr-1 inline size-3.5" />{runError}</p> : null}
        </div>
      </section>

      {prediction && imageUrl && runState === "ready" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><Check className="size-5 text-emerald-700" /><p className="mt-2 text-sm font-black text-emerald-950">WEAR RGB rows</p><p className="mt-1 text-xs text-emerald-700">{prediction.rows.length} lines from RGB</p></div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><ScanLine className="size-5 text-blue-700" /><p className="mt-2 text-sm font-black text-blue-950">Apple correction</p><p className="mt-1 text-xs text-blue-700">{appleResult?.geometryQuality ?? "waiting"}</p></div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><Database className="size-5 text-violet-700" /><p className="mt-2 text-sm font-black text-violet-950">Direct WEAR outputs</p><p className="mt-1 text-xs text-violet-700">{prediction.measurements.length} calibrated values</p></div>
            <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4"><ScanLine className="size-5 text-fuchsia-700" /><p className="mt-2 text-sm font-black text-fuchsia-950">Meta comparison</p><p className="mt-1 text-xs text-fuchsia-700">{metaStatus.state === "ready" ? `${Object.keys(metaLines).length} projected 3D edges` : "Run only when wanted"}</p></div>
            <div className={cn("rounded-2xl border p-4", realPhotoMae == null ? "border-slate-200 bg-slate-50" : realPhotoMae <= 3 ? "border-emerald-200 bg-emerald-50" : realPhotoMae <= 5 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50")}><Ruler className="size-5" /><p className="mt-2 text-sm font-black">Real-photo MAE</p><p className="mt-1 text-xs">{realPhotoMae == null ? "Add tape checks" : `${realPhotoMae.toFixed(1)} cm across ${knownComparisons.length}`}</p></div>
          </section>
          <WearV6Workbench
            actuals={actuals}
            appleDepthDetail={appleDepthDetail}
            appleDepthState={appleDepthState}
            appleDepthWidths={appleDepthWidths}
            appleDetail={appleDetail}
            appleState={appleState}
            appleVisionWidths={appleVisionWidths}
            imageSize={imageSize}
            imageUrl={imageUrl}
            key={`${imageUrl}:${prediction.model.version}`}
            maskLines={maskLines}
            metaLines={metaLines}
            metaStatus={metaStatus}
            onClearPrediction={resetResult}
            onRecalculate={recalculateLines}
            onRunMeta={runMetaEdges}
            onWidthMethodChange={changeWidthMethod}
            prediction={prediction}
            selectedDatasetId={selectedDatasetId}
            widthMethod={widthMethod}
          />
        </>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          {running ? <Loader2 className="mx-auto size-8 animate-spin text-blue-700" /> : <ScanLine className="mx-auto size-8 text-slate-400" />}
          <h2 className="mt-3 text-xl font-black text-slate-900">{stageLabel(runState)}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">The editor will show WEAR RGB lines, separate mask and Meta comparisons, hidden-by-default saved red lines, live camera-corrected measurements, raw WEAR-trained depth, 32-point body shapes, and no ellipse controls.</p>
        </section>
      )}

      {trainingExpanded ? (
        <div className="fixed inset-0 z-[110] flex flex-col bg-slate-950 text-white" data-testid="wear-v6-training-fullscreen">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">WEAR v6 · live Virginia process</p>
              <h2 className="mt-1 text-xl font-black">{forgeStatus?.currentStageLabel ?? modelStatus?.trainingStageLabel ?? "Preparing full WEAR v6"}</h2>
              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">{forgeStatus?.detail ?? modelStatus?.trainingDetail ?? "Waiting for the next verified cloud checkpoint."}</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold" onClick={() => setTrainingExpanded(false)} type="button"><X className="size-4" /> Close</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3 text-sm font-black"><span>Whole pipeline</span><span>{(forgeStatus?.overallPercent ?? modelStatus?.trainingPercent ?? 0).toFixed(1)}%</span></div>
                  <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${forgeStatus?.overallPercent ?? modelStatus?.trainingPercent ?? 0}%` }} /></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-2xl font-black">{(forgeStatus?.dataset?.subjects ?? 4_326).toLocaleString()}</p><p className="text-xs text-slate-400">standing people</p></div>
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-2xl font-black">{(forgeStatus?.dataset?.targetExamples ?? 38_934).toLocaleString()}</p><p className="text-xs text-slate-400">target RGB views</p></div>
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-2xl font-black">{(forgeStatus?.dataset?.completedExamples ?? 0).toLocaleString()}</p><p className="text-xs text-slate-400">completed views</p></div>
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-2xl font-black text-amber-300">{(forgeStatus?.dataset?.failedExamples ?? 0).toLocaleString()}</p><p className="text-xs text-slate-400">rejected / failed</p></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-200">Hard truth</p>
                  <p className="mt-3 text-sm font-black">Private Test Lab candidate</p>
                  <p className="mt-2 text-xs leading-5 text-blue-100">{modelStatus?.privateDiagnosticOnly ? "Training and the 4,326-person audit finished. One under-bust synthetic row tied its baseline by 0.00012, so official pass remains false. This exact hash-locked model may run Shane, Shahnaz, and Negar only for private diagnosis." : "The candidate must pass the full label audit, unseen WEAR tests, then answer-free Shane, Shahnaz, and Negar photos. It stays private even if every gate passes."}</p>
                  <p className="mt-3 text-[11px] font-black uppercase tracking-[0.12em] text-rose-200">Never released · never published · never deployed · SDK false</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(forgeStatus?.stages ?? []).map((stage, index) => (
                  <div className={cn("rounded-2xl border p-4", stage.state === "complete" ? "border-emerald-400/30 bg-emerald-400/10" : stage.state === "running" ? "border-blue-400/40 bg-blue-400/10" : stage.state === "failed" || stage.state === "blocked" ? "border-red-400/40 bg-red-400/10" : "border-white/10 bg-white/5")} key={stage.key ?? index}>
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-black">{index + 1}. {stage.label}</p><span className="text-xs font-black">{Number(stage.percent ?? 0).toFixed(0)}%</span></div>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{stage.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm font-black text-blue-200">1. WEAR 3D teaches</p><p className="mt-2 text-xs leading-5 text-slate-300">Protocol row positions, torso-only left/right edges, raw front-to-back depth, direct tape circumference, landmarks, body segments, and 32-point closed cross-section shapes.</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm font-black text-blue-200">2. Pose-aware model learns</p><p className="mt-2 text-xs leading-5 text-slate-300">Apple shoulder/hip anchors guide separate RGB row heads. Each body-part measurement sees the mask-free RGB body-shape embedding, profile, and only its own corrected width. Runtime masks, ellipse formulas, nearest-person lookup, and saved tape answers are forbidden.</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm font-black text-blue-200">3. Test Lab compares</p><p className="mt-2 text-xs leading-5 text-slate-300">Blue WEAR RGB edges, cyan MediaPipe-mask edges, optional purple Meta 3D edges, hidden red dataset references, draggable rows, and always-visible live results.</p></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
