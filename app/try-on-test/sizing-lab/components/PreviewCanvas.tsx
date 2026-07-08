"use client";

import { useEffect, useRef } from "react";
import type { MeasurementMaskMode, PoseResult } from "../types";
import { POSE_IDX } from "../lib/poseDetector";
import { createMeasurementMask } from "../lib/bodyMaskGeometry";

interface Props {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pose: PoseResult | null;
  showMask: boolean;
  showLandmarks: boolean;
  maskMode?: MeasurementMaskMode;
}

/**
 * Image + overlays:
 *  - segmentation mask (translucent green)
 *  - shoulder + hip span lines (blue / green)
 *  - all 33 landmark dots, colored by z-depth
 *      (blue = forward / closer to camera, red = backward / farther)
 */
export function PreviewCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  pose,
  showMask,
  showLandmarks,
  maskMode = "raw",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageWidth || !imageHeight) return;
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = async () => {
      await drawPoseOverlay(ctx, {
        imageUrl,
        imageWidth,
        imageHeight,
        pose,
        showMask,
        showLandmarks,
        maskMode,
      });
    };
    void draw();
  }, [imageUrl, imageWidth, imageHeight, pose, showMask, showLandmarks, maskMode]);

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

async function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  {
    imageUrl,
    imageWidth,
    imageHeight,
    pose,
    showMask,
    showLandmarks,
    maskMode,
  }: {
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    pose: PoseResult | null;
    showMask: boolean;
    showLandmarks: boolean;
    maskMode: MeasurementMaskMode;
  },
) {
  ctx.clearRect(0, 0, imageWidth, imageHeight);
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });

  const displayMask = pose ? createMeasurementMask(pose, imageWidth, imageHeight, maskMode) : null;
  if (img) {
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
  }

  if (showMask && displayMask && pose?.mask && pose.maskWidth > 0 && pose.maskHeight > 0) {
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = pose.maskWidth;
    maskCanvas.height = pose.maskHeight;
    const maskContext = maskCanvas.getContext("2d");
    if (maskContext) {
      const imgData = maskContext.createImageData(pose.maskWidth, pose.maskHeight);
      for (let i = 0; i < displayMask.length; i++) {
        const v = displayMask[i]!;
        const offset = i * 4;
        imgData.data[offset] = 80;
        imgData.data[offset + 1] = 220;
        imgData.data[offset + 2] = 120;
        imgData.data[offset + 3] = Math.min(140, v);
      }
      maskContext.putImageData(imgData, 0, 0);
      ctx.drawImage(maskCanvas, 0, 0, imageWidth, imageHeight);
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

    let zMin = Infinity;
    let zMax = -Infinity;
    for (const p of lm) {
      if (p.z < zMin) zMin = p.z;
      if (p.z > zMax) zMax = p.z;
    }
    const zRange = Math.max(0.001, zMax - zMin);

    const baseR = Math.max(3, imageWidth * 0.006);
    for (const p of lm) {
      const tNorm = (p.z - zMin) / zRange;
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
}
