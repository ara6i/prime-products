"use client";

import { AlertTriangle, Box, Camera, Check, Loader2, RotateCcw, Ruler, ScanLine, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/app/shared/lib/utils";
import type {
  FreshGeometryLineOverride,
  FreshGeometryLineOverrideMap,
  FreshGeometryPrediction,
  FreshGeometryRow,
} from "./freshGeometryTypes";

interface FreshGeometryResultProps {
  actuals: Partial<Record<"neck" | "chest" | "underbust" | "waist" | "hips", number | null>>;
  imageUrl: string;
  lineEditError: string | null;
  lineRecalibrating: boolean;
  onRecalculateLines: (lines: FreshGeometryLineOverrideMap) => Promise<void>;
  prediction: FreshGeometryPrediction;
}

interface FreshLineDrag {
  initial: FreshGeometryLineOverride;
  kind: FreshGeometryRow["kind"];
  mode: "move" | "left" | "right";
  pointerId: number;
  startX: number;
  startY: number;
}

function formatCm(value: number | null | undefined, digits = 1) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? `${value.toFixed(digits)} cm`
    : "—";
}

function difference(value: number | null, actual: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    && typeof actual === "number" && Number.isFinite(actual)
    ? value - actual
    : null;
}

function ratioLabel(key: string) {
  return key
    .replace(/^ratio\.(front|tape)\./, "")
    .replaceAll("_", " / ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fusionSourceLabel(source: "apple-depth" | "apple-vision" | "fresh-onnx") {
  if (source === "apple-depth") return "Apple + Depth Pro";
  if (source === "apple-vision") return "Apple fallback";
  return "Raw fresh ONNX";
}

function editableLines(prediction: FreshGeometryPrediction): FreshGeometryLineOverrideMap {
  return Object.fromEntries(prediction.rows.flatMap((row) => row.line ? [[row.kind, {
    leftX: Math.min(row.line.photo.left.x, row.line.photo.right.x),
    rightX: Math.max(row.line.photo.left.x, row.line.photo.right.x),
    y: (row.line.photo.left.y + row.line.photo.right.y) / 2,
  }]] : []));
}

function changedLineKinds(
  initial: FreshGeometryLineOverrideMap,
  draft: FreshGeometryLineOverrideMap,
) {
  return Object.entries(draft).flatMap(([kind, line]) => {
    const original = initial[kind as FreshGeometryRow["kind"]];
    if (!original || !line) return [];
    return Math.abs(original.leftX - line.leftX) > 0.0005
      || Math.abs(original.rightX - line.rightX) > 0.0005
      || Math.abs(original.y - line.y) > 0.0005
      ? [kind as FreshGeometryRow["kind"]]
      : [];
  });
}

function centeredLine(
  line: FreshGeometryLineOverride,
  centerX: number,
  span: number,
): FreshGeometryLineOverride {
  const safeCenter = Math.max(0.01, Math.min(0.99, centerX));
  const halfSpan = Math.max(0.005, Math.min(span / 2, safeCenter - 0.005, 0.995 - safeCenter));
  return {
    leftX: safeCenter - halfSpan,
    rightX: safeCenter + halfSpan,
    y: line.y,
  };
}

function normalizedPointer(clientX: number, clientY: number, svg: SVGSVGElement) {
  const bounds = svg.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (clientX - bounds.left) / Math.max(1, bounds.width))),
    y: Math.max(0, Math.min(1, (clientY - bounds.top) / Math.max(1, bounds.height))),
  };
}

