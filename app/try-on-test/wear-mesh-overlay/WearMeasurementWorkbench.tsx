"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  heightScaledDistanceCm,
  heightScaledLineWidthCm,
  horizontalBodyInterval,
  outlineBounds,
  pairsFromFlat,
  rowYFromMetricHeight,
  signedDifferenceLabel,
  transferClosedContourCircumferenceCm,
  type NormalizedLine,
  type Point2,
} from "./geometry";
import styles from "./wearMeshOverlay.module.css";
import { WaistOnlyProofPanel } from "./WaistOnlyProofPanel";

type PhotoId = string;
type RowId = "waist" | "hips" | "neck" | "chest" | "underbust";

interface Candidate {
  scanId: string;
  heightCm: number;
  weightKg: number;
  color: string;
  cohortPosition: number;
  measurementsCm: { chest: number; waist: number; hips: number };
}

interface PhotoDefinition {
  label: string;
  src: string;
  width: number;
  height: number;
  profile: {
    heightCm: number;
    weightKg: number;
    gender?: "female" | "male";
    measurementsCm?: { chest: number; underbust: number; waist: number; hips: number };
  };
}

interface FlatMesh {
  vertices: number[];
  triangles: number[];
  outline: number[];
}

export interface WearBrowserMesh {
  scanId: string;
  units: "centimetres";
  depthUsed: false;
  verticesCm: Point2[];
  triangles: Array<readonly [number, number, number]>;
}

interface WearRow {
  id: RowId;
  label: string;
  plane: { available: boolean; heightCm: number; heightSource: string };
  breadthCm: number;
  depthCm: number;
  abBreadth: { frontProjectionCm: readonly [Point2, Point2] };
  closedLoopCircumferenceCm: number | null;
  diagnosticReconstructedPerimeterCm: number | null;
  recordedTape: { valueCm: number; sourceKey: string; role: string } | null;
  contour: { pointsCm: Point2[]; units: string; basis: string };
  qualityFlags: string[];
  planeProtocol?: string;
}

interface WearMeasurement {
  id: string;
  sourceKey: string;
  sourceGroup: string;
  value: number;
  unit: string;
  valueCm: number | null;
  geometryAvailable: boolean;
  geometryLengthCm?: number;
  geometryType?: string;
  landmarkNames?: string[];
  canonicalPointsCm?: Array<readonly [number, number, number]>;
  geometryUnavailableReason?: string;
  protocolNote?: string;
}

export interface WearMetric {
  scanId: string;
  profile: { gender: string; heightCm: number; weightKg: number; bmi: number };
  scaleEvidence: { chosenRawUnit: string; selectionMethod: string };
  frontProjection: {
    boundsCm: { minX: number; maxX: number; minZ: number; maxZ: number };
    outline: { pointsCm: Point2[] };
  };
  rows: Record<RowId, WearRow>;
  measurements: WearMeasurement[];
  qualityFlags: string[];
}

interface MatchScoreComponents {
  fixedHeightCentralOutline: {
    featureCount: number;
    meanAbsoluteBodyHeight: number;
    queryCmEquivalentFromKnownHeight: Record<string, number>;
  };
  anatomicalRowBreadth: {
    meanAbsoluteCmEquivalent: number;
    rows: Record<string, {
      usedInScore: boolean;
      queryRow: { queryCmEquivalentFromKnownHeight: number; method: string; notScoredReason?: string };
      exactWearPlyAb: { exactPlyAbBreadthCm: number };
      signedResidualCmEquivalent: number;
      absoluteResidualCmEquivalent: number;
      notScoredReason?: string | null;
    }>;
  };
  shoulderSpan: {
    queryCmEquivalentFromKnownHeight: number;
    exactWearLandmarkSpanCm: number;
    signedResidualCmEquivalent: number;
    absoluteResidualBodyHeight: number;
  };
}

interface RankedCandidate {
  rank: number;
  scanId: string;
  score: number;
  genuinelyClose: boolean;
  measurementTransferAllowed: boolean;
  scoreComponents: MatchScoreComponents;
  closeGateFailures: Array<{ metric: string; value: number; required: string }>;
  diagnosticOnly: {
    rawWholeMeshOverlay: {
      usedInScore: false;
      unsafeReason: string;
      fullSilhouetteIoU: number;
      centralTorsoIoU: number;
      lowerBodyIoU: number;
    };
  };
}

interface PhotoMatch {
  photoId: PhotoId;
  candidates: RankedCandidate[];
}

interface NormalizedOverlay {
  schemaVersion: string;
  normalization: string;
  canonicalY: number[];
  photo: { left: Array<number | null>; right: Array<number | null> };
  wear: { left: Array<number | null>; right: Array<number | null> };
}

interface WorkbenchPayload {
  error?: string;
  privateTestLabOnly: boolean;
  releaseApproved: false;
  photoId: PhotoId;
  scanId: string;
  match: {
    status: string;
    rankingInputs: string[];
    forbiddenInputs: string[];
    conclusion: {
      anyGenuinelyClose: boolean;
      nearestVisibleFrontCandidate: string;
      nearestCandidateScore: number;
      measurementTransferAllowed: boolean;
      reason: string;
    };
    photo: PhotoMatch;
  };
  metric: WearMetric;
  mesh2d: WearBrowserMesh;
  normalizedOverlay: NormalizedOverlay | null;
}

interface WearRuler {
  a: Point2;
  b: Point2;
  exact3dCm?: number;
  sourceMeasurementCm?: number;
  geometryType?: string;
  protocolNote?: string;
  label: string;
}

interface PhotoRuler {
  a: Point2;
  b: Point2;
  label: string;
}

interface Props {
  photoId: PhotoId;
  photo: PhotoDefinition;
  candidates: Candidate[];
  selectedScanId: string;
  onSelectScan: (scanId: string) => void;
  photoMesh: FlatMesh | null;
}

const ROWS: Array<{ id: RowId; label: string; color: string; initiallyVisible: boolean }> = [
  { id: "waist", label: "Natural waist", color: "#fb923c", initiallyVisible: true },
  { id: "hips", label: "Hips", color: "#f472b6", initiallyVisible: true },
  { id: "neck", label: "Neck", color: "#a78bfa", initiallyVisible: false },
  { id: "chest", label: "Bust / chest", color: "#22d3ee", initiallyVisible: false },
  { id: "underbust", label: "Under-bust", color: "#facc15", initiallyVisible: false },
];

