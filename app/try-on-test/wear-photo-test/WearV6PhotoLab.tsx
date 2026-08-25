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
  Search,
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
import { HeldoutOnnxTrainingVisual } from "./HeldoutOnnxTrainingVisual";
import { FreshGeometryResult } from "./FreshGeometryResult";
import { FreshSealed448Lab } from "./FreshSealed448Lab";
import type {
  FreshCameraFusion,
  FreshGeometryLineOverrideMap,
  FreshGeometryPrediction,
  FreshGeometryStatus,
} from "./freshGeometryTypes";
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
type TestMode = "heldout-onnx" | "photo-pipeline" | "fresh-photo" | "fresh-448";

interface HeldoutWearModel {
  scanId: string;
  subjectId: string;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  imageUrl: string;
}

interface HeldoutWearListResponse {
  ok: boolean;
  personCount?: number;
  expectedPersonCount?: number;
  split?: "test-only";
  includedInTraining?: false;
  tapeIncluded?: false;
  models?: HeldoutWearModel[];
  error?: string;
}

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
  depthResult?: AppleFusedBodyScaleApiResult;
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

const HELDOUT_PART_LABELS: Record<WearV6RowKind, string> = {
  neck: "Neck",
  chest: "Chest",
  underbust: "Under-bust",
  waist: "Natural waist",
  hips: "Hips",
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

function lineMapFromFreshPrediction(prediction: FreshGeometryPrediction) {
  return Object.fromEntries(prediction.rows.flatMap((row) => row.line ? [[row.kind, {
    leftX: Math.min(row.line.photo.left.x, row.line.photo.right.x),
    rightX: Math.max(row.line.photo.left.x, row.line.photo.right.x),
    y: (row.line.photo.left.y + row.line.photo.right.y) / 2,
  }]] : [])) as Partial<Record<WearV6RowKind, WearV6Line>>;
}

function freshPredictionWithLineOverrides(
  prediction: FreshGeometryPrediction,
  overrides: FreshGeometryLineOverrideMap,
) {
  const rawFusionRows = new Map((prediction.cameraFusion?.rows ?? []).map((row) => [row.kind, row]));
  return {
    ...prediction,
    rows: prediction.rows.map((row) => {
      const override = overrides[row.kind];
      const rawFusionRow = rawFusionRows.get(row.kind);
      if (!override || !row.line) {
        return {
          ...row,
          widthCm: rawFusionRow?.rawWidthCm ?? row.widthCm,
          depthCm: rawFusionRow?.rawDepthCm ?? row.depthCm,
        };
      }
      const leftX = clamp(Math.min(override.leftX, override.rightX), 0.005, 0.985);
      const rightX = clamp(Math.max(override.leftX, override.rightX), leftX + 0.01, 0.995);
      const y = clamp(override.y, 0.005, 0.995);
      return {
        ...row,
        line: {
          ...row.line,
          photo: {
            left: { x: leftX, y },
            right: { x: rightX, y },
          },
        },
        widthCm: rawFusionRow?.rawWidthCm ?? row.widthCm,
        depthCm: rawFusionRow?.rawDepthCm ?? row.depthCm,
      };
    }),
  };
}

function changedFreshLineKinds(
  prediction: FreshGeometryPrediction,
  overrides: FreshGeometryLineOverrideMap,
) {
  return prediction.rows.flatMap((row) => {
    const override = overrides[row.kind];
    if (!override || !row.line) return [];
    const currentLeft = Math.min(row.line.photo.left.x, row.line.photo.right.x);
    const currentRight = Math.max(row.line.photo.left.x, row.line.photo.right.x);
    const currentY = (row.line.photo.left.y + row.line.photo.right.y) / 2;
    return Math.abs(currentLeft - override.leftX) > 0.0005
      || Math.abs(currentRight - override.rightX) > 0.0005
      || Math.abs(currentY - override.y) > 0.0005
      ? [row.kind]
      : [];
  });
}

function failedFreshCameraFusion(prediction: FreshGeometryPrediction, message: string): FreshGeometryPrediction {
  return {
    ...prediction,
    cameraFusion: {
      state: "failed",
      method: "apple-vision-depth-pro-post-onnx-v1",
      appleVision: {
        geometryQuality: null,
        focalMismatchPct: null,
        estimatedCameraPitchDeg: null,
        estimatedCameraRollDeg: null,
        estimatedCameraYawDeg: null,
      },
      depthPro: {
        modelVersion: null,
        validRows: 0,
        totalRows: prediction.rows.length,
        scaleFactor: null,
      },
      rows: prediction.rows.map((row) => ({
        kind: row.kind,
        rawWidthCm: row.widthCm,
        appleVisionWidthCm: null,
        depthProWidthCm: null,
        fusedWidthCm: row.widthCm,
        rawDepthCm: row.depthCm,
        fusedDepthCm: row.depthCm,
        learnedDepthWidthRatio: row.depthWidthRatio,
        directTapeCm: row.tapeCm,
        widthSource: "fresh-onnx",
        confidence: "low",
        widthChangePct: 0,
      })),
      rowPositionSource: "fresh-onnx",
      manuallyEditedRows: [],
      warnings: [message],
      tapeHandling: "direct-fresh-head-unchanged",
      importantLimit: "Camera fusion failed, so the displayed physical values remain raw fresh-ONNX outputs.",
    },
  };
}

function fuseFreshCameraPrediction(
  prediction: FreshGeometryPrediction,
  appleResult: WearV6AppleResult,
  appleWidths: Partial<Record<WearV6RowKind, number>>,
  appleConfidences: Partial<Record<WearV6RowKind, WearV6WidthConfidence>>,
  depthCalibration: WidthCalibration | null,
  depthError: string | null,
  rowPositionSource: FreshCameraFusion["rowPositionSource"] = "fresh-onnx",
  manuallyEditedRows: WearV6RowKind[] = [],
): FreshGeometryPrediction {
  const depthRows = new Map((depthCalibration?.depthResult?.rows ?? []).map((row) => [row.name, row]));
  const warnings = depthError ? [`Depth Pro did not complete: ${depthError}`] : [];
  if (manuallyEditedRows.length) {
    warnings.push(`Manual row override applied to: ${manuallyEditedRows.join(", ")}. These positions are user edits, not fresh-ONNX predictions.`);
  }
  const fusionRows: FreshCameraFusion["rows"] = prediction.rows.map((row) => {
    const depthRow = depthRows.get(row.kind);
    const depthWidthCm = depthRow?.valid === true && Number.isFinite(depthRow.predictedWidthCm)
      ? depthRow.predictedWidthCm
      : null;
    const appleWidthCm = Number.isFinite(appleWidths[row.kind]) ? appleWidths[row.kind]! : null;
    const rawWidthCm = typeof row.widthCm === "number" && Number.isFinite(row.widthCm) ? row.widthCm : null;
    const widthSource = depthWidthCm != null ? "apple-depth" : appleWidthCm != null ? "apple-vision" : "fresh-onnx";
    const fusedWidthCm = depthWidthCm ?? appleWidthCm ?? rawWidthCm;
    const ratio = typeof row.depthWidthRatio === "number" && Number.isFinite(row.depthWidthRatio) && row.depthWidthRatio > 0
      ? row.depthWidthRatio
      : null;
    const fusedDepthCm = fusedWidthCm != null && ratio != null
      ? fusedWidthCm * ratio
      : row.depthCm;
    const confidence = widthSource === "apple-depth"
      ? depthRow?.confidence ?? "low"
      : widthSource === "apple-vision"
        ? appleConfidences[row.kind] ?? "low"
        : "low";
    const widthChangePct = rawWidthCm != null && rawWidthCm > 0 && fusedWidthCm != null
      ? ((fusedWidthCm / rawWidthCm) - 1) * 100
      : null;
    if (widthSource === "fresh-onnx") warnings.push(`${row.label}: Apple and Depth Pro returned no valid width; raw ONNX width remains.`);
    if (widthChangePct != null && Math.abs(widthChangePct) > 20) {
      warnings.push(`${row.label}: camera fusion changed width by ${widthChangePct.toFixed(1)}%; review this row before trusting it.`);
    }
    return {
      kind: row.kind,
      rawWidthCm,
      appleVisionWidthCm: appleWidthCm,
      depthProWidthCm: depthWidthCm,
      fusedWidthCm,
      rawDepthCm: row.depthCm,
      fusedDepthCm,
      learnedDepthWidthRatio: ratio,
      directTapeCm: row.tapeCm,
      widthSource,
      confidence,
      widthChangePct,
    };
  });
  const depthRowsUsed = fusionRows.filter((row) => row.widthSource === "apple-depth").length;
  const cameraRowsUsed = fusionRows.filter((row) => row.widthSource !== "fresh-onnx").length;
  const state: FreshCameraFusion["state"] = depthRowsUsed === prediction.rows.length
    ? "applied"
    : cameraRowsUsed > 0
      ? "partial"
      : "failed";
  const fusedByKind = new Map(fusionRows.map((row) => [row.kind, row]));
  return {
    ...prediction,
    rows: prediction.rows.map((row) => {
      const fused = fusedByKind.get(row.kind)!;
      return {
        ...row,
        widthCm: fused.fusedWidthCm,
        depthCm: fused.fusedDepthCm,
      };
    }),
    cameraFusion: {
      state,
      method: "apple-vision-depth-pro-post-onnx-v1",
      appleVision: {
        geometryQuality: appleResult.geometryQuality,
        focalMismatchPct: appleResult.focalMismatchPct,
        estimatedCameraPitchDeg: appleResult.estimatedCameraPitchDeg ?? null,
        estimatedCameraRollDeg: appleResult.estimatedCameraRollDeg ?? null,
        estimatedCameraYawDeg: appleResult.estimatedCameraYawDeg ?? null,
      },
      depthPro: {
        modelVersion: depthCalibration?.depthResult?.model.version ?? null,
        validRows: depthRowsUsed,
        totalRows: prediction.rows.length,
        scaleFactor: depthCalibration?.depthResult?.model.depthProScaleFactor ?? null,
      },
      rows: fusionRows,
      rowPositionSource,
      manuallyEditedRows,
      warnings,
      tapeHandling: "direct-fresh-head-unchanged",
      importantLimit: `${rowPositionSource === "manual" ? "The displayed row positions were manually edited after ONNX. " : ""}Apple + Depth Pro correct the visible A-to-B width. Hidden front-to-back depth is inferred from that width and the fresh model's learned depth/width ratio; it is not directly scanned. Tape stays the independent fresh tape head.`,
    },
  };
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
  disabled = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}{required ? " · required" : ""}</span>
      <span className={cn("flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100", disabled && "bg-slate-100 text-slate-500")}>
        <input className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-bold outline-none disabled:cursor-not-allowed" disabled={disabled} min="1" onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} step="0.1" type="number" value={value ?? ""} />
        <span className="text-xs font-bold text-slate-400">cm</span>
      </span>
    </label>
  );
}

