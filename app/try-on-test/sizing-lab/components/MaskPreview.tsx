"use client";

import { useEffect, useRef, useState } from "react";
import type { MeasurementDebugRow, MeasurementMaskMode, PoseResult, WaistTrace } from "../types";
import { createMeasurementMask } from "../lib/bodyMaskGeometry";

interface Props {
  pose: PoseResult | null;
  trace: WaistTrace | null;
  mode?: "front" | "side";
  maskMode?: MeasurementMaskMode;
  debugRows?: MeasurementDebugRow[];
  showTraceRows?: boolean;
  debugRowsLabel?: string;
}

const EMPTY_DEBUG_ROWS: MeasurementDebugRow[] = [];

/**
 * Renders the raw MediaPipe segmentation mask as a B/W image.
 * Overlays two horizontal lines so the user can SEE where the
 * scan measured:
 *  - YELLOW = natural waist row (narrowest central torso)
 *  - BLUE   = trouser-waist row (lower debug row)
 * Width of the line = the measured edges (left, right) of the mask
 * at that row.
 */
export function MaskPreview({
  pose,
  trace,
  mode = "front",
  maskMode = "raw",
  debugRows = EMPTY_DEBUG_ROWS,
  showTraceRows = true,
  debugRowsLabel = "selected hip row",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pose?.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) {
      queueMicrotask(() => setDataUrl(null));
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = pose.maskWidth;
    canvas.height = pose.maskHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayMask = createMeasurementMask(pose, pose.maskWidth, pose.maskHeight, maskMode);
    if (!displayMask) {
      queueMicrotask(() => setDataUrl(null));
      return;
    }

    // Mask as B/W
    const imgData = ctx.createImageData(pose.maskWidth, pose.maskHeight);
    for (let i = 0; i < displayMask.length; i++) {
      const v = displayMask[i]!;
      const o = i * 4;
      imgData.data[o] = v;
      imgData.data[o + 1] = v;
      imgData.data[o + 2] = v;
      imgData.data[o + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const stroke = Math.max(3, pose.maskWidth * 0.005);
    const drawLine = (
        yNorm: number | undefined,
        leftNorm: number | undefined,
        rightNorm: number | undefined,
        color: string,
        label: string,
        labelOffset = 0,
        dashed = false,
        selected = false,
        showLabel = true,
      ) => {
        if (yNorm == null || leftNorm == null || rightNorm == null) return;
        const y = yNorm * pose.maskHeight + labelOffset;
        const lx = leftNorm * pose.maskWidth;
        const rx = rightNorm * pose.maskWidth;
        ctx.strokeStyle = color;
        ctx.lineWidth = selected ? stroke * 1.7 : stroke;
        ctx.setLineDash(dashed ? [stroke * 3, stroke * 2] : []);
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.stroke();
        ctx.setLineDash([]);
        // End caps
        ctx.beginPath();
        ctx.moveTo(lx, y - stroke * 3);
        ctx.lineTo(lx, y + stroke * 3);
        ctx.moveTo(rx, y - stroke * 3);
        ctx.lineTo(rx, y + stroke * 3);
        ctx.stroke();
        if (showLabel) {
          ctx.fillStyle = color;
          ctx.font = `bold ${Math.max(14, pose.maskWidth * 0.025)}px ui-monospace, monospace`;
          ctx.textBaseline = "bottom";
          ctx.fillText(label, lx + stroke, y - stroke * 4);
        }
      };

    // Overlay measurement lines
    if (showTraceRows && trace) {

      const natural = mode === "side"
        ? {
            y: trace.sideNaturalWaistYNorm,
            left: trace.sideNaturalWaistLeftXNorm,
            right: trace.sideNaturalWaistRightXNorm,
            label: `side waist depth (${trace.sideNaturalWaistDepthCm} cm)`,
          }
        : {
            y: trace.naturalWaistYNorm,
            left: trace.naturalWaistLeftXNorm,
            right: trace.naturalWaistRightXNorm,
            label: `natural waist (${trace.naturalWaistMaskWidthCm} cm)`,
          };
      const trouser = mode === "side"
        ? {
            y: trace.sideTrouserWaistYNorm,
            left: trace.sideTrouserWaistLeftXNorm,
            right: trace.sideTrouserWaistRightXNorm,
            label: `side trouser depth (${trace.sideTrouserWaistDepthCm} cm)`,
          }
        : {
            y: trace.trouserWaistYNorm,
            left: trace.trouserWaistLeftXNorm,
            right: trace.trouserWaistRightXNorm,
            label: `trouser waist (${trace.trouserWaistMaskWidthCm} cm)`,
          };

      const sameWaistRow =
        natural.y != null &&
        trouser.y != null &&
        Math.abs(natural.y - trouser.y) * pose.maskHeight < stroke * 2;

      if (sameWaistRow) {
        drawLine(
          natural.y,
          natural.left,
          natural.right,
          "#facc15",
          natural.label,
          -stroke * 5,
        );
        drawLine(
          trouser.y,
          trouser.left,
          trouser.right,
          "#3b82f6",
          mode === "side" ? `side trouser same row (${trace.sideTrouserWaistDepthCm} cm)` : `trouser same row (${trace.trouserWaistMaskWidthCm} cm)`,
          stroke * 5,
        );
      } else {
        drawLine(
          natural.y,
          natural.left,
          natural.right,
          "#facc15",  // yellow
          natural.label,
        );
        drawLine(
          trouser.y,
          trouser.left,
          trouser.right,
          "#3b82f6",  // blue
          trouser.label,
        );
      }
    }

    if (debugRows.length) {
      debugRows.forEach((row) => {
        drawLine(
          row.yNorm,
          row.leftXNorm,
          row.rightXNorm,
          row.color,
          row.widthCm ? `${row.label} (${row.widthCm.toFixed(1)} cm)` : row.label,
          0,
          row.dashed,
          row.selected,
          mode === "side" || row.id.startsWith("mask-guide"),
        );
      });
    }

    try {
      const nextDataUrl = canvas.toDataURL("image/png");
      queueMicrotask(() => setDataUrl(nextDataUrl));
    } catch {
      /* canvas may be tainted */
    }
    // `mode` is fixed per component instance (front or side). Keep this
    // dependency array stable across Fast Refresh; changing its length triggers
    // React's "final argument changed size" warning in this lab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose, trace, maskMode, debugRows]);

  const sourceLabel = pose?.maskSource === "segmenter-multiclass"
    ? " · Segmenter body/clothes"
    : maskMode === "ignore-arms"
      ? " · raw mask, cleaned rows"
      : " · raw";
  const hasHipScanRows = mode === "front" && debugRows.some((row) => row.id.startsWith("hip-scan-candidate"));
  const hasGeminiGuideRows = mode === "front" && debugRows.some((row) => row.id.startsWith("gemini-guide"));
  const hasFallbackGuideRows = mode === "front" && debugRows.some((row) => row.id.startsWith("fallback-guide"));
  const hasMaskGuideRows = mode === "front" && debugRows.some((row) => row.id.startsWith("mask-guide"));
  const hasSideHipRows = mode === "side" && debugRows.some((row) => row.id === "side-hip-depth");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          {mode === "side" ? "Side segmentation mask" : "Segmentation mask"}
          {sourceLabel}
          {pose?.mask ? ` (${pose.maskWidth} × ${pose.maskHeight})` : ""}
        </h3>
        {dataUrl && (
          <a href={dataUrl} download="mediapipe-mask.png" className="text-xs text-brand-blue hover:underline">
            Download PNG
          </a>
        )}
      </div>
      {!pose?.mask ? (
        <p className="text-sm text-text-secondary">No mask yet — run Analyze.</p>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              background: "#000",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              imageRendering: "pixelated",
            }}
          />
          {(showTraceRows && trace) || debugRows.length ? (
            <div className="flex flex-wrap items-center gap-3 text-[11px] mt-2 text-text-secondary">
              {showTraceRows && trace ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-1 bg-yellow-400 rounded-sm" />
                    natural waist row
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-1 bg-blue-500 rounded-sm" />
                    trouser-waist row
                  </span>
                </>
              ) : null}
              {debugRows.length ? (
                <>
                  {hasHipScanRows ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-3 h-1 rounded-sm bg-slate-400" />
                      hip scan candidate rows
                    </span>
                  ) : null}
                  {hasGeminiGuideRows ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1 w-3 rounded-sm bg-red-500" />
                      Coordinate guide row width
                    </span>
                  ) : hasMaskGuideRows ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1 w-3 rounded-sm bg-yellow-400" />
                        mask natural waist
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1 w-3 rounded-sm bg-blue-500" />
                        mask trouser waist
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1 w-3 rounded-sm bg-red-500" />
                        mask hips
                      </span>
                    </>
                  ) : hasSideHipRows ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1 w-3 rounded-sm bg-red-500" />
                      side hip depth row
                    </span>
                  ) : !hasFallbackGuideRows ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1 w-3 rounded-sm bg-red-500" />
                      {debugRowsLabel}
                    </span>
                  ) : null}
                  {hasFallbackGuideRows ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1 w-3 rounded-sm bg-orange-500" />
                      pose/mask fallback row width
                    </span>
                  ) : null}
                  {hasHipScanRows ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-3 h-1 rounded-sm bg-green-500" />
                      widest pelvis band
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
