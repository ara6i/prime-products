"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/app/shared/lib/utils";
import type {
  WearV6Prediction,
  WearV6Row,
  WearV6RowKind,
} from "./wearV6Types";

type ActualMeasurements = Partial<Record<WearV6RowKind, number | null>>;

interface HeldoutModel {
  scanId: string;
  subjectId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
}

interface ExactTrainingRow {
  kind: WearV6RowKind;
  label: string;
  planeHeightCm: number | null;
  planeSource: string | null;
  abFrontProjectionCm: Array<readonly [number, number]>;
  frontWidthCm: number;
  depthCm: number;
  cCanonicalCm: number[] | null;
  dCanonicalCm: number[] | null;
  contourCm: Array<readonly [number, number]>;
  geometryPerimeterCm: number | null;
  geometryPerimeterKind: "raw-closed-ply-loop" | "diagnostic-reconstructed-ply-loop" | "unavailable";
  recordedTapeCm: number | null;
  rawCentralLoopClosed: boolean;
  certifiedSection: boolean;
  geometryTrainingEligible: boolean;
  tapeTrainingEligible: boolean;
  stitchEvidence: Record<string, unknown> | null;
  sourceGeometry: string;
  qualityFlags: string[];
}

interface ExactTrainingMesh {
  scanId: string;
  units: "centimetres";
  verticesCm: Array<readonly [number, number]>;
  triangles: Array<readonly [number, number, number]>;
  depthUsed: false;
  trainingRows: Partial<Record<WearV6RowKind, ExactTrainingRow>>;
  trainingTargets: WearTrainingTarget[];
  trainingTargetSummary: {
    total: number;
    exactGeometry: number;
    exactRows: number;
    recordedScalarOnly: number;
    geometryReady: number;
    geometryRejected: number;
  };
  cameraAudit: {
    frontProjectionValid?: boolean;
    status?: string;
    meshVerticalBoundsCm?: number[];
    recordedStatureCm?: number;
    normalization?: Record<string, unknown>;
  } | null;
}

interface WearTrainingTarget {
  id: string;
  label: string;
  family: string;
  sourceGroup: string;
  sourceKey: string;
  value: number;
  unit: string;
  valueCm: number | null;
  status: "exact-geometry" | "exact-row-geometry" | "recorded-scalar-only";
  geometryAvailable: boolean;
  geometryType: string | null;
  geometryLengthCm: number | null;
  landmarkNames: string[];
  canonicalPointsCm: number[][];
  frontPointsCm: Array<readonly [number, number]>;
  rowId: string | null;
  protocolNote: string | null;
  geometryUnavailableReason: string | null;
  planeHeightEligible: boolean;
  geometryTrainingEligible: boolean;
  qualityFlags: string[];
  trainingRejectionReasons: string[];
}

interface BlenderProof {
  pngUrl: string;
  version: string;
  cached: boolean;
  cameraCards: Record<string, string>;
  originalFaces: number | null;
  browserFaces: number | null;
  cameras: Array<{
    id: string;
    yawDeg: number;
    pitchDeg: number;
    rollDeg: number;
    lensMm: number;
    projection: string;
    knownTransform: boolean;
  }>;
}

const PARTS: WearV6RowKind[] = ["neck", "chest", "underbust", "waist", "hips"];
const LABELS: Record<WearV6RowKind, string> = {
  neck: "Neck",
  chest: "Chest",
  underbust: "Under-bust",
  waist: "Natural waist",
  hips: "Hips",
};
const COLOURS: Record<WearV6RowKind, string> = {
  neck: "#c084fc",
  chest: "#60a5fa",
  underbust: "#fbbf24",
  waist: "#22d3ee",
  hips: "#4ade80",
};

function signed(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function shapePoints(
  points: Array<{ x: number; y: number }>,
  scale: number,
  centreX = 170,
  centreY = 150,
) {
  return points.map((point) => (
    `${(centreX + point.x * scale).toFixed(2)},${(centreY + point.y * scale).toFixed(2)}`
  )).join(" ");
}

function closedPathLength(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return null;
  return points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length]!;
    return total + Math.hypot(next.x - point.x, next.y - point.y);
  }, 0);
}

function centredContour(points: Array<readonly [number, number]>) {
  if (!points.length) return [];
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;
  return points.map((point) => ({ x: point[0] - centreX, y: point[1] - centreY }));
}

