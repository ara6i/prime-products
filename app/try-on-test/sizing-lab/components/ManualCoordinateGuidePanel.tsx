"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import type { GeminiBodyGuide, GeminiGuideDepthRatioOverrides, GeminiGuideLine, GeminiGuideMeasurement } from "../lib/geminiGuide";
import type { MaskHeightScaleAudit } from "../types";

type GuideKind = "waist" | "trouserWaist" | "hips";
type SvgDragEvent = React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>;
type SvgHandleDragEvent = React.PointerEvent<SVGCircleElement> | React.MouseEvent<SVGCircleElement>;
type WindowDragEvent = PointerEvent | MouseEvent;
type MeasurementMode = "circumference" | "side-depth";
type ScaleProofHandle = "start" | "end";
type HeightScaleHandle = "top" | "bottom";

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
  scaleEvidence?: ManualScaleEvidenceData | null;
  title?: string;
  labelSuffix?: string;
  measurementMode?: MeasurementMode;
  heightCm?: number;
  manualHeightScaleOverride?: ManualHeightScaleOverride | null;
  onManualHeightScaleOverrideChange?: (override: ManualHeightScaleOverride | null) => void;
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
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
  linkedEditor?: LinkedEditor | null;
  depthRatioOverrides?: GeminiGuideDepthRatioOverrides;
  onDepthRatioOverrideChange?: (kind: GuideKind, ratio: number | null) => void;
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

