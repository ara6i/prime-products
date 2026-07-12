"use client";

import { useEffect, useRef, useState } from "react";
import type { GeminiBodyGuide, GeminiGuideMeasurement } from "../lib/geminiGuide";

type GuideCandidateDebug = {
  redPixel?: GeminiBodyGuide | null;
  geminiJson?: GeminiBodyGuide | null;
};

interface Props {
  measurement: GeminiGuideMeasurement | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  elapsedMs: number | null;
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  title?: string;
  description?: string;
  sourceImageLabel?: string;
  responseDebug?: {
    rawText: string;
    returnedText: boolean;
    returnedImage: boolean;
    guideSource: string;
    inputImage?: {
      originalKb: number;
      compressedKb: number;
      geminiPayloadKb?: number;
      width: number;
      height: number;
      sentWidth?: number;
      sentHeight?: number;
      dimensionsPreserved: boolean;
      coordinateScaleX?: number;
      coordinateScaleY?: number;
      prepMs?: number;
    };
    outputImage?: {
      mimeType?: string;
      kb?: number;
      width?: number;
      height?: number;
      requestedSize?: string;
    } | null;
    timings?: {
      browserPrepMs?: number;
      apiTotalMs?: number;
      serverPrepareMs?: number;
      geminiRoundTripMs?: number;
      geminiRequestMs?: number;
      redDetectMs?: number;
    };
    guideCandidates?: GuideCandidateDebug;
  } | null;
}

