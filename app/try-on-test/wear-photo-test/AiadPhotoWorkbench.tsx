"use client";

import { AlertTriangle, Check, Expand, Hand, Info, Loader2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AiadOutputs } from "./AiadOutputs";
import {
  AIAD_MODE_LABELS, AIAD_ROW_ORDER, aiadGeometryPreview, aiadLines, aiadLinesKey, clampAiad, dragAiadLine, resizeAiadLine,
  type AiadCameraMode, type AiadDepthEdits, type AiadLineMap, type AiadRowKind,
} from "./aiadWorkbenchGeometry";
import type { AiadMeasure } from "./aiadPreprocessing";
import type { FreshGeometryLineOverride, FreshGeometryPrediction } from "./freshGeometryTypes";
import { useAiadCameraComparison, type AiadCalibrateLines } from "./useAiadCameraComparison";
import styles from "./AiadPhotoWorkbench.module.css";

interface Props {
  prediction: FreshGeometryPrediction;
  imageUrl: string;
  imageSize: { width: number; height: number };
  actuals: Partial<Record<AiadRowKind | AiadMeasure, number | null>>;
  cameraMode: AiadCameraMode;
  onCameraModeChange: (mode: AiadCameraMode) => void;
  onCalibrate: AiadCalibrateLines;
  onOpenProductSizes?: () => void;
}
type LineDrag = {
  kind: AiadRowKind; part: "move" | "left" | "right"; pointerId: number;
  x: number; y: number; width: number; height: number; initial: FreshGeometryLineOverride;
};
const cm = (value: number | null | undefined, digits = 1) => value != null && Number.isFinite(value) ? value.toFixed(digits) : "—";

