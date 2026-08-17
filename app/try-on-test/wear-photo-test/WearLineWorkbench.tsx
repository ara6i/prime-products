"use client";

import {
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Maximize2,
  Move,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/app/shared/lib/utils";
import {
  calculateCircumferenceCm,
  CIRCUMFERENCE_METHOD_OPTIONS,
  type CircumferenceMethod,
} from "../sizing-lab/lib/circumferenceMethods";
import {
  getWearReferenceSet,
  type WearReviewRowKind,
} from "./wearReferenceLines";
import type { MeshProjectedPhotoEdge } from "../sizing-lab/lib/meshShapeProviders";

interface Point {
  x: number;
  y: number;
}

interface WorkbenchRow {
  kind: string;
  label: string;
  edgeSource: "trained-model" | "mediapipe-torso-fallback";
  photo: { left: Point; right: Point };
  edgeCandidates?: {
    wear: {
      source: "trained-model" | "mediapipe-torso-fallback";
      photo: { left: Point; right: Point };
    };
    visible: {
      source: "mediapipe-torso-mask";
      photo: { left: Point; right: Point };
    } | null;
  };
}

interface WorkbenchLandmark {
  name: string;
  photo: Point;
}

interface WorkbenchSegment {
  kind: string;
  label: string;
  photo: Point[];
}

interface WorkbenchMeasurement {
  kind: string;
  valueCm: number;
}

interface WorkbenchPrediction {
  model: { version: string };
  profile: { gender: "female" | "male" };
  preprocessing: {
    rawMaskSize: [number, number];
    sourceBodyBox: { left: number; top: number; right: number; bottom: number };
  };
  measurements: WorkbenchMeasurement[];
  rows: WorkbenchRow[];
  landmarks: WorkbenchLandmark[];
  segments: WorkbenchSegment[];
  allPredictions: Array<{ key: string; value: number }>;
}

interface EditableLine {
  leftX: number;
  rightX: number;
  y: number;
}

interface GeometryResult {
  spanPx: number;
  spanFactor: number;
  widthCm: number;
  depthCm: number;
  circumferenceCm: number | null;
}

interface WearLineWorkbenchProps {
  imageUrl: string;
  imageSize: { width: number; height: number };
  selectedDatasetId: string;
  prediction: WorkbenchPrediction;
  actuals: Partial<Record<WearReviewRowKind, number | null>>;
  metaEdgeStatus: "idle" | "loading" | "ready" | "error";
  metaEdgeRows: MeshProjectedPhotoEdge[];
  metaEdgeError: string | null;
  metaEdgeElapsedMs: number | null;
  onClearPrediction: () => void;
}

type DragPart = "left" | "right" | "row";
interface DragState {
  kind: WearReviewRowKind;
  part: DragPart;
  start: Point;
  initial: EditableLine;
}
type DepthMode = "ratio" | "fixed";
type ResultUnit = "cm" | "in";
type EdgeMode = "visible-photo" | "wear-learned" | "meta-3d";

const REVIEW_KINDS: WearReviewRowKind[] = ["neck", "chest", "underbust", "waist", "hips"];
const FORMULA_METHODS = CIRCUMFERENCE_METHOD_OPTIONS.filter((option) => (
  option.available && option.value !== "meta-3d-contour" && option.value !== "real-3d-contour"
));

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function lineFromRow(row: WorkbenchRow, edgeMode: EdgeMode): EditableLine {
  const selected = edgeMode === "visible-photo"
    ? row.edgeCandidates?.visible?.photo ?? row.photo
    : row.edgeCandidates?.wear.photo ?? row.photo;
  return {
    leftX: clamp(Math.min(selected.left.x, selected.right.x)),
    rightX: clamp(Math.max(selected.left.x, selected.right.x)),
    y: clamp((selected.left.y + selected.right.y) / 2),
  };
}

function rowLabel(kind: WearReviewRowKind, gender?: "female" | "male") {
  if (kind === "underbust") return "Under-bust";
  if (kind === "waist") return "Natural waist";
  if (kind === "chest" && gender === "female") return "Bust / chest";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function formulaLabel(method: CircumferenceMethod, fallback: string) {
  if (method === "ramanujan-1") return "Ramanujan I · optional oval check";
  if (method === "ramanujan-2") return "Ramanujan II · optional oval check";
  if (method === "exact-ellipse") return "Exact ellipse · optional check";
  if (method === "rms-ellipse") return "Ellipse RMS · optional check";
  if (method === "capsule") return "Capsule · optional check";
  if (method === "superellipse") return "Superellipse · optional check";
  return fallback;
}

function formatLength(valueCm: number | null | undefined, unit: ResultUnit) {
  if (typeof valueCm !== "number" || !Number.isFinite(valueCm)) return "—";
  return unit === "in" ? `${(valueCm / 2.54).toFixed(1)} in` : `${valueCm.toFixed(1)} cm`;
}

function formatSignedLength(valueCm: number | null | undefined, unit: ResultUnit) {
  if (typeof valueCm !== "number" || !Number.isFinite(valueCm)) return "not available";
  const converted = unit === "in" ? valueCm / 2.54 : valueCm;
  return `${converted >= 0 ? "+" : ""}${converted.toFixed(1)} ${unit}`;
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-semibold transition",
        active
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      )}
      onClick={onClick}
      type="button"
    >
      {active ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
      {label}
    </button>
  );
}

