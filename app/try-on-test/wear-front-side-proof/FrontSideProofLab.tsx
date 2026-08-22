"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { outlineBounds, pairsFromFlat, type Point2 } from "../wear-mesh-overlay/geometry";
import { resizeClosedShapePerimeter } from "../wear-mesh-overlay/waistMatcher";
import styles from "./frontSideProof.module.css";

interface PhotoMesh {
  imageSize: [number, number];
  vertices: number[];
  triangles: number[];
  outline: number[];
}
interface Band { offsets: number[]; widthsCmEquivalent: number[] }
type ComparisonMode = "overlay" | "side-by-side";
type ComparisonView = "front" | "side";
const CROSS_SECTION_PARTS = ["neck", "chest", "underbust", "waist", "hips"] as const;
type RowKey = (typeof CROSS_SECTION_PARTS)[number];
const LANDMARK_LENGTH_PARTS = [
  "shoulders", "left_upper_arm", "right_upper_arm", "left_forearm", "right_forearm",
  "left_sleeve", "right_sleeve", "left_thigh", "right_thigh", "left_lower_leg",
  "right_lower_leg", "left_foot", "right_foot", "left_inseam", "right_inseam",
] as const;
type LandmarkLengthPart = (typeof LANDMARK_LENGTH_PARTS)[number];
const LANDMARK_PART_LABELS: Record<LandmarkLengthPart, string> = {
  shoulders: "Shoulders",
  left_upper_arm: "Left upper arm", right_upper_arm: "Right upper arm",
  left_forearm: "Left forearm", right_forearm: "Right forearm",
  left_sleeve: "Left sleeve", right_sleeve: "Right sleeve",
  left_thigh: "Left thigh", right_thigh: "Right thigh",
  left_lower_leg: "Left lower leg", right_lower_leg: "Right lower leg",
  left_foot: "Left foot", right_foot: "Right foot",
  left_inseam: "Left inseam", right_inseam: "Right inseam",
};
type SearchMode = "strict" | "all";
type MatchPart = RowKey;
const PART_LABELS: Record<RowKey, string> = {
  neck: "Neck",
  chest: "Chest",
  underbust: "Under-bust",
  waist: "Natural waist",
  hips: "Hips",
};
const SAFE_WEAR_SCAN_ID = /^(?:NA|NL|IT)-[0-9]{4}-A$/;

interface DisplayRow {
  key: RowKey;
  label: string;
  heightFractionFromFeet: number;
  valueCm: number;
}
interface Prediction {
  rank: number;
  scanId: string;
  heightCm: number;
  weightKg: number;
  frontErrorBodyHeight: number;
  sideErrorBodyHeight: number;
  frontShapeErrorBodyHeight: number;
  sideShapeErrorBodyHeight: number;
  frontRegionalErrorBodyHeight: number;
  sideRegionalErrorBodyHeight: number;
  worstViewErrorBodyHeight: number;
  combinedErrorBodyHeight: number;
  similarityWeight: number;
  waistRank: number | null;
  hipRank: number | null;
  predictedCircumferenceCm: number | null;
  predictedHipCircumferenceCm: number | null;
  rawCircumferenceCm: number | null;
  cameraCorrectedBreadthCm: number | null;
  cameraCorrectedDepthCm: number | null;
  shape32: Point2[];
  hipShape32: Point2[];
  wearSourceBreadthCm: number;
  wearSourceDepthCm: number;
  wearWaistHeightFractionFromFeet: number;
  wearHipHeightFractionFromFeet: number;
  wearHipBreadthCm: number;
  wearHipDepthCm: number;
  wearTapeCmRevealedAfterRank: number | null;
  wearHipTapeCmRevealedAfterRank: number | null;
  frontWidthsCm: number[];
  sideDepthsCm: number[];
}
interface PartCandidate {
  rank: number;
  scanId: string;
  heightCm: number;
  weightKg: number;
  frontErrorCm: number;
  sideErrorCm: number;
  combinedErrorCm: number;
  similarityWeight: number;
  wearSourceBreadthCm: number;
  wearSourceDepthCm: number;
  wearTapeCmRevealedAfterRank: number | null;
  shape32: Point2[];
  rowHeightFractionFromFeet: number | null;
}
interface PartMatch {
  label: string;
  mode: string;
  query: { heightFractionFromFeet: number; targetBreadthCm: number; targetDepthCm: number };
  candidateCount: number;
  comparisonCount: number;
  reliableCount: number;
  profileWindowCm: number | null;
  frontWidthGateSatisfied: boolean;
  bestScanId: string | null;
  candidateScanIds: string[];
  candidates: PartCandidate[];
}
interface LandmarkCandidate {
  rank: number;
  scanId: string;
  heightCm: number;
  weightKg: number;
  userLengthCm: number;
  wearLengthCm: number;
  differenceCm: number;
  absoluteErrorCm: number;
  similarityWeight: number;
  source: string;
}
interface LandmarkMatch {
  label: string;
  mode: string;
  candidateCount: number;
  comparisonCount?: number;
  profileWindowCm?: number | null;
  lengthGateSatisfied?: boolean;
  unavailable?: string;
  query?: { label: string; source: string; lengthCm: number; lengthBodyHeight: number };
  bestScanId?: string | null;
  candidateScanIds?: string[];
  candidates: LandmarkCandidate[];
}
interface MatchPayload {
  error?: string;
  cameraFit: {
    status: "accepted-angle-only" | "rejected";
    transform: {
      localVertexWarpUsed: boolean;
      nonUniformStretchUsed: boolean;
      meshVerticesModified: boolean;
    };
    angleValidation: {
      status: "accepted" | "rejected";
      maximumReferenceYawStdDeg: number;
      frontSideOrthogonalityErrorDeg: number;
      views: Record<string, {
        medianYawDeg: number;
        yawStandardDeviationDeg: number;
        yawMinDeg: number;
        yawMaxDeg: number;
        medianHeldOutLandmarkResidualCm: number;
      }>;
    };
    shapeValidation: { status: "rejected"; reason: string };
    measurementEffect: {
      observedFrontSpanCmEquivalent: number;
      observedSideSpanCmEquivalent: number;
      frontYawDeg: number;
      sideYawDeg: number;
      weightedCorrectedBreadthCm: number | null;
      weightedCorrectedDepthCm: number | null;
      rawPredictedCircumferenceCm: number | null;
      correctedPredictedCircumferenceCm: number | null;
      circumferenceChangeCm: number | null;
    };
    honestBoundary: string;
  } | null;
  geometry: {
    waistHeightFractionFromFeet: number;
    front: Band;
    side: Band;
    targetBreadthCm: number;
    targetDepthCm: number;
    subjectAdjustmentCm: number;
    hips: {
      heightFractionFromFeet: number;
      targetBreadthCm: number;
      targetDepthCm: number;
      source: string;
    };
  };
  ranking: {
    searchMode: SearchMode;
    eligibleCandidateCount: number;
    waistReliableCandidateCount: number;
    hipReliableCandidateCount: number;
    waistComparisonCandidateCount: number;
    hipComparisonCandidateCount: number;
    waistComparisonOnlyFallbackUsed: boolean;
    hipComparisonOnlyFallbackUsed: boolean;
    fullValidGeometryCount: number;
    excludedInvalidGeometryCount: number;
    strictCandidateCount: number;
    sliceCountPerView: number;
    comparisonCount: number;
    predictionNeighbourCount: number;
    waistCandidateScanIds: string[];
    hipCandidateScanIds: string[];
    bestWaistScanId: string | null;
    bestHipScanId: string | null;
    adaptiveProfileExpansionUsed: boolean;
    waistProfileWindowCm: number | null;
    hipProfileWindowCm: number | null;
    waistFrontWidthGateSatisfied: boolean;
    hipFrontWidthGateSatisfied: boolean;
    frontWidthMaximumErrorCm: number;
  };
  prediction: {
    predictedCircumferenceCm: number | null;
    predictedHipCircumferenceCm: number | null;
    rawPredictedCircumferenceCm: number | null;
    predictions: Prediction[];
  };
  bodyPartMatches: Partial<Record<RowKey, PartMatch>>;
  landmarkMatches: Partial<Record<LandmarkLengthPart, LandmarkMatch>>;
}

interface FrontSidePerson {
  setId: string;
  label: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  frontImageUrl: string;
  sideImageUrl: string;
}

const DEFAULT_FRONT_SIDE_PERSON: FrontSidePerson = {
  setId: "delaram",
  label: "Delaram · female · 168 cm · 70.80 kg",
  gender: "female",
  heightCm: 168,
  weightKg: 70.8,
  chestCm: 102,
  waistCm: 79,
  hipsCm: 102,
  frontImageUrl: "/try-on-test/sizing-lab/delaram-front.jpg",
  sideImageUrl: "/try-on-test/sizing-lab/delaram-side.jpg",
};

function personName(person: FrontSidePerson) {
  return person.label.split(" · ")[0] || person.setId;
}

function frontMeshId(person: FrontSidePerson) {
  const sourceName = person.frontImageUrl.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  return sourceName.replace(/-front$/, "") || person.setId;
}

