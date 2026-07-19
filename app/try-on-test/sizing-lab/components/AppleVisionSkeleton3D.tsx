"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import type { AppleVisionSkeletonJoint } from "../lib/appleVisionBodyScale";

type SkeletonView = "photo" | "side" | "three-quarter";
type Point3 = [number, number, number];

const CONNECTIONS: Array<[string, string]> = [
  ["human_top_head_3D", "human_center_head_3D"],
  ["human_center_head_3D", "human_center_shoulder_3D"],
  ["human_center_shoulder_3D", "human_spine_3D"],
  ["human_spine_3D", "human_root_3D"],
  ["human_center_shoulder_3D", "human_left_shoulder_3D"],
  ["human_left_shoulder_3D", "human_left_elbow_3D"],
  ["human_left_elbow_3D", "human_left_wrist_3D"],
  ["human_center_shoulder_3D", "human_right_shoulder_3D"],
  ["human_right_shoulder_3D", "human_right_elbow_3D"],
  ["human_right_elbow_3D", "human_right_wrist_3D"],
  ["human_root_3D", "human_left_hip_3D"],
  ["human_left_hip_3D", "human_left_knee_3D"],
  ["human_left_knee_3D", "human_left_ankle_3D"],
  ["human_root_3D", "human_right_hip_3D"],
  ["human_right_hip_3D", "human_right_knee_3D"],
  ["human_right_knee_3D", "human_right_ankle_3D"],
];

export function AppleVisionSkeleton3D({
  joints,
  bodyDistanceM,
}: {
  joints: AppleVisionSkeletonJoint[];
  bodyDistanceM: number;
}) {
  const [view, setView] = useState<SkeletonView>("photo");
  const geometry = useMemo(() => {
    const points = new Map(joints.map((joint) => [joint.name, [joint.xM, joint.yM, joint.zM] as Point3]));
    const values = [...points.values()];
    const minY = values.length ? Math.min(...values.map((point) => point[1])) : -0.9;
    const maxY = values.length ? Math.max(...values.map((point) => point[1])) : 0.9;
    const centerY = (minY + maxY) / 2;
    const lines = CONNECTIONS.flatMap(([startName, endName]) => {
      const start = points.get(startName);
      const end = points.get(endName);
      return start && end ? [{ key: `${startName}-${endName}`, points: [start, end] as [Point3, Point3] }] : [];
    });
    return { points, lines, minY, centerY };
  }, [joints]);

  if (joints.length < 10) {
    return <div className="rounded-lg border border-dashed border-violet-300 p-6 text-center text-sm text-violet-800">Apple did not return enough 3D joints to draw the skeleton.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-violet-300 bg-slate-950 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider">Apple 3D skeleton · 17 joints</div>
          <div className="text-[10px] text-slate-300">Drag to rotate · scroll to zoom · skeleton only, not body surface</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-right">
            <div className="text-[8px] font-semibold uppercase tracking-wider text-emerald-200">Camera → body root</div>
            <div className="font-mono text-base font-black text-emerald-300">{bodyDistanceM.toFixed(3)} m</div>
            <div className="text-[8px] text-slate-300">Apple model estimate</div>
          </div>
          <div className="flex flex-wrap gap-1" aria-label="3D skeleton view">
          {([
            ["photo", "Photo view"],
            ["side", "Side view"],
            ["three-quarter", "3/4 view"],
          ] as Array<[SkeletonView, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`rounded px-2 py-1 text-[10px] font-semibold ${view === value ? "bg-violet-500 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>
      </div>
      <div className="h-[360px] w-full">
        <Canvas
          aria-label="Rotatable Apple Vision 3D body skeleton"
          camera={{ position: [0, geometry.centerY, -2.8], fov: 38, near: 0.01, far: 20 }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[2, 3, -2]} intensity={2.2} />
          <CameraPose view={view} target={[0, geometry.centerY, 0]} />
          <gridHelper args={[2.4, 12, "#64748b", "#334155"]} position={[0, geometry.minY - 0.04, 0]} />
          {geometry.lines.map((line) => (
            <Line key={line.key} points={line.points} color="#a78bfa" lineWidth={3} />
          ))}
          {[...geometry.points.entries()].map(([name, point]) => (
            <mesh key={name} position={point}>
              <sphereGeometry args={[name.includes("head") ? 0.045 : 0.032, 16, 16]} />
              <meshStandardMaterial color={name.includes("root") || name.includes("spine") ? "#34d399" : "#f8fafc"} />
            </mesh>
          ))}
          <OrbitControls
            key={view}
            target={[0, geometry.centerY, 0]}
            enablePan={false}
            enableDamping
            minDistance={1.6}
            maxDistance={5}
          />
        </Canvas>
      </div>
    </div>
  );
}

function CameraPose({ view, target }: { view: SkeletonView; target: Point3 }) {
  const { camera } = useThree();
  useEffect(() => {
    const distance = 2.8;
    const position: Point3 = view === "side"
      ? [distance, target[1], 0]
      : view === "three-quarter"
        ? [2, target[1] + 0.1, -2]
        : [0, target[1], -distance];
    camera.position.set(...position);
    camera.up.set(0, 1, 0);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, target, view]);
  return null;
}
