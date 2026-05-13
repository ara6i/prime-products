"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseResult, WaistTrace } from "../types";

interface Props {
  pose: PoseResult | null;
  trace: WaistTrace | null;
}

/**
 * Renders the raw MediaPipe segmentation mask as a B/W image.
 * Overlays two horizontal lines so the user can SEE where the
 * scan measured:
 *  - YELLOW = narrowest row (natural waist candidate)
 *  - BLUE   = trouser-waist row (slightly below)
 * Width of the line = the measured edges (left, right) of the mask
 * at that row.
 */
export function MaskPreview({ pose, trace }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setDataUrl(null);
    if (!pose?.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = pose.maskWidth;
    canvas.height = pose.maskHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mask as B/W
    const imgData = ctx.createImageData(pose.maskWidth, pose.maskHeight);
    for (let i = 0; i < pose.mask.length; i++) {
      const v = pose.mask[i]!;
      const o = i * 4;
      imgData.data[o] = v;
      imgData.data[o + 1] = v;
      imgData.data[o + 2] = v;
      imgData.data[o + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    // Overlay measurement lines
    if (trace) {
      const stroke = Math.max(3, pose.maskWidth * 0.005);
      const drawLine = (
        yNorm: number | undefined,
        leftNorm: number | undefined,
        rightNorm: number | undefined,
        color: string,
        label: string,
      ) => {
        if (yNorm == null || leftNorm == null || rightNorm == null) return;
        const y = yNorm * pose.maskHeight;
        const lx = leftNorm * pose.maskWidth;
        const rx = rightNorm * pose.maskWidth;
        ctx.strokeStyle = color;
        ctx.lineWidth = stroke;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.stroke();
        // End caps
        ctx.beginPath();
        ctx.moveTo(lx, y - stroke * 3);
        ctx.lineTo(lx, y + stroke * 3);
        ctx.moveTo(rx, y - stroke * 3);
        ctx.lineTo(rx, y + stroke * 3);
        ctx.stroke();
        // Label
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(14, pose.maskWidth * 0.025)}px ui-monospace, monospace`;
        ctx.textBaseline = "bottom";
        ctx.fillText(label, lx + stroke, y - stroke * 4);
      };
      drawLine(
        trace.narrowestYNorm,
        trace.narrowestLeftXNorm,
        trace.narrowestRightXNorm,
        "#facc15",  // yellow
        `narrowest (${trace.hipMaskWidthCm} cm)`,
      );
      drawLine(
        trace.trouserWaistYNorm,
        trace.trouserWaistLeftXNorm,
        trace.trouserWaistRightXNorm,
        "#3b82f6",  // blue
        `trouser-waist (${trace.trouserWaistBreadthCm} cm)`,
      );
    }

    try {
      setDataUrl(canvas.toDataURL("image/png"));
    } catch {
      /* canvas may be tainted */
    }
  }, [pose, trace]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Segmentation mask{pose?.mask ? ` (${pose.maskWidth} × ${pose.maskHeight})` : ""}
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
          {trace && (
            <div className="flex items-center gap-3 text-[11px] mt-2 text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-1 bg-yellow-400 rounded-sm" />
                narrowest row
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-1 bg-blue-500 rounded-sm" />
                trouser-waist row
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