export function WearLineWorkbench({
  imageUrl,
  imageSize,
  selectedDatasetId,
  prediction,
  actuals,
  metaEdgeStatus,
  metaEdgeRows,
  metaEdgeError,
  metaEdgeElapsedMs,
  onClearPrediction,
}: WearLineWorkbenchProps) {
  const edgeLines = useMemo(() => {
    const wear: Partial<Record<WearReviewRowKind, EditableLine>> = {};
    const visible: Partial<Record<WearReviewRowKind, EditableLine>> = {};
    const meta: Partial<Record<WearReviewRowKind, EditableLine>> = {};
    for (const row of prediction.rows) {
      if (REVIEW_KINDS.includes(row.kind as WearReviewRowKind)) {
        const kind = row.kind as WearReviewRowKind;
        wear[kind] = lineFromRow(row, "wear-learned");
        visible[kind] = lineFromRow(row, "visible-photo");
      }
    }
    for (const row of metaEdgeRows) {
      meta[row.kind] = {
        leftX: clamp(row.leftXNorm),
        rightX: clamp(row.rightXNorm),
        y: clamp(row.yNorm),
      };
    }
    return { "wear-learned": wear, "visible-photo": visible, "meta-3d": meta };
  }, [metaEdgeRows, prediction.rows]);
  const wearModelLines = edgeLines["wear-learned"];
  const visiblePhotoLines = edgeLines["visible-photo"];
  const metaMeshLines = edgeLines["meta-3d"];
  const availableKinds = REVIEW_KINDS.filter((kind) => wearModelLines[kind] || visiblePhotoLines[kind] || metaMeshLines[kind]);
  const [activeKind, setActiveKind] = useState<WearReviewRowKind>(() => (
    wearModelLines.chest ? "chest" : availableKinds[0] ?? "waist"
  ));
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("visible-photo");
  const [editableLinesByMode, setEditableLinesByMode] = useState<Record<EdgeMode, Partial<Record<WearReviewRowKind, EditableLine>>>>(() => ({
    "visible-photo": visiblePhotoLines,
    "wear-learned": wearModelLines,
    "meta-3d": metaMeshLines,
  }));
  const [showReferences, setShowReferences] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showSegments, setShowSegments] = useState(true);
  const [showHeightGuide, setShowHeightGuide] = useState(false);
  const [lineVisibility, setLineVisibility] = useState<Record<WearReviewRowKind, boolean>>({
    neck: true,
    chest: true,
    underbust: true,
    waist: true,
    hips: true,
  });
  const [depthMode, setDepthMode] = useState<DepthMode>("ratio");
  const [depthMultiplier, setDepthMultiplier] = useState(1);
  const [circumferenceMethod, setCircumferenceMethod] = useState<CircumferenceMethod>("ramanujan-1");
  const [superellipseExponent, setSuperellipseExponent] = useState(2.5);
  const [resultUnit, setResultUnit] = useState<ResultUnit>("cm");
  const [zoom, setZoom] = useState(0.5);
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);

  const referenceSet = useMemo(
    () => getWearReferenceSet(selectedDatasetId, imageUrl),
    [imageUrl, selectedDatasetId],
  );

  useEffect(() => {
    if (!expanded) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const sourceLines = edgeLines[edgeMode];
  const editableLines = edgeMode === "meta-3d"
    ? { ...sourceLines, ...editableLinesByMode[edgeMode] }
    : editableLinesByMode[edgeMode];
  const activeSourceLine = sourceLines[activeKind] ?? null;
  const activeWearModelLine = wearModelLines[activeKind] ?? null;
  const activeVisiblePhotoLine = visiblePhotoLines[activeKind] ?? null;
  const activeMetaMeshLine = metaMeshLines[activeKind] ?? null;
  const activeLine = editableLines[activeKind] ?? activeSourceLine;
  const activeRow = prediction.rows.find((row) => row.kind === activeKind) ?? null;
  const activeVisibleEdgeAvailable = Boolean(activeRow?.edgeCandidates?.visible);
  const visibleSourceSpanPx = activeVisiblePhotoLine
    ? (activeVisiblePhotoLine.rightX - activeVisiblePhotoLine.leftX) * imageSize.width
    : null;
  const wearSourceSpanPx = activeWearModelLine
    ? (activeWearModelLine.rightX - activeWearModelLine.leftX) * imageSize.width
    : null;
  const metaSourceSpanPx = activeMetaMeshLine
    ? (activeMetaMeshLine.rightX - activeMetaMeshLine.leftX) * imageSize.width
    : null;
  const activeReferenceLine = referenceSet?.lines[activeKind] ?? null;
  const edgeReferenceMetric = (line: EditableLine | null) => {
    if (!line || !activeReferenceLine) return null;
    const referenceSpanPx = Math.max(
      1,
      (activeReferenceLine.rightX - activeReferenceLine.leftX) * imageSize.width,
    );
    const lineSpanPx = (line.rightX - line.leftX) * imageSize.width;
    const leftErrorPx = (line.leftX - activeReferenceLine.leftX) * imageSize.width;
    const rightErrorPx = (line.rightX - activeReferenceLine.rightX) * imageSize.width;
    const endpointMaePx = (Math.abs(leftErrorPx) + Math.abs(rightErrorPx)) / 2;
    return {
      endpointMaePx,
      endpointMaePct: endpointMaePx / referenceSpanPx * 100,
      spanDifferencePct: (lineSpanPx - referenceSpanPx) / referenceSpanPx * 100,
      yDifferencePx: (line.y - activeReferenceLine.y) * imageSize.height,
    };
  };
  const visibleReferenceMetric = edgeReferenceMetric(activeVisiblePhotoLine);
  const wearReferenceMetric = edgeReferenceMetric(activeWearModelLine);
  const metaReferenceMetric = edgeReferenceMetric(activeMetaMeshLine);
  const directMeasurement = prediction.measurements.find((row) => row.kind === activeKind)?.valueCm ?? null;
  const targetValue = (suffix: string) => prediction.allPredictions.find(
    (item) => item.key === `row.${activeKind}.${suffix}`,
  )?.value ?? null;
  const modelWidthCm = targetValue("visible_width_cm");
  const modelDepthCm = targetValue("depth_cm");
  const modelDepthRatio = targetValue("depth_ratio")
    ?? (modelWidthCm && modelDepthCm ? modelDepthCm / modelWidthCm : null);

  const geometryForLine = (line: EditableLine | null, applyDepthAdjustment: boolean): GeometryResult | null => {
    if (!line || !activeWearModelLine || !modelWidthCm || !modelDepthCm || !modelDepthRatio) return null;
    const modelSpan = activeWearModelLine.rightX - activeWearModelLine.leftX;
    if (modelSpan <= 0) return null;
    const lineSpan = Math.max(0.005, line.rightX - line.leftX);
    const spanFactor = lineSpan / modelSpan;
    const widthCm = modelWidthCm * spanFactor;
    const baseDepth = depthMode === "ratio" ? widthCm * modelDepthRatio : modelDepthCm;
    const depthCm = baseDepth * (applyDepthAdjustment ? depthMultiplier : 1);
    return {
      spanPx: lineSpan * imageSize.width,
      spanFactor,
      widthCm,
      depthCm,
      circumferenceCm: calculateCircumferenceCm(
        widthCm,
        depthCm,
        circumferenceMethod,
        superellipseExponent,
      ),
    };
  };

  const activeGeometry = geometryForLine(activeLine, true);
  const actual = actuals[activeKind] ?? null;
  const isEdited = Boolean(activeLine && activeSourceLine && (
    Math.abs(activeLine.leftX - activeSourceLine.leftX) > 0.0001
    || Math.abs(activeLine.rightX - activeSourceLine.rightX) > 0.0001
    || Math.abs(activeLine.y - activeSourceLine.y) > 0.0001
  ));
  const displayedResultCm = isEdited
    ? activeGeometry?.circumferenceCm ?? directMeasurement
    : directMeasurement;
  const displayedDifferenceCm = actual == null || displayedResultCm == null
    ? null
    : displayedResultCm - actual;

  const persistentResultForKind = (kind: WearReviewRowKind) => {
    const sourceLine = sourceLines[kind] ?? null;
    const currentLine = editableLines[kind] ?? sourceLine;
    const wearLine = wearModelLines[kind] ?? null;
    const direct = prediction.measurements.find((row) => row.kind === kind)?.valueCm ?? null;
    const modelTarget = (suffix: string) => prediction.allPredictions.find(
      (item) => item.key === `row.${kind}.${suffix}`,
    )?.value ?? null;
    const widthCm = modelTarget("visible_width_cm");
    const depthCm = modelTarget("depth_cm");
    const depthRatio = modelTarget("depth_ratio")
      ?? (widthCm && depthCm ? depthCm / widthCm : null);
    const edited = Boolean(currentLine && sourceLine && (
      Math.abs(currentLine.leftX - sourceLine.leftX) > 0.0001
      || Math.abs(currentLine.rightX - sourceLine.rightX) > 0.0001
      || Math.abs(currentLine.y - sourceLine.y) > 0.0001
    ));
    let resultCm = direct;
    if (edited && currentLine && wearLine && widthCm && depthCm && depthRatio) {
      const wearSpan = wearLine.rightX - wearLine.leftX;
      if (wearSpan > 0) {
        const editedWidthCm = widthCm * Math.max(0.005, currentLine.rightX - currentLine.leftX) / wearSpan;
        const editedDepthCm = (depthMode === "ratio" ? editedWidthCm * depthRatio : depthCm) * depthMultiplier;
        resultCm = calculateCircumferenceCm(
          editedWidthCm,
          editedDepthCm,
          circumferenceMethod,
          superellipseExponent,
        ) ?? direct;
      }
    }
    const datasetCm = actuals[kind] ?? null;
    return {
      kind,
      resultCm,
      datasetCm,
      differenceCm: datasetCm == null || resultCm == null ? null : resultCm - datasetCm,
      edited,
    };
  };

  const persistentResults = (["waist", "hips"] as WearReviewRowKind[])
    .filter((kind) => availableKinds.includes(kind))
    .map(persistentResultForKind);

  const updateActiveLine = (patch: Partial<EditableLine>) => {
    setEditableLinesByMode((current) => {
      const currentModeLines = current[edgeMode];
      const existing = currentModeLines[activeKind] ?? sourceLines[activeKind];
      if (!existing) return current;
      const next = { ...existing, ...patch };
      next.leftX = clamp(Math.min(next.leftX, next.rightX - 0.01));
      next.rightX = clamp(Math.max(next.rightX, next.leftX + 0.01));
      next.y = clamp(next.y);
      return { ...current, [edgeMode]: { ...currentModeLines, [activeKind]: next } };
    });
  };

  const beginDrag = (
    event: ReactPointerEvent<SVGElement>,
    part: DragPart,
    kind: WearReviewRowKind = activeKind,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const initial = editableLines[kind] ?? sourceLines[kind];
    const ownerSvg = event.currentTarget.ownerSVGElement;
    const bounds = ownerSvg?.getBoundingClientRect();
    if (!initial || !bounds || !ownerSvg) return;
    ownerSvg.setPointerCapture(event.pointerId);
    setActiveKind(kind);
    setDrag({
      kind,
      part,
      initial,
      start: {
        x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)),
        y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)),
      },
    });
  };

  const pointerPosition = (event: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)),
      y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)),
    };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const point = pointerPosition(event);
    setEditableLinesByMode((current) => {
      const currentModeLines = current[edgeMode];
      const existing = currentModeLines[drag.kind] ?? sourceLines[drag.kind];
      if (!existing) return current;
      if (drag.part === "left") {
        return {
          ...current,
          [edgeMode]: {
            ...currentModeLines,
            [drag.kind]: {
              ...existing,
              leftX: clamp(Math.min(point.x, existing.rightX - 0.01)),
              y: point.y,
            },
          },
        };
      }
      if (drag.part === "right") {
        return {
          ...current,
          [edgeMode]: {
            ...currentModeLines,
            [drag.kind]: {
              ...existing,
              rightX: clamp(Math.max(point.x, existing.leftX + 0.01)),
              y: point.y,
            },
          },
        };
      }
      const requestedDx = point.x - drag.start.x;
      const dx = clamp(requestedDx, -drag.initial.leftX, 1 - drag.initial.rightX);
      return {
        ...current,
        [edgeMode]: {
          ...currentModeLines,
          [drag.kind]: {
            leftX: drag.initial.leftX + dx,
            rightX: drag.initial.rightX + dx,
            y: clamp(drag.initial.y + point.y - drag.start.y),
          },
        },
      };
    });
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
  };

  const resetActive = () => {
    if (!sourceLines[activeKind]) return;
    setEditableLinesByMode((current) => ({
      ...current,
      [edgeMode]: { ...current[edgeMode], [activeKind]: sourceLines[activeKind] },
    }));
    setDepthMultiplier(1);
  };

  const resetAll = () => {
    setEditableLinesByMode((current) => ({ ...current, [edgeMode]: sourceLines }));
    setDepthMultiplier(1);
  };

  const bodyBox = prediction.preprocessing.sourceBodyBox;
  const [maskWidth, maskHeight] = prediction.preprocessing.rawMaskSize;
  const heightGuide = {
    x: clamp((bodyBox.left - Math.max(8, (bodyBox.right - bodyBox.left) * 0.12)) / Math.max(1, maskWidth - 1)),
    top: clamp(bodyBox.top / Math.max(1, maskHeight - 1)),
    bottom: clamp(bodyBox.bottom / Math.max(1, maskHeight - 1)),
  };
  const edgeVisual = edgeMode === "visible-photo"
    ? { active: "#0891b2", inactive: "#22d3ee", original: "#67e8f9", label: "Visible photo edge" }
    : edgeMode === "wear-learned"
      ? { active: "#2563eb", inactive: "#60a5fa", original: "#93c5fd", label: "WEAR learned body edge" }
      : { active: "#7c3aed", inactive: "#a78bfa", original: "#c4b5fd", label: "Meta 3D body edge" };
  const renderEditorToolbar = (showFullscreenButton: boolean) => (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-white p-2 text-slate-900">
      <button
        aria-label="Zoom out"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={zoom <= 0.5}
        onClick={() => setZoom((value) => clamp(value - 0.1, 0.5, 2.5))}
        title="Zoom out"
        type="button"
      >
        <ZoomOut className="size-4" aria-hidden />
      </button>
      <input
        aria-label="WEAR image zoom"
        className="h-2 min-w-36 flex-1 accent-red-600"
        max="2.5"
        min="0.5"
        onChange={(event) => setZoom(Number(event.target.value))}
        step="0.05"
        type="range"
        value={zoom}
      />
      <button
        aria-label="Zoom in"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={zoom >= 2.5}
        onClick={() => setZoom((value) => clamp(value + 0.1, 0.5, 2.5))}
        title="Zoom in"
        type="button"
      >
        <ZoomIn className="size-4" aria-hidden />
      </button>
      <button
        aria-label="Reset zoom"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={zoom === 0.5}
        onClick={() => setZoom(0.5)}
        title="Reset zoom"
        type="button"
      >
        <RotateCcw className="size-4" aria-hidden />
      </button>
      <span className="min-w-12 text-right font-mono text-[11px] font-semibold text-red-900">{Math.round(zoom * 100)}%</span>
      <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
        {availableKinds.map((kind) => (
          <button
            className={cn(
              "rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-50",
              activeKind === kind ? "bg-red-50 ring-1 ring-red-300" : "bg-white",
              !lineVisibility[kind] && "opacity-45",
            )}
            key={kind}
            onClick={() => setActiveKind(kind)}
            type="button"
          >
            {rowLabel(kind, prediction.profile.gender)}
          </button>
        ))}
        {showFullscreenButton ? (
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[11px] font-semibold text-red-800 hover:bg-red-50"
            onClick={() => setExpanded(true)}
            type="button"
          >
            <Maximize2 className="size-3.5" aria-hidden />
            Full screen
          </button>
        ) : null}
      </div>
    </div>
  );

  const renderImageViewport = (mode: "normal" | "fullscreen") => (
    <div
      className={cn(
        "overflow-auto rounded-lg border border-red-200 bg-black",
        mode === "fullscreen" ? "min-h-0 flex-1" : "max-h-[62vh]",
      )}
      data-testid={`wear-image-viewport-${mode}`}
    >
      <div className="relative bg-black" style={{ maxWidth: "none", width: `${zoom * 100}%` }}>
          {/* Test Lab supports blob/data URLs, so a normal image element is required. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Person with editable WEAR body lines" className="block h-auto w-full select-none" draggable={false} src={imageUrl} />
          <svg
            aria-label="Editable WEAR and saved dataset body lines"
            className="absolute inset-0 size-full touch-none"
            onPointerCancel={endDrag}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            preserveAspectRatio="none"
            viewBox="0 0 1000 1000"
          >
            {showHeightGuide ? (
              <g pointerEvents="none">
                <line stroke="#facc15" strokeWidth="4" vectorEffect="non-scaling-stroke" x1={heightGuide.x * 1000} x2={heightGuide.x * 1000} y1={heightGuide.top * 1000} y2={heightGuide.bottom * 1000} />
                <line stroke="#facc15" strokeWidth="3" vectorEffect="non-scaling-stroke" x1={(heightGuide.x - 0.012) * 1000} x2={(heightGuide.x + 0.012) * 1000} y1={heightGuide.top * 1000} y2={heightGuide.top * 1000} />
                <line stroke="#facc15" strokeWidth="3" vectorEffect="non-scaling-stroke" x1={(heightGuide.x - 0.012) * 1000} x2={(heightGuide.x + 0.012) * 1000} y1={heightGuide.bottom * 1000} y2={heightGuide.bottom * 1000} />
              </g>
            ) : null}

            {showLandmarks ? prediction.landmarks.map((landmark) => (
              <circle cx={landmark.photo.x * 1000} cy={landmark.photo.y * 1000} fill="#f8fafc" key={landmark.name} pointerEvents="none" r="3.5" stroke="#0891b2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            )) : null}

            {showSegments ? prediction.segments.map((segment) => (
              <polyline
                fill="none"
                key={segment.kind}
                points={segment.photo.map((point) => `${point.x * 1000},${point.y * 1000}`).join(" ")}
                pointerEvents="none"
                stroke="#22c55e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            )) : null}

            {showReferences ? Object.values(referenceSet?.lines ?? {}).map((line) => line ? (
              <g key={`reference-${line.kind}`} pointerEvents="none">
                <line stroke="rgba(15,23,42,0.85)" strokeLinecap="round" strokeWidth="8" vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                <line stroke="#ef4444" strokeLinecap="round" strokeWidth="4" vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
              </g>
            ) : null) : null}

            {availableKinds.filter((kind) => lineVisibility[kind]).map((kind) => {
              const line = editableLines[kind] ?? sourceLines[kind];
              if (!line) return null;
              const selected = kind === activeKind;
              const original = sourceLines[kind];
              const kindEdited = Boolean(original && (
                Math.abs(line.leftX - original.leftX) > 0.0001
                || Math.abs(line.rightX - original.rightX) > 0.0001
                || Math.abs(line.y - original.y) > 0.0001
              ));
              return (
                <g key={`wear-${kind}`}>
                  {selected && kindEdited && original ? (
                    <line pointerEvents="none" stroke={edgeVisual.original} strokeDasharray="7 6" strokeWidth="3" vectorEffect="non-scaling-stroke" x1={original.leftX * 1000} x2={original.rightX * 1000} y1={original.y * 1000} y2={original.y * 1000} />
                  ) : null}
                  <line cursor="move" onPointerDown={(event) => beginDrag(event, "row", kind)} stroke="rgba(15,23,42,0.82)" strokeLinecap="round" strokeWidth={selected ? 8 : 6} vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  <line cursor="move" onPointerDown={(event) => beginDrag(event, "row", kind)} stroke={selected ? edgeVisual.active : edgeVisual.inactive} strokeLinecap="round" strokeWidth={selected ? 4 : 3} vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  {selected ? (
                    <>
                      <circle aria-label={`${rowLabel(kind, prediction.profile.gender)} left endpoint drag area`} className="cursor-ew-resize" cx={line.leftX * 1000} cy={line.y * 1000} data-testid="wear-edge-left-hit-area" fill="transparent" onPointerDown={(event) => beginDrag(event, "left", kind)} pointerEvents="all" r="20" />
                      <circle aria-label={`${rowLabel(kind, prediction.profile.gender)} row drag area`} className="cursor-move" cx={(line.leftX + line.rightX) / 2 * 1000} cy={line.y * 1000} data-testid="wear-edge-center-hit-area" fill="transparent" onPointerDown={(event) => beginDrag(event, "row", kind)} pointerEvents="all" r="20" />
                      <circle aria-label={`${rowLabel(kind, prediction.profile.gender)} right endpoint drag area`} className="cursor-ew-resize" cx={line.rightX * 1000} cy={line.y * 1000} data-testid="wear-edge-right-hit-area" fill="transparent" onPointerDown={(event) => beginDrag(event, "right", kind)} pointerEvents="all" r="20" />
                    </>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
  );

  const renderLineSelector = (compact = false) => (
    <div className={cn("border border-gray-200 bg-slate-50", compact ? "rounded-lg p-3" : "rounded-2xl p-4")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">1 · Pick a line</p>
        <span className="text-[10px] font-bold text-slate-500">Eye = optional</span>
      </div>
      <div className={cn("mt-3 grid grid-cols-2 gap-2", !compact && "sm:grid-cols-3 xl:grid-cols-2")}>
        {availableKinds.map((kind) => (
          <div className="flex min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white" key={kind}>
            <button
              className={cn(
                "min-w-0 flex-1 px-2.5 py-2 text-left text-xs font-black transition",
                activeKind === kind ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50",
                !lineVisibility[kind] && "opacity-55",
              )}
              onClick={() => setActiveKind(kind)}
              type="button"
            >
              <span className="block truncate">{rowLabel(kind, prediction.profile.gender)}</span>
              {kind === "chest" ? (
                <span className={cn("mt-0.5 block text-[9px]", activeKind === kind ? "text-blue-100" : "text-slate-400")}>
                  {prediction.profile.gender === "female" ? "optional for women" : "required for men"}
                </span>
              ) : null}
            </button>
            <button
              aria-label={kind === "chest" && prediction.profile.gender === "male"
                ? "Chest line required for men"
                : `${lineVisibility[kind] ? "Hide" : "Show"} ${rowLabel(kind, prediction.profile.gender)} line`}
              className={cn(
                "grid w-9 place-items-center border-l",
                activeKind === kind ? "border-blue-500 bg-blue-700 text-white" : "border-gray-200 text-slate-500 hover:bg-slate-50",
                kind === "chest" && prediction.profile.gender === "male" && "cursor-not-allowed opacity-70",
              )}
              disabled={kind === "chest" && prediction.profile.gender === "male"}
              onClick={() => setLineVisibility((current) => ({ ...current, [kind]: !current[kind] }))}
              type="button"
            >
              {kind === "chest" && prediction.profile.gender === "male"
                ? <Lock className="size-3.5" aria-hidden />
                : lineVisibility[kind] ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-gray-50" onClick={resetActive} type="button"><RotateCcw className="size-3.5" aria-hidden />Reset line</button>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-gray-50" onClick={resetAll} type="button">Reset all</button>
      </div>
    </div>
  );

  const renderExactLineControls = (compact = false) => activeLine ? (
    <div className={cn("border border-gray-200 bg-white", compact ? "rounded-lg p-3" : "rounded-2xl p-4")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">2 · Exact line controls</p>
        <span className={cn("rounded-full px-2 py-1 text-[10px] font-black", isEdited ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800")}>{isEdited ? "edited" : "source original"}</span>
      </div>
      {!lineVisibility[activeKind] ? (
        <button className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800" onClick={() => setLineVisibility((current) => ({ ...current, [activeKind]: true }))} type="button">Show this optional line</button>
      ) : null}
      <div className={cn("mt-4", compact ? "space-y-3" : "space-y-4")}>
        <label className="block text-xs font-bold text-slate-700">
          Vertical position · {(activeLine.y * 100).toFixed(1)}%
          <input className="mt-2 w-full accent-blue-600" max="0.95" min="0.05" onChange={(event) => updateActiveLine({ y: Number(event.target.value) })} step="0.001" type="range" value={activeLine.y} />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Left edge · {(activeLine.leftX * imageSize.width).toFixed(0)} px
          <input className="mt-2 w-full accent-blue-600" max={Math.max(0, activeLine.rightX - 0.01)} min="0" onChange={(event) => updateActiveLine({ leftX: Number(event.target.value) })} step="0.001" type="range" value={activeLine.leftX} />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Right edge · {(activeLine.rightX * imageSize.width).toFixed(0)} px
          <input className="mt-2 w-full accent-blue-600" max="1" min={Math.min(1, activeLine.leftX + 0.01)} onChange={(event) => updateActiveLine({ rightX: Number(event.target.value) })} step="0.001" type="range" value={activeLine.rightX} />
        </label>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-500"><Move className="mt-0.5 size-3.5 shrink-0" aria-hidden />Drag either end in any direction. Drag the middle to move the whole line left/right/up/down.</p>
    </div>
  ) : null;

  const renderEdgeModeControls = () => (
    <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3" data-testid="wear-edge-mode-controls">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-900">How row edges are selected</p>
          <p className="mt-1 text-[10px] leading-4 text-cyan-900">Same WEAR row height; compare three independent left/right edge sources.</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-black text-cyan-800">3 modes</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          aria-pressed={edgeMode === "visible-photo"}
          className={cn(
            "rounded-lg border p-2 text-left transition",
            edgeMode === "visible-photo"
              ? "border-cyan-600 bg-cyan-700 text-white shadow-sm"
              : "border-cyan-200 bg-white text-slate-700 hover:border-cyan-400",
          )}
          data-testid="wear-edge-mode-visible"
          onClick={() => setEdgeMode("visible-photo")}
          type="button"
        >
          <span className="block text-[11px] font-black">Visible photo edge</span>
          <span className={cn("mt-1 block text-[9px] leading-3.5", edgeMode === "visible-photo" ? "text-cyan-50" : "text-slate-500")}>Torso-only mask · arms removed</span>
        </button>
        <button
          aria-pressed={edgeMode === "wear-learned"}
          className={cn(
            "rounded-lg border p-2 text-left transition",
            edgeMode === "wear-learned"
              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
              : "border-blue-200 bg-white text-slate-700 hover:border-blue-400",
          )}
          data-testid="wear-edge-mode-learned"
          onClick={() => setEdgeMode("wear-learned")}
          type="button"
        >
          <span className="block text-[11px] font-black">WEAR learned body edge</span>
          <span className={cn("mt-1 block text-[9px] leading-3.5", edgeMode === "wear-learned" ? "text-blue-50" : "text-slate-500")}>v5 trained edge · mask-assisted</span>
        </button>
        <button
          aria-pressed={edgeMode === "meta-3d"}
          className={cn(
            "rounded-lg border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
            edgeMode === "meta-3d"
              ? "border-violet-700 bg-violet-700 text-white shadow-sm"
              : "border-violet-200 bg-white text-slate-700 hover:border-violet-400",
          )}
          data-testid="wear-edge-mode-meta"
          disabled={metaEdgeStatus !== "ready" || metaEdgeRows.length === 0}
          onClick={() => setEdgeMode("meta-3d")}
          type="button"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-black">
            {metaEdgeStatus === "loading" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
            Meta 3D body edge
          </span>
          <span className={cn("mt-1 block text-[9px] leading-3.5", edgeMode === "meta-3d" ? "text-violet-50" : "text-slate-500")}>
            {metaEdgeStatus === "loading"
              ? "building local mesh…"
              : metaEdgeStatus === "ready"
                ? `projected mesh · ${metaEdgeElapsedMs == null ? "ready" : `${(metaEdgeElapsedMs / 1000).toFixed(1)} s`}`
                : metaEdgeStatus === "error" ? "Meta unavailable" : "waiting for model run"}
          </span>
        </button>
      </div>
      <div className="mt-2 rounded-md border border-white/80 bg-white/80 px-2 py-2 text-[10px] leading-4 text-slate-600" role="status">
        <strong className="text-slate-900">Active: {edgeVisual.label}.</strong>{" "}
        {edgeMode === "visible-photo"
          ? activeVisibleEdgeAvailable
            ? "This follows the central visible torso and ignores arm pixels."
            : "A clean torso mask was unavailable, so this row uses the WEAR fallback."
          : edgeMode === "wear-learned"
            ? "This predicts the body edge learned from WEAR 3D bodies; v5 still receives the photo mask."
            : "This keeps WEAR’s exact row height and uses the projected closed Meta torso slice only for left/right edges."}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 font-mono text-[9px] sm:grid-cols-3">
        <div className="rounded-md bg-white px-2 py-1.5 text-cyan-800">Photo edge · {visibleSourceSpanPx == null ? "—" : `${visibleSourceSpanPx.toFixed(0)} px`}</div>
        <div className="rounded-md bg-white px-2 py-1.5 text-blue-800">WEAR edge · {wearSourceSpanPx == null ? "—" : `${wearSourceSpanPx.toFixed(0)} px`}</div>
        <div className="rounded-md bg-white px-2 py-1.5 text-violet-800">Meta edge · {metaSourceSpanPx == null ? "—" : `${metaSourceSpanPx.toFixed(0)} px`}</div>
      </div>
      {activeReferenceLine ? (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2" data-testid="wear-edge-reference-check">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black text-red-950">Your saved true-edge check · same WEAR row</p>
            <span className="font-mono text-[9px] text-red-800">
              reference span {((activeReferenceLine.rightX - activeReferenceLine.leftX) * imageSize.width).toFixed(0)} px
            </span>
          </div>
          <p className="mt-1 text-[9px] leading-4 text-red-800">Endpoint error compares only left/right placement. It does not test hidden front-to-back depth.</p>
          <div className="mt-2 grid grid-cols-1 gap-1.5 font-mono text-[9px] sm:grid-cols-3">
            {[
              ["Photo", visibleReferenceMetric, "text-cyan-800"],
              ["WEAR", wearReferenceMetric, "text-blue-800"],
              ["Meta", metaReferenceMetric, "text-violet-800"],
            ].map(([label, metric, color]) => {
              const value = metric as ReturnType<typeof edgeReferenceMetric>;
              return (
                <div className={cn("rounded bg-white px-2 py-1.5", color as string)} key={label as string}>
                  <span className="font-black">{label as string}</span>
                  {value ? (
                    <span> · endpoint {value.endpointMaePx.toFixed(1)} px ({value.endpointMaePct.toFixed(1)}%) · span {value.spanDifferencePct >= 0 ? "+" : ""}{value.spanDifferencePct.toFixed(1)}% · row {value.yDifferencePx >= 0 ? "+" : ""}{value.yDifferencePx.toFixed(1)} px</span>
                  ) : <span> · unavailable</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {metaEdgeError ? <p className="mt-2 text-[9px] leading-4 text-red-700">Meta: {metaEdgeError}</p> : null}
      <p className="mt-2 text-[9px] leading-4 text-amber-800">WEAR v5 passed synthetic WEAR tests only; it is not real-photo validated. Meta is a separate RGB-to-3D model: MediaPipe supplies only a rough crop here, not Meta’s body edge.</p>
    </div>
  );

  const renderPersistentResults = (surface: "summary" | "panel" = "summary") => (
    <div
      className={cn(surface === "summary" && "rounded-lg border border-slate-200 bg-white p-3")}
      data-testid={surface === "summary" ? "wear-persistent-results" : "wear-persistent-results-panel"}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">Waist + hips</p>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Always visible</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {persistentResults.map((item) => (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={item.kind}>
            <p className="text-[10px] font-semibold text-slate-500">{rowLabel(item.kind, prediction.profile.gender)}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-950">{formatLength(item.resultCm, resultUnit)}</p>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500">
              <span>Dataset {formatLength(item.datasetCm, resultUnit)}</span>
              <span className={cn(
                item.differenceCm == null ? "text-slate-400" : Math.abs(item.differenceCm) <= 3 ? "text-emerald-700" : "text-amber-700",
              )}>
                {formatSignedLength(item.differenceCm, resultUnit)}
              </span>
            </div>
            {item.edited ? <p className="mt-1 text-[9px] font-semibold text-indigo-700">Live edited line</p> : null}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMeasurementPanel = (showPersistentResults = true) => (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Circumference result vs dataset</h3>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          Dataset is the saved tape answer. The direct width, depth and circumference come from WEAR 3D v5; the active row edge comes from the mode below.
        </p>
        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
          Result unit
          <select
            aria-label="Result unit"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            onChange={(event) => setResultUnit(event.target.value as ResultUnit)}
            value={resultUnit}
          >
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </label>
      </div>

      {renderEdgeModeControls()}

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,1.15fr)] items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div>
          <p className="text-xs font-medium text-slate-800">How WEAR 3D gets body depth</p>
          <p className="text-[10px] leading-4 text-emerald-800">Both choices use v5 training outputs.</p>
        </div>
        <select
          aria-label="WEAR 3D depth method"
          className="min-w-0 rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-xs text-slate-800"
          onChange={(event) => setDepthMode(event.target.value as DepthMode)}
          value={depthMode}
        >
          <option value="ratio">Trained depth ratio</option>
          <option value="fixed">Trained depth cm</option>
        </select>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-800">Numbers from WEAR 3D v5</p>
            <p className="mt-0.5 text-[10px] leading-4 text-blue-800">Meta can supply an optional edge overlay; the measurement and depth numbers below remain WEAR v5.</p>
          </div>
          <span className="rounded-full bg-blue-600 px-2 py-1 text-[9px] font-black text-white">v5</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-white p-2"><p className="text-[9px] uppercase text-slate-500">Direct answer</p><p className="mt-1 text-sm font-semibold text-slate-950">{formatLength(directMeasurement, resultUnit)}</p></div>
          <div className="rounded-md bg-white p-2"><p className="text-[9px] uppercase text-slate-500">WEAR width</p><p className="mt-1 text-sm font-semibold text-slate-950">{formatLength(modelWidthCm, resultUnit)}</p></div>
          <div className="rounded-md bg-white p-2"><p className="text-[9px] uppercase text-slate-500">Trained depth</p><p className="mt-1 text-sm font-semibold text-slate-950">{formatLength(modelDepthCm, resultUnit)}</p></div>
          <div className="rounded-md bg-white p-2"><p className="text-[9px] uppercase text-slate-500">Depth ratio</p><p className="mt-1 text-sm font-semibold text-slate-950">{modelDepthRatio == null ? "—" : modelDepthRatio.toFixed(3)}</p></div>
        </div>
      </div>

      {showPersistentResults ? renderPersistentResults("panel") : null}

      <p className="text-[11px] leading-4 text-slate-500">Waist and hips stay visible above. Pick another row only when you want its detailed geometry.</p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">{rowLabel(activeKind, prediction.profile.gender)}</p>
          <span className={cn(
            "rounded-full px-2 py-1 text-[9px] font-semibold",
            edgeMode === "wear-learned"
              ? "bg-blue-100 text-blue-800"
              : edgeMode === "meta-3d" ? "bg-violet-100 text-violet-800" : "bg-cyan-100 text-cyan-800",
          )}>
            {edgeMode === "wear-learned"
              ? activeRow?.edgeSource === "trained-model" ? "WEAR learned edge" : "WEAR fallback edge"
              : edgeMode === "meta-3d" ? "Meta projected body edge" : "visible torso edge"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 font-mono">
          <div><p className="text-[9px] text-slate-400">Dataset</p><p className="mt-1 text-sm text-slate-900">{formatLength(actual, resultUnit)}</p></div>
          <div><p className="text-[9px] text-slate-400">Our result</p><p className="mt-1 text-sm text-slate-900">{formatLength(displayedResultCm, resultUnit)}</p><p className="mt-1 text-[8px] text-slate-400">{isEdited ? "edited-line check" : "direct v5 answer"}</p></div>
          <div><p className="text-[9px] text-slate-400">Difference</p><p className={cn("mt-1 text-sm", displayedDifferenceCm == null ? "text-slate-500" : Math.abs(displayedDifferenceCm) <= 3 ? "text-emerald-700" : "text-amber-700")}>{formatSignedLength(displayedDifferenceCm, resultUnit)}</p></div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md border border-sky-200 bg-sky-50 px-2 py-2 text-[10px] text-sky-800">
          <span>{edgeVisual.label} · front span</span>
          <span className="font-mono font-semibold">{activeGeometry ? `${activeGeometry.spanPx.toFixed(0)} px` : "—"}</span>
        </div>
        <div className="mt-3 rounded-md border border-indigo-200 bg-white p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium text-indigo-950">Exact WEAR geometry used</p>
              <p className="text-[9px] leading-4 text-indigo-700">Width follows the active endpoints. Depth starts from trained v5.</p>
            </div>
            {isEdited ? <button className="text-[9px] font-semibold text-indigo-700 hover:underline" onClick={resetActive} type="button">Reset</button> : null}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-sky-200 bg-sky-50 p-2"><p className="text-[9px] text-sky-700">Breadth · side to side</p><p className="mt-1 font-mono text-sm text-slate-900">{formatLength(activeGeometry?.widthCm, resultUnit)}</p></div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2"><p className="text-[9px] text-emerald-700">Depth · front to back</p><p className="mt-1 font-mono text-sm text-slate-900">{formatLength(activeGeometry?.depthCm, resultUnit)}</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLayerControls = () => (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-800">WEAR 3D layers</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">Cyan is visible torso edge; blue is WEAR learned edge; violet is Meta 3D. Saved red dataset lines stay hidden until you turn them on.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ToggleButton active={showReferences} label="Saved red lines" onClick={() => setShowReferences((value) => !value)} />
        <ToggleButton active={showLandmarks} label="73 landmarks" onClick={() => setShowLandmarks((value) => !value)} />
        <ToggleButton active={showSegments} label="Shoulder / limbs" onClick={() => setShowSegments((value) => !value)} />
        <ToggleButton active={showHeightGuide} label="Height guide" onClick={() => setShowHeightGuide((value) => !value)} />
      </div>
    </div>
  );

  const renderFormulaControls = (compact = false) => (
    <div className={cn("border border-slate-200 bg-white", compact ? "rounded-lg p-3" : "rounded-xl p-4")}>
      <p className="text-xs font-semibold text-slate-800">Edited-line live calculator</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">The original answer is learned directly. After you move an endpoint, this optional calculator uses v5 width and v5 depth.</p>
      <label className="mt-3 block text-xs font-medium text-slate-700">
        Circumference shape
        <select aria-label="Edited-line circumference shape" className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-800" onChange={(event) => setCircumferenceMethod(event.target.value as CircumferenceMethod)} value={circumferenceMethod}>
          {FORMULA_METHODS.map((option) => <option key={option.value} value={option.value}>{formulaLabel(option.value, option.label)}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-xs font-medium text-slate-700">
        Depth experiment · {(depthMultiplier * 100).toFixed(0)}%
        <input className="mt-2 w-full accent-violet-600" max="1.4" min="0.6" onChange={(event) => setDepthMultiplier(Number(event.target.value))} step="0.01" type="range" value={depthMultiplier} />
      </label>
      {circumferenceMethod === "superellipse" ? (
        <label className="mt-3 block text-xs font-medium text-slate-700">
          Superellipse shape n · {superellipseExponent.toFixed(2)}
          <input className="mt-2 w-full accent-violet-600" max="4" min="1.2" onChange={(event) => setSuperellipseExponent(Number(event.target.value))} step="0.05" type="range" value={superellipseExponent} />
        </label>
      ) : null}
      <div className="mt-3 rounded-md bg-slate-950 p-3 font-mono text-[10px] leading-5 text-slate-200">
        width = v5 width × edited span<br />
        depth = {depthMode === "ratio" ? "edited width × v5 ratio" : "v5 depth cm"}<br />
        edited check = selected shape(width, depth)
      </div>
    </div>
  );

  const sourceTruth = (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p className="text-xs font-black uppercase tracking-[0.13em] text-blue-700">Source truth</p>
      <div className="mt-2 space-y-1.5 text-xs leading-5 text-blue-950">
        <p><strong>Active:</strong> WEAR 3D v5 checkpoint · {prediction.model.version}</p>
        <p><strong>Edge mode:</strong> {edgeVisual.label} · {edgeMode === "visible-photo" ? "MediaPipe torso mask with arm exclusion" : edgeMode === "wear-learned" ? "WEAR v5 prediction, mask-assisted" : "Meta SAM 3D Body projected closed torso slice, rough-box guided"}</p>
        <p><strong>Reference:</strong> {referenceSet ? referenceSet.note : "No saved red manual coordinates for this photo."}</p>
        <p><strong>Not used:</strong> QWEAR 2D, old WEAR 1D calculator, Apple Vision or Gemini lines. Meta is used only when the violet edge mode is active.</p>
        <p><strong>Important:</strong> dragging tests geometry live; it does not retrain the checkpoint.</p>
      </div>
    </div>
  );

  return (
    <>
      <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4" data-testid="wear-line-workbench">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-red-950">WEAR 3D coordinate prediction</h2>
              <p className="mt-1 max-w-4xl text-xs leading-5 text-red-900">
                Compare visible torso, WEAR v5 and Meta 3D body edges at the same WEAR-predicted row height. Cyan is photo, blue is WEAR, violet is Meta; saved red manual lines are optional and hidden by default.
              </p>
              <p className="mt-1 text-[11px] font-medium text-red-800">
                Move endpoints or the whole row. Width changes update the live check; Y-only movement changes the position, not the number.
              </p>
            </div>
            <button
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
              onClick={onClearPrediction}
              type="button"
            >
              Clear WEAR 3D prediction
            </button>
          </div>
          {renderEditorToolbar(true)}
          {expanded ? (
            <div className="rounded-lg border border-red-200 bg-white px-3 py-8 text-center text-sm text-red-900">Full screen editor is open.</div>
          ) : renderImageViewport("normal")}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-red-900">
            <span>Drag near either invisible line end, or grab the line itself. Red reference lines remain off until enabled.</span>
          </div>
          {renderPersistentResults()}
          <details className="rounded-lg border border-slate-300 bg-white/80 p-2">
            <summary className="cursor-pointer text-xs font-black text-slate-700">WEAR 3D calculations, rows and layers</summary>
            <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.85fr)]">
              {renderMeasurementPanel(false)}
              <div className="space-y-3">
                {renderLineSelector()}
                {renderExactLineControls()}
                {renderLayerControls()}
                <details className="rounded-lg border border-slate-300 bg-slate-50 p-2">
                  <summary className="cursor-pointer text-xs font-black text-slate-700">Advanced edited-line formula and source</summary>
                  <div className="mt-2 space-y-3">
                    {renderFormulaControls(true)}
                    {sourceTruth}
                  </div>
                </details>
              </div>
            </div>
          </details>
      </section>

      {expanded ? (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-white" data-testid="wear-line-workbench-fullscreen">
          <div className="grid h-screen min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="flex min-h-0 flex-col gap-3 p-4">
              <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950 pb-3">
                <div>
                  <div className="text-sm font-semibold">WEAR 3D coordinate prediction</div>
                  <div className="text-xs text-slate-300">Switch edge source, then drag start/end handles. Values update on the right.</div>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setExpanded(false)} type="button"><X className="size-4" aria-hidden />Close</button>
              </header>
              {renderEditorToolbar(false)}
              {renderImageViewport("fullscreen")}
            </section>
            <aside className="min-h-0 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white p-3 text-text-primary">
              <div className="space-y-3 pt-3">
                {renderMeasurementPanel()}
                {renderLineSelector(true)}
                {renderExactLineControls(true)}
                {renderLayerControls()}
                <details className="rounded-lg border border-slate-300 bg-slate-50 p-2">
                  <summary className="cursor-pointer text-xs font-black text-slate-700">Advanced formulas and debugging</summary>
                  <div className="mt-2 space-y-3">
                    {renderFormulaControls(true)}
                    {sourceTruth}
                  </div>
                </details>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}
