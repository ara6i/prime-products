"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { FullScreenGreenRulerComparison } from "./FullScreenGreenRulerComparison";
import {
  FullScreenRedLineVerticalProof,
  type RedLineVerticalProofKind,
} from "./FullScreenRedLineVerticalProof";
import { ManualMeasurementStepper } from "./ManualMeasurementStepper";
import { ModelLayerInspector } from "./ModelLayerInspector";
import type {
  AppleFusedTapeApiResult,
  AppleFusedTapeModel,
  AppleFusedTapeTest,
} from "../lib/appleFusedTapeScale";
import type { AppleFusedBodyScaleApiResult } from "../lib/appleFusedBodyScale";
import type { AppleVisionBodyScaleResult } from "../lib/appleVisionBodyScale";
import type { GeminiBodyGuide, GeminiGuideDepthRatioOverrides, GeminiGuideLine, GeminiGuideMeasurement } from "../lib/geminiGuide";
import {
  buildTapeVisionHiddenIntervals,
  buildTapeVisionSnap,
  measureTapeVisionCm,
  type TapeVisionCalibration,
} from "../lib/tapeVision";
import { cmToIn, inToCm } from "../lib/units";
import type { MaskHeightScaleAudit, PoseResult } from "../types";

type GuideKind = "waist" | "trouserWaist" | "hips";
type SvgDragEvent = React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>;
type SvgHandleDragEvent = React.PointerEvent<SVGElement> | React.MouseEvent<SVGElement>;
type WindowDragEvent = PointerEvent | MouseEvent;
type MeasurementMode = "circumference" | "side-depth";
type ScaleProofHandle = "start" | "end";
type FreeRulerDragTarget = ScaleProofHandle | "line";
type HeightScaleHandle = "top" | "bottom";
type ScaleProofUnit = "cm" | "in";
type BodyWidthMethod = "apple-vision" | "depth-pro";

interface ScaleProofPoint {
  x: number;
  y: number;
}

interface ScaleProofRuler {
  sourceKey: string;
  start: ScaleProofPoint;
  end: ScaleProofPoint;
  touchedStart: boolean;
  touchedEnd: boolean;
}

interface BodyScaleRowInput {
  name: GuideKind;
  y: number;
  leftX: number;
  rightX: number;
}

interface BodyMaskSupportRun {
  startX: number;
  endX: number;
}

interface BodyMaskSupportRow {
  name: GuideKind;
  threshold: number;
  maskWidth: number;
  maskHeight: number;
  maskSource: string;
  scanlines: Array<{ y: number; runs: BodyMaskSupportRun[] }>;
}

interface DepthProBodyScaleRow extends BodyScaleRowInput {
  pixelSpan: number;
  interiorPlaneDepthM: number;
  interiorPlaneWidthCm: number;
  depthSpreadPct: number;
  confidence: "high" | "medium" | "low";
  valid: boolean;
}

interface TapeVisionClientResult extends TapeVisionCalibration {
  sourceImageUrl: string;
  visualHintX: number;
  centerLineSlope: number;
  centerLineIntercept: number;
}

export interface ManualScaleProofPreset {
  sourceImageWidth: number;
  sourceImageHeight: number;
  start: ScaleProofPoint;
  end: ScaleProofPoint;
  intervalValue: number;
  unit: ScaleProofUnit;
}

export interface ManualHeightScaleOverride {
  sourceKey: string;
  topYNorm: number;
  bottomYNorm: number;
  centerXNorm: number;
}

interface ManualScaleEvidenceData {
  source: "vertical-tape" | "mask-height" | "pose-landmarks" | "manual-height";
  activeCmPerPx: number;
  heightCmPerPx: number | null;
  pxPerCm: number;
  scaleDeltaPct: number | null;
  anchors: Array<{ label: string; tapeCm: number; yPx: number }>;
  heightAudit?: MaskHeightScaleAudit | null;
}

interface HeightScaleLine {
  source: "mask" | "manual";
  topY: number;
  bottomY: number;
  centerX: number;
  leftX: number;
  rightX: number;
  bodySpanPx: number;
  cmPerPx: number | null;
}

interface LinkedEditor {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  guide: GeminiBodyGuide | null;
  measurement: GeminiGuideMeasurement | null;
  pose?: PoseResult | null;
  scaleEvidence?: ManualScaleEvidenceData | null;
  title?: string;
  labelSuffix?: string;
  measurementMode?: MeasurementMode;
  heightCm?: number;
  manualHeightScaleOverride?: ManualHeightScaleOverride | null;
  onManualHeightScaleOverrideChange?: (override: ManualHeightScaleOverride | null) => void;
  scaleProofPreset?: ManualScaleProofPreset | null;
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
  onChange: (guide: GeminiBodyGuide) => void;
  onReset?: () => void;
}

interface Props {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  guide: GeminiBodyGuide | null;
  measurement: GeminiGuideMeasurement | null;
  measurementUnavailableMessage?: string;
  pose?: PoseResult | null;
  scaleEvidence?: ManualScaleEvidenceData | null;
  comparisonScaleEvidence?: ManualScaleEvidenceData | null;
  title?: string;
  description?: string;
  resetLabel?: string;
  labelSuffix?: string;
  measurementMode?: MeasurementMode;
  heightCm?: number;
  manualHeightScaleOverride?: ManualHeightScaleOverride | null;
  onManualHeightScaleOverrideChange?: (override: ManualHeightScaleOverride | null) => void;
  scaleProofPreset?: ManualScaleProofPreset | null;
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
  linkedEditor?: LinkedEditor | null;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  knownDepthRatioAnswers?: GeminiGuideDepthRatioOverrides;
  onDepthRatioOverrideChange?: (kind: GuideKind, ratio: number | null) => void;
  onAppleVisionBodyScaleChange?: (result: AppleVisionBodyScaleResult | null) => void;
  fullScreenPhotoComparison?: ReactNode;
  onChange: (guide: GeminiBodyGuide) => void;
  onReset: () => void;
}