export function GeminiGuidePanel({
  measurement,
  status,
  error,
  elapsedMs,
  imageUrl,
  imageWidth,
  imageHeight,
  title = "Coordinate curve guide",
  description,
  sourceImageLabel = "Source image with active curved guide coordinates",
  responseDebug,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderedImageUrlRef = useRef<string | null>(null);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const hasRedPixelRows = Boolean(measurement?.rows.some((row) => row.rowSource === "red-pixel-detector"));
  const downloadName = `${slugifyFileName(title)}-active-guide.png`;

  useEffect(() => {
    return () => {
      if (renderedImageUrlRef.current) {
        URL.revokeObjectURL(renderedImageUrlRef.current);
        renderedImageUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !measurement || !imageUrl) return;

    let cancelled = false;
    if (renderedImageUrlRef.current) {
      URL.revokeObjectURL(renderedImageUrlRef.current);
      renderedImageUrlRef.current = null;
    }
    setRenderedImageUrl(null);
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const width = imageWidth || image.naturalWidth;
      const height = imageHeight || image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context || width <= 0 || height <= 0) return;

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      drawGuideRows(context, width, height, measurement);
      canvas.toBlob((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        if (renderedImageUrlRef.current) URL.revokeObjectURL(renderedImageUrlRef.current);
        renderedImageUrlRef.current = url;
        setRenderedImageUrl(url);
      }, "image/png");
    };
    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageHeight, imageUrl, imageWidth, measurement]);

  if (status === "idle" && !measurement) return null;

  return (
    <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-purple-950">{title}</h4>
        <p className="text-xs text-purple-900">
          {description ??
            "The coordinate model receives the source photo and grid-overlay image, then returns waist, trouser-waist, and hip curved red lines with matching x/y JSON points. Red/Gemini/manual endpoints own the active formula span; visible-edge evidence is shown separately."}
          {elapsedMs != null ? ` Model API total ${elapsedMs} ms.` : ""}
        </p>
      </div>
      {status === "loading" ? (
        <p className="mt-3 text-xs text-purple-900">Waiting for coordinate model…</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 text-xs text-red-700">{error ?? "Coordinate guide failed"}</p>
      ) : null}
      {measurement ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {imageUrl ? (
            <div className="rounded-lg border border-purple-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-text-primary">
                  {sourceImageLabel}
                </div>
                {renderedImageUrl ? (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <a
                      href={renderedImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-purple-200 px-2 py-1 text-purple-700 hover:bg-purple-50"
                    >
                      Open full size
                    </a>
                    <a
                      href={renderedImageUrl}
                      download={downloadName}
                      className="rounded border border-purple-200 px-2 py-1 text-purple-700 hover:bg-purple-50"
                    >
                      Download PNG
                    </a>
                  </div>
                ) : null}
              </div>
              <canvas
                ref={canvasRef}
                className="max-h-[520px] w-full rounded-md border border-slate-100 object-contain"
              />
              <p className="mt-2 text-[11px] text-text-secondary">
                {hasRedPixelRows
                  ? "Curves shown here came from detected red pixels on the model's returned grid image."
                  : "Curves shown here came from the returned model JSON points."}
              </p>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-purple-200 bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-purple-100 text-purple-950">
                <tr>
                  <th className="px-2 py-2 font-semibold">Row</th>
                  <th className="px-2 py-2 font-semibold">Y px</th>
                  <th className="px-2 py-2 font-semibold">Left</th>
                  <th className="px-2 py-2 font-semibold">Right</th>
                  <th className="px-2 py-2 font-semibold">Conf.</th>
                  <th className="px-2 py-2 font-semibold">Width cm</th>
                  <th className="px-2 py-2 font-semibold">Arc cm</th>
                  <th className="px-2 py-2 font-semibold">Arc delta</th>
                  <th className="px-2 py-2 font-semibold">Depth src</th>
                  <th className="px-2 py-2 font-semibold">Depth ratio</th>
                  <th className="px-2 py-2 font-semibold">Depth cm</th>
                  <th className="px-2 py-2 font-semibold">Row source</th>
                  <th className="px-2 py-2 font-semibold">Curve source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 font-mono text-text-primary">
                {measurement.rows.map((row) => (
                  <tr key={row.kind}>
                    <td className="px-2 py-2 font-sans text-text-secondary">{row.kind}</td>
                    <td className="px-2 py-2">{row.yPx}</td>
                    <td className="px-2 py-2">{row.leftXPx}</td>
                    <td className="px-2 py-2">{row.rightXPx}</td>
                    <td className="px-2 py-2">{row.confidence.toFixed(2)}</td>
                    <td className="px-2 py-2">{row.curveHorizontalCm.toFixed(1)}</td>
                    <td className="px-2 py-2">{row.curveArcCm.toFixed(1)}</td>
                    <td className="px-2 py-2">{formatSignedCm(row.curveArcDeltaCm)}</td>
                    <td className="px-2 py-2 font-sans text-text-secondary">{row.depthSource}</td>
                    <td className="px-2 py-2">{row.depthRatio.toFixed(3)}</td>
                    <td className="px-2 py-2">{row.depthCm.toFixed(1)}</td>
                    <td className="px-2 py-2 font-sans text-text-secondary">
                      {formatGuideRowSource(row.rowSource)}
                    </td>
                    <td className="px-2 py-2 font-sans text-text-secondary">
                      {formatGuideEndpointSource(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-purple-200 bg-white p-3 text-xs text-text-secondary">
            <div className="font-semibold text-text-primary">Occlusion notes</div>
            <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
              <Flag label="hair" value={measurement.guide.occlusion?.hair_blocks_torso} />
              <Flag label="hands" value={measurement.guide.occlusion?.hands_near_hips} />
              <Flag label="loose cloth" value={measurement.guide.occlusion?.loose_clothing} />
            </div>
            {measurement.guide.notes ? (
              <p className="mt-3 text-[11px] leading-relaxed">{measurement.guide.notes}</p>
            ) : null}
          </div>
          {responseDebug ? (
            <div className="rounded-lg border border-purple-200 bg-white p-3 text-xs text-text-secondary lg:col-span-2">
              <div className="font-semibold text-text-primary">Raw model response</div>
              <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="rounded bg-slate-50 px-2 py-1">returnedImage: {responseDebug.returnedImage ? "yes" : "no"}</div>
                <div className="rounded bg-slate-50 px-2 py-1">returnedText: {responseDebug.returnedText ? "yes" : "no"}</div>
                <div className="rounded bg-slate-50 px-2 py-1 sm:col-span-2">guideSource: {responseDebug.guideSource}</div>
                {responseDebug.outputImage ? (
                  <div className="rounded bg-slate-50 px-2 py-1 sm:col-span-2">
                    outputImage: requested {responseDebug.outputImage.requestedSize ?? "—"}; returned{" "}
                    {responseDebug.outputImage.width ?? "—"} x {responseDebug.outputImage.height ?? "—"}
                    {responseDebug.outputImage.kb != null ? `; ${responseDebug.outputImage.kb.toFixed(1)} KB` : ""}
                    {responseDebug.outputImage.mimeType ? `; ${responseDebug.outputImage.mimeType}` : ""}
                  </div>
                ) : null}
                {responseDebug.inputImage ? (
                  <>
                    <div className="rounded bg-slate-50 px-2 py-1">
                      inputImage: {responseDebug.inputImage.originalKb.toFixed(1)} KB -&gt;{" "}
                      {responseDebug.inputImage.compressedKb.toFixed(1)} KB
                      {responseDebug.inputImage.geminiPayloadKb != null
                        ? `; model payload ${responseDebug.inputImage.geminiPayloadKb.toFixed(1)} KB`
                        : ""}
                    </div>
                    <div className="rounded bg-slate-50 px-2 py-1">
                      inputDims: {responseDebug.inputImage.width} x {responseDebug.inputImage.height} -&gt;{" "}
                      {responseDebug.inputImage.sentWidth ?? responseDebug.inputImage.width} x{" "}
                      {responseDebug.inputImage.sentHeight ?? responseDebug.inputImage.height}; preserved:{" "}
                      {responseDebug.inputImage.dimensionsPreserved ? "yes" : "no"}
                    </div>
                    <div className="rounded bg-slate-50 px-2 py-1">
                      browserPrep: {responseDebug.inputImage.prepMs ?? "—"} ms
                    </div>
                    <div className="rounded bg-slate-50 px-2 py-1">
                      scaleBack: x{(responseDebug.inputImage.coordinateScaleX ?? 1).toFixed(3)} / y{(responseDebug.inputImage.coordinateScaleY ?? 1).toFixed(3)}
                    </div>
                  </>
                ) : null}
                {responseDebug.timings ? (
                  <>
                    <div className="rounded bg-slate-50 px-2 py-1">apiTotal: {responseDebug.timings.apiTotalMs ?? "—"} ms</div>
                    <div className="rounded bg-slate-50 px-2 py-1">serverPrep: {responseDebug.timings.serverPrepareMs ?? "—"} ms</div>
                    <div className="rounded bg-slate-50 px-2 py-1">Model API wait: {responseDebug.timings.geminiRoundTripMs ?? responseDebug.timings.geminiRequestMs ?? "—"} ms</div>
                    <div className="rounded bg-slate-50 px-2 py-1">redDetect: {responseDebug.timings.redDetectMs ?? "—"} ms</div>
                  </>
                ) : null}
              </div>
              <GuideCandidateTable candidates={responseDebug.guideCandidates} />
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-50 whitespace-pre-wrap">
                {responseDebug.rawText.trim() || "[no text returned; model returned an image only]"}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
      {!measurement && responseDebug ? (
        <div className="mt-3 rounded-lg border border-purple-200 bg-white p-3 text-xs text-text-secondary">
          <div className="font-semibold text-text-primary">Raw model response</div>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="rounded bg-slate-50 px-2 py-1">returnedImage: {responseDebug.returnedImage ? "yes" : "no"}</div>
            <div className="rounded bg-slate-50 px-2 py-1">returnedText: {responseDebug.returnedText ? "yes" : "no"}</div>
            <div className="rounded bg-slate-50 px-2 py-1 sm:col-span-2">guideSource: {responseDebug.guideSource}</div>
            {responseDebug.outputImage ? (
              <div className="rounded bg-slate-50 px-2 py-1 sm:col-span-2">
                outputImage: requested {responseDebug.outputImage.requestedSize ?? "—"}; returned{" "}
                {responseDebug.outputImage.width ?? "—"} x {responseDebug.outputImage.height ?? "—"}
                {responseDebug.outputImage.kb != null ? `; ${responseDebug.outputImage.kb.toFixed(1)} KB` : ""}
                {responseDebug.outputImage.mimeType ? `; ${responseDebug.outputImage.mimeType}` : ""}
              </div>
            ) : null}
            {responseDebug.inputImage ? (
              <>
                <div className="rounded bg-slate-50 px-2 py-1">
                  inputImage: {responseDebug.inputImage.originalKb.toFixed(1)} KB -&gt;{" "}
                  {responseDebug.inputImage.compressedKb.toFixed(1)} KB
                  {responseDebug.inputImage.geminiPayloadKb != null
                    ? `; model payload ${responseDebug.inputImage.geminiPayloadKb.toFixed(1)} KB`
                    : ""}
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  inputDims: {responseDebug.inputImage.width} x {responseDebug.inputImage.height} -&gt;{" "}
                  {responseDebug.inputImage.sentWidth ?? responseDebug.inputImage.width} x{" "}
                  {responseDebug.inputImage.sentHeight ?? responseDebug.inputImage.height}; preserved:{" "}
                  {responseDebug.inputImage.dimensionsPreserved ? "yes" : "no"}
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  browserPrep: {responseDebug.inputImage.prepMs ?? "—"} ms
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  scaleBack: x{(responseDebug.inputImage.coordinateScaleX ?? 1).toFixed(3)} / y{(responseDebug.inputImage.coordinateScaleY ?? 1).toFixed(3)}
                </div>
              </>
            ) : null}
            {responseDebug.timings ? (
              <>
                <div className="rounded bg-slate-50 px-2 py-1">apiTotal: {responseDebug.timings.apiTotalMs ?? "—"} ms</div>
                <div className="rounded bg-slate-50 px-2 py-1">serverPrep: {responseDebug.timings.serverPrepareMs ?? "—"} ms</div>
                <div className="rounded bg-slate-50 px-2 py-1">Model API wait: {responseDebug.timings.geminiRoundTripMs ?? responseDebug.timings.geminiRequestMs ?? "—"} ms</div>
                <div className="rounded bg-slate-50 px-2 py-1">redDetect: {responseDebug.timings.redDetectMs ?? "—"} ms</div>
              </>
            ) : null}
          </div>
          <GuideCandidateTable candidates={responseDebug.guideCandidates} />
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-50 whitespace-pre-wrap">
            {responseDebug.rawText.trim() || "[no text returned; model returned an image only]"}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function GuideCandidateTable({ candidates }: { candidates?: GuideCandidateDebug }) {
  const rows = [
    ...guideCandidateRows("red-pixel detector", candidates?.redPixel),
    ...guideCandidateRows("Model JSON", candidates?.geminiJson),
  ];
  if (!rows.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded border border-slate-200 bg-white">
      <div className="bg-slate-50 px-2 py-2 text-[11px] font-semibold text-text-primary">
        Scaled coordinate sources
      </div>
      <table className="w-full text-left text-[11px]">
        <thead className="bg-slate-100 text-text-secondary">
          <tr>
            <th className="px-2 py-2 font-semibold">Source</th>
            <th className="px-2 py-2 font-semibold">Row</th>
            <th className="px-2 py-2 font-semibold">Y px</th>
            <th className="px-2 py-2 font-semibold">Left</th>
            <th className="px-2 py-2 font-semibold">Right</th>
            <th className="px-2 py-2 font-semibold">Conf.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-text-primary">
          {rows.map((row) => (
            <tr key={`${row.source}-${row.kind}`}>
              <td className="px-2 py-2 font-sans text-text-secondary">{row.source}</td>
              <td className="px-2 py-2 font-sans text-text-secondary">{row.kind}</td>
              <td className="px-2 py-2">{formatCandidateNumber(row.y)}</td>
              <td className="px-2 py-2">{formatCandidateNumber(row.left)}</td>
              <td className="px-2 py-2">{formatCandidateNumber(row.right)}</td>
              <td className="px-2 py-2">{formatCandidateNumber(row.confidence, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function guideCandidateRows(source: string, guide: GeminiBodyGuide | null | undefined) {
  if (!guide) return [];
  return [
    { kind: "waist", line: guide.waist },
    { kind: "trouserWaist", line: guide.trouserWaist },
    { kind: "hips", line: guide.hips },
  ].flatMap(({ kind, line }) => {
    if (!line) return [];
    return [{
      source,
      kind,
      y: line.y_px,
      left: line.left_x_px,
      right: line.right_x_px,
      confidence: line.confidence,
    }];
  });
}

function formatCandidateNumber(value: number | undefined, digits = 0): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function formatSignedCm(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function slugifyFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "coordinate-guide";
}

function drawGuideRows(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  measurement: GeminiGuideMeasurement,
) {
  const lineWidth = Math.max(5, width * 0.005);
  const dotRadius = Math.max(8, width * 0.01);
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.font = `${Math.max(18, Math.round(width * 0.018))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.textBaseline = "middle";

  for (const row of measurement.rows) {
    const y = row.yNorm * height;
    const leftX = row.leftXNorm * width;
    const rightX = row.rightXNorm * width;
    const curvePoints = row.points.map((point) => ({
      x: point.xNorm * width,
      y: point.yNorm * height,
    }));
    const startPoint = curvePoints[0] ?? { x: leftX, y };
    const endPoint = curvePoints[curvePoints.length - 1] ?? { x: rightX, y };
    const rowName = row.kind === "waist" ? "waist" : row.kind === "trouserWaist" ? "trouser" : "hips";
    const label = `${rowName} ${formatGuideEndpointSource(row)}`;

    context.strokeStyle = "#ef4444";
    context.fillStyle = "#ef4444";
    context.lineWidth = lineWidth;
    context.beginPath();
    if (curvePoints.length >= 2) {
      context.moveTo(curvePoints[0]!.x, curvePoints[0]!.y);
      for (let index = 1; index < curvePoints.length; index += 1) {
        context.lineTo(curvePoints[index]!.x, curvePoints[index]!.y);
      }
    } else {
      context.moveTo(leftX, y);
      context.lineTo(rightX, y);
    }
    context.stroke();

    context.beginPath();
    context.arc(startPoint.x, startPoint.y, dotRadius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(endPoint.x, endPoint.y, dotRadius, 0, Math.PI * 2);
    context.fill();

    const text = `${label} · ${row.confidence.toFixed(2)}`;
    const textMetrics = context.measureText(text);
    const textX = Math.min(width - textMetrics.width - 16, endPoint.x + 14);
    const textY = Math.max(18, Math.min(height - 18, endPoint.y - 18));
    context.fillStyle = "rgba(255, 255, 255, 0.86)";
    context.fillRect(textX - 6, textY - 14, textMetrics.width + 12, 28);
    context.fillStyle = "#b91c1c";
    context.fillText(text, textX, textY);
  }

  context.restore();
}

function formatGuideRowSource(source: GeminiGuideMeasurement["rows"][number]["rowSource"]): string {
  if (source === "red-pixel-detector") return "red-pixel";
  if (source === "manual-coordinate") return "manual";
  if (source === "manual-adjusted-coordinate") return "manual adjusted";
  if (source === "pose-mask-fallback") return "pose/mask";
  return "JSON";
}

function formatGuideEndpointSource(row: GeminiGuideMeasurement["rows"][number]): string {
  if (row.formulaWidthSource === "gemini-red-line") return "red-pixel curve";
  if (row.formulaWidthSource === "manual-coordinates") return "manual endpoints";
  if (row.formulaWidthSource === "fallback-line") return "fallback endpoints";
  return "JSON curve";
}

function Flag({ label, value }: { label: string; value: boolean | undefined }) {
  return (
    <div className="rounded bg-slate-50 px-2 py-1">
      <div className="font-sans text-[10px] uppercase text-text-hint">{label}</div>
      <div className={value ? "text-red-700" : "text-emerald-700"}>{value ? "yes" : "no"}</div>
    </div>
  );
}
