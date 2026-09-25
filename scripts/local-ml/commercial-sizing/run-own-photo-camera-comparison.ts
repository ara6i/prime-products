#!/usr/bin/env npx tsx

/* eslint-disable @typescript-eslint/no-explicit-any -- frozen model and camera responses are recorded verbatim */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { predictAiad } from "../../../app/api/try-on-test/wear-photo-test/_lib/aiadRuntime";
import { POST as predictV8 } from "../../../app/api/try-on-test/wear-photo-test/v8/route";

type ModelKey = "aiad" | "v8";
type Line = { leftX: number; rightX: number; y: number };
type CameraRow = { name: "waist" | "hips"; y: number; leftX: number; rightX: number };

const ROOT = path.resolve(import.meta.dirname, "../../..");
const CAMERA_URL = new URL(process.env.WEAR_AIAD_CAMERA_URL ?? "http://127.0.0.1:19031");
const TOKEN_PATH = process.env.WEAR_AIAD_CAMERA_TOKEN_FILE
  ?? "/Users/arashsn/.codex/runtime/aiad-camera-worker/token";

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const round = (value: unknown, digits = 4) => typeof value === "number" && Number.isFinite(value)
  ? Math.round(value * 10 ** digits) / 10 ** digits
  : null;

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error
    ? error.cause.message
    : error.cause && typeof error.cause === "object" && "code" in error.cause
      ? String((error.cause as { code: unknown }).code)
      : null;
  return cause ? `${error.message}: ${cause}` : error.message;
}

function imagePath(imageUrl: string) {
  if (!imageUrl.startsWith("/") || imageUrl.startsWith("/api/")) throw new Error(`Unsupported report image: ${imageUrl}`);
  return path.join(ROOT, "public", imageUrl);
}

