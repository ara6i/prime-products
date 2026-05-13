"use client";

import { useEffect, useRef } from "react";
import type { PoseResult } from "../types";
import { POSE_IDX } from "../lib/poseDetector";

interface Props {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pose: PoseResult | null;
  showMask: boolean;
  showLandmarks: boolean;
}

/**
 * Image + overlays:
 *  - segmentation mask (translucent green)
 *  - shoulder + hip span lines (blue / green)
 *  - all 33 landmark dots, colored by z-depth
 *      (blue = forward / closer to camera, red = backward / farther)
 */
export function PreviewCanvas({ imageUrl, imageWidth, imageHeight, pose, showMask, showLandmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageWidth || !imageHeight) return;
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = async () => {
      ctx.clearRect(0, 0, imageWidth, imageHeight);
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = imageUrl;
      });

      if (showMask && pose?.mask && pose.maskWidth > 0 && pose.maskHeight > 0) {
        const mc = document.createElement("canvas");
        mc.width = pose.maskWidth;
        mc.height = pose.maskHeight;
        const mctx = mc.getContext("2d");
        if (mctx) {
          const imgData = mctx.createImageData(pose.maskWidth, pose.maskHeight);
          for (let i = 0; i < pose.mask.length; i++) {
            const v = pose.mask[i]!;
            const o = i * 4;
            imgData.data[o] = 80;
            imgData.data[o + 1] = 220;
            imgData.data[o + 2] = 120;
            imgData.data[o + 3] = Math.min(140, v);
          }
          mctx.putImageData(imgData, 0, 0);
          ctx.drawImage(mc, 0, 0, imageWidth, imageHeight);
        }
      }

      if (showLandmarks && pose?.landmarks?.length) {
        const lm = pose.landmarks;
        const lH = lm[POSE_IDX.LEFT_HIP];
        const rH = lm[POSE_IDX.RIGHT_HIP];
        const lS = lm[POSE_IDX.LEFT_SHOULDER];
        const rS = lm[POSE_IDX.RIGHT_SHOULDER];

        if (lH && rH) {
          ctx.strokeStyle = "#2154ef";
          ctx.lineWidth = Math.max(2, imageWidth * 0.005);
          ctx.beginPath();
          ctx.moveTo(lH.x * imageWidth, lH.y * imageHeight);
          ctx.lineTo(rH.x * imageWidth, rH.y * imageHeight);
          ctx.stroke();
        }
        if (lS && rS) {
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = Math.max(2, imageWidth * 0.005);
          ctx.beginPath();
          ctx.moveTo(lS.x * imageWidth, lS.y * imageHeight);
          ctx.lineTo(rS.x * imageWidth, rS.y * imageHeight);
          ctx.stroke();
        }

        // Determine z-range across all landmarks for color mapping
        let zMin = Infinity, zMax = -Infinity;
        for (const p of lm) {
          if (p.z < zMin) zMin = p.z;
          if (p.z > zMax) zMax = p.z;
        }
        const zRange = Math.max(0.001, zMax - zMin);

        const baseR = Math.max(3, imageWidth * 0.006);
        for (let i = 0; i < lm.length; i++) {
          const p = lm[i]!;
          // Normalize z to 0..1 (0 = closest, 1 = farthest)
          const tNorm = (p.z - zMin) / zRange;
          // Blue (closer) → Red (farther)
          const r = Math.round(60 + tNorm * 195);
          const g = Math.round(80 - tNorm * 60);
          const b = Math.round(255 - tNorm * 215);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = Math.max(1, imageWidth * 0.001);

          const x = p.x * imageWidth;
          const y = p.y * imageHeight;
          ctx.beginPath();
          ctx.arc(x, y, baseR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    };
    void draw();
  }, [imageUrl, imageWidth, imageHeight, pose, showMask, showLandmarks]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: "12px", border: "1px solid #e5e7eb" }}
      />
      {showLandmarks && pose?.landmarks?.length ? (
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <span>z-depth:</span>
          <span style={{ background: "rgb(60,80,255)", color: "white", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace" }}>
            forward (closer)
          </span>
          <span
            style={{
              width: 60,
              height: 10,
              background: "linear-gradient(to right, rgb(60,80,255), rgb(255,20,40))",
              borderRadius: "5px",
            }}
          />
          <span style={{ background: "rgb(255,20,40)", color: "white", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace" }}>
            back (farther)
          </span>
        </div>
      ) : null}
    </div>
  );
}
