"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type {
  MeshShapePredictionResponse,
  MeshShapePredictionRow,
} from "../lib/meshShapeProviders";

type MeshView = "photo" | "side" | "top" | "three-quarter";
type MeshRenderMode = "meta" | "live-formula";
type Point3 = [number, number, number];

export interface MetaMeshFormulaRow {
  kind: MeshShapePredictionRow["kind"];
  breadthCm: number;
  depthCm: number;
  superellipseExponent: number;
  sourceLabel: string;
  shapeMode?: "superellipse" | "meta-contour";
}

const ROW_STYLE: Record<MeshShapePredictionRow["kind"], { color: string; label: string }> = {
  waist: { color: "#fb7185", label: "Waist" },
  trouserWaist: { color: "#fbbf24", label: "Trouser waist" },
  hips: { color: "#34d399", label: "Hips" },
};

export function MetaBodyMesh3D({
  prediction,
  formulaRows = [],
  activeKind,
  workspace = false,
  onOpenWorkspace,
  onCloseWorkspace,
}: {
  prediction: MeshShapePredictionResponse;
  formulaRows?: MetaMeshFormulaRow[];
  activeKind?: MeshShapePredictionRow["kind"];
  workspace?: boolean;
  onOpenWorkspace?: () => void;
  onCloseWorkspace?: () => void;
}) {
  const preview = prediction.meshPreview;
  const [view, setView] = useState<MeshView>("three-quarter");
  const [renderMode, setRenderMode] = useState<MeshRenderMode>("live-formula");
  const liveRows = useMemo(
    () => formulaRows.filter((row) => validFormulaRow(row)),
    [formulaRows],
  );
  const displayVertices = useMemo(() => {
    if (!preview) return null;
    return renderMode === "live-formula" && liveRows.length
      ? deformMeshVertices(preview.verticesM, prediction.rows, liveRows)
      : preview.verticesM;
  }, [liveRows, prediction.rows, preview, renderMode]);
  const geometry = useMemo(() => {
    if (!preview || !displayVertices) return null;
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(displayVertices, 3));
    next.setIndex(new THREE.BufferAttribute(new Uint32Array(preview.triangleIndices), 1));
    next.computeVertexNormals();
    next.computeBoundingBox();
    next.computeBoundingSphere();
    return next;
  }, [displayVertices, preview]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const bounds = useMemo(() => {
    if (!preview?.verticesM.length) return { floorY: 0, heightM: 1.7, centerY: 0.85, radius: 1 };
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let index = 1; index < preview.verticesM.length; index += 3) {
      const value = preview.verticesM[index]!;
      minY = Math.min(minY, value);
      maxY = Math.max(maxY, value);
    }
    const heightM = Math.max(0.5, maxY - minY);
    return {
      floorY: minY,
      heightM,
      centerY: (minY + maxY) / 2,
      radius: Math.max(1, heightM * 0.9),
    };
  }, [preview]);
  // Live width/depth/shape edits must replace only mesh geometry. Stable camera
  // props keep the user's current OrbitControls rotation and zoom untouched.
  const cameraTarget = useMemo<Point3>(() => [0, bounds.centerY, 0], [bounds.centerY]);
  const canvasCamera = useMemo(() => ({
    position: [2.3, bounds.centerY, -2.3] as Point3,
    fov: 32,
    near: 0.01,
    far: 20,
  }), [bounds.centerY]);

  if (!preview || !geometry) return null;

  const liveMode = renderMode === "live-formula" && liveRows.length > 0;

  return (
    <section
      data-testid={workspace ? "meta-body-mesh-workspace-viewer" : "meta-body-mesh-viewer"}
      data-render-mode={liveMode ? "live-formula" : "meta"}
      data-formula-signature={liveRows.map((row) => `${row.kind}:${row.shapeMode ?? "superellipse"}:${row.breadthCm.toFixed(3)}:${row.depthCm.toFixed(3)}:${row.superellipseExponent.toFixed(3)}`).join("|")}
      className={`${workspace ? "flex h-full min-h-0 flex-col" : "mt-3 overflow-hidden"} rounded-xl border border-cyan-300 bg-slate-950 text-white`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <div className="text-xs font-semibold">Meta 3D body mesh + live formula preview</div>
          <div className="mt-0.5 text-[10px] text-slate-300">
            {liveRows.length
              ? "Drag to rotate · scroll to zoom · the right-side ratio and n controls update the live mesh"
              : "Drag to rotate · scroll to zoom · choose Superellipse on the right to enable live deformation"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <div className="mr-1 flex rounded-md border border-white/10 bg-white/5 p-0.5" aria-label="3D mesh calculation view">
            <button
              type="button"
              aria-pressed={!liveMode}
              onClick={() => setRenderMode("meta")}
              className={`rounded px-2 py-1 text-[10px] font-medium ${!liveMode ? "bg-slate-200 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
            >
              Original Meta
            </button>
            <button
              type="button"
              aria-pressed={liveMode}
              onClick={() => setRenderMode("live-formula")}
              disabled={!liveRows.length}
              className={`rounded px-2 py-1 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40 ${liveMode ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
            >
              Live formula
            </button>
          </div>
          <div className="flex flex-wrap gap-1" aria-label="Meta 3D mesh view">
            {([
              ["photo", "Photo"],
              ["side", "Side"],
              ["top", "Top / slice"],
              ["three-quarter", "3/4"],
            ] as Array<[MeshView, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={`rounded px-2 py-1 text-[10px] font-medium ${view === value ? "bg-cyan-500 text-slate-950" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {workspace ? (
            <button
              type="button"
              onClick={onCloseWorkspace}
              className="ml-1 rounded border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/20"
            >
              Close 3D
            </button>
          ) : onOpenWorkspace ? (
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="ml-1 rounded border border-cyan-300 bg-cyan-400 px-2 py-1 text-[10px] font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open 3D full screen
            </button>
          ) : null}
        </div>
      </div>

      <div className={workspace ? "min-h-0 flex-1" : "h-[520px] w-full"}>
        <Canvas
          aria-label="Rotatable Meta SAM 3D Body surface and superellipse slices"
          camera={canvasCamera}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={["#020617"]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[2.5, 3.5, -3]} intensity={2.6} />
          <directionalLight position={[-2, 1.5, 2]} intensity={1.2} color="#67e8f9" />
          <CameraPose view={view} target={cameraTarget} distance={bounds.radius * 3.1} />
          <gridHelper args={[2.6, 13, "#475569", "#1e293b"]} position={[0, bounds.floorY - 0.015, 0]} />
          <mesh geometry={geometry}>
            <meshStandardMaterial
              color={liveMode ? "#67e8f9" : "#93c5fd"}
              transparent
              opacity={0.7}
              roughness={0.78}
              metalness={0.04}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh geometry={geometry}>
            <meshBasicMaterial color="#e0f2fe" transparent opacity={0.11} wireframe />
          </mesh>
          {prediction.rows.map((row) => {
            const style = ROW_STYLE[row.kind];
            const isActiveRow = !activeKind || row.kind === activeKind;
            const liveRow = liveMode ? liveRows.find((item) => item.kind === row.kind) : null;
            const points = liveRow
              ? liveRow.shapeMode === "meta-contour"
                ? buildScaledMetaContourLoop(row, liveRow)
                : buildSuperellipseLoop(row, liveRow)
              : [...row.sliceLoopM, row.sliceLoopM[0]!];
            return (
              <Line
                key={row.kind}
                points={points}
                color={style.color}
                lineWidth={isActiveRow ? (workspace ? 6 : 5) : 2}
                transparent
                opacity={isActiveRow ? 1 : 0.28}
                depthTest={false}
              />
            );
          })}
          <OrbitControls
            key={view}
            target={cameraTarget}
            enablePan={false}
            enableDamping
            minDistance={view === "top" ? bounds.radius * 0.4 : bounds.radius * 1.35}
            maxDistance={view === "top" ? bounds.radius * 2.2 : bounds.radius * 6}
          />
        </Canvas>
      </div>

      <div className="grid gap-2 border-t border-white/10 bg-slate-900 px-3 py-2 sm:grid-cols-3">
        {prediction.rows.map((row) => {
          const style = ROW_STYLE[row.kind];
          const isActiveRow = !activeKind || row.kind === activeKind;
          const liveRow = liveMode ? liveRows.find((item) => item.kind === row.kind) : null;
          return (
            <div key={row.kind} className={`rounded-lg px-2 py-1.5 text-[10px] ${isActiveRow ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5 opacity-55"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.color }} />
                  {style.label}
                </span>
                <span className="font-mono text-white">
                  {liveRow?.shapeMode === "meta-contour" ? "Meta contour" : `n ${(liveRow?.superellipseExponent ?? row.superellipseExponent).toFixed(2)}`}
                </span>
              </div>
              <div className="mt-1 font-mono text-[9px] text-slate-400">
                {liveRow
                  ? `${liveRow.breadthCm.toFixed(1)} × ${liveRow.depthCm.toFixed(1)} cm · ${liveRow.sourceLabel}`
                  : `${row.meshBreadthCm.toFixed(1)} × ${row.meshDepthCm.toFixed(1)} cm · Meta`}
              </div>
              <div className="mt-0.5 text-[9px] text-slate-400">
                red-row height · {row.sliceHeightFromFloorCm.toFixed(1)} cm above floor
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 px-3 py-2 text-[10px] leading-4 text-slate-300">
        {liveMode
          ? "Live geometry changes only the three torso bands. Meta contour preserves Meta's slice shape; superellipse uses n. Arms, hands, head and legs stay locked to the original Meta mesh. This is not a new Meta prediction."
          : "Original Meta shows the untouched one-photo body prediction and its measured mesh cuts."}
        <span className="ml-2 text-slate-500">{preview.vertexCount.toLocaleString()} vertices · {preview.triangleCount.toLocaleString()} triangles</span>
      </div>
    </section>
  );
}

function validFormulaRow(row: MetaMeshFormulaRow): boolean {
  return Number.isFinite(row.breadthCm)
    && row.breadthCm > 0
    && Number.isFinite(row.depthCm)
    && row.depthCm > 0
    && Number.isFinite(row.superellipseExponent)
    && row.superellipseExponent >= 1.2
    && row.superellipseExponent <= 4;
}

function deformMeshVertices(
  sourceVertices: number[],
  meshRows: MeshShapePredictionRow[],
  formulaRows: MetaMeshFormulaRow[],
): number[] {
  const next = sourceVertices.slice();
  const controls = meshRows.flatMap((meshRow) => {
    const formulaRow = formulaRows.find((row) => row.kind === meshRow.kind);
    if (!formulaRow || !meshRow.sliceLoopM.length) return [];
    const center = sliceCenter(meshRow.sliceLoopM);
    return [{
      center,
      y: center[1],
      baseA: Math.max(0.001, range(meshRow.sliceLoopM, 0) / 2),
      baseB: Math.max(0.001, range(meshRow.sliceLoopM, 2) / 2),
      baseN: clamp(meshRow.superellipseExponent, 1.2, 4),
      targetA: Math.max(0.001, formulaRow.breadthCm / 200),
      targetB: Math.max(0.001, formulaRow.depthCm / 200),
      targetN: clamp(formulaRow.superellipseExponent, 1.2, 4),
      shapeMode: formulaRow.shapeMode ?? "superellipse",
    }];
  });
  if (!controls.length) return next;

  const influenceRadiusM = 0.115;
  for (let index = 0; index < sourceVertices.length; index += 3) {
    const sourceX = sourceVertices[index]!;
    const sourceY = sourceVertices[index + 1]!;
    const sourceZ = sourceVertices[index + 2]!;
    let weightSum = 0;
    let deltaXSum = 0;
    let deltaZSum = 0;
    for (const control of controls) {
      const verticalDistance = Math.abs(sourceY - control.y);
      if (verticalDistance >= influenceRadiusM) continue;
      const normalizedDistance = verticalDistance / influenceRadiusM;
      const weight = (1 - normalizedDistance * normalizedDistance) ** 2;
      const dx = sourceX - control.center[0];
      const dz = sourceZ - control.center[2];
      if (Math.abs(dx) + Math.abs(dz) < 1e-7) continue;
      // A height-only band also intersects arms and hands beside the torso.
      // Keep deformation inside the original torso cross-section envelope so
      // changing waist/hip shape never stretches nearby limbs.
      const torsoDistance = Math.sqrt(
        (dx / control.baseA) ** 2 + (dz / control.baseB) ** 2,
      );
      if (torsoDistance >= 1.32) continue;
      const torsoWeight = torsoDistance <= 1.08
        ? 1
        : smoothStep(1.32, 1.08, torsoDistance);
      const torsoOnlyWeight = weight * torsoWeight;
      if (control.shapeMode === "meta-contour") {
        const scaleX = clamp(control.targetA / control.baseA, 0.55, 1.65);
        const scaleZ = clamp(control.targetB / control.baseB, 0.55, 1.65);
        deltaXSum += ((control.center[0] + dx * scaleX) - sourceX) * torsoOnlyWeight;
        deltaZSum += ((control.center[2] + dz * scaleZ) - sourceZ) * torsoOnlyWeight;
      } else {
        const theta = Math.atan2(dz, dx);
        const baseRadius = superellipseRadius(theta, control.baseA, control.baseB, control.baseN);
        const targetRadius = superellipseRadius(theta, control.targetA, control.targetB, control.targetN);
        const scale = clamp(targetRadius / Math.max(1e-6, baseRadius), 0.55, 1.65);
        deltaXSum += ((control.center[0] + dx * scale) - sourceX) * torsoOnlyWeight;
        deltaZSum += ((control.center[2] + dz * scale) - sourceZ) * torsoOnlyWeight;
      }
      weightSum += torsoOnlyWeight;
    }
    if (weightSum <= 0) continue;
    const strength = Math.min(1, weightSum);
    next[index] = sourceX + (deltaXSum / weightSum) * strength;
    next[index + 2] = sourceZ + (deltaZSum / weightSum) * strength;
  }
  return next;
}

function buildScaledMetaContourLoop(meshRow: MeshShapePredictionRow, formulaRow: MetaMeshFormulaRow): Point3[] {
  const center = sliceCenter(meshRow.sliceLoopM);
  const sourceBreadthM = Math.max(0.001, range(meshRow.sliceLoopM, 0));
  const sourceDepthM = Math.max(0.001, range(meshRow.sliceLoopM, 2));
  const scaleX = (formulaRow.breadthCm / 100) / sourceBreadthM;
  const scaleZ = (formulaRow.depthCm / 100) / sourceDepthM;
  const points = meshRow.sliceLoopM.map((point): Point3 => [
    center[0] + (point[0] - center[0]) * scaleX,
    point[1],
    center[2] + (point[2] - center[2]) * scaleZ,
  ]);
  return points.length ? [...points, points[0]!] : points;
}

function range(points: Point3[], axis: 0 | 2): number {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minimum = Math.min(minimum, point[axis]);
    maximum = Math.max(maximum, point[axis]);
  }
  return maximum - minimum;
}

function buildSuperellipseLoop(meshRow: MeshShapePredictionRow, formulaRow: MetaMeshFormulaRow): Point3[] {
  const center = sliceCenter(meshRow.sliceLoopM);
  const a = formulaRow.breadthCm / 200;
  const b = formulaRow.depthCm / 200;
  const exponent = clamp(formulaRow.superellipseExponent, 1.2, 4);
  const points: Point3[] = [];
  const steps = 160;
  for (let index = 0; index <= steps; index += 1) {
    const theta = (Math.PI * 2 * index) / steps;
    const cosine = Math.cos(theta);
    const sine = Math.sin(theta);
    points.push([
      center[0] + a * Math.sign(cosine) * Math.abs(cosine) ** (2 / exponent),
      center[1],
      center[2] + b * Math.sign(sine) * Math.abs(sine) ** (2 / exponent),
    ]);
  }
  return points;
}

function sliceCenter(points: Point3[]): Point3 {
  if (!points.length) return [0, 0, 0];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let ySum = 0;
  for (const point of points) {
    minX = Math.min(minX, point[0]);
    maxX = Math.max(maxX, point[0]);
    minZ = Math.min(minZ, point[2]);
    maxZ = Math.max(maxZ, point[2]);
    ySum += point[1];
  }
  return [(minX + maxX) / 2, ySum / points.length, (minZ + maxZ) / 2];
}

function superellipseRadius(theta: number, a: number, b: number, exponent: number): number {
  const cosine = Math.abs(Math.cos(theta));
  const sine = Math.abs(Math.sin(theta));
  const denominator = (cosine / a) ** exponent + (sine / b) ** exponent;
  return Math.max(0.001, denominator ** (-1 / exponent));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function CameraPose({ view, target, distance }: { view: MeshView; target: Point3; distance: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const topDistance = Math.max(0.75, distance * 0.28);
    const position: Point3 = view === "side"
      ? [distance, target[1], 0]
      : view === "top"
        ? [0, target[1] + topDistance, 0.01]
        : view === "three-quarter"
          ? [distance * 0.72, target[1] + 0.08, -distance * 0.72]
          : [0, target[1], -distance];
    camera.position.set(...position);
    camera.up.set(0, view === "top" ? 0 : 1, view === "top" ? -1 : 0);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, distance, target, view]);
  return null;
}