const GUIDE_ROWS: Array<{ kind: GuideKind; label: string }> = [
  { kind: "waist", label: "waist" },
  { kind: "trouserWaist", label: "trouser" },
  { kind: "hips", label: "hips" },
];
const DEFAULT_ZOOM = 0.5;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read image (${response.status}).`);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not encode image."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not encode image."));
    reader.readAsDataURL(blob);
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  label: string,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds. Retry it.`);
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function ManualCoordinateGuidePanel({
  imageUrl,
  imageWidth,
  imageHeight,
  guide,
  measurement,
  measurementUnavailableMessage,
  pose,
  scaleEvidence,
  comparisonScaleEvidence,
  title = "Manual coordinate guide",
  description = "Drag either red endpoint left/right, or grab the left/right half of the red line. Red endpoint span owns the active formula width; blue dashed visible-edge evidence is not used in calculation.",
  resetLabel = "Reset from mask rows",
  labelSuffix = "manual coordinate",
  measurementMode = "circumference",
  heightCm,
  manualHeightScaleOverride,
  onManualHeightScaleOverrideChange,
  scaleProofPreset,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
  linkedEditor,
  depthRatioOverrides,
  knownDepthRatioAnswers,
  onDepthRatioOverrideChange,
  onAppleVisionBodyScaleChange,
  fullScreenPhotoComparison,
  onChange,
  onReset,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const linkedSvgRef = useRef<SVGSVGElement | null>(null);
  const normalScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const fullscreenScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const linkedFullscreenScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ kind: GuideKind; pointIndex: number } | null>(null);
  const linkedDragRef = useRef<{ kind: GuideKind; pointIndex: number } | null>(null);
  const scaleProofDragRef = useRef<ScaleProofHandle | null>(null);
  const freeRulerDragRef = useRef<FreeRulerDragTarget | null>(null);
  const redLineProofDragRef = useRef(false);
  const heightScaleDragRef = useRef<HeightScaleHandle | null>(null);
  const normalizedGuideRef = useRef<GeminiBodyGuide | null>(null);
  const linkedNormalizedGuideRef = useRef<GeminiBodyGuide | null>(null);
  const removeWindowDragRef = useRef<(() => void) | null>(null);
  const removeLinkedWindowDragRef = useRef<(() => void) | null>(null);
  const removeScaleProofWindowDragRef = useRef<(() => void) | null>(null);
  const removeFreeRulerWindowDragRef = useRef<(() => void) | null>(null);
  const removeRedLineProofWindowDragRef = useRef<(() => void) | null>(null);
  const removeHeightScaleWindowDragRef = useRef<(() => void) | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [linkedHoverLabel, setLinkedHoverLabel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bodyWidthMethod, setBodyWidthMethod] = useState<BodyWidthMethod>("depth-pro");
  const scaleProofSourceKey = `${imageUrl ?? ""}:${imageWidth}x${imageHeight}`;
  const activeManualHeightScaleOverride = manualHeightScaleOverride?.sourceKey === scaleProofSourceKey
    ? manualHeightScaleOverride
    : null;
  const heightScaleLine = buildHeightScaleLine(
    scaleEvidence?.heightAudit ?? null,
    activeManualHeightScaleOverride,
    imageWidth,
    imageHeight,
    heightCm,
  );
  const [scaleProofRulerState, setScaleProofRuler] = useState<ScaleProofRuler>(() => buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey, scaleProofPreset));
  const scaleProofRuler = scaleProofRulerState.sourceKey === scaleProofSourceKey
    ? scaleProofRulerState
    : buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey, scaleProofPreset);
  const [freeRulerState, setFreeRuler] = useState<ScaleProofRuler>(() => buildInitialFreeRuler(
    imageWidth,
    imageHeight,
    scaleProofSourceKey,
    scaleProofRuler,
  ));
  const freeRuler = freeRulerState.sourceKey === scaleProofSourceKey
    ? freeRulerState
    : buildInitialFreeRuler(imageWidth, imageHeight, scaleProofSourceKey, scaleProofRuler);
  const scaleProofPresetKey = scaleProofPreset
    ? JSON.stringify({
        sourceImageWidth: scaleProofPreset.sourceImageWidth,
        sourceImageHeight: scaleProofPreset.sourceImageHeight,
        start: scaleProofPreset.start,
        end: scaleProofPreset.end,
        intervalValue: scaleProofPreset.intervalValue,
        unit: scaleProofPreset.unit,
      })
    : "default";
  const scaleProofSettingsKey = `${scaleProofSourceKey}:${scaleProofPresetKey}`;
  const [scaleProofSettingsState, setScaleProofSettingsState] = useState<{
    key: string;
    intervalValue: number;
    unit: ScaleProofUnit;
  }>(() => ({
    key: scaleProofSettingsKey,
    intervalValue: scaleProofPreset?.intervalValue ?? 10,
    unit: scaleProofPreset?.unit ?? "cm",
  }));
  const scaleProofSettings = scaleProofSettingsState.key === scaleProofSettingsKey
    ? scaleProofSettingsState
    : {
        key: scaleProofSettingsKey,
        intervalValue: scaleProofPreset?.intervalValue ?? 10,
        unit: scaleProofPreset?.unit ?? "cm" as ScaleProofUnit,
      };
  const scaleProofIntervalValue = scaleProofSettings.intervalValue;
  const scaleProofUnit = scaleProofSettings.unit;
  const [circumferenceDisplayUnit, setCircumferenceDisplayUnit] = useState<ScaleProofUnit>("cm");
  const setScaleProofIntervalValue = (intervalValue: number) => {
    setScaleProofSettingsState({ ...scaleProofSettings, intervalValue });
  };
  const setScaleProofUnit = (unit: ScaleProofUnit) => {
    setScaleProofSettingsState({ ...scaleProofSettings, unit });
  };
  const normalizedGuide = useMemo(
    () => normalizeGuide(guide, imageWidth, imageHeight),
    [guide, imageWidth, imageHeight],
  );
  const bodyScaleRows = useMemo(() => GUIDE_ROWS.flatMap(({ kind }): BodyScaleRowInput[] => {
    const line = normalizedGuide?.[kind];
    if (!line || !Number.isFinite(line.y_px) || !Number.isFinite(line.left_x_px) || !Number.isFinite(line.right_x_px)) return [];
    return [{
      name: kind,
      y: Number(line.y_px),
      leftX: Number(line.left_x_px),
      rightX: Number(line.right_x_px),
    }];
  }), [normalizedGuide]);
  const [redLineProofKind, setRedLineProofKind] = useState<RedLineVerticalProofKind>("hips");
  const redLineProofRow = bodyScaleRows.find((row) => row.name === redLineProofKind) ?? null;
  const redLineProofSourceSpanPx = redLineProofRow
    ? Math.abs(redLineProofRow.rightX - redLineProofRow.leftX)
    : 0;
  const redLineProofStateKey = buildRedLineProofStateKey(
    scaleProofSourceKey,
    redLineProofKind,
    redLineProofSourceSpanPx,
  );
  const [redLineProofRulerState, setRedLineProofRuler] = useState<ScaleProofRuler>(() => buildInitialVerticalRedLineRuler(
    imageWidth,
    imageHeight,
    buildRedLineProofStateKey(
      scaleProofSourceKey,
      "hips",
      Math.abs(
        (bodyScaleRows.find((row) => row.name === "hips")?.rightX ?? 0)
        - (bodyScaleRows.find((row) => row.name === "hips")?.leftX ?? 0),
      ),
    ),
    scaleProofRuler,
    Math.abs(
      (bodyScaleRows.find((row) => row.name === "hips")?.rightX ?? 0)
      - (bodyScaleRows.find((row) => row.name === "hips")?.leftX ?? 0),
    ),
  ));
  const redLineProofRuler = redLineProofRulerState.sourceKey === redLineProofStateKey
    ? redLineProofRulerState
    : buildInitialVerticalRedLineRuler(
        imageWidth,
        imageHeight,
        redLineProofStateKey,
        scaleProofRuler,
        redLineProofSourceSpanPx,
      );
  const bodyMaskSupport = useMemo(
    () => buildBodyMaskSupport(pose ?? null, imageWidth, imageHeight, bodyScaleRows),
    [pose, imageWidth, imageHeight, bodyScaleRows],
  );
  const linkedNormalizedGuide = useMemo(
    () => normalizeGuide(linkedEditor?.guide ?? null, linkedEditor?.imageWidth ?? 0, linkedEditor?.imageHeight ?? 0),
    [linkedEditor?.guide, linkedEditor?.imageWidth, linkedEditor?.imageHeight],
  );

  useEffect(() => () => {
    removeWindowDragRef.current?.();
    removeLinkedWindowDragRef.current?.();
    removeScaleProofWindowDragRef.current?.();
    removeFreeRulerWindowDragRef.current?.();
    removeRedLineProofWindowDragRef.current?.();
    removeHeightScaleWindowDragRef.current?.();
    removeWindowDragRef.current = null;
    removeLinkedWindowDragRef.current = null;
    removeScaleProofWindowDragRef.current = null;
    removeFreeRulerWindowDragRef.current = null;
    removeRedLineProofWindowDragRef.current = null;
    removeHeightScaleWindowDragRef.current = null;
  }, []);

  useEffect(() => {
    normalizedGuideRef.current = normalizedGuide;
  }, [normalizedGuide]);

  useEffect(() => {
    linkedNormalizedGuideRef.current = linkedNormalizedGuide;
  }, [linkedNormalizedGuide]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[data-testid="model-layer-fullscreen-dialog"]')) return;
      setIsFullscreen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFullscreen]);

  const updateZoom = (nextZoom: number) => {
    setZoom(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM));
  };

  const centerRow = (kind: GuideKind) => {
    const viewport = isFullscreen ? fullscreenScrollViewportRef.current : normalScrollViewportRef.current;
    const line = normalizeLine(normalizedGuide?.[kind], imageWidth, imageHeight);
    if (viewport && line && imageWidth > 0) {
      centerViewportOnLine(viewport, line, imageWidth);
    }
    const linkedLine = normalizeLine(linkedNormalizedGuide?.[kind], linkedEditor?.imageWidth ?? 0, linkedEditor?.imageHeight ?? 0);
    if (isFullscreen && linkedFullscreenScrollViewportRef.current && linkedLine && linkedEditor && linkedEditor.imageWidth > 0) {
      centerViewportOnLine(linkedFullscreenScrollViewportRef.current, linkedLine, linkedEditor.imageWidth);
    }
  };

  const centerViewportOnLine = (viewport: HTMLDivElement, line: GeminiGuideLine, viewportImageWidth: number) => {
    const displayScale = viewport.scrollWidth / viewportImageWidth;
    const centerX = (((line.left_x_px ?? 0) + (line.right_x_px ?? viewportImageWidth)) / 2) * displayScale;
    viewport.scrollTo({
      left: Math.max(0, centerX - (viewport.clientWidth / 2)),
      top: Math.max(0, ((line.y_px ?? 0) * displayScale) - (viewport.clientHeight / 2)),
      behavior: "smooth",
    });
  };

  const updatePointerHover = (event: SvgDragEvent) => {
    if (!normalizedGuide || dragRef.current) return;
    const hit = findNearestHandle(normalizedGuide, getImagePoint(event), imageWidth, zoom);
    setHoverLabel(hit ? `${rowLabel(hit.kind)} ${handleLabel(hit.pointIndex)}` : null);
  };

  const updateLinkedPointerHover = (event: SvgDragEvent) => {
    if (!linkedNormalizedGuide || linkedDragRef.current || !linkedEditor) return;
    const hit = findNearestHandle(linkedNormalizedGuide, getImagePoint(event), linkedEditor.imageWidth, zoom);
    setLinkedHoverLabel(hit ? `${rowLabel(hit.kind)} ${handleLabel(hit.pointIndex)}` : null);
  };

  const startDrag = (event: SvgDragEvent) => {
    if (!normalizedGuide) return;
    const hit = findNearestHandle(normalizedGuide, getImagePoint(event), imageWidth, zoom);
    if (!hit) return;
    if ("pointerId" in event) event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = hit;
    setHoverLabel(`${rowLabel(hit.kind)} ${handleLabel(hit.pointIndex)}`);
  };

  const startLinkedDrag = (event: SvgDragEvent) => {
    if (!linkedNormalizedGuide || !linkedEditor) return;
    const hit = findNearestHandle(linkedNormalizedGuide, getImagePoint(event), linkedEditor.imageWidth, zoom);
    if (!hit) return;
    if ("pointerId" in event) event.currentTarget.setPointerCapture(event.pointerId);
    linkedDragRef.current = hit;
    setLinkedHoverLabel(`${rowLabel(hit.kind)} ${handleLabel(hit.pointIndex)}`);
  };

  const startHandleDrag = (
    target: { kind: GuideKind; pointIndex: number },
    event: SvgHandleDragEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if ("pointerId" in event) event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    dragRef.current = target;
    setHoverLabel(`${rowLabel(target.kind)} ${handleLabel(target.pointIndex)}`);
    removeWindowDragRef.current?.();

    const move = (moveEvent: WindowDragEvent) => {
      const svg = svgRef.current;
      const activeGuide = normalizedGuideRef.current;
      if (!svg || !activeGuide) return;
      const point = getImagePointFromClient(svg, moveEvent.clientX, moveEvent.clientY);
      onChange(updateGuidePoint(activeGuide, target, point, imageWidth, imageHeight));
    };
    const stop = () => {
      dragRef.current = null;
      removeWindowDragRef.current?.();
      removeWindowDragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("mouseup", stop, { once: true });
    removeWindowDragRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("mouseup", stop);
    };
  };

  const startLineDrag = (kind: GuideKind, event: SvgHandleDragEvent) => {
    const activeGuide = normalizedGuideRef.current ?? normalizedGuide;
    const svg = svgRef.current;
    const line = activeGuide ? normalizeLine(activeGuide[kind], imageWidth, imageHeight) : null;
    if (!svg || !line?.points?.length) return;
    const point = getImagePointFromClient(svg, event.clientX, event.clientY);
    const firstIndex = 0;
    const lastIndex = line.points.length - 1;
    const pointIndex = Math.abs(point.x - line.points[firstIndex]!.x_px) <= Math.abs(point.x - line.points[lastIndex]!.x_px)
      ? firstIndex
      : lastIndex;
    startHandleDrag({ kind, pointIndex }, event);
  };

  const startLinkedHandleDrag = (
    target: { kind: GuideKind; pointIndex: number },
    event: SvgHandleDragEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!linkedEditor) return;
    if ("pointerId" in event) event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    linkedDragRef.current = target;
    setLinkedHoverLabel(`${rowLabel(target.kind)} ${handleLabel(target.pointIndex)}`);
    removeLinkedWindowDragRef.current?.();

    const move = (moveEvent: WindowDragEvent) => {
      const svg = linkedSvgRef.current;
      const activeGuide = linkedNormalizedGuideRef.current;
      if (!svg || !activeGuide || !linkedEditor) return;
      const point = getImagePointFromClient(svg, moveEvent.clientX, moveEvent.clientY);
      linkedEditor.onChange(updateGuidePoint(activeGuide, target, point, linkedEditor.imageWidth, linkedEditor.imageHeight));
    };
    const stop = () => {
      linkedDragRef.current = null;
      removeLinkedWindowDragRef.current?.();
      removeLinkedWindowDragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("mouseup", stop, { once: true });
    removeLinkedWindowDragRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("mouseup", stop);
    };
  };

  const startLinkedLineDrag = (kind: GuideKind, event: SvgHandleDragEvent) => {
    const activeGuide = linkedNormalizedGuideRef.current ?? linkedNormalizedGuide;
    const svg = linkedSvgRef.current;
    if (!linkedEditor || !svg || !activeGuide) return;
    const line = normalizeLine(activeGuide[kind], linkedEditor.imageWidth, linkedEditor.imageHeight);
    if (!line?.points?.length) return;
    const point = getImagePointFromClient(svg, event.clientX, event.clientY);
    const firstIndex = 0;
    const lastIndex = line.points.length - 1;
    const pointIndex = Math.abs(point.x - line.points[firstIndex]!.x_px) <= Math.abs(point.x - line.points[lastIndex]!.x_px)
      ? firstIndex
      : lastIndex;
    startLinkedHandleDrag({ kind, pointIndex }, event);
  };

  const startScaleProofHandleDrag = (
    handle: ScaleProofHandle,
    event: SvgHandleDragEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if ("pointerId" in event) event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    scaleProofDragRef.current = handle;
    removeScaleProofWindowDragRef.current?.();

    const move = (moveEvent: WindowDragEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const point = getImagePointFromClient(svg, moveEvent.clientX, moveEvent.clientY);
      setScaleProofRuler((current) => {
        const activeRuler = current.sourceKey === scaleProofSourceKey
          ? current
          : buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey, scaleProofPreset);
        const next: ScaleProofRuler = {
          ...activeRuler,
          [handle]: {
            x: clamp(point.x, 0, imageWidth - 1),
            y: clamp(point.y, 0, imageHeight - 1),
          },
          ...(handle === "start" ? { touchedStart: true } : { touchedEnd: true }),
        };
        return next;
      });
    };
    const stop = () => {
      scaleProofDragRef.current = null;
      removeScaleProofWindowDragRef.current?.();
      removeScaleProofWindowDragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    removeScaleProofWindowDragRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  };

  const startFreeRulerDrag = (
    target: FreeRulerDragTarget,
    event: SvgHandleDragEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if ("pointerId" in event) event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    const svg = svgRef.current;
    if (!svg) return;
    const dragOrigin = getImagePointFromClient(svg, event.clientX, event.clientY);
    const originRuler = freeRuler;
    freeRulerDragRef.current = target;
    removeFreeRulerWindowDragRef.current?.();

    const move = (moveEvent: WindowDragEvent) => {
      const activeSvg = svgRef.current;
      if (!activeSvg) return;
      const point = getImagePointFromClient(activeSvg, moveEvent.clientX, moveEvent.clientY);
      if (target === "line") {
        const requestedDeltaX = point.x - dragOrigin.x;
        const requestedDeltaY = point.y - dragOrigin.y;
        const minimumX = Math.min(originRuler.start.x, originRuler.end.x);
        const maximumX = Math.max(originRuler.start.x, originRuler.end.x);
        const minimumY = Math.min(originRuler.start.y, originRuler.end.y);
        const maximumY = Math.max(originRuler.start.y, originRuler.end.y);
        const deltaX = clamp(requestedDeltaX, -minimumX, imageWidth - 1 - maximumX);
        const deltaY = clamp(requestedDeltaY, -minimumY, imageHeight - 1 - maximumY);
        setFreeRuler({
          ...originRuler,
          start: { x: originRuler.start.x + deltaX, y: originRuler.start.y + deltaY },
          end: { x: originRuler.end.x + deltaX, y: originRuler.end.y + deltaY },
          touchedStart: true,
          touchedEnd: true,
        });
        return;
      }
      setFreeRuler((current) => {
        const activeRuler = current.sourceKey === scaleProofSourceKey
          ? current
          : buildInitialFreeRuler(imageWidth, imageHeight, scaleProofSourceKey, scaleProofRuler);
        return {
          ...activeRuler,
          [target]: {
            x: clamp(point.x, 0, imageWidth - 1),
            y: clamp(point.y, 0, imageHeight - 1),
          },
          ...(target === "start" ? { touchedStart: true } : { touchedEnd: true }),
        };
      });
    };
    const stop = () => {
      freeRulerDragRef.current = null;
      removeFreeRulerWindowDragRef.current?.();
      removeFreeRulerWindowDragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    removeFreeRulerWindowDragRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  };

  const startRedLineProofDrag = (event: SvgHandleDragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if ("pointerId" in event) event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    const svg = svgRef.current;
    if (!svg) return;
    const dragOrigin = getImagePointFromClient(svg, event.clientX, event.clientY);
    const originRuler = redLineProofRuler;
    redLineProofDragRef.current = true;
    removeRedLineProofWindowDragRef.current?.();

    const move = (moveEvent: WindowDragEvent) => {
      const activeSvg = svgRef.current;
      if (!activeSvg) return;
      const point = getImagePointFromClient(activeSvg, moveEvent.clientX, moveEvent.clientY);
      const requestedDeltaX = point.x - dragOrigin.x;
      const requestedDeltaY = point.y - dragOrigin.y;
      const minimumX = Math.min(originRuler.start.x, originRuler.end.x);
      const maximumX = Math.max(originRuler.start.x, originRuler.end.x);
      const minimumY = Math.min(originRuler.start.y, originRuler.end.y);
      const maximumY = Math.max(originRuler.start.y, originRuler.end.y);
      const deltaX = clamp(requestedDeltaX, -minimumX, imageWidth - 1 - maximumX);
      const deltaY = clamp(requestedDeltaY, -minimumY, imageHeight - 1 - maximumY);
      setRedLineProofRuler({
        ...originRuler,
        start: { x: originRuler.start.x + deltaX, y: originRuler.start.y + deltaY },
        end: { x: originRuler.end.x + deltaX, y: originRuler.end.y + deltaY },
        touchedStart: true,
        touchedEnd: true,
      });
    };
    const stop = () => {
      redLineProofDragRef.current = false;
      removeRedLineProofWindowDragRef.current?.();
      removeRedLineProofWindowDragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    removeRedLineProofWindowDragRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  };

  const startHeightScaleHandleDrag = (
    handle: HeightScaleHandle,
    event: SvgHandleDragEvent,
  ) => {
    if (!onManualHeightScaleOverrideChange || !heightScaleLine) return;
    event.preventDefault();
    event.stopPropagation();
    if ("pointerId" in event) event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    heightScaleDragRef.current = handle;
    removeHeightScaleWindowDragRef.current?.();

    const minSpanNorm = Math.min(0.98, Math.max(12 / Math.max(1, imageHeight), 0.01));
    const svg = svgRef.current;
    const dragStartPoint = svg
      ? getImagePointFromClient(svg, event.clientX, event.clientY)
      : {
          x: heightScaleLine.centerX,
          y: handle === "top" ? heightScaleLine.topY : heightScaleLine.bottomY,
        };
    const startTopYNorm = heightScaleLine.topY / Math.max(1, imageHeight);
    const startBottomYNorm = heightScaleLine.bottomY / Math.max(1, imageHeight);
    const startCenterXNorm = heightScaleLine.centerX / Math.max(1, imageWidth);
    const move = (moveEvent: WindowDragEvent) => {
      const activeSvg = svgRef.current;
      if (!activeSvg) return;
      const point = getImagePointFromClient(activeSvg, moveEvent.clientX, moveEvent.clientY);
      const deltaYNorm = (point.y - dragStartPoint.y) / Math.max(1, imageHeight);
      const topYNorm = handle === "top"
        ? clamp(startTopYNorm + deltaYNorm, 0, startBottomYNorm - minSpanNorm)
        : startTopYNorm;
      const bottomYNorm = handle === "bottom"
        ? clamp(startBottomYNorm + deltaYNorm, startTopYNorm + minSpanNorm, 1)
        : startBottomYNorm;
      onManualHeightScaleOverrideChange({
        sourceKey: scaleProofSourceKey,
        topYNorm,
        bottomYNorm,
        centerXNorm: clamp(startCenterXNorm, 0.02, 0.98),
      });
    };
    const stop = () => {
      heightScaleDragRef.current = null;
      removeHeightScaleWindowDragRef.current?.();
      removeHeightScaleWindowDragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    removeHeightScaleWindowDragRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  };

  const resetScaleProofRuler = () => {
    setScaleProofRuler(buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey, scaleProofPreset));
    setScaleProofSettingsState({
      key: scaleProofSettingsKey,
      intervalValue: scaleProofPreset?.intervalValue ?? 10,
      unit: scaleProofPreset?.unit ?? "cm",
    });
  };

  const placeFreeRulerBesideTape = () => {
    setFreeRuler(buildInitialFreeRuler(imageWidth, imageHeight, scaleProofSourceKey, scaleProofRuler));
  };

  const placeRedLineProofBesideTape = (kind: RedLineVerticalProofKind = redLineProofKind) => {
    const row = bodyScaleRows.find((candidate) => candidate.name === kind);
    if (!row) return;
    const sourceSpanPx = Math.abs(row.rightX - row.leftX);
    const stateKey = buildRedLineProofStateKey(scaleProofSourceKey, kind, sourceSpanPx);
    setRedLineProofKind(kind);
    setRedLineProofRuler(buildInitialVerticalRedLineRuler(
      imageWidth,
      imageHeight,
      stateKey,
      scaleProofRuler,
      sourceSpanPx,
    ));
  };

  const resetManualHeightScaleOverride = () => {
    onManualHeightScaleOverrideChange?.(null);
  };

  const drag = (event: SvgDragEvent) => {
    if (!dragRef.current || !normalizedGuide) return;
    const point = getImagePoint(event);
    onChange(updateGuidePoint(normalizedGuide, dragRef.current, point, imageWidth, imageHeight));
  };

  const linkedDrag = (event: SvgDragEvent) => {
    if (!linkedDragRef.current || !linkedNormalizedGuide || !linkedEditor) return;
    const point = getImagePoint(event);
    linkedEditor.onChange(updateGuidePoint(linkedNormalizedGuide, linkedDragRef.current, point, linkedEditor.imageWidth, linkedEditor.imageHeight));
  };

  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released by the browser.
      }
    }
    removeWindowDragRef.current?.();
    removeWindowDragRef.current = null;
    dragRef.current = null;
  };

  const stopLinkedDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (linkedDragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released by the browser.
      }
    }
    removeLinkedWindowDragRef.current?.();
    removeLinkedWindowDragRef.current = null;
    linkedDragRef.current = null;
  };

  const stopMouseDrag = () => {
    removeWindowDragRef.current?.();
    removeWindowDragRef.current = null;
    dragRef.current = null;
  };

  const stopLinkedMouseDrag = () => {
    removeLinkedWindowDragRef.current?.();
    removeLinkedWindowDragRef.current = null;
    linkedDragRef.current = null;
  };

  const handleSvgPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    drag(event);
    updatePointerHover(event);
  };

  const handleSvgMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    drag(event);
    updatePointerHover(event);
  };

  const handleLinkedSvgPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    linkedDrag(event);
    updateLinkedPointerHover(event);
  };

  const handleLinkedSvgMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    linkedDrag(event);
    updateLinkedPointerHover(event);
  };

  if (!imageUrl) return null;

  const renderZoomControls = (showFullscreenButton: boolean) => (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-white p-2">
      <button
        type="button"
        onClick={() => updateZoom(zoom - ZOOM_STEP)}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Zoom out"
        title="Zoom out"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ZoomOut className="h-4 w-4" aria-hidden />
      </button>
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={ZOOM_STEP}
        value={zoom}
        onChange={(event) => updateZoom(Number(event.currentTarget.value))}
        aria-label="Manual image zoom"
        className="h-2 min-w-36 flex-1 accent-red-600"
      />
      <button
        type="button"
        onClick={() => updateZoom(zoom + ZOOM_STEP)}
        disabled={zoom >= MAX_ZOOM}
        aria-label="Zoom in"
        title="Zoom in"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ZoomIn className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => updateZoom(DEFAULT_ZOOM)}
        disabled={zoom === DEFAULT_ZOOM}
        aria-label="Reset zoom"
        title="Reset zoom"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-12 text-right font-mono text-[11px] font-semibold text-red-900">
        {Math.round(zoom * 100)}%
      </span>
      <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
        {GUIDE_ROWS.map((row) => (
          <button
            key={row.kind}
            type="button"
            onClick={() => centerRow(row.kind)}
            className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-50"
          >
            {row.label}
          </button>
        ))}
        {showFullscreenButton ? (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[11px] font-semibold text-red-800 hover:bg-red-50"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            Full screen
          </button>
        ) : null}
      </div>
    </div>
  );

  const renderImageViewport = (mode: "normal" | "fullscreen") => (
    <div
      ref={mode === "fullscreen" ? fullscreenScrollViewportRef : normalScrollViewportRef}
      data-testid={`manual-image-viewport-${mode}`}
      className={`${mode === "fullscreen" ? "min-h-0 flex-1" : "max-h-[62vh]"} overflow-auto rounded-lg border border-red-200 bg-black`}
    >
      <div
        className="relative bg-black"
        style={{
          maxWidth: "none",
          width: `${zoom * 100}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Manual coordinate source"
          className="block h-auto w-full select-none"
          draggable={false}
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
          onPointerDown={startDrag}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onMouseDown={startDrag}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={stopMouseDrag}
          onPointerLeave={() => {
            if (!dragRef.current) setHoverLabel(null);
          }}
          onMouseLeave={() => {
            if (!dragRef.current) setHoverLabel(null);
          }}
          className="absolute inset-0 h-full w-full"
          style={{ cursor: hoverLabel ? "grab" : "crosshair" }}
        >
          <HeightScaleLineSvg
            audit={scaleEvidence?.heightAudit ?? null}
            manualOverride={activeManualHeightScaleOverride}
            heightCm={heightCm}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            zoom={zoom}
            label={scaleEvidence?.source === "mask-height" ? "active mask height" : "inactive mask reference"}
            onHandleDragStart={onManualHeightScaleOverrideChange ? startHeightScaleHandleDrag : undefined}
          />
          {normalizedGuide ? (
            <ManualGuideSvg
              guide={normalizedGuide}
              measurement={measurement}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              zoom={zoom}
              labelSuffix={labelSuffix}
              onHandleDragStart={startHandleDrag}
              onLineDragStart={startLineDrag}
            />
          ) : null}
          <ScaleProofRulerSvg
            variant="tape"
            ruler={scaleProofRuler}
            intervalValue={scaleProofIntervalValue}
            unit={scaleProofUnit}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            zoom={zoom}
            onHandleDragStart={startScaleProofHandleDrag}
          />
          {isFullscreen ? (
            <>
              <ScaleProofRulerSvg
                variant="free"
                ruler={freeRuler}
                intervalValue={scaleProofIntervalValue}
                unit={scaleProofUnit}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                zoom={zoom}
                onHandleDragStart={startFreeRulerDrag}
                onLineDragStart={(event) => startFreeRulerDrag("line", event)}
              />
              {redLineProofRow ? (
                <ScaleProofRulerSvg
                  variant="red-copy"
                  ruler={redLineProofRuler}
                  intervalValue={scaleProofIntervalValue}
                  unit={scaleProofUnit}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  zoom={zoom}
                  customLabel={`${rowLabel(redLineProofKind)} copy · ${redLineProofSourceSpanPx.toFixed(0)} px`}
                  onLineDragStart={startRedLineProofDrag}
                />
              ) : null}
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );

  const renderLinkedImageViewport = () => {
    if (!linkedEditor?.imageUrl || !linkedNormalizedGuide) return null;
    const linkedLabelSuffix = linkedEditor.labelSuffix ?? "side manual adjusted";
    return (
      <div
        ref={linkedFullscreenScrollViewportRef}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-red-200 bg-black"
      >
        <div
          className="relative bg-black"
          style={{
            maxWidth: "none",
            width: `${zoom * 100}%`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={linkedEditor.imageUrl}
            alt="Side manual coordinate source"
            className="block h-auto w-full select-none"
            draggable={false}
          />
          <svg
            ref={linkedSvgRef}
            viewBox={`0 0 ${linkedEditor.imageWidth} ${linkedEditor.imageHeight}`}
            preserveAspectRatio="none"
            onPointerDown={startLinkedDrag}
            onPointerMove={handleLinkedSvgPointerMove}
            onPointerUp={stopLinkedDrag}
            onPointerCancel={stopLinkedDrag}
            onMouseDown={startLinkedDrag}
            onMouseMove={handleLinkedSvgMouseMove}
            onMouseUp={stopLinkedMouseDrag}
            onPointerLeave={() => {
              if (!linkedDragRef.current) setLinkedHoverLabel(null);
            }}
            onMouseLeave={() => {
              if (!linkedDragRef.current) setLinkedHoverLabel(null);
            }}
            className="absolute inset-0 h-full w-full"
            style={{ cursor: linkedHoverLabel ? "grab" : "crosshair" }}
          >
            <HeightScaleLineSvg
              audit={linkedEditor.scaleEvidence?.heightAudit ?? null}
              imageWidth={linkedEditor.imageWidth}
              imageHeight={linkedEditor.imageHeight}
              zoom={zoom}
              label="side mask height"
            />
            <ManualGuideSvg
              guide={linkedNormalizedGuide}
              measurement={linkedEditor.measurement}
              imageWidth={linkedEditor.imageWidth}
              imageHeight={linkedEditor.imageHeight}
              zoom={zoom}
              labelSuffix={linkedLabelSuffix}
              onHandleDragStart={startLinkedHandleDrag}
              onLineDragStart={startLinkedLineDrag}
            />
          </svg>
        </div>
      </div>
    );
  };

  const linkedEditorReady = Boolean(linkedEditor?.imageUrl && linkedNormalizedGuide);

  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-red-950">{title}</h4>
          <p className="mt-1 text-xs text-red-900">
            {description}
          </p>
          {guide?.notes ? (
            <p className="mt-1 text-[11px] font-medium text-red-800">
              Front seed: {guide.notes}
            </p>
          ) : null}
          {linkedEditor?.guide?.notes ? (
            <p className="mt-1 text-[11px] font-medium text-red-800">
              Side seed: {linkedEditor.guide.notes}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          {resetLabel}
        </button>
      </div>

      {!normalizedGuide ? (
        <div className="rounded-lg border border-dashed border-red-200 bg-white px-3 py-8 text-center text-sm text-red-900">
          {labelSuffix === "local ML prediction"
            ? "No local checkpoint prediction yet. Train the model, then run Analyze Local ML to draw all three rows."
            : "Run Analyze once to seed manual waist, trouser-waist, and hip rows."}
        </div>
      ) : (
        <>
          {renderZoomControls(true)}
          {isFullscreen ? (
            <div className="rounded-lg border border-red-200 bg-white px-3 py-8 text-center text-sm text-red-900">
              Full screen editor is open.
            </div>
          ) : renderImageViewport("normal")}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-red-900">
            <span>Drag a red endpoint, or grab either half of the red line. Left/right span changes the result; Y-only movement does not.</span>
            {hoverLabel ? <span className="font-mono font-semibold">{hoverLabel}</span> : null}
          </div>
          <details className="rounded-lg border border-slate-300 bg-white/80 p-2">
            <summary className="cursor-pointer text-xs font-black text-slate-700">Coordinates, yellow scale, and debug formulas</summary>
            <div className="mt-2 space-y-3">
          {scaleEvidence ? <ManualScaleEvidence evidence={scaleEvidence} /> : null}
          {comparisonScaleEvidence ? <ManualScaleEvidence evidence={comparisonScaleEvidence} isActive={false} /> : null}
          {onManualHeightScaleOverrideChange ? (
            <ManualHeightScalePanel
              line={heightScaleLine}
              isManual={Boolean(activeManualHeightScaleOverride)}
              heightCm={heightCm}
              scaleEvidence={scaleEvidence}
              onReset={resetManualHeightScaleOverride}
            />
          ) : null}
          {measurement ? (
            <ScaleSensitivityPanel
              measurement={measurement}
              heightCm={heightCm}
              heightScaleLine={heightScaleLine}
            />
          ) : null}
          <ManualCoordinateInputs
            guide={normalizedGuide}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onChange={onChange}
          />
            </div>
          </details>
          <ScaleProofPanel
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            bodyRows={bodyScaleRows}
            bodyMaskSupport={bodyMaskSupport}
            ruler={scaleProofRuler}
            freeRuler={freeRuler}
            redLineProofKind={redLineProofKind}
            redLineProofRuler={redLineProofRuler}
            intervalValue={scaleProofIntervalValue}
            unit={scaleProofUnit}
            resultUnit={circumferenceDisplayUnit}
            scaleEvidence={scaleEvidence}
            formulaActiveCmPerPx={measurement?.activeCmPerPx ?? null}
            measurement={measurement}
            measurementUnavailableMessage={measurementUnavailableMessage}
            depthRatioOverrides={depthRatioOverrides}
            knownDepthRatioAnswers={knownDepthRatioAnswers}
            onDepthRatioOverrideChange={onDepthRatioOverrideChange}
            heightCm={heightCm}
            heightScaleLine={heightScaleLine}
            targetNaturalWaistCm={targetNaturalWaistCm}
            targetTrouserWaistCm={targetTrouserWaistCm}
            targetHipsCm={targetHipsCm}
            onIntervalValueChange={setScaleProofIntervalValue}
            onUnitChange={setScaleProofUnit}
            onResultUnitChange={setCircumferenceDisplayUnit}
            onRulerChange={(nextRuler) => setScaleProofRuler(nextRuler)}
            onReset={resetScaleProofRuler}
            onPlaceFreeRulerBesideTape={placeFreeRulerBesideTape}
            onPlaceRedLineProofBesideTape={placeRedLineProofBesideTape}
            bodyWidthMethod={bodyWidthMethod}
            onBodyWidthMethodChange={setBodyWidthMethod}
            onAppleVisionBodyScaleChange={!isFullscreen ? onAppleVisionBodyScaleChange : undefined}
            autoRun={!isFullscreen}
          />
          {measurement ? (
            <details className="rounded-lg border border-slate-300 bg-white/80 p-2">
              <summary className="cursor-pointer text-xs font-black text-slate-700">Full measurement/debug table</summary>
              <div className="mt-2">
                <ManualMeasurementTable
                  measurement={measurement}
                  targetNaturalWaistCm={targetNaturalWaistCm}
                  targetTrouserWaistCm={targetTrouserWaistCm}
                  targetHipsCm={targetHipsCm}
                />
              </div>
            </details>
          ) : null}
          {isFullscreen ? (
            <div className="fixed inset-0 z-[100] bg-slate-950 text-white">
              <div className="grid h-screen min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
                <section className={`flex min-h-0 flex-col gap-3 p-4 ${fullScreenPhotoComparison ? "overflow-y-auto" : ""}`}>
                  <header className={`flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950 pb-3 ${fullScreenPhotoComparison ? "sticky top-0 z-20 shrink-0" : ""}`}>
                    <div>
                      <div className="text-sm font-semibold">{title}</div>
                      <div className="text-xs text-slate-300">
                        Drag start/end handles. {linkedEditorReady ? "Front and side guides are independent." : "Values update on the right."}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(false)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Close
                    </button>
                  </header>
                  {fullScreenPhotoComparison ? <div className="shrink-0">{fullScreenPhotoComparison}</div> : null}
                  {fullScreenPhotoComparison ? (
                    <div className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200">
                      Active photo editor · all original zoom, ruler, red-line and height tools are below.
                    </div>
                  ) : null}
                  {renderZoomControls(false)}
                  {linkedEditorReady ? (
                        <div className={`grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-2 ${fullScreenPhotoComparison ? "h-[72vh] shrink-0" : "flex-1"}`}>
                          <div className="flex min-h-0 flex-col gap-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Front photo</div>
                            {renderImageViewport("fullscreen")}
                          </div>
                          <div className="flex min-h-0 flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                              <span>{linkedEditor?.title ?? "Side photo"}</span>
                              {linkedEditor?.onReset ? (
                                <button
                                  type="button"
                                  onClick={linkedEditor.onReset}
                                  className="rounded-md border border-white/20 px-2 py-1 text-[10px] normal-case tracking-normal text-white hover:bg-white/10"
                                >
                                  Reset side guide
                                </button>
                              ) : null}
                            </div>
                            {renderLinkedImageViewport()}
                          </div>
                        </div>
                  ) : fullScreenPhotoComparison ? (
                    <div className="flex h-[72vh] min-h-0 shrink-0">{renderImageViewport("fullscreen")}</div>
                  ) : renderImageViewport("fullscreen")}
                </section>
                <aside className="min-h-0 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white p-3 text-text-primary">
                  <div className="mt-3">
                    <ScaleProofPanel
                      imageUrl={imageUrl}
                      imageWidth={imageWidth}
                      imageHeight={imageHeight}
                      bodyRows={bodyScaleRows}
                      bodyMaskSupport={bodyMaskSupport}
                      ruler={scaleProofRuler}
                      freeRuler={freeRuler}
                      redLineProofKind={redLineProofKind}
                      redLineProofRuler={redLineProofRuler}
                      intervalValue={scaleProofIntervalValue}
                      unit={scaleProofUnit}
                      resultUnit={circumferenceDisplayUnit}
                      scaleEvidence={scaleEvidence}
                      formulaActiveCmPerPx={measurement?.activeCmPerPx ?? null}
                      measurement={measurement}
                      measurementUnavailableMessage={measurementUnavailableMessage}
                      depthRatioOverrides={depthRatioOverrides}
                      knownDepthRatioAnswers={knownDepthRatioAnswers}
                      onDepthRatioOverrideChange={onDepthRatioOverrideChange}
                      heightCm={heightCm}
                      heightScaleLine={heightScaleLine}
                      targetNaturalWaistCm={targetNaturalWaistCm}
                      targetTrouserWaistCm={targetTrouserWaistCm}
                      targetHipsCm={targetHipsCm}
                      onIntervalValueChange={setScaleProofIntervalValue}
                      onUnitChange={setScaleProofUnit}
                      onResultUnitChange={setCircumferenceDisplayUnit}
                      onRulerChange={(nextRuler) => setScaleProofRuler(nextRuler)}
                      onReset={resetScaleProofRuler}
                      onPlaceFreeRulerBesideTape={placeFreeRulerBesideTape}
                      onPlaceRedLineProofBesideTape={placeRedLineProofBesideTape}
                      bodyWidthMethod={bodyWidthMethod}
                      onBodyWidthMethodChange={setBodyWidthMethod}
                      onAppleVisionBodyScaleChange={isFullscreen ? onAppleVisionBodyScaleChange : undefined}
                      compact
                      autoRun={isFullscreen}
                    />
                  </div>
                  <details className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-2">
                    <summary className="cursor-pointer text-xs font-black text-slate-700">Advanced formulas and debugging</summary>
                    <div className="mt-2 space-y-3">
                  {guide?.notes || linkedEditor?.guide?.notes ? (
                    <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-[10px] leading-4 text-slate-700">
                      {guide?.notes ? <div>Front seed: {guide.notes}</div> : null}
                      {linkedEditor?.guide?.notes ? <div>Side seed: {linkedEditor.guide.notes}</div> : null}
                    </div>
                  ) : null}
                  {comparisonScaleEvidence ? (
                    <ManualScaleEvidence evidence={comparisonScaleEvidence} compact isActive={false} />
                  ) : null}
                  {onManualHeightScaleOverrideChange ? (
                    <ManualHeightScalePanel
                      line={heightScaleLine}
                      isManual={Boolean(activeManualHeightScaleOverride)}
                      heightCm={heightCm}
                      scaleEvidence={scaleEvidence}
                      onReset={resetManualHeightScaleOverride}
                      compact
                    />
                  ) : null}
                  {measurement ? (
                    <ScaleSensitivityPanel
                      measurement={measurement}
                      heightCm={heightCm}
                      heightScaleLine={heightScaleLine}
                      compact
                    />
                  ) : null}
                  <ManualCoordinateInputs
                    guide={normalizedGuide}
                    imageWidth={imageWidth}
                    imageHeight={imageHeight}
                    onChange={onChange}
                    compact
                  />
                  <ManualRealtimePanel
                    measurement={measurement}
                    measurementUnavailableMessage={measurementUnavailableMessage}
                    scaleEvidence={scaleEvidence}
                    targetNaturalWaistCm={targetNaturalWaistCm}
                    targetTrouserWaistCm={targetTrouserWaistCm}
                    targetHipsCm={targetHipsCm}
                    depthRatioOverrides={depthRatioOverrides}
                    onDepthRatioOverrideChange={onDepthRatioOverrideChange}
                    measurementMode={measurementMode}
                    compact
                  />
                  {linkedEditorReady ? (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <ManualRealtimePanel
                        measurement={linkedEditor?.measurement ?? null}
                        scaleEvidence={linkedEditor?.scaleEvidence}
                        measurementMode={linkedEditor?.measurementMode ?? "side-depth"}
                        targetNaturalWaistCm={linkedEditor?.targetNaturalWaistCm}
                        targetTrouserWaistCm={linkedEditor?.targetTrouserWaistCm}
                        targetHipsCm={linkedEditor?.targetHipsCm}
                        compact
                      />
                    </div>
                  ) : null}
                    </div>
                  </details>
                </aside>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ManualCoordinateInputs({
  guide,
  imageWidth,
  imageHeight,
  onChange,
  compact = false,
}: {
  guide: GeminiBodyGuide | null;
  imageWidth: number;
  imageHeight: number;
  onChange: (guide: GeminiBodyGuide) => void;
  compact?: boolean;
}) {
  if (!guide) return null;

  const updateLine = (kind: GuideKind, field: "y" | "left" | "right", rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const line = normalizeLine(guide[kind], imageWidth, imageHeight);
    if (!line) return;
    const y = field === "y" ? clamp(value, 0, imageHeight - 1) : line.y_px ?? 0;
    const left = field === "left" ? clamp(value, 0, imageWidth - 1) : line.left_x_px ?? 0;
    const right = field === "right" ? clamp(value, 0, imageWidth - 1) : line.right_x_px ?? 0;
    onChange({
      ...guide,
      [kind]: lineFromPoints([
        { x_px: left, y_px: y },
        { x_px: right, y_px: y },
      ], 1, imageWidth, imageHeight),
      notes: "Manual coordinate guide. Red endpoints own the active formula span; visible mask edge is debug evidence only.",
    });
  };

  return (
    <div className={`rounded-lg border border-red-200 bg-white ${compact ? "p-2" : "p-3"}`}>
      <div className="mb-2 text-xs font-semibold text-red-950">Manual coordinate numbers</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-red-50 text-red-950">
            <tr>
              <th className="px-2 py-1 font-semibold">Row</th>
              <th className="px-2 py-1 font-semibold">Y</th>
              <th className="px-2 py-1 font-semibold">Left</th>
              <th className="px-2 py-1 font-semibold">Right</th>
              <th className="px-2 py-1 font-semibold">Span</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-100 font-mono text-text-primary">
            {GUIDE_ROWS.map((row) => {
              const line = normalizeLine(guide[row.kind], imageWidth, imageHeight);
              if (!line) return null;
              const y = Math.round(line.y_px ?? 0);
              const left = Math.round(line.left_x_px ?? 0);
              const right = Math.round(line.right_x_px ?? 0);
              const span = Math.abs(right - left);
              return (
                <tr key={row.kind}>
                  <td className="px-2 py-1 font-sans text-text-secondary">{rowLabel(row.kind)}</td>
                  {(["y", "left", "right"] as const).map((field) => (
                    <td key={field} className="px-2 py-1">
                      <input
                        type="number"
                        step={1}
                        value={field === "y" ? y : field === "left" ? left : right}
                        onChange={(event) => updateLine(row.kind, field, event.currentTarget.value)}
                        className={`${compact ? "h-7 w-20" : "h-8 w-24"} rounded-md border border-red-100 bg-white px-2 font-mono text-[11px] text-text-primary`}
                        aria-label={`${rowLabel(row.kind)} ${field} coordinate`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1">{span}px</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-red-900">
        Circumference follows Left/Right span. Y only changes row placement unless the endpoints or active width change.
      </p>
    </div>
  );
}

function ScaleSensitivityPanel({
  measurement,
  heightCm,
  heightScaleLine,
  compact = false,
}: {
  measurement: GeminiGuideMeasurement;
  heightCm?: number;
  heightScaleLine: HeightScaleLine | null;
  compact?: boolean;
}) {
  const oneCmHeightPct = heightCm && heightCm > 0 ? 100 / heightCm : null;
  const sevenPctHeightCm = heightCm && heightCm > 0 ? heightCm * 0.07 : null;
  const spanPx = heightScaleLine?.bodySpanPx ?? null;
  const onePxSpanPct = spanPx && spanPx > 1 ? (1 / (spanPx - 1)) * 100 : null;
  const sevenPctSpanPx = spanPx && spanPx > 0 ? spanPx - (spanPx / 1.07) : null;

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 ${compact ? "p-2" : "p-3"}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-amber-950">Scale / line sensitivity proof</div>
        <div className="font-mono text-[11px] text-amber-900">
          active {measurement.activeCmPerPx.toFixed(5)} cm/px
        </div>
      </div>
      <div className="grid gap-2 text-[11px] text-amber-950 sm:grid-cols-3">
        <div className="rounded bg-white/80 px-2 py-1">
          <div className="font-semibold">1 cm height error</div>
          <div className="font-mono">{oneCmHeightPct == null ? "n/a" : `${oneCmHeightPct.toFixed(2)}% scale`}</div>
        </div>
        <div className="rounded bg-white/80 px-2 py-1">
          <div className="font-semibold">7% scale equals</div>
          <div className="font-mono">
            {sevenPctHeightCm == null ? "n/a" : `${sevenPctHeightCm.toFixed(1)} cm height error`}
          </div>
        </div>
        <div className="rounded bg-white/80 px-2 py-1">
          <div className="font-semibold">Yellow span impact</div>
          <div className="font-mono">
            {onePxSpanPct == null
              ? "n/a"
              : `1px ≈ ${onePxSpanPct.toFixed(3)}%; 7% ≈ ${sevenPctSpanPx?.toFixed(1)}px`}
          </div>
        </div>
      </div>
      <div className="mt-2 overflow-x-auto rounded border border-amber-100 bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-amber-100 text-amber-950">
            <tr>
              <th className="px-2 py-1 font-semibold">Row</th>
              <th className="px-2 py-1 font-semibold">Endpoint span</th>
              <th className="px-2 py-1 font-semibold">Result</th>
              <th className="px-2 py-1 font-semibold">±1 cm height</th>
              <th className="px-2 py-1 font-semibold">±1% scale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 font-mono text-text-primary">
            {measurement.rows.map((row) => {
              const endpointSpanPx = Math.abs(row.rightXPx - row.leftXPx);
              const oneCmHeightImpact = heightCm && heightCm > 0 ? row.guidedCm / heightCm : null;
              const onePctImpact = row.guidedCm * 0.01;
              return (
                <tr key={row.kind}>
                  <td className="px-2 py-1 font-sans text-text-secondary">{row.kind}</td>
                  <td className="px-2 py-1">{endpointSpanPx}px</td>
                  <td className="px-2 py-1">{row.guidedCm.toFixed(1)} cm</td>
                  <td className="px-2 py-1">{oneCmHeightImpact == null ? "n/a" : `±${oneCmHeightImpact.toFixed(2)} cm`}</td>
                  <td className="px-2 py-1">±{onePctImpact.toFixed(2)} cm</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-amber-900">
        Direct owners: yellow height span controls cm/px for every row; red endpoint X-span controls row width.
        Y position matters when it changes the endpoints/body edge or when side-depth mode uses that row.
      </p>
    </div>
  );
}

function ScaleProofPanel({
  imageUrl,
  imageWidth,
  imageHeight,
  bodyRows,
  bodyMaskSupport,
  ruler,
  freeRuler,
  redLineProofKind,
  redLineProofRuler,
  intervalValue,
  unit,
  resultUnit,
  scaleEvidence,
  formulaActiveCmPerPx,
  measurement,
  measurementUnavailableMessage,
  depthRatioOverrides,
  knownDepthRatioAnswers,
  onDepthRatioOverrideChange,
  heightCm,
  heightScaleLine,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
  onIntervalValueChange,
  onUnitChange,
  onResultUnitChange,
  onRulerChange,
  onReset,
  onPlaceFreeRulerBesideTape,
  onPlaceRedLineProofBesideTape,
  bodyWidthMethod,
  onBodyWidthMethodChange,
  onAppleVisionBodyScaleChange,
  compact = false,
  autoRun = true,
}: {
  imageUrl?: string | null;
  imageWidth: number;
  imageHeight: number;
  bodyRows: BodyScaleRowInput[];
  bodyMaskSupport: BodyMaskSupportRow[];
  ruler: ScaleProofRuler;
  freeRuler: ScaleProofRuler;
  redLineProofKind: RedLineVerticalProofKind;
  redLineProofRuler: ScaleProofRuler;
  intervalValue: number;
  unit: ScaleProofUnit;
  resultUnit: ScaleProofUnit;
  scaleEvidence?: ManualScaleEvidenceData | null;
  formulaActiveCmPerPx?: number | null;
  measurement: GeminiGuideMeasurement | null;
  measurementUnavailableMessage?: string;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  knownDepthRatioAnswers?: GeminiGuideDepthRatioOverrides;
  onDepthRatioOverrideChange?: (kind: GuideKind, ratio: number | null) => void;
  heightCm?: number;
  heightScaleLine?: HeightScaleLine | null;
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
  onIntervalValueChange: (value: number) => void;
  onUnitChange: (value: ScaleProofUnit) => void;
  onResultUnitChange: (value: ScaleProofUnit) => void;
  onRulerChange: (ruler: ScaleProofRuler) => void;
  onReset: () => void;
  onPlaceFreeRulerBesideTape: () => void;
  onPlaceRedLineProofBesideTape: (kind?: RedLineVerticalProofKind) => void;
  bodyWidthMethod: BodyWidthMethod;
  onBodyWidthMethodChange: (method: BodyWidthMethod) => void;
  onAppleVisionBodyScaleChange?: (result: AppleVisionBodyScaleResult | null) => void;
  compact?: boolean;
  autoRun?: boolean;
}) {
  const [applyAppleTapeCorrection, setApplyAppleTapeCorrection] = useState(false);
  const [appleVisionStatus, setAppleVisionStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [appleVisionError, setAppleVisionError] = useState<string | null>(null);
  const [appleVisionResult, setAppleVisionResult] = useState<AppleVisionBodyScaleResult | null>(null);
  const [appleVisionElapsedMs, setAppleVisionElapsedMs] = useState(0);
  const appleVisionStartedAtRef = useRef<number | null>(null);
  const autoAppleVisionKeyRef = useRef("");
  const [depthProStatus, setDepthProStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const autoDepthProKeyRef = useRef("");
  const [depthProError, setDepthProError] = useState<string | null>(null);
  const [depthProElapsedMs, setDepthProElapsedMs] = useState(0);
  const depthProStartedAtRef = useRef<number | null>(null);
  const [tapeVisionStatus, setTapeVisionStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [tapeVisionError, setTapeVisionError] = useState<string | null>(null);
  const [tapeVisionResult, setTapeVisionResult] = useState<TapeVisionClientResult | null>(null);
  const [tapeVisionElapsedMs, setTapeVisionElapsedMs] = useState(0);
  const tapeVisionStartedAtRef = useRef<number | null>(null);
  const autoTapeVisionKeyRef = useRef("");
  const [fusedTapeStatus, setFusedTapeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [fusedTapeError, setFusedTapeError] = useState<string | null>(null);
  const [fusedTapeElapsedMs, setFusedTapeElapsedMs] = useState(0);
  const fusedTapeStartedAtRef = useRef<number | null>(null);
  const autoFusedTapeKeyRef = useRef("");
  const [fusedTapeRetryCount, setFusedTapeRetryCount] = useState(0);
  const [fusedTapeResult, setFusedTapeResult] = useState<(AppleFusedTapeApiResult & {
    sourceImageUrl: string;
    queryKey: string;
  }) | null>(null);
  const [fusedBodyStatus, setFusedBodyStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [fusedBodyError, setFusedBodyError] = useState<string | null>(null);
  const autoFusedBodyKeyRef = useRef("");
  const [fusedBodyResult, setFusedBodyResult] = useState<(AppleFusedBodyScaleApiResult & {
    sourceImageUrl: string;
    geometryKey: string;
  }) | null>(null);
  const [depthProResult, setDepthProResult] = useState<{
    sourceImageUrl: string;
    cacheHit: boolean;
    rawProofCm: number;
    rawErrorPct: number;
    estimatedFocalPx: number;
    elapsedMs: number;
    depthPreviewDataUrl: string | null;
    depthPreviewNearM: number | null;
    depthPreviewFarM: number | null;
    proofRadiusSweep: Array<{ radiusPx: number; proofCm: number; errorPct: number }>;
    cacheKey: string;
    proofKey: string;
    bodyDepthGeometryKey: string;
    rows: DepthProBodyScaleRow[];
  } | null>(null);
  const expectedCm = unit === "in" ? inToCm(Math.abs(intervalValue)) : Math.abs(intervalValue);
  const proofKey = JSON.stringify({
    imageUrl,
    expectedCm,
    proofStart: ruler.start,
    proofEnd: ruler.end,
    bodyRows,
  });
  const bodySupportKey = JSON.stringify(bodyMaskSupport);
  const bodySupportReady = bodyMaskSupport.length === bodyRows.length && bodyMaskSupport.length > 0;
  const bodyDepthGeometryKey = JSON.stringify({ imageUrl, bodyRows, bodySupport: bodySupportKey });
  const geometryKey = JSON.stringify({ imageUrl, imageWidth, imageHeight, heightCm, bodyRows });
  const sourceAppleVisionResult = appleVisionResult?.sourceImageUrl === imageUrl ? appleVisionResult : null;
  const activeAppleVisionResult = sourceAppleVisionResult?.geometryKey === geometryKey ? sourceAppleVisionResult : null;
  const sourceDepthProResult = depthProResult?.sourceImageUrl === imageUrl ? depthProResult : null;
  const activeDepthProResult = sourceDepthProResult?.proofKey === proofKey ? sourceDepthProResult : null;
  const activeDepthProBodyResult = sourceDepthProResult?.bodyDepthGeometryKey === bodyDepthGeometryKey
    ? sourceDepthProResult
    : null;
  const fusedBodyGeometryKey = activeAppleVisionResult && heightCm
    ? JSON.stringify({
        imageUrl,
        cacheKey: activeAppleVisionResult.cacheKey,
        heightCm,
        bodyRows,
        bodySupport: bodySupportKey,
      })
    : "";
  const activeFusedBodyResult = fusedBodyResult
    && fusedBodyResult.sourceImageUrl === imageUrl
    && fusedBodyResult.geometryKey === fusedBodyGeometryKey
    ? fusedBodyResult
    : null;
  const sourceTapeVisionResult = tapeVisionResult?.sourceImageUrl === imageUrl ? tapeVisionResult : null;
  const activeTapeVisionResult = sourceTapeVisionResult?.unit === unit ? sourceTapeVisionResult : null;
  const hiddenIntervals = activeTapeVisionResult
    ? buildTapeVisionHiddenIntervals(activeTapeVisionResult, Math.abs(intervalValue), 4)
    : [];
  const hiddenIntervalsKey = JSON.stringify(hiddenIntervals.map((interval) => ({
    id: interval.id,
    start: interval.start,
    end: interval.end,
    startValue: interval.startValue,
    endValue: interval.endValue,
  })));
  const fusedTapeQueryKey = activeAppleVisionResult
    && activeTapeVisionResult
    && heightCm
    && hiddenIntervals.length === 4
    ? JSON.stringify({
        cacheKey: activeAppleVisionResult.cacheKey,
        heightCm,
        tapeHintX: activeTapeVisionResult.visualHintX,
        unit,
        active: { start: ruler.start, end: ruler.end },
        free: { start: freeRuler.start, end: freeRuler.end },
        redCopy: { start: redLineProofRuler.start, end: redLineProofRuler.end },
        hidden: hiddenIntervalsKey,
      })
    : "";
  const activeFusedTapeResult = fusedTapeResult && fusedTapeResult.sourceImageUrl === imageUrl
    && fusedTapeResult.queryKey === fusedTapeQueryKey
    ? fusedTapeResult
    : null;
  const fusedActivePrediction = activeFusedTapeResult?.segments.find((segment) => segment.id === "active") ?? null;
  const fusedFreePrediction = activeFusedTapeResult?.segments.find((segment) => segment.id === "free") ?? null;
  const fusedRedCopyPrediction = activeFusedTapeResult?.segments.find((segment) => segment.id === "red-copy") ?? null;
  const fusedHiddenTapeTests = activeFusedTapeResult
    ? activeFusedTapeResult.segments.flatMap((prediction): AppleFusedTapeTest[] => {
        if (prediction.id === "active") return [];
        const interval = hiddenIntervals.find((candidate) => candidate.id === prediction.id);
        if (!interval) return [];
        const expectedHiddenCm = unit === "in" ? inToCm(Math.abs(intervalValue)) : Math.abs(intervalValue);
        const errorCm = prediction.predictedCm - expectedHiddenCm;
        return [{
          ...prediction,
          startTapeValue: interval.startValue,
          endTapeValue: interval.endValue,
          tapeUnit: unit,
          expectedCm: expectedHiddenCm,
          errorCm,
          errorPct: (errorCm / expectedHiddenCm) * 100,
        }];
      })
    : [];
  useEffect(() => {
    if (appleVisionStatus !== "loading" && depthProStatus !== "loading" && tapeVisionStatus !== "loading" && fusedTapeStatus !== "loading") return;
    const tick = () => {
      if (appleVisionStatus === "loading" && appleVisionStartedAtRef.current != null) {
        setAppleVisionElapsedMs(performance.now() - appleVisionStartedAtRef.current);
      }
      if (depthProStatus === "loading" && depthProStartedAtRef.current != null) {
        setDepthProElapsedMs(performance.now() - depthProStartedAtRef.current);
      }
      if (tapeVisionStatus === "loading" && tapeVisionStartedAtRef.current != null) {
        setTapeVisionElapsedMs(performance.now() - tapeVisionStartedAtRef.current);
      }
      if (fusedTapeStatus === "loading" && fusedTapeStartedAtRef.current != null) {
        setFusedTapeElapsedMs(performance.now() - fusedTapeStartedAtRef.current);
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 100);
    return () => window.clearInterval(intervalId);
  }, [appleVisionStatus, depthProStatus, tapeVisionStatus, fusedTapeStatus]);
  const tapeVisionMeasurement = activeTapeVisionResult
    ? measureTapeVisionCm(activeTapeVisionResult, ruler.start, ruler.end)
    : null;
  const redLineProofTapeMeasurement = activeTapeVisionResult
    ? measureTapeVisionCm(activeTapeVisionResult, redLineProofRuler.start, redLineProofRuler.end)
    : null;
  const tapeVisionSnap = activeTapeVisionResult
    ? buildTapeVisionSnap(activeTapeVisionResult, ruler.start, ruler.end, Math.abs(intervalValue))
    : null;
  const deltaXPx = ruler.end.x - ruler.start.x;
  const deltaYPx = ruler.end.y - ruler.start.y;
  const pixelSpan = Math.hypot(deltaXPx, deltaYPx);
  const freeDeltaXPx = freeRuler.end.x - freeRuler.start.x;
  const freeDeltaYPx = freeRuler.end.y - freeRuler.start.y;
  const freePixelSpan = Math.hypot(freeDeltaXPx, freeDeltaYPx);
  const redLineProofDeltaXPx = redLineProofRuler.end.x - redLineProofRuler.start.x;
  const redLineProofDeltaYPx = redLineProofRuler.end.y - redLineProofRuler.start.y;
  const redLineProofPixelSpan = Math.hypot(redLineProofDeltaXPx, redLineProofDeltaYPx);
  const activeCmPerPx = formulaActiveCmPerPx && formulaActiveCmPerPx > 0
    ? formulaActiveCmPerPx
    : scaleEvidence?.activeCmPerPx ?? null;
  const flatComparisonCmPerPx = scaleEvidence?.activeCmPerPx ?? activeCmPerPx;
  const scaleDisplayDeltaPct = activeCmPerPx && scaleEvidence?.activeCmPerPx
    ? ((activeCmPerPx / scaleEvidence.activeCmPerPx) - 1) * 100
    : null;
  const bothPlaced = ruler.touchedStart && ruler.touchedEnd;
  const hasTwoHandles = Number.isFinite(ruler.start.x) &&
    Number.isFinite(ruler.start.y) &&
    Number.isFinite(ruler.end.x) &&
    Number.isFinite(ruler.end.y);
  const validInterval = expectedCm > 0 && pixelSpan > 0;
  const ready = Boolean(activeCmPerPx && hasTwoHandles && validInterval);
  const measuredCm = ready && activeCmPerPx ? pixelSpan * activeCmPerPx : null;
  const freeMeasuredCm = flatComparisonCmPerPx && freePixelSpan > 0 ? freePixelSpan * flatComparisonCmPerPx : null;
  const impliedCmPerPx = ready ? expectedCm / pixelSpan : null;
  const heightScaleExpectedPixelSpan = activeCmPerPx && expectedCm > 0
    ? expectedCm / activeCmPerPx
    : null;
  const pixelSpanError = heightScaleExpectedPixelSpan == null
    ? null
    : pixelSpan - heightScaleExpectedPixelSpan;
  const pixelSpanErrorPct = pixelSpanError == null || heightScaleExpectedPixelSpan == null || heightScaleExpectedPixelSpan <= 0
    ? null
    : (pixelSpanError / heightScaleExpectedPixelSpan) * 100;
  const tapeImpliedVisibleHeightCm = impliedCmPerPx && heightScaleLine
    ? heightScaleLine.bodySpanPx * impliedCmPerPx
    : null;
  const errorCm = measuredCm == null ? null : measuredCm - expectedCm;
  const errorPct = errorCm == null || expectedCm <= 0 ? null : (errorCm / expectedCm) * 100;
  const absoluteErrorPct = errorPct == null ? null : Math.abs(errorPct);
  const depthProAbsoluteErrorPct = activeDepthProResult ? Math.abs(activeDepthProResult.rawErrorPct) : null;
  const depthProProofStatus = depthProAbsoluteErrorPct == null
    ? null
    : depthProAbsoluteErrorPct <= 1
      ? { label: "PASS", className: "border-emerald-400 bg-emerald-100 text-emerald-950" }
      : depthProAbsoluteErrorPct <= 2
        ? { label: "CHECK", className: "border-amber-400 bg-amber-100 text-amber-950" }
        : { label: "FAIL", className: "border-red-400 bg-red-100 text-red-950" };
  const appleVisionQualityStatus = activeAppleVisionResult?.geometryQuality === "pass"
    ? { label: "PASS · BODY GEOMETRY FIT", className: "border-emerald-400 bg-emerald-100 text-emerald-950" }
    : activeAppleVisionResult?.geometryQuality === "check"
      ? { label: "CHECK · BODY GEOMETRY FIT", className: "border-amber-400 bg-amber-100 text-amber-950" }
      : activeAppleVisionResult?.geometryQuality === "reject"
        ? { label: "REJECT · BODY GEOMETRY FIT", className: "border-red-400 bg-red-100 text-red-950" }
        : null;
  const proofRequiredHeightSpanPx = impliedCmPerPx && heightCm && heightCm > 0
    ? heightCm / impliedCmPerPx
    : null;
  const proofRequiredTopY = proofRequiredHeightSpanPx != null && heightScaleLine
    ? heightScaleLine.bottomY - proofRequiredHeightSpanPx
    : null;
  const status = !activeCmPerPx
    ? { label: "NO ACTIVE SCALE", className: "border-slate-300 bg-slate-100 text-slate-700" }
    : !validInterval
        ? { label: "INVALID INTERVAL", className: "border-red-200 bg-red-50 text-red-800" }
        : !bothPlaced
          ? { label: "MOVE BOTH GREEN HANDLES TO TAPE MARKS", className: "border-blue-200 bg-blue-50 text-blue-800" }
          : absoluteErrorPct != null && absoluteErrorPct <= 1
            ? { label: "PASS · WITHIN 1%", className: "border-emerald-300 bg-emerald-50 text-emerald-800" }
            : absoluteErrorPct != null && absoluteErrorPct <= 2
              ? { label: "CHECK · WITHIN 2%", className: "border-amber-300 bg-amber-50 text-amber-900" }
              : { label: "FAIL · SINGLE-SCALE CONTRADICTION OR HANDLE ERROR", className: "border-red-300 bg-red-50 text-red-800" };
  const setFiniteValue = (value: string, setter: (next: number) => void) => {
    const next = Number(value);
    if (Number.isFinite(next)) setter(next);
  };
  const runAppleVisionBodyScale = async () => {
    if (!imageUrl || !heightCm || !bodyRows.length || imageWidth <= 0 || imageHeight <= 0) return;
    appleVisionStartedAtRef.current = performance.now();
    setAppleVisionElapsedMs(0);
    setAppleVisionStatus("loading");
    setAppleVisionError(null);
    try {
      const cacheKey = sourceAppleVisionResult?.cacheKey;
      const imageDataUrl = cacheKey ? undefined : await urlToDataUrl(imageUrl);
      const response = await fetch("/api/try-on-test/sizing-lab/apple-vision-pose3d", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          cacheKey,
          imageWidth,
          imageHeight,
          heightCm,
          rows: bodyRows,
        }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; result?: AppleVisionBodyScaleResult };
      if (!response.ok || !data.ok || !data.result) throw new Error(data.error ?? "Apple Vision 3D failed.");
      setAppleVisionElapsedMs(performance.now() - appleVisionStartedAtRef.current);
      setAppleVisionResult({ ...data.result, sourceImageUrl: imageUrl, geometryKey });
      setAppleVisionStatus("ready");
    } catch (error) {
      if (appleVisionStartedAtRef.current != null) setAppleVisionElapsedMs(performance.now() - appleVisionStartedAtRef.current);
      setAppleVisionError(error instanceof Error ? error.message : "Apple Vision 3D failed.");
      setAppleVisionStatus("error");
    }
  };
  const bodyScaleGate = useMemo(
    () => evaluateBodyScaleGate(activeAppleVisionResult, activeFusedBodyResult),
    [activeAppleVisionResult, activeFusedBodyResult],
  );
  const bodyScaleCandidateResult = useMemo(
    () => bodyWidthMethod === "apple-vision"
      ? buildAppleVisionBodyScaleCandidateResult(activeAppleVisionResult)
      : buildBodyScaleCandidateResult(activeAppleVisionResult, activeFusedBodyResult),
    [activeAppleVisionResult, activeFusedBodyResult, bodyWidthMethod],
  );
  const redLineProofInputRow = bodyRows.find((row) => row.name === redLineProofKind) ?? null;
  useEffect(() => {
    // Keep the calculated local-lab circumference visible for comparison even
    // when the separate Apple-vs-Depth agreement gate rejects approval.
    onAppleVisionBodyScaleChange?.(bodyScaleCandidateResult);
  }, [bodyScaleCandidateResult, onAppleVisionBodyScaleChange]);
  const runDepthProProof = async () => {
    if (!imageUrl || !heightCm || !heightScaleLine || !validInterval) return;
    depthProStartedAtRef.current = performance.now();
    setDepthProElapsedMs(0);
    setDepthProStatus("loading");
    setDepthProError(null);
    try {
      const cacheKey = sourceDepthProResult?.cacheKey ?? activeAppleVisionResult?.cacheKey;
      const requestDepthPro = async (requestedCacheKey?: string) => {
        const imageDataUrl = requestedCacheKey ? undefined : await urlToDataUrl(imageUrl);
        return fetchWithTimeout("/api/try-on-test/sizing-lab/depth-pro", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            imageDataUrl,
            cacheKey: requestedCacheKey,
            heightCm,
            top: { x: heightScaleLine.centerX, y: heightScaleLine.topY },
            bottom: { x: heightScaleLine.centerX, y: heightScaleLine.bottomY },
            proofStart: ruler.start,
            proofEnd: ruler.end,
            proofCm: expectedCm,
            rows: bodyRows,
          }),
        }, 130_000, "Raw Depth Pro");
      };
      let response = await requestDepthPro(cacheKey);
      // Apple and Depth Pro share the source-image hash, but Apple can finish
      // before the depth map exists. A cache miss is temporary, not a terminal
      // body-scale failure: resend the image once so Depth Pro can build it.
      if (response.status === 409 && cacheKey) response = await requestDepthPro();
      const data = await response.json() as { ok?: boolean; error?: string; result?: typeof depthProResult };
      if (!response.ok || !data.ok || !data.result) throw new Error(data.error ?? "Depth Pro failed.");
      setDepthProResult({
        ...data.result,
        sourceImageUrl: imageUrl,
        proofKey,
        bodyDepthGeometryKey,
      });
      setDepthProStatus("ready");
    } catch (error) {
      autoDepthProKeyRef.current = "";
      setDepthProError(error instanceof Error ? error.message : "Depth Pro failed.");
      setDepthProStatus("error");
    } finally {
      if (depthProStartedAtRef.current != null) setDepthProElapsedMs(performance.now() - depthProStartedAtRef.current);
    }
  };
  const runTapeVision = async () => {
    if (!imageUrl || imageWidth <= 0 || imageHeight <= 0) return;
    tapeVisionStartedAtRef.current = performance.now();
    setTapeVisionElapsedMs(0);
    setTapeVisionStatus("loading");
    setTapeVisionError(null);
    try {
      const imageDataUrl = await urlToDataUrl(imageUrl);
      const hintX = (ruler.start.x + ruler.end.x) / 2;
      const response = await fetchWithTimeout("/api/try-on-test/sizing-lab/apple-vision-tape-ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl, imageWidth, imageHeight, hintX, unit }),
      }, 90_000, "Tape detector");
      const data = await response.json() as { ok?: boolean; error?: string; result?: Omit<TapeVisionClientResult, "sourceImageUrl"> };
      if (!response.ok || !data.ok || !data.result) throw new Error(data.error ?? "Apple Vision tape OCR failed.");
      setTapeVisionResult({ ...data.result, sourceImageUrl: imageUrl });
      setTapeVisionStatus("ready");
    } catch (error) {
      setTapeVisionError(error instanceof Error ? error.message : "Apple Vision tape OCR failed.");
      setTapeVisionStatus("error");
    } finally {
      if (tapeVisionStartedAtRef.current != null) setTapeVisionElapsedMs(performance.now() - tapeVisionStartedAtRef.current);
    }
  };
  const snapExactTapeInterval = () => {
    if (!tapeVisionSnap) return;
    onRulerChange({
      ...ruler,
      start: tapeVisionSnap.start,
      end: tapeVisionSnap.end,
      touchedStart: true,
      touchedEnd: true,
    });
  };
  const tapeVisionAutoKey = `${imageUrl ?? ""}|${imageWidth}x${imageHeight}|${unit}`;
  useEffect(() => {
    if (!compact || !autoRun || !imageUrl || imageWidth <= 0 || imageHeight <= 0) return;
    if (activeTapeVisionResult || tapeVisionStatus === "loading" || autoTapeVisionKeyRef.current === tapeVisionAutoKey) return;
    const timeoutId = window.setTimeout(() => {
      autoTapeVisionKeyRef.current = tapeVisionAutoKey;
      void runTapeVision();
    }, 300);
    return () => window.clearTimeout(timeoutId);
    // The serialized key owns the image and unit used by the coordinate-only reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, autoRun, tapeVisionAutoKey, activeTapeVisionResult, tapeVisionStatus, imageUrl, imageWidth, imageHeight]);
  useEffect(() => {
    if (!autoRun || !imageUrl || !heightCm || !bodyRows.length || imageWidth <= 0 || imageHeight <= 0) return;
    if (autoAppleVisionKeyRef.current === geometryKey) return;
    const timeoutId = window.setTimeout(() => {
      autoAppleVisionKeyRef.current = geometryKey;
      void runAppleVisionBodyScale();
    }, 400);
    return () => window.clearTimeout(timeoutId);
    // The serialized key owns all geometry inputs; the callback intentionally follows it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryKey, autoRun, imageUrl, imageWidth, imageHeight, heightCm, bodyRows.length]);
  useEffect(() => {
    if (!compact || !autoRun || !fusedTapeQueryKey || !activeAppleVisionResult || !activeTapeVisionResult || hiddenIntervals.length !== 4) return;
    if (activeFusedTapeResult || autoFusedTapeKeyRef.current === fusedTapeQueryKey) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      autoFusedTapeKeyRef.current = fusedTapeQueryKey;
      fusedTapeStartedAtRef.current = performance.now();
      setFusedTapeElapsedMs(0);
      setFusedTapeStatus("loading");
      setFusedTapeError(null);
      const segments = [
        { id: "active", start: ruler.start, end: ruler.end },
        { id: "free", start: freeRuler.start, end: freeRuler.end },
        { id: "red-copy", start: redLineProofRuler.start, end: redLineProofRuler.end },
        ...hiddenIntervals.map((interval) => ({
          id: interval.id,
          start: interval.start,
          end: interval.end,
        })),
      ];
      void fetchWithTimeout("/api/try-on-test/sizing-lab/apple-fused-tape-scale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cacheKey: activeAppleVisionResult.cacheKey,
          heightCm,
          tapeHintX: activeTapeVisionResult.visualHintX,
          tapeUnit: unit,
          visualSource: "ocr-cache",
          segments,
        }),
      }, 35_000, "Apple fused tape scale")
        .then(async (response) => {
          const data = await response.json() as { ok?: boolean; error?: string; result?: AppleFusedTapeApiResult };
          if (!response.ok || !data.ok || !data.result) throw new Error(data.error ?? "Apple fused tape scale failed.");
          if (cancelled) return;
          setFusedTapeResult({
            ...data.result,
            sourceImageUrl: imageUrl ?? "",
            queryKey: fusedTapeQueryKey,
          });
          setFusedTapeElapsedMs(performance.now() - (fusedTapeStartedAtRef.current ?? performance.now()));
          setFusedTapeStatus("ready");
        })
        .catch((error) => {
          if (cancelled) return;
          autoFusedTapeKeyRef.current = "";
          setFusedTapeElapsedMs(performance.now() - (fusedTapeStartedAtRef.current ?? performance.now()));
          setFusedTapeError(error instanceof Error ? error.message : "Apple fused tape scale failed.");
          setFusedTapeStatus("error");
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // The request contains colour-path coordinates only. Expected tape length
    // and OCR values are joined for scoring after this response returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, autoRun, fusedTapeQueryKey, activeAppleVisionResult, activeTapeVisionResult, hiddenIntervals.length, fusedTapeRetryCount]);
  const retryFusedTape = () => {
    autoFusedTapeKeyRef.current = "";
    setFusedTapeResult(null);
    setFusedTapeError(null);
    setFusedTapeStatus("idle");
    setFusedTapeElapsedMs(0);
    setFusedTapeRetryCount((current) => current + 1);
  };
  useEffect(() => {
    if (!autoRun || !hasTwoHandles || !imageUrl || !heightCm || !heightScaleLine || !validInterval) return;
    const shouldRunBodyCrossCheck = Boolean(bodyRows.length && activeAppleVisionResult);
    const shouldRunRawProof = !compact;
    if (!shouldRunBodyCrossCheck && !shouldRunRawProof) return;
    const requestKey = shouldRunRawProof ? proofKey : `body:${bodyDepthGeometryKey}`;
    const alreadyReady = shouldRunRawProof ? activeDepthProResult : activeDepthProBodyResult;
    if (alreadyReady || autoDepthProKeyRef.current === requestKey) return;
    const timeoutId = window.setTimeout(() => {
      autoDepthProKeyRef.current = requestKey;
      void runDepthProProof();
    }, 400);
    return () => window.clearTimeout(timeoutId);
    // runDepthProProof intentionally follows the serialized geometry key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    proofKey,
    compact,
    bodyDepthGeometryKey,
    activeDepthProBodyResult,
    activeAppleVisionResult,
    bodyRows.length,
    autoRun,
    hasTwoHandles,
    imageUrl,
    heightCm,
    heightScaleLine?.centerX,
    heightScaleLine?.topY,
    heightScaleLine?.bottomY,
    validInterval,
  ]);
  useEffect(() => {
    if (!autoRun || !activeAppleVisionResult || !activeDepthProBodyResult || !heightCm || !fusedBodyGeometryKey) return;
    if (!bodySupportReady) return;
    if (activeFusedBodyResult || autoFusedBodyKeyRef.current === fusedBodyGeometryKey) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      autoFusedBodyKeyRef.current = fusedBodyGeometryKey;
      setFusedBodyStatus("loading");
      setFusedBodyError(null);
      void fetchWithTimeout("/api/try-on-test/sizing-lab/apple-fused-body-scale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cacheKey: activeAppleVisionResult.cacheKey,
          heightCm,
          rows: bodyRows,
          bodySupport: bodyMaskSupport,
        }),
      }, 35_000, "Body-only red-line scale")
        .then(async (response) => {
          const data = await response.json() as { ok?: boolean; error?: string; result?: AppleFusedBodyScaleApiResult };
          if (!response.ok || !data.ok || !data.result) throw new Error(data.error ?? "Body-only red-line scale failed.");
          if (cancelled) return;
          setFusedBodyResult({
            ...data.result,
            sourceImageUrl: imageUrl ?? "",
            geometryKey: fusedBodyGeometryKey,
          });
          setFusedBodyStatus("ready");
        })
        .catch((error) => {
          if (cancelled) return;
          autoFusedBodyKeyRef.current = "";
          setFusedBodyError(error instanceof Error ? error.message : "Body-only red-line scale failed.");
          setFusedBodyStatus("error");
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // The target-free geometry key owns every input to this body-plane run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, activeAppleVisionResult, activeDepthProBodyResult, heightCm, fusedBodyGeometryKey, activeFusedBodyResult, bodyMaskSupport, bodyRows.length, bodySupportReady]);
  return (
    <div
      data-testid="scale-proof-panel"
      className={compact
        ? "mb-3 text-[11px] text-slate-900"
        : "rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-text-primary"}
    >
      {!compact ? (
        <details className="rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">How the tools work · Apple 3D, Depth Pro and MediaPipe</summary>
          <div className="mt-3 space-y-3">
            <AppleProcessingCounter
              compact={false}
              appleVisionStatus={appleVisionStatus}
              appleVisionElapsedMs={appleVisionElapsedMs}
              depthFieldStatus={depthProStatus}
              depthFieldElapsedMs={depthProElapsedMs}
              tapeVisionStatus={tapeVisionStatus}
              tapeVisionElapsedMs={tapeVisionElapsedMs}
              fusedTapeStatus={fusedTapeStatus}
              fusedTapeElapsedMs={fusedTapeElapsedMs}
            />
            <ManualMeasurementStepper
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              heightCm={heightCm}
              bodySpanPx={heightScaleLine?.bodySpanPx ?? null}
              redRows={bodyRows}
              personMaskReady={bodySupportReady}
              appleResult={activeAppleVisionResult}
              bodySurfaceResult={activeFusedBodyResult}
              measurement={measurement}
              targetNaturalWaistCm={targetNaturalWaistCm}
              targetTrouserWaistCm={targetTrouserWaistCm}
              targetHipsCm={targetHipsCm}
            />
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-2" data-testid="model-layer-details">
              <summary className="cursor-pointer text-xs font-medium text-slate-700">Model layers · what actually sees the tape</summary>
              <div className="mt-3">
                <ModelLayerInspector
                  imageUrl={imageUrl ?? null}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  appleResult={activeAppleVisionResult}
                  tapePoints={activeTapeVisionResult?.detections ?? []}
                  tapePathEvidence={activeFusedTapeResult?.pathEvidence ?? null}
                  tapeGeometryMode={activeFusedTapeResult?.model.tapePlane.geometryMode ?? null}
                  depthPreviewDataUrl={activeDepthProResult?.depthPreviewDataUrl ?? null}
                  depthPreviewNearM={activeDepthProResult?.depthPreviewNearM ?? null}
                  depthPreviewFarM={activeDepthProResult?.depthPreviewFarM ?? null}
                  depthStatus={depthProStatus}
                />
              </div>
            </details>
          </div>
        </details>
      ) : null}
      {compact ? (
        <>
          <FullScreenEssentialMeasurementSummary
            unit={resultUnit}
            onUnitChange={onResultUnitChange}
            appleResult={activeAppleVisionResult}
            fusedBodyResult={activeFusedBodyResult}
            measurement={measurement}
            measurementUnavailableMessage={measurementUnavailableMessage}
            bodyWidthMethod={bodyWidthMethod}
            onBodyWidthMethodChange={onBodyWidthMethodChange}
            targetNaturalWaistCm={targetNaturalWaistCm}
            targetTrouserWaistCm={targetTrouserWaistCm}
            targetHipsCm={targetHipsCm}
          />
          <FullScreenDepthRatioControls
            measurement={measurement}
            measurementUnavailableMessage={measurementUnavailableMessage}
            depthRatioOverrides={depthRatioOverrides}
            knownDepthRatioAnswers={knownDepthRatioAnswers}
            onDepthRatioOverrideChange={onDepthRatioOverrideChange}
          />
          <FullScreenRedLineVerticalProof
            selectedKind={redLineProofKind}
            resultUnit={unit}
            sourcePixelSpan={redLineProofInputRow ? Math.abs(redLineProofInputRow.rightX - redLineProofInputRow.leftX) : 0}
            verticalPixelSpan={redLineProofPixelSpan}
            flatCm={flatComparisonCmPerPx && redLineProofPixelSpan > 0
              ? redLineProofPixelSpan * flatComparisonCmPerPx
              : null}
            fusedCm={fusedRedCopyPrediction?.predictedCm ?? null}
            fusedStatus={fusedTapeStatus}
            fusedError={fusedTapeError}
            fusedElapsedMs={fusedTapeElapsedMs}
            applyAppleCorrection={applyAppleTapeCorrection}
            tapeJudgeCm={redLineProofTapeMeasurement?.cm ?? null}
            tapeStartValue={redLineProofTapeMeasurement?.startValue ?? null}
            tapeEndValue={redLineProofTapeMeasurement?.endValue ?? null}
            tapeUnit={activeTapeVisionResult?.unit ?? unit}
            onSelectKind={(kind) => onPlaceRedLineProofBesideTape(kind)}
            onPlaceBesideTape={() => onPlaceRedLineProofBesideTape(redLineProofKind)}
            onApplyAppleCorrectionChange={setApplyAppleTapeCorrection}
            onRetryFused={retryFusedTape}
          />
          <FullScreenGreenRulerComparison
            key={imageUrl ?? ""}
            proofKey={proofKey}
            expectedCm={expectedCm}
            intervalValue={intervalValue}
            unit={unit}
            imageUrl={imageUrl ?? null}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            start={ruler.start}
            end={ruler.end}
            pixelSpan={pixelSpan}
            freeStart={freeRuler.start}
            freeEnd={freeRuler.end}
            freePixelSpan={freePixelSpan}
            freeFlatCm={freeMeasuredCm}
            freeFusedCm={fusedFreePrediction?.predictedCm ?? null}
            flatCm={flatComparisonCmPerPx ? pixelSpan * flatComparisonCmPerPx : measuredCm}
            fusedCm={fusedActivePrediction?.predictedCm ?? null}
            fusedStatus={fusedTapeStatus}
            fusedError={fusedTapeError}
            fusedElapsedMs={fusedTapeElapsedMs}
            fusedPathEvidence={activeFusedTapeResult?.pathEvidence ?? null}
            tapeVisionCm={tapeVisionMeasurement?.cm ?? null}
            tapeVisionStartValue={tapeVisionMeasurement?.startValue ?? null}
            tapeVisionEndValue={tapeVisionMeasurement?.endValue ?? null}
            tapeVisionUnit={activeTapeVisionResult?.unit ?? unit}
            tapeVisionStatus={tapeVisionStatus}
            tapeVisionError={tapeVisionError}
            tapeVisionElapsedMs={tapeVisionElapsedMs}
            tapeVisionModel={activeTapeVisionResult?.model ?? null}
            canSnapToTape={Boolean(tapeVisionSnap)}
            onSnapToTape={snapExactTapeInterval}
            onRetryTapeVision={() => void runTapeVision()}
            onRetryFused={retryFusedTape}
            onPlaceFreeRulerBesideTape={onPlaceFreeRulerBesideTape}
            applyAppleCorrection={applyAppleTapeCorrection}
            onApplyAppleCorrectionChange={setApplyAppleTapeCorrection}
          />
          <details className="mb-3 rounded-xl border border-slate-200 bg-white p-3" data-testid="model-layer-details">
            <summary className="cursor-pointer text-xs font-medium text-slate-700">Model layers · what actually sees the tape</summary>
            <div className="mt-3">
              <ModelLayerInspector
                imageUrl={imageUrl ?? null}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                appleResult={activeAppleVisionResult}
                tapePoints={activeTapeVisionResult?.detections ?? []}
                tapePathEvidence={activeFusedTapeResult?.pathEvidence ?? null}
                tapeGeometryMode={activeFusedTapeResult?.model.tapePlane.geometryMode ?? null}
                depthPreviewDataUrl={activeDepthProResult?.depthPreviewDataUrl ?? null}
                depthPreviewNearM={activeDepthProResult?.depthPreviewNearM ?? null}
                depthPreviewFarM={activeDepthProResult?.depthPreviewFarM ?? null}
                depthStatus={depthProStatus}
              />
            </div>
          </details>
          <FullScreenRedLineSummary
            bodyRows={bodyRows}
            appleResult={activeAppleVisionResult}
            fusedBodyResult={activeFusedBodyResult}
            bodyScaleConfirmed={bodyScaleGate.confirmed}
            unit={resultUnit}
          />
          <details className="mb-3 rounded-xl border border-slate-200 bg-white p-3" data-testid="model-explanations">
            <summary className="cursor-pointer text-xs font-medium text-slate-700">What are Apple 3D, Depth Pro, MediaPipe and tape OCR?</summary>
            <div className="mt-3 space-y-2 text-[11px] leading-4 text-slate-700">
              <AppleProcessingCounter
                compact
                appleVisionStatus={appleVisionStatus}
                appleVisionElapsedMs={appleVisionElapsedMs}
                depthFieldStatus={depthProStatus}
                depthFieldElapsedMs={depthProElapsedMs}
                tapeVisionStatus={tapeVisionStatus}
                tapeVisionElapsedMs={tapeVisionElapsedMs}
                fusedTapeStatus={fusedTapeStatus}
                fusedTapeElapsedMs={fusedTapeElapsedMs}
              />
              <p><span className="font-medium text-slate-900">Apple Vision 3D:</span> builds a 17-joint skeleton and estimates camera focal length and person distance. It is not a body surface and does not produce waist circumference.</p>
              <p><span className="font-medium text-slate-900">Depth Pro:</span> estimates how far each image pixel is from the camera. It helps correct perspective, but thin tape edges and background pixels can still create error.</p>
              <p><span className="font-medium text-slate-900">MediaPipe:</span> finds the person mask and landmarks. It selects body pixels but does not convert pixels to centimetres.</p>
              <p><span className="font-medium text-slate-900">Tape OCR:</span> reads printed tape marks only to place A and B. It proves the selected tape interval; it never sets body scale.</p>
              {activeDepthProResult ? (
                <p className="rounded-lg bg-slate-50 px-2 py-2">
                  Raw Depth Pro tape check: {formatDistanceCompact(activeDepthProResult.rawProofCm, unit)} versus {formatDistanceCompact(expectedCm, unit)} expected · error {formatSignedDistanceCompact(activeDepthProResult.rawProofCm - expectedCm, unit)} ({activeDepthProResult.rawErrorPct >= 0 ? "+" : ""}{activeDepthProResult.rawErrorPct.toFixed(2)}%). Debug only; this is not a waist or hip result.
                </p>
              ) : null}
            </div>
          </details>
          <details className="rounded-xl border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-600">Advanced checks and debugging</summary>
            <div className="mt-3">
              <FullScreenTapeRedLineScaleCheck
                bodyRows={bodyRows}
                tapeModel={activeFusedTapeResult?.model ?? null}
                tapeTests={fusedHiddenTapeTests}
                tapeStatus={fusedTapeStatus}
                fusedBodyResult={activeFusedBodyResult}
                fusedBodyStatus={bodySupportReady ? fusedBodyStatus : "error"}
              />
              <FullScreenBodyScaleGate
                appleResult={activeAppleVisionResult}
                fusedResult={activeFusedBodyResult}
                fusedStatus={bodySupportReady ? fusedBodyStatus : "error"}
                fusedError={bodySupportReady ? fusedBodyError : "Person-mask support is unavailable for one or more red rows."}
                tapeControlTests={fusedHiddenTapeTests}
                tapeControlStatus={fusedTapeStatus}
              />
              <FullScreenBodyMeasurementGate
                measurement={measurement}
                measurementUnavailableMessage={measurementUnavailableMessage}
                targetNaturalWaistCm={targetNaturalWaistCm}
                targetTrouserWaistCm={targetTrouserWaistCm}
                targetHipsCm={targetHipsCm}
                bodyScaleConfirmed={bodyScaleGate.confirmed}
              />
            </div>
          </details>
        </>
      ) : null}
      <details className="mt-3 rounded-lg border border-slate-200 bg-white p-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-600">Raw calculations and legacy checks</summary>
        <div className="mt-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">Tape interval diagnostic</div>
          <p className={`${compact ? "mt-0.5" : "mt-1"} leading-relaxed text-emerald-900`}>
            Drag both green crosshairs onto exact printed tape marks. This tests the tape only; it does not set Shane&apos;s body scale.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          Reset proof ruler
        </button>
      </div>
      <div className={`${compact ? "mt-2 gap-1" : "mt-3 gap-2"} grid grid-cols-2`}>
        <label className="rounded bg-white px-2 py-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Tape interval length</span>
          <input
            type="number"
            step="0.001"
            min="0"
            value={intervalValue}
            onChange={(event) => setFiniteValue(event.currentTarget.value, onIntervalValueChange)}
            aria-label="Scale proof tape interval length"
            className="mt-1 w-full rounded border border-emerald-200 px-2 py-1 font-mono text-xs text-text-primary"
          />
        </label>
        <label className="rounded bg-white px-2 py-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Tape unit</span>
          <select
            value={unit}
            onChange={(event) => onUnitChange(event.currentTarget.value as ScaleProofUnit)}
            aria-label="Scale proof tape unit"
            className="mt-1 w-full rounded border border-emerald-200 px-2 py-1 font-mono text-xs text-text-primary"
          >
            <option value="cm">Centimetres (cm)</option>
            <option value="in">Inches (in)</option>
          </select>
        </label>
      </div>
      <div className="mt-2 rounded-xl border-2 border-violet-400 bg-violet-50 p-3 text-violet-950 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-base font-black">APPLE VISION 3D · BODY SCALE</div>
            <div className="text-[10px] text-violet-800">
              Solves Shane&apos;s camera-space body pose, rescales Apple&apos;s skeleton to the known height, and converts each red pixel span at that body depth.
            </div>
          </div>
          <button
            type="button"
            disabled={appleVisionStatus === "loading" || !imageUrl || !heightCm || !bodyRows.length}
            onClick={() => void runAppleVisionBodyScale()}
            className="rounded-lg border-2 border-violet-500 bg-violet-700 px-3 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {appleVisionStatus === "loading" ? "Running Apple Vision…" : activeAppleVisionResult ? "Refresh body scale" : "Calculate body scale"}
          </button>
        </div>
        {activeAppleVisionResult ? (
          <>
            <div className={`mt-3 rounded-xl border-2 p-3 text-center ${appleVisionQualityStatus?.className ?? ""}`}>
              <div className="text-xl font-black">{appleVisionQualityStatus?.label}</div>
              <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
                <span className="rounded bg-white/80 px-2 py-1">body depth {activeAppleVisionResult.bodyDistanceM.toFixed(3)} m</span>
                <span className="rounded bg-white/80 px-2 py-1">focal X {activeAppleVisionResult.estimatedFocalXPx.toFixed(0)} px</span>
                <span className="rounded bg-white/80 px-2 py-1">fit X ±{activeAppleVisionResult.reprojectionRmseXPx.toFixed(1)} px</span>
                <span className="rounded bg-white/80 px-2 py-1">fit Y ±{activeAppleVisionResult.reprojectionRmseYPx.toFixed(1)} px</span>
              </div>
              <div className="mt-2 text-[10px] font-semibold">
                {activeAppleVisionResult.heightSource === "reference-rescaled"
                  ? `Apple reference skeleton ${(activeAppleVisionResult.referenceBodyHeightM * 100).toFixed(1)} cm → rescaled to ${activeAppleVisionResult.inputHeightCm.toFixed(2)} cm`
                  : `Apple measured skeleton → rescaled to ${activeAppleVisionResult.inputHeightCm.toFixed(2)} cm`}
                {` · ${activeAppleVisionResult.jointCount} joints · ${activeAppleVisionResult.cacheHit ? "cached pose" : `${activeAppleVisionResult.elapsedMs} ms`}`}
              </div>
            </div>
            <div className="mt-2 grid gap-2">
              {activeAppleVisionResult.rows.map((row) => {
                const depthRow = activeDepthProBodyResult?.rows.find((candidate) => candidate.name === row.name && candidate.valid);
                const agreementPct = depthRow
                  ? ((depthRow.interiorPlaneWidthCm / row.frontPlaneWidthCm) - 1) * 100
                  : null;
                return (
                  <div key={row.name} className="rounded-lg border border-violet-200 bg-white p-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-black uppercase">{rowLabel(row.name)}</span>
                      <span className="font-mono text-2xl font-black">{row.frontPlaneWidthCm.toFixed(2)} cm</span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-violet-800">
                      red span {row.pixelSpan.toFixed(0)} px · {row.cmPerPx.toFixed(6)} cm/px at {row.bodyDepthM.toFixed(3)} m
                    </div>
                    {depthRow ? (
                      <div className={`mt-1 rounded px-2 py-1 text-[10px] font-bold ${agreementPct != null && Math.abs(agreementPct) <= 5 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                        Depth Pro body width {depthRow.interiorPlaneWidthCm.toFixed(2)} cm · model agreement {agreementPct == null ? "n/a" : `${agreementPct > 0 ? "+" : ""}${agreementPct.toFixed(1)}%`}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 rounded border border-violet-300 bg-white px-2 py-1 text-[10px] font-bold text-violet-900">
              {onAppleVisionBodyScaleChange && activeAppleVisionResult.geometryQuality === "pass"
                ? "ACTIVE IN LOCAL MANUAL FORMULAS · "
                : onAppleVisionBodyScaleChange
                  ? "NOT ACTIVE · geometry must pass first · "
                  : ""}
              These are front-plane body widths, not circumferences. The separate depth-ratio/shape formula still converts width into waist, trouser-waist, and hip circumference.
            </div>
          </>
        ) : null}
        {appleVisionError ? <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800">{appleVisionError}</div> : null}
      </div>
      <details className="mt-2 rounded border border-slate-200 bg-white/80 p-2">
        <summary className="cursor-pointer font-semibold text-slate-700">
          Legacy flat global-scale diagnostics · {status.label}
        </summary>
      <div data-testid="manual-scale-proof-readout" className={`${compact ? "mt-2 gap-1" : "mt-3 gap-2"} grid grid-cols-2 font-mono`}>
        <span className="rounded bg-white px-2 py-1">Entered: {Math.abs(intervalValue)} {unit}</span>
        <span className="rounded bg-white px-2 py-1">Expected: {expectedCm.toFixed(3)} cm</span>
        <span className="rounded bg-white px-2 py-1">Pixel span: {hasTwoHandles ? `${pixelSpan.toFixed(2)} px` : "n/a"}</span>
        <span className="rounded bg-white px-2 py-1">Height scale expects: {heightScaleExpectedPixelSpan == null ? "n/a" : `${heightScaleExpectedPixelSpan.toFixed(2)} px`}</span>
        <span className="rounded bg-white px-2 py-1">
          Pixel mismatch: {pixelSpanError == null || pixelSpanErrorPct == null ? "n/a" : `${pixelSpanError > 0 ? "+" : ""}${pixelSpanError.toFixed(2)} px (${pixelSpanErrorPct > 0 ? "+" : ""}${pixelSpanErrorPct.toFixed(2)}%)`}
        </span>
        <span className="rounded bg-white px-2 py-1">Δ pixels: {hasTwoHandles ? `${deltaXPx.toFixed(2)} x, ${deltaYPx.toFixed(2)} y` : "n/a"}</span>
        <span className="rounded bg-white px-2 py-1">Formula scale: {activeCmPerPx == null ? "n/a" : `${activeCmPerPx.toFixed(6)} cm/px`}</span>
        <span className="rounded bg-white px-2 py-1">Active-scale read: {measuredCm == null ? "n/a" : `${measuredCm.toFixed(3)} cm`}</span>
        <span className="rounded bg-white px-2 py-1">Implied scale: {impliedCmPerPx == null ? "n/a" : `${impliedCmPerPx.toFixed(6)} cm/px`}</span>
        <span className="rounded bg-white px-2 py-1">
          Error: {errorCm == null || errorPct == null ? "n/a" : `${errorCm > 0 ? "+" : ""}${errorCm.toFixed(3)} cm (${errorPct > 0 ? "+" : ""}${errorPct.toFixed(2)}%)`}
        </span>
        <span className="rounded bg-white px-2 py-1">
          Handles: ({Math.round(ruler.start.x)}, {Math.round(ruler.start.y)}) → ({Math.round(ruler.end.x)}, {Math.round(ruler.end.y)})
        </span>
        <span className="rounded bg-white px-2 py-1">
          Tape-implied visible height: {tapeImpliedVisibleHeightCm == null || heightCm == null ? "n/a" : `${tapeImpliedVisibleHeightCm.toFixed(1)} cm vs known ${heightCm.toFixed(1)} cm`}
        </span>
      </div>
      <div aria-live="polite" className={`${compact ? "mt-2" : "mt-3"} rounded border px-2 py-1 text-center font-semibold ${status.className}`}>
        {status.label}
      </div>
      </details>
      <div className="mt-2 rounded-xl border-2 border-blue-400 bg-blue-50 p-3 text-blue-950 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-base font-black">APPLE DEPTH PRO · FULL-IMAGE 3D RULER</div>
            <div className="text-[10px] text-blue-800">Depth Pro estimates each selected pixel&apos;s depth. Thin tape edges or nearby background can still fail, so this is a tape diagnostic and never calibrates the body rows.</div>
          </div>
          <button
            type="button"
            disabled={depthProStatus === "loading" || !imageUrl || !heightCm || !heightScaleLine || !validInterval}
            onClick={() => void runDepthProProof()}
            className="rounded-lg border-2 border-blue-500 bg-blue-700 px-3 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {depthProStatus === "loading" ? "Running Depth Pro…" : activeDepthProResult ? "Refresh 3D tape proof" : "Verify tape with Apple 3D"}
          </button>
        </div>
        {activeDepthProResult ? (
          <>
            <div className={`mt-3 rounded-xl border-2 p-3 text-center ${depthProProofStatus?.className ?? ""}`}>
              <div className="text-xl font-black">{depthProProofStatus?.label} · 3D TAPE</div>
              <div className="mt-1 font-mono text-4xl font-black">
                {unit === "in" ? `${cmToIn(activeDepthProResult.rawProofCm).toFixed(3)} in` : `${activeDepthProResult.rawProofCm.toFixed(3)} cm`}
              </div>
              <div className="font-mono text-sm font-bold">{activeDepthProResult.rawProofCm.toFixed(3)} cm</div>
              <div className="mt-1 font-mono text-xl font-black">
                ERROR {activeDepthProResult.rawProofCm - expectedCm > 0 ? "+" : ""}{(activeDepthProResult.rawProofCm - expectedCm).toFixed(3)} cm · {activeDepthProResult.rawErrorPct > 0 ? "+" : ""}{activeDepthProResult.rawErrorPct.toFixed(2)}%
              </div>
              <div className="mt-1 text-[10px] font-semibold">
                expected {expectedCm.toFixed(3)} cm · focal {activeDepthProResult.estimatedFocalPx.toFixed(1)} px · {activeDepthProResult.cacheHit ? "cached depth map" : `cold run ${(activeDepthProResult.elapsedMs / 1000).toFixed(1)} s`}
              </div>
            </div>
          </>
        ) : null}
        {depthProError ? <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800">{depthProError}</div> : null}
      </div>
      <details className="mt-2 rounded border border-emerald-200 bg-white/80 p-2">
        <summary className="cursor-pointer font-semibold text-emerald-900">Legacy yellow/green scale explanation</summary>
      {proofRequiredHeightSpanPx != null && proofRequiredTopY != null ? (
        <div data-testid="scale-proof-height-equivalent" className="mt-1 rounded border border-emerald-200 bg-white px-2 py-1 font-mono text-emerald-950">
          Green interval scale would require {proofRequiredHeightSpanPx.toFixed(1)}px for {heightCm?.toFixed(1)}cm; with bottom y {Math.round(heightScaleLine?.bottomY ?? 0)}, yellow top would be y {Math.round(proofRequiredTopY)}.
        </div>
      ) : null}
      <p className={`${compact ? "mt-1" : "mt-2"} font-semibold leading-relaxed text-emerald-900`}>
        Green error compares this tape interval with the active formula scale. It is not the yellow-line versus mask difference.
      </p>
      <p className="mt-1 rounded border border-emerald-200 bg-white px-2 py-1 leading-relaxed text-emerald-900">
        Full-screen tape CV uses Apple Vision OCR plus local colour/tick detection only to place proof coordinates. It never calibrates the body scale. If exact marks still fail, the independent camera/depth model did not predict that interval correctly.
      </p>
      {scaleDisplayDeltaPct != null && Math.abs(scaleDisplayDeltaPct) > 0.01 ? (
        <p className="mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-800">
          Warning: formula scale and displayed scale differ by {scaleDisplayDeltaPct > 0 ? "+" : ""}{scaleDisplayDeltaPct.toFixed(2)}%.
        </p>
      ) : null}
      <p className={`${compact ? "mt-1" : "mt-2"} leading-relaxed text-emerald-800`}>
        For an independent check, use tape marks outside the anchors that set the active scale. On the Nadia sample, 10→20 is independent of the 42→64 calibration anchors.
      </p>
      </details>
        </div>
      </details>
    </div>
  );
}

function FullScreenEssentialMeasurementSummary({
  unit,
  onUnitChange,
  appleResult,
  fusedBodyResult,
  measurement,
  measurementUnavailableMessage,
  bodyWidthMethod,
  onBodyWidthMethodChange,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
}: {
  unit: ScaleProofUnit;
  onUnitChange: (value: ScaleProofUnit) => void;
  appleResult: AppleVisionBodyScaleResult | null;
  fusedBodyResult: AppleFusedBodyScaleApiResult | null;
  measurement: GeminiGuideMeasurement | null;
  measurementUnavailableMessage?: string;
  bodyWidthMethod: BodyWidthMethod;
  onBodyWidthMethodChange: (method: BodyWidthMethod) => void;
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
}) {
  const [openModelHelp, setOpenModelHelp] = useState<BodyWidthMethod | null>(null);
  const bodyGate = evaluateBodyScaleGate(appleResult, fusedBodyResult);
  const bodyReady = bodyGate.evaluations.length === 3
    && bodyGate.evaluations.every((item) => Boolean(item.fusedRow?.valid));
  const targets: Array<{ kind: GuideKind; label: string; targetCm?: number }> = [
    { kind: "waist", label: "Natural waist", targetCm: targetNaturalWaistCm },
    { kind: "trouserWaist", label: "Trouser waist", targetCm: targetTrouserWaistCm },
    { kind: "hips", label: "Hips", targetCm: targetHipsCm },
  ];

  return (
    <section data-testid="essential-measurement-summary" className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Circumference result vs dataset</h3>
          <p className="mt-1 text-[11px] leading-4 text-slate-600">
            {measurementUnavailableMessage
              ? "Dataset values remain visible, but this model stage cannot produce circumference until 3D depth is trained."
              : "Dataset is the real measurement. Our result is the circumference produced from the red line plus the depth-ratio formula."}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-slate-600">
          Result unit
          <select
            value={unit}
            onChange={(event) => onUnitChange(event.currentTarget.value as ScaleProofUnit)}
            aria-label="Circumference result unit"
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-800"
          >
            <option value="cm">cm</option>
            <option value="in">inches</option>
          </select>
        </label>
      </div>

      {!measurement && measurementUnavailableMessage ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">
          {measurementUnavailableMessage}
        </div>
      ) : null}

      <div data-testid="body-width-method-selector" className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-2.5">
        <div className="text-[11px] font-medium text-blue-950">Circumference model only</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className={`relative rounded-lg border transition ${bodyWidthMethod === "apple-vision"
            ? "border-blue-600 bg-white ring-2 ring-blue-200"
            : "border-slate-200 bg-slate-50 hover:border-blue-300"}`}>
            <button
              type="button"
              aria-pressed={bodyWidthMethod === "apple-vision"}
              onClick={() => onBodyWidthMethodChange("apple-vision")}
              className="block h-full w-full rounded-lg px-2 py-2 pr-9 text-left"
            >
              <span className="block text-xs font-semibold text-slate-950">Apple Vision</span>
              <span className="mt-0.5 block text-[9px] leading-3 text-slate-600">Apple body and camera geometry</span>
            </button>
            <button
              type="button"
              aria-label="Explain Apple Vision"
              aria-expanded={openModelHelp === "apple-vision"}
              aria-controls="apple-vision-simple-help"
              onClick={() => setOpenModelHelp((current) => current === "apple-vision" ? null : "apple-vision")}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
            >
              ?
            </button>
          </div>
          <div className={`relative rounded-lg border transition ${bodyWidthMethod === "depth-pro"
            ? "border-violet-600 bg-white ring-2 ring-violet-200"
            : "border-slate-200 bg-slate-50 hover:border-violet-300"}`}>
            <button
              type="button"
              aria-pressed={bodyWidthMethod === "depth-pro"}
              onClick={() => onBodyWidthMethodChange("depth-pro")}
              className="block h-full w-full rounded-lg px-2 py-2 pr-9 text-left"
            >
              <span className="block text-xs font-semibold text-slate-950">Depth Pro</span>
              <span className="mt-0.5 block text-[9px] leading-3 text-slate-600">Depth map + Apple scale + body mask</span>
            </button>
            <button
              type="button"
              aria-label="Explain Depth Pro"
              aria-expanded={openModelHelp === "depth-pro"}
              aria-controls="depth-pro-simple-help"
              onClick={() => setOpenModelHelp((current) => current === "depth-pro" ? null : "depth-pro")}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-violet-300 bg-violet-50 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
            >
              ?
            </button>
          </div>
        </div>
        {openModelHelp === "apple-vision" ? (
          <div id="apple-vision-simple-help" className="mt-2 rounded-lg border border-blue-200 bg-white p-2.5 text-[10px] leading-4 text-slate-700">
            <div className="font-semibold text-blue-950">Apple Vision is like a 3D stick-person.</div>
            <p className="mt-1">
              It finds body joints, estimates the camera view and person distance, and uses the known height to turn the red line&apos;s pixels into a front-body width.
            </p>
            <p className="mt-1 text-slate-600">
              It does not measure around the body. If its joint dots are wrong, this result can also be wrong.
            </p>
          </div>
        ) : null}
        {openModelHelp === "depth-pro" ? (
          <div id="depth-pro-simple-help" className="mt-2 rounded-lg border border-violet-200 bg-white p-2.5 text-[10px] leading-4 text-slate-700">
            <div className="font-semibold text-violet-950">Depth Pro is like a distance map for every pixel.</div>
            <p className="mt-1">
              It estimates how far the body surface is from the camera. Here we combine it with Apple&apos;s scale, the known height, the MediaPipe body mask and the red endpoints to find the front-body width.
            </p>
            <p className="mt-1 text-slate-600">
              It does not know the real waist or hip circumference. The depth-ratio formula still finishes that calculation.
            </p>
          </div>
        ) : null}
        <div className="mt-2 text-[10px] leading-4 text-blue-800">
          This choice does not affect the red-line tape result below. It changes only the separate body-model calculation.
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {targets.map(({ kind, label, targetCm }) => {
          const candidate = measurement?.rows.find((row) => row.kind === kind) ?? null;
          const errorCm = candidate && targetCm != null ? candidate.guidedCm - targetCm : null;
          const errorPct = errorCm != null && targetCm && targetCm > 0 ? (errorCm / targetCm) * 100 : null;
          const withinTwoPct = errorPct != null && Math.abs(errorPct) <= 2;
          return (
            <div key={kind} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-800">{label}</span>
                {errorPct == null ? null : (
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${withinTwoPct ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                    {withinTwoPct ? "Within 2%" : "Outside 2%"}
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-slate-500">Dataset</div>
                  <div className="font-mono text-base text-slate-950">{targetCm == null ? "Not available" : formatCircumferenceValue(targetCm, unit)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">Our result</div>
                  <div className="font-mono text-base text-slate-950">{candidate ? formatCircumferenceValue(candidate.guidedCm, unit) : measurementUnavailableMessage ? "Waiting for 3D" : "Calculating"}</div>
                  <div className="mt-0.5 text-[9px] text-slate-500">
                    {candidate
                      ? `using ${bodyWidthMethod === "apple-vision" ? "Apple Vision" : "Depth Pro"}`
                      : measurementUnavailableMessage ? "depth model not trained" : "calculating"}
                  </div>
                </div>
              </div>
              <div className={`mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${withinTwoPct ? "text-emerald-700" : errorPct == null ? "text-slate-500" : "text-rose-700"}`}>
                <span className="text-[10px] text-slate-500">Difference</span>
                <span className="font-mono text-sm font-medium">
                  {errorCm == null ? "not available" : formatSignedCircumferenceValue(errorCm, unit)}
                </span>
                {errorPct == null ? null : (
                  <span className="font-mono text-xs font-medium">
                    {errorPct >= 0 ? "+" : ""}{errorPct.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!bodyGate.confirmed ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-900">
          These results are shown for dataset comparison, but they are not approved yet because the body front-width scale check is {bodyReady ? `${bodyGate.acceptedCount}/3` : "still calculating"}. Front-width details are in the dropdown below.
        </div>
      ) : null}
    </section>
  );
}

function FullScreenDepthRatioControls({
  measurement,
  measurementUnavailableMessage,
  depthRatioOverrides,
  knownDepthRatioAnswers,
  onDepthRatioOverrideChange,
}: {
  measurement: GeminiGuideMeasurement | null;
  measurementUnavailableMessage?: string;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  knownDepthRatioAnswers?: GeminiGuideDepthRatioOverrides;
  onDepthRatioOverrideChange?: (kind: GuideKind, ratio: number | null) => void;
}) {
  const firstTable = measurement?.rows.find((row) => row.depthRatioTable)?.depthRatioTable?.table ?? null;
  const holdoutChecks = measurement?.rows.flatMap((row) => {
    const formula = row.depthRatioTable?.table;
    const answer = knownDepthRatioAnswers?.[row.kind];
    if (!formula || answer == null) return [];
    return [{ pass: Math.abs(formula.depthRatio - answer) <= formula.validationP90AbsError }];
  }) ?? [];
  const holdoutPassCount = holdoutChecks.filter((check) => check.pass).length;

  if (!measurement && measurementUnavailableMessage) {
    return (
      <section data-testid="depth-ratio-controls" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
        <h3 className="text-sm font-medium">Depth ratios · waiting for 3D</h3>
        <p className="mt-1 text-[11px] leading-4">{measurementUnavailableMessage}</p>
      </section>
    );
  }

  return (
    <section data-testid="depth-ratio-controls" className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Depth ratio formula · WEAR 1D</h3>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-medium text-emerald-800">local experiment</span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">
          Simple meaning: front width × depth ratio = front-to-back depth.
        </p>
        {firstTable ? (
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[9px] leading-3.5">
            <div className="rounded-lg bg-blue-50 px-1.5 py-2 text-blue-900">
              <span className="block text-[8px] text-blue-600">1 · PHOTO</span>
              Apple or Depth Pro gives the red width
            </div>
            <div className="rounded-lg bg-violet-50 px-1.5 py-2 text-violet-900">
              <span className="block text-[8px] text-violet-600">2 · WEAR</span>
              BMI and body width enter the formula
            </div>
            <div className="rounded-lg bg-emerald-50 px-1.5 py-2 text-emerald-900">
              <span className="block text-[8px] text-emerald-600">3 · ANSWER</span>
              Formula predicts front-to-back depth
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-[9px] leading-3.5 text-slate-500">
          No Gemini and no tape labels. Shane 2 and Nadia are checked only after prediction; their saved answers never enter the formula.
        </p>
        {holdoutChecks.length ? (
          <div className={`mt-2 rounded-lg border px-2.5 py-2 ${holdoutPassCount === holdoutChecks.length ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="text-[9px] text-slate-600">Untuned holdout test</div>
            <div className="mt-0.5 font-mono text-sm font-medium text-slate-950">
              {holdoutPassCount}/{holdoutChecks.length} rows inside the model&apos;s normal validation error
            </div>
            <div className="mt-1 text-[8px] leading-3 text-slate-600">
              The saved answer can still drive the circumference above. Press “Use WEAR prediction” on a row to make the new formula active there.
            </div>
          </div>
        ) : null}
      </div>

      {!measurement ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-center text-[11px] text-slate-600">
          {measurementUnavailableMessage ?? "Calculating depth ratios…"}
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          {GUIDE_ROWS.map(({ kind, label }) => {
            const row = measurement.rows.find((candidate) => candidate.kind === kind) ?? null;
            if (!row) return null;
            const formula = row.depthRatioTable?.table ?? null;
            const fallbackBounds = rowDepthRatioBounds(kind);
            const minimum = formula?.supportedMin ?? fallbackBounds.min;
            const maximum = formula?.supportedMax ?? fallbackBounds.max;
            const tableDefault = formula?.depthRatio ?? row.depthRatio;
            const override = depthRatioOverrides?.[kind] ?? row.depthRatioOverride ?? null;
            const selected = clamp(override ?? row.depthRatio, minimum, maximum);
            const knownAnswer = knownDepthRatioAnswers?.[kind] ?? null;
            const holdoutDelta = formula && knownAnswer != null ? formula.depthRatio - knownAnswer : null;
            const holdoutDepthDeltaCm = holdoutDelta == null ? null : holdoutDelta * row.formulaWidthCm;
            const holdoutInsideValidation = formula && holdoutDelta != null
              ? Math.abs(holdoutDelta) <= formula.validationP90AbsError
              : null;
            const estimatedDepthCm = row.formulaWidthCm * tableDefault;
            const updateRatio = (value: number) => {
              if (!Number.isFinite(value)) return;
              onDepthRatioOverrideChange?.(kind, clamp(value, minimum, maximum));
            };
            return (
              <div key={kind} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-800">{label === "trouser" ? "Trouser waist" : rowLabel(kind)}</span>
                    <span className="ml-1.5 text-[9px] text-slate-500">active slider {selected.toFixed(3)}</span>
                  </div>
                  {formula ? (
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${formula.confidence === "study-supported"
                      ? "bg-emerald-100 text-emerald-800"
                      : formula.confidence === "limited-study"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-700"}`}>
                      {formula.confidence === "study-supported" ? "inside study" : formula.confidence === "limited-study" ? "limited study" : "outside study range"}
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <div className="rounded border border-slate-200 bg-white p-1.5">
                    <div className="text-[8px] text-slate-500">Red front width</div>
                    <div className="mt-0.5 font-mono text-[12px] text-slate-950">{row.formulaWidthCm.toFixed(2)} cm</div>
                  </div>
                  <div className="rounded border border-violet-200 bg-violet-50 p-1.5">
                    <div className="text-[8px] text-violet-600">WEAR prediction</div>
                    <div className="mt-0.5 font-mono text-[12px] text-violet-950">{tableDefault.toFixed(3)}</div>
                  </div>
                  <div className="rounded border border-emerald-200 bg-emerald-50 p-1.5">
                    <div className="text-[8px] text-emerald-700">Estimated depth</div>
                    <div className="mt-0.5 font-mono text-[12px] text-emerald-950">{estimatedDepthCm.toFixed(2)} cm</div>
                  </div>
                </div>

                {formula && knownAnswer != null && holdoutDelta != null ? (
                  <div data-testid={`wear-holdout-${kind}`} className={`mt-2 rounded-lg border p-2 ${holdoutInsideValidation ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-medium text-slate-700">Locked test answer · not a formula input</span>
                      <span className={`text-[8px] font-medium ${holdoutInsideValidation ? "text-emerald-800" : "text-rose-700"}`}>
                        {holdoutInsideValidation ? "inside normal model error" : "needs work"}
                      </span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[9px]">
                      <div>
                        <span className="block text-slate-500">Predicted</span>
                        <span className="font-mono text-[11px] text-slate-950">{formula.depthRatio.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Saved answer</span>
                        <span className="font-mono text-[11px] text-slate-950">{knownAnswer.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Difference</span>
                        <span className={`font-mono text-[11px] ${holdoutInsideValidation ? "text-emerald-800" : "text-rose-700"}`}>
                          {holdoutDelta >= 0 ? "+" : ""}{holdoutDelta.toFixed(3)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[8px] leading-3 text-slate-600">
                      At this red width, that is {holdoutDepthDeltaCm != null && holdoutDepthDeltaCm >= 0 ? "+" : ""}{holdoutDepthDeltaCm?.toFixed(2)} cm front-to-back depth. Normal validation P90 is ±{formula.validationP90AbsError.toFixed(3)} ratio.
                    </p>
                  </div>
                ) : null}

                {formula ? (
                  <details className="mt-2 rounded border border-slate-200 bg-white p-2">
                    <summary className="cursor-pointer text-[9px] font-medium text-slate-700">Show the formula math</summary>
                    <div className="mt-2 space-y-1 text-[9px] leading-3.5 text-slate-600">
                      <div className="font-mono text-slate-800">start at {formula.formulaIntercept.toFixed(3)}</div>
                      {formula.formulaTerms.map((term) => (
                        <div key={term.feature} className={term.insideTrainingRange ? "" : "text-rose-700"}>
                          {term.label}: {term.coefficient.toFixed(3)} × ({term.input.toFixed(3)} − {term.center.toFixed(3)}) = {term.contribution >= 0 ? "+" : ""}{term.contribution.toFixed(3)}
                          {!term.insideTrainingRange ? " · outside common WEAR range" : ""}
                        </div>
                      ))}
                      <div className="border-t border-slate-100 pt-1 font-mono text-slate-900">
                        answer = {formula.rawDepthRatio.toFixed(3)}{formula.rawDepthRatio !== formula.depthRatio ? ` → clamped ${formula.depthRatio.toFixed(3)}` : ""}
                      </div>
                      <div className="pt-1 text-[8px] text-slate-500">
                        Learned from {formula.trainingSubjects.toLocaleString()} WEAR people · validation MAE {formula.validationMae.toFixed(3)} · {formula.validationMethod === "leave-one-survey-out" ? "whole-survey holdout" : "five-fold holdout"}.
                      </div>
                      {kind === "trouserWaist" ? (
                        <div className="rounded bg-amber-50 px-1.5 py-1 text-[8px] text-amber-800">
                          Weakest row: WEAR provides an abdomen/stomach proxy, not the exact trouser waistband plane.
                        </div>
                      ) : null}
                    </div>
                  </details>
                ) : null}

                <div className="mt-2 border-t border-slate-200 pt-2">
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span>Try a different ratio</span>
                    <button
                      type="button"
                      onClick={() => onDepthRatioOverrideChange?.(kind, null)}
                      disabled={override == null || !onDepthRatioOverrideChange}
                      className="text-violet-700 disabled:text-slate-400"
                    >
                      Use WEAR prediction
                    </button>
                  </div>
                <input
                  type="range"
                  min={minimum}
                  max={maximum}
                  step={0.001}
                  value={selected}
                  onChange={(event) => updateRatio(Number(event.currentTarget.value))}
                  disabled={!onDepthRatioOverrideChange}
                  aria-label={`${rowLabel(kind)} depth ratio`}
                  className="mt-2 h-2 w-full accent-violet-600 disabled:opacity-50"
                />
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px]">
                  <button
                    type="button"
                    onClick={() => updateRatio(minimum)}
                    disabled={!onDepthRatioOverrideChange}
                    className="rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Min <span className="font-mono text-slate-900">{minimum.toFixed(3)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDepthRatioOverrideChange?.(kind, null)}
                    disabled={!onDepthRatioOverrideChange}
                    className="rounded border border-violet-200 bg-violet-50 px-1.5 py-1 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                  >
                    WEAR <span className="font-mono text-violet-950">{tableDefault.toFixed(3)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRatio(maximum)}
                    disabled={!onDepthRatioOverrideChange}
                    className="rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Max <span className="font-mono text-slate-900">{maximum.toFixed(3)}</span>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-slate-500">
                  <span>WEAR support {minimum.toFixed(3)}–{maximum.toFixed(3)}</span>
                  <button
                    type="button"
                    onClick={() => onDepthRatioOverrideChange?.(kind, null)}
                    disabled={override == null || !onDepthRatioOverrideChange}
                    className="text-violet-700 disabled:text-slate-400"
                  >
                    Reset
                  </button>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FullScreenRedLineSummary({
  bodyRows,
  appleResult,
  fusedBodyResult,
  bodyScaleConfirmed,
  unit,
}: {
  bodyRows: BodyScaleRowInput[];
  appleResult: AppleVisionBodyScaleResult | null;
  fusedBodyResult: AppleFusedBodyScaleApiResult | null;
  bodyScaleConfirmed: boolean;
  unit: ScaleProofUnit;
}) {
  const bodyGate = evaluateBodyScaleGate(appleResult, fusedBodyResult);
  const bodyRowsReady = bodyGate.evaluations.length === 3
    && bodyGate.evaluations.every((item) => Boolean(item.fusedRow?.valid));
  const statusLabel = bodyScaleConfirmed
    ? "3/3 rows agree"
    : bodyRowsReady
      ? `${bodyGate.acceptedCount}/3 rows agree`
      : "Calculating";
  const statusClass = bodyScaleConfirmed
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-600";

  return (
    <details data-testid="simple-red-line-summary" className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
      <summary className="cursor-pointer list-none">
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-700">Front-width scale details · debug only</span>
          <span className={`rounded px-2 py-1 text-[10px] font-medium ${statusClass}`}>{statusLabel}</span>
        </span>
      </summary>
      <p className="mt-3 text-[11px] leading-4 text-slate-600">
        {bodyScaleConfirmed
          ? "Apple and Depth Pro agree on the centimetre width of all three red lines."
          : bodyRowsReady
            ? "The red endpoints are correct pixels, but Apple and Depth Pro disagree on their centimetre width. Waist and hips currently miss the 2% agreement gate."
            : "Reading the three red lines with Apple and Depth Pro."}
      </p>
      <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
        {bodyRows.map((row) => {
          const result = fusedBodyResult?.rows.find((candidate) => candidate.name === row.name && candidate.valid) ?? null;
          const appleRow = appleResult?.rows.find((candidate) => candidate.name === row.name) ?? null;
          const differenceCm = result && appleRow ? result.predictedWidthCm - appleRow.frontPlaneWidthCm : null;
          const differencePct = differenceCm != null && appleRow && appleRow.frontPlaneWidthCm > 0
            ? (differenceCm / appleRow.frontPlaneWidthCm) * 100
            : null;
          const rowPassed = differencePct != null && Math.abs(differencePct) <= 2;
          return (
            <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2">
              <div>
                <div className="text-[11px] font-medium text-slate-700">{rowLabel(row.name)}</div>
                <div className="text-[10px] text-slate-500">{Math.abs(row.rightX - row.leftX).toFixed(0)} px between the red endpoints</div>
                {appleRow ? <div className="mt-0.5 text-[9px] text-slate-500">Apple cross-check {formatCircumferenceValue(appleRow.frontPlaneWidthCm, unit)}</div> : null}
              </div>
              <div className="text-right">
                <div className="font-mono text-base font-semibold text-slate-950">
                  {result ? formatCircumferenceValue(result.predictedWidthCm, unit) : "—"}
                </div>
                <div className={`text-[9px] ${rowPassed ? "text-emerald-700" : "text-rose-700"}`}>
                  {differenceCm == null || differencePct == null
                    ? "waiting"
                    : `difference ${formatSignedCircumferenceValue(differenceCm, unit)} · ${differencePct >= 0 ? "+" : ""}${differencePct.toFixed(2)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function AppleProcessingCounter({
  compact,
  appleVisionStatus,
  appleVisionElapsedMs,
  depthFieldStatus,
  depthFieldElapsedMs,
  tapeVisionStatus,
  tapeVisionElapsedMs,
  fusedTapeStatus,
  fusedTapeElapsedMs,
}: {
  compact: boolean;
  appleVisionStatus: "idle" | "loading" | "ready" | "error";
  appleVisionElapsedMs: number;
  depthFieldStatus: "idle" | "loading" | "ready" | "error";
  depthFieldElapsedMs: number;
  tapeVisionStatus: "idle" | "loading" | "ready" | "error";
  tapeVisionElapsedMs: number;
  fusedTapeStatus: "idle" | "loading" | "ready" | "error";
  fusedTapeElapsedMs: number;
}) {
  const isRunning = appleVisionStatus === "loading" || depthFieldStatus === "loading" || tapeVisionStatus === "loading" || fusedTapeStatus === "loading";
  // Depth Pro and tape CV launch together in full screen, so elapsed user wait
  // is the slower parallel branch, not the sum of both branch runtimes.
  const totalElapsedMs = appleVisionElapsedMs + Math.max(depthFieldElapsedMs, tapeVisionElapsedMs) + fusedTapeElapsedMs;
  if (compact) {
    return (
      <div data-testid="apple-processing-counter" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
        <span>Apple Vision + Depth Pro</span>
        <span className="font-mono text-slate-800" aria-live="polite">
          {formatProcessingTime(totalElapsedMs)} · {isRunning ? "running" : "complete"}
        </span>
      </div>
    );
  }
  return (
    <div data-testid="apple-processing-counter" className={`${compact ? "mb-2 p-2" : "mb-3 p-3"} min-w-0 overflow-hidden rounded-lg border-2 border-violet-300 bg-violet-50 text-violet-950`}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-wider">Apple + tape CV processing time</div>
        <div className="font-mono text-xl font-black tabular-nums" aria-live="polite">
          {formatProcessingTime(totalElapsedMs)}{isRunning ? " · RUNNING" : ""}
        </div>
      </div>
      <div className="mt-1 grid min-w-0 gap-1 text-[10px] sm:grid-cols-4">
        <div className="min-w-0 break-words rounded bg-white/80 px-2 py-1">
          Apple Vision 3D · {processingStatusLabel(appleVisionStatus, appleVisionElapsedMs)}
        </div>
        <div className="min-w-0 break-words rounded bg-white/80 px-2 py-1">
          Depth Pro scale · {!compact && depthFieldStatus === "idle" ? "starts in full screen" : processingStatusLabel(depthFieldStatus, depthFieldElapsedMs)}
        </div>
        <div className="min-w-0 break-words rounded bg-white/80 px-2 py-1">
          Tape CV · Apple + OpenCV · {!compact && tapeVisionStatus === "idle" ? "starts in full screen" : processingStatusLabel(tapeVisionStatus, tapeVisionElapsedMs)}
        </div>
        <div className="min-w-0 break-words rounded bg-white/80 px-2 py-1">
          Apple fused tape · {!compact && fusedTapeStatus === "idle" ? "starts in full screen" : processingStatusLabel(fusedTapeStatus, fusedTapeElapsedMs)}
        </div>
      </div>
    </div>
  );
}

function processingStatusLabel(status: "idle" | "loading" | "ready" | "error", elapsedMs: number): string {
  if (status === "idle") return "waiting";
  if (status === "loading") return `${formatProcessingTime(elapsedMs)} running`;
  if (status === "error") return `${formatProcessingTime(elapsedMs)} failed`;
  return `${formatProcessingTime(elapsedMs)} complete`;
}

function formatProcessingTime(elapsedMs: number): string {
  const safeMs = Math.max(0, elapsedMs);
  if (safeMs < 60_000) return `${(safeMs / 1000).toFixed(1)} s`;
  const minutes = Math.floor(safeMs / 60_000);
  const seconds = ((safeMs % 60_000) / 1000).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}

function formatDistanceCompact(valueCm: number, unit: ScaleProofUnit): string {
  const value = unit === "in" ? cmToIn(valueCm) : valueCm;
  return `${value.toFixed(3)} ${unit}`;
}

function formatSignedDistanceCompact(valueCm: number, unit: ScaleProofUnit): string {
  const value = unit === "in" ? cmToIn(valueCm) : valueCm;
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)} ${unit}`;
}

function formatCircumferenceValue(valueCm: number, unit: ScaleProofUnit): string {
  const value = unit === "in" ? cmToIn(valueCm) : valueCm;
  return `${value.toFixed(2)} ${unit}`;
}

function formatSignedCircumferenceValue(valueCm: number, unit: ScaleProofUnit): string {
  const value = unit === "in" ? cmToIn(valueCm) : valueCm;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} ${unit}`;
}

function ManualScaleEvidence({
  evidence,
  compact = false,
  isActive = true,
}: {
  evidence: NonNullable<Props["scaleEvidence"]>;
  compact?: boolean;
  isActive?: boolean;
}) {
  const sourceLabel = evidence.source === "vertical-tape"
    ? "vertical tape"
    : evidence.source === "manual-height"
      ? "manual height"
      : evidence.source === "mask-height"
        ? "mask height"
        : "pose landmarks";
  const anchorIntervals = evidence.anchors.slice(1).map((anchor, index) => {
    const previous = evidence.anchors[index]!;
    const expectedCm = Math.abs(anchor.tapeCm - previous.tapeCm);
    const pixelSpan = Math.abs(anchor.yPx - previous.yPx);
    const activeReadCm = pixelSpan * evidence.activeCmPerPx;
    const impliedCmPerPx = pixelSpan > 0 ? expectedCm / pixelSpan : null;
    const errorPct = expectedCm > 0 ? ((activeReadCm / expectedCm) - 1) * 100 : null;
    return {
      label: `${previous.tapeCm}→${anchor.tapeCm}`,
      expectedCm,
      pixelSpan,
      activeReadCm,
      impliedCmPerPx,
      errorPct,
    };
  });
  const intervalScales = anchorIntervals
    .map((interval) => interval.impliedCmPerPx)
    .filter((value): value is number => value != null && value > 0);
  const intervalScaleSpreadPct = intervalScales.length >= 2
    ? ((Math.max(...intervalScales) / Math.min(...intervalScales)) - 1) * 100
    : null;
  return (
    <div className={`${compact ? "rounded-md p-2 text-[10px]" : "rounded-lg p-3 text-[11px]"} border border-red-200 bg-white text-red-950`}>
      <div className="font-semibold">cm/px {isActive ? "evidence · active source" : "comparison · inactive source"}: {sourceLabel}</div>
      <div className={`${compact ? "mt-1 grid-cols-2 gap-1" : "mt-2 gap-2 sm:grid-cols-2"} grid`}>
        <div className="rounded-md bg-red-50 px-2 py-1">
          {evidence.source === "vertical-tape" ? "Tape scale" : evidence.source === "manual-height" ? "Manual height scale" : "Active scale"}: {evidence.activeCmPerPx.toFixed(5)} cm/px ({evidence.pxPerCm.toFixed(2)} px/cm)
        </div>
        <div className="rounded-md bg-red-50 px-2 py-1">
          Height scale: {evidence.heightCmPerPx ? evidence.heightCmPerPx.toFixed(5) : "n/a"} cm/px
          {evidence.scaleDeltaPct == null ? "" : ` (${evidence.scaleDeltaPct > 0 ? "+" : ""}${evidence.scaleDeltaPct.toFixed(1)}%)`}
        </div>
      </div>
      {evidence.anchors.length ? (
        <div className={`${compact ? "mt-1 gap-1" : "mt-2 gap-2"} flex flex-wrap font-mono`}>
          {evidence.anchors.map((anchor) => (
            <span key={anchor.label} className="rounded bg-slate-50 px-2 py-1 text-text-secondary">
              {anchor.tapeCm}cm @ y={anchor.yPx}
            </span>
          ))}
        </div>
      ) : null}
      {anchorIntervals.length ? (
        <div data-testid="manual-scale-anchor-audit" className={`${compact ? "mt-1" : "mt-2"} rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-950`}>
          <div className="font-semibold">Saved tape-anchor interval audit</div>
          <div className={`${compact ? "mt-1 gap-1" : "mt-2 gap-2"} grid grid-cols-1 font-mono sm:grid-cols-2`}>
            {anchorIntervals.map((interval) => (
              <span key={interval.label} className="rounded bg-white px-2 py-1">
                {interval.label}cm: {interval.pixelSpan.toFixed(0)}px reads {interval.activeReadCm.toFixed(3)}cm vs {interval.expectedCm.toFixed(1)}cm · implied {interval.impliedCmPerPx?.toFixed(6) ?? "n/a"} cm/px · {interval.errorPct == null ? "n/a" : `${interval.errorPct > 0 ? "+" : ""}${interval.errorPct.toFixed(2)}%`}
              </span>
            ))}
          </div>
          {intervalScaleSpreadPct != null && intervalScaleSpreadPct > 2 ? (
            <div className={`${compact ? "mt-1" : "mt-2"} rounded border border-red-300 bg-red-50 px-2 py-1 font-semibold text-red-800`}>
              Warning: adjacent tape intervals imply scales that disagree by {intervalScaleSpreadPct.toFixed(2)}%. The active tape scale is an average, not proven uniform.
            </div>
          ) : null}
        </div>
      ) : null}
      {evidence.heightAudit ? (
        <div className={`${compact ? "mt-1 gap-1" : "mt-2 gap-2"} grid grid-cols-2 font-mono`}>
          <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-900">
            mask y {Math.round(evidence.heightAudit.topYNorm * evidence.heightAudit.imageHeight)}-{Math.round(evidence.heightAudit.bottomYNorm * evidence.heightAudit.imageHeight)}
          </span>
          <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-900">
            span {evidence.heightAudit.bodySpanPx.toFixed(1)}px = {evidence.heightAudit.heightCm.toFixed(1)}cm
          </span>
          <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-900">
            threshold {evidence.heightAudit.threshold}
          </span>
          <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-900">
            line x {Math.round(evidence.heightAudit.centerXNorm * evidence.heightAudit.imageWidth)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function evaluateBodyScaleGate(
  appleResult: AppleVisionBodyScaleResult | null,
  fusedResult: AppleFusedBodyScaleApiResult | null,
) {
  const evaluations = appleResult?.rows.map((appleRow) => {
    const fusedRow = fusedResult?.rows.find((candidate) => candidate.name === appleRow.name) ?? null;
    const agreementPct = fusedRow?.valid && appleRow.frontPlaneWidthCm > 0
      ? ((fusedRow.predictedWidthCm / appleRow.frontPlaneWidthCm) - 1) * 100
      : null;
    const accepted = Boolean(
      fusedRow?.valid
      && fusedRow.confidence !== "low"
      && agreementPct != null
      && Math.abs(agreementPct) <= 2,
    );
    return { appleRow, fusedRow, agreementPct, accepted };
  }) ?? [];
  const acceptedCount = evaluations.filter((row) => row.accepted).length;
  return {
    evaluations,
    acceptedCount,
    confirmed: appleResult?.geometryQuality === "pass"
      && evaluations.length === 3
      && acceptedCount === 3,
  };
}

function buildBodyScaleCandidateResult(
  appleResult: AppleVisionBodyScaleResult | null,
  fusedResult: AppleFusedBodyScaleApiResult | null,
): AppleVisionBodyScaleResult | null {
  if (!appleResult || !fusedResult || appleResult.geometryQuality === "reject") return null;
  const allRowsReady = appleResult.rows.every((appleRow) => (
    fusedResult.rows.some((candidate) => candidate.name === appleRow.name && candidate.valid)
  ));
  if (!allRowsReady) return null;
  return {
    ...appleResult,
    model: `${appleResult.model} + Apple Depth Pro person-mask body surface · unapproved candidate`,
    rows: appleResult.rows.map((appleRow) => {
      const fusedRow = fusedResult.rows.find((candidate) => candidate.name === appleRow.name && candidate.valid);
      if (!fusedRow) return appleRow;
      return {
        ...appleRow,
        bodyDepthM: fusedRow.correctedPlaneDepthM,
        cmPerPx: fusedRow.cmPerPx,
        frontPlaneWidthCm: fusedRow.predictedWidthCm,
      };
    }),
  };
}

function buildAppleVisionBodyScaleCandidateResult(
  appleResult: AppleVisionBodyScaleResult | null,
): AppleVisionBodyScaleResult | null {
  if (!appleResult || appleResult.geometryQuality === "reject") return null;
  return {
    ...appleResult,
    model: `${appleResult.model} · Apple Vision body geometry selected`,
  };
}

function FullScreenTapeRedLineScaleCheck({
  bodyRows,
  tapeModel,
  tapeTests,
  tapeStatus,
  fusedBodyResult,
  fusedBodyStatus,
}: {
  bodyRows: BodyScaleRowInput[];
  tapeModel: AppleFusedTapeModel | null;
  tapeTests: AppleFusedTapeTest[];
  tapeStatus: "idle" | "loading" | "ready" | "error";
  fusedBodyResult: AppleFusedBodyScaleApiResult | null;
  fusedBodyStatus: "idle" | "loading" | "ready" | "error";
}) {
  const tapePassCount = tapeTests.filter((test) => Math.abs(test.errorPct) <= 2).length;
  const tapeGatePassed = tapeTests.length === 4 && tapePassCount === 4;
  const rows = bodyRows.map((row) => ({
    input: row,
    result: fusedBodyResult?.rows.find((candidate) => candidate.name === row.name) ?? null,
  }));
  const readyRowCount = rows.filter(({ result }) => result?.valid).length;
  const sameFrozenModel = Boolean(
    tapeModel
    && fusedBodyResult
    && tapeModel.tapePlane.geometryMode === "rigid-line-fallback"
    && Math.abs(tapeModel.depthProFocalPx - fusedBodyResult.model.depthProFocalPx) <= 1e-6
    && Math.abs(tapeModel.depthProScaleFactor - fusedBodyResult.model.depthProScaleFactor) <= 1e-9
    && Math.abs(tapeModel.appliedScaleFactor - fusedBodyResult.model.depthProScaleFactor) <= 1e-9
    && Math.abs(tapeModel.knownHeightCm - fusedBodyResult.model.knownHeightCm) <= 1e-9,
  );
  const resultReady = tapeGatePassed && sameFrozenModel && readyRowCount === bodyRows.length && bodyRows.length > 0;

  return (
    <section data-testid="tape-red-line-width-check" className={`mb-3 rounded-xl border-2 p-3 shadow-sm ${resultReady
      ? "border-emerald-500 bg-emerald-50 text-emerald-950"
      : tapeGatePassed
        ? "border-cyan-500 bg-cyan-50 text-cyan-950"
      : "border-slate-300 bg-slate-50 text-slate-800"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-base font-black">FROZEN CAMERA/DEPTH INPUTS → RED LINES</div>
          <div className="mt-0.5 text-[10px] leading-4">
            Red endpoints reuse the frozen image, focal estimate, known height, and depth map. They still need separate person-surface geometry; a curved tape result cannot become the body scale. No expected body width, tape label, or circumference enters this calculation.
          </div>
        </div>
        <div className={`rounded-lg border-2 px-3 py-2 text-center ${resultReady ? "border-emerald-500 bg-emerald-100" : tapeGatePassed ? "border-cyan-500 bg-cyan-100" : "border-slate-300 bg-white"}`}>
          <div className="text-lg font-black">{resultReady ? "SAME MODEL · READY" : tapeGatePassed ? "RED WIDTHS RUNNING" : "LOCKED"}</div>
          <div className="text-[9px] font-bold">{tapeStatus === "loading" ? "four-position gate running" : `${tapePassCount}/4 tape · ${readyRowCount}/${bodyRows.length} red lines`}</div>
        </div>
      </div>

      {!tapeGatePassed || !tapeModel ? (
        <div className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-5 text-center text-xs font-black">
          DIRECT RED-LINE 3D MEASUREMENT WAITS FOR 4/4 TAPE PASS
        </div>
      ) : !fusedBodyResult ? (
        <div className="mt-3 rounded-lg border border-cyan-200 bg-white px-3 py-5 text-center text-xs font-black">
          {fusedBodyStatus === "error" ? "RED-LINE 3D MEASUREMENT FAILED" : "MEASURING THE THREE RED ENDPOINT PAIRS WITH THE LOCKED MODEL…"}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map(({ input, result }) => {
            const bodyReady = Boolean(result?.valid);
            return (
              <div key={input.name} className="rounded-lg border border-cyan-200 bg-white p-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-600">{rowLabel(input.name)} red width · {Math.abs(input.rightX - input.leftX).toFixed(0)} px</div>
                    <div className="font-mono text-2xl font-black text-slate-950">
                      {bodyReady && result ? `${result.predictedWidthCm.toFixed(2)} cm` : "n/a"}
                    </div>
                    <div className="text-[9px] font-bold text-cyan-800">
                      {bodyReady && result ? `${result.pixelSpan.toFixed(0)} px × ${result.cmPerPx.toFixed(6)} cm/px` : "person-surface depth unavailable"}
                    </div>
                  </div>
                  <span className={`rounded px-2 py-1 text-[9px] font-black ${bodyReady ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-900"}`}>
                    {bodyReady ? "DIRECT 3D WIDTH" : "NOT RELIABLE"}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 font-mono text-[10px] text-slate-700 sm:grid-cols-3">
                  <span className="rounded bg-cyan-50 px-2 py-1">
                    endpoints ({input.leftX.toFixed(0)}, {input.y.toFixed(0)}) → ({input.rightX.toFixed(0)}, {input.y.toFixed(0)})
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1">
                    corrected body depth {bodyReady && result ? `${result.correctedPlaneDepthM.toFixed(3)} m` : "n/a"}
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1">
                    left/right depth {bodyReady && result ? `${result.correctedLeftEdgeDepthM.toFixed(3)} / ${result.correctedRightEdgeDepthM.toFixed(3)} m` : "n/a"}
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1">
                    mask coverage {result ? `${result.bodyMaskCoveragePct.toFixed(1)}%` : "n/a"}
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1">
                    depth spread {result ? `${result.depthSpreadPct.toFixed(1)}%` : "n/a"}
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1">
                    confidence {result?.confidence ?? "low"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tapeModel && fusedBodyResult ? (
        <div className={`mt-2 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold ${sameFrozenModel ? "border-emerald-300 bg-emerald-100" : "border-red-300 bg-red-100 text-red-900"}`}>
          {sameFrozenModel ? "LOCK CONFIRMED" : "LOCK MISMATCH"} · focal {fusedBodyResult.model.depthProFocalPx.toFixed(1)} px · Apple/Depth scale {fusedBodyResult.model.depthProScaleFactor.toFixed(6)}× · known height {fusedBodyResult.model.knownHeightCm.toFixed(2)} cm
        </div>
      ) : null}
      <div className="mt-2 rounded-md border border-cyan-200 bg-white px-2 py-1 text-[10px] font-semibold">
        Shared evidence, different geometry: tape uses either a rigid line or a local 3D curve; red lines use person-mask-supported body depth. A tape pass does not prove the body surface. This remains visible front width only—no circumference formula.
      </div>
    </section>
  );
}

function FullScreenBodyScaleGate({
  appleResult,
  fusedResult,
  fusedStatus,
  fusedError,
  tapeControlTests,
  tapeControlStatus,
}: {
  appleResult: AppleVisionBodyScaleResult | null;
  fusedResult: AppleFusedBodyScaleApiResult | null;
  fusedStatus: "idle" | "loading" | "ready" | "error";
  fusedError: string | null;
  tapeControlTests: AppleFusedTapeTest[];
  tapeControlStatus: "idle" | "loading" | "ready" | "error";
}) {
  const gate = evaluateBodyScaleGate(appleResult, fusedResult);
  const tapePassCount = tapeControlTests.filter((test) => Math.abs(test.errorPct) <= 2).length;
  const tapeControlPass = tapeControlTests.length === 4 && tapePassCount === 4;
  const readableBodyRows = gate.evaluations.filter((item) => item.fusedRow?.valid).length;

  return (
    <section
      data-testid="body-only-red-line-scale-gate"
      className={`mb-3 rounded-xl border-2 p-3 shadow-sm ${gate.confirmed
        ? "border-emerald-500 bg-emerald-50 text-emerald-950"
        : "border-red-500 bg-red-50 text-red-950"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-base font-black">BODY-ONLY RED-LINE PX → CM GATE</div>
          <div className="mt-0.5 max-w-3xl text-[10px] leading-4">
            Same known-height normalization, different object geometry: Apple supplies body camera geometry; Depth Pro samples only MediaPipe person-mask pixels near the two red silhouette edges. Tape path, OCR, expected intervals, and circumference targets are excluded.
          </div>
        </div>
        <div className={`rounded-lg border-2 px-3 py-2 text-center ${gate.confirmed
          ? "border-emerald-500 bg-emerald-100"
          : "border-red-500 bg-red-100"}`}
        >
          <div className="text-lg font-black">{gate.confirmed ? "BODY SCALE ACCEPTED" : "BODY SCALE REJECTED"}</div>
          <div className="text-[10px] font-bold">all 3 rows must pass fixed quality + ≤2% method agreement</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-black">
        <span className={`rounded-full border px-2 py-1 ${tapeControlPass ? "border-emerald-400 bg-emerald-100" : "border-amber-400 bg-amber-100"}`}>
          TAPE CONTROL {tapeControlStatus === "loading" ? "RUNNING" : `${tapePassCount}/4 WITHIN 2%`} · NOT A BODY INPUT
        </span>
        <span className={`rounded-full border px-2 py-1 ${readableBodyRows === 3 ? "border-emerald-400 bg-emerald-100" : "border-amber-400 bg-amber-100"}`}>
          PERSON-MASK SURFACES {readableBodyRows}/3 READABLE
        </span>
        <span className={`rounded-full border px-2 py-1 ${gate.acceptedCount === 3 ? "border-emerald-400 bg-emerald-100" : "border-red-400 bg-red-100"}`}>
          BODY METHOD AGREEMENT {gate.acceptedCount}/3 WITHIN 2%
        </span>
      </div>

      {!fusedResult ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-4 text-center text-xs font-bold">
          {fusedStatus === "error" ? (fusedError ?? "Body-only red-line scale failed.") : "Reading the three person-mask body surfaces…"}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {gate.evaluations.map(({ appleRow, fusedRow, agreementPct, accepted }) => {
            const agreementCheck = agreementPct != null && Math.abs(agreementPct) <= 5;
            const rowStatus = accepted
              ? { label: "PASS ≤2%", className: "bg-emerald-100 text-emerald-900" }
              : agreementCheck
                ? { label: "CHECK 2–5%", className: "bg-amber-100 text-amber-900" }
                : { label: "FAIL >5%", className: "bg-red-100 text-red-900" };
            return (
              <div key={appleRow.name} className="rounded-lg border border-red-200 bg-white p-2">
                <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-600">{rowLabel(appleRow.name)} visible width</div>
                    <div className="font-mono text-2xl font-black text-slate-950">
                      {fusedRow ? `${fusedRow.predictedWidthCm.toFixed(2)} cm` : "n/a"}
                    </div>
                  </div>
                  <span className={`rounded px-2 py-1 text-[10px] font-black ${rowStatus.className}`}>{rowStatus.label}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] font-bold text-slate-800">
                  {fusedRow
                    ? `${fusedRow.pixelSpan.toFixed(0)} px × ${fusedRow.cmPerPx.toFixed(6)} cm/px`
                    : `${appleRow.pixelSpan.toFixed(0)} px · body surface rejected`}
                </div>
                <div className="mt-1 grid gap-1 font-mono text-[10px] text-slate-700 sm:grid-cols-3">
                  <span className="rounded bg-slate-50 px-2 py-1">
                    Apple body geometry {appleRow.frontPlaneWidthCm.toFixed(2)} cm
                    {agreementPct == null ? "" : ` · Δ ${agreementPct >= 0 ? "+" : ""}${agreementPct.toFixed(2)}%`}
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1">
                    mask coverage {fusedRow ? `${fusedRow.bodyMaskCoveragePct.toFixed(1)}%` : "n/a"} · depth spread {fusedRow ? `${fusedRow.depthSpreadPct.toFixed(1)}%` : "n/a"}
                  </span>
                  <span className="rounded bg-slate-50 px-2 py-1">
                    left/right depth Δ {fusedRow ? `${fusedRow.edgeDepthAsymmetryPct.toFixed(1)}%` : "n/a"} · {fusedRow?.confidence ?? "low"} confidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-semibold">
        Tape success is a camera/depth control and cannot unlock body formulas. Circumference remains locked unless all three body rows independently pass this body-only gate; unseen body thickness is still a later, separate problem.
      </div>
    </section>
  );
}

function FullScreenBodyMeasurementGate({
  measurement,
  measurementUnavailableMessage,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
  bodyScaleConfirmed,
}: {
  measurement: GeminiGuideMeasurement | null;
  measurementUnavailableMessage?: string;
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
  bodyScaleConfirmed: boolean;
}) {
  const targets: Partial<Record<GuideKind, number>> = {
    waist: targetNaturalWaistCm,
    trouserWaist: targetTrouserWaistCm,
    hips: targetHipsCm,
  };
  const rows = measurement?.rows.map((row) => {
    const targetCm = targets[row.kind] ?? null;
    const errorCm = targetCm && targetCm > 0 ? row.guidedCm - targetCm : null;
    const errorPct = errorCm == null || targetCm == null ? null : (errorCm / targetCm) * 100;
    return { row, targetCm, errorCm, errorPct };
  }) ?? [];
  const judgedRows = rows.filter((item) => item.targetCm != null && item.errorPct != null);
  const circumferencePassCount = judgedRows.filter((item) => Math.abs(item.errorPct ?? Number.POSITIVE_INFINITY) <= 2).length;

  return (
    <section className="mb-3 rounded-xl border-2 border-violet-400 bg-violet-50 p-3 text-violet-950 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-base font-black">CIRCUMFERENCE FORMULA · {bodyScaleConfirmed ? "APPROVED" : "REVIEW ONLY"}</div>
          <div className="mt-0.5 text-[10px] leading-4 text-violet-800">
            The formula result is always visible against the dataset. It is not approved until the body-only front-width scale passes; known targets are judge-only.
          </div>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] font-black">
          <span className={`rounded-full border px-2 py-1 ${bodyScaleConfirmed ? "border-emerald-400 bg-emerald-100 text-emerald-900" : "border-red-300 bg-red-100 text-red-900"}`}>
            BODY SCALE {bodyScaleConfirmed ? "PASSED" : "REQUIRED"}
          </span>
          <span className={`rounded-full border px-2 py-1 ${circumferencePassCount === judgedRows.length && judgedRows.length > 0 ? "border-emerald-400 bg-emerald-100 text-emerald-900" : "border-red-300 bg-red-100 text-red-900"}`}>
            CIRCUMFERENCE {circumferencePassCount}/{judgedRows.length || 3} WITHIN 2%
          </span>
        </div>
      </div>

      {!measurement ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-4 text-center text-sm font-medium text-amber-900">
          {measurementUnavailableMessage ?? "Circumference result is still calculating."}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map(({ row, targetCm, errorCm, errorPct }) => {
            const circumferencePass = errorPct != null && Math.abs(errorPct) <= 2;
            return (
              <div key={row.kind} className={`rounded-lg border-2 bg-white p-2 ${circumferencePass ? "border-emerald-300" : "border-red-300"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-600">{rowLabel(row.kind)}</div>
                    <div className="font-mono text-2xl font-black text-slate-950">{row.guidedCm.toFixed(1)} cm</div>
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    <div>target {targetCm == null ? "n/a" : `${targetCm.toFixed(2)} cm`}</div>
                    <div className={circumferencePass ? "font-black text-emerald-700" : "font-black text-red-700"}>
                      error {errorCm == null ? "n/a" : `${errorCm >= 0 ? "+" : ""}${errorCm.toFixed(2)} cm`}
                      {errorPct == null ? "" : ` · ${errorPct >= 0 ? "+" : ""}${errorPct.toFixed(2)}%`}
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-semibold text-slate-600">
                  Unseen thickness remains estimated: depth {row.depthCm.toFixed(1)} cm · ratio {row.depthRatio.toFixed(3)} · {row.depthSource}.
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 rounded-md border border-violet-200 bg-white px-2 py-1 text-[10px] font-semibold text-violet-900">
        {bodyScaleConfirmed ? "Approved body scale." : "Review only: body scale has not passed."} Unseen front-to-back thickness still comes from the depth-ratio and circumference formula.
      </div>
    </section>
  );
}

function ManualRealtimePanel({
  measurement,
  measurementUnavailableMessage,
  scaleEvidence,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
  depthRatioOverrides,
  onDepthRatioOverrideChange,
  measurementMode,
  compact = false,
}: {
  measurement: GeminiGuideMeasurement | null;
  measurementUnavailableMessage?: string;
  scaleEvidence?: Props["scaleEvidence"];
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  onDepthRatioOverrideChange?: (kind: GuideKind, ratio: number | null) => void;
  measurementMode: MeasurementMode;
  compact?: boolean;
}) {
  const rows = measurement
    ? [
        { title: "Natural waist", row: measurement.waist, targetCm: targetNaturalWaistCm },
        { title: "Trouser waist", row: measurement.trouserWaist, targetCm: targetTrouserWaistCm },
        { title: "Hips", row: measurement.hips, targetCm: targetHipsCm },
      ]
    : [];

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div>
        <h4 className="text-sm font-semibold text-text-primary">Live measurements</h4>
        <p className={`${compact ? "hidden" : "mt-1"} text-xs text-text-secondary`}>
          Active formula values update while handles move.
        </p>
      </div>
      {scaleEvidence ? <ManualScaleEvidence evidence={scaleEvidence} compact={compact} /> : null}
      {measurement ? <ManualDepthScaleEvidence measurement={measurement} compact={compact} /> : null}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {rows.length ? rows.map(({ title, row, targetCm }) => (
          <ManualRealtimeRow
            key={title}
            title={title}
            row={row}
            targetCm={targetCm}
            depthRatioOverrides={depthRatioOverrides}
            onDepthRatioOverrideChange={onDepthRatioOverrideChange}
            measurementMode={measurementMode}
            compact={compact}
          />
        )) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-slate-50 px-3 py-8 text-center text-sm text-text-secondary">
            {measurementUnavailableMessage ?? "Run Analyze once to see live manual numbers."}
          </div>
        )}
      </div>
      {measurement && !compact ? (
        <ManualMeasurementTable
          measurement={measurement}
          targetNaturalWaistCm={targetNaturalWaistCm}
          targetTrouserWaistCm={targetTrouserWaistCm}
          targetHipsCm={targetHipsCm}
        />
      ) : null}
    </div>
  );
}

function ManualDepthScaleEvidence({
  measurement,
  compact = false,
}: {
  measurement: GeminiGuideMeasurement;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "rounded-md p-2 text-[10px]" : "rounded-lg p-3 text-[11px]"} border border-blue-100 bg-blue-50 text-blue-950`}>
      <div className="font-semibold">depth scale evidence</div>
      <div className={`${compact ? "mt-1 grid-cols-2 gap-1" : "mt-2 gap-2 sm:grid-cols-2"} grid`}>
        <div className="rounded-md bg-white px-2 py-1">
          Active front representative: {measurement.activeCmPerPx.toFixed(5)} cm/px ({measurement.activeScaleSource === "apple-vision-body-depth" ? "Apple body depth" : "global height"})
        </div>
        <div className="rounded-md bg-white px-2 py-1">
          Front height scale: {measurement.frontHeightCmPerPx == null ? "n/a" : `${measurement.frontHeightCmPerPx.toFixed(5)} cm/px`}
        </div>
        <div className="rounded-md bg-white px-2 py-1">
          Side scale: {measurement.sideHeightCmPerPx == null ? "n/a" : `${measurement.sideHeightCmPerPx.toFixed(5)} cm/px`}
          {measurement.sideHeightScaleSource ? ` (${measurement.sideHeightScaleSource})` : ""}
        </div>
        <div className="rounded-md bg-white px-2 py-1">
          Side vs active: {measurement.sideScaleDeltaPct == null ? "n/a" : `${measurement.sideScaleDeltaPct > 0 ? "+" : ""}${measurement.sideScaleDeltaPct.toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}

function ManualRealtimeRow({
  title,
  row,
  targetCm,
  depthRatioOverrides,
  onDepthRatioOverrideChange,
  measurementMode,
  compact = false,
}: {
  title: string;
  row: GeminiGuideMeasurement["rows"][number] | null;
  targetCm?: number;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  onDepthRatioOverrideChange?: (kind: GuideKind, ratio: number | null) => void;
  measurementMode: MeasurementMode;
  compact?: boolean;
}) {
  if (!row) {
    return (
      <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 text-sm text-text-secondary">
        {title}: no row
      </div>
    );
  }
  const bounds = rowDepthRatioBounds(row.kind);
  const overrideValue = depthRatioOverrides?.[row.kind] ?? row.depthRatioOverride ?? null;
  const sliderValue = clamp(overrideValue ?? row.depthRatio, bounds.min, bounds.max);
  const changeDepthRatio = onDepthRatioOverrideChange;
  const usesTableDepthSource = row.depthSource === "wear-depth-ratio-formula";
  const canOverrideRatio = measurementMode === "circumference" && Boolean(changeDepthRatio);
  const displayCm = measurementMode === "side-depth" ? row.formulaWidthCm : row.guidedCm;
  const targetAccuracyPct = targetCm && targetCm > 0
    ? clamp(100 - (Math.abs(displayCm - targetCm) / targetCm) * 100, 0, 100)
    : null;
  const tableEstimate = measurementMode === "circumference" ? row.depthRatioTable : null;
  const formulaErrorCm = targetCm && targetCm > 0 ? row.guidedCm - targetCm : null;
  const tableErrorCm = targetCm && targetCm > 0 && tableEstimate ? tableEstimate.guidedCm - targetCm : null;
  const closerLabel = formulaErrorCm == null || tableErrorCm == null
    ? null
    : Math.abs(tableErrorCm) + 0.05 < Math.abs(formulaErrorCm)
      ? "WEAR formula closer"
      : Math.abs(formulaErrorCm) + 0.05 < Math.abs(tableErrorCm)
        ? "current formula closer"
        : "tie";
  const ratioDecision = row.depthSource === "wear-depth-ratio-formula"
    ? `WEAR ${row.depthRatio.toFixed(3)} active`
    : row.depthSource === "manual-depth-ratio"
      ? `manual ${row.depthRatio.toFixed(3)} active`
      : `${row.depthSource} active`;
  const looseEdge = row.edgeTrust === "loose-clothing-untrusted";

  return (
    <div className={`${compact ? "rounded-md p-2" : "rounded-lg p-3"} border border-gray-200 bg-white shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`${compact ? "text-[10px]" : "text-xs"} font-semibold uppercase tracking-wider text-text-hint`}>{title}</div>
          <div className={`${compact ? "mt-0 text-lg" : "mt-1 text-2xl"} font-bold text-brand-blue`}>{cmToIn(displayCm).toFixed(1)} in</div>
          <div className={`${compact ? "text-xs" : "text-sm"} font-mono text-text-primary`}>{displayCm.toFixed(1)} cm</div>
          {targetAccuracyPct == null ? null : (
            <div className={`${compact ? "mt-1 text-[10px]" : "mt-2 text-[11px]"} inline-flex rounded bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-800`}>
              target accuracy {targetAccuracyPct.toFixed(1)}%
            </div>
          )}
        </div>
        <div className={`${compact ? "text-[10px]" : "text-[11px]"} rounded-md bg-slate-50 px-2 py-1 text-right font-mono text-text-secondary`}>
          y {row.yPx}<br />
          x {row.leftXPx}-{row.rightXPx}
        </div>
      </div>
      <div className={`${compact ? "mt-2 gap-1 text-[10px]" : "mt-3 gap-2 text-[11px]"} grid grid-cols-2`}>
        {targetCm && targetCm > 0 ? (
          <>
            <MiniStat label="Target" value={`${targetCm.toFixed(1)} cm`} />
            <MiniStat label="Diff" value={formatSignedCmIn(displayCm - targetCm)} />
            {targetAccuracyPct == null ? null : <MiniStat label="Accuracy" value={`${targetAccuracyPct.toFixed(1)}%`} />}
          </>
        ) : null}
        <MiniStat label={measurementMode === "side-depth" ? "Side width" : "Active width"} value={`${row.formulaWidthCm.toFixed(1)} cm`} />
        <MiniStat label="Row scale" value={`${row.cmPerPx.toFixed(6)} cm/px · ${row.scaleSource === "apple-vision-body-depth" ? "Apple body depth" : "global height"}`} />
        <MiniStat label="Guide width" value={`${row.geminiWidthCm.toFixed(1)} cm`} />
        <MiniStat label="Width source" value={formatWidthSource(row.formulaWidthSource)} />
        <MiniStat label="Edge trust" value={formatEdgeTrust(row.edgeTrust)} />
        {row.maskWidthCm == null ? null : <MiniStat label="Visible edge" value={`${row.maskWidthCm.toFixed(1)} cm`} />}
        {measurementMode === "circumference" ? (
          <>
            <MiniStat label="Depth" value={`${row.depthCm.toFixed(1)} cm`} />
            <MiniStat label="Active ratio" value={row.depthRatio.toFixed(3)} />
            <MiniStat
              label="Circ model"
              value={row.circumferenceModel === "hip-flare-superellipse"
                ? "hip-flare superellipse"
                : row.circumferenceModel === "body-shape-superellipse"
                  ? "body-shape superellipse"
                  : "ellipse"}
            />
            {row.shapeExponent == null ? null : <MiniStat label="Shape n" value={row.shapeExponent.toFixed(3)} />}
            {row.shapeFlareRatio == null ? null : <MiniStat label="Shape index" value={row.shapeFlareRatio.toFixed(3)} />}
            {tableEstimate ? (
              <>
                <MiniStat label="WEAR ratio" value={tableEstimate.table.depthRatio.toFixed(3)} />
                <MiniStat label="WEAR support" value={`${tableEstimate.rangeMin.toFixed(3)}–${tableEstimate.rangeMax.toFixed(3)}`} />
                <MiniStat label="Source-ratio status" value={formatDepthTableRangeStatus(tableEstimate.rangeStatus)} />
                <MiniStat label="WEAR depth" value={`${tableEstimate.depthCm.toFixed(1)} cm`} />
                <MiniStat label="WEAR result" value={`${tableEstimate.guidedCm.toFixed(1)} cm`} />
                <MiniStat label="Study range" value={tableEstimate.table.bmiBand} />
                <MiniStat label="Shape proxy" value={formatDepthTableShape(tableEstimate.table.bodyShape)} />
              </>
            ) : null}
          </>
        ) : null}
        {row.sideDepthCandidateCm == null ? null : (
          <>
            <MiniStat label={row.sideDepthAccepted ? "Side depth" : "Side cand"} value={`${row.sideDepthCandidateCm.toFixed(1)} cm`} />
            <MiniStat label="Side ratio" value={`${row.sideDepthCandidateRatio?.toFixed(3) ?? "n/a"} ${row.sideDepthAccepted ? "used" : "rejected"}`} />
            {row.sideDepthRawCm == null ? null : <MiniStat label="Raw side" value={`${row.sideDepthRawCm.toFixed(1)} cm`} />}
            {row.sideDepthProjectionLeakRatio == null ? null : <MiniStat label="Leak" value={row.sideDepthProjectionLeakRatio.toFixed(3)} />}
          </>
        )}
        {measurementMode === "circumference" ? (
          <>
            <MiniStat label="Raw/source ratio" value={row.baseDepthRatio.toFixed(3)} />
            {row.depthRatioOverride == null ? null : <MiniStat label="Manual ratio input" value={row.depthRatioOverride.toFixed(3)} />}
            <MiniStat label="Ratio decision" value={ratioDecision} />
            <MiniStat label="Depth source" value={row.depthSource} />
          </>
        ) : null}
      </div>
      {looseEdge ? (
        <div className={`${compact ? "mt-2 p-1.5 text-[10px]" : "mt-3 p-2 text-[11px]"} rounded-md border border-amber-200 bg-amber-50 font-mono text-amber-900`}>
          loose clothing: visible edge may overestimate body edge. Use manual endpoints or treat result as low confidence.
        </div>
      ) : null}
      {canOverrideRatio ? (
        <div className={`${compact ? "mt-2 gap-1" : "mt-3 gap-2"} grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center`}>
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={0.005}
            value={sliderValue}
            onChange={(event) => changeDepthRatio?.(row.kind, Number(event.currentTarget.value))}
            aria-label={`${title} depth ratio`}
            className="h-2 accent-red-600"
          />
          <input
            type="number"
            min={bounds.min}
            max={bounds.max}
            step={0.005}
            value={sliderValue.toFixed(3)}
            onChange={(event) => changeDepthRatio?.(row.kind, Number(event.currentTarget.value))}
            className={`${compact ? "h-7 text-[10px]" : "h-8 text-[11px]"} rounded-md border border-gray-200 bg-white px-1 font-mono text-text-primary`}
          />
          <button
            type="button"
            onClick={() => changeDepthRatio?.(row.kind, null)}
            disabled={overrideValue == null}
            className={`${compact ? "h-7 px-1.5 text-[10px]" : "h-8 px-2 text-[11px]"} rounded-md border border-gray-200 bg-white font-semibold text-text-secondary hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Reset
          </button>
          <div className={`${compact ? "col-span-3 text-[10px]" : "col-span-3 text-[11px]"} font-mono text-text-secondary`}>
            override {overrideValue == null ? "off; WEAR formula active" : `${overrideValue.toFixed(3)} active; reset returns to WEAR`} · allowed {bounds.min.toFixed(2)}-{bounds.max.toFixed(2)}
          </div>
        </div>
      ) : usesTableDepthSource && measurementMode === "circumference" ? (
        <div className={`${compact ? "mt-2 p-1.5 text-[10px]" : "mt-3 p-2 text-[11px]"} rounded-md border border-amber-200 bg-amber-50 font-mono text-amber-900`}>
          Ratio override disabled: depth is WEAR-formula owned. To change this result, move red endpoints left/right so the active width changes.
        </div>
      ) : null}
      {measurementMode === "circumference" ? (
        <div className={`${compact ? "mt-2 p-1.5 text-[10px] leading-snug" : "mt-3 p-2 text-[11px] leading-relaxed"} rounded-md bg-slate-50 font-mono text-text-primary`}>
          D = W x ratio = {row.formulaWidthCm.toFixed(1)} x {row.depthRatio.toFixed(3)} = {row.depthCm.toFixed(1)} cm<br />
          C = {row.circumferenceModel !== "ellipse" ? `superellipse(n ${row.shapeExponent?.toFixed(3) ?? "n/a"})` : "ellipse"}(W {row.formulaWidthCm.toFixed(1)}, D {row.depthCm.toFixed(1)}) = {row.guidedCm.toFixed(1)} cm
        </div>
      ) : (
        <div className={`${compact ? "mt-2 p-1.5 text-[10px] leading-snug" : "mt-3 p-2 text-[11px] leading-relaxed"} rounded-md bg-slate-50 font-mono text-text-primary`}>
          Side guide width = {row.formulaWidthCm.toFixed(1)} cm. This can be used as side depth by the front ellipse when side guide mode is active.
        </div>
      )}
      {tableEstimate ? (
        <div className={`${compact ? "mt-2 p-1.5 text-[10px] leading-snug" : "mt-3 p-2 text-[11px] leading-relaxed"} rounded-md border border-emerald-200 bg-emerald-50 font-mono text-emerald-950`}>
          {row.depthSource === "manual-depth-ratio" ? (
            <>
              MANUAL OVERRIDE ACTIVE: slider ratio {row.depthRatio.toFixed(3)} is driving the result. WEAR prediction {tableEstimate.table.depthRatio.toFixed(3)} remains reference only.
              <br />
            </>
          ) : (
            <>
              WEAR FORMULA ACTIVE: old source ratio {tableEstimate.formulaDepthRatio.toFixed(3)} is {formatDepthTableRangeStatus(tableEstimate.rangeStatus)}; active WEAR ratio {tableEstimate.acceptedDepthRatio.toFixed(3)} from support {tableEstimate.rangeMin.toFixed(3)}–{tableEstimate.rangeMax.toFixed(3)}.
              <br />
            </>
          )}
          WEAR prediction interval: {tableEstimate.table.depthRatioP10.toFixed(3)}–{tableEstimate.table.depthRatioP90.toFixed(3)}; validation MAE {tableEstimate.table.validationMae.toFixed(3)}.
          <br />
          Line movement rule: active result changes from red endpoint left/right span. Moving this row up/down with the same X span does not change circumference.
          <br />
          WEAR formula: D = {row.formulaWidthCm.toFixed(1)} x {tableEstimate.table.depthRatio.toFixed(3)} = {tableEstimate.depthCm.toFixed(1)} cm; ellipse = {tableEstimate.guidedCm.toFixed(1)} cm
          {targetCm && targetCm > 0 ? (
            <>
              <br />
              target {targetCm.toFixed(1)} cm · formula error {formatSignedCmIn(row.guidedCm - targetCm)} · table error {formatSignedCmIn(tableEstimate.guidedCm - targetCm)} · {closerLabel}
            </>
          ) : null}
          <br />
          same row width + same active scale; this compares depth ratio only.
        </div>
      ) : null}
    </div>
  );
}

function rowDepthRatioBounds(kind: GuideKind): { min: number; max: number } {
  if (kind === "trouserWaist") return { min: 0.35, max: 1.1 };
  if (kind === "hips") return { min: 0.35, max: 0.9 };
  return { min: 0.35, max: 0.9 };
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wider text-text-hint">{label}</div>
      <div className="break-words font-mono text-text-primary">{value}</div>
    </div>
  );
}

function formatEdgeTrust(source: GeminiGuideMeasurement["rows"][number]["edgeTrust"]): string {
  if (source === "manual-body-edge") return "manual body edge";
  if (source === "local-ml-predicted-edge") return "Local ML predicted body edge";
  if (source === "visible-mask-edge") return "visible edge evidence";
  if (source === "loose-clothing-untrusted") return "loose/untrusted";
  if (source === "fallback") return "fallback";
  return "model red edge";
}

function formatWidthSource(source: GeminiGuideMeasurement["rows"][number]["formulaWidthSource"]): string {
  if (source === "manual-coordinates") return "manual red endpoints";
  if (source === "local-ml-v1") return "Local ML red endpoints";
  if (source === "gemini-red-line") return "red-pixel line";
  if (source === "gemini-json-endpoints") return "Gemini JSON endpoints";
  if (source === "fallback-line") return "fallback endpoints";
  return source;
}

function formatDepthTableShape(shape: NonNullable<GeminiGuideMeasurement["rows"][number]["depthRatioTable"]>["table"]["bodyShape"]): string {
  if (shape === "curvy-hourglass") return "curvy/hourglass";
  if (shape === "pear-hip-dominant") return "pear/hip";
  if (shape === "athletic-inverted") return "athletic/inverted";
  if (shape === "straight-round") return "straight/round";
  return "average";
}

function formatDepthTableRangeStatus(status: NonNullable<GeminiGuideMeasurement["rows"][number]["depthRatioTable"]>["rangeStatus"]): string {
  if (status === "table-fallback-low") return "below table range";
  if (status === "table-fallback-high") return "above table range";
  return "inside table range";
}

function formatSignedCmIn(valueCm: number): string {
  const sign = valueCm > 0 ? "+" : "";
  return `${sign}${valueCm.toFixed(1)} cm / ${sign}${cmToIn(valueCm).toFixed(1)} in`;
}

function targetForRow(
  kind: GuideKind,
  targetNaturalWaistCm?: number,
  targetTrouserWaistCm?: number,
  targetHipsCm?: number,
): number | undefined {
  if (kind === "waist") return targetNaturalWaistCm;
  if (kind === "trouserWaist") return targetTrouserWaistCm;
  return targetHipsCm;
}

function closerLabel(formulaCm: number, tableCm: number | null, targetCm?: number): string {
  if (!targetCm || targetCm <= 0 || tableCm == null) return "n/a";
  const formulaError = Math.abs(formulaCm - targetCm);
  const tableError = Math.abs(tableCm - targetCm);
  if (tableError + 0.05 < formulaError) return "WEAR formula";
  if (formulaError + 0.05 < tableError) return "formula";
  return "tie";
}

function ManualMeasurementTable({
  measurement,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
}: {
  measurement: GeminiGuideMeasurement;
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-red-200 bg-white">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-red-100 text-red-950">
          <tr>
            <th className="px-2 py-2 font-semibold">Row</th>
            <th className="px-2 py-2 font-semibold">Y</th>
            <th className="px-2 py-2 font-semibold">Left</th>
            <th className="px-2 py-2 font-semibold">Right</th>
            <th className="px-2 py-2 font-semibold">Width</th>
            <th className="px-2 py-2 font-semibold">Visible edge</th>
            <th className="px-2 py-2 font-semibold">Edge trust</th>
            <th className="px-2 py-2 font-semibold">Side cand</th>
            <th className="px-2 py-2 font-semibold">Raw side</th>
            <th className="px-2 py-2 font-semibold">Depth src</th>
            <th className="px-2 py-2 font-semibold">Active result</th>
            <th className="px-2 py-2 font-semibold">WEAR formula</th>
            <th className="px-2 py-2 font-semibold">Target winner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-red-100 font-mono text-text-primary">
          {measurement.rows.map((row) => {
            const targetCm = targetForRow(row.kind, targetNaturalWaistCm, targetTrouserWaistCm, targetHipsCm);
            return (
              <tr key={row.kind}>
                <td className="px-2 py-2 font-sans text-text-secondary">{row.kind}</td>
                <td className="px-2 py-2">{row.yPx}</td>
                <td className="px-2 py-2">{row.leftXPx}</td>
                <td className="px-2 py-2">{row.rightXPx}</td>
                <td className="px-2 py-2">
                  {row.formulaWidthCm.toFixed(1)} cm
                  <span className="block font-sans text-text-secondary">{formatWidthSource(row.formulaWidthSource)}</span>
                </td>
                <td className="px-2 py-2">{row.maskWidthCm == null ? "n/a" : `${row.maskWidthCm.toFixed(1)} cm`}</td>
                <td className="px-2 py-2 font-sans text-text-secondary">{formatEdgeTrust(row.edgeTrust)}</td>
                <td className="px-2 py-2">
                  {row.sideDepthCandidateCm == null
                    ? "n/a"
                    : `${row.sideDepthCandidateCm.toFixed(1)} cm / ${row.sideDepthCandidateRatio?.toFixed(3) ?? "n/a"} ${row.sideDepthAccepted ? "used" : "rejected"}`}
                </td>
                <td className="px-2 py-2">
                  {row.sideDepthRawCm == null
                    ? "n/a"
                    : `${row.sideDepthRawCm.toFixed(1)} cm / ${row.sideDepthRawRatio?.toFixed(3) ?? "n/a"} leak ${row.sideDepthProjectionLeakRatio?.toFixed(3) ?? "n/a"}`}
                </td>
                <td className="px-2 py-2 font-sans text-text-secondary">{row.depthSource}</td>
                <td className="px-2 py-2">
                  {row.guidedCm.toFixed(1)} cm
                  {targetCm && targetCm > 0 ? <span className="block text-red-700">{formatSignedCmIn(row.guidedCm - targetCm)}</span> : null}
                </td>
                <td className="px-2 py-2">
                  {row.depthRatioTable
                    ? (
                      <>
                        {row.depthRatioTable.guidedCm.toFixed(1)} cm
                        <span className="block text-text-secondary">
                          r {row.depthRatioTable.table.depthRatio.toFixed(3)} · {formatDepthTableShape(row.depthRatioTable.table.bodyShape)}
                        </span>
                        <span className={row.depthRatioTable.rangeStatus === "inside" ? "block text-text-secondary" : "block font-semibold text-amber-700"}>
                          source {formatDepthTableRangeStatus(row.depthRatioTable.rangeStatus)} · raw {row.depthRatioTable.formulaDepthRatio.toFixed(3)} → active {row.depthRatioTable.acceptedDepthRatio.toFixed(3)}
                        </span>
                        {targetCm && targetCm > 0 ? <span className="block text-emerald-700">{formatSignedCmIn(row.depthRatioTable.guidedCm - targetCm)}</span> : null}
                      </>
                    )
                    : "n/a"}
                </td>
                <td className="px-2 py-2 font-sans text-text-secondary">
                  {closerLabel(row.guidedCm, row.depthRatioTable?.guidedCm ?? null, targetCm)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function normalizeGuide(
  guide: GeminiBodyGuide | null,
  imageWidth: number,
  imageHeight: number,
): GeminiBodyGuide | null {
  if (!guide || imageWidth <= 0 || imageHeight <= 0) return null;
  const next: GeminiBodyGuide = {};
  for (const row of GUIDE_ROWS) {
    const line = guide[row.kind];
    const normalized = normalizeLine(line, imageWidth, imageHeight);
    if (normalized) next[row.kind] = normalized;
  }
  return next.waist || next.trouserWaist || next.hips ? next : null;
}

function buildBodyMaskSupport(
  pose: PoseResult | null,
  imageWidth: number,
  imageHeight: number,
  rows: BodyScaleRowInput[],
): BodyMaskSupportRow[] {
  const mask = pose?.mask;
  const maskWidth = pose?.maskWidth ?? 0;
  const maskHeight = pose?.maskHeight ?? 0;
  if (!mask || maskWidth <= 0 || maskHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) return [];

  const threshold = 128;
  const rowRadiusPx = clamp(Math.round(imageHeight * 0.0015), 3, 9);
  const maskSource = pose?.maskSource ?? "pose";
  const maskValueAtSourcePixel = (x: number, y: number) => {
    const maskX = clamp(Math.floor(((x + 0.5) / imageWidth) * maskWidth), 0, maskWidth - 1);
    const maskY = clamp(Math.floor(((y + 0.5) / imageHeight) * maskHeight), 0, maskHeight - 1);
    return mask[maskY * maskWidth + maskX] ?? 0;
  };

  return rows.map((row) => {
    const leftX = clamp(Math.floor(Math.min(row.leftX, row.rightX)), 0, imageWidth - 1);
    const rightXExclusive = clamp(Math.ceil(Math.max(row.leftX, row.rightX)) + 1, leftX + 1, imageWidth);
    const centerY = clamp(Math.round(row.y), 0, imageHeight - 1);
    const startY = clamp(centerY - rowRadiusPx, 0, imageHeight - 1);
    const endY = clamp(centerY + rowRadiusPx, 0, imageHeight - 1);
    const scanlines = [] as BodyMaskSupportRow["scanlines"];

    for (let y = startY; y <= endY; y += 1) {
      const runs: BodyMaskSupportRun[] = [];
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

    return {
      name: row.name,
      threshold,
      maskWidth,
      maskHeight,
      maskSource,
      scanlines,
    };
  });
}

function normalizeLine(
  line: GeminiGuideLine | undefined,
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine | null {
  if (!line) return null;
  const y = clamp(line.y_px ?? imageHeight * 0.45, 0, imageHeight - 1);
  const left = clamp(line.left_x_px ?? imageWidth * 0.35, 0, imageWidth - 1);
  const right = clamp(line.right_x_px ?? imageWidth * 0.65, 0, imageWidth - 1);
  const points = line.points?.length
    ? endpointPoints(line.points, imageWidth, imageHeight)
    : buildDefaultPoints(left, right, y);
  return lineFromPoints(points, line.confidence ?? 1, imageWidth, imageHeight);
}

function updateGuidePoint(
  guide: GeminiBodyGuide,
  target: { kind: GuideKind; pointIndex: number },
  point: { x: number; y: number },
  imageWidth: number,
  imageHeight: number,
): GeminiBodyGuide {
  const line = normalizeLine(guide[target.kind], imageWidth, imageHeight);
  if (!line?.points?.length) return guide;
  const points = line.points.map((candidate, index) => index === target.pointIndex
    ? {
        x_px: clamp(point.x, 0, imageWidth - 1),
        y_px: clamp(point.y, 0, imageHeight - 1),
      }
    : candidate);
  points.sort((a, b) => a.x_px - b.x_px);
  return {
    ...guide,
    [target.kind]: lineFromPoints(points, 1, imageWidth, imageHeight),
    notes: "Manual coordinate guide. Red endpoints own the active formula span; visible mask edge is debug evidence only.",
  };
}

function lineFromPoints(
  points: Array<{ x_px: number; y_px: number }>,
  confidence: number,
  imageWidth: number,
  imageHeight: number,
): GeminiGuideLine {
  const sorted = [...points].sort((a, b) => a.x_px - b.x_px);
  const first = sorted[0] ?? { x_px: imageWidth * 0.35, y_px: imageHeight * 0.45 };
  const last = sorted[sorted.length - 1] ?? { x_px: imageWidth * 0.65, y_px: imageHeight * 0.45 };
  const rowY = sorted.length > 0
    ? sorted.reduce((sum, point) => sum + point.y_px, 0) / sorted.length
    : first.y_px;
  return {
    y_px: Math.round(clamp(rowY, 0, imageHeight - 1)),
    left_x_px: Math.round(clamp(first.x_px, 0, imageWidth - 1)),
    right_x_px: Math.round(clamp(last.x_px, 0, imageWidth - 1)),
    confidence,
    points: sorted.map((point) => ({
      x_px: Math.round(clamp(point.x_px, 0, imageWidth - 1)),
      y_px: Math.round(clamp(point.y_px, 0, imageHeight - 1)),
    })),
  };
}

function buildDefaultPoints(left: number, right: number, y: number): Array<{ x_px: number; y_px: number }> {
  return [
    { x_px: left, y_px: y },
    { x_px: right, y_px: y },
  ];
}

function endpointPoints(
  points: Array<{ x_px: number; y_px: number }>,
  imageWidth: number,
  imageHeight: number,
): Array<{ x_px: number; y_px: number }> {
  const sorted = points
    .map((point) => ({
      x_px: clamp(point.x_px, 0, imageWidth - 1),
      y_px: clamp(point.y_px, 0, imageHeight - 1),
    }))
    .sort((a, b) => a.x_px - b.x_px);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first && last ? [first, last] : sorted;
}

function ScaleProofRulerSvg({
  variant,
  ruler,
  intervalValue,
  unit,
  imageWidth,
  imageHeight,
  zoom,
  customLabel,
  onHandleDragStart,
  onLineDragStart,
}: {
  variant: "tape" | "free" | "red-copy";
  ruler: ScaleProofRuler;
  intervalValue: number;
  unit: ScaleProofUnit;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  customLabel?: string;
  onHandleDragStart?: (handle: ScaleProofHandle, event: SvgHandleDragEvent) => void;
  onLineDragStart?: (event: SvgHandleDragEvent) => void;
}) {
  const viewScale = Math.max(zoom, 1);
  const lineWidth = Math.max(4, imageWidth * 0.004) / viewScale;
  const hitRadius = Math.max(20, imageWidth * 0.018) / viewScale;
  const crossRadius = Math.max(9, imageWidth * 0.007) / viewScale;
  const crossGap = Math.max(4, imageWidth * 0.0025) / viewScale;
  const fontSize = Math.max(17, imageWidth * 0.015) / viewScale;
  const midpoint = {
    x: (ruler.start.x + ruler.end.x) / 2,
    y: (ruler.start.y + ruler.end.y) / 2,
  };
  const isFreeRuler = variant === "free";
  const isRedCopy = variant === "red-copy";
  const lineLabel = customLabel ?? (isFreeRuler
    ? `free ruler · target ${intervalValue} ${unit}`
    : isRedCopy
      ? "vertical red-line copy"
      : `scale proof ${intervalValue} ${unit}`);
  const lineLabelWidth = lineLabel.length * fontSize * 0.61;
  const lineLabelX = clamp(midpoint.x + (16 / viewScale), 4, Math.max(4, imageWidth - lineLabelWidth - 10));
  const lineLabelY = clamp(midpoint.y, fontSize + 8, imageHeight - 8);
  const handles: Array<{ key: ScaleProofHandle; point: ScaleProofPoint; label: string }> = [
    { key: "start", point: ruler.start, label: isFreeRuler ? "C" : isRedCopy ? "R1" : "A" },
    { key: "end", point: ruler.end, label: isFreeRuler ? "D" : isRedCopy ? "R2" : "B" },
  ];
  const strokeColor = isFreeRuler ? "#38bdf8" : isRedCopy ? "#fb923c" : "#10b981";
  const labelFill = isFreeRuler
    ? "rgba(12,74,110,0.90)"
    : isRedCopy
      ? "rgba(124,45,18,0.92)"
      : "rgba(6,78,59,0.86)";
  const labelText = isFreeRuler ? "#e0f2fe" : isRedCopy ? "#ffedd5" : "#d1fae5";

  return (
    <g>
      {onLineDragStart ? (
        <line
          data-testid={isRedCopy ? "manual-red-line-proof-line" : "manual-free-ruler-line"}
          aria-label={isRedCopy ? "Vertical red-line proof" : "Free ruler line"}
          x1={ruler.start.x}
          y1={ruler.start.y}
          x2={ruler.end.x}
          y2={ruler.end.y}
          stroke="transparent"
          strokeWidth={hitRadius * 1.1}
          strokeLinecap="round"
          onPointerDown={onLineDragStart}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          style={{ cursor: "move", touchAction: "none" }}
        />
      ) : null}
      <line
        x1={ruler.start.x}
        y1={ruler.start.y}
        x2={ruler.end.x}
        y2={ruler.end.y}
        stroke={strokeColor}
        strokeWidth={lineWidth}
        strokeDasharray={`${12 / viewScale} ${8 / viewScale}`}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <rect
        x={lineLabelX - (5 / viewScale)}
        y={lineLabelY - fontSize}
        width={lineLabelWidth + (10 / viewScale)}
        height={fontSize + (8 / viewScale)}
        rx={3 / viewScale}
        fill={labelFill}
        pointerEvents="none"
      />
      <text
        x={lineLabelX}
        y={lineLabelY}
        fill={labelText}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize={fontSize}
        pointerEvents="none"
      >
        {lineLabel}
      </text>
      {handles.map(({ key, point, label }) => (
        <g key={key}>
          <circle
            data-scale-proof-handle={`${variant}-${key}`}
            data-testid={isFreeRuler
              ? `manual-free-ruler-${key}`
              : isRedCopy
                ? `manual-red-line-proof-${key}`
                : `manual-scale-proof-${key}`}
            aria-label={`${isFreeRuler ? "Free ruler" : isRedCopy ? "Vertical red-line proof" : "Scale proof"} ${key} handle`}
            cx={point.x}
            cy={point.y}
            r={hitRadius}
            fill="transparent"
            pointerEvents={onHandleDragStart ? "all" : "none"}
            onPointerDown={onHandleDragStart ? (event) => onHandleDragStart(key, event) : undefined}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{ cursor: onHandleDragStart ? "grab" : "move", touchAction: "none" }}
          />
          <line
            x1={point.x - crossRadius}
            y1={point.y}
            x2={point.x - crossGap}
            y2={point.y}
            stroke={isFreeRuler ? "#e0f2fe" : isRedCopy ? "#ffedd5" : "#ecfdf5"}
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <line
            x1={point.x + crossGap}
            y1={point.y}
            x2={point.x + crossRadius}
            y2={point.y}
            stroke={isFreeRuler ? "#e0f2fe" : isRedCopy ? "#ffedd5" : "#ecfdf5"}
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <line
            x1={point.x}
            y1={point.y - crossRadius}
            x2={point.x}
            y2={point.y - crossGap}
            stroke={isFreeRuler ? "#e0f2fe" : isRedCopy ? "#ffedd5" : "#ecfdf5"}
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <line
            x1={point.x}
            y1={point.y + crossGap}
            x2={point.x}
            y2={point.y + crossRadius}
            stroke={isFreeRuler ? "#e0f2fe" : isRedCopy ? "#ffedd5" : "#ecfdf5"}
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <text
            x={clamp(point.x + crossRadius + (4 / viewScale), 4, imageWidth - (label.length * fontSize * 0.6) - 6)}
            y={clamp(point.y - crossRadius, fontSize + 4, imageHeight - 6)}
            fill={isFreeRuler ? "#bae6fd" : isRedCopy ? "#fed7aa" : "#a7f3d0"}
            stroke="rgba(0,0,0,0.75)"
            strokeWidth={Math.max(1, fontSize * 0.08)}
            paintOrder="stroke"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize={fontSize}
            pointerEvents="none"
          >
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}

function ManualHeightScalePanel({
  line,
  isManual,
  heightCm,
  scaleEvidence,
  onReset,
  compact = false,
}: {
  line: HeightScaleLine | null;
  isManual: boolean;
  heightCm?: number;
  scaleEvidence?: ManualScaleEvidenceData | null;
  onReset: () => void;
  compact?: boolean;
}) {
  if (!line) return null;
  const activeSourceLabel = formatScaleSource(scaleEvidence?.source);
  const isMaskActive = !isManual && scaleEvidence?.source === "mask-height";
  const activeSpanPx = !isManual && heightCm && heightCm > 0 && scaleEvidence?.activeCmPerPx
    ? heightCm / scaleEvidence.activeCmPerPx
    : null;
  const activeTopY = activeSpanPx == null ? null : line.bottomY - activeSpanPx;
  return (
    <div data-testid="manual-height-scale-panel" className={`${compact ? "rounded-md p-2 text-[10px]" : "rounded-lg p-3 text-[11px]"} border border-yellow-200 bg-yellow-50 text-yellow-950`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Yellow height line · {isManual ? "active manual source" : isMaskActive ? "active mask source" : "inactive mask reference"}</div>
        {isManual ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-yellow-300 bg-white px-2 py-1 text-[10px] font-semibold text-yellow-900 hover:bg-yellow-100"
          >
            Clear manual override
          </button>
        ) : null}
      </div>
      <div className={`${compact ? "mt-1 grid-cols-2 gap-1" : "mt-2 gap-2 sm:grid-cols-2"} grid font-mono`}>
        <span className="rounded bg-white px-2 py-1">y {Math.round(line.topY)}-{Math.round(line.bottomY)}</span>
        <span className="rounded bg-white px-2 py-1">span {line.bodySpanPx.toFixed(1)}px</span>
        <span className="rounded bg-white px-2 py-1">height {heightCm == null ? "n/a" : `${heightCm.toFixed(1)}cm`}</span>
        <span className="rounded bg-white px-2 py-1">scale {line.cmPerPx == null ? "n/a" : `${line.cmPerPx.toFixed(5)} cm/px`}</span>
      </div>
      {!isManual && !isMaskActive && scaleEvidence ? (
        <div data-testid="manual-height-inactive-owner" className="mt-1 rounded border border-yellow-300 bg-white px-2 py-1 font-mono font-semibold text-yellow-950">
          Formula uses {activeSourceLabel} {scaleEvidence.activeCmPerPx.toFixed(5)} cm/px, not this yellow mask line.
          {activeSpanPx != null && activeTopY != null
            ? ` To reproduce that scale with ${heightCm?.toFixed(1)}cm and bottom y ${Math.round(line.bottomY)}, yellow needs span ${activeSpanPx.toFixed(1)}px and top y ${Math.round(activeTopY)}.`
            : ""}
        </div>
      ) : null}
    </div>
  );
}

function formatScaleSource(source?: ManualScaleEvidenceData["source"]): string {
  if (source === "vertical-tape") return "vertical tape";
  if (source === "manual-height") return "manual height";
  if (source === "mask-height") return "mask height";
  if (source === "pose-landmarks") return "pose landmarks";
  return "an unknown scale source";
}

function HeightScaleLineSvg({
  audit,
  manualOverride,
  heightCm,
  imageWidth,
  imageHeight,
  zoom,
  label,
  onHandleDragStart,
}: {
  audit: MaskHeightScaleAudit | null;
  manualOverride?: ManualHeightScaleOverride | null;
  heightCm?: number;
  imageWidth: number;
  imageHeight: number;
  label: string;
  zoom: number;
  onHandleDragStart?: (handle: HeightScaleHandle, event: SvgHandleDragEvent) => void;
}) {
  const line = buildHeightScaleLine(audit, manualOverride ?? null, imageWidth, imageHeight, heightCm);
  if (!line) return null;
  const viewScale = Math.max(zoom, 1);
  const strokeWidth = Math.max(3, imageWidth * 0.003) / viewScale;
  const hitRadius = Math.max(20, imageWidth * 0.018) / viewScale;
  const dotRadius = Math.max(4, imageWidth * 0.0035) / viewScale;
  const fontSize = Math.max(16, imageWidth * 0.014) / viewScale;
  const text = `${line.source === "manual" ? "manual height" : label} y ${Math.round(line.topY)}-${Math.round(line.bottomY)} · ${line.bodySpanPx.toFixed(0)}px`;
  const textWidth = text.length * fontSize * 0.58;
  const textX = clamp(line.centerX + (12 / viewScale), 4, Math.max(4, imageWidth - textWidth - (10 / viewScale)));
  const textY = clamp(line.topY + (24 / viewScale), fontSize + (6 / viewScale), imageHeight - (8 / viewScale));
  const handles: Array<{ key: HeightScaleHandle; y: number; label: string }> = [
    { key: "top", y: line.topY, label: "top height" },
    { key: "bottom", y: line.bottomY, label: "bottom height" },
  ];

  return (
    <g>
      <line
        x1={line.centerX}
        y1={line.topY}
        x2={line.centerX}
        y2={line.bottomY}
        stroke="#facc15"
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        strokeDasharray={`${10 / viewScale} ${8 / viewScale}`}
        pointerEvents="none"
      />
      <line x1={line.leftX} y1={line.topY} x2={line.rightX} y2={line.topY} stroke="#facc15" strokeWidth={strokeWidth} strokeLinecap="round" pointerEvents="none" />
      <line x1={line.leftX} y1={line.bottomY} x2={line.rightX} y2={line.bottomY} stroke="#facc15" strokeWidth={strokeWidth} strokeLinecap="round" pointerEvents="none" />
      {handles.map((handle) => (
        <g key={handle.key}>
          {onHandleDragStart ? (
            <circle
              data-testid={`manual-height-scale-${handle.key}`}
              aria-label={`Manual height scale ${handle.key} handle`}
              cx={line.centerX}
              cy={handle.y}
              r={hitRadius}
              fill="transparent"
              onPointerDown={(event) => onHandleDragStart(handle.key, event)}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              style={{ cursor: "grab", touchAction: "none" }}
            />
          ) : null}
          <circle
            cx={line.centerX}
            cy={handle.y}
            r={dotRadius}
            fill={line.source === "manual" ? "#facc15" : "rgba(250,204,21,0.45)"}
            stroke="rgba(0,0,0,0.75)"
            strokeWidth={Math.max(1, strokeWidth * 0.35)}
            pointerEvents="none"
          />
        </g>
      ))}
      <rect
        x={textX - (5 / viewScale)}
        y={textY - fontSize}
        width={textWidth + (10 / viewScale)}
        height={fontSize + (9 / viewScale)}
        fill="rgba(0,0,0,0.72)"
        rx={2 / viewScale}
        pointerEvents="none"
      />
      <text
        x={textX}
        y={textY}
        fill="#facc15"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize={fontSize}
        pointerEvents="none"
      >
        {text}
      </text>
    </g>
  );
}

function ManualGuideSvg({
  guide,
  measurement,
  imageWidth,
  imageHeight,
  zoom,
  labelSuffix,
  onHandleDragStart,
  onLineDragStart,
}: {
  guide: GeminiBodyGuide;
  measurement: GeminiGuideMeasurement | null;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  labelSuffix: string;
  onHandleDragStart: (target: { kind: GuideKind; pointIndex: number }, event: SvgHandleDragEvent) => void;
  onLineDragStart: (kind: GuideKind, event: SvgHandleDragEvent) => void;
}) {
  const viewScale = Math.max(zoom, 1);
  const lineWidth = Math.max(5, imageWidth * 0.005) / viewScale;
  const lineHitWidth = Math.max(34, imageWidth * 0.025) / viewScale;
  const hitRadius = Math.max(18, imageWidth * 0.018) / viewScale;
  const endpointRadius = Math.max(4, imageWidth * 0.0035) / viewScale;
  const fontSize = Math.max(18, Math.round(imageWidth * 0.018)) / viewScale;
  const labelPadX = 6 / viewScale;
  const labelPadY = 14 / viewScale;
  const labelHeight = 28 / viewScale;
  const labelOffsetX = 14 / viewScale;
  const labelOffsetY = 18 / viewScale;
  const edgePadding = 18 / viewScale;

  return (
    <>
      {GUIDE_ROWS.map((row) => {
        const line = normalizeLine(guide[row.kind], imageWidth, imageHeight);
        if (!line?.points?.length) return null;
        const measuredRow = measurement?.rows.find((candidate) => candidate.kind === row.kind) ?? null;
        const maskLine = measuredRow && measuredRow.maskLeftXNorm != null && measuredRow.maskRightXNorm != null && measuredRow.maskYNorm != null
          ? {
              y: measuredRow.maskYNorm * imageHeight,
              left: measuredRow.maskLeftXNorm * imageWidth,
              right: measuredRow.maskRightXNorm * imageWidth,
            }
          : null;
        const redPoints = line.points;
        const lastPoint = redPoints[redPoints.length - 1]!;
        const label = `${row.label} ${labelSuffix}`;
        const textWidth = label.length * fontSize * 0.62;
        const textX = clamp(
          lastPoint.x_px + labelOffsetX,
          0,
          Math.max(0, imageWidth - textWidth - (16 / viewScale)),
        );
        const textY = clamp(lastPoint.y_px - labelOffsetY, edgePadding, imageHeight - edgePadding);

        return (
          <g key={row.kind}>
            {maskLine ? (
              <g>
                <line
                  x1={maskLine.left}
                  y1={maskLine.y}
                  x2={maskLine.right}
                  y2={maskLine.y}
                  stroke="#0284c7"
                  strokeLinecap="round"
                  strokeWidth={Math.max(2, lineWidth * 0.75)}
                  strokeDasharray={`${8 / viewScale} ${7 / viewScale}`}
                />
                <line
                  x1={maskLine.left}
                  y1={maskLine.y - (12 / viewScale)}
                  x2={maskLine.left}
                  y2={maskLine.y + (12 / viewScale)}
                  stroke="#0284c7"
                  strokeWidth={Math.max(1.5, lineWidth * 0.35)}
                />
                <line
                  x1={maskLine.right}
                  y1={maskLine.y - (12 / viewScale)}
                  x2={maskLine.right}
                  y2={maskLine.y + (12 / viewScale)}
                  stroke="#0284c7"
                  strokeWidth={Math.max(1.5, lineWidth * 0.35)}
                />
              </g>
            ) : null}
            <polyline
              points={redPoints.map((point) => `${point.x_px},${point.y_px}`).join(" ")}
              fill="none"
              stroke="transparent"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={lineHitWidth}
              pointerEvents="stroke"
              onPointerDown={(event) => onLineDragStart(row.kind, event)}
              onMouseDown={(event) => onLineDragStart(row.kind, event)}
              style={{ cursor: "ew-resize", touchAction: "none" }}
            />
            <polyline
              points={redPoints.map((point) => `${point.x_px},${point.y_px}`).join(" ")}
              fill="none"
              stroke="#ef4444"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={lineWidth}
              pointerEvents="none"
            />
            {redPoints.map((point, index) => (
              <g key={`${row.kind}-${index}`}>
                <circle
                  cx={point.x_px}
                  cy={point.y_px}
                  r={hitRadius}
                  fill="transparent"
                  onPointerDown={(event) => onHandleDragStart({ kind: row.kind, pointIndex: index }, event)}
                  onMouseDown={(event) => onHandleDragStart({ kind: row.kind, pointIndex: index }, event)}
                  style={{ cursor: "grab", touchAction: "none" }}
                />
                <circle
                  cx={point.x_px}
                  cy={point.y_px}
                  r={endpointRadius}
                  fill="#ffffff"
                  stroke="#dc2626"
                  strokeWidth={Math.max(2, lineWidth * 0.45)}
                  pointerEvents="none"
                />
              </g>
            ))}
            <rect
              x={textX - labelPadX}
              y={textY - labelPadY}
              width={textWidth + (labelPadX * 2)}
              height={labelHeight}
              fill="rgba(255,255,255,0.88)"
              pointerEvents="none"
            />
            <text
              x={textX}
              y={textY}
              fill="#b91c1c"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize={fontSize}
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function findNearestHandle(
  guide: GeminiBodyGuide,
  point: { x: number; y: number },
  imageWidth: number,
  zoom: number,
): { kind: GuideKind; pointIndex: number } | null {
  const threshold = Math.max(28, imageWidth * 0.025) / Math.max(zoom, 1);
  let best: { kind: GuideKind; pointIndex: number; distance: number } | null = null;
  for (const row of GUIDE_ROWS) {
    const points = guide[row.kind]?.points ?? [];
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const candidate = points[pointIndex]!;
      const distance = Math.hypot(candidate.x_px - point.x, candidate.y_px - point.y);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { kind: row.kind, pointIndex, distance };
      }
    }
  }
  return best ? { kind: best.kind, pointIndex: best.pointIndex } : null;
}

function getImagePoint(event: SvgDragEvent): { x: number; y: number } {
  return getImagePointFromClient(event.currentTarget, event.clientX, event.clientY);
}

function getImagePointFromClient(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function buildInitialScaleProofRuler(
  imageWidth: number,
  imageHeight: number,
  sourceKey: string,
  preset?: ManualScaleProofPreset | null,
): ScaleProofRuler {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  if (preset && preset.sourceImageWidth > 0 && preset.sourceImageHeight > 0) {
    const scaleX = safeWidth / preset.sourceImageWidth;
    const scaleY = safeHeight / preset.sourceImageHeight;
    return {
      sourceKey,
      start: {
        x: clamp(preset.start.x * scaleX, 0, safeWidth - 1),
        y: clamp(preset.start.y * scaleY, 0, safeHeight - 1),
      },
      end: {
        x: clamp(preset.end.x * scaleX, 0, safeWidth - 1),
        y: clamp(preset.end.y * scaleY, 0, safeHeight - 1),
      },
      touchedStart: true,
      touchedEnd: true,
    };
  }
  const x = clamp(safeWidth * 0.53, 0, safeWidth - 1);
  const startY = clamp(safeHeight * 0.265, 0, safeHeight - 1);
  const endY = clamp(startY + Math.max(40, safeHeight * 0.05), 0, safeHeight - 1);
  return {
    sourceKey,
    start: { x, y: startY },
    end: { x, y: endY },
    touchedStart: false,
    touchedEnd: false,
  };
}

function buildInitialFreeRuler(
  imageWidth: number,
  imageHeight: number,
  sourceKey: string,
  tapeRuler: ScaleProofRuler,
): ScaleProofRuler {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  const offset = Math.max(36, safeWidth * 0.055);
  const minimumX = Math.min(tapeRuler.start.x, tapeRuler.end.x);
  const maximumX = Math.max(tapeRuler.start.x, tapeRuler.end.x);
  const preferredDeltaX = maximumX + offset <= safeWidth - 1 ? offset : -offset;
  const deltaX = clamp(preferredDeltaX, -minimumX, safeWidth - 1 - maximumX);
  return {
    sourceKey,
    start: {
      x: clamp(tapeRuler.start.x + deltaX, 0, safeWidth - 1),
      y: clamp(tapeRuler.start.y, 0, safeHeight - 1),
    },
    end: {
      x: clamp(tapeRuler.end.x + deltaX, 0, safeWidth - 1),
      y: clamp(tapeRuler.end.y, 0, safeHeight - 1),
    },
    touchedStart: true,
    touchedEnd: true,
  };
}

function buildRedLineProofStateKey(
  sourceKey: string,
  kind: RedLineVerticalProofKind,
  sourcePixelSpan: number,
): string {
  return `${sourceKey}:vertical-red-copy:${kind}:${sourcePixelSpan.toFixed(3)}`;
}

function buildInitialVerticalRedLineRuler(
  imageWidth: number,
  imageHeight: number,
  sourceKey: string,
  tapeRuler: ScaleProofRuler,
  sourcePixelSpan: number,
): ScaleProofRuler {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  const maximumSpan = Math.max(1, safeHeight - 1);
  const span = clamp(Number.isFinite(sourcePixelSpan) && sourcePixelSpan > 0 ? sourcePixelSpan : 1, 1, maximumSpan);
  const tapeCenterX = (tapeRuler.start.x + tapeRuler.end.x) / 2;
  const tapeCenterY = (tapeRuler.start.y + tapeRuler.end.y) / 2;
  const offsetX = Math.max(54, safeWidth * 0.075);
  const x = clamp(
    tapeCenterX + (tapeCenterX + offsetX <= safeWidth - 1 ? offsetX : -offsetX),
    0,
    safeWidth - 1,
  );
  let startY = tapeCenterY - (span / 2);
  let endY = tapeCenterY + (span / 2);
  if (startY < 0) {
    endY -= startY;
    startY = 0;
  }
  if (endY > safeHeight - 1) {
    const overflow = endY - (safeHeight - 1);
    startY -= overflow;
    endY = safeHeight - 1;
  }
  return {
    sourceKey,
    start: { x, y: clamp(startY, 0, safeHeight - 1) },
    end: { x, y: clamp(endY, 0, safeHeight - 1) },
    touchedStart: true,
    touchedEnd: true,
  };
}

function buildHeightScaleLine(
  audit: MaskHeightScaleAudit | null,
  manualOverride: ManualHeightScaleOverride | null,
  imageWidth: number,
  imageHeight: number,
  heightCm?: number,
): HeightScaleLine | null {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  if (manualOverride) {
    const topY = clamp(manualOverride.topYNorm * safeHeight, 0, safeHeight - 1);
    const bottomY = clamp(manualOverride.bottomYNorm * safeHeight, topY + 1, safeHeight);
    const centerX = clamp(manualOverride.centerXNorm * safeWidth, 0, safeWidth - 1);
    const tickHalfWidth = audit
      ? Math.max(36, ((audit.rightXNorm - audit.leftXNorm) * safeWidth) / 2)
      : Math.max(36, safeWidth * 0.06);
    const bodySpanPx = Math.abs(bottomY - topY);
    return {
      source: "manual",
      topY,
      bottomY,
      centerX,
      leftX: clamp(centerX - tickHalfWidth, 0, safeWidth - 1),
      rightX: clamp(centerX + tickHalfWidth, 0, safeWidth - 1),
      bodySpanPx,
      cmPerPx: heightCm && heightCm > 0 && bodySpanPx > 0 ? heightCm / bodySpanPx : null,
    };
  }
  if (!audit) return null;
  const topY = audit.topYNorm * safeHeight;
  const bottomY = audit.bottomYNorm * safeHeight;
  const bodySpanPx = Math.abs(bottomY - topY);
  return {
    source: "mask",
    topY,
    bottomY,
    centerX: audit.centerXNorm * safeWidth,
    leftX: audit.leftXNorm * safeWidth,
    rightX: audit.rightXNorm * safeWidth,
    bodySpanPx,
    cmPerPx: heightCm && heightCm > 0 && bodySpanPx > 0 ? heightCm / bodySpanPx : audit.cmPerPx,
  };
}

function rowLabel(kind: GuideKind): string {
  if (kind === "trouserWaist") return "trouser waist";
  return kind;
}

function handleLabel(pointIndex: number): string {
  return pointIndex === 0 ? "start" : "end";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