function CrossSection({ row }: { row: FreshGeometryRow }) {
  if (row.shape.length < 3) {
    return <div className="flex h-40 items-center justify-center text-xs font-bold text-slate-400">No certified shape head</div>;
  }
  const xs = row.shape.map((point) => point.x);
  const depths = row.shape.map((point) => point.depth);
  const minimumX = Math.min(...xs);
  const maximumX = Math.max(...xs);
  const minimumDepth = Math.min(...depths);
  const maximumDepth = Math.max(...depths);
  const width = Math.max(0.001, maximumX - minimumX);
  const depth = Math.max(0.001, maximumDepth - minimumDepth);
  const points = [...row.shape, row.shape[0]!].map((point) => {
    const x = 12 + ((point.x - minimumX) / width) * 176;
    const y = 12 + ((point.depth - minimumDepth) / depth) * 116;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return (
    <div>
      <svg aria-label={`${row.label} predicted 3D cross-section`} className="h-36 w-full" role="img" viewBox="0 0 200 140">
        <line stroke="#cbd5e1" strokeDasharray="3 3" x1="100" x2="100" y1="6" y2="134" />
        <line stroke="#cbd5e1" strokeDasharray="3 3" x1="6" x2="194" y1="70" y2="70" />
        <polyline fill={`${row.color}22`} points={points} stroke={row.color} strokeLinejoin="round" strokeWidth="3" />
        <text fill="#64748b" fontSize="8" textAnchor="middle" x="100" y="138">front width</text>
        <text fill="#64748b" fontSize="8" transform="rotate(-90 7 70)" x="7" y="70">front ↔ back depth</text>
      </svg>
      <p className="text-center text-[11px] font-bold text-slate-500">32-point WEAR-taught shape · predicted, not scanned</p>
    </div>
  );
}

export function FreshGeometryResult({
  actuals,
  imageUrl,
  lineEditError,
  lineRecalibrating,
  onRecalculateLines,
  prediction,
}: FreshGeometryResultProps) {
  const fusion = prediction.cameraFusion;
  const cameraRowsApplied = fusion?.rows.filter((row) => row.widthSource !== "fresh-onnx").length ?? 0;
  const initialLines = useMemo(() => editableLines(prediction), [prediction]);
  const [draftLines, setDraftLines] = useState<FreshGeometryLineOverrideMap>(initialLines);
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [dragging, setDragging] = useState<FreshLineDrag | null>(null);
  const dirtyKinds = useMemo(() => changedLineKinds(initialLines, draftLines), [draftLines, initialLines]);
  const updateDraftLine = (kind: FreshGeometryRow["kind"], update: (line: FreshGeometryLineOverride) => FreshGeometryLineOverride) => {
    setDraftLines((current) => {
      const line = current[kind] ?? initialLines[kind];
      return line ? { ...current, [kind]: update(line) } : current;
    });
  };
  const beginLineDrag = (
    event: ReactPointerEvent<SVGLineElement>,
    kind: FreshGeometryRow["kind"],
    mode: FreshLineDrag["mode"],
  ) => {
    const svg = event.currentTarget.ownerSVGElement;
    const line = draftLines[kind];
    if (!svg || !line || lineRecalibrating) return;
    const pointer = normalizedPointer(event.clientX, event.clientY, svg);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({ initial: line, kind, mode, pointerId: event.pointerId, startX: pointer.x, startY: pointer.y });
  };
  const moveLineDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const pointer = normalizedPointer(event.clientX, event.clientY, event.currentTarget);
    event.preventDefault();
    const deltaX = pointer.x - dragging.startX;
    const deltaY = pointer.y - dragging.startY;
    if (dragging.mode === "left") {
      updateDraftLine(dragging.kind, () => ({
        ...dragging.initial,
        leftX: Math.max(0.005, Math.min(dragging.initial.rightX - 0.01, pointer.x)),
      }));
      return;
    }
    if (dragging.mode === "right") {
      updateDraftLine(dragging.kind, () => ({
        ...dragging.initial,
        rightX: Math.min(0.995, Math.max(dragging.initial.leftX + 0.01, pointer.x)),
      }));
      return;
    }
    const span = dragging.initial.rightX - dragging.initial.leftX;
    const leftX = Math.max(0.005, Math.min(0.995 - span, dragging.initial.leftX + deltaX));
    updateDraftLine(dragging.kind, () => ({
      leftX,
      rightX: leftX + span,
      y: Math.max(0.005, Math.min(0.995, dragging.initial.y + deltaY)),
    }));
  };
  const finishLineDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging?.pointerId === event.pointerId) setDragging(null);
  };
  return (
    <div className="space-y-5" data-testid="fresh-geometry-result">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><Check className="size-5 text-emerald-700" /><p className="mt-2 text-sm font-black text-emerald-950">Fresh ONNX loaded</p><p className="mt-1 text-xs text-emerald-700">371 independent outputs</p></div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><ScanLine className="size-5 text-blue-700" /><p className="mt-2 text-sm font-black text-blue-950">Fresh training</p><p className="mt-1 text-xs text-blue-700">{prediction.model.train.subjects.toLocaleString()} people · {prediction.model.train.records.toLocaleString()} views</p></div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><Box className="size-5 text-violet-700" /><p className="mt-2 text-sm font-black text-violet-950">WEAR validation</p><p className="mt-1 text-xs text-violet-700">{prediction.model.validation.subjects} unseen validation people</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><Camera className="size-5 text-amber-700" /><p className="mt-2 text-sm font-black text-amber-950">Camera fusion</p><p className="mt-1 text-xs text-amber-700">{fusion ? fusion.state === "failed" ? "Failed · raw ONNX remains" : `${cameraRowsApplied}/${prediction.rows.length} rows · ${fusion.state}${fusion.rowPositionSource === "manual" ? " · manual rows" : ""}` : "Not run"}</p></div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><AlertTriangle className="size-5 text-rose-700" /><p className="mt-2 text-sm font-black text-rose-950">Normal-photo proof</p><p className="mt-1 text-xs text-rose-700">Not validated yet · private test only</p></div>
      </section>

      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Exactly what ran</p>
        <p className="mt-2 text-sm font-black text-amber-950">{fusion && fusion.state !== "failed" ? `Photo segmentation → fresh ONNX rows${fusion.rowPositionSource === "manual" ? " → manual row edits" : ""} → Apple Vision camera scale → Depth Pro surface unprojection → fused A-to-B width → learned depth/width ratio sets hidden depth.` : "Photo segmentation → cleaned 192×256 silhouette → 96×128 fresh ONNX → raw rows, width, depth, shape, tape and ratios."}</p>
        <p className="mt-2 text-xs leading-5 text-amber-800">{fusion?.importantLimit ?? "Apple Vision and Depth Pro did not change these values."}</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Normal photo</p><h2 className="mt-1 text-xl font-black text-slate-950">Fresh ONNX row positions and A-to-B edges</h2></div>
            <p className="text-xs font-bold text-slate-500">{prediction.timing.inferenceMs.toFixed(1)} ms ONNX</p>
          </div>
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Normal photo with fresh model measurement rows" className="block h-auto w-full" src={imageUrl} />
            <svg className="absolute inset-0 size-full select-none" data-testid="fresh-editable-line-overlay" onPointerCancel={finishLineDrag} onPointerMove={moveLineDrag} onPointerUp={finishLineDrag} preserveAspectRatio="none" style={{ touchAction: "none" }} viewBox="0 0 1000 1000">
              {prediction.rows.map((row) => {
                const line = draftLines[row.kind];
                return line ? <g data-row-kind={row.kind} key={row.kind}>
                  <title>{`${row.label}: drag the middle to move; drag either invisible end zone to resize`}</title>
                  <line className="cursor-move" data-drag-mode="move" onPointerDown={(event) => beginLineDrag(event, row.kind, "move")} pointerEvents="stroke" stroke="rgba(0,0,0,0.001)" strokeWidth="36" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  <line pointerEvents="none" stroke="rgba(2,6,23,0.72)" strokeLinecap="butt" strokeWidth={strokeWidth + 5} x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  <line pointerEvents="none" stroke={row.color} strokeLinecap="butt" strokeWidth={strokeWidth} x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  <line className="cursor-ew-resize" data-drag-mode="left" onPointerDown={(event) => beginLineDrag(event, row.kind, "left")} pointerEvents="stroke" stroke="rgba(0,0,0,0.001)" strokeWidth="40" x1={line.leftX * 1000} x2={line.leftX * 1000} y1={(line.y * 1000) - 20} y2={(line.y * 1000) + 20} />
                  <line className="cursor-ew-resize" data-drag-mode="right" onPointerDown={(event) => beginLineDrag(event, row.kind, "right")} pointerEvents="stroke" stroke="rgba(0,0,0,0.001)" strokeWidth="40" x1={line.rightX * 1000} x2={line.rightX * 1000} y1={(line.y * 1000) - 20} y2={(line.y * 1000) + 20} />
                </g> : null;
              })}
            </svg>
            <p className="pointer-events-none absolute left-3 top-3 rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-[10px] font-black text-white">Mouse: drag line to move · drag either end to resize</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{prediction.rows.map((row) => <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-black" key={row.kind}><span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />{row.label}</span>)}</div>
          <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4" data-testid="fresh-line-editor">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-800"><SlidersHorizontal className="size-4" /> Manual line editor</p><p className="mt-1 text-xs font-black text-cyan-950">Use the mouse directly on the photo: drag the middle of a line to move it; drag either invisible end zone to resize A-to-B.</p><p className="mt-1 text-xs leading-5 text-cyan-900">The sliders below are optional fine controls. The preview changes immediately; measurements change only after recalculation.</p></div>
              <label className="min-w-44 text-xs font-black text-cyan-950"><span className="flex justify-between"><span>Visual thickness</span><span>{strokeWidth}px</span></span><input className="mt-2 w-full accent-cyan-700" max="12" min="2" onChange={(event) => setStrokeWidth(Number(event.target.value))} step="1" type="range" value={strokeWidth} /></label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {prediction.rows.map((row) => {
                const line = draftLines[row.kind];
                if (!line) return null;
                const center = (line.leftX + line.rightX) / 2;
                const span = line.rightX - line.leftX;
                return <div className="rounded-xl border border-cyan-200 bg-white p-3" key={row.kind}>
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-black" style={{ color: row.color }}>{row.label}</p><button className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-slate-900" onClick={() => { const original = initialLines[row.kind]; if (original) setDraftLines((current) => ({ ...current, [row.kind]: original })); }} type="button"><RotateCcw className="size-3" /> Reset row</button></div>
                  <label className="mt-3 block text-[11px] font-bold text-slate-600"><span className="flex justify-between"><span>Vertical position</span><span>{(line.y * 100).toFixed(1)}%</span></span><input aria-label={`${row.label} vertical position`} className="mt-1 w-full accent-cyan-700" data-testid={`fresh-line-y-${row.kind}`} max="99" min="1" onChange={(event) => updateDraftLine(row.kind, (current) => ({ ...current, y: Number(event.target.value) / 100 }))} step="0.1" type="range" value={line.y * 100} /></label>
                  <label className="mt-3 block text-[11px] font-bold text-slate-600"><span className="flex justify-between"><span>Horizontal center</span><span>{(center * 100).toFixed(1)}%</span></span><input aria-label={`${row.label} horizontal center`} className="mt-1 w-full accent-cyan-700" data-testid={`fresh-line-center-${row.kind}`} max="99" min="1" onChange={(event) => updateDraftLine(row.kind, (current) => centeredLine(current, Number(event.target.value) / 100, current.rightX - current.leftX))} step="0.1" type="range" value={center * 100} /></label>
                  <label className="mt-3 block text-[11px] font-bold text-slate-600"><span className="flex justify-between"><span>A-to-B span</span><span>{(span * 100).toFixed(1)}%</span></span><input aria-label={`${row.label} A-to-B span`} className="mt-1 w-full accent-cyan-700" data-testid={`fresh-line-span-${row.kind}`} max="95" min="2" onChange={(event) => updateDraftLine(row.kind, (current) => centeredLine(current, (current.leftX + current.rightX) / 2, Number(event.target.value) / 100))} step="0.1" type="range" value={span * 100} /></label>
                </div>;
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={cn("text-xs font-bold", dirtyKinds.length ? "text-amber-800" : "text-cyan-800")}>{dirtyKinds.length ? `${dirtyKinds.length} edited row${dirtyKinds.length === 1 ? "" : "s"} · displayed numbers are still the previous calculation` : fusion?.rowPositionSource === "manual" ? `Manual rows applied: ${fusion.manuallyEditedRows.join(", ")}` : "No manual changes"}</p>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-black text-cyan-900 disabled:opacity-40" disabled={!dirtyKinds.length || lineRecalibrating} onClick={() => setDraftLines(initialLines)} type="button">Reset pending changes</button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-black text-white disabled:bg-slate-300" data-testid="fresh-recalculate-lines" disabled={!dirtyKinds.length || lineRecalibrating} onClick={() => void onRecalculateLines(draftLines)} type="button">{lineRecalibrating ? <Loader2 className="size-4 animate-spin" /> : <Ruler className="size-4" />}{lineRecalibrating ? "Recalculating Apple + Depth Pro…" : "Apply rows and recalculate"}</button>
              </div>
            </div>
            {lineEditError ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800"><AlertTriangle className="mr-1 inline size-4" />{lineEditError}</p> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Exact model input</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Canonical silhouette</h2>
          <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Canonical body silhouette supplied to the fresh model" className="mx-auto max-h-[520px] w-auto" src={prediction.canonicalMaskDataUrl} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">Mask</dt><dd className="mt-1 font-black text-slate-950">192 × 256</dd></div>
            <div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">ONNX tensor</dt><dd className="mt-1 font-black text-slate-950">96 × 128</dd></div>
            <div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">BMI</dt><dd className="mt-1 font-black text-slate-950">{prediction.profile.bmi.toFixed(1)}</dd></div>
            <div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">Removed mask</dt><dd className="mt-1 font-black text-slate-950">{prediction.preprocessing.removedForegroundPixels.toLocaleString()} px</dd></div>
          </dl>
        </div>
      </section>

      {fusion ? (
        <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm" data-testid="fresh-camera-fusion">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200 bg-amber-50 p-5">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Apple Vision + Depth Pro</p><h2 className="mt-1 text-xl font-black text-amber-950">Post-ONNX camera and A-to-B fusion</h2><p className="mt-2 max-w-4xl text-xs leading-5 text-amber-800">The fresh model still chooses every anatomical row. Apple estimates the camera scale; Depth Pro reads the visible person surface at those endpoints. Hidden depth uses the learned depth/width ratio. Direct tape stays unchanged.</p></div>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-black uppercase", fusion.state === "applied" ? "bg-emerald-100 text-emerald-800" : fusion.state === "partial" ? "bg-amber-200 text-amber-900" : "bg-red-100 text-red-800")}>{fusion.state}{fusion.rowPositionSource === "manual" ? " · manual rows" : ""}</span>
          </div>
          <div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Apple geometry</p><p className="mt-1 text-sm font-black text-slate-950">{fusion.appleVision.geometryQuality ?? "—"}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Yaw</p><p className="mt-1 text-sm font-black text-slate-950">{fusion.appleVision.estimatedCameraYawDeg == null ? "—" : `${fusion.appleVision.estimatedCameraYawDeg.toFixed(2)}°`}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Pitch</p><p className="mt-1 text-sm font-black text-slate-950">{fusion.appleVision.estimatedCameraPitchDeg == null ? "—" : `${fusion.appleVision.estimatedCameraPitchDeg.toFixed(2)}°`}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Roll</p><p className="mt-1 text-sm font-black text-slate-950">{fusion.appleVision.estimatedCameraRollDeg == null ? "—" : `${fusion.appleVision.estimatedCameraRollDeg.toFixed(2)}°`}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Focal mismatch</p><p className="mt-1 text-sm font-black text-slate-950">{fusion.appleVision.focalMismatchPct == null ? "—" : `${fusion.appleVision.focalMismatchPct.toFixed(1)}%`}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Depth rows</p><p className="mt-1 text-sm font-black text-slate-950">{fusion.depthPro.validRows}/{fusion.depthPro.totalRows}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Row</th><th className="px-4 py-3">Raw ONNX width</th><th className="px-4 py-3">Apple width</th><th className="px-4 py-3">Depth Pro width</th><th className="px-4 py-3">Used width</th><th className="px-4 py-3">Raw depth</th><th className="px-4 py-3">Fused depth</th><th className="px-4 py-3">Source</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{fusion.rows.map((row) => {
                const definition = prediction.rows.find((candidate) => candidate.kind === row.kind);
                return <tr key={row.kind}><td className="px-4 py-3 font-black" style={{ color: definition?.color }}>{definition?.label ?? row.kind}</td><td className="px-4 py-3">{formatCm(row.rawWidthCm)}</td><td className="px-4 py-3">{formatCm(row.appleVisionWidthCm)}</td><td className="px-4 py-3">{formatCm(row.depthProWidthCm)}</td><td className="px-4 py-3 font-black text-amber-900">{formatCm(row.fusedWidthCm)}{row.widthChangePct == null ? "" : <span className="ml-1 text-[10px] text-slate-500">({row.widthChangePct >= 0 ? "+" : ""}{row.widthChangePct.toFixed(1)}%)</span>}</td><td className="px-4 py-3">{formatCm(row.rawDepthCm)}</td><td className="px-4 py-3 font-black text-violet-800">{formatCm(row.fusedDepthCm)}</td><td className="px-4 py-3"><span className="font-black">{fusionSourceLabel(row.widthSource)}</span><span className="ml-1 text-slate-500">· {row.confidence}</span></td></tr>;
              })}</tbody>
            </table>
          </div>
          {fusion.warnings.length ? <div className="border-t border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black text-amber-900">Review warnings</p><ul className="mt-2 space-y-1 text-xs text-amber-800">{fusion.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div> : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Fresh physical outputs</p><h2 className="mt-1 text-xl font-black text-slate-950">{fusion && fusion.state !== "failed" ? "Camera-fused width and depth · direct tape unchanged" : "Width, depth and direct tape predictions"}</h2><p className="mt-2 text-xs leading-5 text-slate-500">Tape is its own learned head. It is not calculated by walking the displayed shape and is not rescaled by Apple or Depth Pro.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Row</th><th className="px-5 py-3">{fusion && fusion.state !== "failed" ? "Fused A-to-B width" : "A-to-B width"}</th><th className="px-5 py-3">{fusion && fusion.state !== "failed" ? "Ratio-fused depth" : "Depth"}</th><th className="px-5 py-3">Learned depth / width</th><th className="px-5 py-3">Direct tape</th><th className="px-5 py-3">Known tape</th><th className="px-5 py-3">Difference</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{prediction.rows.map((row) => {
              const delta = difference(row.tapeCm, actuals[row.kind]);
              return <tr key={row.kind}><td className="px-5 py-4 font-black" style={{ color: row.color }}>{row.label}</td><td className="px-5 py-4 font-black text-slate-900">{formatCm(row.widthCm)}</td><td className="px-5 py-4 font-black text-slate-900">{formatCm(row.depthCm)}</td><td className="px-5 py-4 font-black text-slate-900">{row.depthWidthRatio == null ? "—" : row.depthWidthRatio.toFixed(3)}</td><td className="px-5 py-4 font-black text-cyan-800">{formatCm(row.tapeCm)}</td><td className="px-5 py-4 font-black text-slate-700">{formatCm(actuals[row.kind])}</td><td className={cn("px-5 py-4 font-black", delta == null ? "text-slate-400" : Math.abs(delta) <= 3 ? "text-emerald-700" : "text-red-700")}>{delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} cm`}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Predicted 3D geometry</p><h2 className="mt-1 text-xl font-black text-slate-950">Five independent 32-point body cross-sections</h2></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{prediction.rows.map((row) => <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={row.kind}><p className="text-sm font-black" style={{ color: row.color }}>{row.label}</p><p className="mt-1 text-xs text-slate-500">{formatCm(row.widthCm)} wide · {formatCm(row.depthCm)} deep</p><div className="mt-2"><CrossSection row={row} /></div></div>)}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Camera className="size-5 text-amber-600" /><h2 className="text-lg font-black">WEAR-taught camera outputs · diagnostic only</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">These fresh-model camera heads are displayed for comparison. The fusion above uses Apple Vision and Depth Pro instead of feeding these predictions back into the model.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(prediction.camera).map(([key, value]) => <div className="rounded-xl bg-slate-50 p-3" key={key}><p className="text-[11px] font-bold text-slate-500">{key.replaceAll("_", " ")}</p><p className="mt-1 text-sm font-black text-slate-950">{value == null ? "—" : value.toFixed(3)}</p></div>)}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Ruler className="size-5 text-blue-600" /><h2 className="text-lg font-black">Learned body ratios</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{prediction.ratios.map((ratio) => <div className="rounded-xl bg-slate-50 p-3" key={ratio.key}><p className="text-[11px] font-bold text-slate-500">{ratioLabel(ratio.key)}</p><p className="mt-1 text-sm font-black text-slate-950">{ratio.value == null ? "—" : ratio.value.toFixed(3)}</p></div>)}</div></div>
      </section>

      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">Review before believing the numbers</p><ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-rose-950">{prediction.preprocessing.warnings.map((warning) => <li className="flex gap-2" key={warning}><AlertTriangle className="mt-1 size-4 shrink-0 text-rose-600" />{warning}</li>)}</ul><p className="mt-4 text-xs leading-5 text-rose-800">Model hash: {prediction.model.sha256.slice(0, 16)}… · sealed 448 used: {prediction.model.sealedTestSubjectsUsed} · SDK ready: no</p></section>
    </div>
  );
}