function sideMeshId(person: FrontSidePerson) {
  const sourceName = person.sideImageUrl.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  return sourceName || `${person.setId}-side`;
}
interface WearModelPayload {
  error?: string;
  scanId: string;
  frontMesh: { verticesCm: Point2[]; triangles: Array<readonly [number, number, number]> };
  frontMetric: {
    profile: { heightCm: number; weightKg: number };
    frontProjection: {
      boundsCm: { minX: number; maxX: number; minZ: number; maxZ: number };
      outline: { pointsCm: Point2[] };
    };
    rows: Partial<Record<RowKey, {
      plane: { heightCm: number };
      breadthCm: number;
      depthCm: number;
      abBreadth: { frontProjectionCm: [Point2, Point2] };
      cdDepth: { cCanonicalCm: [number, number, number]; dCanonicalCm: [number, number, number] };
    }>>;
  };
  dual: {
    sideProjection: {
      boundsCm: { minY: number; maxY: number; minZ: number; maxZ: number };
      outlinePointsCm: Point2[];
      mesh: { verticesCm: Point2[]; triangles: Array<readonly [number, number, number]> };
    };
    waistBand: { slices: Array<{ heightCm: number }> };
  };
}

function scanline(points: readonly Point2[], y: number) {
  const values: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const [ax, ay] = points[index]!;
    const [bx, by] = points[(index + 1) % points.length]!;
    if (!((ay <= y && by > y) || (by <= y && ay > y))) continue;
    values.push(ax + (y - ay) / (by - ay) * (bx - ax));
  }
  values.sort((left, right) => left - right);
  let best: readonly [number, number] | null = null;
  for (let index = 0; index + 1 < values.length; index += 2) {
    const candidate = [values[index]!, values[index + 1]!] as const;
    if (!best || candidate[1] - candidate[0] > best[1] - best[0]) best = candidate;
  }
  return best;
}

interface ManualLine {
  left: number;
  right: number;
  y: number;
}

function defaultManualLine(mesh: PhotoMesh | null, row: DisplayRow | undefined): ManualLine | null {
  if (!mesh || !row) return null;
  const outline = pairsFromFlat(mesh.outline);
  const bounds = outlineBounds(outline);
  if (!bounds) return null;
  const y = bounds.maximumY - row.heightFractionFromFeet * (bounds.maximumY - bounds.minimumY);
  const interval = scanline(outline, y);
  return interval ? { left: interval[0], right: interval[1], y } : null;
}

function manualLineCentimetres(mesh: PhotoMesh | null, line: ManualLine | null, statureCm: number) {
  if (!mesh || !line) return null;
  const bounds = outlineBounds(pairsFromFlat(mesh.outline));
  if (!bounds) return null;
  const bodyHeightPx = (bounds.maximumY - bounds.minimumY) * mesh.imageSize[1];
  if (!(bodyHeightPx > 0)) return null;
  return Math.abs(line.right - line.left) * mesh.imageSize[0] * statureCm / bodyHeightPx;
}