function imageDataUrl(file: string, buffer: Buffer) {
  const extension = path.extname(file).toLowerCase();
  const mime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function cameraPost(token: string, endpoint: string, body: unknown, timeoutMs: number) {
  const response = await fetch(new URL(endpoint, CAMERA_URL), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const result = await response.json() as any;
  if (!response.ok || result?.ok !== true) throw new Error(`${endpoint}: ${result?.error ?? response.status}`);
  return result.result;
}

function modelRows(prediction: any, width: number, height: number): { rows: CameraRow[]; raw: Record<string, any>; lines: Record<string, Line> } {
  const selected = (prediction.rows ?? []).filter((row: any) => (row.kind === "waist" || row.kind === "hips") && row.line?.photo);
  if (selected.length !== 2) throw new Error("Model did not provide both waist and hip photo lines.");
  const rows = selected.map((row: any) => ({
    name: row.kind,
    y: row.line.photo.left.y * height,
    leftX: Math.min(row.line.photo.left.x, row.line.photo.right.x) * width,
    rightX: Math.max(row.line.photo.left.x, row.line.photo.right.x) * width,
  }));
  const lines = Object.fromEntries(selected.map((row: any) => [row.kind, {
    leftX: Math.min(row.line.photo.left.x, row.line.photo.right.x),
    rightX: Math.max(row.line.photo.left.x, row.line.photo.right.x),
    y: (row.line.photo.left.y + row.line.photo.right.y) / 2,
  }]));
  const raw = Object.fromEntries(selected.map((row: any) => [row.kind, {
    tapeCm: round(row.tapeCm),
    widthCm: round(row.widthCm),
    depthCm: round(row.depthCm),
    depthWidthRatio: round(row.depthWidthRatio ?? (row.depthCm / row.widthCm), 6),
    line: lines[row.kind],
  }]));
  return { rows, raw, lines };
}

function bodySupport(
  mask: Buffer,
  maskWidth: number,
  maskHeight: number,
  imageWidth: number,
  imageHeight: number,
  rows: CameraRow[],
) {
  const threshold = 128;
  const rowRadiusPx = clamp(Math.round(imageHeight * 0.0015), 3, 9);
  const valueAt = (x: number, y: number) => {
    const maskX = clamp(Math.floor(((x + 0.5) / imageWidth) * maskWidth), 0, maskWidth - 1);
    const maskY = clamp(Math.floor(((y + 0.5) / imageHeight) * maskHeight), 0, maskHeight - 1);
    return mask[maskY * maskWidth + maskX] ?? 0;
  };
  return rows.map((row) => {
    const leftX = clamp(Math.floor(Math.min(row.leftX, row.rightX)), 0, imageWidth - 1);
    const rightXExclusive = clamp(Math.ceil(Math.max(row.leftX, row.rightX)) + 1, leftX + 1, imageWidth);
    const centerY = clamp(Math.round(row.y), 0, imageHeight - 1);
    const scanlines = [];
    for (let y = clamp(centerY - rowRadiusPx, 0, imageHeight - 1); y <= clamp(centerY + rowRadiusPx, 0, imageHeight - 1); y += 1) {
      const runs: Array<{ startX: number; endX: number }> = [];
      let runStart: number | null = null;
      for (let x = leftX; x < rightXExclusive; x += 1) {
        const isBody = valueAt(x, y) >= threshold;
        if (isBody && runStart == null) runStart = x;
        if (!isBody && runStart != null) {
          if (x - runStart >= 2) runs.push({ startX: runStart, endX: x });
          runStart = null;
        }
      }
      if (runStart != null && rightXExclusive - runStart >= 2) runs.push({ startX: runStart, endX: rightXExclusive });
      scanlines.push({ y, runs });
    }
    return { name: row.name, threshold, maskWidth, maskHeight, maskSource: "saved-aiad-rembg-mask", scanlines };
  });
}

function cameraSummary(apple: any, depth: any, raw: Record<string, any>) {
  const appleRows = new Map((apple?.rows ?? []).map((row: any) => [row.name, row]));
  const depthRows = new Map((depth?.rows ?? []).map((row: any) => [row.name, row]));
  const rows = Object.fromEntries((["waist", "hips"] as const).map((name) => {
    const a: any = appleRows.get(name);
    const d: any = depthRows.get(name);
    const appleWidth = round(a?.frontPlaneWidthCm);
    const depthWidth = d?.valid === true ? round(d.predictedWidthCm) : null;
    return [name, {
      rawWidthCm: raw[name]?.widthCm ?? null,
      rawDepthCm: raw[name]?.depthCm ?? null,
      directTapeCm: raw[name]?.tapeCm ?? null,
      appleVisionWidthCm: appleWidth,
      depthProWidthCm: depthWidth,
      depthProValid: d?.valid === true,
      depthProConfidence: d?.confidence ?? null,
      directTapeChanged: false,
    }];
  }));
  return {
    appleVision: {
      geometryQuality: apple?.geometryQuality ?? "unavailable",
      focalMismatchPct: round(apple?.focalMismatchPct),
      normalizedRmsePct: round(apple?.normalizedRmsePct),
      estimatedCameraYawDeg: round(apple?.estimatedCameraYawDeg),
      estimatedCameraPitchDeg: round(apple?.estimatedCameraPitchDeg),
      estimatedCameraRollDeg: round(apple?.estimatedCameraRollDeg),
      cacheHit: apple?.cacheHit === true,
      model: apple?.model ?? null,
    },
    depthPro: {
      modelVersion: depth?.model?.version ?? null,
      validRows: Object.values(rows).filter((row: any) => row.depthProValid).length,
      totalRows: 2,
      scaleFactor: round(depth?.model?.depthProScaleFactor),
    },
    rows,
    tapeHandling: "Aiad and V8 direct waist/hip tape outputs remain unchanged",
    productSizeEffect: "0 percentage points because camera geometry is not connected to either frozen tape head",
  };
}

async function main() {
  const reportPath = path.resolve(process.argv[2] || "");
  const masksPath = path.resolve(process.argv[3] || "");
  const outputPath = path.resolve(process.argv[4] || "");
  if (!reportPath || !masksPath || !outputPath) throw new Error("Usage: run-own-photo-camera-comparison.ts <report.json> <mask-directory> <output.json>");
  const reportBuffer = await readFile(reportPath);
  const report = JSON.parse(reportBuffer.toString("utf8"));
  if (report.schema !== "own-photo-commercial-report-v1" || report.captures?.length !== 11) throw new Error("Expected the scoped 11-photo own-model report.");
  const token = (await readFile(TOKEN_PATH, "utf8")).toString().trim();
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Camera worker token is invalid.");

  const results = [];
  for (const [index, capture] of report.captures.entries()) {
    const sourcePath = imagePath(capture.imageUrl);
    const maskPath = path.join(masksPath, `${capture.captureId}.png`);
    const [source, savedMask] = await Promise.all([readFile(sourcePath), readFile(maskPath)]);
    const sourceMeta = await sharp(source).metadata();
    if (!sourceMeta.width || !sourceMeta.height) throw new Error(`Image dimensions unavailable: ${capture.captureId}`);
    const normalizedMask = await sharp(savedMask).greyscale().raw().toBuffer({ resolveWithObject: true });
    const profile = { heightCm: capture.heightCm, weightKg: capture.weightKg, gender: capture.gender };
    const aiad = await predictAiad(savedMask, profile, "aiad-rembg-photo");
    const v8Response = await predictV8(new Request("http://localhost/api/try-on-test/wear-photo-test/v8", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost" },
      body: JSON.stringify({ maskDataUrl: `data:image/png;base64,${savedMask.toString("base64")}`, ...profile }),
    }));
    const v8 = await v8Response.json() as any;
    if (!v8Response.ok || !v8.ok) throw new Error(`V8 failed for ${capture.captureId}: ${v8.error ?? v8Response.status}`);
    const predictions: Record<ModelKey, any> = { aiad, v8 };
    const prepared = Object.fromEntries(((["aiad", "v8"] as ModelKey[]).map((model) => [model, modelRows(predictions[model], sourceMeta.width!, sourceMeta.height!)]))) as Record<ModelKey, ReturnType<typeof modelRows>>;
    const dataUrl = imageDataUrl(sourcePath, source);
    let cacheKey: string | null = null;
    let depthCache: any = null;
    const cameraByModel: Record<string, any> = {};
    for (const model of ["aiad", "v8"] as ModelKey[]) {
      try {
        const apple = await cameraPost(token, "/apple-vision-pose3d", {
          imageDataUrl: cacheKey ? undefined : dataUrl,
          cacheKey: cacheKey ?? undefined,
          imageWidth: sourceMeta.width,
          imageHeight: sourceMeta.height,
          heightCm: capture.heightCm,
          rows: prepared[model].rows,
        }, 60_000);
        cacheKey = apple.cacheKey;
        if (!depthCache) depthCache = await cameraPost(token, "/depth-pro-cache", { imageDataUrl: dataUrl }, 135_000);
        const support = bodySupport(normalizedMask.data, normalizedMask.info.width, normalizedMask.info.height, sourceMeta.width, sourceMeta.height, prepared[model].rows);
        const depth = await cameraPost(token, "/apple-fused-body-scale", { cacheKey: depthCache.cacheKey, heightCm: capture.heightCm, rows: prepared[model].rows, bodySupport: support }, 60_000);
        cameraByModel[model] = { ok: true, raw: prepared[model].raw, ...cameraSummary(apple, depth, prepared[model].raw) };
      } catch (error) {
        cameraByModel[model] = { ok: false, raw: prepared[model].raw, error: errorMessage(error), tapeHandling: "Direct tape unchanged after camera failure", productSizeEffect: "0 percentage points" };
      }
    }
    results.push({
      captureId: capture.captureId,
      identity: capture.identity,
      imageUrl: capture.imageUrl,
      imageSha256: sha256(source),
      maskSha256: sha256(savedMask),
      models: cameraByModel,
    });
    console.log(JSON.stringify({
      complete: index + 1,
      total: report.captures.length,
      captureId: capture.captureId,
      aiad: cameraByModel.aiad.ok,
      v8: cameraByModel.v8.ok,
      errors: Object.fromEntries(Object.entries(cameraByModel).filter(([, row]) => !row.ok).map(([key, row]) => [key, row.error])),
    }));
  }

  const output = {
    schema: "own-photo-camera-comparison-v1",
    createdAt: new Date().toISOString(),
    sourceReport: reportPath,
    sourceReportSha256: sha256(reportBuffer),
    tools: {
      appleVision: "VNDetectHumanBodyPose3DRequest camera-plane width and camera orientation",
      depthPro: "Depth Pro visible-surface depth fused with Apple camera scale",
    },
    importantLimit: "These tools change diagnostic visible A-to-B width. They do not change the frozen Aiad or V8 direct waist/hip tape heads, so product-size percentages remain identical when the switches are turned on.",
    captures: results,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ complete: true, outputPath, captures: results.length, successfulModelComparisons: results.flatMap((row) => Object.values(row.models)).filter((row: any) => row.ok).length }));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