export function ManualCoordinateGuidePanel({
  imageUrl,
  imageWidth,
  imageHeight,
  guide,
  measurement,
  scaleEvidence,
  comparisonScaleEvidence,
  title = "Manual coordinate guide",
  description = "Drag the red start/end line by hand. Red endpoints own the active formula span; blue dashed visible-edge evidence is not used in calculation.",
  resetLabel = "Reset from mask rows",
  labelSuffix = "manual coordinate",
  measurementMode = "circumference",
  heightCm,
  manualHeightScaleOverride,
  onManualHeightScaleOverrideChange,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
  linkedEditor,
  depthRatioOverrides,
  onDepthRatioOverrideChange,
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
  const heightScaleDragRef = useRef<HeightScaleHandle | null>(null);
  const normalizedGuideRef = useRef<GeminiBodyGuide | null>(null);
  const linkedNormalizedGuideRef = useRef<GeminiBodyGuide | null>(null);
  const removeWindowDragRef = useRef<(() => void) | null>(null);
  const removeLinkedWindowDragRef = useRef<(() => void) | null>(null);
  const removeScaleProofWindowDragRef = useRef<(() => void) | null>(null);
  const removeHeightScaleWindowDragRef = useRef<(() => void) | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [linkedHoverLabel, setLinkedHoverLabel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  const [scaleProofRulerState, setScaleProofRuler] = useState<ScaleProofRuler>(() => buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey));
  const scaleProofRuler = scaleProofRulerState.sourceKey === scaleProofSourceKey
    ? scaleProofRulerState
    : buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey);
  const [scaleProofStartCm, setScaleProofStartCm] = useState(10);
  const [scaleProofEndCm, setScaleProofEndCm] = useState(20);
  const normalizedGuide = useMemo(
    () => normalizeGuide(guide, imageWidth, imageHeight),
    [guide, imageWidth, imageHeight],
  );
  const linkedNormalizedGuide = useMemo(
    () => normalizeGuide(linkedEditor?.guide ?? null, linkedEditor?.imageWidth ?? 0, linkedEditor?.imageHeight ?? 0),
    [linkedEditor?.guide, linkedEditor?.imageWidth, linkedEditor?.imageHeight],
  );

  useEffect(() => () => {
    removeWindowDragRef.current?.();
    removeLinkedWindowDragRef.current?.();
    removeScaleProofWindowDragRef.current?.();
    removeHeightScaleWindowDragRef.current?.();
    removeWindowDragRef.current = null;
    removeLinkedWindowDragRef.current = null;
    removeScaleProofWindowDragRef.current = null;
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
      if (event.key === "Escape") setIsFullscreen(false);
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
          : buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey);
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
    setScaleProofRuler(buildInitialScaleProofRuler(imageWidth, imageHeight, scaleProofSourceKey));
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
            />
          ) : null}
          <ScaleProofRulerSvg
            ruler={scaleProofRuler}
            startCm={scaleProofStartCm}
            endCm={scaleProofEndCm}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            zoom={zoom}
            onHandleDragStart={startScaleProofHandleDrag}
          />
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
          Run Analyze once to seed manual waist, trouser-waist, and hip rows.
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
            <span>Drag handles: start and end only. Scroll while zoomed.</span>
            {hoverLabel ? <span className="font-mono font-semibold">{hoverLabel}</span> : null}
          </div>
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
          <ScaleProofPanel
            ruler={scaleProofRuler}
            startCm={scaleProofStartCm}
            endCm={scaleProofEndCm}
            scaleEvidence={scaleEvidence}
            formulaActiveCmPerPx={measurement?.activeCmPerPx ?? null}
            heightCm={heightCm}
            heightScaleLine={heightScaleLine}
            onStartCmChange={setScaleProofStartCm}
            onEndCmChange={setScaleProofEndCm}
            onReset={resetScaleProofRuler}
          />
          {measurement ? <ManualMeasurementTable measurement={measurement} /> : null}
          {isFullscreen ? (
            <div className="fixed inset-0 z-[100] bg-slate-950 text-white">
              <div className="grid h-screen min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
                <section className="flex min-h-0 flex-col gap-3 p-4">
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
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
                  {renderZoomControls(false)}
                  {linkedEditorReady ? (
                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-2">
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
                  ) : renderImageViewport("fullscreen")}
                </section>
                <aside className="min-h-0 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white p-3 text-text-primary">
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
                  <ScaleProofPanel
                    ruler={scaleProofRuler}
                    startCm={scaleProofStartCm}
                    endCm={scaleProofEndCm}
                    scaleEvidence={scaleEvidence}
                    formulaActiveCmPerPx={measurement?.activeCmPerPx ?? null}
                    heightCm={heightCm}
                    heightScaleLine={heightScaleLine}
                    onStartCmChange={setScaleProofStartCm}
                    onEndCmChange={setScaleProofEndCm}
                    onReset={resetScaleProofRuler}
                    compact
                  />
                  <ManualRealtimePanel
                    measurement={measurement}
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
                </aside>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ScaleProofPanel({
  ruler,
  startCm,
  endCm,
  scaleEvidence,
  formulaActiveCmPerPx,
  heightCm,
  heightScaleLine,
  onStartCmChange,
  onEndCmChange,
  onReset,
  compact = false,
}: {
  ruler: ScaleProofRuler;
  startCm: number;
  endCm: number;
  scaleEvidence?: ManualScaleEvidenceData | null;
  formulaActiveCmPerPx?: number | null;
  heightCm?: number;
  heightScaleLine?: HeightScaleLine | null;
  onStartCmChange: (value: number) => void;
  onEndCmChange: (value: number) => void;
  onReset: () => void;
  compact?: boolean;
}) {
  const expectedCm = Math.abs(endCm - startCm);
  const deltaXPx = ruler.end.x - ruler.start.x;
  const deltaYPx = ruler.end.y - ruler.start.y;
  const pixelSpan = Math.hypot(deltaXPx, deltaYPx);
  const activeCmPerPx = formulaActiveCmPerPx && formulaActiveCmPerPx > 0
    ? formulaActiveCmPerPx
    : scaleEvidence?.activeCmPerPx ?? null;
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
  const impliedCmPerPx = ready ? expectedCm / pixelSpan : null;
  const errorCm = measuredCm == null ? null : measuredCm - expectedCm;
  const errorPct = errorCm == null || expectedCm <= 0 ? null : (errorCm / expectedCm) * 100;
  const absoluteErrorPct = errorPct == null ? null : Math.abs(errorPct);
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
              : { label: "FAIL · SCALE OR PLACEMENT MISMATCH", className: "border-red-300 bg-red-50 text-red-800" };
  const setFiniteValue = (value: string, setter: (next: number) => void) => {
    const next = Number(value);
    if (Number.isFinite(next)) setter(next);
  };

  return (
    <div
      data-testid="scale-proof-panel"
      className={`${compact ? "mb-3 rounded-md p-2 text-[10px]" : "rounded-lg p-3 text-[11px]"} border border-emerald-200 bg-emerald-50 text-emerald-950`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">Independent tape interval proof</div>
          <p className={`${compact ? "mt-0.5" : "mt-1"} leading-relaxed text-emerald-900`}>
            Drag the two green crosshairs to exact tape marks. This reads the active cm/px; it does not change or recalibrate it.
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
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Start tape mark</span>
          <input
            type="number"
            step="0.1"
            value={startCm}
            onChange={(event) => setFiniteValue(event.currentTarget.value, onStartCmChange)}
            aria-label="Scale proof start tape mark"
            className="mt-1 w-full rounded border border-emerald-200 px-2 py-1 font-mono text-xs text-text-primary"
          />
        </label>
        <label className="rounded bg-white px-2 py-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-700">End tape mark</span>
          <input
            type="number"
            step="0.1"
            value={endCm}
            onChange={(event) => setFiniteValue(event.currentTarget.value, onEndCmChange)}
            aria-label="Scale proof end tape mark"
            className="mt-1 w-full rounded border border-emerald-200 px-2 py-1 font-mono text-xs text-text-primary"
          />
        </label>
      </div>
      <div data-testid="manual-scale-proof-readout" className={`${compact ? "mt-2 gap-1" : "mt-3 gap-2"} grid grid-cols-2 font-mono`}>
        <span className="rounded bg-white px-2 py-1">Expected: {expectedCm.toFixed(3)} cm</span>
        <span className="rounded bg-white px-2 py-1">Pixel span: {hasTwoHandles ? `${pixelSpan.toFixed(2)} px` : "n/a"}</span>
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
      </div>
      <div aria-live="polite" className={`${compact ? "mt-2" : "mt-3"} rounded border px-2 py-1 text-center font-semibold ${status.className}`}>
        {status.label}
      </div>
      {proofRequiredHeightSpanPx != null && proofRequiredTopY != null ? (
        <div data-testid="scale-proof-height-equivalent" className="mt-1 rounded border border-emerald-200 bg-white px-2 py-1 font-mono text-emerald-950">
          Green interval scale would require {proofRequiredHeightSpanPx.toFixed(1)}px for {heightCm?.toFixed(1)}cm; with bottom y {Math.round(heightScaleLine?.bottomY ?? 0)}, yellow top would be y {Math.round(proofRequiredTopY)}.
        </div>
      ) : null}
      <p className={`${compact ? "mt-1" : "mt-2"} font-semibold leading-relaxed text-emerald-900`}>
        Green error compares this tape interval with the active formula scale. It is not the yellow-line versus mask difference.
      </p>
      {scaleDisplayDeltaPct != null && Math.abs(scaleDisplayDeltaPct) > 0.01 ? (
        <p className="mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-800">
          Warning: formula scale and displayed scale differ by {scaleDisplayDeltaPct > 0 ? "+" : ""}{scaleDisplayDeltaPct.toFixed(2)}%.
        </p>
      ) : null}
      <p className={`${compact ? "mt-1" : "mt-2"} leading-relaxed text-emerald-800`}>
        For an independent check, use tape marks outside the anchors that set the active scale. On the Nadia sample, 10→20 is independent of the 42→64 calibration anchors.
      </p>
    </div>
  );
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

function ManualRealtimePanel({
  measurement,
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
            Run Analyze once to see live manual numbers.
          </div>
        )}
      </div>
      {measurement && !compact ? <ManualMeasurementTable measurement={measurement} /> : null}
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
          Active front scale: {measurement.activeCmPerPx.toFixed(5)} cm/px
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
  const canOverrideRatio = measurementMode === "circumference" && Boolean(changeDepthRatio);
  const displayCm = measurementMode === "side-depth" ? row.formulaWidthCm : row.guidedCm;
  const targetAccuracyPct = targetCm && targetCm > 0
    ? clamp(100 - (Math.abs(displayCm - targetCm) / targetCm) * 100, 0, 100)
    : null;
  const looseEdge = row.edgeTrust === "loose-clothing-untrusted";

  return (
    <div className={`${compact ? "rounded-md p-2" : "rounded-lg p-3"} border border-gray-200 bg-white shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`${compact ? "text-[10px]" : "text-xs"} font-semibold uppercase tracking-wider text-text-hint`}>{title}</div>
          <div className={`${compact ? "mt-0 text-lg" : "mt-1 text-2xl"} font-bold text-brand-blue`}>{(displayCm / 2.54).toFixed(1)} in</div>
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
            <MiniStat label="Formula ratio" value={row.baseDepthRatio.toFixed(3)} />
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
            override {overrideValue == null ? "off" : overrideValue.toFixed(3)} · allowed {bounds.min.toFixed(2)}-{bounds.max.toFixed(2)}
          </div>
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
    </div>
  );
}

function rowDepthRatioBounds(kind: GuideKind): { min: number; max: number } {
  if (kind === "trouserWaist") return { min: 0.35, max: 1.1 };
  if (kind === "hips") return { min: 0.35, max: 0.9 };
  return { min: 0.35, max: 0.8 };
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
  if (source === "visible-mask-edge") return "visible edge evidence";
  if (source === "loose-clothing-untrusted") return "loose/untrusted";
  if (source === "fallback") return "fallback";
  return "model red edge";
}

function formatWidthSource(source: GeminiGuideMeasurement["rows"][number]["formulaWidthSource"]): string {
  if (source === "manual-coordinates") return "manual red endpoints";
  if (source === "gemini-red-line") return "red-pixel line";
  if (source === "gemini-json-endpoints") return "Gemini JSON endpoints";
  if (source === "fallback-line") return "fallback endpoints";
  return source;
}

function formatSignedCmIn(valueCm: number): string {
  const sign = valueCm > 0 ? "+" : "";
  return `${sign}${valueCm.toFixed(1)} cm / ${sign}${(valueCm / 2.54).toFixed(1)} in`;
}

function ManualMeasurementTable({ measurement }: { measurement: GeminiGuideMeasurement }) {
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
            <th className="px-2 py-2 font-semibold">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-red-100 font-mono text-text-primary">
          {measurement.rows.map((row) => (
            <tr key={row.kind}>
              <td className="px-2 py-2 font-sans text-text-secondary">{row.kind}</td>
              <td className="px-2 py-2">{row.yPx}</td>
              <td className="px-2 py-2">{row.leftXPx}</td>
              <td className="px-2 py-2">{row.rightXPx}</td>
              <td className="px-2 py-2">{row.formulaWidthCm.toFixed(1)} cm</td>
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
              <td className="px-2 py-2">{row.guidedCm.toFixed(1)} cm</td>
            </tr>
          ))}
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
  ruler,
  startCm,
  endCm,
  imageWidth,
  imageHeight,
  zoom,
  onHandleDragStart,
}: {
  ruler: ScaleProofRuler;
  startCm: number;
  endCm: number;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  onHandleDragStart: (handle: ScaleProofHandle, event: SvgHandleDragEvent) => void;
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
  const lineLabel = `scale proof ${startCm}→${endCm} cm`;
  const lineLabelWidth = lineLabel.length * fontSize * 0.61;
  const lineLabelX = clamp(midpoint.x + (16 / viewScale), 4, Math.max(4, imageWidth - lineLabelWidth - 10));
  const lineLabelY = clamp(midpoint.y, fontSize + 8, imageHeight - 8);
  const handles: Array<{ key: ScaleProofHandle; point: ScaleProofPoint; label: string }> = [
    { key: "start", point: ruler.start, label: `${startCm} cm` },
    { key: "end", point: ruler.end, label: `${endCm} cm` },
  ];

  return (
    <g>
      <line
        x1={ruler.start.x}
        y1={ruler.start.y}
        x2={ruler.end.x}
        y2={ruler.end.y}
        stroke="#10b981"
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
        fill="rgba(6,78,59,0.86)"
        pointerEvents="none"
      />
      <text
        x={lineLabelX}
        y={lineLabelY}
        fill="#d1fae5"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize={fontSize}
        pointerEvents="none"
      >
        {lineLabel}
      </text>
      {handles.map(({ key, point, label }) => (
        <g key={key}>
          <circle
            data-scale-proof-handle={key}
            data-testid={`manual-scale-proof-${key}`}
            aria-label={`Scale proof ${key} handle`}
            cx={point.x}
            cy={point.y}
            r={hitRadius}
            fill="transparent"
            onPointerDown={(event) => onHandleDragStart(key, event)}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{ cursor: "grab", touchAction: "none" }}
          />
          <line
            x1={point.x - crossRadius}
            y1={point.y}
            x2={point.x - crossGap}
            y2={point.y}
            stroke="#ecfdf5"
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <line
            x1={point.x + crossGap}
            y1={point.y}
            x2={point.x + crossRadius}
            y2={point.y}
            stroke="#ecfdf5"
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <line
            x1={point.x}
            y1={point.y - crossRadius}
            x2={point.x}
            y2={point.y - crossGap}
            stroke="#ecfdf5"
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <line
            x1={point.x}
            y1={point.y + crossGap}
            x2={point.x}
            y2={point.y + crossRadius}
            stroke="#ecfdf5"
            strokeWidth={Math.max(1, lineWidth * 0.35)}
            pointerEvents="none"
          />
          <text
            x={clamp(point.x + crossRadius + (4 / viewScale), 4, imageWidth - (label.length * fontSize * 0.6) - 6)}
            y={clamp(point.y - crossRadius, fontSize + 4, imageHeight - 6)}
            fill="#a7f3d0"
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
}: {
  guide: GeminiBodyGuide;
  measurement: GeminiGuideMeasurement | null;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  labelSuffix: string;
  onHandleDragStart: (target: { kind: GuideKind; pointIndex: number }, event: SvgHandleDragEvent) => void;
}) {
  const viewScale = Math.max(zoom, 1);
  const lineWidth = Math.max(5, imageWidth * 0.005) / viewScale;
  const hitRadius = Math.max(18, imageWidth * 0.018) / viewScale;
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
              stroke="#ef4444"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={lineWidth}
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
              </g>
            ))}
            <rect
              x={textX - labelPadX}
              y={textY - labelPadY}
              width={textWidth + (labelPadX * 2)}
              height={labelHeight}
              fill="rgba(255,255,255,0.88)"
            />
            <text
              x={textX}
              y={textY}
              fill="#b91c1c"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize={fontSize}
              dominantBaseline="middle"
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

function buildInitialScaleProofRuler(imageWidth: number, imageHeight: number, sourceKey: string): ScaleProofRuler {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
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