function formatMeasurementName(value: string) {
  return value
    .replace(/_mm$/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function drawTriangleMesh(
  context: CanvasRenderingContext2D,
  triangles: ArrayLike<number> | Array<readonly [number, number, number]>,
  pointAt: (index: number) => readonly [number, number],
  color: string,
  opacity: number,
  lineWidth = 0.52,
) {
  context.beginPath();
  if (triangles.length > 0 && Array.isArray(triangles[0])) {
    for (const triangle of triangles as Array<readonly [number, number, number]>) {
      const a = pointAt(triangle[0]);
      const b = pointAt(triangle[1]);
      const c = pointAt(triangle[2]);
      context.moveTo(a[0], a[1]);
      context.lineTo(b[0], b[1]);
      context.lineTo(c[0], c[1]);
      context.closePath();
    }
  } else {
    const flat = triangles as ArrayLike<number>;
    for (let index = 0; index + 2 < flat.length; index += 3) {
      const a = pointAt(flat[index]!);
      const b = pointAt(flat[index + 1]!);
      const c = pointAt(flat[index + 2]!);
      context.moveTo(a[0], a[1]);
      context.lineTo(b[0], b[1]);
      context.lineTo(c[0], c[1]);
      context.closePath();
    }
  }
  context.strokeStyle = color.replace("1)", `${opacity})`);
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawMeshOutline(
  context: CanvasRenderingContext2D,
  points: readonly Point2[],
  mapPoint: (point: Point2) => readonly [number, number],
  color: string,
  lineWidth: number,
  dash: number[] = [],
) {
  if (points.length < 2) return;
  context.save();
  context.beginPath();
  const first = mapPoint(points[0]!);
  context.moveTo(first[0], first[1]);
  for (let index = 1; index < points.length; index += 1) {
    const point = mapPoint(points[index]!);
    context.lineTo(point[0], point[1]);
  }
  context.closePath();
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.setLineDash(dash);
  context.shadowColor = color;
  context.shadowBlur = lineWidth * 2.4;
  context.stroke();
  context.restore();
}

export function OverlayMeshCanvas({ photo, photoMesh, wearMesh, metric, fitVisibleBody = false }: {
  photo: PhotoDefinition;
  photoMesh: FlatMesh;
  wearMesh: WearBrowserMesh;
  metric: WearMetric;
  fitVisibleBody?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const photoOutline = pairsFromFlat(photoMesh.outline);
      const photoBounds = outlineBounds(photoOutline);
      if (!photoBounds) return;
      const sourceBodyWidth = (photoBounds.maximumX - photoBounds.minimumX) * photo.width;
      const sourceBodyHeight = (photoBounds.maximumY - photoBounds.minimumY) * photo.height;
      const padding = Math.max(18 * ratio, Math.min(canvas.width, canvas.height) * 0.055);
      const visibleBodyScale = fitVisibleBody
        ? Math.min(
          (canvas.width - padding * 2) / Math.max(1, sourceBodyWidth),
          (canvas.height - padding * 2) / Math.max(1, sourceBodyHeight),
        )
        : null;
      const bodyLeft = fitVisibleBody
        ? (canvas.width - sourceBodyWidth * visibleBodyScale!) / 2
        : 0;
      const bodyTop = fitVisibleBody
        ? (canvas.height - sourceBodyHeight * visibleBodyScale!) / 2
        : 0;
      const mapNormalizedPhotoPoint = (x: number, y: number): readonly [number, number] => (
        fitVisibleBody
          ? [
            bodyLeft + (x - photoBounds.minimumX) * photo.width * visibleBodyScale!,
            bodyTop + (y - photoBounds.minimumY) * photo.height * visibleBodyScale!,
          ]
          : [x * canvas.width, y * canvas.height]
      );
      const mapPhoto = (index: number): readonly [number, number] => mapNormalizedPhotoPoint(
        photoMesh.vertices[index * 2]!,
        photoMesh.vertices[index * 2 + 1]!,
      );

      const wearBounds = metric.frontProjection.boundsCm;
      const targetBodyHeightPx = fitVisibleBody
        ? sourceBodyHeight * visibleBodyScale!
        : (photoBounds.maximumY - photoBounds.minimumY) * canvas.height;
      const wearHeightCm = Math.max(1, wearBounds.maxZ - wearBounds.minZ);
      const pxPerCm = targetBodyHeightPx / wearHeightCm;
      const [photoCentrePx] = mapNormalizedPhotoPoint(
        (photoBounds.minimumX + photoBounds.maximumX) / 2,
        photoBounds.maximumY,
      );
      const [, photoBottomPx] = mapNormalizedPhotoPoint(
        (photoBounds.minimumX + photoBounds.maximumX) / 2,
        photoBounds.maximumY,
      );
      const wearCentreCm = (wearBounds.minX + wearBounds.maxX) / 2;
      const mapWear = ([x, z]: Point2): readonly [number, number] => [
        photoCentrePx + (x - wearCentreCm) * pxPerCm,
        photoBottomPx - (z - wearBounds.minZ) * pxPerCm,
      ];
      drawTriangleMesh(
        context,
        wearMesh.triangles,
        (index) => mapWear(wearMesh.verticesCm[index]!),
        "rgba(251, 146, 60, 1)",
        0.28,
        0.48 * ratio,
      );
      drawTriangleMesh(
        context,
        photoMesh.triangles,
        mapPhoto,
        "rgba(34, 211, 238, 1)",
        0.3,
        0.48 * ratio,
      );
      drawMeshOutline(
        context,
        metric.frontProjection.outline.pointsCm,
        mapWear,
        "#fb923c",
        2.4 * ratio,
        [7 * ratio, 4 * ratio],
      );
      drawMeshOutline(
        context,
        photoOutline,
        ([x, y]) => mapNormalizedPhotoPoint(x, y),
        "#22d3ee",
        2.8 * ratio,
      );
    };
    render();
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", render);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [fitVisibleBody, metric, photo, photoMesh, wearMesh]);

  return <canvas ref={canvasRef} className={styles.workbenchCanvas} aria-label={`${photo.label} and selected WEAR 2D meshes overlaid`} />;
}

function MeshLineComparisonCanvas({
  photo,
  photoMesh,
  wearMesh,
  metric,
  photoLine,
  rowId,
}: {
  photo: PhotoDefinition;
  photoMesh: FlatMesh;
  wearMesh: WearBrowserMesh;
  metric: WearMetric;
  photoLine: NormalizedLine;
  rowId: RowId;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const photoOutline = pairsFromFlat(photoMesh.outline);
      const photoBounds = outlineBounds(photoOutline);
      if (!photoBounds) return;
      const sourceBodyWidth = (photoBounds.maximumX - photoBounds.minimumX) * photo.width;
      const sourceBodyHeight = (photoBounds.maximumY - photoBounds.minimumY) * photo.height;
      const padding = Math.max(28 * ratio, Math.min(canvas.width, canvas.height) * 0.065);
      const visibleBodyScale = Math.min(
        (canvas.width - padding * 2) / Math.max(1, sourceBodyWidth),
        (canvas.height - padding * 2) / Math.max(1, sourceBodyHeight),
      );
      const bodyLeft = (canvas.width - sourceBodyWidth * visibleBodyScale) / 2;
      const bodyTop = (canvas.height - sourceBodyHeight * visibleBodyScale) / 2;
      const mapPhotoPoint = (x: number, y: number): readonly [number, number] => [
        bodyLeft + (x - photoBounds.minimumX) * photo.width * visibleBodyScale,
        bodyTop + (y - photoBounds.minimumY) * photo.height * visibleBodyScale,
      ];
      const mapPhotoVertex = (index: number): readonly [number, number] => mapPhotoPoint(
        photoMesh.vertices[index * 2]!,
        photoMesh.vertices[index * 2 + 1]!,
      );

      const wearBounds = metric.frontProjection.boundsCm;
      const targetBodyHeightPx = sourceBodyHeight * visibleBodyScale;
      const wearHeightCm = Math.max(1, wearBounds.maxZ - wearBounds.minZ);
      const pxPerCm = targetBodyHeightPx / wearHeightCm;
      const photoCentrePx = mapPhotoPoint(
        (photoBounds.minimumX + photoBounds.maximumX) / 2,
        photoBounds.maximumY,
      )[0];
      const photoBottomPx = mapPhotoPoint(
        (photoBounds.minimumX + photoBounds.maximumX) / 2,
        photoBounds.maximumY,
      )[1];
      const wearCentreCm = (wearBounds.minX + wearBounds.maxX) / 2;
      const mapWearPoint = ([x, z]: Point2): readonly [number, number] => [
        photoCentrePx + (x - wearCentreCm) * pxPerCm,
        photoBottomPx - (z - wearBounds.minZ) * pxPerCm,
      ];

      drawTriangleMesh(
        context,
        wearMesh.triangles,
        (index) => mapWearPoint(wearMesh.verticesCm[index]!),
        "rgba(251, 146, 60, 1)",
        0.22,
        0.42 * ratio,
      );
      drawTriangleMesh(
        context,
        photoMesh.triangles,
        mapPhotoVertex,
        "rgba(34, 211, 238, 1)",
        0.24,
        0.42 * ratio,
      );
      drawMeshOutline(
        context,
        metric.frontProjection.outline.pointsCm,
        mapWearPoint,
        "#fb923c",
        2.2 * ratio,
        [7 * ratio, 4 * ratio],
      );
      drawMeshOutline(
        context,
        photoOutline,
        ([x, y]) => mapPhotoPoint(x, y),
        "#22d3ee",
        2.7 * ratio,
      );

      const drawRowLine = (
        a: readonly [number, number],
        b: readonly [number, number],
        color: string,
        dash: number[] = [],
        width = 5,
      ) => {
        context.save();
        context.beginPath();
        context.moveTo(a[0], a[1]);
        context.lineTo(b[0], b[1]);
        context.strokeStyle = color;
        context.lineWidth = width * ratio;
        context.lineCap = "round";
        context.setLineDash(dash);
        context.shadowColor = "rgba(2, 6, 23, 0.95)";
        context.shadowBlur = 5 * ratio;
        context.stroke();
        context.restore();
      };

      const photoA = mapPhotoPoint(photoLine.left, photoLine.y);
      const photoB = mapPhotoPoint(photoLine.right, photoLine.y);
      const wearRow = metric.rows[rowId];
      const wearA = mapWearPoint(wearRow.abBreadth.frontProjectionCm[0]);
      const wearB = mapWearPoint(wearRow.abBreadth.frontProjectionCm[1]);
      drawRowLine(photoA, photoB, "#f43f5e", [], 9);
      drawRowLine(wearA, wearB, "#facc15", [10 * ratio, 6 * ratio], 4);
    };
    render();
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", render);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [metric, photo, photoLine, photoMesh, rowId, wearMesh]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.meshLineProofCanvas}
      aria-label={`${photo.label} and ${metric.scanId} meshes with ${rowId} lines`}
    />
  );
}

export function WearCanonicalCanvas({ mesh, metric }: { mesh: WearBrowserMesh; metric: WearMetric }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const bounds = metric.frontProjection.boundsCm;
      const padding = 5;
      const width = bounds.maxX - bounds.minX + padding * 2;
      const height = bounds.maxZ - bounds.minZ + padding * 2;
      const scale = Math.min(canvas.width / width, canvas.height / height);
      const offsetX = (canvas.width - width * scale) / 2;
      const offsetY = (canvas.height - height * scale) / 2;
      const map = ([x, z]: Point2): readonly [number, number] => [
        offsetX + (x - bounds.minX + padding) * scale,
        offsetY + (bounds.maxZ - z + padding) * scale,
      ];
      drawTriangleMesh(context, mesh.triangles, (index) => map(mesh.verticesCm[index]!), "rgba(251, 146, 60, 1)", 0.78);
    };
    render();
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", render);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [mesh, metric]);
  return <canvas ref={canvasRef} className={styles.workbenchCanvas} aria-label="Exact orthographic WEAR PLY projection" />;
}

function NormalizedMatchProof({ overlay, candidate }: {
  overlay: NormalizedOverlay;
  candidate: RankedCandidate | undefined;
}) {
  const values = [
    ...overlay.photo.left,
    ...overlay.photo.right,
    ...overlay.wear.left,
    ...overlay.wear.right,
  ].filter((value): value is number => value != null && Number.isFinite(value));
  const halfWidth = Math.max(0.18, ...values.map((value) => Math.abs(value))) * 1.12;
  const points = (side: Array<number | null>) => side
    .map((x, index) => x == null ? null : `${x},${overlay.canonicalY[index] ?? 0}`)
    .filter((value): value is string => value != null)
    .join(" ");
  const overlap = candidate?.diagnosticOnly.rawWholeMeshOverlay;
  return (
    <details className={styles.normalizedProof}>
      <summary className={styles.normalizedProofTitle}>
        <div><span>Optional diagnostic</span><strong>Show raw shape overlay</strong></div>
        <b data-pass={candidate?.genuinelyClose}>{candidate?.genuinelyClose ? "CLOSE" : "NOT CLOSE"}</b>
      </summary>
      <div className={styles.normalizedProofBody}>
        <div className={styles.overlayLegend}><span>Cyan · Delaram</span><span>Orange · WEAR</span></div>
        <svg viewBox={`${-halfWidth} 0 ${halfWidth * 2} 1`} preserveAspectRatio="xMidYMid meet" aria-label="Height-normalized silhouette comparison used by the matcher">
          {[0.2, 0.4, 0.6, 0.8].map((y) => <line key={y} x1={-halfWidth} x2={halfWidth} y1={y} y2={y} className={styles.proofGrid} />)}
          <line x1="0" x2="0" y1="0" y2="1" className={styles.proofGrid} />
          <polyline points={points(overlay.wear.left)} className={styles.proofWear} />
          <polyline points={points(overlay.wear.right)} className={styles.proofWear} />
          <polyline points={points(overlay.photo.left)} className={styles.proofPhoto} />
          <polyline points={points(overlay.photo.right)} className={styles.proofPhoto} />
        </svg>
        <div className={styles.proofMetrics}>
          <span>Whole mesh <b>{overlap ? `${(overlap.fullSilhouetteIoU * 100).toFixed(1)}%` : "–"}</b></span>
          <span>Torso <b>{overlap ? `${(overlap.centralTorsoIoU * 100).toFixed(1)}%` : "–"}</b></span>
          <span>Lower body <b>{overlap ? `${(overlap.lowerBodyIoU * 100).toFixed(1)}%` : "–"}</b></span>
        </div>
        <small>Pose differs, so this picture is not scored. Safe waist, hip, outline-width and shoulder distances decide the rank.</small>
      </div>
    </details>
  );
}

function SafeDistanceEvidence({ candidate }: { candidate: RankedCandidate | undefined }) {
  if (!candidate) return null;
  const rows = candidate.scoreComponents.anatomicalRowBreadth.rows;
  const shoulder = candidate.scoreComponents.shoulderSpan;
  return (
    <div className={styles.safeEvidence}>
      <div className={styles.safeEvidenceHeading}>
        <div><span>Distances used for ranking</span><strong>Exact safe comparison</strong></div>
        <b>Score {candidate.score.toFixed(2)}</b>
      </div>
      <div className={styles.safeEvidenceGrid}>
        {(["waist", "hips"] as const).map((rowName) => {
          const row = rows[rowName];
          return (
            <div key={rowName}>
              <span>{rowName === "waist" ? "Waist A-B" : "Hip A-B"}</span>
              <strong>{row.queryRow.queryCmEquivalentFromKnownHeight.toFixed(2)} ↔ {row.exactWearPlyAb.exactPlyAbBreadthCm.toFixed(2)} cm</strong>
              <small>Difference {row.signedResidualCmEquivalent >= 0 ? "+" : ""}{row.signedResidualCmEquivalent.toFixed(2)} cm</small>
            </div>
          );
        })}
        <div>
          <span>Shoulder landmarks</span>
          <strong>{shoulder.queryCmEquivalentFromKnownHeight.toFixed(2)} ↔ {shoulder.exactWearLandmarkSpanCm.toFixed(2)} cm</strong>
          <small>Difference {shoulder.signedResidualCmEquivalent >= 0 ? "+" : ""}{shoulder.signedResidualCmEquivalent.toFixed(2)} cm</small>
        </div>
        <div>
          <span>Central outline MAE</span>
          <strong>{(candidate.scoreComponents.fixedHeightCentralOutline.meanAbsoluteBodyHeight * 168).toFixed(2)} cm-equivalent</strong>
          <small>{candidate.scoreComponents.fixedHeightCentralOutline.featureCount} fixed-height checks</small>
        </div>
      </div>
      {candidate.closeGateFailures.length > 0 ? (
        <p>Failed: {candidate.closeGateFailures.map((failure) => failure.metric.replaceAll(/([A-Z])/g, " $1").toLowerCase()).join(" · ")}</p>
      ) : null}
    </div>
  );
}

export function WearMeasurementWorkbench({
  photoId,
  photo,
  candidates,
  selectedScanId,
  onSelectScan,
  photoMesh,
}: Props) {
  const workbenchRef = useRef<HTMLElement>(null);
  const photoSvgRef = useRef<SVGSVGElement>(null);
  const wearSvgRef = useRef<SVGSVGElement>(null);
  const autoSelectedPhotoRef = useRef<PhotoId | null>(null);
  const [payload, setPayload] = useState<WorkbenchPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeRow, setActiveRow] = useState<RowId>("waist");
  const [visibleRows, setVisibleRows] = useState<Record<RowId, boolean>>(() => Object.fromEntries(
    ROWS.map((row) => [row.id, row.initiallyVisible]),
  ) as Record<RowId, boolean>);
  const [lineEdits, setLineEdits] = useState<{ key: string; lines: Record<RowId, NormalizedLine> } | null>(null);
  const [drag, setDrag] = useState<{ row: RowId; kind: "line" | "left" | "right" } | null>(null);
  const [photoRulerEdit, setPhotoRulerEdit] = useState<{ key: PhotoId; ruler: PhotoRuler } | null>(null);
  const [photoRulerDrag, setPhotoRulerDrag] = useState<"a" | "b" | null>(null);
  const [wearRulerEdit, setWearRulerEdit] = useState<{
    key: string;
    ruler: WearRuler;
  } | null>(null);
  const [wearRulerDrag, setWearRulerDrag] = useState<"a" | "b" | null>(null);
  const [measurementSearch, setMeasurementSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const parameters = new URLSearchParams({ photo: photoId });
    if (selectedScanId) parameters.set("scan", selectedScanId);
    fetch(`/api/try-on-test/wear-mesh-overlay/workbench?${parameters}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as WorkbenchPayload;
        if (!response.ok) throw new Error(result.error || "The workbench is unavailable.");
        return result;
      })
      .then((result) => {
        if (cancelled) return;
        setError(null);
        setPayload(result);
        const firstRanked = result.match.photo.candidates[0]?.scanId;
        if (
          autoSelectedPhotoRef.current !== photoId
          && firstRanked
          && candidates.some((candidate) => candidate.scanId === firstRanked)
        ) {
          autoSelectedPhotoRef.current = photoId;
          if (firstRanked !== selectedScanId) onSelectScan(firstRanked);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "The workbench is unavailable.");
      });
    return () => { cancelled = true; };
  }, [candidates, onSelectScan, photoId, selectedScanId]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === workbenchRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const photoOutline = useMemo(() => photoMesh ? pairsFromFlat(photoMesh.outline) : [], [photoMesh]);
  const photoBounds = useMemo(() => outlineBounds(photoOutline), [photoOutline]);
  const stateKey = payload ? `${photoId}:${payload.scanId}` : "";
  const defaultLines = useMemo(() => {
    if (!payload || !photoBounds) return null;
    const centreX = (photoBounds.minimumX + photoBounds.maximumX) / 2;
    const next = {} as Record<RowId, NormalizedLine>;
    for (const definition of ROWS) {
      const metricRow = payload.metric.rows[definition.id];
      const y = rowYFromMetricHeight(
        photoBounds,
        metricRow.plane.heightCm,
        payload.metric.profile.heightCm,
      );
      const interval = horizontalBodyInterval(photoOutline, y, centreX);
      next[definition.id] = {
        left: interval?.left ?? centreX - 0.08,
        right: interval?.right ?? centreX + 0.08,
        y,
      };
    }
    return next;
  }, [payload, photoBounds, photoOutline]);
  const lines = lineEdits?.key === stateKey ? lineEdits.lines : defaultLines;
  const defaultPhotoRuler = useMemo<PhotoRuler | null>(() => {
    if (!lines) return null;
    const line = lines[activeRow];
    const row = ROWS.find((definition) => definition.id === activeRow);
    return {
      a: [line.left, line.y],
      b: [line.right, line.y],
      label: `${row?.label ?? activeRow} A-B`,
    };
  }, [activeRow, lines]);
  const photoRuler = photoRulerEdit?.key === photoId ? photoRulerEdit.ruler : defaultPhotoRuler;
  const defaultWearRuler = useMemo<WearRuler | null>(() => {
    if (!payload) return null;
    const row = payload.metric.rows[activeRow];
    return {
      a: row.abBreadth.frontProjectionCm[0],
      b: row.abBreadth.frontProjectionCm[1],
      label: `${row.label} A-B breadth`,
    };
  }, [activeRow, payload]);
  const wearRuler = wearRulerEdit?.key === stateKey ? wearRulerEdit.ruler : defaultWearRuler;

  function setWearRuler(ruler: WearRuler) {
    if (!stateKey) return;
    setWearRulerEdit({ key: stateKey, ruler });
  }

  function setPhotoRuler(ruler: PhotoRuler) {
    setPhotoRulerEdit({ key: photoId, ruler });
  }

  const selectedRank = payload?.match.photo.candidates.find((candidate) => candidate.scanId === payload.scanId);
  const selectedProfile = candidates.find((candidate) => candidate.scanId === payload?.scanId);
  const lineWidths = useMemo(() => {
    const result = {} as Record<RowId, number | null>;
    for (const definition of ROWS) {
      result[definition.id] = lines && photoBounds
        ? heightScaledLineWidthCm(lines[definition.id], photo.width, photo.height, photoBounds, photo.profile.heightCm)
        : null;
    }
    return result;
  }, [lines, photo.height, photo.profile.heightCm, photo.width, photoBounds]);

  const visibleMeasurements = useMemo(() => {
    const query = measurementSearch.trim().toLowerCase();
    const measurements = payload?.metric.measurements ?? [];
    if (!query) return measurements;
    return measurements.filter((measurement) => (
      measurement.sourceKey.toLowerCase().includes(query)
      || measurement.landmarkNames?.some((name) => name.toLowerCase().includes(query))
    ));
  }, [measurementSearch, payload]);

  const rulerProofMeasurements = useMemo(() => {
    const sourceKeys = new Set([
      "acromion_radiale_length_right_mm",
      "crotch_height_mm",
      "knee_height_standing_left_mm",
    ]);
    return (payload?.metric.measurements ?? []).filter((measurement) => (
      sourceKeys.has(measurement.sourceKey)
      && measurement.geometryAvailable
      && measurement.canonicalPointsCm?.length === 2
    ));
  }, [payload]);

  function showMeasurementRuler(measurement: WearMeasurement) {
    if (!measurement.canonicalPointsCm || measurement.canonicalPointsCm.length !== 2) return;
    const [a3d, b3d] = measurement.canonicalPointsCm;
    setWearRuler({
      a: [a3d![0], a3d![2]],
      b: [b3d![0], b3d![2]],
      exact3dCm: measurement.geometryLengthCm,
      sourceMeasurementCm: measurement.valueCm ?? undefined,
      geometryType: measurement.geometryType,
      protocolNote: measurement.protocolNote,
      label: measurement.landmarkNames?.join(" → ") ?? formatMeasurementName(measurement.sourceKey),
    });
  }

  function photoPoint(event: ReactPointerEvent<SVGSVGElement>): Point2 {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    ];
  }

  function movePhotoInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    const [x, y] = photoPoint(event);
    if (photoRulerDrag && photoRuler) {
      setPhotoRuler({
        a: photoRulerDrag === "a" ? [x, y] : photoRuler.a,
        b: photoRulerDrag === "b" ? [x, y] : photoRuler.b,
        label: "Free photo-mesh A-B",
      });
      return;
    }
    if (!drag || !lines || !photoBounds) return;
    const previous = lines[drag.row];
    const nextLines = drag.kind === "line"
      ? (() => {
        const centreX = (photoBounds.minimumX + photoBounds.maximumX) / 2;
        const interval = horizontalBodyInterval(photoOutline, y, centreX);
        return {
          ...lines,
          [drag.row]: { left: interval?.left ?? previous.left, right: interval?.right ?? previous.right, y },
        };
      })()
      : {
        ...lines,
        [drag.row]: { ...previous, y, [drag.kind]: x },
      };
    setLineEdits({ key: stateKey, lines: nextLines });
  }

  function resetRowToVisibleEdges(rowId: RowId) {
    if (!lines || !photoBounds) return;
    const centreX = (photoBounds.minimumX + photoBounds.maximumX) / 2;
    const current = lines[rowId];
    const interval = horizontalBodyInterval(photoOutline, current.y, centreX);
    if (!interval) return;
    setLineEdits({ key: stateKey, lines: { ...lines, [rowId]: { left: interval.left, right: interval.right, y: current.y } } });
  }

  function wearPoint(event: ReactPointerEvent<SVGSVGElement>): Point2 | null {
    const svg = wearSvgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return null;
    const transformed = point.matrixTransform(matrix);
    return [transformed.x, -transformed.y];
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement === workbenchRef.current) {
      await document.exitFullscreen();
    } else {
      await workbenchRef.current?.requestFullscreen();
    }
  }

  if (!photoMesh) {
    return <section className={styles.workbenchLoading}>Waiting for {photo.label.split(" · ")[0]}&apos;s Blender 2D mesh…</section>;
  }

  if (error) {
    return <section className={styles.workbenchError}><strong>Workbench unavailable</strong><span>{error}</span></section>;
  }

  if (!payload || !lines) {
    return <section className={styles.workbenchLoading}>Loading exact WEAR geometry…</section>;
  }

  const wearBounds = payload.metric.frontProjection.boundsCm;
  const wearPadding = 5;
  const wearViewBox = `${wearBounds.minX - wearPadding} ${-(wearBounds.maxZ + wearPadding)} ${wearBounds.maxX - wearBounds.minX + wearPadding * 2} ${wearBounds.maxZ - wearBounds.minZ + wearPadding * 2}`;
  const freeRuler2dCm = wearRuler ? Math.hypot(wearRuler.b[0] - wearRuler.a[0], wearRuler.b[1] - wearRuler.a[1]) : null;
  const photoRulerCm = photoRuler && photoBounds
    ? heightScaledDistanceCm(photoRuler.a, photoRuler.b, photo.width, photo.height, photoBounds, photo.profile.heightCm)
    : null;
  const proofDefinition = ROWS.find((definition) => definition.id === activeRow)!;
  const proofWearRow = payload.metric.rows[activeRow];
  const proofPhotoWidth = lineWidths[activeRow];
  const proofDifference = proofPhotoWidth == null ? null : proofPhotoWidth - proofWearRow.breadthCm;

  return (
    <section ref={workbenchRef} className={styles.measurementWorkbench} data-fullscreen={isFullscreen}>
      <header className={styles.workbenchHeader}>
        <div>
          <p>Safe shape-distance search + measurement workbench</p>
          <h2>{photo.label.split(" · ")[0]} ↔ real WEAR bodies</h2>
          <span>Ranking uses central outline widths, exact waist/hip A-B and shoulder span. Tape, circumference, depth and saved lines never enter the rank.</span>
        </div>
        <button type="button" onClick={toggleFullscreen}>{isFullscreen ? "Close full screen" : "Open full screen"}</button>
      </header>

      {photo.profile.gender && photo.profile.measurementsCm?.waist ? (
        <WaistOnlyProofPanel
          photoId={photoId}
          gender={photo.profile.gender}
          heightCm={photo.profile.heightCm}
          weightKg={photo.profile.weightKg}
          savedWaistCm={photo.profile.measurementsCm.waist}
        />
      ) : null}

      <div className={styles.rankRail} aria-label="Visible-shape ranked WEAR candidates">
        {payload.match.photo.candidates.map((ranked) => {
          const profile = candidates.find((candidate) => candidate.scanId === ranked.scanId);
          if (!profile) return null;
          return (
            <button
              type="button"
              key={ranked.scanId}
              data-active={ranked.scanId === payload.scanId}
              onClick={() => onSelectScan(ranked.scanId)}
            >
              <b>#{ranked.rank}</b>
              <strong>{ranked.scanId}</strong>
              <span>Safe score {ranked.score.toFixed(2)} · {ranked.genuinelyClose ? "close" : "not close"}</span>
              <small>
                H {profile.heightCm.toFixed(1)} · W {profile.weightKg.toFixed(2)} kg<br />
                Chest {profile.measurementsCm.chest.toFixed(1)} · Waist {profile.measurementsCm.waist.toFixed(1)} · Hips {profile.measurementsCm.hips.toFixed(1)} cm
              </small>
            </button>
          );
        })}
      </div>

      <section className={styles.meshLineProof} aria-label="Delaram and selected WEAR mesh line comparison">
        <header className={styles.meshLineProofHeader}>
          <div>
            <span>New · line-on-mesh proof</span>
            <h3>{photo.label.split(" · ")[0]} line ↔ exact WEAR line</h3>
          </div>
          <div className={styles.meshLineProofTabs} aria-label="Select the compared body line">
            {(["waist", "hips"] as const).map((rowId) => (
              <button
                key={rowId}
                type="button"
                data-active={activeRow === rowId}
                onClick={() => setActiveRow(rowId)}
              >
                {rowId === "waist" ? "Natural waist" : "Hips"}
              </button>
            ))}
          </div>
        </header>

        <div className={styles.meshLineProofStage}>
          <MeshLineComparisonCanvas
            photo={photo}
            photoMesh={photoMesh}
            wearMesh={payload.mesh2d}
            metric={payload.metric}
            photoLine={lines[activeRow]}
            rowId={activeRow}
          />
        </div>

        <div className={styles.meshLineProofResults}>
          <div data-source="photo">
            <span><i />Solid pink · {photo.label.split(" · ")[0]} mesh line</span>
            <strong>{proofPhotoWidth?.toFixed(2) ?? "–"} cm</strong>
            <small>The movable line currently placed on the photo mesh</small>
          </div>
          <div data-source="wear">
            <span><i />Dashed yellow · {payload.scanId} WEAR line</span>
            <strong>{proofWearRow.breadthCm.toFixed(2)} cm</strong>
            <small>Exact PLY {proofDefinition.label.toLowerCase()} A-B line</small>
          </div>
          <div data-source="difference">
            <span>Visible A-B difference</span>
            <strong>{proofDifference == null ? "–" : signedDifferenceLabel(proofDifference)}</strong>
            <small>{proofDifference == null ? "Waiting for both lines" : proofDifference > 0 ? `${photo.label.split(" · ")[0]} line is wider` : proofDifference < 0 ? `${photo.label.split(" · ")[0]} line is narrower` : "The two lines are equal"}</small>
          </div>
        </div>
      </section>

      <div className={styles.workbenchMain}>
        <div className={styles.visualColumn}>
          <div className={styles.visualHeading}>
            <div><strong>Photo overlay</strong><span>Cyan = {photo.label.split(" · ")[0]} mesh · orange = selected WEAR projection</span></div>
            <small>Raw height alignment · pose differs · diagnostic only</small>
          </div>
          <div className={styles.workbenchPhotoStage} style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
            <Image src={photo.src} alt={photo.label} fill sizes="(max-width: 1000px) 100vw, 45vw" />
            <OverlayMeshCanvas photo={photo} photoMesh={photoMesh} wearMesh={payload.mesh2d} metric={payload.metric} />
            <svg
              ref={photoSvgRef}
              className={styles.photoLineLayer}
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              onPointerMove={movePhotoInteraction}
              onPointerUp={() => { setDrag(null); setPhotoRulerDrag(null); }}
              onPointerCancel={() => { setDrag(null); setPhotoRulerDrag(null); }}
            >
              {ROWS.map((definition) => {
                if (!visibleRows[definition.id]) return null;
                const line = lines[definition.id];
                const selected = activeRow === definition.id;
                return (
                  <g key={definition.id} data-selected={selected}>
                    <line
                      x1={line.left}
                      x2={line.right}
                      y1={line.y}
                      y2={line.y}
                      stroke={definition.color}
                      className={styles.anatomicalLine}
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setActiveRow(definition.id);
                        setDrag({ row: definition.id, kind: "line" });
                      }}
                    />
                    {selected ? (
                      <>
                        <circle cx={line.left} cy={line.y} r="0.006" fill={definition.color} className={styles.smallHandle} onPointerDown={() => setDrag({ row: definition.id, kind: "left" })} />
                        <circle cx={line.right} cy={line.y} r="0.006" fill={definition.color} className={styles.smallHandle} onPointerDown={() => setDrag({ row: definition.id, kind: "right" })} />
                      </>
                    ) : null}
                  </g>
                );
              })}
              {photoRuler ? (
                <g className={styles.photoFreeRuler}>
                  <line x1={photoRuler.a[0]} y1={photoRuler.a[1]} x2={photoRuler.b[0]} y2={photoRuler.b[1]} />
                  <circle
                    cx={photoRuler.a[0]}
                    cy={photoRuler.a[1]}
                    r="0.006"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setPhotoRulerDrag("a");
                    }}
                  />
                  <circle
                    cx={photoRuler.b[0]}
                    cy={photoRuler.b[1]}
                    r="0.006"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setPhotoRulerDrag("b");
                    }}
                  />
                </g>
              ) : null}
            </svg>
            {photoRuler ? (
              <div className={`${styles.rulerReadout} ${styles.photoRulerReadout}`} aria-live="polite">
                <small>LIVE FREE RULER · PERSON</small>
                <strong>{photoRulerCm?.toFixed(2) ?? "–"} cm</strong>
                <span>{photoRuler.label}</span>
                <em>Known-height photo estimate</em>
              </div>
            ) : null}
          </div>
          <div className={styles.photoScaleWarning}>
            <strong>{photo.label.split(" · ")[0]} width = height-scale photo estimate</strong>
            <span>Drag either white A-B ruler endpoint; the centimetres update live. Camera perspective is not removed, so this is not tape truth.</span>
            <button type="button" onClick={() => setPhotoRulerEdit(null)}>Reset ruler to selected body line</button>
          </div>
        </div>

        <div className={styles.visualColumn}>
          <div className={styles.visualHeading}>
            <div><strong>{payload.metric.scanId} exact WEAR front</strong><span>PLY → anatomical axes → orthographic X/Z centimetres</span></div>
            <small>No camera · no pixels · no Apple</small>
          </div>
          <div className={styles.wearCanonicalStage}>
            <WearCanonicalCanvas mesh={payload.mesh2d} metric={payload.metric} />
            <svg
              ref={wearSvgRef}
              className={styles.wearLineLayer}
              viewBox={wearViewBox}
              preserveAspectRatio="xMidYMid meet"
              onPointerMove={(event) => {
                if (!wearRulerDrag || !wearRuler) return;
                const next = wearPoint(event);
                if (!next) return;
                setWearRuler({
                  a: wearRulerDrag === "a" ? next : wearRuler.a,
                  b: wearRulerDrag === "b" ? next : wearRuler.b,
                  label: "Free front-plane A-B",
                });
              }}
              onPointerUp={() => setWearRulerDrag(null)}
              onPointerCancel={() => setWearRulerDrag(null)}
            >
              {ROWS.map((definition) => {
                if (!visibleRows[definition.id]) return null;
                const row = payload.metric.rows[definition.id];
                const [a, b] = row.abBreadth.frontProjectionCm;
                return <line key={definition.id} x1={a[0]} y1={-a[1]} x2={b[0]} y2={-b[1]} stroke={definition.color} className={styles.wearExactLine} />;
              })}
              {wearRuler ? (
                <g className={styles.freeRuler}>
                  <line x1={wearRuler.a[0]} y1={-wearRuler.a[1]} x2={wearRuler.b[0]} y2={-wearRuler.b[1]} />
                  <circle cx={wearRuler.a[0]} cy={-wearRuler.a[1]} r="1.15" onPointerDown={() => setWearRulerDrag("a")} />
                  <circle cx={wearRuler.b[0]} cy={-wearRuler.b[1]} r="1.15" onPointerDown={() => setWearRulerDrag("b")} />
                </g>
              ) : null}
            </svg>
            {wearRuler ? (
              <div className={styles.rulerReadout} aria-live="polite">
                <small>LIVE FREE RULER · WEAR</small>
                <strong>{freeRuler2dCm?.toFixed(2)} cm</strong>
                <span>{wearRuler.label}</span>
                <em>Exact front X/Z centimetres</em>
              </div>
            ) : null}
          </div>
          <div className={styles.metricTruthRow}>
            <span>Source unit proved: <b>{payload.metric.scaleEvidence.chosenRawUnit}</b></span>
            <span>Browser mesh: <b>{payload.mesh2d.verticesCm.length.toLocaleString()} vertices</b></span>
            <span>Depth used for matching: <b>No</b></span>
          </div>
        </div>

        <aside className={styles.measurementSidebar}>
          <div className={styles.selectionSummary}>
            <span>{selectedRank ? "Selected shape-ranked candidate" : "Selected strict profile candidate"}</span>
            <strong>#{selectedRank?.rank ?? selectedProfile?.cohortPosition ?? "–"} · {payload.scanId}</strong>
            <small>
              {selectedRank
                ? `Safe score ${selectedRank.score.toFixed(2)} · ${selectedRank.genuinelyClose ? "close" : "NOT genuinely close"}`
                : "Profile-filtered only · inspect the overlay yourself"}<br />
              H {selectedProfile?.heightCm.toFixed(1) ?? "–"} cm · W {selectedProfile?.weightKg.toFixed(2) ?? "–"} kg
            </small>
          </div>

          <SafeDistanceEvidence candidate={selectedRank} />
          {payload.normalizedOverlay ? (
            <NormalizedMatchProof overlay={payload.normalizedOverlay} candidate={selectedRank} />
          ) : null}

          <div className={styles.lineToggleList}>
            <strong>Lines</strong>
            {ROWS.map((definition) => (
              <div key={definition.id} data-active={activeRow === definition.id}>
                <button type="button" onClick={() => {
                  setActiveRow(definition.id);
                  const row = payload.metric.rows[definition.id];
                  setWearRuler({
                    a: row.abBreadth.frontProjectionCm[0],
                    b: row.abBreadth.frontProjectionCm[1],
                    label: `${row.label} A-B breadth`,
                  });
                }}>
                  <i style={{ background: definition.color }} />{definition.label}
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleRows[definition.id]}
                    onChange={(event) => setVisibleRows({ ...visibleRows, [definition.id]: event.target.checked })}
                  />
                  {visibleRows[definition.id] ? "Visible" : "Hidden"}
                </label>
              </div>
            ))}
          </div>

          {ROWS.map((definition) => {
            if (definition.id !== activeRow) return null;
            const row = payload.metric.rows[definition.id];
            const photoWidth = lineWidths[definition.id];
            const difference = photoWidth == null ? null : photoWidth - row.breadthCm;
            const contourXs = row.contour.pointsCm.map((point) => point[0]);
            const contourDepths = row.contour.pointsCm.map((point) => point[1]);
            const contourCentreX = (Math.min(...contourXs) + Math.max(...contourXs)) / 2;
            const contourCentreDepth = (Math.min(...contourDepths) + Math.max(...contourDepths)) / 2;
            const normalizedContour = row.contour.pointsCm.map(([x, depth]) => [
              (x - contourCentreX) / Math.max(0.001, row.breadthCm / 2),
              (depth - contourCentreDepth) / Math.max(0.001, row.depthCm / 2),
            ] as Point2);
            const circumferenceEstimate = photoWidth != null && row.recordedTape?.valueCm
              ? transferClosedContourCircumferenceCm({
                normalizedContour,
                sourceBreadthCm: row.breadthCm,
                sourceDepthCm: row.depthCm,
                targetBreadthCm: photoWidth,
                recordedCircumferenceCm: row.recordedTape.valueCm,
              })
              : null;
            const actualKey = definition.id === "underbust"
              ? "underbust"
              : definition.id === "chest" || definition.id === "waist" || definition.id === "hips"
                ? definition.id
                : null;
            const actualTape = actualKey ? photo.profile.measurementsCm?.[actualKey] ?? 0 : 0;
            const estimateDifference = circumferenceEstimate != null && actualTape > 0
              ? circumferenceEstimate - actualTape
              : null;
            return (
              <div className={styles.activeRowCard} key={definition.id} style={{ "--row-color": definition.color } as React.CSSProperties}>
                <div className={styles.activeRowTitle}>
                  <div><span>Active row</span><strong>{definition.label}</strong></div>
                  <button type="button" onClick={() => resetRowToVisibleEdges(definition.id)}>Snap to visible torso edges</button>
                </div>
                <div className={styles.widthComparison}>
                  <div><span>{photo.label.split(" · ")[0]} photo A-B</span><strong>{photoWidth?.toFixed(2) ?? "–"} cm</strong><small>height-scale estimate</small></div>
                  <div><span>WEAR exact PLY A-B</span><strong>{row.breadthCm.toFixed(2)} cm</strong><small>{row.plane.heightCm.toFixed(1)} cm from floor</small></div>
                  <div><span>Visible-width difference</span><strong>{difference == null ? "–" : signedDifferenceLabel(difference)}</strong><small>{photo.label.split(" · ")[0]} compared with WEAR</small></div>
                </div>
                <div className={styles.transferStatus} data-allowed={circumferenceEstimate != null}>
                  <span>Experimental selected-WEAR-shape estimate</span>
                  <strong>{circumferenceEstimate != null ? `${circumferenceEstimate.toFixed(1)} cm` : "Unavailable"}</strong>
                </div>
                {circumferenceEstimate != null ? (
                  <div className={styles.circumferenceExperiment}>
                    <div><span>Estimated circumference</span><strong>{circumferenceEstimate.toFixed(1)} cm</strong></div>
                    <div><span>Saved real tape</span><strong>{actualTape > 0 ? `${actualTape.toFixed(1)} cm` : "Not entered"}</strong></div>
                    <div><span>Estimate vs real</span><strong>{estimateDifference == null ? "–" : `${estimateDifference >= 0 ? "+" : ""}${estimateDifference.toFixed(1)} cm`}</strong></div>
                  </div>
                ) : null}
                <details className={styles.sourceGeometryDetails}>
                  <summary>More WEAR source details</summary>
                  <div className={styles.sourceGeometryGrid}>
                    <div><span>WEAR depth C-D</span><strong>{row.depthCm.toFixed(2)} cm</strong></div>
                    <div><span>Raw mesh loop</span><strong>{row.closedLoopCircumferenceCm != null ? `${row.closedLoopCircumferenceCm.toFixed(2)} cm` : "Not certified"}</strong></div>
                    <div><span>Recorded WEAR tape</span><strong>{row.recordedTape ? `${row.recordedTape.valueCm.toFixed(1)} cm` : "Unavailable"}</strong></div>
                    <div><span>Plane height</span><strong>{row.plane.heightCm.toFixed(1)} cm</strong></div>
                  </div>
                  <p className={styles.rowProtocol}>{row.plane.heightSource}. {row.planeProtocol ?? "Exact mesh cross-section at this plane."}</p>
                </details>
                <p className={styles.blockedNote}>Experiment only: the selected WEAR person&apos;s real cross-section shape and depth are kept; only its left-right breadth is resized to the photo A-B. This tests the idea against the saved real tape—it is not a proven customer answer.</p>
              </div>
            );
          })}
        </aside>
      </div>

      <div className={styles.rulerVerification}>
        <div className={styles.rulerVerificationHeading}>
          <div>
            <span>A–B scale verification</span>
            <strong>Does this WEAR mesh really measure in centimetres?</strong>
          </div>
          <div className={styles.rulerProofButtons}>
            {rulerProofMeasurements.map((measurement) => (
              <button key={measurement.id} type="button" onClick={() => showMeasurementRuler(measurement)}>
                {measurement.sourceKey === "acromion_radiale_length_right_mm"
                  ? "Upper arm A–B"
                  : measurement.sourceKey === "crotch_height_mm"
                    ? "Crotch height"
                    : "Knee height"}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.rulerVerificationGrid}>
          <div>
            <span>Drawn front-view line</span>
            <strong>{freeRuler2dCm?.toFixed(3) ?? "–"} cm</strong>
            <small>Exact X/Z projected distance</small>
          </div>
          <div>
            <span>Real 3D landmark A–B</span>
            <strong>{wearRuler?.exact3dCm != null ? `${wearRuler.exact3dCm.toFixed(3)} cm` : "Not snapped"}</strong>
            <small>{wearRuler?.geometryType ?? "Drag anywhere = projected distance only"}</small>
          </div>
          <div>
            <span>WEAR source number</span>
            <strong>{wearRuler?.sourceMeasurementCm != null ? `${wearRuler.sourceMeasurementCm.toFixed(3)} cm` : "No matching record"}</strong>
            <small>{wearRuler?.protocolNote ?? "Choose a proof line above"}</small>
          </div>
          <div data-pass={
            wearRuler?.exact3dCm != null
            && wearRuler.sourceMeasurementCm != null
            && Math.abs(wearRuler.exact3dCm - wearRuler.sourceMeasurementCm) <= 0.1
          }>
            <span>3D versus source</span>
            <strong>{wearRuler?.exact3dCm != null && wearRuler.sourceMeasurementCm != null
              ? `${Math.abs(wearRuler.exact3dCm - wearRuler.sourceMeasurementCm).toFixed(3)} cm difference`
              : "Choose a proof line"}</strong>
            <small>≤0.10 cm confirms the stored scale</small>
          </div>
        </div>
        <p>Any freely drawn line is exact in the front X/Z plane. It is not a full 3D distance unless you select known landmark endpoints. WEAR records inseam, but this export has no defensible inseam A–B landmarks, so we do not invent them.</p>
      </div>

      <details className={styles.measurementLibrary}>
        <summary>All {payload.metric.measurements.length} recorded WEAR measurements and available A-B geometry</summary>
        <div className={styles.measurementTools}>
          <input value={measurementSearch} onChange={(event) => setMeasurementSearch(event.target.value)} placeholder="Search arm, sleeve, shoulder, inseam…" />
          <span>{visibleMeasurements.length} shown</span>
        </div>
        <div className={styles.measurementTable}>
          {visibleMeasurements.map((measurement) => (
            <div key={measurement.id}>
              <div><strong>{formatMeasurementName(measurement.sourceKey)}</strong><small>{measurement.sourceGroup}</small></div>
              <b>{measurement.valueCm != null ? `${measurement.valueCm.toFixed(2)} cm` : `${measurement.value.toFixed(2)} ${measurement.unit}`}</b>
              <span>
                {measurement.geometryAvailable
                  ? `${measurement.geometryType}: ${measurement.geometryLengthCm?.toFixed(2)} cm`
                  : measurement.geometryUnavailableReason}
              </span>
              {measurement.geometryAvailable && measurement.canonicalPointsCm?.length === 2 ? (
                <button type="button" onClick={() => showMeasurementRuler(measurement)}>Show A-B</button>
              ) : <em>{measurement.geometryAvailable ? "No straight A-B" : "No honest endpoints"}</em>}
            </div>
          ))}
        </div>
      </details>

      <footer className={styles.workbenchTruth}>
        <strong>Honest boundary</strong>
        <span>WEAR geometry is exact. The selected person&apos;s photo widths remain single-photo height-scale estimates. A transferred circumference is an explicit experiment, never a proven answer.</span>
      </footer>
    </section>
  );
}
