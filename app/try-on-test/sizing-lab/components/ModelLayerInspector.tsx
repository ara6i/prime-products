"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { AppleVisionBodyScaleResult } from "../lib/appleVisionBodyScale";

type Layer = "photo" | "apple" | "tape" | "depth";

interface Point {
  x: number;
  y: number;
}

interface Props {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  appleResult: AppleVisionBodyScaleResult | null;
  tapePoints: Point[];
  tapePathEvidence: "colour-mask" | "ocr-position-only" | null;
  tapeGeometryMode: "rigid-line-fallback" | "piecewise-depth-curve" | null;
  depthPreviewDataUrl: string | null;
  depthPreviewNearM: number | null;
  depthPreviewFarM: number | null;
  depthStatus: "idle" | "loading" | "ready" | "error";
}

const SKELETON_CONNECTIONS = [
  ["human_top_head_3D", "human_center_head_3D"],
  ["human_center_head_3D", "human_center_shoulder_3D"],
  ["human_center_shoulder_3D", "human_spine_3D"],
  ["human_spine_3D", "human_root_3D"],
  ["human_center_shoulder_3D", "human_left_shoulder_3D"],
  ["human_left_shoulder_3D", "human_left_elbow_3D"],
  ["human_left_elbow_3D", "human_left_wrist_3D"],
  ["human_center_shoulder_3D", "human_right_shoulder_3D"],
  ["human_right_shoulder_3D", "human_right_elbow_3D"],
  ["human_right_elbow_3D", "human_right_wrist_3D"],
  ["human_root_3D", "human_left_hip_3D"],
  ["human_left_hip_3D", "human_left_knee_3D"],
  ["human_left_knee_3D", "human_left_ankle_3D"],
  ["human_root_3D", "human_right_hip_3D"],
  ["human_right_hip_3D", "human_right_knee_3D"],
  ["human_right_knee_3D", "human_right_ankle_3D"],
] as const;

const LAYERS: Array<{ id: Layer; label: string }> = [
  { id: "photo", label: "Photo" },
  { id: "apple", label: "Apple body" },
  { id: "tape", label: "Tape locator" },
  { id: "depth", label: "Depth Pro" },
];