export function AiadPhotoWorkbench({ prediction, imageUrl, imageSize, actuals, cameraMode, onCameraModeChange, onCalibrate, onOpenProductSizes }: Props) {
  const [lines, setLines] = useState(() => aiadLines(prediction));
  const linesRef = useRef(lines);
  const [depthEdits, setDepthEdits] = useState<AiadDepthEdits>({});
  const [activePart, setActivePart] = useState<AiadRowKind>("waist");
  const [fullScreen, setFullScreen] = useState(false);
  const [showAllLines, setShowAllLines] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ width: 600, height: 640 });
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lineDragRef = useRef<LineDrag | null>(null);
  const panDragRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const { cache, busyMode, errors, request, invalidate } = useAiadCameraComparison(onCalibrate);
  const originalLines = aiadLines(prediction);
  const preview = aiadGeometryPreview(prediction, lines, cameraMode, cache, depthEdits);
  const selected = preview.find((row) => row.kind === activePart) ?? preview[0];
  const currentSnapshot = cameraMode === "raw" ? undefined : cache[cameraMode];
  const snapshotIsCurrent = currentSnapshot && aiadLinesKey(currentSnapshot.lines) === aiadLinesKey(lines);
  const fusion = currentSnapshot?.prediction.cameraFusion;
  const busy = busyMode === cameraMode;
  const error = errors[cameraMode];
  const hasEdits = preview.some((row) => row.lineEdited || row.manualDepth);
  const aspect = Math.max(1, imageSize.width) / Math.max(1, imageSize.height);
  const fittedWidth = Math.max(1, Math.min(viewport.width - 32, (viewport.height - 32) * aspect));
  const photoWidth = fittedWidth * zoom;
  const photoHeight = photoWidth / aspect;
  const maxPanX = Math.max(0, (photoWidth - viewport.width) / 2 + 16);
  const maxPanY = Math.max(0, (photoHeight - viewport.height) / 2 + 16);
  const panX = clampAiad(pan.x, -maxPanX, maxPanX);
  const panY = clampAiad(pan.y, -maxPanY, maxPanY);

  // The mode can also be selected in the profile panel above the workbench.
  useEffect(() => { request(cameraMode, linesRef.current, true); }, [cameraMode, request]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) setViewport({ width: bounds.width, height: bounds.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fullScreen]);
  useEffect(() => {
    if (!fullScreen) return;
    const dialog = dialogRef.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      document.body.style.overflow = oldOverflow;
    };
  }, [fullScreen]);

  function updateLines(next: AiadLineMap, refresh: boolean) {
    linesRef.current = next;
    setLines(next);
    if (refresh) request(cameraMode, next);
  }
  function updateSelected(update: (line: FreshGeometryLineOverride) => FreshGeometryLineOverride) {
    const line = linesRef.current[activePart];
    if (line) updateLines({ ...linesRef.current, [activePart]: update(line) }, true);
  }
  function resetRow() {
    const original = originalLines[activePart];
    if (original) updateLines({ ...linesRef.current, [activePart]: { ...original } }, true);
    setDepthEdits((current) => { const next = { ...current }; delete next[activePart]; return next; });
  }
  function resetAll() {
    updateLines(aiadLines(prediction), true);
    setDepthEdits({});
  }
  function restoreOriginal() {
    invalidate();
    updateLines(aiadLines(prediction), false);
    setDepthEdits({});
    onCameraModeChange("raw");
  }
  function fitPhoto() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function beginDrag(event: ReactPointerEvent<SVGLineElement>, kind: AiadRowKind, part: LineDrag["part"]) {
    if (event.button !== 0) return;
    const line = linesRef.current[kind];
    const svg = event.currentTarget.ownerSVGElement;
    if (!line || !svg) return;
    event.preventDefault(); event.stopPropagation();
    invalidate();
    setActivePart(kind);
    const bounds = svg.getBoundingClientRect();
    lineDragRef.current = { kind, part, pointerId: event.pointerId, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, initial: { ...line } };
    svg.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = lineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    const next = dragAiadLine(drag.initial, drag.part, (event.clientX - drag.x) / Math.max(1, drag.width), (event.clientY - drag.y) / Math.max(1, drag.height));
    updateLines({ ...linesRef.current, [drag.kind]: next }, false);
  }
  function finishDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = lineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    lineDragRef.current = null;
    if (event.type === "pointercancel") updateLines({ ...linesRef.current, [drag.kind]: drag.initial }, false);
    request(cameraMode, linesRef.current);
  }
  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || lineDragRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX, panY };
  }
  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = panDragRef.current;
    if (drag?.pointerId === event.pointerId) setPan({ x: clampAiad(drag.panX + event.clientX - drag.x, -maxPanX, maxPanX), y: clampAiad(drag.panY + event.clientY - drag.y, -maxPanY, maxPanY) });
  }
  function finishPan() { panDragRef.current = null; }

  const editor = <section className={styles.workbench} data-testid="aiad-photo-workbench">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>Normal-photo workbench</p><h2>Photo & measurement editor</h2><p>Aiad’s original guides & model outputs · optional edits and camera comparisons</p></div>
      {onOpenProductSizes ? <button type="button" className={styles.button} onClick={() => { setFullScreen(false); onOpenProductSizes(); }}>Test this person’s product sizes</button> : null}
      <button type="button" className={`${styles.button} ${fullScreen ? "" : styles.primary}`} onClick={() => { fitPhoto(); setFullScreen(!fullScreen); }}>
        {fullScreen ? <X size={16} /> : <Expand size={16} />}{fullScreen ? "Close full screen" : "Open full screen"}
      </button>
    </header>
    <div className={styles.layout}>
      <section className={styles.photoPanel} aria-label="Photo and editable guides">
        <div className={styles.toolbar}>
          <div className={styles.tools}>
            <button className={styles.button} type="button" onClick={fitPhoto}>Fit photo</button>
            <button className={styles.button} type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => clampAiad(value - .25, 1, 4))}><Minus size={15} /></button>
            <span className={styles.zoom}>{Math.round(zoom * 100)}%</span>
            <button className={styles.button} type="button" aria-label="Zoom in" disabled={zoom >= 4} onClick={() => setZoom((value) => clampAiad(value + .25, 1, 4))}><Plus size={15} /></button>
          </div>
          <label className={styles.checkbox}><input checked={showAllLines} onChange={(event) => setShowAllLines(event.target.checked)} type="checkbox" />All body lines</label>
        </div>
        <div className={styles.stage} data-testid="aiad-photo-stage" ref={stageRef} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={finishPan} onPointerCancel={finishPan}>
          <div className={styles.photo} style={{ width: photoWidth, height: photoHeight, left: (viewport.width - photoWidth) / 2 + panX, top: (viewport.height - photoHeight) / 2 + panY }}>
            {/* Private, already-oriented photo; optimization would change the editor's source geometry. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Front photo for Aiad measurement editing" draggable={false} />
            <svg className={styles.overlay} data-testid="aiad-line-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
              {preview.filter((row) => showAllLines || row.kind === activePart).map((row) => {
                const line = row.line;
                if (!line) return null;
                const selectedRow = row.kind === activePart;
                const hitHalf = 13 / photoHeight * 1000;
                return <g key={row.kind} data-row-kind={row.kind}>
                  <title>{`${row.label}: drag the middle to move, or either end to resize`}</title>
                  <line data-drag-mode="move" onPointerDown={(event) => beginDrag(event, row.kind, "move")} style={{ cursor: "move" }} pointerEvents="stroke" stroke="transparent" strokeWidth="24" vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  <line pointerEvents="none" stroke="#0b1427c9" strokeWidth={strokeWidth + (selectedRow ? 3 : 2)} vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  <line pointerEvents="none" stroke={row.color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                  {(["left", "right"] as const).map((part) => <line key={part} data-drag-mode={part} onPointerDown={(event) => beginDrag(event, row.kind, part)} style={{ cursor: "ew-resize" }} pointerEvents="stroke" stroke="transparent" strokeWidth="28" vectorEffect="non-scaling-stroke" x1={line[part === "left" ? "leftX" : "rightX"] * 1000} x2={line[part === "left" ? "leftX" : "rightX"] * 1000} y1={line.y * 1000 - hitHalf} y2={line.y * 1000 + hitHalf} />)}
                </g>;
              })}
            </svg>
            {selected?.line ? <span className={styles.lineLabel} style={{ left: `${selected.line.rightX * 100}%`, top: `${selected.line.y * 100}%`, marginLeft: 9 }} data-testid="aiad-active-line-label">{selected.label} · {selected.lineEdited ? "manual guide" : "Aiad guide"}</span> : null}
          </div>
        </div>
        <footer className={styles.photoFooter}><strong>Drag the line</strong> to move it. <strong>Drag either end</strong> to change A–B width. No dots.<br /><Hand className="mr-1 inline" size={12} />Zoom in, then drag the photo background to pan. Original guides come from Aiad’s supplied helper.</footer>
      </section>
      <aside className={styles.sidebar} aria-label="Measurement controls">
        <section className={styles.section}>
          <div className={styles.sectionTitle}><p className={styles.sectionLabel}>Width / camera comparison</p><span className={styles.badge} data-testid="aiad-review-mode">{cameraMode !== "raw" || hasEdits ? "Our comparison" : prediction.aiad?.segmentation === "aiad-rembg-photo" ? "Original Aiad" : "Alternate mask input"}</span></div>
          <div className={styles.modeGroup} role="group" aria-label="Measurement source">
            {(["raw", "apple", "apple-depth"] as const).map((mode) => <button key={mode} type="button" className={styles.modeButton} aria-pressed={cameraMode === mode} onClick={() => onCameraModeChange(mode)}>{AIAD_MODE_LABELS[mode]}</button>)}
          </div>
          <p className={styles.note}>Use <strong>Original Aiad</strong> to judge his package. Apple / Depth Pro and manual previews are our optional tools, not his model’s results.</p>
          <p className={styles.status} role="status">{busy ? <Loader2 size={14} className="animate-spin" /> : cameraMode === "raw" ? <Info size={14} /> : currentSnapshot ? <Check size={14} /> : <Info size={14} />}
            {busy ? "Refreshing camera scale in the background. Keep editing; live preview stays available." : cameraMode === "raw" ? "Aiad width is the starting scale. Edited spans are a geometry preview, not new ONNX predictions." : currentSnapshot ? "Camera comparison available. Edited rows refresh automatically after you release the mouse." : "Camera result not available yet. Showing the Aiad-based preview."}
          </p>
          <div className={styles.actions}>
            <button className={styles.button} type="button" onClick={restoreOriginal} disabled={cameraMode === "raw" && !hasEdits}>Restore Aiad original</button>
            {cameraMode !== "raw" ? <button className={styles.button} type="button" disabled={busy} onClick={() => request(cameraMode, linesRef.current, true, true)}>{error ? "Retry camera" : "Refresh camera"}</button> : null}
          </div>
          {error ? <p className={styles.error} role="alert"><AlertTriangle size={13} className="mr-1 inline" />{error} Original tape is unchanged. The preview uses {currentSnapshot ? "the last successful calibration" : "Aiad scale"}.</p> : null}
        </section>
        <section className={`${styles.section} ${styles.bodySummary}`}>
          <div className={styles.sectionTitle}><p className={styles.sectionLabel}>Aiad tape · unchanged</p><span className={styles.badge}>Frozen model</span></div>
          <div className={styles.rowCards}>{(["waist", "hips"] as const).map((kind) => {
            const row = preview.find((item) => item.kind === kind);
            return row ? <button className={styles.rowCard} type="button" key={kind} aria-label={`Select ${kind}`} aria-pressed={activePart === kind} onClick={() => setActivePart(kind)}>
              <span className={styles.rowName}>{kind === "waist" ? "Waist" : "Hips"}</span><span className={styles.tape} data-testid={`aiad-tape-${kind}`}>{cm(row.tapeCm, 2)} <small>cm tape</small></span>
              <div className={styles.rowGeometry}>Live width <b data-testid={`aiad-width-${kind}`}>{cm(row.widthCm)} cm</b><br />Live depth <b data-testid={`aiad-depth-${kind}`}>{cm(row.depthCm)} cm</b></div>
            </button> : null;
          })}</div>
          <div className={styles.parts} role="group" aria-label="Select body row">{AIAD_ROW_ORDER.filter((kind) => kind !== "waist" && kind !== "hips" && preview.some((row) => row.kind === kind)).map((kind) => <button className={styles.partButton} type="button" key={kind} aria-pressed={activePart === kind} onClick={() => setActivePart(kind)}>{preview.find((row) => row.kind === kind)?.label}</button>)}</div>
        </section>
        {selected ? <>
          <section className={styles.section}>
            <div className={styles.sectionTitle}><h3>{selected.label} · live geometry</h3><span className={styles.badge}>{selected.manualDepth ? "Manual depth" : selected.scaledPreview ? "Preview" : "Baseline"}</span></div>
            <dl className={styles.metrics}>
              <div className={styles.metric}><dt>{cameraMode === "raw" && !selected.lineEdited ? "ONNX width" : "Width preview"}</dt><dd data-testid="aiad-selected-width">{cm(selected.widthCm)}<small>cm</small></dd></div>
              <div className={styles.metric}><dt>Front-to-back depth</dt><dd data-testid="aiad-selected-depth">{cm(selected.depthCm)}<small>cm</small></dd></div>
            </dl>
            <p className={styles.note} data-testid="aiad-preview-source">Width source: <strong>{AIAD_MODE_LABELS[selected.source]}{selected.scaledPreview ? " · span-scaled preview" : ""}{selected.fallback ? " · fallback" : ""}</strong>. Depth: {selected.manualDepth ? "your manual setting" : "Aiad depth/width ratio"}. Hidden depth is not directly scanned.</p>
            <p className={styles.note} data-testid="aiad-guide-provenance">Guide: <strong>{selected.lineEdited ? "your manual edit" : selected.line ? "Aiad’s original row_endpoints helper" : "unavailable in this saved result"}</strong>. Fixed height + silhouette edges, not learned anatomy.</p>
            {selected.originalEndpoints ? <p className={styles.note}>Original guide image width: <strong>{cm(selected.originalEndpoints.width_image_cm)} cm</strong>. Independent of the model width above.</p> : null}
            {selected.fallback && cameraMode !== "raw" ? <p className={styles.warning}>{selected.kind === "shoulder" ? "Our existing camera adapter does not support the shoulder row. Aiad’s original shoulder width is retained." : `${AIAD_MODE_LABELS[cameraMode]} has no current valid width for this row. ${AIAD_MODE_LABELS[selected.source]} is being used visibly as fallback.`}</p> : null}
            <div className={styles.numberGrid}>
              <label className={styles.fineControl}>Depth (cm)<input aria-label={`${selected.label} depth in cm`} className={styles.numberInput} type="number" min="1" max="100" step="0.1" value={selected.depthCm == null ? "" : Number(selected.depthCm.toFixed(2))} onChange={(event) => { const value = Number(event.target.value); if (event.target.value && Number.isFinite(value)) setDepthEdits((current) => ({ ...current, [activePart]: { type: "cm", value: clampAiad(value, 1, 100) } })); }} /></label>
              <label className={styles.fineControl}>Depth / width<input aria-label={`${selected.label} depth to width ratio`} className={styles.numberInput} type="number" min="0.2" max="2" step="0.01" value={selected.ratio == null ? "" : Number(selected.ratio.toFixed(3))} onChange={(event) => { const value = Number(event.target.value); if (event.target.value && Number.isFinite(value)) setDepthEdits((current) => ({ ...current, [activePart]: { type: "ratio", value: clampAiad(value, .2, 2) } })); }} /></label>
            </div>
            <label className={styles.fineControl}><span><span>Depth / width adjustment</span><span>{cm(selected.ratio, 3)}</span></span><input aria-label={`${selected.label} depth ratio slider`} type="range" min="0.2" max="2" step="0.005" value={selected.ratio ?? .75} onChange={(event) => setDepthEdits((current) => ({ ...current, [activePart]: { type: "ratio", value: Number(event.target.value) } }))} /></label>
            <div className={styles.actions}><button className={styles.button} type="button" disabled={!depthEdits[activePart]} onClick={() => setDepthEdits((current) => { const next = { ...current }; delete next[activePart]; return next; })}>Use Aiad depth ratio</button></div>
            <dl className={styles.comparison}>
              <div><dt>Original Aiad tape</dt><dd data-testid="aiad-selected-tape">{selected.tapeCm == null ? "Not provided for this row" : `${cm(selected.tapeCm, 2)} cm`}</dd></div>
              <div><dt>Known tape</dt><dd>{actuals[activePart] == null ? "—" : `${cm(actuals[activePart], 2)} cm`}</dd></div>
              <div><dt>Tape difference</dt><dd>{actuals[activePart] != null && selected.tapeCm != null ? `${selected.tapeCm - actuals[activePart]! >= 0 ? "+" : ""}${(selected.tapeCm - actuals[activePart]!).toFixed(2)} cm` : "—"}</dd></div>
            </dl>
            <p className={styles.note}>Line and depth edits do not enter Aiad’s ONNX or change this tape difference. No circumference is invented from the preview.</p>
            <details className={styles.details}><summary>Original {selected.label.toLowerCase()} outputs</summary>
              <p>ONNX width {cm(selected.rawWidthCm, 2)} cm · depth {cm(selected.rawDepthCm, 2)} cm. These are independently predicted, not calculated from the guide span.</p>
              {selected.originalEndpoints ? <>
                <p>Helper image width {cm(selected.originalEndpoints.width_image_cm)} cm · full image extent {cm(selected.originalEndpoints.full_extent_cm)} cm. The helper scales pixels by supplied height; it is not a camera-corrected measurement.</p>
                <p>Original 192×256 mask: row {selected.originalEndpoints.row_px}, A {selected.originalEndpoints.A_px}, B {selected.originalEndpoints.B_px}. Fixed guide height from floor: {cm(selected.originalEndpoints.row_cm_from_floor)} cm.</p>
              </> : <p>No original helper metadata was saved in this result. No replacement coordinates are invented.</p>}
            </details>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionTitle}><h3>Line position & width</h3><button className={styles.button} type="button" onClick={resetRow}><RotateCcw size={12} />Reset row</button></div>
            {selected.line ? <>
              <label className={styles.fineControl}><span><span>Vertical position</span><span data-testid="aiad-line-position">{(selected.line.y * 100).toFixed(1)}% of photo</span></span><input aria-label={`${selected.label} vertical position`} type="range" min="0.5" max="99.5" step="0.1" value={selected.line.y * 100} onChange={(event) => updateSelected((line) => ({ ...line, y: Number(event.target.value) / 100 }))} /></label>
              <label className={styles.fineControl}><span><span>A–B span</span><span>{((selected.line.rightX - selected.line.leftX) * 100).toFixed(1)}% of photo</span></span><input aria-label={`${selected.label} A-to-B span`} type="range" min="1" max="99" step="0.1" value={(selected.line.rightX - selected.line.leftX) * 100} onChange={(event) => updateSelected((line) => resizeAiadLine(line, Number(event.target.value) / 100))} /></label>
              <div className={styles.numberGrid}>
                <label className={styles.fineControl}>Left edge A (%)<input aria-label={`${selected.label} left edge percent`} className={styles.numberInput} type="number" min="0.5" max={(selected.line.rightX - .01) * 100} step="0.1" value={Number((selected.line.leftX * 100).toFixed(2))} onChange={(event) => { if (event.target.value) updateSelected((line) => ({ ...line, leftX: clampAiad(Number(event.target.value) / 100, .005, line.rightX - .01) })); }} /></label>
                <label className={styles.fineControl}>Right edge B (%)<input aria-label={`${selected.label} right edge percent`} className={styles.numberInput} type="number" min={(selected.line.leftX + .01) * 100} max="99.5" step="0.1" value={Number((selected.line.rightX * 100).toFixed(2))} onChange={(event) => { if (event.target.value) updateSelected((line) => ({ ...line, rightX: clampAiad(Number(event.target.value) / 100, line.leftX + .01, .995) })); }} /></label>
              </div>
            </> : <p className={styles.note}>No editable guide is available for this row.</p>}
            <p className={styles.note}>Moving a line changes its location. Resize its ends to change width; camera modes also resample scale at the new location.</p>
            <label className={styles.fineControl}><span><span>Line thickness</span><span>{strokeWidth}px</span></span><input aria-label="Measurement line thickness" type="range" min="1" max="6" step=".5" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /></label>
            <div className={styles.actions}><button className={styles.button} type="button" onClick={resetAll}><RotateCcw size={13} />Reset all edits</button></div>
          </section>
        </> : null}
        <details className={styles.details}><summary>Camera details & review warnings</summary>
          <p>Apple Vision estimates camera scale. Depth Pro samples visible surface distance; it does not directly measure the body’s hidden front-to-back thickness. The Mac camera worker and its USB runtime must be online.</p>
          {currentSnapshot && !snapshotIsCurrent ? <p className={styles.warning}>These details belong to the last completed camera comparison, before the latest line changes. They are not a completed result for the current endpoints.</p> : null}
          {fusion ? <><dl className={styles.angles}>{(["Yaw", "Pitch", "Roll"] as const).map((angle) => {
            const value = angle === "Yaw" ? fusion.appleVision.estimatedCameraYawDeg : angle === "Pitch" ? fusion.appleVision.estimatedCameraPitchDeg : fusion.appleVision.estimatedCameraRollDeg;
            return <div key={angle}><dt>{angle}</dt><dd>{value == null ? "—" : `${value.toFixed(1)}°`}</dd></div>;
          })}</dl><p>Geometry: {fusion.appleVision.geometryQuality ?? "unavailable"} · valid Depth Pro rows: {fusion.depthPro.validRows}/{fusion.depthPro.totalRows}.</p>{fusion.warnings.map((warning) => <p className={styles.warning} key={warning}>{warning}</p>)}</> : <p>No camera result selected.</p>}
          {prediction.preprocessing.warnings.map((warning) => <p className={styles.warning} key={warning}>{warning}</p>)}
        </details>
        <details className={styles.details}><summary>Original silhouette & model contract</summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.canonical} src={prediction.canonicalMaskDataUrl} alt="Unchanged canonical silhouette supplied to Aiad ONNX" />
          <p>The frozen model receives the front silhouette + height, weight and gender. It predicts tape, width/depth, uncertainty and shape code. Row positions and A/B coordinates are not ONNX outputs; Aiad’s separate helper uses fixed height ratios and silhouette edges.</p>
          <p>Original {prediction.profile.heightCm} cm · {prediction.profile.weightKg} kg · {prediction.profile.gender}. Model {prediction.model.sha256.slice(0, 16)}…</p>
        </details>
      </aside>
    </div>
  </section>;

  return <div>
    {!fullScreen ? editor : null}
    <dialog ref={dialogRef} className={styles.dialog} aria-label="Aiad full-screen measurement editor" data-testid="aiad-fullscreen" onCancel={(event) => { event.preventDefault(); setFullScreen(false); }} onClose={() => setFullScreen(false)}>{fullScreen ? editor : null}</dialog>
    <details className={styles.rawDetails}><summary>All original Aiad outputs · tape, uncertainty, width/depth, ratios & shape code</summary><div><AiadOutputs prediction={prediction} actuals={actuals} /></div></details>
  </div>;
}