export function LegacyHeldoutOnnxResult({
  actuals,
  imageSize,
  imageUrl,
  model,
  prediction,
}: {
  actuals: ActualMeasurements;
  imageSize: { width: number; height: number };
  imageUrl: string;
  model: HeldoutWearModel;
  prediction: WearV6Prediction;
}) {
  const parts = (["neck", "chest", "underbust", "waist", "hips"] as WearV6RowKind[])
    .filter((part) => part !== "underbust" || model.gender === "female");
  const [activePart, setActivePart] = useState<WearV6RowKind>("waist");
  const heldout = prediction.heldoutEvaluation;
  const predictedRows = heldout?.predictedRows ?? prediction.rows;
  const realRows = heldout?.realRows ?? [];
  const predictedRow = predictedRows.find((row) => row.kind === activePart);
  const realRow = realRows.find((row) => row.kind === activePart);
  const measurement = prediction.measurements.find((item) => item.kind === activePart);
  const predictedShape = prediction.crossSections.find((item) => item.kind === activePart);
  const realGeometry = heldout?.realGeometry[activePart];
  const realTape = actuals[activePart];
  const predictedPhysicalPoints = (predictedShape?.points ?? []).map((point) => ({
    x: point.breadthNorm * (measurement?.appleCorrectedWidthCm ?? 0) / 2,
    y: point.depthNorm * (measurement?.rawMeshDepthCm ?? 0) / 2,
  }));
  const realPhysicalPoints = (realGeometry?.contour32Normalized ?? []).map((point) => ({
    x: point.breadthNorm * (realGeometry?.frontWidthCm ?? 0) / 2,
    y: point.depthNorm * (realGeometry?.depthCm ?? 0) / 2,
  }));
  const maxShapeRadius = Math.max(
    1,
    ...predictedPhysicalPoints.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
    ...realPhysicalPoints.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
  );
  const shapeScale = 120 / maxShapeRadius;
  const svgPoints = (points: Array<{ x: number; y: number }>) => points
    .map((point) => `${(170 + point.x * shapeScale).toFixed(2)},${(150 + point.y * shapeScale).toFixed(2)}`)
    .join(" ");
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm" data-testid="heldout-onnx-result">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">ONNX-only held-out result</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{model.scanId}</h2>
          <p className="mt-1 text-sm text-slate-600">Choose any of the 448 test-only people. Cyan is ONNX. Orange is real WEAR truth.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">ONNX only</span>
          <span className="rounded-full bg-cyan-100 px-3 py-1.5 text-cyan-900">Cyan · ONNX prediction</span>
          <span className="rounded-full bg-orange-100 px-3 py-1.5 text-orange-900">Orange · real WEAR</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Apple Vision: not used</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Depth Pro: not used</span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
          <div className="relative">
            {/* This private API image is dynamic and is not compatible with next/image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={`${model.scanId} held-out WEAR render`} className="max-h-[620px] w-full object-contain" src={imageUrl} />
            <svg aria-label="ONNX predicted rows compared with real WEAR rows" className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 1000 1000">
              {realRows.map((row) => (
                <g key={row.kind}>
                  <line x1={row.photo.left.x * 1000} x2={row.photo.right.x * 1000} y1={row.photo.left.y * 1000} y2={row.photo.right.y * 1000} stroke="rgba(15,23,42,0.85)" strokeWidth="9" vectorEffect="non-scaling-stroke" />
                  <line x1={row.photo.left.x * 1000} x2={row.photo.right.x * 1000} y1={row.photo.left.y * 1000} y2={row.photo.right.y * 1000} stroke="#fb923c" strokeDasharray="10 7" strokeWidth="5" vectorEffect="non-scaling-stroke" />
                </g>
              ))}
              {predictedRows.map((row) => (
                <line key={row.kind} x1={row.photo.left.x * 1000} x2={row.photo.right.x * 1000} y1={row.photo.left.y * 1000} y2={row.photo.right.y * 1000} stroke="#06b6d4" strokeWidth="4" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>
          <div className="flex justify-between gap-3 border-t border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
            <span>Cyan ONNX lines · dashed orange real lines</span>
            <span>{imageSize.width.toLocaleString()} × {imageSize.height.toLocaleString()} px</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Profile input</p><p className="mt-1 text-sm font-black">{model.gender} · {model.heightCm.toFixed(1)} cm · {model.weightKg.toFixed(1)} kg</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Automatic pipeline</p><p className="mt-1 text-sm font-black">RGB predicts lines → those lines predict depth, shape and circumference</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Inference</p><p className="mt-1 text-sm font-black">{prediction.timing.inferenceMs.toFixed(1)} ms</p></div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {parts.map((part) => <button className={cn("rounded-xl border px-3 py-2 text-sm font-black", activePart === part ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700")} key={part} onClick={() => setActivePart(part)} type="button">{HELDOUT_PART_LABELS[part]}</button>)}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">{HELDOUT_PART_LABELS[activePart]} · 32-point shape</p>
              <svg aria-label={`${HELDOUT_PART_LABELS[activePart]} predicted and real cross-sections`} className="mt-2 h-[300px] w-full" viewBox="0 0 340 300">
                <line stroke="#334155" x1="170" x2="170" y1="15" y2="285" />
                <line stroke="#334155" x1="25" x2="315" y1="150" y2="150" />
                {realPhysicalPoints.length >= 3 ? <polygon fill="rgba(251,146,60,0.08)" points={svgPoints(realPhysicalPoints)} stroke="#fb923c" strokeDasharray="8 6" strokeWidth="3" /> : null}
                {predictedPhysicalPoints.length >= 3 ? <polygon fill="rgba(6,182,212,0.12)" points={svgPoints(predictedPhysicalPoints)} stroke="#06b6d4" strokeWidth="3" /> : null}
              </svg>
              <div className="flex flex-wrap gap-4 text-xs font-bold"><span className="text-cyan-300">Solid cyan · ONNX</span><span className="text-orange-300">Dashed orange · real WEAR</span></div>
            </div>

            <div className="grid content-start gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-800">ONNX predicted</p><p className="mt-3 text-sm font-bold text-slate-700">Front width <strong className="float-right text-slate-950">{measurement ? `${measurement.appleCorrectedWidthCm.toFixed(2)} cm` : "—"}</strong></p><p className="mt-2 text-sm font-bold text-slate-700">Depth <strong className="float-right text-slate-950">{measurement?.rawMeshDepthCm == null ? "—" : `${measurement.rawMeshDepthCm.toFixed(2)} cm`}</strong></p><p className="mt-2 text-sm font-bold text-slate-700">Circumference <strong className="float-right text-slate-950">{measurement ? `${measurement.valueCm.toFixed(1)} cm` : "—"}</strong></p></div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-orange-800">Real WEAR truth</p><p className="mt-3 text-sm font-bold text-slate-700">Front width <strong className="float-right text-slate-950">{realGeometry?.frontWidthCm == null ? "—" : `${realGeometry.frontWidthCm.toFixed(2)} cm`}</strong></p><p className="mt-2 text-sm font-bold text-slate-700">Depth <strong className="float-right text-slate-950">{realGeometry?.depthCm == null ? "—" : `${realGeometry.depthCm.toFixed(2)} cm`}</strong></p><p className="mt-2 text-sm font-bold text-slate-700">Tape <strong className="float-right text-slate-950">{realTape == null ? "—" : `${realTape.toFixed(1)} cm`}</strong></p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Errors for this part</p><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><p>Row height<br /><strong>{predictedRow && realRow ? `${(Math.abs(predictedRow.photo.left.y - realRow.photo.left.y) * imageSize.height).toFixed(1)} px` : "—"}</strong></p><p>Left edge<br /><strong>{predictedRow && realRow ? `${(Math.abs(predictedRow.photo.left.x - realRow.photo.left.x) * imageSize.width).toFixed(1)} px` : "—"}</strong></p><p>Right edge<br /><strong>{predictedRow && realRow ? `${(Math.abs(predictedRow.photo.right.x - realRow.photo.right.x) * imageSize.width).toFixed(1)} px` : "—"}</strong></p><p>Circumference<br /><strong>{measurement && realTape != null ? `${measurement.valueCm - realTape >= 0 ? "+" : ""}${(measurement.valueCm - realTape).toFixed(1)} cm` : "—"}</strong></p></div></div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
                <tr><th className="px-4 py-3">Body part</th><th className="px-4 py-3">ONNX width</th><th className="px-4 py-3">Real width</th><th className="px-4 py-3">ONNX depth</th><th className="px-4 py-3">Real depth</th><th className="px-4 py-3">ONNX circumference</th><th className="px-4 py-3">Real tape</th><th className="px-4 py-3">Error</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parts.map((part) => {
                  const measurement = prediction.measurements.find((item) => item.kind === part);
                  const geometry = heldout?.realGeometry[part];
                  const tape = actuals[part];
                  const difference = measurement && tape != null ? measurement.valueCm - tape : null;
                  return (
                    <tr className={cn("cursor-pointer", activePart === part && "bg-blue-50")} key={part} onClick={() => setActivePart(part)}>
                      <td className="px-4 py-3 font-black text-slate-900">{HELDOUT_PART_LABELS[part]}</td>
                      <td className="px-4 py-3 font-black text-cyan-800">{measurement ? `${measurement.appleCorrectedWidthCm.toFixed(2)} cm` : "—"}</td>
                      <td className="px-4 py-3 font-black text-orange-800">{geometry?.frontWidthCm == null ? "—" : `${geometry.frontWidthCm.toFixed(2)} cm`}</td>
                      <td className="px-4 py-3 font-black text-cyan-800">{measurement?.rawMeshDepthCm == null ? "—" : `${measurement.rawMeshDepthCm.toFixed(2)} cm`}</td>
                      <td className="px-4 py-3 font-black text-orange-800">{geometry?.depthCm == null ? "—" : `${geometry.depthCm.toFixed(2)} cm`}</td>
                      <td className="px-4 py-3 font-black text-cyan-800">{measurement ? `${measurement.valueCm.toFixed(1)} cm` : "—"}</td>
                      <td className="px-4 py-3 font-black text-orange-800">{tape == null ? "—" : `${tape.toFixed(1)} cm`}</td>
                      <td className={cn("px-4 py-3 font-black", difference != null && Math.abs(difference) <= 1.27 ? "text-emerald-700" : "text-red-700")}>{difference == null ? "—" : `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} cm`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">The automatic v7 path receives RGB, height, weight and gender. It predicts the cyan line first, then uses that predicted line to produce width, depth, 32-point shape and circumference. Orange WEAR geometry and tape are revealed only for checking.</p>
        </div>
      </div>
    </section>
  );
}

export function WearV6PhotoLab() {
  const [testMode, setTestMode] = useState<TestMode>("fresh-photo");
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [heldoutModels, setHeldoutModels] = useState<HeldoutWearModel[]>([]);
  const [heldoutPersonCount, setHeldoutPersonCount] = useState(0);
  const [heldoutSearch, setHeldoutSearch] = useState("");
  const [heldoutLoadError, setHeldoutLoadError] = useState<string | null>(null);
  const [selectedHeldoutScanId, setSelectedHeldoutScanId] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>("female");
  const [reportedChestCm, setReportedChestCm] = useState<number | null>(null);
  const [actuals, setActuals] = useState<ActualMeasurements>(EMPTY_ACTUALS);
  const [modelStatus, setModelStatus] = useState<WearV6ModelStatus | null>(null);
  const [freshStatus, setFreshStatus] = useState<FreshGeometryStatus | null>(null);
  const [forgeStatus, setForgeStatus] = useState<ForgeStatus | null>(null);
  const [trainingExpanded, setTrainingExpanded] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<WearV6Prediction | null>(null);
  const [freshPrediction, setFreshPrediction] = useState<FreshGeometryPrediction | null>(null);
  const [freshLineRecalibrating, setFreshLineRecalibrating] = useState(false);
  const [freshLineEditError, setFreshLineEditError] = useState<string | null>(null);
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
  const v7ModelActive = modelStatus?.modelVersion?.includes("-v7-") === true;
  const poseAnchorsRequired = modelStatus?.poseAnchorsRequired !== false;
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
    setFreshPrediction(null);
    setFreshLineRecalibrating(false);
    setFreshLineEditError(null);
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
    setSelectedHeldoutScanId("");
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

  const applyHeldoutModel = useCallback(async (model: HeldoutWearModel) => {
    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
      uploadedObjectUrlRef.current = null;
    }
    setTestMode("heldout-onnx");
    setSelectedHeldoutScanId(model.scanId);
    setSelectedDatasetId(`heldout:${model.scanId}`);
    setImageUrl(model.imageUrl);
    setImageSize(await imageDimensions(model.imageUrl));
    setHeightCm(model.heightCm);
    setWeightKg(model.weightKg);
    setGender(model.gender);
    setReportedChestCm(null);
    setActuals(EMPTY_ACTUALS);
    resetResult();
  }, [resetResult]);

  const refreshStatus = useCallback(async () => {
    const freshRequest = fetch("/api/try-on-test/wear-photo-test/fresh", { cache: "no-store" })
      .then((response) => response.json() as Promise<FreshGeometryStatus>)
      .then(setFreshStatus);
    const legacyRequest = Promise.all([
      fetch("/api/try-on-test/wear-photo-test/v6", { cache: "no-store" }).then((response) => response.json() as Promise<WearV6ModelStatus>),
      fetch("/api/try-on-test/model-forge/status", { cache: "no-store" }).then((response) => response.json() as Promise<{ status?: ForgeStatus } & ForgeStatus>),
    ]).then(([modelPayload, forgePayload]) => {
      setModelStatus(modelPayload);
      setForgeStatus(forgePayload.status ?? forgePayload);
    });
    await Promise.allSettled([freshRequest, legacyRequest]);
  }, []);

  useEffect(() => {
    let active = true;
    void refreshStatus();
    void fetch("/api/try-on-test/sizing-lab/dataset", { cache: "no-store" })
      .then((response) => response.json())
      .then((datasetPayload) => {
      if (!active) return;
      const rows = ((datasetPayload.rows ?? []) as DatasetRow[]).filter((row) => row.frontImageUrl);
      setDatasets(rows);
      const initial = rows.find((row) => row.setId === "shahnaz-2") ?? rows[0];
      if (initial) void applyDataset(initial);
    }).catch((error) => {
      if (active) setRunError(error instanceof Error ? error.message : "Could not load the saved photo dataset.");
    });
    void fetch("/api/try-on-test/wear-photo-test/heldout", { cache: "no-store" })
      .then((response) => response.json() as Promise<HeldoutWearListResponse>)
      .then((heldoutPayload) => {
      if (!active) return;
      const heldout = heldoutPayload.models ?? [];
      if (!heldoutPayload.ok || heldoutPayload.personCount !== 448 || heldout.length !== 448 || heldoutPayload.includedInTraining !== false) {
        setHeldoutLoadError(heldoutPayload.error ?? "The 448-person test-only cohort failed its integrity check.");
        return;
      }
      setHeldoutModels(heldout);
      setHeldoutPersonCount(heldoutPayload.personCount);
      setHeldoutLoadError(null);
    }).catch((error) => {
      if (active) setHeldoutLoadError(error instanceof Error ? error.message : "Could not load the 448-person held-out list.");
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
    setTestMode((current) => current === "fresh-photo" ? current : "photo-pipeline");
    setSelectedHeldoutScanId("");
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
    rowLines?: Partial<Record<WearV6RowKind, WearV6Line>>,
  ) => {
    if (!heightCm || !weightKg) throw new Error("Height and weight are required.");
    if (!poseAnchorsRef.current && poseAnchorsRequired) {
      throw new Error("Apple shoulder/hip anchors are required before WEAR inference.");
    }
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
        rowGeometry: rowLines,
      }),
    });
    const payload = await response.json() as WearV6Prediction | { ok: false; error?: string };
    if (!response.ok || !payload.ok) throw new Error("error" in payload && payload.error ? payload.error : "WEAR v6 inference failed.");
    return payload;
  }, [gender, heightCm, poseAnchorsRequired, reportedChestCm, weightKg]);

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
    return { widths, confidences, depthResult: fusedPayload.result };
  }, [heightCm, imageSize.height, imageSize.width]);

  const runHeldoutOnnxOnly = useCallback(async () => {
    if (!selectedHeldoutScanId) {
      setRunError("Choose one of the 448 held-out WEAR models.");
      return;
    }
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    setRunError(null);
    setPrediction(null);
    setActuals(EMPTY_ACTUALS);
    setMaskLines({});
    setMetaLines({});
    setMetaStatus(EMPTY_META_STATUS);
    setAppleState("idle");
    setAppleDetail("Not used in held-out WEAR mesh evaluation");
    setAppleResult(null);
    setAppleVisionWidths({});
    setAppleDepthWidths({});
    setAppleDepthState("idle");
    setAppleDepthDetail("Not used in held-out WEAR mesh evaluation");
    setRunState("wear-measurements");
    try {
      const response = await fetch("/api/try-on-test/wear-photo-test/v6", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ heldoutScanId: selectedHeldoutScanId }),
      });
      const payload = await response.json() as WearV6Prediction | { ok: false; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Held-out ONNX inference failed.");
      }
      if (activeRunRef.current !== runId) return;
      if (
        !payload.heldoutEvaluation?.onnxMeasurementsOnly
        || payload.heldoutEvaluation.appleVisionUsed
        || payload.heldoutEvaluation.rgbEdgeSnapUsed
        || payload.heldoutEvaluation.geometryGuardsUsed
      ) {
        throw new Error("The server did not confirm the isolated ONNX prediction-versus-WEAR-truth test.");
      }
      setActuals({ ...EMPTY_ACTUALS, ...payload.heldoutEvaluation.actuals });
      setPrediction(payload);
      setRunState("ready");
    } catch (error) {
      if (activeRunRef.current !== runId) return;
      setRunError(error instanceof Error ? error.message : "Held-out ONNX inference failed.");
      setRunState("error");
    }
  }, [selectedHeldoutScanId]);

  const runFreshPhoto = useCallback(async () => {
    if (!imageUrl || !heightCm || !weightKg) {
      setRunError("Choose one full-body photo and enter height and weight.");
      return;
    }
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    setRunError(null);
    setPrediction(null);
    setFreshPrediction(null);
    setFreshLineRecalibrating(false);
    setFreshLineEditError(null);
    setMaskLines({});
    setMetaLines({});
    setMetaStatus(EMPTY_META_STATUS);
    setAppleResult(null);
    setAppleState("idle");
    setAppleDetail("Waiting for fresh ONNX to predict the five body rows");
    setAppleDepthState("idle");
    setAppleDepthDetail("Waiting for Apple Vision camera geometry");
    setWidthMethod("apple-depth");
    setAppleVisionWidths({});
    setAppleDepthWidths({});
    appleCacheKeyRef.current = null;
    appleVisionWidthsRef.current = {};
    appleVisionConfidencesRef.current = {};
    appleDepthWidthsRef.current = {};
    appleDepthConfidencesRef.current = {};
    appleDepthGeometryRef.current = "";
    setRunState("pose");
    let rawPrediction: FreshGeometryPrediction | null = null;
    try {
      const sourceDataUrl = await imageUrlToDataUrl(imageUrl);
      sourceDataUrlRef.current = sourceDataUrl;
      const pose = await detectPoseAndMask(imageUrl, { includeMask: true });
      if (activeRunRef.current !== runId) return;
      if (!pose || pose.landmarks.length !== 33) {
        throw new Error("Could not find one complete standing person.");
      }
      requireCompleteStandingPose(pose);
      const encodedMask = maskDataUrl(pose);
      if (!encodedMask) throw new Error("Could not encode the full-body silhouette.");
      poseRef.current = pose;
      personBoxRef.current = posePersonBox(pose);
      setRunState("wear-measurements");
      const response = await fetch("/api/try-on-test/wear-photo-test/fresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          maskDataUrl: encodedMask,
          heightCm,
          weightKg,
          gender,
          landmarks: pose.landmarks.map((landmark) => ({
            x: landmark.x,
            y: landmark.y,
            visibility: landmark.visibility,
          })),
        }),
      });
      const payload = await response.json() as FreshGeometryPrediction | { ok: false; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Fresh ONNX inference failed.");
      }
      if (activeRunRef.current !== runId) return;
      if (
        payload.model.sealedTestSubjectsUsed !== 0
        || payload.model.sdkReady
        || payload.inputContract.notUsedByOnnx.includes("old V6/V7 predictions") === false
      ) {
        throw new Error("The server did not confirm the isolated fresh-model contract.");
      }
      rawPrediction = payload;
      setFreshPrediction(payload);

      setRunState("apple");
      setAppleState("loading");
      setAppleDetail("Apple Vision is estimating camera geometry at the fresh ONNX rows");
      const lines = lineMapFromFreshPrediction(payload);
      const appleCalibration = await appleWidthsForLines(lines, sourceDataUrl);
      if (activeRunRef.current !== runId) return;
      appleCacheKeyRef.current = appleCalibration.result.cacheKey;
      appleVisionWidthsRef.current = appleCalibration.widths;
      appleVisionConfidencesRef.current = appleCalibration.confidences;
      setAppleResult(appleCalibration.result);
      setAppleVisionWidths(appleCalibration.widths);
      setAppleState("ready");
      setAppleDetail(`Apple camera geometry ${appleCalibration.result.geometryQuality} · measuring the same rows with Depth Pro`);

      let depthCalibration: WidthCalibration | null = null;
      let depthError: string | null = null;
      try {
        depthCalibration = await appleDepthWidthsForLines(lines, sourceDataUrl);
        if (activeRunRef.current !== runId) return;
        appleDepthWidthsRef.current = depthCalibration.widths;
        appleDepthConfidencesRef.current = depthCalibration.confidences;
        appleDepthGeometryRef.current = lineGeometryKey(lines);
        setAppleDepthWidths(depthCalibration.widths);
      } catch (error) {
        depthError = error instanceof Error ? error.message : "Depth Pro body-width fusion failed.";
        setAppleDepthState("error");
        setAppleDepthDetail(`${depthError} Apple Vision widths are used as a visible fallback.`);
      }

      const fusedPrediction = fuseFreshCameraPrediction(
        payload,
        appleCalibration.result,
        appleCalibration.widths,
        appleCalibration.confidences,
        depthCalibration,
        depthError,
      );
      setWidthMethod(depthCalibration ? "apple-depth" : "apple-vision");
      setFreshPrediction(fusedPrediction);
      setRunState("ready");
    } catch (error) {
      if (activeRunRef.current !== runId) return;
      const message = error instanceof Error ? error.message : "Fresh ONNX inference failed.";
      if (rawPrediction) {
        setFreshPrediction(failedFreshCameraFusion(rawPrediction, message));
        setAppleState("error");
        setAppleDetail(message);
        setAppleDepthState("error");
        setAppleDepthDetail("Depth Pro did not run because Apple camera geometry failed.");
        setRunError(`Fresh ONNX finished, but Apple + Depth Pro fusion failed: ${message}`);
        setRunState("ready");
      } else {
        setRunError(message);
        setRunState("error");
      }
    }
  }, [appleDepthWidthsForLines, appleWidthsForLines, gender, heightCm, imageUrl, weightKg]);

  const recalculateFreshLines = useCallback(async (overrides: FreshGeometryLineOverrideMap) => {
    if (!freshPrediction || !sourceDataUrlRef.current || !poseRef.current) {
      setFreshLineEditError("Run the fresh photo pipeline before editing its rows.");
      return;
    }
    const changedThisPass = changedFreshLineKinds(freshPrediction, overrides);
    if (!changedThisPass.length) return;
    const existingEdited = freshPrediction.cameraFusion?.manuallyEditedRows ?? [];
    const manuallyEditedRows = [...new Set([...existingEdited, ...changedThisPass])];
    const predictionWithOverrides = freshPredictionWithLineOverrides(freshPrediction, overrides);
    const lines = lineMapFromFreshPrediction(predictionWithOverrides);
    const runId = activeRunRef.current;
    setFreshLineRecalibrating(true);
    setFreshLineEditError(null);
    setAppleState("loading");
    setAppleDepthState("loading");
    setAppleDetail("Recalculating Apple camera width at the manually edited rows");
    setAppleDepthDetail("Reusing the Depth Pro surface map at the edited endpoints");
    try {
      const appleCalibration = await appleWidthsForLines(lines, sourceDataUrlRef.current);
      if (activeRunRef.current !== runId) return;
      appleCacheKeyRef.current = appleCalibration.result.cacheKey;
      appleVisionWidthsRef.current = appleCalibration.widths;
      appleVisionConfidencesRef.current = appleCalibration.confidences;
      setAppleResult(appleCalibration.result);
      setAppleVisionWidths(appleCalibration.widths);
      setAppleState("ready");
      setAppleDetail(`Apple camera geometry ${appleCalibration.result.geometryQuality} · edited rows accepted`);

      let depthCalibration: WidthCalibration | null = null;
      let depthError: string | null = null;
      try {
        depthCalibration = await appleDepthWidthsForLines(lines, sourceDataUrlRef.current);
        if (activeRunRef.current !== runId) return;
        appleDepthWidthsRef.current = depthCalibration.widths;
        appleDepthConfidencesRef.current = depthCalibration.confidences;
        appleDepthGeometryRef.current = lineGeometryKey(lines);
        setAppleDepthWidths(depthCalibration.widths);
      } catch (error) {
        depthError = error instanceof Error ? error.message : "Depth Pro body-width fusion failed.";
        setAppleDepthState("error");
        setAppleDepthDetail(`${depthError} Apple Vision widths are used as a visible fallback.`);
      }

      const fusedPrediction = fuseFreshCameraPrediction(
        predictionWithOverrides,
        appleCalibration.result,
        appleCalibration.widths,
        appleCalibration.confidences,
        depthCalibration,
        depthError,
        "manual",
        manuallyEditedRows,
      );
      setWidthMethod(depthCalibration ? "apple-depth" : "apple-vision");
      setFreshPrediction(fusedPrediction);
    } catch (error) {
      if (activeRunRef.current !== runId) return;
      setAppleState("error");
      const message = error instanceof Error ? error.message : "The edited rows could not be recalculated.";
      setAppleDetail(message);
      setFreshLineEditError(message);
    } finally {
      if (activeRunRef.current === runId) setFreshLineRecalibrating(false);
    }
  }, [appleDepthWidthsForLines, appleWidthsForLines, freshPrediction]);

  const runFullTest = useCallback(async () => {
    if (testMode === "heldout-onnx") {
      await runHeldoutOnnxOnly();
      return;
    }
    if (testMode === "fresh-photo") {
      await runFreshPhoto();
      return;
    }
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
      if (v7ModelActive) {
        setAppleState("idle");
        setAppleDetail("Not used by WEAR v7");
        const pose = await detectPoseAndMask(imageUrl, { includeMask: false });
        if (activeRunRef.current !== runId) return;
        if (!pose || pose.landmarks.length !== 33) throw new Error("Could not find one complete standing person.");
        requireCompleteStandingPose(pose);
        poseRef.current = pose;
        personBoxRef.current = posePersonBox(pose);
        poseAnchorsRef.current = null;
        setRunState("wear-edges");
        const edgePrediction = await callV6(sourceDataUrl);
        if (activeRunRef.current !== runId) return;
        const rowLines = lineMapFromPrediction(edgePrediction);
        setPrediction(edgePrediction);
        setMaskLines(buildMaskLines(pose, edgePrediction));
        setRunState("wear-measurements");
        const measuredPrediction = await callV6(
          sourceDataUrl,
          undefined,
          undefined,
          undefined,
          rowLines,
        );
        if (activeRunRef.current !== runId) return;
        setPrediction({ ...measuredPrediction, rows: edgePrediction.rows });
        setRunState("ready");
        return;
      }
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
      const calibratedPrediction = await callV6(
        sourceDataUrl,
        calibrated.widths,
        sources,
        calibrated.confidences,
        lineMapFromPrediction(edgePrediction),
      );
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
  }, [appleSeedForPhoto, appleWidthsForLines, callV6, heightCm, imageSize.height, imageSize.width, imageUrl, runFreshPhoto, runHeldoutOnnxOnly, testMode, v7ModelActive, weightKg]);

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
      const updated = await callV6(sourceDataUrl, activeWidths, sources, activeConfidences, lines);
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
    if (v7ModelActive) {
      setAppleState("idle");
      setAppleDetail("Not used by WEAR v7");
      const updated = await callV6(sourceDataUrl, undefined, undefined, undefined, lines);
      setPrediction((current) => current ? { ...updated, rows: current.rows } : updated);
      return;
    }
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
      const updated = await callV6(sourceDataUrl, activeWidths, sources, activeConfidences, lines);
      setPrediction((current) => current ? { ...updated, rows: current.rows } : updated);
      setAppleState("ready");
      setAppleDetail(`Moved lines recalculated · ${widthMethod === "apple-depth" ? "Apple + Depth Pro" : "Apple Vision"} active`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Line recalculation failed.";
      setAppleState("error");
      setAppleDetail(message);
      throw error;
    }
  }, [appleDepthWidthsForLines, appleWidthsForLines, callV6, v7ModelActive, widthMethod]);

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
  const selectedHeldoutModel = heldoutModels.find((model) => model.scanId === selectedHeldoutScanId);
  const filteredHeldoutModels = useMemo(() => {
    const query = heldoutSearch.trim().toLowerCase();
    if (!query) return heldoutModels;
    return heldoutModels.filter((model) => [
      model.scanId,
      model.subjectId,
      model.gender,
      model.heightCm.toFixed(1),
      model.weightKg.toFixed(1),
    ].some((value) => value.toLowerCase().includes(query)));
  }, [heldoutModels, heldoutSearch]);
  const selectedLabel = selectedHeldoutModel
    ? `${selectedHeldoutModel.scanId} · ${selectedHeldoutModel.gender} · H ${selectedHeldoutModel.heightCm.toFixed(1)} · W ${selectedHeldoutModel.weightKg.toFixed(1)} kg`
    : selectedDataset?.label ?? "Uploaded photo";
  const running = ["pose", "wear-edges", "apple", "wear-measurements"].includes(runState);
  const forgeCandidateVisible = Boolean(
    forgeStatus?.pipelineId?.includes("v6r5")
    && forgeStatus.state !== "complete",
  );
  const forgeCandidateBlocked = forgeStatus?.state === "blocked" || forgeStatus?.state === "failed";
  const freshMode = testMode === "fresh-photo";
  const fresh448Mode = testMode === "fresh-448";
  const freshFamilyMode = freshMode || fresh448Mode;
  const activeModelAvailable = freshMode ? freshStatus?.ok === true : modelStatus?.ok === true;
  const profileReady = Boolean(heightCm && weightKg && (
    testMode === "heldout-onnx"
    || freshMode
    || gender === "female"
    || reportedChestCm
  ));
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
              <Sparkles className="size-3.5" /> {testMode === "heldout-onnx" ? "ONNX only · 448 held-out" : fresh448Mode ? "Fresh ONNX · final 448" : freshMode ? "Fresh H100 ONNX · normal photo" : "Formula-free WEAR v6"}
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{testMode === "heldout-onnx" ? "WEAR ONNX Held-out Test" : fresh448Mode ? "Fresh ONNX Final 448 Test" : freshMode ? "Fresh 3D Teacher Photo Test" : "WEAR 3D Photo Lab"}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{testMode === "heldout-onnx" ? v7ModelActive ? "Choose any test-only WEAR person. V7 sees only the front RGB render, height, weight and gender. It predicts the lines first, then uses those predicted lines to produce width, depth, 32-point shape and circumference. Real WEAR truth is revealed only afterward." : "Choose one test-only WEAR model and run the ONNX package directly. Tape is revealed only for the score. No Apple Vision, MediaPipe, Depth Pro, or nearest-person matching." : fresh448Mode ? "The frozen fresh ONNX ran once on all 448 test-only WEAR people. Choose any person to compare predicted lines, A-to-B width, depth, tape and 32-point shape against hidden WEAR truth." : freshMode ? "One normal standing photo → body segmentation and canonical framing → the newly trained fresh ONNX → five row positions, A-to-B widths, depth, 32-point shapes, direct tape, ratios and learned camera corrections. This is the first real-photo transfer test, not a proven result." : "One standing RGB photo → Apple shoulder/hip anchors → independent WEAR body rows → Apple camera-corrected widths → independent learned tape measurements. MediaPipe and Meta stay separate comparison views."}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Current private ONNX</p>
              {freshFamilyMode
                ? freshStatus?.ok
                  ? <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-xs font-black text-cyan-200">Fresh model installed</span>
                  : <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-300">Fresh model unavailable</span>
                : forgeCandidateVisible
                ? <span className={`rounded-full px-2.5 py-1 text-xs font-black ${forgeCandidateBlocked ? "bg-rose-400/15 text-rose-200" : "bg-blue-400/15 text-blue-200"}`}>{forgeCandidateBlocked ? "Private v6r5 blocked" : "Private v6r5 process"}</span>
                : modelStatus?.ok
                ? <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-black text-emerald-300">Installed</span>
                : <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-300">{modelStatus?.training === false ? "Waiting for review" : "Training"}</span>}
            </div>
            <p className="mt-3 text-lg font-black">{freshFamilyMode ? freshStatus?.ok ? freshStatus.modelVersion : freshStatus?.error ?? "Fresh ONNX not installed" : forgeCandidateVisible ? forgeStatus?.currentStageLabel : modelStatus?.ok ? modelStatus.modelVersion : modelStatus?.trainingStageLabel ?? forgeStatus?.currentStageLabel ?? "Preparing full v6 data"}</p>
            {freshFamilyMode && freshStatus?.importantLimit ? <p className="mt-2 text-xs leading-5 text-amber-200">{freshStatus.importantLimit}</p> : null}
            {!freshFamilyMode && forgeCandidateVisible && forgeStatus?.detail ? <p className="mt-2 text-xs leading-5 text-slate-300">{forgeStatus.detail}</p> : null}
            {!freshFamilyMode && !forgeCandidateVisible && !modelStatus?.ok && (modelStatus?.trainingDetail || forgeStatus?.detail) ? <p className="mt-2 text-xs leading-5 text-slate-300">{modelStatus?.trainingDetail ?? forgeStatus?.detail}</p> : null}
            {!freshFamilyMode && forgeCandidateVisible && modelStatus?.ok ? <p className="mt-2 text-[11px] font-bold text-slate-400">Private Test Lab candidate installed: {modelStatus.modelVersion}. {modelStatus.privateDiagnosticOnly ? "Official synthetic pass is false; hash-locked diagnostic inference only." : "Synthetic gate passed."} Release, publish, deploy, and SDK remain blocked.</p> : null}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${freshFamilyMode ? "bg-cyan-400" : forgeCandidateBlocked ? "bg-rose-400" : "bg-blue-400"}`} style={{ width: `${freshFamilyMode ? freshStatus?.ok ? 100 : 1 : forgeCandidateVisible ? forgeStatus?.overallPercent ?? 1 : modelStatus?.ok ? 100 : forgeStatus?.overallPercent ?? 1}%` }} /></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/5 p-2"><p className="font-black text-white">{fresh448Mode ? "448" : freshMode ? freshStatus?.train?.subjects.toLocaleString() ?? "3,451" : "4,326"}</p><p className="text-slate-400">{fresh448Mode ? "final people" : "people"}</p></div>
              <div className="rounded-lg bg-white/5 p-2"><p className="font-black text-white">{fresh448Mode ? "448" : freshMode ? freshStatus?.train?.records.toLocaleString() ?? "31,059" : "38,934"}</p><p className="text-slate-400">{fresh448Mode ? "front views" : freshMode ? "silhouette views" : "RGB views"}</p></div>
              <div className="rounded-lg bg-white/5 p-2"><p className="font-black text-white">{fresh448Mode ? "1×" : freshMode ? freshStatus?.targetCount ?? 371 : 0}</p><p className="text-slate-400">{fresh448Mode ? "frozen test" : freshMode ? "outputs" : "formulas"}</p></div>
            </div>
            {!freshFamilyMode ? <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100 hover:bg-blue-400/20" onClick={() => setTrainingExpanded(true)} type="button"><Maximize2 className="size-3.5" /> Full-screen process</button> : <p className="mt-4 text-[11px] font-black uppercase tracking-[0.12em] text-rose-200">{fresh448Mode ? "Final test opened once · tuning forbidden · canonical WEAR views" : "Private test only · real-photo validation pending · SDK false"}</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm xl:grid-cols-4">
        <button className={cn("rounded-xl px-4 py-3 text-left", testMode === "heldout-onnx" ? "bg-emerald-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100")} onClick={() => { setTestMode("heldout-onnx"); resetResult(); const initial = selectedHeldoutModel ?? heldoutModels[0]; if (initial) void applyHeldoutModel(initial); }} type="button"><span className="block text-sm font-black">448 held-out models · ONNX only</span><span className={cn("mt-1 block text-xs", testMode === "heldout-onnx" ? "text-emerald-100" : "text-slate-500")}>No Apple Vision or camera pipeline</span></button>
        <button className={cn("rounded-xl px-4 py-3 text-left", testMode === "photo-pipeline" ? "bg-blue-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100")} onClick={() => { setTestMode("photo-pipeline"); setSelectedHeldoutScanId(""); resetResult(); const initial = selectedDataset ?? datasets.find((row) => row.setId === "shahnaz-2") ?? datasets[0]; if (initial) void applyDataset(initial); }} type="button"><span className="block text-sm font-black">Own photo · full camera pipeline</span><span className={cn("mt-1 block text-xs", testMode === "photo-pipeline" ? "text-blue-100" : "text-slate-500")}>Existing upload and Apple-assisted workflow</span></button>
        <button className={cn("rounded-xl px-4 py-3 text-left", freshMode ? "bg-cyan-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100")} onClick={() => { setTestMode("fresh-photo"); setTrainingExpanded(false); setSelectedHeldoutScanId(""); resetResult(); const initial = selectedDataset ?? datasets.find((row) => row.setId === "shahnaz-2") ?? datasets[0]; if (initial) void applyDataset(initial); }} type="button"><span className="block text-sm font-black">Fresh 3D ONNX · normal photo</span><span className={cn("mt-1 block text-xs", freshMode ? "text-cyan-100" : "text-slate-500")}>New H100 model · isolated from every previous model</span></button>
        <button className={cn("rounded-xl px-4 py-3 text-left", fresh448Mode ? "bg-violet-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100")} onClick={() => { setTestMode("fresh-448"); setTrainingExpanded(false); resetResult(); }} type="button"><span className="block text-sm font-black">Fresh ONNX · all 448 results</span><span className={cn("mt-1 block text-xs", fresh448Mode ? "text-violet-100" : "text-slate-500")}>Frozen final test · prediction versus WEAR truth</span></button>
      </section>

      {fresh448Mode ? <FreshSealed448Lab /> : <>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">1 · {testMode === "heldout-onnx" ? "Held-out model" : "Photo"}</p><h2 className="mt-1 text-xl font-black">{testMode === "heldout-onnx" ? "Choose one of the 448 unseen WEAR models" : "Choose a complete standing person"}</h2></div>
            <ImageIcon className="size-6 text-blue-700" />
          </div>
          {testMode === "heldout-onnx" ? (
            <div className="mt-4">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                <Search className="size-4 text-slate-400" />
                <input className="min-w-0 flex-1 py-2.5 text-sm font-bold outline-none" onChange={(event) => setHeldoutSearch(event.target.value)} placeholder="Search model ID, gender, height, or weight" type="search" value={heldoutSearch} />
              </label>
              <select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold" onChange={(event) => { const model = heldoutModels.find((item) => item.scanId === event.target.value); if (model) void applyHeldoutModel(model); }} value={selectedHeldoutScanId}>
                <option value="">Choose held-out model</option>
                {filteredHeldoutModels.map((model) => <option key={model.scanId} value={model.scanId}>{model.scanId} · {model.gender} · H {model.heightCm.toFixed(1)} · W {model.weightKg.toFixed(1)} kg</option>)}
              </select>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className="text-emerald-700">{heldoutPersonCount || "—"} test-only models · 0 training models</span>
                <span className="text-slate-500">Showing {filteredHeldoutModels.length}</span>
              </div>
              {heldoutLoadError ? <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">{heldoutLoadError}</p> : null}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <select className="min-w-56 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold" onChange={(event) => { const row = datasets.find((item) => item.setId === event.target.value); if (row) void applyDataset(row); }} value={selectedDatasetId === "upload" ? "" : selectedDatasetId}>
                <option value="">Choose saved photo</option>
                {datasets.map((row) => <option key={row.setId} value={row.setId}>{row.label}</option>)}
              </select>
              <input accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); }} ref={uploadRef} type="file" />
              <button className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800" onClick={() => uploadRef.current?.click()} type="button"><Upload className="size-4" /> Upload</button>
            </div>
          )}
          {imageUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              {/* Local uploads and data URLs require a normal image element. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={selectedLabel} className="max-h-[520px] w-full object-contain" src={imageUrl} />
              <div className="flex justify-between gap-3 border-t border-white/10 px-3 py-2 text-xs font-bold text-slate-300"><span>{selectedLabel}</span><span>{imageSize.width.toLocaleString()} × {imageSize.height.toLocaleString()} px</span></div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">2 · Inputs</p><h2 className="mt-1 text-xl font-black">{testMode === "heldout-onnx" ? "Direct ONNX input" : "Customer profile and private checks"}</h2></div>
            <Ruler className="size-6 text-blue-700" />
          </div>
          {testMode === "heldout-onnx" ? (
            <>
              <p className="mt-2 text-xs leading-5 text-slate-500">No Apple or photo preprocessing endpoints run. Tape answers stay out of the request and return only after ONNX finishes.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Selected model</p><p className="mt-1 text-lg font-black text-slate-950">{selectedHeldoutModel?.scanId ?? "Choose a model"}</p><p className="mt-1 text-xs font-bold text-slate-600">{selectedHeldoutModel ? `${selectedHeldoutModel.gender} · ${selectedHeldoutModel.heightCm.toFixed(1)} cm · ${selectedHeldoutModel.weightKg.toFixed(1)} kg` : "—"}</p></div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Automatic ONNX pipeline</p><p className="mt-1 text-sm font-black text-emerald-950">{v7ModelActive ? "RGB predicts rows → predicted rows drive each body-part head" : "WEAR landmarks + per-part mesh front widths"}</p><p className="mt-1 text-xs text-emerald-800">No real line, depth, perimeter or tape enters matching</p></div>
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-xs leading-5 text-slate-600">
                <p className="font-black text-slate-900">Exactly what runs</p>
                <p className="mt-1">{v7ModelActive ? "Held-out RGB + height + weight + gender → predicted lines → predicted width/depth/shape/circumference → reveal real WEAR lines, depth, shape and tape for comparison." : "Held-out RGB render + height + weight + gender + WEAR landmarks + mesh front widths → ONNX → predicted tape values → reveal saved tape for difference."}</p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs leading-5 text-slate-500">{freshMode ? "The fresh ONNX receives only the cleaned silhouette, height, weight, calculated BMI and gender flags. Tape checks appear only after prediction." : "Tape answers are never sent to v6. They appear only after prediction to show the error."}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <NumberField label="Height" onChange={(value) => { setHeightCm(value); resetResult(); }} required value={heightCm} />
                <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Weight · required</span><span className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-blue-500"><input className="min-w-0 flex-1 py-2.5 text-sm font-bold outline-none" min="25" onChange={(event) => { setWeightKg(event.target.value ? Number(event.target.value) : null); resetResult(); }} step="0.1" type="number" value={weightKg ?? ""} /><span className="text-xs font-bold text-slate-400">kg</span></span></label>
              </div>
              <div className="mt-3 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["female", "male"] as const).map((value) => <button className={cn("rounded-lg px-3 py-2 text-sm font-black capitalize", gender === value ? "bg-blue-700 text-white" : "text-slate-500")} key={value} onClick={() => { setGender(value); resetResult(); }} type="button">{value}</button>)}
              </div>
              {freshMode ? <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-800">Fresh input contract</p>
                <p className="mt-2 text-[11px] leading-5 text-cyan-900">Chest, waist, hips, depth and tape are outputs—not inputs. The fresh ONNX stays isolated from Apple, Depth Pro, old V6/V7 and saved WEAR answers. After ONNX predicts its rows, Apple + Depth Pro measure those same visible endpoints for the clearly labeled fusion stage.</p>
              </div> : <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                <NumberField label={gender === "male" ? "Customer chest" : "Customer bust / chest"} onChange={(value) => { setReportedChestCm(value); resetResult(); }} required={gender === "male"} value={reportedChestCm} />
                <p className="mt-2 text-[11px] leading-4 text-blue-800">{gender === "male" ? "Required by the product profile." : "Optional for women."} It is shown in the contract but never used as a saved WEAR training answer.</p>
              </div>}
              <p className="mt-4 text-sm font-black text-slate-900">Private tape checks · answer-free validation only</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberField label="Neck" onChange={(value) => setActuals((current) => ({ ...current, neck: value }))} value={actuals.neck} />
                <NumberField label={gender === "female" ? "Tape bust / chest" : "Tape chest"} onChange={(value) => setActuals((current) => ({ ...current, chest: value }))} value={actuals.chest} />
                {gender === "female" ? <NumberField label="Under-bust" onChange={(value) => setActuals((current) => ({ ...current, underbust: value }))} value={actuals.underbust} /> : null}
                <NumberField label="Natural waist" onChange={(value) => setActuals((current) => ({ ...current, waist: value }))} value={actuals.waist} />
                <NumberField label="Hips" onChange={(value) => setActuals((current) => ({ ...current, hips: value }))} value={actuals.hips} />
              </div>
            </>
          )}
          <button className={cn("mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none", testMode === "heldout-onnx" ? "bg-emerald-700 shadow-lg shadow-emerald-200" : freshMode ? "bg-cyan-700 shadow-lg shadow-cyan-200" : "bg-blue-700 shadow-lg shadow-blue-200")} disabled={!activeModelAvailable || !imageUrl || !profileReady || running || (testMode === "heldout-onnx" && !selectedHeldoutScanId)} onClick={() => void runFullTest()} type="button">
            {running ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
            {testMode === "heldout-onnx" ? running ? "Running ONNX only…" : prediction ? "Run ONNX again" : "Run ONNX only" : freshMode ? running ? runState === "apple" ? "Applying Apple + Depth Pro…" : "Running fresh ONNX…" : freshPrediction ? "Run fresh ONNX again" : "Run fresh ONNX on this photo" : stageLabel(runState)}
          </button>
          {!activeModelAvailable ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">{freshMode ? freshStatus?.error ?? "The fresh ONNX package is unavailable." : "The audited ONNX artifact is unavailable. This button unlocks automatically after a private model is installed."}</p> : null}
          {runError ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-800"><AlertTriangle className="mr-1 inline size-3.5" />{runError}</p> : null}
        </div>
      </section>

      {freshMode && freshPrediction && imageUrl && runState === "ready" ? (
        <FreshGeometryResult
          actuals={actuals}
          imageUrl={imageUrl}
          key={`${freshPrediction.model.sha256}:${lineGeometryKey(lineMapFromFreshPrediction(freshPrediction))}`}
          lineEditError={freshLineEditError}
          lineRecalibrating={freshLineRecalibrating}
          onRecalculateLines={recalculateFreshLines}
          prediction={freshPrediction}
        />
      ) : prediction && imageUrl && runState === "ready" ? (
        testMode === "heldout-onnx" && selectedHeldoutModel ? (
          <HeldoutOnnxTrainingVisual key={selectedHeldoutModel.scanId} actuals={actuals} imageSize={imageSize} imageUrl={imageUrl} model={selectedHeldoutModel} prediction={prediction} />
        ) : <>
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
          <h2 className="mt-3 text-xl font-black text-slate-900">{testMode === "heldout-onnx" ? running ? "ONNX is running" : "Choose a held-out model and run ONNX" : freshMode ? running ? "Fresh ONNX is running" : "Choose Shahnaz, Shane, or upload a photo" : stageLabel(runState)}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{testMode === "heldout-onnx" ? "The result shows predicted versus real lines, front width, depth, 32-point shape and circumference for the selected held-out person. Apple Vision is not part of this path." : freshMode ? "The fresh result will show the exact canonical silhouette, five predicted row overlays, A-to-B widths, depth, direct tape heads, all 32-point cross-sections, ratios and learned camera outputs. Normal-photo accuracy is still unproven." : "The editor will show WEAR RGB lines, separate mask and Meta comparisons, hidden-by-default saved red lines, live camera-corrected measurements, raw WEAR-trained depth, 32-point body shapes, and no ellipse controls."}</p>
        </section>
      )}
      </>}

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