function ManualPhotoLineEditor({
  view,
  mesh,
  line,
  rowKey,
  imageSrc,
  subjectName,
  statureCm,
  onChange,
  onReset,
}: {
  view: ComparisonView;
  mesh: PhotoMesh | null;
  line: ManualLine | null;
  rowKey: RowKey;
  imageSrc: string;
  subjectName: string;
  statureCm: number;
  onChange: (line: ManualLine) => void;
  onReset: () => void;
}) {
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    kind: "line" | "left" | "right";
    startX: number;
    startY: number;
    line: ManualLine;
  } | null>(null);
  const valueCm = manualLineCentimetres(mesh, line, statureCm);
  const outline = useMemo(() => mesh ? pairsFromFlat(mesh.outline) : [], [mesh]);
  const bounds = useMemo(() => outlineBounds(outline), [outline]);
  const centimetresPerNormalizedX = mesh && bounds
    ? mesh.imageSize[0] * statureCm / ((bounds.maximumY - bounds.minimumY) * mesh.imageSize[1])
    : null;

  useEffect(() => {
    const canvas = meshCanvasRef.current;
    if (!canvas || !mesh) return;
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      for (let index = 0; index + 2 < mesh.triangles.length; index += 3) {
        const a = mesh.triangles[index]! * 2;
        const b = mesh.triangles[index + 1]! * 2;
        const c = mesh.triangles[index + 2]! * 2;
        context.moveTo(mesh.vertices[a]! * canvas.width, mesh.vertices[a + 1]! * canvas.height);
        context.lineTo(mesh.vertices[b]! * canvas.width, mesh.vertices[b + 1]! * canvas.height);
        context.lineTo(mesh.vertices[c]! * canvas.width, mesh.vertices[c + 1]! * canvas.height);
        context.closePath();
      }
      context.strokeStyle = "rgba(34,211,238,.78)";
      context.lineWidth = Math.max(.35, .46 * ratio);
      context.shadowColor = "rgba(34,211,238,.65)";
      context.shadowBlur = 2 * ratio;
      context.stroke();

      if (mesh.outline.length >= 4) {
        context.beginPath();
        context.moveTo(mesh.outline[0]! * canvas.width, mesh.outline[1]! * canvas.height);
        for (let index = 2; index < mesh.outline.length; index += 2) {
          context.lineTo(mesh.outline[index]! * canvas.width, mesh.outline[index + 1]! * canvas.height);
        }
        context.closePath();
        context.strokeStyle = "rgba(74,222,128,.98)";
        context.lineWidth = Math.max(1.25, 1.7 * ratio);
        context.shadowColor = "rgba(74,222,128,.7)";
        context.shadowBlur = 3 * ratio;
        context.stroke();
      }
      context.shadowBlur = 0;
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mesh]);

  if (!mesh || !line || !bounds || !centimetresPerNormalizedX) {
    return <div className={styles.manualUnavailable}>{subjectName} mesh line is unavailable.</div>;
  }

  const clamp = (value: number, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));
  const pointerPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp((event.clientY - box.top) / box.height),
    };
  };
  const beginDrag = (kind: "line" | "left" | "right", event: ReactPointerEvent<SVGElement>) => {
    event.preventDefault();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    dragRef.current = {
      kind,
      startX: (event.clientX - box.left) / box.width,
      startY: (event.clientY - box.top) / box.height,
      line,
    };
    svg.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerPoint(event);
    if (drag.kind === "line") {
      const deltaX = point.x - drag.startX;
      const deltaY = point.y - drag.startY;
      const width = drag.line.right - drag.line.left;
      const left = clamp(drag.line.left + deltaX, 0, 1 - width);
      onChange({ left, right: left + width, y: clamp(drag.line.y + deltaY, bounds.minimumY, bounds.maximumY) });
      return;
    }
    if (drag.kind === "left") {
      onChange({ ...line, left: Math.min(point.x, line.right - .005) });
      return;
    }
    onChange({ ...line, right: Math.max(point.x, line.left + .005) });
  };
  const setLengthCm = (nextCm: number) => {
    const centre = (line.left + line.right) / 2;
    const width = clamp(nextCm / centimetresPerNormalizedX, .005, .96);
    const left = clamp(centre - width / 2, 0, 1 - width);
    onChange({ ...line, left, right: left + width });
  };
  const snapToOutline = () => {
    const interval = scanline(outline, line.y);
    if (interval) onChange({ ...line, left: interval[0], right: interval[1] });
  };
  const imageWidth = mesh.imageSize[0];
  const imageHeight = mesh.imageSize[1];
  const lineColor = rowKey === "waist" ? "#facc15" : "#f472b6";

  return (
    <div className={styles.manualEditor}>
      <div className={styles.manualPhotoStage} style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}>
        <Image src={imageSrc} alt={`${subjectName} ${view} adjustable ${rowKey} line`} fill sizes="(max-width: 900px) 100vw, 55vw" />
        <canvas ref={meshCanvasRef} aria-label={`${subjectName} ${view} Blender 2D mesh`} />
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
          onPointerMove={moveDrag}
          onPointerUp={(event) => { dragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { dragRef.current = null; }}
          aria-label={`Adjust ${subjectName} ${view} ${rowKey} line`}
        >
          <line
            x1={line.left * imageWidth}
            x2={line.right * imageWidth}
            y1={line.y * imageHeight}
            y2={line.y * imageHeight}
            stroke={lineColor}
            strokeWidth="7"
            vectorEffect="non-scaling-stroke"
            onPointerDown={(event) => beginDrag("line", event)}
          />
        </svg>
      </div>
      <div className={styles.manualControls}>
        <div><span>Live {subjectName} {view === "front" ? "width A–B" : "depth C–D"}</span><strong>{valueCm?.toFixed(2)} cm</strong></div>
        <label>
          <span>Move line up/down</span>
          <input
            type="range"
            min={bounds.minimumY}
            max={bounds.maximumY}
            step="0.001"
            value={line.y}
            onChange={(event) => onChange({ ...line, y: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>Make line shorter/longer</span>
          <input
            type="range"
            min="5"
            max={view === "front" ? "60" : "45"}
            step="0.05"
            value={valueCm ?? 0}
            onChange={(event) => setLengthCm(Number(event.target.value))}
          />
        </label>
        <div className={styles.manualButtons}>
          <button type="button" onClick={() => setLengthCm(Math.max(5, (valueCm ?? 5) - .5))}>Shorter −0.5 cm</button>
          <button type="button" onClick={() => setLengthCm(Math.min(view === "front" ? 60 : 45, (valueCm ?? 5) + .5))}>Longer +0.5 cm</button>
          <button type="button" onClick={snapToOutline}>Snap to mesh edges</button>
          <button type="button" onClick={onReset}>Reset line</button>
        </div>
        <small>The line starts on the exact hidden Blender-outline edges. Drag the line to move it; use the slider or buttons to change its length.</small>
      </div>
    </div>
  );
}

function PhotoMeshCard({
  title,
  src,
  mesh,
  rawMesh,
  rows,
  valueLabel,
  color,
}: {
  title: string;
  src: string;
  mesh: PhotoMesh | null;
  rawMesh?: PhotoMesh | null;
  rows: readonly DisplayRow[];
  valueLabel: string;
  color: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return;
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const drawMesh = (value: PhotoMesh, stroke: string, dashed: boolean) => {
        context.beginPath();
        for (let index = 0; index + 2 < value.triangles.length; index += 3) {
          const ids = [value.triangles[index]!, value.triangles[index + 1]!, value.triangles[index + 2]!];
          const points = ids.map((id) => [value.vertices[id * 2]! * canvas.width, value.vertices[id * 2 + 1]! * canvas.height] as const);
          context.moveTo(points[0]![0], points[0]![1]);
          context.lineTo(points[1]![0], points[1]![1]);
          context.lineTo(points[2]![0], points[2]![1]);
          context.closePath();
        }
        context.setLineDash(dashed ? [4 * ratio, 4 * ratio] : []);
        context.strokeStyle = stroke;
        context.lineWidth = Math.max(0.45, ratio * 0.45);
        context.stroke();
      };
      if (rawMesh) drawMesh(rawMesh, "rgba(226,232,240,.34)", true);
      drawMesh(mesh, `${color}c9`, false);
      context.setLineDash([]);
      const outline = pairsFromFlat(mesh.outline);
      const bounds = outlineBounds(outline);
      if (!bounds) return;
      for (const row of rows) {
        const y = bounds.maximumY - row.heightFractionFromFeet * (bounds.maximumY - bounds.minimumY);
        const interval = scanline(outline, y);
        if (!interval) continue;
        const isWaist = row.key === "waist";
        context.beginPath();
        context.moveTo(interval[0] * canvas.width, y * canvas.height);
        context.lineTo(interval[1] * canvas.width, y * canvas.height);
        context.setLineDash(isWaist ? [] : [8 * ratio, 5 * ratio]);
        context.strokeStyle = isWaist ? "#facc15" : "#f472b6";
        context.lineWidth = 3 * ratio;
        context.stroke();

        const label = `${row.label} ${row.valueCm.toFixed(2)} cm`;
        context.setLineDash([]);
        context.font = `800 ${Math.max(12, 12 * ratio)}px system-ui`;
        const textWidth = context.measureText(label).width;
        const labelX = Math.max(6 * ratio, interval[0] * canvas.width);
        const labelY = Math.max(20 * ratio, y * canvas.height - 8 * ratio);
        context.fillStyle = "rgba(2,6,23,.88)";
        context.fillRect(labelX - 4 * ratio, labelY - 15 * ratio, textWidth + 8 * ratio, 20 * ratio);
        context.fillStyle = isWaist ? "#fde68a" : "#fbcfe8";
        context.fillText(label, labelX, labelY);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [color, mesh, rawMesh, rows]);
  return (
    <article className={styles.photoCard}>
      <header><strong>{title}</strong><span>{valueLabel}</span></header>
      <div className={styles.photoStage}>
        <Image src={src} alt={title} fill sizes="(max-width: 900px) 100vw, 38vw" />
        <canvas ref={canvasRef} />
      </div>
      <footer><b>Solid yellow</b> = predicted waist row · <b>pink dashed</b> = WEAR-guided hip row.</footer>
    </article>
  );
}

function RealPhotoLinePanel({
  src,
  mesh,
  rows,
  view,
  subjectName,
}: {
  src: string;
  mesh: PhotoMesh | null;
  rows: readonly DisplayRow[];
  view: ComparisonView;
  subjectName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return;
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const [imageWidth, imageHeight] = mesh.imageSize;
      const containScale = Math.min(canvas.width / imageWidth, canvas.height / imageHeight);
      const shownWidth = imageWidth * containScale;
      const shownHeight = imageHeight * containScale;
      const offsetX = (canvas.width - shownWidth) / 2;
      const offsetY = (canvas.height - shownHeight) / 2;
      const map = ([x, y]: Point2) => [offsetX + x * shownWidth, offsetY + y * shownHeight] as const;
      const outline = pairsFromFlat(mesh.outline);
      const bounds = outlineBounds(outline);
      if (!bounds) return;

      for (const row of rows) {
        const y = bounds.maximumY - row.heightFractionFromFeet * (bounds.maximumY - bounds.minimumY);
        const interval = scanline(outline, y);
        if (!interval) continue;
        const left = map([interval[0], y]);
        const right = map([interval[1], y]);
        const isWaist = row.key === "waist";
        context.beginPath();
        context.setLineDash(isWaist ? [] : [8 * ratio, 5 * ratio]);
        context.moveTo(left[0], left[1]);
        context.lineTo(right[0], right[1]);
        context.strokeStyle = isWaist ? "#facc15" : "#f472b6";
        context.lineWidth = 3 * ratio;
        context.stroke();
        context.setLineDash([]);

        const label = `WEAR-guided ${row.key} · ${subjectName} ${row.valueCm.toFixed(2)} cm`;
        context.font = `800 ${Math.max(12, 12 * ratio)}px system-ui`;
        const textWidth = context.measureText(label).width;
        const labelX = Math.max(6 * ratio, Math.min(left[0], canvas.width - textWidth - 10 * ratio));
        const labelY = Math.max(20 * ratio, left[1] - 8 * ratio);
        context.fillStyle = "rgba(2,6,23,.9)";
        context.fillRect(labelX - 4 * ratio, labelY - 15 * ratio, textWidth + 8 * ratio, 20 * ratio);
        context.fillStyle = isWaist ? "#fde68a" : "#fbcfe8";
        context.fillText(label, labelX, labelY);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mesh, rows, subjectName]);

  return (
    <div className={styles.realPhotoStage}>
      <Image
        src={src}
        alt={`Real ${subjectName} ${view} photo with WEAR-guided waist and hip lines`}
        fill
        priority
        sizes="(max-width: 900px) 100vw, 50vw"
      />
      <canvas ref={canvasRef} />
    </div>
  );
}

interface CanonicalRow {
  key: RowKey;
  label: string;
  left: number;
  right: number;
  height: number;
  valueCm: number;
}

interface CanonicalMesh {
  vertices: Point2[];
  triangles: Array<readonly [number, number, number]>;
  outline: Point2[];
  rows: CanonicalRow[];
}

function canonicalPhotoMesh(
  mesh: PhotoMesh,
  rows: readonly DisplayRow[],
  alignRow: RowKey,
  statureCm = 168,
  activeLine?: ManualLine | null,
  activeLineValueCm?: number | null,
): CanonicalMesh | null {
  const outlinePixels = pairsFromFlat(mesh.outline).map(([x, y]) => (
    [x * mesh.imageSize[0], y * mesh.imageSize[1]] as Point2
  ));
  const bounds = outlineBounds(outlinePixels);
  if (!bounds) return null;
  const bodyHeight = bounds.maximumY - bounds.minimumY;
  if (!(bodyHeight > 0)) return null;
  const anchor = rows.find((row) => row.key === alignRow);
  if (!anchor) return null;
  const anchorY = activeLine
    ? activeLine.y * mesh.imageSize[1]
    : bounds.maximumY - anchor.heightFractionFromFeet * bodyHeight;
  const anchorInterval = activeLine
    ? [activeLine.left * mesh.imageSize[0], activeLine.right * mesh.imageSize[0]] as const
    : scanline(outlinePixels, anchorY);
  const centreX = anchorInterval
    ? (anchorInterval[0] + anchorInterval[1]) / 2
    : (bounds.minimumX + bounds.maximumX) / 2;
  const centimetresPerPixel = statureCm / bodyHeight;
  const vertices = Array.from({ length: mesh.vertices.length / 2 }, (_, index) => {
    const x = mesh.vertices[index * 2]! * mesh.imageSize[0];
    const y = mesh.vertices[index * 2 + 1]! * mesh.imageSize[1];
    return [(x - centreX) * centimetresPerPixel, (bounds.maximumY - y) * centimetresPerPixel] as Point2;
  });
  const outline = outlinePixels.map(([x, y]) => (
    [(x - centreX) * centimetresPerPixel, (bounds.maximumY - y) * centimetresPerPixel] as Point2
  ));
  const triangles = Array.from({ length: mesh.triangles.length / 3 }, (_, index) => (
    [mesh.triangles[index * 3]!, mesh.triangles[index * 3 + 1]!, mesh.triangles[index * 3 + 2]!] as const
  ));
  const canonicalRows = rows.flatMap((row): CanonicalRow[] => {
    const rowUsesActiveLine = row.key === alignRow && activeLine;
    const y = rowUsesActiveLine
      ? activeLine.y * mesh.imageSize[1]
      : bounds.maximumY - row.heightFractionFromFeet * bodyHeight;
    const interval = rowUsesActiveLine
      ? [activeLine.left * mesh.imageSize[0], activeLine.right * mesh.imageSize[0]] as const
      : scanline(outlinePixels, y);
    if (!interval) return [];
    return [{
      key: row.key,
      label: row.label,
      left: (interval[0] - centreX) * centimetresPerPixel,
      right: (interval[1] - centreX) * centimetresPerPixel,
      height: (bounds.maximumY - y) * centimetresPerPixel,
      valueCm: rowUsesActiveLine && activeLineValueCm != null ? activeLineValueCm : row.valueCm,
    }];
  });
  return { vertices, triangles, outline, rows: canonicalRows };
}

function canonicalWearMesh(payload: WearModelPayload, view: ComparisonView, alignRow: RowKey): CanonicalMesh | null {
  const frontBounds = payload.frontMetric.frontProjection.boundsCm;
  const sideBounds = payload.dual.sideProjection.boundsCm;
  const minimumZ = view === "front" ? frontBounds.minZ : sideBounds.minZ;
  const maximumZ = view === "front" ? frontBounds.maxZ : sideBounds.maxZ;
  const bodyHeight = maximumZ - minimumZ;
  if (!(bodyHeight > 0)) return null;
  const anchorRow = payload.frontMetric.rows[alignRow];
  if (!anchorRow) return null;
  const centreX = view === "front"
    ? (anchorRow.abBreadth.frontProjectionCm[0][0] + anchorRow.abBreadth.frontProjectionCm[1][0]) / 2
    : (anchorRow.cdDepth.cCanonicalCm[1] + anchorRow.cdDepth.dCanonicalCm[1]) / 2;
  // Delaram's side photo faces left. Mirroring the orthographic WEAR side
  // projection is the equivalent opposite-side camera view; it changes no
  // distance, vertex, or measurement.
  const direction = view === "side" ? -1 : 1;
  const mesh = view === "front" ? payload.frontMesh : payload.dual.sideProjection.mesh;
  const vertices = mesh.verticesCm.map(([x, z]) => (
    [(x - centreX) * direction, z - minimumZ] as Point2
  ));
  const sourceOutline = view === "front"
    ? payload.frontMetric.frontProjection.outline.pointsCm
    : payload.dual.sideProjection.outlinePointsCm;
  const outline = sourceOutline.map(([x, z]) => (
    [(x - centreX) * direction, z - minimumZ] as Point2
  ));
  const rows = CROSS_SECTION_PARTS.flatMap((key): CanonicalRow[] => {
    const row = payload.frontMetric.rows[key];
    if (!row) return [];
    const endpoints = view === "front"
      ? [row.abBreadth.frontProjectionCm[0][0], row.abBreadth.frontProjectionCm[1][0]]
      : [row.cdDepth.cCanonicalCm[1], row.cdDepth.dCanonicalCm[1]];
    return [{
      key,
      label: PART_LABELS[key],
      left: Math.min(...endpoints.map((value) => (value - centreX) * direction)),
      right: Math.max(...endpoints.map((value) => (value - centreX) * direction)),
      height: row.plane.heightCm - minimumZ,
      valueCm: view === "front" ? row.breadthCm : row.depthCm,
    }];
  });
  return { vertices, triangles: mesh.triangles, outline, rows };
}

function MeshCompareCanvas({
  photoMesh,
  wearModel,
  photoRows,
  view,
  owner,
  zoom,
  showRows,
  alignRow,
  visibleRow,
  statureCm = 168,
  subjectName = "Person",
  photoLine,
  photoLineValueCm,
}: {
  photoMesh: PhotoMesh | null;
  wearModel: WearModelPayload | null;
  photoRows: readonly DisplayRow[];
  view: ComparisonView;
  owner: "both" | "delaram" | "wear";
  zoom: number;
  showRows: boolean;
  alignRow: RowKey;
  visibleRow?: RowKey;
  statureCm?: number;
  subjectName?: string;
  photoLine?: ManualLine | null;
  photoLineValueCm?: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photoMesh || !wearModel) return;
    const delaram = canonicalPhotoMesh(photoMesh, photoRows, alignRow, statureCm, photoLine, photoLineValueCm);
    const wear = canonicalWearMesh(wearModel, view, alignRow);
    if (!delaram || !wear) return;
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const top = 34 * ratio;
      const bottom = 24 * ratio;
      const visibleMeshes = owner === "both" ? [delaram, wear] : owner === "delaram" ? [delaram] : [wear];
      const delaramAnchor = delaram.rows.find((row) => row.key === alignRow);
      const wearAnchor = wear.rows.find((row) => row.key === alignRow);
      const wearVerticalShift = delaramAnchor && wearAnchor ? delaramAnchor.height - wearAnchor.height : 0;
      const shiftedVertices = visibleMeshes.flatMap((mesh) => mesh.vertices.map(([x, z]) => (
        [x, z + (mesh === wear ? wearVerticalShift : 0)] as Point2
      )));
      const maximumAbsoluteX = Math.max(
        .01,
        ...shiftedVertices.map(([x]) => Math.abs(x)),
      );
      const minimumZ = Math.min(...shiftedVertices.map(([, z]) => z));
      const maximumZ = Math.max(...shiftedVertices.map(([, z]) => z));
      const heightScale = Math.max(1, canvas.height - top - bottom) / Math.max(1, maximumZ - minimumZ);
      const labelGutter = showRows ? Math.min(180 * ratio, canvas.width * .24) : 16 * ratio;
      const widthScale = Math.max(1, canvas.width - labelGutter * 2) / (maximumAbsoluteX * 2);
      // Use one uniform scale for both axes. Narrow side-by-side panels now fit
      // the full body instead of clipping it, without stretching either mesh.
      const scale = Math.min(heightScale, widthScale) * zoom;
      const map = ([x, z]: Point2, mesh: CanonicalMesh) => {
        const shiftedZ = z + (mesh === wear ? wearVerticalShift : 0);
        const centreZ = (minimumZ + maximumZ) / 2;
        return [canvas.width / 2 + x * scale, canvas.height / 2 - (shiftedZ - centreZ) * scale] as const;
      };
      const drawMesh = (mesh: CanonicalMesh, color: string, alpha: number, dashedOutline: boolean) => {
        context.beginPath();
        for (const triangle of mesh.triangles) {
          const a = map(mesh.vertices[triangle[0]]!, mesh);
          const b = map(mesh.vertices[triangle[1]]!, mesh);
          const c = map(mesh.vertices[triangle[2]]!, mesh);
          context.moveTo(a[0], a[1]);
          context.lineTo(b[0], b[1]);
          context.lineTo(c[0], c[1]);
          context.closePath();
        }
        context.strokeStyle = color;
        context.globalAlpha = alpha;
        context.lineWidth = Math.max(.5, .55 * ratio);
        context.stroke();
        context.globalAlpha = 1;
        if (mesh.outline.length > 1) {
          context.beginPath();
          const first = map(mesh.outline[0]!, mesh);
          context.moveTo(first[0], first[1]);
          for (const point of mesh.outline.slice(1)) {
            const shown = map(point, mesh);
            context.lineTo(shown[0], shown[1]);
          }
          context.closePath();
          context.setLineDash(dashedOutline ? [9 * ratio, 7 * ratio] : []);
          context.strokeStyle = color;
          context.lineWidth = 2.5 * ratio;
          context.shadowColor = color;
          context.shadowBlur = 7 * ratio;
          context.stroke();
          context.shadowBlur = 0;
          context.setLineDash([]);
        }
      };
      const drawRows = (mesh: CanonicalMesh, color: string, prefix: string, labelSide: "left" | "right", dashed: boolean) => {
        for (const row of mesh.rows.filter((candidate) => !visibleRow || candidate.key === visibleRow)) {
          const left = map([row.left, row.height], mesh);
          const right = map([row.right, row.height], mesh);
          context.beginPath();
          context.setLineDash(dashed ? [9 * ratio, 6 * ratio] : []);
          context.moveTo(left[0], left[1]);
          context.lineTo(right[0], right[1]);
          context.strokeStyle = color;
          context.lineWidth = 3 * ratio;
          context.stroke();
          context.setLineDash([]);
          const label = `${prefix} ${row.label} · ${row.valueCm.toFixed(2)} cm`;
          context.font = `800 ${Math.max(12, 12 * ratio)}px system-ui`;
          const textWidth = context.measureText(label).width;
          const x = labelSide === "left"
            ? Math.max(5 * ratio, left[0] - textWidth - 13 * ratio)
            : Math.min(canvas.width - textWidth - 5 * ratio, right[0] + 13 * ratio);
          const y = Math.max(20 * ratio, Math.min(canvas.height - 7 * ratio, left[1] + 5 * ratio));
          context.fillStyle = "rgba(2,6,23,.9)";
          context.fillRect(x - 4 * ratio, y - 15 * ratio, textWidth + 8 * ratio, 20 * ratio);
          context.fillStyle = color;
          context.fillText(label, x, y);
        }
      };
      if (owner !== "wear") drawMesh(delaram, "#22d3ee", owner === "both" ? .58 : .82, false);
      if (owner !== "delaram") drawMesh(wear, "#fb923c", owner === "both" ? .58 : .82, owner === "both");
      if (showRows && owner !== "wear") drawRows(delaram, "#f472b6", subjectName, "left", false);
      if (showRows && owner !== "delaram") drawRows(wear, "#facc15", "WEAR", "right", true);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [alignRow, owner, photoLine, photoLineValueCm, photoMesh, photoRows, showRows, statureCm, subjectName, view, visibleRow, wearModel, zoom]);
  return <canvas ref={canvasRef} className={styles.compareCanvas} />;
}

function ViewComparison({
  mode,
  view,
  photoMesh,
  wearModel,
  photoRows,
  zoom,
  alignRow,
  photoSrc,
  subjectName,
  onModeChange,
}: {
  mode: ComparisonMode;
  view: ComparisonView;
  photoMesh: PhotoMesh | null;
  wearModel: WearModelPayload | null;
  photoRows: readonly DisplayRow[];
  zoom: number;
  alignRow: RowKey;
  photoSrc: string;
  subjectName: string;
  onModeChange: (mode: ComparisonMode) => void;
}) {
  const title = view === "front" ? "Front view" : "Side view";
  return (
    <article className={styles.compareViewCard}>
      <header className={styles.compareViewHeader}>
        <div><strong>{title}</strong><span>Same cm scale · {alignRow} centres locked</span></div>
        <div className={styles.viewModeSwitch} aria-label={`${title} comparison layout`}>
          <button type="button" data-active={mode === "overlay"} onClick={() => onModeChange("overlay")}>Overlay</button>
          <button type="button" data-active={mode === "side-by-side"} onClick={() => onModeChange("side-by-side")}>Side by side</button>
        </div>
      </header>
      <div className={styles.compareModeStack}>
        <div className={styles.compareModeLayer} data-active={mode === "overlay"} aria-hidden={mode !== "overlay"}>
          <div className={styles.compareCanvasStage}>
            <MeshCompareCanvas photoMesh={photoMesh} wearModel={wearModel} photoRows={photoRows} view={view} owner="both" zoom={zoom} showRows={false} alignRow={alignRow} />
          </div>
        </div>
        <div className={styles.compareModeLayer} data-active={mode === "side-by-side"} aria-hidden={mode !== "side-by-side"}>
          <div className={styles.splitCanvasStage}>
            <div><b>Real {subjectName} photo · WEAR-guided rows</b><RealPhotoLinePanel src={photoSrc} mesh={photoMesh} rows={photoRows} view={view} subjectName={subjectName} /></div>
            <div><b>Exact selected WEAR PLY</b><MeshCompareCanvas photoMesh={photoMesh} wearModel={wearModel} photoRows={photoRows} view={view} owner="wear" zoom={zoom} showRows alignRow={alignRow} /></div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DifferenceCard({
  title,
  subjectName,
  delaramFront,
  wearFront,
  delaramSide,
  wearSide,
}: {
  title: string;
  subjectName: string;
  delaramFront: number;
  wearFront: number;
  delaramSide: number;
  wearSide: number;
}) {
  const row = (label: string, delaram: number, wear: number) => {
    const difference = delaram - wear;
    const direction = Math.abs(difference) < .005 ? "same" : difference > 0 ? "larger" : "smaller";
    return (
      <div>
        <b>{label}</b>
        <span><small>{subjectName}</small><strong>{delaram.toFixed(2)} cm</strong></span>
        <span><small>WEAR</small><strong>{wear.toFixed(2)} cm</strong></span>
        <em data-direction={direction}>{difference >= 0 ? "+" : ""}{difference.toFixed(2)} cm · {subjectName} {direction}</em>
      </div>
    );
  };
  return (
    <article className={styles.differenceCard}>
      <header><strong>{title}</strong><span>Visible A–B/C–D difference</span></header>
      {row("Front width", delaramFront, wearFront)}
      {row("Side depth", delaramSide, wearSide)}
    </article>
  );
}

export function FrontSideProofLab() {
  const [people, setPeople] = useState<FrontSidePerson[]>([DEFAULT_FRONT_SIDE_PERSON]);
  const [selectedPersonId, setSelectedPersonId] = useState(DEFAULT_FRONT_SIDE_PERSON.setId);
  const [buildingPair, setBuildingPair] = useState(false);
  const [meshRevision, setMeshRevision] = useState(0);
  const [searchMode, setSearchMode] = useState<SearchMode>("strict");
  // Start with the requested one-centimetre correction on the user's own
  // front/side measurements. WEAR geometry remains unchanged server-side.
  const [subjectAdjustmentCm, setSubjectAdjustmentCm] = useState(-1);
  const [matchPart, setMatchPart] = useState<MatchPart>("waist");
  const [match, setMatch] = useState<MatchPayload | null>(null);
  const [frontMesh, setFrontMesh] = useState<PhotoMesh | null>(null);
  const [sideMesh, setSideMesh] = useState<PhotoMesh | null>(null);
  const [rawFrontMesh, setRawFrontMesh] = useState<PhotoMesh | null>(null);
  const [rawSideMesh, setRawSideMesh] = useState<PhotoMesh | null>(null);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [wearModelSearch, setWearModelSearch] = useState("");
  const [wearModel, setWearModel] = useState<WearModelPayload | null>(null);
  const [comparisonModes, setComparisonModes] = useState<Record<ComparisonView, ComparisonMode>>({ front: "overlay", side: "overlay" });
  const [manualProofModes, setManualProofModes] = useState<Record<ComparisonView, ComparisonMode>>({ front: "overlay", side: "overlay" });
  const [focusedView, setFocusedView] = useState<ComparisonView | null>(null);
  const [comparisonZoom, setComparisonZoom] = useState(1);
  const [manualProofZoom, setManualProofZoom] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualLineState, setManualLineState] = useState<{
    key: string;
    lines: Record<ComparisonView, ManualLine | null>;
  }>({ key: "", lines: { front: null, side: null } });

  const selectedPerson = useMemo(
    () => people.find((person) => person.setId === selectedPersonId) ?? DEFAULT_FRONT_SIDE_PERSON,
    [people, selectedPersonId],
  );
  const subjectName = personName(selectedPerson);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/try-on-test/sizing-lab/dataset", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { rows?: FrontSidePerson[]; error?: string };
        if (!response.ok || payload.error) throw new Error(payload.error ?? "Saved models are unavailable.");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        const pairedPeople = (payload.rows ?? [])
          .filter((person) => (
            Boolean(person.setId)
            && Boolean(person.frontImageUrl)
            && Boolean(person.sideImageUrl)
            && Number.isFinite(person.heightCm)
            && Number.isFinite(person.weightKg)
            // Front + Side mode keeps Shahnaz 2 as the single Shahnaz fixture.
            // The original Shahnaz record remains available in other labs.
            && person.setId !== "shahnaz"
          ))
          .map((person) => person.setId === "shahnaz-2"
            ? { ...person, frontImageUrl: "/try-on-test/sizing-lab/shahnaz-8444-front.jpg" }
            : person);
        if (pairedPeople.length) setPeople(pairedPeople);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Saved models are unavailable.");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProof() {
      setMatching(true);
      setError(null);
      setMatch(null);
      setWearModel(null);
      try {
        const matchParameters = new URLSearchParams({
          heightCm: String(selectedPerson.heightCm),
          weightKg: String(selectedPerson.weightKg),
          gender: selectedPerson.gender,
          cohort: searchMode,
          subjectAdjustmentCm: String(subjectAdjustmentCm),
          photoId: frontMeshId(selectedPerson),
          sidePhotoId: sideMeshId(selectedPerson),
        });
        const readJson = async <Payload,>(url: string) => {
          const response = await fetch(url, { cache: "no-store" });
          const payload = await response.json() as Payload & { error?: string };
          if (!response.ok || payload.error) throw new Error(payload.error ?? "The requested proof asset is unavailable.");
          return payload;
        };
        const [matchPayload, frontPayload, sidePayload] = await Promise.all([
          readJson<MatchPayload>(`/api/try-on-test/wear-front-side-proof/match?${matchParameters.toString()}`),
          readJson<PhotoMesh>(`/api/try-on-test/wear-mesh-overlay/model?photo=${encodeURIComponent(frontMeshId(selectedPerson))}&method=blender-2d`),
          readJson<PhotoMesh>(`/api/try-on-test/wear-mesh-overlay/model?photo=${encodeURIComponent(sideMeshId(selectedPerson))}&method=blender-2d`),
        ]);
        if (cancelled) return;
        const nextMatch = matchPayload;
        setMatch(nextMatch);
        setFrontMesh(frontPayload);
        setSideMesh(sidePayload);
        setRawFrontMesh(null);
        setRawSideMesh(null);
        setMatchPart("waist");
        setSelectedScanId(nextMatch.bodyPartMatches.waist?.bestScanId ?? nextMatch.ranking.bestWaistScanId ?? "");
        setWearModelSearch("");
        setRevealed(false);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Proof unavailable");
      } finally {
        if (!cancelled) setMatching(false);
      }
    }
    void loadProof();
    return () => { cancelled = true; };
  }, [meshRevision, searchMode, selectedPerson, subjectAdjustmentCm]);

  const buildSelectedPair = async () => {
    setBuildingPair(true);
    setError(null);
    try {
      const build = async (photoId: string, imageUrl: string) => {
        const response = await fetch("/api/try-on-test/wear-mesh-overlay/blender", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId, imageUrl }),
        });
        const payload = await response.json() as { error?: string };
        if (!response.ok || payload.error) throw new Error(payload.error ?? "Blender could not build this mesh.");
      };
      await Promise.all([
        build(frontMeshId(selectedPerson), selectedPerson.frontImageUrl),
        build(sideMeshId(selectedPerson), selectedPerson.sideImageUrl),
      ]);
      setMeshRevision((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The front + side meshes could not be built.");
    } finally {
      setBuildingPair(false);
    }
  };

  useEffect(() => {
    if (!selectedScanId) return;
    fetch(`/api/try-on-test/wear-front-side-proof/model?scan=${encodeURIComponent(selectedScanId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: WearModelPayload) => {
        if (payload.error) throw new Error(payload.error);
        setWearModel(payload);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "WEAR projection unavailable"));
  }, [selectedScanId]);

  const selectedPartMatch = match?.bodyPartMatches[matchPart] ?? null;
  const selectedPartCandidate = useMemo(
    () => selectedPartMatch?.candidates.find((item) => item.scanId === selectedScanId) ?? null,
    [selectedPartMatch, selectedScanId],
  );
  const activeCandidates = selectedPartMatch?.candidates ?? [];
  const visibleCandidates = useMemo(() => {
    const query = wearModelSearch.trim().toLowerCase();
    if (!query) return activeCandidates;
    return activeCandidates.filter((candidate) => candidate.scanId.toLowerCase().includes(query));
  }, [activeCandidates, wearModelSearch]);
  const exactSearchId = wearModelSearch.trim().toUpperCase();
  const canLoadExactSearchId = SAFE_WEAR_SCAN_ID.test(exactSearchId);
  useEffect(() => {
    if (wearModelSearch.trim() && visibleCandidates.length && !visibleCandidates.some((candidate) => candidate.scanId === selectedScanId)) {
      setSelectedScanId(visibleCandidates[0]!.scanId);
    }
  }, [selectedScanId, visibleCandidates, wearModelSearch]);
  const frontRows = useMemo<DisplayRow[]>(() => match ? CROSS_SECTION_PARTS.flatMap((part) => {
    const partMatch = match.bodyPartMatches[part];
    if (!partMatch) return [];
    return [{
      key: part,
      label: `WEAR-guided ${PART_LABELS[part].toLowerCase()}`,
      heightFractionFromFeet: partMatch.query.heightFractionFromFeet,
      valueCm: partMatch.query.targetBreadthCm,
    }];
  }) : [], [match]);
  const sideRows = useMemo<DisplayRow[]>(() => match ? CROSS_SECTION_PARTS.flatMap((part) => {
    const partMatch = match.bodyPartMatches[part];
    if (!partMatch) return [];
    return [{
      key: part,
      label: `WEAR-guided ${PART_LABELS[part].toLowerCase()} depth`,
      heightFractionFromFeet: partMatch.query.heightFractionFromFeet,
      valueCm: partMatch.query.targetDepthCm,
    }];
  }) : [], [match]);

  const manualLineKey = `${selectedPerson.setId}:${searchMode}:${selectedScanId}:${matchPart}`;
  const defaultManualLines = useMemo<Record<ComparisonView, ManualLine | null>>(() => ({
      front: defaultManualLine(frontMesh, frontRows.find((row) => row.key === matchPart)),
      side: defaultManualLine(sideMesh, sideRows.find((row) => row.key === matchPart)),
  }), [frontMesh, frontRows, matchPart, sideMesh, sideRows]);
  const manualLines = manualLineState.key === manualLineKey ? manualLineState.lines : defaultManualLines;

  const manualFrontCm = manualLineCentimetres(frontMesh, manualLines.front, selectedPerson.heightCm);
  const manualSideCm = manualLineCentimetres(sideMesh, manualLines.side, selectedPerson.heightCm);
  const manualCircumferenceCm = useMemo(() => {
    const contour = selectedPartCandidate?.shape32;
    if (!contour || manualFrontCm == null || manualSideCm == null) return null;
    return resizeClosedShapePerimeter({
      contour,
      targetBreadthCm: manualFrontCm,
      targetDepthCm: manualSideCm,
    });
  }, [manualFrontCm, manualSideCm, selectedPartCandidate]);

  const resetManualLine = (view: ComparisonView) => {
    const rows = view === "front" ? frontRows : sideRows;
    const mesh = view === "front" ? frontMesh : sideMesh;
    const next = defaultManualLine(mesh, rows.find((row) => row.key === matchPart));
    setManualLineState({ key: manualLineKey, lines: { ...manualLines, [view]: next } });
  };

  const personPicker = (
    <section className={styles.personPicker}>
      <label>
        <span>Front + Side model</span>
        <select value={selectedPersonId} onChange={(event) => {
          setSelectedPersonId(event.target.value);
          setError(null);
          setMatch(null);
          setFrontMesh(null);
          setSideMesh(null);
          setWearModel(null);
        }}>
          {people.map((person) => (
            <option key={person.setId} value={person.setId}>{person.label}</option>
          ))}
        </select>
      </label>
      <div className={styles.selectedPhotoPair}>
        <figure>
          <Image src={selectedPerson.frontImageUrl} alt={`${subjectName} front photo`} width={120} height={160} />
          <figcaption>Front photo</figcaption>
        </figure>
        <figure>
          <Image src={selectedPerson.sideImageUrl} alt={`${subjectName} side photo`} width={120} height={160} />
          <figcaption>Side photo</figcaption>
        </figure>
      </div>
      <small>Only saved models with both photos appear here.</small>
    </section>
  );

  const missingMeshPair = Boolean(error && (
    error.includes("has not been generated")
    || error.includes("browser-ready WEAR mesh")
    || error.includes("ENOENT")
  ));

  if (error) return (
    <main className={styles.page}>
      {personPicker}
      <section className={styles.error}>
        <strong>{missingMeshPair ? `${subjectName} front + side mesh is not ready` : `No ${searchMode} WEAR match for ${subjectName}`}</strong>
        <span>{error}</span>
        {missingMeshPair ? (
          <button type="button" onClick={() => void buildSelectedPair()} disabled={buildingPair}>
            {buildingPair ? "Blender is building both photos…" : `Build ${subjectName} front + side meshes`}
          </button>
        ) : searchMode === "strict" ? (
          <button type="button" onClick={() => setSearchMode("all")}>Search all same-gender WEAR bodies</button>
        ) : null}
      </section>
    </main>
  );
  if (!match) return <main className={styles.page}>{personPicker}<section className={styles.loading}>Loading {subjectName}&apos;s front + side proof…</section></main>;
  const selected = selectedPartCandidate;
  const selectedRank = selected?.rank;
  const selectedDisplayScanId = selected?.scanId ?? selectedScanId;
  const selectedWearRow = wearModel?.frontMetric.rows[matchPart] ?? null;
  const actualByPart: Record<RowKey, number | null> = {
    neck: null,
    chest: selectedPerson.chestCm,
    underbust: null,
    waist: selectedPerson.waistCm,
    hips: selectedPerson.hipsCm,
  };
  const actual = actualByPart[matchPart];
  const reliableCandidateCount = selectedPartMatch?.reliableCount ?? 0;
  const comparisonCandidateCount = selectedPartMatch?.comparisonCount ?? 0;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span>Private Test Lab · Front + side WEAR match</span><h1>Find {subjectName}&apos;s nearest WEAR body for every cross-section</h1><p>Neck, chest, under-bust, waist, and hips each choose their own closest WEAR person. Tape stays hidden during ranking.</p></div>
        <b>{reliableCandidateCount > 0
          ? `${reliableCandidateCount.toLocaleString()} reliable ${matchPart} models`
          : `${comparisonCandidateCount.toLocaleString()} strict ${matchPart} mesh models`}</b>
      </header>

      {personPicker}

      <section className={styles.searchModeCard}>
        <div>
          <strong>Search group</strong>
          <span>{searchMode === "strict" ? "Same gender · within 1 cm and 1 kg" : "Same gender · height and weight gate is OFF"}</span>
        </div>
        <div className={styles.searchModeSwitch} aria-label="WEAR search group">
          <button type="button" data-active={searchMode === "strict"} onClick={() => setSearchMode("strict")}>Strict · ±1 cm / ±1 kg</button>
          <button type="button" data-active={searchMode === "all"} onClick={() => setSearchMode("all")}>All WEAR · all five parts</button>
        </div>
        <div className={styles.searchModeMeta}>
          <small>{matching
            ? "Searching…"
            : reliableCandidateCount > 0
              ? `${match.ranking.eligibleCandidateCount.toLocaleString()} bodies scanned · ${reliableCandidateCount.toLocaleString()} certified ${PART_LABELS[matchPart].toLowerCase()} loops · front + side`
              : `${match.ranking.eligibleCandidateCount.toLocaleString()} bodies scanned · ${comparisonCandidateCount.toLocaleString()} usable ${PART_LABELS[matchPart].toLowerCase()} meshes · front + side`}</small>
          <small>{CROSS_SECTION_PARTS.map((part) => `${PART_LABELS[part]} ${match.bodyPartMatches[part]?.candidateCount.toLocaleString() ?? "0"}`).join(" · ")} indexed</small>
          <small>
            Front-width gate: ≤ {match.ranking.frontWidthMaximumErrorCm.toFixed(2)} cm
            {selectedPartMatch?.profileWindowCm !== 1
              ? ` · expanded height/weight search (${selectedPartMatch?.profileWindowCm == null ? "all" : selectedPartMatch.profileWindowCm} cm window)`
              : " · started with ±1 cm height / ±1 kg weight"}
            {(selectedPartMatch?.frontWidthGateSatisfied ? " · passed" : " · closest fallback")}
          </small>
        </div>
      </section>

      <section className={styles.landmarkMatches}>
        <header>
          <div>
            <span>Other WEAR body parts</span>
            <h2>Nearest landmark-length body for each part</h2>
            <p>These are visible front landmark lengths. They are separate from the five front + side circumference rows above.</p>
          </div>
          <small>Half-inch length gate · same profile search stages</small>
        </header>
        <div className={styles.landmarkMatchGrid}>
          {LANDMARK_LENGTH_PARTS.map((part) => {
            const item = match.landmarkMatches[part];
            const best = item?.candidates[0];
            return (
              <article key={part} data-status={item?.unavailable ? "unavailable" : item?.lengthGateSatisfied ? "matched" : "fallback"}>
                <strong>{LANDMARK_PART_LABELS[part]}</strong>
                {item?.unavailable ? <small>{item.unavailable}</small> : best && item?.query ? <>
                  <span>{item.query.lengthCm.toFixed(2)} cm ↔ {best.wearLengthCm.toFixed(2)} cm</span>
                  <em>{best.differenceCm >= 0 ? "+" : ""}{best.differenceCm.toFixed(2)} cm · {best.scanId}</em>
                  <button type="button" onClick={() => {
                    setSelectedScanId(best.scanId);
                    setWearModelSearch("");
                    setRevealed(false);
                  }}>Open WEAR mesh</button>
                </> : <small>No reliable visible landmark result.</small>}
              </article>
            );
          })}
        </div>
        <footer>
          <span>{match.landmarkMatches.left_inseam?.candidateCount.toLocaleString() ?? "0"} left-inseam and {match.landmarkMatches.right_inseam?.candidateCount.toLocaleString() ?? "0"} right-inseam WEAR paths are indexed.</span>
          <span>Inseam remains unavailable for this photo until a real user crotch point is marked. It is never guessed from the hip.</span>
        </footer>
      </section>

      <section className={styles.searchModeCard}>
        <div>
          <strong>Own-model size test</strong>
          <span>Adjust the selected photo model only · WEAR stays untouched</span>
        </div>
        <div className={styles.searchModeSwitch} aria-label="Own model size adjustment">
          <button
            type="button"
            data-active={subjectAdjustmentCm === -1}
            onClick={() => setSubjectAdjustmentCm(-1)}
          >
            Own model −1 cm
          </button>
          <button
            type="button"
            data-active={subjectAdjustmentCm === 0}
            onClick={() => setSubjectAdjustmentCm(0)}
          >
            Original 0 cm
          </button>
        </div>
        <small>
          {subjectAdjustmentCm < 0
            ? "Front width and side depth are each reduced by 1 cm before matching."
            : "The original front width and side depth are used."}
        </small>
      </section>

      <details className={styles.technicalDetails}>
        <summary>Camera and source details</summary>
        <div className={styles.technicalBody}>
      {match.cameraFit ? (
      <section className={styles.angleProof}>
        <div><span>Front turn</span><strong>{match.cameraFit.measurementEffect.frontYawDeg.toFixed(1)}°</strong><small>WEAR expects 0°</small></div>
        <div><span>Side turn</span><strong>{match.cameraFit.measurementEffect.sideYawDeg.toFixed(1)}°</strong><small>WEAR expects 90°</small></div>
        <div><span>9-body agreement</span><strong>±{match.cameraFit.angleValidation.maximumReferenceYawStdDeg.toFixed(1)}°</strong><small>stable enough for angle only</small></div>
        <div><span>Mesh stretching</span><strong>None</strong><small>vertices were not changed</small></div>
      </section>
      ) : (
        <section className={styles.twoTruths}>
          <div data-status="accepted"><strong>PHOTO PAIR LOADED</strong><span>{subjectName}&apos;s own front and side photos are loaded. Delaram&apos;s camera report is not reused.</span></div>
        </section>
      )}

      <section className={styles.twoTruths}>
        <div data-status="accepted"><strong>ANGLE: ACCEPTED</strong><span>The 9 WEAR bodies agree on the camera turn.</span></div>
        <div data-status="rejected"><strong>BODY SHAPE: REJECTED</strong><span>The visible mesh does not prove {subjectName}&apos;s exact hidden 3D body.</span></div>
      </section>

      <section className={styles.photoGrid}>
        <PhotoMeshCard title={`${subjectName} front lines`} src={selectedPerson.frontImageUrl} mesh={frontMesh} rawMesh={rawFrontMesh} rows={frontRows} valueLabel="Width A–B" color="#22d3ee" />
        <PhotoMeshCard title={`${subjectName} side lines`} src={selectedPerson.sideImageUrl} mesh={sideMesh} rawMesh={rawSideMesh} rows={sideRows} valueLabel="Depth C–D" color="#a78bfa" />
      </section>

      <section className={styles.blenderProof}>
        <div><span>Blender camera scene</span><h2>One real WEAR body · two fitted cameras</h2><p>Orange is the front photo camera. Purple is the side photo camera. Only camera direction moved.</p></div>
        <Image src="/try-on-test/wear-mesh-overlay/wear-rigid-camera-fit.png" alt="Blender WEAR rigid camera fit" width={1000} height={740} />
      </section>
        </div>
      </details>

      <section className={styles.directComparison}>
        <header className={styles.comparisonHeader}>
          <div>
            <span>Direct front + side comparison</span>
            <h2>{subjectName} {PART_LABELS[matchPart].toLowerCase()} vs {selectedDisplayScanId ? `${selectedRank ? `#${selectedRank} · ` : ""}${selectedDisplayScanId}` : "selected WEAR body"}</h2>
            <p>Every cross-section uses its own independent nearest-person ranking.</p>
          </div>
          <div className={styles.comparisonControls}>
            <label className={styles.modelSearch}>
              <span>Search WEAR model number</span>
              <input
                value={wearModelSearch}
                onChange={(event) => setWearModelSearch(event.target.value)}
                placeholder="e.g. NA-1591-A"
                aria-label="Search WEAR model number"
              />
              <button
                type="button"
                className={styles.loadModelButton}
                disabled={!canLoadExactSearchId}
                onClick={() => {
                  setSelectedScanId(exactSearchId);
                  setWearModelSearch("");
                  setRevealed(false);
                }}
              >
                Load exact model
              </button>
              <small>{wearModelSearch.trim() ? `${visibleCandidates.length} matching scanned model${visibleCandidates.length === 1 ? "" : "s"}` : "Type an ID to search the scanned WEAR list"}</small>
            </label>
            <label className={styles.partSelector}>
              <span>Best WEAR body part</span>
              <select
                aria-label="Best WEAR body part"
                value={matchPart}
                onChange={(event) => {
                  const next = event.target.value as MatchPart;
                  setMatchPart(next);
                  setSelectedScanId(match.bodyPartMatches[next]?.bestScanId ?? "");
                  setRevealed(false);
                }}
              >
                {CROSS_SECTION_PARTS.map((part) => (
                  <option key={part} value={part}>
                    Best {PART_LABELS[part].toLowerCase()} · {match.bodyPartMatches[part]?.bestScanId ?? "unavailable"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{PART_LABELS[matchPart]} candidates</span>
              <select value={selectedScanId} onChange={(event) => setSelectedScanId(event.target.value)}>
                {selectedScanId && !visibleCandidates.some((candidate) => candidate.scanId === selectedScanId) ? <option value={selectedScanId}>Selected exact · {selectedScanId}</option> : null}
                {visibleCandidates.length ? visibleCandidates.map((candidate) => (
                  <option key={candidate.scanId} value={candidate.scanId}>
                    #{candidate.rank} · {candidate.scanId} · H {candidate.heightCm.toFixed(1)} · W {candidate.weightKg.toFixed(1)}
                  </option>
                )) : <option value="">No model found</option>}
              </select>
            </label>
            <div className={styles.compareZoom} aria-label="Mesh comparison zoom">
              <button type="button" aria-label="Zoom out" onClick={() => setComparisonZoom((value) => Math.max(.75, Number((value - .1).toFixed(2))))}>−</button>
              <strong>{Math.round(comparisonZoom * 100)}%</strong>
              <button type="button" aria-label="Zoom in" onClick={() => setComparisonZoom((value) => Math.min(1.5, Number((value + .1).toFixed(2))))}>+</button>
              <button type="button" onClick={() => setComparisonZoom(1)}>Reset</button>
              {focusedView ? <button type="button" className={styles.showBothButton} onClick={() => setFocusedView(null)}>Show Front + Side</button> : null}
            </div>
          </div>
        </header>

        <div className={styles.lineLegend}>
          <span data-owner="delaram">Cyan · {subjectName} mesh</span>
          <span data-owner="wear">Orange · exact WEAR PLY</span>
          <span>Overlay is mesh-only</span>
          <span data-row={matchPart}>Active line · {PART_LABELS[matchPart]}</span>
        </div>

        <div className={styles.comparisonWorkspace}>
          <div className={styles.comparisonViews} data-focus={focusedView ?? "both"}>
            <div className={styles.compareViewSlot} data-hidden={focusedView != null && focusedView !== "front"}>
              <ViewComparison
                mode={comparisonModes.front}
                view="front"
                photoMesh={frontMesh}
                wearModel={wearModel}
                photoRows={frontRows}
                zoom={comparisonZoom}
                alignRow={matchPart}
                photoSrc={selectedPerson.frontImageUrl}
                subjectName={subjectName}
                onModeChange={(mode) => {
                  setComparisonModes((current) => ({ ...current, front: mode }));
                  setFocusedView("front");
                }}
              />
            </div>
            <div className={styles.compareViewSlot} data-hidden={focusedView != null && focusedView !== "side"}>
              <ViewComparison
                mode={comparisonModes.side}
                view="side"
                photoMesh={sideMesh}
                wearModel={wearModel}
                photoRows={sideRows}
                zoom={comparisonZoom}
                alignRow={matchPart}
                photoSrc={selectedPerson.sideImageUrl}
                subjectName={subjectName}
                onModeChange={(mode) => {
                  setComparisonModes((current) => ({ ...current, side: mode }));
                  setFocusedView("side");
                }}
              />
            </div>
          </div>

          <aside className={styles.numberPanel}>
            <header><span>{selected ? `Best ${PART_LABELS[matchPart].toLowerCase()} body` : "Selected WEAR body"}</span><strong>{selectedDisplayScanId ? `${selectedRank ? `#${selectedRank} · ` : ""}${selectedDisplayScanId}` : "–"}</strong><small>{selected ? `H ${selected.heightCm.toFixed(1)} cm · W ${selected.weightKg.toFixed(1)} kg` : selectedWearRow ? `Exact metric loaded · ${selectedWearRow.breadthCm.toFixed(2)} cm front` : "Loading exact metric…"}</small></header>
            {selected && selectedPartMatch ? (
              <DifferenceCard
                title={PART_LABELS[matchPart]}
                subjectName={subjectName}
                delaramFront={selectedPartMatch.query.targetBreadthCm}
                wearFront={selected.wearSourceBreadthCm}
                delaramSide={selectedPartMatch.query.targetDepthCm}
                wearSide={selected.wearSourceDepthCm}
              />
            ) : selectedWearRow ? (
              <DifferenceCard
                title={PART_LABELS[matchPart]}
                subjectName={subjectName}
                delaramFront={selectedPartMatch?.query.targetBreadthCm ?? 0}
                wearFront={selectedWearRow.breadthCm}
                delaramSide={selectedPartMatch?.query.targetDepthCm ?? 0}
                wearSide={selectedWearRow.depthCm}
              />
            ) : null}
            {selected ? <div className={styles.selectedWearTape}><span>Selected WEAR tape · revealed after rank</span><strong>{PART_LABELS[matchPart]} {selected.wearTapeCmRevealedAfterRank?.toFixed(1) ?? "not recorded"}{selected.wearTapeCmRevealedAfterRank == null ? "" : " cm"}</strong></div> : selectedWearRow ? <div className={styles.selectedWearTape}><span>Exact WEAR metric</span><strong>{selectedWearRow.breadthCm.toFixed(2)} cm front · {selectedWearRow.depthCm.toFixed(2)} cm side</strong><small>Tape is not used when manually loading a model.</small></div> : null}
            <div className={styles.hiddenTape}>
              <span>{subjectName} real {PART_LABELS[matchPart].toLowerCase()} tape</span><strong>{revealed ? (actual == null ? "Not recorded" : `${actual.toFixed(1)} cm`) : "Hidden"}</strong>
              <button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? "Hide tape" : "Reveal tape"}</button>
              <small>Not used for matching</small>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.manualProof}>
        <header className={styles.manualProofHeader}>
          <div>
            <span>Manual line proof · selected {matchPart}</span>
            <h2>Move {subjectName}&apos;s lines and watch the result change</h2>
            <p>{subjectName} is editable. The selected WEAR PLY line stays fixed.</p>
          </div>
          <div className={styles.manualHeaderTools}>
            <div className={styles.manualLiveResult}>
              <span>Live selected-WEAR-shape result</span>
              <strong>{manualCircumferenceCm?.toFixed(2) ?? "–"} cm</strong>
              <small>{manualFrontCm?.toFixed(2) ?? "–"} cm front × {manualSideCm?.toFixed(2) ?? "–"} cm side</small>
            </div>
            <div className={styles.compareZoom} aria-label="Front and side line proof zoom">
              <button type="button" aria-label="Zoom line proof out" onClick={() => setManualProofZoom((value) => Math.max(.65, Number((value - .1).toFixed(2))))}>−</button>
              <strong>{Math.round(manualProofZoom * 100)}%</strong>
              <button type="button" aria-label="Zoom line proof in" onClick={() => setManualProofZoom((value) => Math.min(2, Number((value + .1).toFixed(2))))}>+</button>
              <button type="button" onClick={() => setManualProofZoom(1)}>Reset</button>
            </div>
          </div>
        </header>

        <article className={styles.manualViewProof}>
          <header>
            <div><span>Front A–B</span><h3>Full front line editor</h3></div>
            <div className={styles.manualViewActions}>
              <b>WEAR fixed: {wearModel?.frontMetric.rows[matchPart]?.breadthCm.toFixed(2) ?? "–"} cm</b>
              <div className={styles.manualModeSwitch} aria-label="Front line proof layout">
                <button type="button" data-active={manualProofModes.front === "overlay"} onClick={() => setManualProofModes((current) => ({ ...current, front: "overlay" }))}>Overlay</button>
                <button type="button" data-active={manualProofModes.front === "side-by-side"} onClick={() => setManualProofModes((current) => ({ ...current, front: "side-by-side" }))}>Side by side · edit</button>
              </div>
            </div>
          </header>
          {manualProofModes.front === "overlay" ? (
            <div className={styles.manualOverlayGrid}>
              <div className={styles.manualOverlayStage}>
                <MeshCompareCanvas
                  photoMesh={frontMesh}
                  wearModel={wearModel}
                  photoRows={frontRows}
                  view="front"
                  owner="both"
                  zoom={manualProofZoom}
                  showRows
                  alignRow={matchPart}
                  visibleRow={matchPart}
                  statureCm={selectedPerson.heightCm}
                  subjectName={subjectName}
                  photoLine={manualLines.front}
                  photoLineValueCm={manualFrontCm}
                />
              </div>
              <aside className={styles.manualNumbers}>
                <span>Solid pink · {subjectName}</span><strong>{manualFrontCm?.toFixed(2) ?? "–"} cm</strong>
                <span>Dashed yellow · exact WEAR</span><strong>{wearModel?.frontMetric.rows[matchPart]?.breadthCm.toFixed(2) ?? "–"} cm</strong>
                <small>Both front meshes and both {matchPart} lines share one centimetre scale. Use “Side by side · edit” to move {subjectName}&apos;s line.</small>
              </aside>
            </div>
          ) : (
          <div className={styles.manualProofGrid}>
            <div>
              <h4>{subjectName} · movable</h4>
              <ManualPhotoLineEditor
                view="front"
                mesh={frontMesh}
                line={manualLines.front}
                rowKey={matchPart}
                imageSrc={selectedPerson.frontImageUrl}
                subjectName={subjectName}
                statureCm={selectedPerson.heightCm}
                onChange={(line) => setManualLineState({ key: manualLineKey, lines: { ...manualLines, front: line } })}
                onReset={() => resetManualLine("front")}
              />
            </div>
            <div>
              <h4>Selected WEAR · fixed</h4>
              <div className={styles.manualWearStage}>
                <MeshCompareCanvas
                  photoMesh={frontMesh}
                  wearModel={wearModel}
                  photoRows={frontRows}
                  view="front"
                  owner="wear"
                  zoom={manualProofZoom}
                  showRows
                  alignRow={matchPart}
                  visibleRow={matchPart}
                  statureCm={selectedPerson.heightCm}
                  subjectName={subjectName}
                />
              </div>
            </div>
            <aside className={styles.manualNumbers}>
              <span>{subjectName} live front width</span><strong>{manualFrontCm?.toFixed(2) ?? "–"} cm</strong>
              <span>WEAR exact front width</span><strong>{wearModel?.frontMetric.rows[matchPart]?.breadthCm.toFixed(2) ?? "–"} cm</strong>
              <small>The front line changes width only. The live circumference also uses the side line below.</small>
            </aside>
          </div>
          )}
        </article>

        <article className={styles.manualViewProof}>
          <header>
            <div><span>Side C–D</span><h3>Full side line editor</h3></div>
            <div className={styles.manualViewActions}>
              <b>WEAR fixed: {wearModel?.frontMetric.rows[matchPart]?.depthCm.toFixed(2) ?? "–"} cm</b>
              <div className={styles.manualModeSwitch} aria-label="Side line proof layout">
                <button type="button" data-active={manualProofModes.side === "overlay"} onClick={() => setManualProofModes((current) => ({ ...current, side: "overlay" }))}>Overlay</button>
                <button type="button" data-active={manualProofModes.side === "side-by-side"} onClick={() => setManualProofModes((current) => ({ ...current, side: "side-by-side" }))}>Side by side · edit</button>
              </div>
            </div>
          </header>
          {manualProofModes.side === "overlay" ? (
            <div className={styles.manualOverlayGrid}>
              <div className={styles.manualOverlayStage}>
                <MeshCompareCanvas
                  photoMesh={sideMesh}
                  wearModel={wearModel}
                  photoRows={sideRows}
                  view="side"
                  owner="both"
                  zoom={manualProofZoom}
                  showRows
                  alignRow={matchPart}
                  visibleRow={matchPart}
                  statureCm={selectedPerson.heightCm}
                  subjectName={subjectName}
                  photoLine={manualLines.side}
                  photoLineValueCm={manualSideCm}
                />
              </div>
              <aside className={styles.manualNumbers}>
                <span>Solid pink · {subjectName}</span><strong>{manualSideCm?.toFixed(2) ?? "–"} cm</strong>
                <span>Dashed yellow · exact WEAR</span><strong>{wearModel?.frontMetric.rows[matchPart]?.depthCm.toFixed(2) ?? "–"} cm</strong>
                <span>Live circumference</span><strong>{manualCircumferenceCm?.toFixed(2) ?? "–"} cm</strong>
                <small>Both side meshes and both {matchPart} lines share one centimetre scale. Use “Side by side · edit” to move {subjectName}&apos;s line.</small>
              </aside>
            </div>
          ) : (
          <div className={styles.manualProofGrid}>
            <div>
              <h4>{subjectName} · movable</h4>
              <ManualPhotoLineEditor
                view="side"
                mesh={sideMesh}
                line={manualLines.side}
                rowKey={matchPart}
                imageSrc={selectedPerson.sideImageUrl}
                subjectName={subjectName}
                statureCm={selectedPerson.heightCm}
                onChange={(line) => setManualLineState({ key: manualLineKey, lines: { ...manualLines, side: line } })}
                onReset={() => resetManualLine("side")}
              />
            </div>
            <div>
              <h4>Selected WEAR · fixed</h4>
              <div className={styles.manualWearStage}>
                <MeshCompareCanvas
                  photoMesh={sideMesh}
                  wearModel={wearModel}
                  photoRows={sideRows}
                  view="side"
                  owner="wear"
                  zoom={manualProofZoom}
                  showRows
                  alignRow={matchPart}
                  visibleRow={matchPart}
                  statureCm={selectedPerson.heightCm}
                  subjectName={subjectName}
                />
              </div>
            </div>
            <aside className={styles.manualNumbers}>
              <span>{subjectName} live side depth</span><strong>{manualSideCm?.toFixed(2) ?? "–"} cm</strong>
              <span>WEAR exact side depth</span><strong>{wearModel?.frontMetric.rows[matchPart]?.depthCm.toFixed(2) ?? "–"} cm</strong>
              <span>Live circumference</span><strong>{manualCircumferenceCm?.toFixed(2) ?? "–"} cm</strong>
              <small>This walks around the selected WEAR 32-point shape after resizing it to the two editable {subjectName} lines.</small>
            </aside>
          </div>
          )}
        </article>
      </section>
    </main>
  );
}