export function ModelLayerInspector({
  imageUrl,
  imageWidth,
  imageHeight,
  appleResult,
  tapePoints,
  tapePathEvidence,
  tapeGeometryMode,
  depthPreviewDataUrl,
  depthPreviewNearM,
  depthPreviewFarM,
  depthStatus,
}: Props) {
  const [layer, setLayer] = useState<Layer>("apple");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const jointsByName = useMemo(() => new Map(
    (appleResult?.joints ?? [])
      .filter((joint) => Number.isFinite(joint.xPx) && Number.isFinite(joint.yPx))
      .map((joint) => [joint.name, joint]),
  ), [appleResult]);
  const orderedTapePoints = useMemo(() => tapePoints
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .slice()
    .sort((left, right) => left.y - right.y), [tapePoints]);
  const source = layer === "depth" && depthPreviewDataUrl ? depthPreviewDataUrl : imageUrl;
  const status = layer === "apple"
    ? appleResult
      ? "Apple Vision found 17 body joints. It did not create a tape mask."
      : "Waiting for Apple Vision body joints."
    : layer === "tape"
      ? orderedTapePoints.length
        ? tapePathEvidence === "ocr-position-only"
          ? "Orange is OCR box position geometry. It is not Depth Pro and it is not an Apple body/tape separation."
          : "Orange is the separate colour/tape locator. It is not Depth Pro."
        : "Waiting for the separate tape locator."
      : layer === "depth"
        ? depthPreviewDataUrl
          ? "Depth Pro shows distance per pixel. It does not label tape versus body."
          : depthStatus === "loading"
            ? "Depth Pro is building the depth map."
            : "No Depth Pro preview is available yet."
        : "Original photo with no model overlay.";

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setIsFullscreen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFullscreen]);

  if (!imageUrl || !source || imageWidth <= 0 || imageHeight <= 0) return null;

  return (
    <div data-testid="model-layer-inspector" className="space-y-2">
      <LayerTabs layer={layer} onChange={setLayer} />
      <LayerImage
        layer={layer}
        source={source}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        jointsByName={jointsByName}
        orderedTapePoints={orderedTapePoints}
        depthPreviewNearM={depthPreviewNearM}
        depthPreviewFarM={depthPreviewFarM}
        onOpenFullscreen={() => setIsFullscreen(true)}
      />
      <p className="text-[11px] leading-4 text-slate-600">{status}</p>
      <p className={`rounded-md px-2 py-1.5 text-[11px] leading-4 ${tapeGeometryMode === "piecewise-depth-curve"
        ? "bg-emerald-50 text-emerald-900"
        : "bg-amber-50 text-amber-900"}`}>
        {tapeGeometryMode === "piecewise-depth-curve"
          ? "Curved 3D path active: Depth Pro samples many connected points down the tape and adds the small 3D sections. Printed values are still excluded."
          : tapeGeometryMode === "rigid-line-fallback"
            ? "Rigid fallback active: the local thin-tape depth was not trustworthy enough for a curve, so the model uses the validated straight 3D line and reports that mode."
            : "Waiting to decide whether the tape has a trustworthy curved 3D path or needs the rigid-line fallback."}
      </p>
      {isFullscreen ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen model layer"
          data-testid="model-layer-fullscreen-dialog"
          className="fixed inset-0 z-[200] flex flex-col bg-slate-950"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-slate-950 px-3 py-2">
            <LayerTabs layer={layer} onChange={setLayer} fullscreen />
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="rounded-md border border-white/30 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              aria-label="Close full-screen model layer"
            >
              Close
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2">
            <LayerImage
              fullscreen
              layer={layer}
              source={source}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              jointsByName={jointsByName}
              orderedTapePoints={orderedTapePoints}
              depthPreviewNearM={depthPreviewNearM}
              depthPreviewFarM={depthPreviewFarM}
            />
          </div>
          <div className="border-t border-white/15 bg-slate-950 px-3 py-2 text-center text-xs text-slate-200">
            {status} · Press Escape to close.
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function LayerTabs({
  layer,
  onChange,
  fullscreen = false,
}: {
  layer: Layer;
  onChange: (layer: Layer) => void;
  fullscreen?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={fullscreen ? "Full-screen model layer" : "Model layer"}>
      {LAYERS.map((item) => (
        <button
          key={`${fullscreen ? "fullscreen-" : ""}${item.id}`}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={layer === item.id}
          className={fullscreen
            ? `rounded-md border px-2.5 py-1.5 text-xs font-medium ${layer === item.id
              ? "border-white bg-white text-slate-950"
              : "border-white/25 bg-slate-900 text-white hover:bg-slate-800"}`
            : `rounded-md border px-2 py-1 text-[11px] font-medium transition ${layer === item.id
              ? "border-slate-700 bg-slate-800 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function LayerImage({
  layer,
  source,
  imageWidth,
  imageHeight,
  jointsByName,
  orderedTapePoints,
  depthPreviewNearM,
  depthPreviewFarM,
  fullscreen = false,
  onOpenFullscreen,
}: {
  layer: Layer;
  source: string;
  imageWidth: number;
  imageHeight: number;
  jointsByName: Map<string, AppleVisionBodyScaleResult["joints"][number]>;
  orderedTapePoints: Point[];
  depthPreviewNearM: number | null;
  depthPreviewFarM: number | null;
  fullscreen?: boolean;
  onOpenFullscreen?: () => void;
}) {
  return (
    <div className={`relative overflow-hidden bg-black ${fullscreen
      ? "inline-block max-h-full max-w-full"
      : "rounded-lg border border-slate-200"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        alt={layer === "depth" ? "Depth Pro grayscale distance map" : "Model layer source"}
        className={fullscreen
          ? "block max-h-[calc(100vh-7.5rem)] max-w-[calc(100vw-1rem)] object-contain"
          : "block h-auto w-full"}
        draggable={false}
      />
      {layer === "apple" ? (
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-label="Apple Vision projected body joints"
        >
          {SKELETON_CONNECTIONS.map(([from, to]) => {
            const start = jointsByName.get(from);
            const end = jointsByName.get(to);
            if (!start || !end) return null;
            return (
              <line
                key={`${from}-${to}`}
                x1={start.xPx}
                y1={start.yPx}
                x2={end.xPx}
                y2={end.yPx}
                vectorEffect="non-scaling-stroke"
                className="stroke-cyan-300"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
          {[...jointsByName.values()].map((joint) => (
            <circle
              key={joint.name}
              cx={joint.xPx}
              cy={joint.yPx}
              r={Math.max(9, imageWidth * 0.004)}
              className="fill-cyan-300 stroke-slate-950"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      ) : null}
      {layer === "tape" && orderedTapePoints.length ? (
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-label="Separate tape locator coordinates"
        >
          <polyline
            points={orderedTapePoints.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            className="stroke-orange-400"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {orderedTapePoints.map((point, index) => (
            <circle
              key={`${Math.round(point.y)}-${index}`}
              cx={point.x}
              cy={point.y}
              r={Math.max(7, imageWidth * 0.003)}
              className="fill-orange-400 stroke-slate-950"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      ) : null}
      <div className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-medium text-white">
        {layer === "apple"
          ? "Apple: body joints only"
          : layer === "tape"
            ? "Orange: separate tape locator"
            : layer === "depth"
              ? depthPreviewNearM != null && depthPreviewFarM != null
                ? `Depth: ${depthPreviewNearM.toFixed(2)}–${depthPreviewFarM.toFixed(2)} m`
                : "Depth: distance field"
              : "Original photo"}
      </div>
      {!fullscreen && onOpenFullscreen ? (
        <button
          type="button"
          onClick={onOpenFullscreen}
          className="absolute right-2 top-2 rounded-md border border-white/30 bg-slate-950/85 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-900"
        >
          Full screen
        </button>
      ) : null}
    </div>
  );
}