function ExactMeshCanvas({
  activePart,
  learningMix,
  mesh,
  predictedMeasurement,
  predictedRow,
  showPredicted,
  selectedTrainingTarget,
}: {
  activePart: WearV6RowKind;
  learningMix: number;
  mesh: ExactTrainingMesh;
  predictedMeasurement: WearV6Prediction["measurements"][number] | undefined;
  predictedRow: WearV6Row | undefined;
  showPredicted: boolean;
  selectedTrainingTarget?: WearTrainingTarget;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh.verticesCm.length) return;
    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#020617";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const xs = mesh.verticesCm.map((point) => point[0]);
      const zs = mesh.verticesCm.map((point) => point[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const padding = 24 * ratio;
      const scale = Math.min(
        (canvas.width - padding * 2) / Math.max(1, maxX - minX),
        (canvas.height - padding * 2) / Math.max(1, maxZ - minZ),
      );
      const offsetX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
      const offsetY = (canvas.height - (maxZ - minZ) * scale) / 2 + maxZ * scale;
      const point = ([x, z]: readonly [number, number]) => [offsetX + x * scale, offsetY - z * scale] as const;

      context.strokeStyle = "rgba(34,211,238,.52)";
      context.lineWidth = Math.max(0.55 * ratio, 0.65);
      context.beginPath();
      for (const triangle of mesh.triangles) {
        const a = mesh.verticesCm[triangle[0]];
        const b = mesh.verticesCm[triangle[1]];
        const c = mesh.verticesCm[triangle[2]];
        if (!a || !b || !c) continue;
        const pa = point(a);
        const pb = point(b);
        const pc = point(c);
        context.moveTo(pa[0], pa[1]);
        context.lineTo(pb[0], pb[1]);
        context.lineTo(pc[0], pc[1]);
        context.closePath();
      }
      context.stroke();

      for (const kind of PARTS) {
        const row = mesh.trainingRows[kind];
        if (!row || row.abFrontProjectionCm.length !== 2) continue;
        const unsafeRow = !row.geometryTrainingEligible || row.qualityFlags.some((flag) => (
          flag.toLowerCase().includes("reconstructed")
          || flag.toLowerCase().includes("not-certified")
          || flag.toLowerCase().includes("outside-lnd-torso-bounds")
          || flag.toLowerCase().includes("over-12pct")
        ));
        const left = point(row.abFrontProjectionCm[0]!);
        const right = point(row.abFrontProjectionCm[1]!);
        context.save();
        context.strokeStyle = unsafeRow ? "#ef4444" : COLOURS[kind];
        context.globalAlpha = kind === activePart ? 1 : 0.25;
        context.lineWidth = (kind === activePart ? 4 : 1.8) * ratio;
        if (unsafeRow) context.setLineDash([8 * ratio, 6 * ratio]);
        context.beginPath();
        context.moveTo(left[0], left[1]);
        context.lineTo(right[0], right[1]);
        context.stroke();
        context.restore();
      }

      if (selectedTrainingTarget?.frontPointsCm.length && selectedTrainingTarget.frontPointsCm.length >= 2) {
        context.save();
        const targetColour = selectedTrainingTarget.geometryTrainingEligible ? "#f97316" : "#ef4444";
        context.strokeStyle = targetColour;
        context.shadowColor = targetColour;
        context.shadowBlur = 10 * ratio;
        context.lineWidth = 5 * ratio;
        if (!selectedTrainingTarget.geometryTrainingEligible) context.setLineDash([10 * ratio, 7 * ratio]);
        context.beginPath();
        selectedTrainingTarget.frontPointsCm.forEach((targetPoint, index) => {
          const projected = point(targetPoint);
          if (index === 0) context.moveTo(projected[0], projected[1]);
          else context.lineTo(projected[0], projected[1]);
        });
        context.stroke();
        context.restore();
      }

      const truth = mesh.trainingRows[activePart];
      if (showPredicted && truth && predictedRow && predictedMeasurement) {
        const centreX = truth.abFrontProjectionCm.reduce((sum, value) => sum + value[0], 0) / 2;
        const predictedZ = maxZ - predictedRow.photo.left.y * (maxZ - minZ);
        const predictedHalf = predictedMeasurement.appleCorrectedWidthCm / 2;
        const predictedLeft: readonly [number, number] = [centreX - predictedHalf, predictedZ];
        const predictedRight: readonly [number, number] = [centreX + predictedHalf, predictedZ];
        const truthLeft = truth.abFrontProjectionCm[0]!;
        const truthRight = truth.abFrontProjectionCm[1]!;
        const blend = (from: readonly [number, number], to: readonly [number, number]) => (
          [from[0] + (to[0] - from[0]) * learningMix, from[1] + (to[1] - from[1]) * learningMix] as const
        );
        const blendedLeft = point(blend(predictedLeft, truthLeft));
        const blendedRight = point(blend(predictedRight, truthRight));
        context.save();
        context.strokeStyle = learningMix < 0.5 ? "#06b6d4" : "#fb923c";
        context.shadowColor = context.strokeStyle;
        context.shadowBlur = 8 * ratio;
        context.lineWidth = 5 * ratio;
        context.beginPath();
        context.moveTo(blendedLeft[0], blendedLeft[1]);
        context.lineTo(blendedRight[0], blendedRight[1]);
        context.stroke();
        context.restore();
      }
    };
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    window.addEventListener("resize", render);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [activePart, learningMix, mesh, predictedMeasurement, predictedRow, selectedTrainingTarget, showPredicted]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Exact WEAR PLY triangle mesh with anatomical training rows" />;
}

function AllWearTargetsInspector({ activePart, mesh }: { activePart: WearV6RowKind; mesh: ExactTrainingMesh }) {
  const families = useMemo(() => Array.from(new Set(mesh.trainingTargets.map((target) => target.family))), [mesh.trainingTargets]);
  const activeRowTarget = mesh.trainingTargets.find((target) => target.rowId === activePart);
  const [manualSelection, setManualSelection] = useState<{
    activePart: WearV6RowKind;
    family: string;
    selectedId: string;
  } | null>(null);
  const family = manualSelection?.activePart === activePart
    ? manualSelection.family
    : activeRowTarget?.family ?? families[0] ?? "";
  const selectedId = manualSelection?.activePart === activePart
    ? manualSelection.selectedId
    : activeRowTarget?.id ?? mesh.trainingTargets[0]?.id ?? "";

  const familyTargets = mesh.trainingTargets.filter((target) => target.family === family);
  const selected = mesh.trainingTargets.find((target) => target.id === selectedId) ?? familyTargets[0];
  const recordedDifference = selected?.status === "exact-geometry" && selected.valueCm != null && selected.geometryLengthCm != null
    ? selected.valueCm - selected.geometryLengthCm
    : null;

  return (
    <section className="border-y border-sky-200 bg-slate-950 px-5 py-6 text-white" data-testid="wear-all-training-targets">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.13em] text-orange-300">Everything WEAR gives this person</p>
          <h4 className="mt-1 text-2xl font-black">Exact visual target map</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Orange geometry comes from the PLY/LND source. A stored number without a defensible path stays visible but blocked from geometry training.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-400/15 px-4 py-3"><strong className="block text-2xl text-emerald-300">{mesh.trainingTargetSummary.geometryReady}</strong><span className="text-xs text-slate-300">GPU-ready geometry</span></div>
          <div className="rounded-xl bg-red-400/15 px-4 py-3"><strong className="block text-2xl text-red-300">{mesh.trainingTargetSummary.geometryRejected + mesh.trainingTargetSummary.recordedScalarOnly}</strong><span className="text-xs text-slate-300">not safe for training yet</span></div>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {families.map((name) => (
          <button key={name} type="button" onClick={() => setManualSelection({ activePart, family: name, selectedId: mesh.trainingTargets.find((target) => target.family === name)?.id ?? "" })} className={cn("shrink-0 rounded-xl border px-4 py-2.5 text-sm font-black", family === name ? "border-orange-400 bg-orange-400 text-slate-950" : "border-white/15 bg-white/5 text-slate-200")}>{name}</button>
        ))}
      </div>

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(360px,.9fr)_minmax(0,1.1fr)]">
        <div className="min-h-[620px] overflow-hidden rounded-2xl border border-white/15 bg-slate-950">
          <ExactMeshCanvas activePart={activePart} learningMix={1} mesh={mesh} predictedMeasurement={undefined} predictedRow={undefined} selectedTrainingTarget={selected} showPredicted={false} />
        </div>
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(250px,.8fr)_minmax(280px,1.2fr)]">
          <div className="max-h-[620px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-2">
            {familyTargets.map((target) => (
              <button key={target.id} type="button" onClick={() => setManualSelection({ activePart, family, selectedId: target.id })} className={cn("mb-2 w-full rounded-xl border p-3 text-left", selected?.id === target.id ? "border-orange-400 bg-orange-400/15" : "border-white/10 bg-slate-950/50")}>
                <strong className="block text-sm">{target.label}</strong>
                <span className={cn(
                  "mt-1 block text-xs font-bold",
                  target.status === "recorded-scalar-only"
                    ? "text-amber-300"
                    : target.geometryTrainingEligible ? "text-emerald-300" : "text-red-300",
                )}>{target.status === "recorded-scalar-only"
                    ? "Number only · line not mapped"
                    : target.geometryTrainingEligible
                      ? "Exact PLY/LND geometry · GPU-ready"
                      : target.planeHeightEligible
                        ? "Plane height only · A–B/shape/depth rejected"
                        : "Geometry rejected"}</span>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            {selected ? (
              <>
                <p className="text-xs font-black uppercase tracking-[.13em] text-orange-300">Selected training target</p>
                <h5 className="mt-2 text-2xl font-black">{selected.label}</h5>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-950/70 p-4"><span className="text-xs text-slate-400">Recorded WEAR value</span><strong className="mt-1 block text-2xl">{selected.valueCm == null ? `${selected.value.toFixed(2)} ${selected.unit}` : `${selected.valueCm.toFixed(2)} cm`}</strong></div>
                  <div className="rounded-xl bg-slate-950/70 p-4"><span className="text-xs text-slate-400">{selected.status === "exact-row-geometry" ? "Exact row A–B" : "Geometry distance"}</span><strong className="mt-1 block text-2xl">{selected.geometryLengthCm == null ? "Not mapped" : `${selected.geometryLengthCm.toFixed(2)} cm`}</strong></div>
                </div>
                <div className={cn(
                  "mt-4 rounded-xl border p-4",
                  selected.status === "recorded-scalar-only"
                    ? "border-amber-400/40 bg-amber-400/10"
                    : selected.geometryTrainingEligible
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-red-400/40 bg-red-400/10",
                )}>
                  <strong className="text-lg">{selected.status === "recorded-scalar-only"
                    ? "BLOCKED · geometry is not mapped"
                    : selected.geometryTrainingEligible
                      ? "GPU GEOMETRY CARD READY"
                      : selected.planeHeightEligible
                        ? "PLANE HEIGHT ONLY · A–B/SHAPE/DEPTH REJECTED"
                        : "REJECTED from geometry training"}</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{selected.trainingRejectionReasons.length
                    ? selected.trainingRejectionReasons.join(" ")
                    : selected.geometryUnavailableReason ?? selected.protocolNote ?? selected.geometryType ?? "Exact linked anatomical row."}</p>
                </div>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div><dt className="text-slate-400">Geometry type</dt><dd className="mt-1 font-black">{selected.geometryType ?? "Unavailable"}</dd></div>
                  <div><dt className="text-slate-400">Landmarks / path</dt><dd className="mt-1 font-black">{selected.landmarkNames.length ? selected.landmarkNames.join(" → ") : selected.rowId ? `${selected.rowId} exact PLY section` : "No honest endpoint mapping yet"}</dd></div>
                  <div><dt className="text-slate-400">Recorded minus geometry</dt><dd className="mt-1 font-black">{recordedDifference == null ? "Different protocol or not comparable" : `${signed(recordedDifference)} cm`}</dd></div>
                  <div><dt className="text-slate-400">Source key</dt><dd className="mt-1 break-all font-mono text-xs">{selected.sourceKey}</dd></div>
                </dl>
              </>
            ) : <p className="text-slate-300">Choose one WEAR target.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function MeshTrainingBlueprint({
  activePart,
  blender,
  directCircumferenceCm,
  mesh,
  model,
  predictedShapeWalkCm,
  recordedTapeCm,
}: {
  activePart: WearV6RowKind;
  blender: BlenderProof | null;
  directCircumferenceCm: number | null;
  mesh: ExactTrainingMesh | null;
  model: HeldoutModel;
  predictedShapeWalkCm: number | null;
  recordedTapeCm: number | null;
}) {
  const [cardStep, setCardStep] = useState(1);
  const row = mesh?.trainingRows[activePart];
  const depthRatio = row ? row.depthCm / row.frontWidthCm : null;
  const centredTeacherShape = centredContour(row?.contourCm ?? []);
  const teacherShapeRadius = Math.max(
    1,
    ...centredTeacherShape.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
  );
  const teacherShapeScale = 112 / teacherShapeRadius;
  const unsafeGeometry = Boolean(
    row
    && (!row.rawCentralLoopClosed
      || row.qualityFlags.some((flag) => (
        flag.includes("reconstructed")
        || flag.includes("not-certified")
        || flag.includes("over-12pct")
      ))),
  );
  const cardSteps = [
    [1, "Exact PLY source", "Blender truth + browser projection"],
    [2, "Anatomical plane", "LND/profile row height"],
    [3, "A–B / C–D", "Exact section geometry"],
    [4, "Quality gate", "Accept or reject this card"],
    [5, "Camera cards", "Known Blender angles"],
    [6, "GPU tensors", "Mesh input + geometry targets"],
    [7, "Final answer", "Walk shape; connected tape loss"],
  ] as const;
  const currentPipeline = [
    ["Input", "192×256 RGB render"],
    ["Encoder", "MobileNet V3 Small"],
    ["Rows", "Predict y + left + right"],
    ["Geometry", "Independent breadth, depth, 32-point shape and tape outputs"],
  ];
  const meshPipeline = [
    ["1", "PLY + LND teacher", "Orient the real scan and build exact anatomical planes."],
    ["2", "Blender mesh channels", "Rasterize fill, outer boundary and visible triangles at 192×256 for nine known camera views."],
    ["3", "Camera invariance", "Every angle must predict one unchanged PLY geometry target. Never stretch body parts."],
    ["4", "Row + endpoint heads", "Predict y, left edge and right edge for neck, chest, under-bust, waist and hips."],
    ["5", "A–B from predicted endpoints", "The model's own left/right endpoints create breadth; true PLY endpoints are targets only."],
    ["6", "WEAR geometry heads", "Learn C–D depth cm, depth ratio and the normalized 32-point closed shape."],
    ["7", "Walk the shape", "Walk all 32 edges, then compare that connected answer with recorded WEAR tape."],
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border-2 border-sky-300 bg-sky-50" data-testid="onnx-mesh-training-blueprint">
      <header className="border-b border-sky-200 bg-slate-950 px-5 py-5 text-white">
        <p className="text-xs font-black uppercase tracking-[.14em] text-sky-300">Training pipeline · code-audited</p>
        <h3 className="mt-2 text-2xl font-black">Replace RGB learning with Blender 2D mesh learning</h3>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">Current code uses <code>WearRgbDataset</code> and MobileNet. The replacement below is the proposed mesh-only trainer; it has not been trained yet.</p>
      </header>

      <div className="border-b border-sky-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.13em] text-sky-700">One-person GPU flash-card inspector</p>
            <h4 className="mt-1 text-2xl font-black text-slate-950">{model.scanId} · {LABELS[activePart]}</h4>
            <p className="mt-1 text-sm font-bold text-slate-600">This held-out person demonstrates the card format only. It remains excluded from training.</p>
          </div>
          <div className={cn(
            "rounded-xl border px-4 py-3 text-sm font-black",
            unsafeGeometry ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900",
          )}>
            New geometry-card decision: {unsafeGeometry ? "REJECT" : "ACCEPT"}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          {cardSteps.map(([number, title, detail]) => (
            <button
              key={number}
              type="button"
              onClick={() => setCardStep(number)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                cardStep === number
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-800 hover:border-sky-300",
              )}
            >
              <span className="block text-xs font-black uppercase tracking-[.1em]">{number} · {title}</span>
              <span className={cn("mt-1 block text-xs leading-5", cardStep === number ? "text-sky-50" : "text-slate-500")}>{detail}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-950 text-white">
          {cardStep <= 2 ? (
            <div className="grid min-h-[560px] gap-0 xl:grid-cols-[minmax(340px,.9fr)_minmax(0,1.1fr)]">
              <div className="min-h-[560px] border-b border-white/10 xl:border-b-0 xl:border-r">
                {mesh ? <ExactMeshCanvas activePart={activePart} learningMix={1} mesh={mesh} predictedMeasurement={undefined} predictedRow={undefined} showPredicted={false} /> : <div className="grid h-full place-items-center p-8 text-slate-300">Loading exact PLY mesh…</div>}
              </div>
              <div className="grid content-center gap-4 p-6">
                <p className="text-xs font-black uppercase tracking-[.13em] text-cyan-300">{cardStep === 1 ? "Step 1 · source truth" : "Step 2 · row position truth"}</p>
                <h5 className="text-2xl font-black">{cardStep === 1 ? "Use the real WEAR PLY surface—not the RGB silhouette" : `Place ${LABELS[activePart]} using WEAR anatomy`}</h5>
                {cardStep === 1 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">Exact source in Blender</span><strong className="mt-1 block text-xl">{blender?.originalFaces == null ? "Load stage 2" : `${blender.originalFaces.toLocaleString()} faces`}</strong></div>
                    <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">Interactive browser projection</span><strong className="mt-1 block text-xl">{mesh?.verticesCm.length.toLocaleString() ?? "—"} vertices · {mesh?.triangles.length.toLocaleString() ?? "—"} triangles</strong></div>
                    <div className="rounded-xl bg-white/10 p-4 sm:col-span-2"><span className="text-xs text-slate-300">Scale</span><strong className="mt-1 block">PLY/LND coordinates converted once to centimetres and checked against measured stature.</strong></div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">Plane height</span><strong className="mt-1 block text-2xl">{row?.planeHeightCm == null ? "Unavailable" : `${row.planeHeightCm.toFixed(2)} cm from floor`}</strong></div>
                    <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">Source</span><strong className="mt-1 block">{row?.planeSource ?? "No verified WEAR plane source"}</strong></div>
                    <p className="text-sm leading-6 text-slate-300">The model learns this vertical row and both torso endpoints. The true PLY/LND row is a teacher only; it is never passed into ONNX at runtime.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {cardStep === 3 ? (
            <div className="grid min-h-[560px] gap-0 xl:grid-cols-[minmax(340px,1fr)_minmax(0,1fr)]">
              <div className="grid place-items-center border-b border-white/10 p-5 xl:border-b-0 xl:border-r">
                <div className="w-full max-w-[520px]">
                  <p className="text-xs font-black uppercase tracking-[.13em] text-orange-300">Real PLY cross-section</p>
                  <svg className="mt-3 h-[390px] w-full" viewBox="0 0 340 300" aria-label={`Exact ${LABELS[activePart]} cross-section from the WEAR PLY`}>
                    <line stroke="#334155" x1="170" x2="170" y1="15" y2="285" />
                    <line stroke="#334155" x1="25" x2="315" y1="150" y2="150" />
                    {centredTeacherShape.length >= 3 ? <polygon fill="rgba(251,146,60,.12)" points={shapePoints(centredTeacherShape, teacherShapeScale)} stroke="#fb923c" strokeWidth="4" /> : null}
                    <line stroke="#22d3ee" strokeWidth="4" x1="58" x2="282" y1="150" y2="150" />
                    <line stroke="#a78bfa" strokeWidth="4" x1="170" x2="170" y1="38" y2="262" />
                  </svg>
                  <div className="flex flex-wrap gap-4 text-sm font-black"><span className="text-cyan-300">A–B · front breadth</span><span className="text-violet-300">C–D · depth</span><span className="text-orange-300">PLY section</span></div>
                </div>
              </div>
              <div className="grid content-center gap-3 p-6">
                <p className="text-xs font-black uppercase tracking-[.13em] text-orange-300">Step 3 · calculate, do not guess</p>
                <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">A–B from exact mesh intersection</span><strong className="mt-1 block text-3xl">{row ? `${row.frontWidthCm.toFixed(2)} cm` : "—"}</strong></div>
                <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">C–D from the same 3D PLY slice</span><strong className="mt-1 block text-3xl">{row ? `${row.depthCm.toFixed(2)} cm` : "—"}</strong></div>
                <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">Depth ratio · C–D ÷ A–B</span><strong className="mt-1 block text-3xl">{depthRatio == null ? "—" : depthRatio.toFixed(3)}</strong></div>
                <p className="text-sm font-bold leading-6 text-slate-300">A–B ends where the row intersects the canonical body boundary. It cannot extend onto empty space or arms unless the source torso section itself is wrong.</p>
              </div>
            </div>
          ) : null}

          {cardStep === 4 ? (
            <div className="grid min-h-[560px] content-center gap-5 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
              <div>
                <p className="text-xs font-black uppercase tracking-[.13em] text-red-300">Step 4 · bad teachers must never enter GPU training</p>
                <h5 className="mt-2 text-3xl font-black">{unsafeGeometry ? `${LABELS[activePart]} card rejected` : `${LABELS[activePart]} card accepted`}</h5>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">The current exporter allowed reconstructed/open hulls to supervise the 32-point shape. The replacement requires a central torso loop, correct anatomy bounds and a reliable perimeter check before shape or depth supervision is enabled.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">Raw central loop</span><strong className={cn("mt-1 block text-xl", row?.rawCentralLoopClosed ? "text-emerald-300" : "text-red-300")}>{row?.rawCentralLoopClosed ? "Closed" : "Open / reconstructed"}</strong></div>
                  <div className="rounded-xl bg-white/10 p-4"><span className="text-xs text-slate-300">Shape source</span><strong className="mt-1 block text-xl">{row?.geometryPerimeterKind === "raw-closed-ply-loop" ? "Certified raw loop" : "Diagnostic fallback only"}</strong></div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-xs font-black uppercase tracking-[.13em] text-slate-300">Quality flags</p>
                <div className="mt-3 grid gap-2">
                  {(row?.qualityFlags.length ? row.qualityFlags : ["no quality flags"]).map((flag) => <div key={flag} className="rounded-lg bg-slate-950/70 px-3 py-2 text-sm font-bold">{flag}</div>)}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">Tape: {recordedTapeCm == null ? "unavailable" : `${recordedTapeCm.toFixed(1)} cm`} · PLY loop: {row?.geometryPerimeterCm == null ? "unavailable" : `${row.geometryPerimeterCm.toFixed(2)} cm`}</p>
              </div>
            </div>
          ) : null}

          {cardStep === 5 ? (
            <div className="grid min-h-[560px] content-center gap-4 p-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><span className="text-xs font-black uppercase tracking-[.12em] text-orange-300">Real angled Blender card</span><div className="mx-auto mt-4 h-[330px] max-w-[260px] overflow-hidden">{blender?.cameraCards["yaw-right-12"] ? <img alt={`${model.scanId} real Blender yaw 12 degree camera card`} className="h-full w-full object-contain" src={blender.cameraCards["yaw-right-12"]} /> : <div className="grid h-full place-items-center text-center text-sm text-slate-400">Open ONNX stage 2 once to render the real camera cards.</div>}</div><p className="mt-4 text-sm text-slate-300">Exact same PLY · yaw +12° · pitch 0° · roll 0° · 55 mm perspective.</p></div>
              <div className="text-center text-3xl font-black text-violet-300">→</div>
              <div className="rounded-2xl border border-violet-400/30 bg-violet-400/10 p-5"><span className="text-xs font-black uppercase tracking-[.12em] text-violet-300">Known camera lesson</span><div className="mt-8 grid gap-3 text-lg font-black"><span>yaw +12°</span><span>pitch 0°</span><span>roll 0°</span><span>lens 55 mm</span><span>same body truth ✓</span></div><p className="mt-6 text-sm text-slate-300">These labels verify the nine-view lesson. They are not ONNX inputs and do not come from walls, doors, tape or CSS.</p></div>
              <div className="text-center text-3xl font-black text-violet-300">→</div>
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5"><span className="text-xs font-black uppercase tracking-[.12em] text-cyan-300">Real canonical Blender card</span><div className="mx-auto mt-4 h-[330px] max-w-[260px] overflow-hidden">{blender?.cameraCards.canonical ? <img alt={`${model.scanId} real canonical Blender camera card`} className="h-full w-full object-contain" src={blender.cameraCards.canonical} /> : blender?.pngUrl ? <img alt={`${model.scanId} Blender proof`} className="h-full w-full object-contain" src={blender.pngUrl} /> : null}</div><p className="mt-4 text-sm text-slate-300">Target: yaw 0° · pitch 0° · roll 0°. One global inverse transform; no local waist/hip stretching.</p></div>
            </div>
          ) : null}

          {cardStep === 6 ? (
            <div className="grid min-h-[560px] content-center gap-5 p-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-[.13em] text-cyan-300">GPU input tensor</p>
                <div className="mt-4 grid gap-3 text-base font-bold"><span>192×256 filled-body channel</span><span>192×256 outer-boundary channel</span><span>192×256 visible-triangle channel</span><span>height · weight · gender</span><span>No true rows · no tape · no depth input</span></div>
                <p className="mt-5 text-sm text-slate-300">Raw WEAR PLY and normal-user Blender meshes have different topology, so fill and boundary own two channels and triangle lines are only one supporting channel. No room, clothing colour or tape text.</p>
              </div>
              <div className="rounded-2xl border border-orange-400/30 bg-orange-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-[.13em] text-orange-300">WEAR teacher tensor</p>
                <div className="mt-4 grid gap-3 text-base font-bold"><span>row height · {row?.planeHeightCm?.toFixed(2) ?? "—"} cm</span><span>A–B · calculated {row?.frontWidthCm.toFixed(2) ?? "—"} cm</span><span>C–D · target {row?.depthCm.toFixed(2) ?? "—"} cm</span><span>depth ratio · {depthRatio?.toFixed(3) ?? "—"}</span><span>closed shape · 32 × 2</span></div>
                <p className="mt-5 text-sm text-slate-300">Invalid geometry masks row/depth/shape/tape loss. For accepted cards, tape supervises only the circumference walked from this shape.</p>
              </div>
            </div>
          ) : null}

          {cardStep === 7 ? (
            <div className="grid min-h-[560px] content-center gap-5 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
              <div>
                <p className="text-xs font-black uppercase tracking-[.13em] text-emerald-300">Step 7 · one connected geometry answer</p>
                <h5 className="mt-2 text-3xl font-black">Row → A–B → depth → 32-point shape → walked circumference → tape check</h5>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-black"><span className="rounded-lg bg-white/10 px-3 py-2">Predict row height</span><span>→</span><span className="rounded-lg bg-white/10 px-3 py-2">Intersect boundary</span><span>→</span><span className="rounded-lg bg-white/10 px-3 py-2">Predict C–D + shape</span><span>→</span><span className="rounded-lg bg-white/10 px-3 py-2">Walk 32 edges</span><span>→</span><span className="rounded-lg bg-white/10 px-3 py-2">Compare with tape</span></div>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">The replacement has no independent shortcut tape answer. Tape loss is calculated from the walked predicted shape, so tape, line, depth and shape stay connected. A card is rejected when its certified PLY loop and tape disagree too much.</p>
              </div>
              <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-[.13em] text-red-300">Why today looks dishonest</p>
                <div className="mt-4 grid gap-3">
                  <div><span className="text-xs text-slate-300">Current direct circumference head</span><strong className="block text-2xl">{directCircumferenceCm == null ? "—" : `${directCircumferenceCm.toFixed(2)} cm`}</strong></div>
                  <div><span className="text-xs text-slate-300">Perimeter of displayed predicted shape</span><strong className="block text-2xl">{predictedShapeWalkCm == null ? "—" : `${predictedShapeWalkCm.toFixed(2)} cm`}</strong></div>
                  <div><span className="text-xs text-slate-300">Recorded tape</span><strong className="block text-2xl">{recordedTapeCm == null ? "—" : `${recordedTapeCm.toFixed(1)} cm`}</strong></div>
                </div>
                <p className="mt-4 text-sm font-bold leading-6 text-red-100">The current direct number can be close even when the displayed shape is wrong because these outputs are trained independently.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-black uppercase tracking-[.13em] text-red-700">Current V7 · wrong input for your goal</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {currentPipeline.map(([title, detail], index) => (
              <div key={title} className="relative rounded-xl border border-red-200 bg-white p-3">
                <span className="text-xs font-black text-red-700">{index + 1}</span>
                <strong className="mt-1 block text-sm text-slate-950">{title}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{detail}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-red-100 p-3 text-sm font-black text-red-900">Held-out result: only 4 / 448 people passed every row within 1.27 cm. This model remains private.</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[.13em] text-emerald-800">New GPU card · geometry only</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,.8fr)_minmax(0,1.2fr)]">
            <div className="min-h-[430px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              {mesh ? <ExactMeshCanvas activePart={activePart} learningMix={1} mesh={mesh} predictedMeasurement={undefined} predictedRow={undefined} showPredicted={false} /> : <div className="grid h-full place-items-center p-6 text-sm text-slate-300">Loading exact PLY mesh…</div>}
            </div>
            <div className="grid content-start gap-2">
              <div className="rounded-xl bg-white p-3"><span className="text-xs font-bold text-slate-500">Demonstration identity</span><strong className="mt-1 block">{model.scanId} · held out, never a training card</strong></div>
              <div className="rounded-xl bg-white p-3"><span className="text-xs font-bold text-slate-500">GPU input</span><strong className="mt-1 block">Standardized Blender geometry channels</strong><span className="mt-1 block text-xs text-slate-600">Filled body + outer boundary + visible triangles. No RGB, true line coordinates, tape, depth, clothing colour, room or skin texture.</span></div>
              <div className="rounded-xl bg-white p-3"><span className="text-xs font-bold text-slate-500">Exact row target</span><strong className="mt-1 block">{LABELS[activePart]} · {row?.planeHeightCm == null ? "unavailable" : `${row.planeHeightCm.toFixed(1)} cm from floor`}</strong></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white p-3"><span className="text-xs font-bold text-slate-500">A–B breadth</span><strong className="mt-1 block text-lg">{row ? `${row.frontWidthCm.toFixed(2)} cm` : "—"}</strong></div>
                <div className="rounded-xl bg-white p-3"><span className="text-xs font-bold text-slate-500">C–D depth</span><strong className="mt-1 block text-lg">{row ? `${row.depthCm.toFixed(2)} cm` : "—"}</strong></div>
                <div className="rounded-xl bg-white p-3"><span className="text-xs font-bold text-slate-500">Depth ratio</span><strong className="mt-1 block text-lg">{depthRatio == null ? "—" : depthRatio.toFixed(3)}</strong></div>
                <div className="rounded-xl bg-white p-3"><span className="text-xs font-bold text-slate-500">Closed shape</span><strong className="mt-1 block text-lg">{row ? `${row.contourCm.length} raw → 32 points` : "—"}</strong></div>
              </div>
              <div className="rounded-xl bg-amber-100 p-3"><span className="text-xs font-bold text-amber-800">Connected tape supervision</span><strong className="mt-1 block">WEAR tape {row?.recordedTapeCm == null ? "unavailable" : `${row.recordedTapeCm.toFixed(1)} cm`}</strong><span className="mt-1 block text-xs text-amber-900">Tape never positions the row. The loss compares it with circumference walked from the predicted shape; there is no shortcut tape output.</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-sky-200 bg-white px-5 py-5">
        <p className="text-xs font-black uppercase tracking-[.13em] text-sky-700">Exact preparation of GPU flash cards</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {meshPipeline.map(([number, title, detail]) => (
            <div key={number} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{number}</span>
              <strong className="mt-3 block text-sm text-slate-950">{title}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{detail}</span>
            </div>
          ))}
        </div>
      </div>

      {mesh ? <AllWearTargetsInspector activePart={activePart} mesh={mesh} /> : null}

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
        <div>
          <p className="text-xs font-black uppercase tracking-[.13em] text-violet-700">Camera-angle lesson</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-violet-200 bg-white p-4"><strong className="text-sm">Angled mesh</strong><p className="mt-2 text-xs leading-5 text-slate-600">This CPU proof renders the same PLY at canonical, yaw ±12°, pitch +6° and roll +3°, all with a known 55 mm camera.</p></div>
            <div className="rounded-xl border border-violet-200 bg-white p-4"><strong className="text-sm">Camera lesson</strong><p className="mt-2 text-xs leading-5 text-slate-600">Nine known Blender views of one person all own the same canonical A–B, C–D, shape and circumference targets.</p></div>
            <div className="rounded-xl border border-violet-200 bg-white p-4"><strong className="text-sm">No local stretching</strong><p className="mt-2 text-xs leading-5 text-slate-600">The model learns view invariance from complete meshes. It never stretches waist, hips or limbs to force a result.</p></div>
            <div className="rounded-xl border border-violet-200 bg-white p-4"><strong className="text-sm">Canonical front</strong><p className="mt-2 text-xs leading-5 text-slate-600">Compare with the exact 0° WEAR mesh. Large reprojection error means retake, not a fake correction.</p><strong className={cn("mt-2 block text-xs", mesh?.cameraAudit?.frontProjectionValid ? "text-emerald-700" : "text-red-700")}>{mesh?.cameraAudit?.frontProjectionValid ? "Current PLY orientation audit passed" : "Orientation audit unavailable / failed"}</strong></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
          <p className="text-xs font-black uppercase tracking-[.13em] text-violet-300">GPU split and proof gate</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><strong className="block text-xl">3,451</strong><span className="text-xs text-slate-400">train people</span></div>
            <div><strong className="block text-xl">427</strong><span className="text-xs text-slate-400">validation</span></div>
            <div><strong className="block text-xl">448</strong><span className="text-xs text-slate-400">unseen test</span></div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">The current five-card CPU proof would create 17,255 train, 2,135 validation and 2,240 unseen test candidates. We expand the camera matrix only after these cards pass. Geometry that is not safe for training yet is masked, not silently taught. Release stays blocked until the unseen 448 pass row position, A–B, C–D, shape and derived-circumference gates.</p>
        </div>
      </div>

      <div className="border-t border-sky-200 bg-amber-50 px-5 py-4 text-sm font-bold leading-6 text-amber-950">
        Honest limit: one front 2D mesh cannot reveal depth perfectly. WEAR can teach the most likely depth and shape, while confidence and retake gates prevent unsupported answers. “100% accurate” is a test goal—not a claim before the 448 unseen people pass.
      </div>
    </section>
  );
}

export function HeldoutOnnxTrainingVisual({
  actuals,
  imageSize,
  imageUrl,
  model,
  prediction,
}: {
  actuals: ActualMeasurements;
  imageSize: { width: number; height: number };
  imageUrl: string;
  model: HeldoutModel;
  prediction: WearV6Prediction;
}) {
  const visibleParts = PARTS.filter((part) => part !== "underbust" || model.gender === "female");
  const [activePart, setActivePart] = useState<WearV6RowKind>("waist");
  const [stage, setStage] = useState(1);
  const [learningPercent, setLearningPercent] = useState(0);
  const [mesh, setMesh] = useState<ExactTrainingMesh | null>(null);
  const [meshError, setMeshError] = useState<string | null>(null);
  const [blender, setBlender] = useState<BlenderProof | null>(null);
  const [blenderState, setBlenderState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const heldout = prediction.heldoutEvaluation;
  const predictedRows = heldout?.predictedRows ?? prediction.rows;
  const realRows = heldout?.realRows ?? [];
  const predictedRow = predictedRows.find((row) => row.kind === activePart);
  const realRow = realRows.find((row) => row.kind === activePart);
  const measurement = prediction.measurements.find((item) => item.kind === activePart);
  const predictedShape = prediction.crossSections.find((item) => item.kind === activePart);
  const realGeometry = heldout?.realGeometry[activePart];
  const exactRow = mesh?.trainingRows[activePart];
  const realTape = actuals[activePart] ?? exactRow?.recordedTapeCm ?? null;
  const learningMix = learningPercent / 100;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/try-on-test/sizing-lab/sdk-wear/mesh?scanId=${encodeURIComponent(model.scanId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { ok?: boolean; mesh?: ExactTrainingMesh; error?: string };
        if (!response.ok || !payload.ok || !payload.mesh) throw new Error(payload.error || "Exact PLY mesh unavailable.");
        return payload.mesh;
      })
      .then((value) => { if (!cancelled) setMesh(value); })
      .catch((error) => { if (!cancelled) setMeshError(error instanceof Error ? error.message : "Exact PLY mesh unavailable."); });
    return () => { cancelled = true; };
  }, [model.scanId]);

  async function loadBlenderProof() {
    if (blenderState !== "idle") return;
    setBlenderState("loading");
    try {
      const response = await fetch("/api/try-on-test/sizing-lab/sdk-wear/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: model.scanId }),
      });
      const payload = await response.json() as {
        ok?: boolean;
        cached?: boolean;
        metadata?: {
          generator?: { version?: string };
          geometry?: { originalFaces?: number; browserFaces?: number };
          cameraCards?: BlenderProof["cameras"];
        };
        artifacts?: { pngUrl?: string; cameraCards?: Record<string, string> };
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.artifacts?.pngUrl) throw new Error(payload.error || "Blender proof unavailable.");
      setBlender({
        pngUrl: payload.artifacts.pngUrl,
        version: payload.metadata?.generator?.version ?? "headless",
        cached: Boolean(payload.cached),
        cameraCards: payload.artifacts.cameraCards ?? {},
        originalFaces: payload.metadata?.geometry?.originalFaces ?? null,
        browserFaces: payload.metadata?.geometry?.browserFaces ?? null,
        cameras: payload.metadata?.cameraCards ?? [],
      });
      setBlenderState("ready");
    } catch {
      setBlenderState("error");
    }
  }

  function selectStage(nextStage: number) {
    setStage(nextStage);
    if (nextStage >= 2) void loadBlenderProof();
  }

  const predictedPhysicalPoints = useMemo(() => (predictedShape?.points ?? []).map((point) => ({
    x: point.breadthNorm * (measurement?.appleCorrectedWidthCm ?? 0) / 2,
    y: point.depthNorm * (measurement?.rawMeshDepthCm ?? 0) / 2,
  })), [measurement, predictedShape]);
  const predictedShapeWalkCm = closedPathLength(predictedPhysicalPoints);
  const realPhysicalPoints = useMemo(() => (realGeometry?.contour32Normalized ?? []).map((point) => ({
    x: point.breadthNorm * (realGeometry?.frontWidthCm ?? 0) / 2,
    y: point.depthNorm * (realGeometry?.depthCm ?? 0) / 2,
  })), [realGeometry]);
  const blendedShape = useMemo(() => {
    if (predictedPhysicalPoints.length !== realPhysicalPoints.length) return predictedPhysicalPoints;
    return predictedPhysicalPoints.map((point, index) => ({
      x: point.x + (realPhysicalPoints[index]!.x - point.x) * learningMix,
      y: point.y + (realPhysicalPoints[index]!.y - point.y) * learningMix,
    }));
  }, [learningMix, predictedPhysicalPoints, realPhysicalPoints]);
  const maxShapeRadius = Math.max(
    1,
    ...predictedPhysicalPoints.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
    ...realPhysicalPoints.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
  );
  const shapeScale = 118 / maxShapeRadius;
  const circumferenceError = measurement && realTape !== null ? measurement.valueCm - realTape : null;
  const widthError = measurement && realGeometry?.frontWidthCm != null
    ? measurement.appleCorrectedWidthCm - realGeometry.frontWidthCm
    : null;
  const depthError = measurement?.rawMeshDepthCm != null && realGeometry?.depthCm != null
    ? measurement.rawMeshDepthCm - realGeometry.depthCm
    : null;

  const stages = [
    [1, "ONNX input", "Exact 192×256 RGB"],
    [2, "PLY + Blender teacher", "Real body geometry"],
    [3, "Prediction vs truth", "Rows and edges"],
    [4, "All learned outputs", "Width, depth, shape, circumference"],
  ] as const;

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm" data-testid="heldout-onnx-training-visual">
      <header className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-300">ONNX training proof · {model.scanId}</p>
            <h2 className="mt-2 text-2xl font-black">See every input, target, prediction, and error</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">The geometry shown below comes from the stored held-out RGB, real WEAR PLY/LND data, and the running ONNX package. No hand-drawn body mesh is used.</p>
          </div>
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
            Visual source fidelity: exact<br />Model accuracy: measured below, not assumed 100%
          </div>
        </div>
      </header>

      <div className="border-b border-cyan-200 bg-cyan-50 px-5 py-3 text-base font-black text-cyan-950">
        Use buttons 1 → 4 in order. Then move the learning slider.
      </div>

      <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-3 lg:grid-cols-4">
        {stages.map(([value, title, detail]) => (
          <button key={value} type="button" onClick={() => selectStage(value)} className={cn("rounded-xl border px-4 py-3 text-left transition", stage === value ? "border-cyan-500 bg-cyan-500 text-slate-950 shadow" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300")}>
            <span className="block text-xs font-black uppercase tracking-[0.12em]">{value} · {title}</span>
            <span className={cn("mt-1 block text-xs", stage === value ? "text-cyan-950" : "text-slate-500")}>{detail}</span>
          </button>
        ))}
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {visibleParts.map((part) => (
            <button key={part} type="button" onClick={() => setActivePart(part)} className={cn("rounded-xl border px-4 py-2.5 text-sm font-black", activePart === part ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700")}>
              {LABELS[part]}
            </button>
          ))}
        </div>

        {stage === 1 ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(340px,.8fr)_minmax(0,1.2fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={`${model.scanId} exact ONNX RGB input`} className="mx-auto block max-h-[650px] w-full object-contain [image-rendering:auto]" />
              <div className="flex justify-between border-t border-white/10 px-4 py-3 text-sm font-bold text-slate-300"><span>Actual tensor source</span><span>{imageSize.width} × {imageSize.height} px</span></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[.13em] text-slate-500">What the current model really sees</p>
              <p className="mt-3 text-xl font-black text-slate-950">RGB image + height + weight + gender</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Height</span><strong className="mt-1 block text-xl">{model.heightCm.toFixed(1)} cm</strong></div>
                <div className="rounded-xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Weight</span><strong className="mt-1 block text-xl">{model.weightKg.toFixed(1)} kg</strong></div>
                <div className="rounded-xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Gender</span><strong className="mt-1 block text-xl capitalize">{model.gender}</strong></div>
              </div>
              <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800">Important: today&apos;s installed ONNX was trained from RGB renders. It was not trained from Delaram-style Blender photo meshes. This screen makes that mismatch visible instead of hiding it.</p>
            </div>
          </div>
        ) : null}

        {stage >= 2 ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(360px,1fr)_minmax(360px,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              <div className="border-b border-white/10 px-4 py-3 text-white"><strong>Exact PLY front triangle mesh</strong><span className="ml-2 text-sm text-cyan-300">cyan · centimetre scale</span></div>
              <div className="aspect-[3/4] min-h-[560px]">
                {mesh ? <ExactMeshCanvas activePart={activePart} learningMix={learningMix} mesh={mesh} predictedMeasurement={measurement} predictedRow={predictedRow} showPredicted={stage >= 3} /> : <div className="grid h-full place-items-center p-8 text-center text-sm text-slate-300">{meshError ?? "Loading the real PLY triangle mesh…"}</div>}
              </div>
              <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">{mesh ? `${mesh.verticesCm.length.toLocaleString()} vertices · ${mesh.triangles.length.toLocaleString()} triangles · depth excluded from this front display` : "No substitute mesh is manufactured."}</div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              <div className="border-b border-white/10 px-4 py-3 text-white"><strong>Actual Blender proof</strong><span className="ml-2 text-sm text-orange-300">real PLY surface</span></div>
              <div className="grid aspect-[3/4] min-h-[560px] place-items-center">
                {blender ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={blender.pngUrl} alt={`${model.scanId} rendered by Blender`} className="h-full w-full object-contain" />
                ) : <p className="max-w-sm p-8 text-center text-sm leading-6 text-slate-300">{blenderState === "loading" ? "Blender is loading the exact PLY and rendering the proof…" : blenderState === "error" ? "Blender proof failed. The exact PLY browser mesh remains visible; no fake render is shown." : "Open stage 2 to build the Blender proof."}</p>}
              </div>
              <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">{blender ? `Blender ${blender.version} · ${blender.cached ? "cached verified artifact" : "new headless render"}` : "Headless CPU · no GPU"}</div>
            </div>
          </div>
        ) : null}

        {stage >= 3 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.13em] text-slate-500">Prediction ↔ exact teacher</p><h3 className="mt-1 text-xl font-black">{LABELS[activePart]} row and edges</h3></div>
              <div className="flex gap-3 text-sm font-black"><span className="text-cyan-700">Cyan · ONNX</span><span className="text-orange-700">Orange · PLY/LND truth</span></div>
            </div>
            <div className="relative mx-auto mt-4 max-w-[720px] overflow-hidden rounded-xl bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={`${model.scanId} ONNX rows`} className="block w-full object-contain" />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="ONNX row compared with exact WEAR row">
                {realRow ? <line x1={realRow.photo.left.x * 1000} x2={realRow.photo.right.x * 1000} y1={realRow.photo.left.y * 1000} y2={realRow.photo.right.y * 1000} stroke="#fb923c" strokeDasharray="12 8" strokeWidth="7" vectorEffect="non-scaling-stroke" /> : null}
                {predictedRow ? <line x1={predictedRow.photo.left.x * 1000} x2={predictedRow.photo.right.x * 1000} y1={predictedRow.photo.left.y * 1000} y2={predictedRow.photo.right.y * 1000} stroke="#06b6d4" strokeWidth="5" vectorEffect="non-scaling-stroke" /> : null}
              </svg>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Row error</span><strong className="mt-1 block text-lg">{predictedRow && realRow ? `${(Math.abs(predictedRow.photo.left.y - realRow.photo.left.y) * imageSize.height).toFixed(1)} px` : "—"}</strong></div>
              <div className="rounded-xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Left-edge error</span><strong className="mt-1 block text-lg">{predictedRow && realRow ? `${(Math.abs(predictedRow.photo.left.x - realRow.photo.left.x) * imageSize.width).toFixed(1)} px` : "—"}</strong></div>
              <div className="rounded-xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Right-edge error</span><strong className="mt-1 block text-lg">{predictedRow && realRow ? `${(Math.abs(predictedRow.photo.right.x - realRow.photo.right.x) * imageSize.width).toFixed(1)} px` : "—"}</strong></div>
            </div>
          </div>
        ) : null}

        {stage === 4 ? (
          <>
            <div className="mt-5 rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[.13em] text-violet-700">Learning target comparison</p><h3 className="mt-1 text-xl font-black text-slate-950">Move prediction toward exact WEAR truth</h3><p className="mt-1 text-sm text-slate-600">This shows the loss direction. It is not a fake saved-epoch timeline.</p></div>
                <strong className="text-3xl text-violet-800">{learningPercent}%</strong>
              </div>
              <input className="mt-4 w-full accent-violet-700" type="range" min="0" max="100" step="1" value={learningPercent} onChange={(event) => setLearningPercent(Number(event.target.value))} aria-label="Prediction to exact teacher comparison" />
              <div className="mt-2 flex justify-between text-xs font-black text-slate-500"><span>0% · ONNX prediction</span><span>100% · exact PLY/LND teacher</span></div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(340px,.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 text-white">
                <p className="text-xs font-black uppercase tracking-[.13em] text-cyan-300">{LABELS[activePart]} · learned 32-point closed shape</p>
                <svg className="mt-2 h-[330px] w-full" viewBox="0 0 340 300" aria-label="ONNX, blended, and exact WEAR 32-point shapes">
                  <line stroke="#334155" x1="170" x2="170" y1="15" y2="285" />
                  <line stroke="#334155" x1="25" x2="315" y1="150" y2="150" />
                  {realPhysicalPoints.length >= 3 ? <polygon fill="none" points={shapePoints(realPhysicalPoints, shapeScale)} stroke="#fb923c" strokeDasharray="8 6" strokeWidth="3" /> : null}
                  {predictedPhysicalPoints.length >= 3 ? <polygon fill="none" points={shapePoints(predictedPhysicalPoints, shapeScale)} stroke="#06b6d4" strokeWidth="2" opacity=".5" /> : null}
                  {blendedShape.length >= 3 ? <polygon fill="rgba(167,139,250,.12)" points={shapePoints(blendedShape, shapeScale)} stroke="#a78bfa" strokeWidth="4" /> : null}
                </svg>
                <div className="flex flex-wrap gap-4 text-xs font-black"><span className="text-cyan-300">ONNX</span><span className="text-orange-300">Exact teacher</span><span className="text-violet-300">Slider result</span></div>
              </div>

              <div className="grid content-start gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-800">ONNX independent outputs</p><p className="mt-3 text-sm font-bold">A–B width head <strong className="float-right">{measurement ? `${measurement.appleCorrectedWidthCm.toFixed(2)} cm` : "—"}</strong></p><p className="mt-2 text-sm font-bold">C–D depth head <strong className="float-right">{measurement?.rawMeshDepthCm == null ? "—" : `${measurement.rawMeshDepthCm.toFixed(2)} cm`}</strong></p><p className="mt-2 text-sm font-bold">Direct tape head <strong className="float-right">{measurement ? `${measurement.valueCm.toFixed(2)} cm` : "—"}</strong></p><p className="mt-2 text-sm font-bold">Walk displayed shape <strong className="float-right">{predictedShapeWalkCm == null ? "—" : `${predictedShapeWalkCm.toFixed(2)} cm`}</strong></p></div>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-orange-800">PLY geometry source</p><p className="mt-3 text-sm font-bold">A–B width <strong className="float-right">{exactRow ? `${exactRow.frontWidthCm.toFixed(2)} cm` : realGeometry?.frontWidthCm != null ? `${realGeometry.frontWidthCm.toFixed(2)} cm` : "—"}</strong></p><p className="mt-2 text-sm font-bold">C–D depth <strong className="float-right">{exactRow ? `${exactRow.depthCm.toFixed(2)} cm` : realGeometry?.depthCm != null ? `${realGeometry.depthCm.toFixed(2)} cm` : "—"}</strong></p><p className="mt-2 text-sm font-bold">{exactRow?.geometryPerimeterKind === "raw-closed-ply-loop" ? "Raw closed-loop perimeter" : "Diagnostic reconstructed perimeter"} <strong className="float-right">{exactRow?.geometryPerimeterCm == null ? "—" : `${exactRow.geometryPerimeterCm.toFixed(2)} cm`}</strong></p><p className={cn("mt-2 text-xs font-black", exactRow?.rawCentralLoopClosed ? "text-emerald-800" : "text-red-700")}>{exactRow?.rawCentralLoopClosed ? "Certified central loop" : "Not a certified closed torso loop"}</p></div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2"><p className="text-xs font-black uppercase tracking-[.12em] text-amber-800">Recorded WEAR tape · separate check only</p><p className="mt-2 text-3xl font-black text-slate-950">{realTape == null ? "Unavailable" : `${realTape.toFixed(1)} cm`}</p><p className="mt-2 text-xs font-bold leading-5 text-slate-600">Tape is not the mesh perimeter and is never used to draw A–B or C–D. It is revealed only after ONNX inference.</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2"><p className="text-xs font-black uppercase tracking-[.12em] text-slate-500">Current errors</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><p className={widthError !== null && Math.abs(widthError) <= 1.27 ? "text-emerald-700" : "text-red-700"}>A–B<br /><strong>{widthError === null ? "—" : `${signed(widthError)} cm`}</strong></p><p className={depthError !== null && Math.abs(depthError) <= 1.27 ? "text-emerald-700" : "text-red-700"}>C–D<br /><strong>{depthError === null ? "—" : `${signed(depthError)} cm`}</strong></p><p className={circumferenceError !== null && Math.abs(circumferenceError) <= 1.27 ? "text-emerald-700" : "text-red-700"}>Tape result<br /><strong>{circumferenceError === null ? "—" : `${signed(circumferenceError)} cm`}</strong></p></div></div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-[.08em] text-slate-600"><tr><th className="px-4 py-3">Body part</th><th className="px-4 py-3">Row truth</th><th className="px-4 py-3">ONNX A–B</th><th className="px-4 py-3">PLY A–B</th><th className="px-4 py-3">ONNX C–D</th><th className="px-4 py-3">PLY C–D</th><th className="px-4 py-3">ONNX circumference</th><th className="px-4 py-3">PLY perimeter</th><th className="px-4 py-3">Tape</th><th className="px-4 py-3">Tape error</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleParts.map((part) => {
                    const value = prediction.measurements.find((item) => item.kind === part);
                    const geometry = heldout?.realGeometry[part];
                    const truth = mesh?.trainingRows[part];
                    const tape = actuals[part] ?? truth?.recordedTapeCm ?? null;
                    const error = value && tape != null ? value.valueCm - tape : null;
                    return <tr key={part} onClick={() => setActivePart(part)} className={cn("cursor-pointer", activePart === part && "bg-blue-50")}><td className="px-4 py-3 font-black">{LABELS[part]}</td><td className="px-4 py-3">{truth?.planeHeightCm == null ? "—" : `${truth.planeHeightCm.toFixed(1)} cm`}</td><td className="px-4 py-3 font-black text-cyan-800">{value ? value.appleCorrectedWidthCm.toFixed(2) : "—"}</td><td className="px-4 py-3 font-black text-orange-800">{truth?.frontWidthCm.toFixed(2) ?? geometry?.frontWidthCm?.toFixed(2) ?? "—"}</td><td className="px-4 py-3 font-black text-cyan-800">{value?.rawMeshDepthCm?.toFixed(2) ?? "—"}</td><td className="px-4 py-3 font-black text-orange-800">{truth?.depthCm.toFixed(2) ?? geometry?.depthCm?.toFixed(2) ?? "—"}</td><td className="px-4 py-3 font-black text-cyan-800">{value?.valueCm.toFixed(2) ?? "—"}</td><td className="px-4 py-3 font-black text-orange-800">{truth?.geometryPerimeterCm?.toFixed(2) ?? "—"}</td><td className="px-4 py-3 font-black text-amber-800">{tape?.toFixed(1) ?? "—"}</td><td className={cn("px-4 py-3 font-black", error !== null && Math.abs(error) <= 1.27 ? "text-emerald-700" : "text-red-700")}>{error === null ? "—" : signed(error)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>

            <MeshTrainingBlueprint
              activePart={activePart}
              blender={blender}
              directCircumferenceCm={measurement?.valueCm ?? null}
              mesh={mesh}
              model={model}
              predictedShapeWalkCm={predictedShapeWalkCm}
              recordedTapeCm={realTape}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
