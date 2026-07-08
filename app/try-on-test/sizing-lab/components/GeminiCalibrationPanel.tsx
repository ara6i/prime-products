"use client";

import { useEffect, useRef } from "react";
import type { PoseResult } from "../types";
import type { GeminiMaskCalibration, GeminiCalibrationRow } from "../lib/geminiMaskCalibration";
import {
  computePoseScale,
  createMeasurementMask,
  torsoFractionFromY,
  type PoseScale,
} from "../lib/bodyMaskGeometry";

interface Props {
  calibration: GeminiMaskCalibration | null;
  geminiPose: PoseResult | null;
  geminiImageWidth: number;
  geminiImageHeight: number;
  originalPose: PoseResult | null;
  originalImageWidth: number;
  originalImageHeight: number;
  heightCm: number;
}

type Source = {
  pose: PoseResult;
  imageWidth: number;
  imageHeight: number;
  scale: PoseScale;
  mask: Uint8ClampedArray;
  color: [number, number, number, number];
};

const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 420;
const BODY_CENTER_X = PANEL_WIDTH * 0.5;
const BODY_SHOULDER_Y = 72;
const BODY_TORSO_HEIGHT = 170;
const PX_PER_CM = 6;

export function GeminiCalibrationPanel({
  calibration,
  geminiPose,
  geminiImageWidth,
  geminiImageHeight,
  originalPose,
  originalImageWidth,
  originalImageHeight,
  heightCm,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = PANEL_WIDTH;
    canvas.height = PANEL_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

    if (!calibration || !geminiPose || !originalPose) {
      drawEmpty(ctx);
      return;
    }

    const geminiScale = computePoseScale(geminiPose, geminiImageWidth, geminiImageHeight, heightCm);
    const originalScale = computePoseScale(originalPose, originalImageWidth, originalImageHeight, heightCm);
    const geminiMask = createMeasurementMask(geminiPose, geminiImageWidth, geminiImageHeight, "raw");
    const originalMask = createMeasurementMask(originalPose, originalImageWidth, originalImageHeight, "ignore-arms");

    if (!geminiScale || !originalScale || !geminiMask || !originalMask) {
      drawEmpty(ctx);
      return;
    }

    drawGrid(ctx);
    drawMask(ctx, {
      pose: originalPose,
      imageWidth: originalImageWidth,
      imageHeight: originalImageHeight,
      scale: originalScale,
      mask: originalMask,
      color: [245, 158, 11, 52],
    });
    drawMask(ctx, {
      pose: geminiPose,
      imageWidth: geminiImageWidth,
      imageHeight: geminiImageHeight,
      scale: geminiScale,
      mask: geminiMask,
      color: [37, 99, 235, 58],
    });
    drawCalibrationRows(ctx, calibration.rows, geminiScale);
    drawLegend(ctx);
  }, [
    calibration,
    geminiImageHeight,
    geminiImageWidth,
    geminiPose,
    heightCm,
    originalImageHeight,
    originalImageWidth,
    originalPose,
  ]);

  if (!calibration?.rows.length) return null;

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-text-primary">Gemini mask calibration overlay</h4>
        <p className="text-xs text-text-secondary">
          Raw silhouettes are aligned by shoulder/hip scale. The bars below are the exact rows used for correction.
        </p>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg border border-slate-200 bg-white"
          style={{ maxHeight: 420 }}
        />
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-text-secondary">
            <div className="font-semibold text-text-primary">Correction formula</div>
            <div className="mt-1 font-mono text-[11px]">
              original clean width - Gemini width = width correction
            </div>
            <div className="mt-2 text-[11px]">
              Blue = Gemini generated mask. Amber = original photo mask. Green row = calibrated width used in the final number.
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-text-secondary">
                <tr>
                  <th className="px-2 py-2 font-semibold">Row</th>
                  <th className="px-2 py-2 font-semibold">Gemini</th>
                  <th className="px-2 py-2 font-semibold">Original</th>
                  <th className="px-2 py-2 font-semibold">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-text-primary">
                {calibration.rows.map((row) => (
                  <tr key={row.kind}>
                    <td className="px-2 py-2 font-sans text-text-secondary">{row.label}</td>
                    <td className="px-2 py-2">{row.geminiWidthCm.toFixed(1)} cm</td>
                    <td className="px-2 py-2">{row.originalCleanWidthCm.toFixed(1)} cm</td>
                    <td className={`px-2 py-2 ${row.widthDeltaCm >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {formatSigned(row.widthDeltaCm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-text-secondary">
                <tr>
                  <th className="px-2 py-2 font-semibold">Result</th>
                  <th className="px-2 py-2 font-semibold">Raw</th>
                  <th className="px-2 py-2 font-semibold">Calibrated</th>
                  <th className="px-2 py-2 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-text-primary">
                {calibration.rows.map((row) => (
                  <tr key={`${row.kind}-result`}>
                    <td className="px-2 py-2 font-sans text-text-secondary">{row.label}</td>
                    <td className="px-2 py-2">{row.rawCm.toFixed(1)} cm</td>
                    <td className="px-2 py-2">{row.calibratedCm.toFixed(1)} cm</td>
                    <td className={`px-2 py-2 ${row.circumferenceDeltaCm >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {formatSigned(row.circumferenceDeltaCm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function drawEmpty(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#64748b";
  ctx.font = "14px ui-sans-serif, system-ui";
  ctx.fillText("Calibration overlay needs Gemini and original masks.", 24, 36);
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let x = 60; x <= PANEL_WIDTH - 60; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x, PANEL_HEIGHT - 32);
    ctx.stroke();
  }
  ctx.strokeStyle = "#94a3b8";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(BODY_CENTER_X, 24);
  ctx.lineTo(BODY_CENTER_X, PANEL_HEIGHT - 24);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMask(ctx: CanvasRenderingContext2D, source: Source) {
  const step = Math.max(3, Math.ceil(source.pose.maskWidth / 220));
  ctx.fillStyle = `rgba(${source.color[0]}, ${source.color[1]}, ${source.color[2]}, ${source.color[3] / 255})`;
  for (let y = 0; y < source.pose.maskHeight; y += step) {
    for (let x = 0; x < source.pose.maskWidth; x += step) {
      const value = source.mask[y * source.pose.maskWidth + x] ?? 0;
      if (value < 96) continue;
      const point = mapMaskPoint(source, x, y);
      if (!point) continue;
      ctx.fillRect(point.x, point.y, Math.max(1, step * 0.45), Math.max(1, step * 0.45));
    }
  }
}

function drawCalibrationRows(
  ctx: CanvasRenderingContext2D,
  rows: GeminiCalibrationRow[],
  geminiScale: PoseScale,
) {
  ctx.font = "bold 12px ui-monospace, monospace";
  ctx.textBaseline = "middle";

  rows.forEach((row) => {
    const torsoFraction = torsoFractionFromY(geminiScale, row.geminiYNorm);
    const y = BODY_SHOULDER_Y + torsoFraction * BODY_TORSO_HEIGHT;
    const geminiHalf = row.geminiWidthCm * PX_PER_CM * 0.5;
    const originalHalf = row.originalCleanWidthCm * PX_PER_CM * 0.5;

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(BODY_CENTER_X - geminiHalf, y - 5);
    ctx.lineTo(BODY_CENTER_X + geminiHalf, y - 5);
    ctx.stroke();

    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(BODY_CENTER_X - originalHalf, y + 5);
    ctx.lineTo(BODY_CENTER_X + originalHalf, y + 5);
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.fillText(`${row.label}: ${formatSigned(row.widthDeltaCm)}`, BODY_CENTER_X + Math.max(geminiHalf, originalHalf) + 10, y);
  });
}

function drawLegend(ctx: CanvasRenderingContext2D) {
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textBaseline = "middle";

  drawLegendItem(ctx, 24, PANEL_HEIGHT - 48, "#f59e0b", "Original raw mask");
  drawLegendItem(ctx, 168, PANEL_HEIGHT - 48, "#2563eb", "Gemini mask");
  drawLegendItem(ctx, 292, PANEL_HEIGHT - 48, "#16a34a", "Original cleaned row width");

  ctx.fillStyle = "#475569";
  ctx.fillText("Aligned by hip center and shoulder-to-hip height, then compared in cm.", 24, PANEL_HEIGHT - 22);
}

function drawLegendItem(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 5, 18, 10);
  ctx.fillStyle = "#334155";
  ctx.fillText(label, x + 24, y);
}

function mapMaskPoint(source: Source, maskX: number, maskY: number): { x: number; y: number } | null {
  const xNorm = maskX / source.pose.maskWidth;
  const yNorm = maskY / source.pose.maskHeight;
  const torsoFraction = torsoFractionFromY(source.scale, yNorm);
  const xCm = (xNorm - source.scale.hipCenterXNorm) * source.imageWidth * source.scale.cmPerPx;
  const panelX = BODY_CENTER_X + xCm * PX_PER_CM;
  const panelY = BODY_SHOULDER_Y + torsoFraction * BODY_TORSO_HEIGHT;
  if (panelX < 12 || panelX > PANEL_WIDTH - 12 || panelY < 12 || panelY > PANEL_HEIGHT - 64) return null;
  return { x: panelX, y: panelY };
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} cm`;
}
