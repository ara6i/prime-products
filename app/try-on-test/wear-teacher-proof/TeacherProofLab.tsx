"use client";

import Image from "next/image";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Line, OrbitControls, useGLTF } from "@react-three/drei";
import { Color, Mesh, type Material } from "three";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  CircleOff,
  Database,
  Download,
  Eye,
  LoaderCircle,
  LockKeyhole,
  Ratio,
  Rotate3d,
  Ruler,
  ScanLine,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  TEACHER_ROW_IDS,
  type TeacherBlenderResponse,
  type TeacherProofPerson,
  type TeacherProofRow,
  type TeacherProofSelection,
  type TeacherRowId,
} from "./teacherProof.types";

const ROW_COLOURS: Record<TeacherRowId, string> = {
  neck: "#a78bfa",
  chest: "#38bdf8",
  underbust: "#2dd4bf",
  waist: "#facc15",
  hips: "#fb7185",
};

type RenderState = {
  status: "rendering" | "ready" | "error";
  payload?: TeacherBlenderResponse;
  error?: string;
};

function format(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}

function signedDegrees(value: number) {
  if (Math.abs(value) < 0.01) return "0°";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}°`;
}

function statusCopy(person: TeacherProofPerson) {
  if (person.status === "certified") {
    return person.notApplicableRows > 0
      ? `All ${person.applicableRows} applicable rows certified · ${person.notApplicableRows} N/A`
      : "All five applicable rows certified";
  }
  if (person.status === "core-ready") {
    const partial = person.partialRows > 0 ? ` · ${person.partialRows} partial` : "";
    return `${person.acceptedRows}/${person.applicableRows} full sections${partial} · waist + hips ready`;
  }
  return "Core teacher needs review";
}

function statusClasses(person: TeacherProofPerson) {
  if (person.status === "certified") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (person.status === "core-ready") return "border-amber-400/40 bg-amber-400/10 text-amber-200";
  return "border-rose-400/40 bg-rose-400/10 text-rose-200";
}

function rowStateLabel(row: TeacherProofRow) {
  if (row.state === "certified") return "Teacher certified";
  if (row.state === "partial-geometry") return "A–B/C–D certified · shape masked";
  if (row.state === "rejected-geometry") return "Geometry rejected";
  if (row.state === "measurement-only") return "Measurement only";
  return "Not applicable";
}

function rowStateClasses(row: TeacherProofRow) {
  if (row.state === "certified") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (row.state === "partial-geometry") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (row.state === "rejected-geometry") return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (row.state === "measurement-only") return "border-orange-400/30 bg-orange-400/10 text-orange-100";
  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function rowStateColour(row: TeacherProofRow) {
  if (row.state === "certified") return ROW_COLOURS[row.id];
  if (row.state === "partial-geometry") return "#fbbf24";
  if (row.state === "rejected-geometry") return "#fb7185";
  if (row.state === "measurement-only") return "#fb923c";
  return "#64748b";
}

function RowStateIcon({ row }: { row: TeacherProofRow }) {
  if (row.state === "certified") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (row.state === "partial-geometry") return <AlertTriangle className="h-3.5 w-3.5" />;
  if (row.state === "rejected-geometry") return <XCircle className="h-3.5 w-3.5" />;
  if (row.state === "measurement-only") return <AlertTriangle className="h-3.5 w-3.5" />;
  return <CircleOff className="h-3.5 w-3.5" />;
}

function TeacherBody({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const tint = (material: Material) => {
        const copy = material.clone() as Material & {
          color?: Color;
          emissive?: Color;
          emissiveIntensity?: number;
          opacity?: number;
          transparent?: boolean;
          depthWrite?: boolean;
        };
        copy.color?.set("#38bdf8");
        copy.emissive?.set("#082f49");
        if (copy.emissiveIntensity !== undefined) copy.emissiveIntensity = 0.1;
        copy.transparent = true;
        copy.opacity = 0.82;
        copy.depthWrite = false;
        return copy;
      };
      child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material);
    });
    return clone;
  }, [gltf.scene]);
  return <primitive object={scene} />;
}

function TeacherRing({ row, selected }: { row: TeacherProofRow; selected: boolean }) {
  if (
    !row.available
    || row.sliceHeightCm === null
    || row.widthCm === null
    || row.depthCm === null
  ) return null;
  const heightM = row.sliceHeightCm / 100;
  const widthCm = row.widthCm;
  const depthCm = row.depthCm;
  const colour = rowStateColour(row);
  const pathSegments = row.worldPathSegmentsMeters.map((segment) => {
    const points = segment.map(([x, y, z]) => [x, y, z] as [number, number, number]);
    if (row.accepted && points.length >= 3) points.push(points[0]!);
    return points;
  }).filter((points) => points.length >= 2);
  const [centerX, centerY, centerZ] = row.worldCenterMeters ?? [0, heightM, 0];
  return (
    <group>
      {selected && pathSegments.length > 0 && !row.surfacePathNonplanar ? (
        <mesh position={[centerX, centerY, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthCm / 82, depthCm / 82]} />
          <meshBasicMaterial color={colour} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ) : null}
      {pathSegments.map((points, index) => (
        <Line
          key={`${row.id}-surface-run-${index}`}
          points={points}
          color={colour}
          lineWidth={selected ? 4 : 2}
          transparent
          opacity={selected ? 1 : 0.72}
          dashed={row.state === "partial-geometry" || row.state === "rejected-geometry"}
          depthTest={false}
          dashSize={0.025}
          gapSize={0.014}
        />
      ))}
      {selected ? (
        <>
          <Line
            points={[
              [centerX - widthCm / 200, centerY + 0.004, centerZ],
              [centerX + widthCm / 200, centerY + 0.004, centerZ],
            ]}
            color="#f8fafc"
            lineWidth={2.2}
          />
          <Line
            points={[
              [centerX, centerY + 0.008, centerZ - depthCm / 200],
              [centerX, centerY + 0.008, centerZ + depthCm / 200],
            ]}
            color="#fb923c"
            lineWidth={2.2}
          />
        </>
      ) : null}
    </group>
  );
}

type ViewerAngle = "front" | "right" | "back";

function CameraPreset({ angle, heightM, target }: {
  angle: ViewerAngle;
  heightM: number;
  target: [number, number, number];
}) {
  const { camera } = useThree();
  useEffect(() => {
    const distance = heightM * 2.35;
    const positions: Record<ViewerAngle, [number, number, number]> = {
      front: [0, heightM * 0.55, distance],
      right: [distance, heightM * 0.55, 0],
      back: [0, heightM * 0.55, -distance],
    };
    camera.position.set(...positions[angle]);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [angle, camera, heightM, target]);
  return null;
}

function BlenderViewer({
  person,
  response,
  selectedRow,
  showAllRows,
}: {
  person: TeacherProofPerson;
  response: TeacherBlenderResponse;
  selectedRow: TeacherRowId;
  showAllRows: boolean;
}) {
  const glbUrl = response.artifacts?.glbUrl;
  const heightM = Math.max(1.4, person.heightCm / 100);
  const target = useMemo<[number, number, number]>(() => [0, heightM * 0.5, 0], [heightM]);
  const [angle, setAngle] = useState<ViewerAngle>("front");
  const selected = person.rows.find((row) => row.id === selectedRow);
  if (!glbUrl) return null;
  return (
    <div className="relative h-[630px] overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#020617]">
      <Canvas
        aria-label={`Interactive Blender environment showing exact WEAR 3D scan ${person.scanId}`}
        camera={{ position: [heightM * 0.28, heightM * 0.62, heightM * 2.25], fov: 34, near: 0.01, far: 30 }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 3.5, 9]} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[2.8, 3.8, 3.2]} intensity={2.4} color="#dff7ff" />
        <directionalLight position={[-2.4, 2.5, -2.8]} intensity={1.5} color="#22d3ee" />
        <Suspense fallback={null}>
          <TeacherBody url={glbUrl} />
          {person.rows.map((row) => (
            row.id === selectedRow || showAllRows
              ? <TeacherRing key={row.id} row={row} selected={row.id === selectedRow} />
              : null
          ))}
        </Suspense>
        <CameraPreset angle={angle} heightM={heightM} target={target} />
        <gridHelper args={[3.6, 24, "#155e75", "#172033"]} position={[0, -0.01, 0]} />
        <axesHelper args={[0.24]} position={[-0.9, 0, 0.65]} />
        <OrbitControls
          target={target}
          enableDamping
          enablePan={false}
          minDistance={heightM * 0.72}
          maxDistance={heightM * 4.2}
        />
      </Canvas>
      <div className="absolute left-4 top-4 flex gap-1 rounded-xl border border-white/10 bg-slate-950/85 p-1 backdrop-blur">
        {(["front", "right", "back"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setAngle(view)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-black capitalize ${angle === view ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
          >
            {view}
          </button>
        ))}
      </div>
      {selected ? (
        <div className="pointer-events-none absolute right-4 top-4 rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs font-black text-white shadow-xl backdrop-blur">
          {selected.label} · {format(selected.sliceHeightCm)} cm
          {selected.surfacePathNonplanar ? " · sloped 3D path" : ""}
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-xs text-slate-300 backdrop-blur">
        <strong className="block text-white">Drag to rotate · scroll to zoom</strong>
        White = A–B front width · orange = C–D depth
      </div>
    </div>
  );
}

function CrossSection({ row }: { row: TeacherProofRow }) {
  if (!row.available || row.widthCm === null || row.depthCm === null || row.contour.length < 3) {
    const copy = row.state === "not-applicable"
      ? "This row is not applicable to this subject and receives no training loss."
      : row.state === "partial-geometry"
        ? `The real PLY evidence certifies A–B ${format(row.widthCm)} cm and C–D ${format(row.depthCm)} cm, but the exact slice is not safely closed. Shape is masked; the independent WEAR tape still trains.`
      : row.state === "measurement-only"
        ? `A ${format(row.tapeCm)} cm WEAR tape value exists for audit, but there is no certified 3D section.`
        : "The source evidence exists, but no safe closed cross-section passed the geometry gate.";
    return (
      <div className={`grid min-h-72 place-items-center rounded-2xl border border-dashed p-6 text-center text-sm ${rowStateClasses(row)}`}>
        <div>
          <CircleOff className="mx-auto mb-3 h-8 w-8" />
          {copy}
        </div>
      </div>
    );
  }
  const points = row.contour.map(([x, depth]) => [
    x * row.widthCm! / 2,
    -depth * row.depthCm! / 2,
  ] as const);
  const extent = Math.max(row.widthCm, row.depthCm) * 0.72;
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ") + " Z";
  const colour = rowStateColour(row);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <strong className="text-sm text-white">{row.surfacePathNonplanar ? "True sloped 3D surface path" : "True 360° section"}</strong>
          <p className="text-xs text-slate-400">{row.surfacePathNonplanar ? "Top projection · height changes are shown on the 3D body" : "Top view · centimetre-correct aspect ratio"}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-slate-200">
          {row.contour.length} points
        </span>
      </div>
      <svg
        viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
        className="aspect-square w-full"
        role="img"
        aria-label={`${row.label} top-view contour with A-B width and C-D depth`}
      >
        <defs>
          <radialGradient id={`teacher-grid-${row.id}`}>
            <stop offset="0" stopColor="#0f172a" />
            <stop offset="1" stopColor="#020617" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r={extent * 0.98} fill={`url(#teacher-grid-${row.id})`} stroke="#1e293b" strokeWidth="0.5" />
        {[0.25, 0.5, 0.75].map((scale) => (
          <circle key={scale} cx="0" cy="0" r={extent * scale} fill="none" stroke="#1e293b" strokeWidth="0.35" strokeDasharray="1.4 1.4" />
        ))}
        <line x1={-row.widthCm / 2} y1="0" x2={row.widthCm / 2} y2="0" stroke="#f8fafc" strokeWidth="0.8" />
        <line x1="0" y1={-row.depthCm / 2} x2="0" y2={row.depthCm / 2} stroke="#fb923c" strokeWidth="0.8" />
        <path d={path} fill={`${colour}22`} stroke={colour} strokeWidth="1.1" strokeLinejoin="round" />
        <g fill="#f8fafc" fontSize={extent * 0.09} fontWeight="800" textAnchor="middle">
          <text x={-row.widthCm / 2 - extent * 0.08} y={extent * 0.03}>A</text>
          <text x={row.widthCm / 2 + extent * 0.08} y={extent * 0.03}>B</text>
        </g>
        <g fill="#fdba74" fontSize={extent * 0.09} fontWeight="800" textAnchor="middle">
          <text x="0" y={-row.depthCm / 2 - extent * 0.06}>C</text>
          <text x="0" y={row.depthCm / 2 + extent * 0.11}>D</text>
        </g>
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <span className="rounded-lg bg-white/5 px-3 py-2 text-slate-300"><strong className="block text-white">A–B</strong>{format(row.widthCm)} cm front width</span>
        <span className="rounded-lg bg-orange-400/10 px-3 py-2 text-orange-200"><strong className="block text-orange-100">C–D</strong>{format(row.depthCm)} cm depth</span>
      </div>
    </div>
  );
}

function FrontEvidence({ person, selectedRow }: { person: TeacherProofPerson; selectedRow: TeacherRowId }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <strong className="text-sm text-white">Canonical front projection</strong>
          <p className="text-xs text-slate-400">Exact PLY surface with teacher rows</p>
        </div>
        <Eye className="h-4 w-4 text-cyan-300" />
      </div>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[390px]">
        <Image
          src={`/api/try-on-test/wear-teacher-proof/card?scanId=${encodeURIComponent(person.scanId)}`}
          alt={`Canonical front mesh of WEAR scan ${person.scanId}`}
          fill
          unoptimized
          className="object-contain"
          sizes="390px"
        />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {person.shoulder.frontPoints.length >= 2 ? (
            <line
              x1={person.shoulder.frontPoints[0]!.x}
              y1={person.shoulder.frontPoints[0]!.y}
              x2={person.shoulder.frontPoints[1]!.x}
              y2={person.shoulder.frontPoints[1]!.y}
              stroke="#f8fafc"
              strokeWidth="0.006"
              strokeDasharray="0.012 0.008"
            />
          ) : null}
          {person.rows.map((row) => (
            row.available && row.leftXNorm !== null && row.rightXNorm !== null && row.yNorm !== null
              ? (
                <g key={row.id} opacity={row.id === selectedRow ? 1 : 0.5}>
                  {row.surfacePathNonplanar && row.frontPath.length >= 3 ? (
                    <polyline
                      points={row.frontPath.map(([x, y]) => `${x},${y}`).join(" ")}
                      fill="none"
                      stroke={rowStateColour(row)}
                      strokeWidth={row.id === selectedRow ? 0.009 : 0.0045}
                      strokeLinejoin="round"
                    />
                  ) : (
                    <line
                      x1={row.leftXNorm}
                      y1={row.yNorm}
                      x2={row.rightXNorm}
                      y2={row.yNorm}
                      stroke={rowStateColour(row)}
                      strokeWidth={row.id === selectedRow ? 0.009 : 0.0045}
                      strokeDasharray={row.accepted ? undefined : "0.012 0.008"}
                    />
                  )}
                  {!row.surfacePathNonplanar ? (
                    <>
                      <circle cx={row.leftXNorm} cy={row.yNorm} r={row.id === selectedRow ? 0.011 : 0.006} fill="#020617" stroke={rowStateColour(row)} strokeWidth="0.004" />
                      <circle cx={row.rightXNorm} cy={row.yNorm} r={row.id === selectedRow ? 0.011 : 0.006} fill="#020617" stroke={rowStateColour(row)} strokeWidth="0.004" />
                    </>
                  ) : null}
                </g>
              )
              : null
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3 text-xs text-slate-300">
        <span><span className="mr-2 inline-block h-0.5 w-5 bg-white align-middle" />Shoulder LND</span>
        <span><span className="mr-2 inline-block h-0.5 w-5 bg-amber-400 align-middle" />Amber dashed = partial</span>
      </div>
    </div>
  );
}

function Gate({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${pass ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}`}>
      {pass ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function RowInspector({ row }: { row: TeacherProofRow }) {
  const checks = [
    [row.available, "Visual section"],
    [row.trainingMask.edge, "Edge loss"],
    [row.trainingMask.depth, "Depth loss"],
    [row.trainingMask.shape, "Shape loss"],
    [row.trainingMask.tape, "Tape loss"],
    [row.trainingMask.ratio, "Ratio loss"],
  ] as const;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: rowStateColour(row) }} />
            <h3 className="text-xl font-black text-white">{row.label}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {row.surfacePathNonplanar ? "Median path height" : "Plane height"} {format(row.sliceHeightCm)} cm · {row.contour.length || 0} shape points
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide ${rowStateClasses(row)}`}>
          {rowStateLabel(row)}
        </span>
      </div>

      {row.applicable ? (
        <div className="flex flex-wrap gap-2">
          {checks.map(([pass, label]) => <Gate key={label} pass={pass} label={label} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 p-3 text-sm text-slate-300">
          Applicability mask = 0. This subject remains useful for every other label, but this row contributes no loss.
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["A–B width", `${format(row.widthCm)} cm`],
          ["C–D depth", `${format(row.depthCm)} cm`],
          ["Depth ÷ width", format(row.depthWidthRatio, 3)],
          ["Shape perimeter", `${format(row.walkedPerimeterCm)} cm`],
          ["WEAR tape", `${format(row.tapeCm)} cm`],
          ["Shape − tape", row.tapeDeltaCm === null ? "—" : `${row.tapeDeltaCm >= 0 ? "+" : ""}${row.tapeDeltaCm.toFixed(1)} cm`],
          ["Raw perimeter", `${format(row.rawPerimeterCm)} cm`],
          ["Closure gap", `${format(row.closureGapCm, 2)} cm`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/5 bg-slate-950/70 p-3">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
            <strong className="mt-1 block text-lg text-white">{value}</strong>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs leading-5 text-slate-300">
          <strong className="block text-cyan-200">3D geometry truth</strong>
          {row.planeProtocol}
        </div>
        <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 p-3 text-xs leading-5 text-slate-300">
          <strong className="block text-violet-200">Independent tape protocol</strong>
          {row.tapeProtocol}
        </div>
      </div>

      {row.reconstructed ? (
        <div className="flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          This contour required certified arc stitching. Geometry may teach only the outputs explicitly marked eligible; it is not equivalent to a naturally closed raw slice.
        </div>
      ) : null}
      {row.state === "partial-geometry" ? (
        <div className="flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          Real PLY evidence certifies the row position, A–B width and C–D depth. Unsafe gaps are not joined, so only the 32-point shape is masked; the recorded WEAR tape remains an independent target.
        </div>
      ) : null}
      {row.surfacePathNonplanar ? (
        <div className="flex gap-3 rounded-xl border border-violet-400/25 bg-violet-400/10 p-3 text-sm text-violet-100">
          <Rotate3d className="mt-0.5 h-5 w-5 shrink-0" />
          WEAR neck truth is a sloped four-landmark path on the PLY surface, not a flat slice. Its geometry and recorded tape are trained as separate targets; one is not forced to equal the other.
        </div>
      ) : null}
      {row.worldPathSegmentsMeters.some((segment) => segment.length >= 2) ? (
        <div className={`rounded-xl border p-3 text-sm ${row.surfaceAttachment.certified ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-100" : "border-rose-400/25 bg-rose-400/10 text-rose-100"}`}>
          <strong className="block">Path-to-raw-PLY attachment</strong>
          {row.surfaceAttachment.testedPoints} tested points · median {format(row.surfaceAttachment.medianDistanceMm, 2)} mm · 95% within {format(row.surfaceAttachment.p95DistanceMm, 2)} mm · maximum seam {format(row.surfaceAttachment.maximumDistanceMm, 2)} mm
          <span className="mt-1 block text-[11px] opacity-75">
            Gate: 95% ≤ {format(row.surfaceAttachment.p95AllowedMm, 1)} mm and maximum seam ≤ {format(row.surfaceAttachment.maximumAllowedMm, 1)} mm.
          </span>
        </div>
      ) : null}
      {row.sliceRobustnessOffsetCm !== null ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm text-cyan-100">
          Under-bust used the nearest certified PLY plane {Math.abs(row.sliceRobustnessOffsetCm).toFixed(1)} cm {row.sliceRobustnessOffsetCm < 0 ? "below" : "above"} the {format(row.nominalSliceHeightCm)} cm Substernale proxy. Tape was not used to choose it.
        </div>
      ) : null}
      {row.rejectionReasons.length || row.qualityFlags.length ? (
        <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-100">
          <strong className="block">Why this evidence needs attention</strong>
          <ul className="mt-2 space-y-1 text-xs leading-5">
            {[...row.rejectionReasons, ...row.qualityFlags].map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Pipeline({ person }: { person: TeacherProofPerson }) {
  const steps = [
    { icon: Database, title: "1 · Source truth", value: "PLY + LND + independent tape", pass: person.source.mesh !== "not linked" },
    { icon: Rotate3d, title: "2 · Canonical 3D", value: `${person.heightCm.toFixed(1)} cm · ${person.pose}`, pass: person.trainingPoseValid },
    { icon: Ruler, title: "3 · Body targets", value: "Rows + A–B + C–D + shape", pass: person.coreReady },
    { icon: Camera, title: "4 · Camera teacher", value: "5 known global transforms", pass: true },
    { icon: Ratio, title: "5 · Ratio masks", value: `${person.eligibleRatios}/${person.applicableRatios} active`, pass: person.eligibleRatios > 0 },
    { icon: ScanLine, title: "6 · User input", value: "Front RGB + height/weight → 2D body", pass: true },
    { icon: LockKeyhole, title: "7 · Fresh model", value: "GPU locked until approval", pass: false, locked: true },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Teacher → student contract</p>
          <h2 className="mt-1 text-lg font-black text-white">The full visual pipeline for {person.scanId}</h2>
        </div>
        <ShieldCheck className="h-6 w-6 text-cyan-300" />
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className={`relative rounded-xl border p-3 ${step.locked ? "border-slate-700 bg-slate-950/65" : step.pass ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5"}`}>
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${step.locked ? "text-slate-500" : step.pass ? "text-emerald-300" : "text-rose-300"}`} />
                {index < steps.length - 1 ? <ArrowRight className="hidden h-4 w-4 translate-x-5 text-slate-600 xl:block" /> : null}
              </div>
              <strong className="mt-3 block text-xs text-white">{step.title}</strong>
              <span className="mt-1 block text-[11px] leading-4 text-slate-400">{step.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SubjectRail({
  people,
  selection,
  selected,
  onSelect,
}: {
  people: TeacherProofPerson[];
  selection: TeacherProofSelection;
  selected: string;
  onSelect: (scanId: string) => void;
}) {
  return (
    <section aria-label="Ten WEAR teacher-proof people">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Seeded random canary</p>
          <h2 className="mt-1 text-xl font-black text-white">{people.length} random people from {selection.populationCount.toLocaleString()} · select every body</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-200">Green = accepted</span>
          <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-rose-200">Red = blocked</span>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-amber-100">Amber = partial geometry</span>
          <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-1 text-orange-100">Orange = tape only</span>
          <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-1 text-slate-300">Grey = N/A</span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {people.map((person) => (
          <button
            key={person.scanId}
            type="button"
            onClick={() => onSelect(person.scanId)}
            aria-pressed={selected === person.scanId}
            className={`group overflow-hidden rounded-2xl border text-left transition ${selected === person.scanId ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_2px_rgba(34,211,238,0.18)]" : "border-white/10 bg-slate-900/70 hover:border-cyan-400/40"}`}
          >
            <div className="grid grid-cols-[70px_1fr] gap-2 p-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-950">
                <Image
                  src={`/api/try-on-test/wear-teacher-proof/card?scanId=${encodeURIComponent(person.scanId)}`}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain transition group-hover:scale-[1.03]"
                  sizes="70px"
                />
              </div>
              <div className="min-w-0 py-1">
                <strong className="block truncate text-sm text-white">{person.scanId}</strong>
                <span className="mt-0.5 block text-[11px] text-slate-400">{person.gender} · BMI {person.bmi.toFixed(1)}</span>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClasses(person)}`}>
                  {person.acceptedRows}/{person.applicableRows} applicable
                </span>
                <div className="mt-2 flex gap-1" aria-label={`${person.acceptedRows} of ${person.applicableRows} applicable teacher rows accepted`}>
                  {person.rows.map((row) => (
                    <span
                      key={row.id}
                      title={`${row.label}: ${rowStateLabel(row)}`}
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: rowStateColour(row) }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SelectionProof({ selection }: { selection: TeacherProofSelection }) {
  const cleanSelection = selection.heldOutRolesSelected === 0
    && !selection.geometryUsedForSelection
    && !selection.tapeUsedForSelection
    && !selection.modelPredictionUsedForSelection
    && !selection.v9ArtifactUsed;
  return (
    <section className={`rounded-2xl border p-5 ${cleanSelection ? "border-emerald-400/25 bg-emerald-400/5" : "border-rose-400/30 bg-rose-400/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Selection provenance</p>
          <h2 className="mt-1 text-xl font-black text-white">Fresh random ten · seed {selection.seed}</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-300">Chosen only from {selection.populationCount.toLocaleString()} eligible non-held-out scans: {selection.population}. Bad rows remain visible because label quality was not allowed to influence selection.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${cleanSelection ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-rose-300/30 bg-rose-300/10 text-rose-100"}`}>
          {cleanSelection ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {cleanSelection ? "Selection gate passed" : "Selection gate failed"}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Held-out people selected", selection.heldOutRolesSelected, selection.heldOutRolesSelected === 0],
          ["Geometry used to choose", selection.geometryUsedForSelection ? "YES" : "NO", !selection.geometryUsedForSelection],
          ["Tape used to choose", selection.tapeUsedForSelection ? "YES" : "NO", !selection.tapeUsedForSelection],
          ["Predictions used to choose", selection.modelPredictionUsedForSelection ? "YES" : "NO", !selection.modelPredictionUsedForSelection],
          ["V9 artifacts used", selection.v9ArtifactUsed ? "YES" : "NO", !selection.v9ArtifactUsed],
        ].map(([label, value, pass]) => (
          <div key={label as string} className="rounded-xl border border-white/5 bg-slate-950/55 p-3">
            <span className="block text-[11px] font-bold text-slate-500">{label as string}</span>
            <strong className={`mt-1 block text-lg ${pass ? "text-emerald-200" : "text-rose-200"}`}>{String(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CameraCorrectionPanel({
  person,
  response,
}: {
  person: TeacherProofPerson;
  response: TeacherBlenderResponse;
}) {
  const cards = response.metadata?.cameraCards ?? [];
  const urls = response.artifacts?.cameraCards ?? {};
  const truth = response.metadata?.cameraCorrectionTruth;
  return (
    <section className="overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-900/65">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Known-transform camera teacher</p>
          <h2 className="mt-1 text-xl font-black text-white">Same exact 3D body · five camera views</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-400">Blender changes only the global camera. The source body, stature, row positions, A–B, C–D and 3D shape stay identical, so the correction label is exact—not guessed from a photo.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs font-black text-sky-100">
          <Camera className="h-4 w-4" />
          {cards.length} exact transforms
        </span>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const canonical = card.id === "canonical";
          const url = urls[card.id];
          const correction = [
            `yaw ${signedDegrees(-card.yawDeg)}`,
            `pitch ${signedDegrees(-card.pitchDeg)}`,
            `roll ${signedDegrees(-card.rollDeg)}`,
          ].join(" · ");
          return (
            <article key={card.id} className={`overflow-hidden rounded-xl border ${canonical ? "border-emerald-300/40 bg-emerald-300/5" : "border-sky-300/20 bg-slate-950/60"}`}>
              <div className="relative aspect-[3/4] bg-slate-950">
                {url ? (
                  <Image
                    src={url}
                    alt={`${person.scanId} rendered with yaw ${card.yawDeg}, pitch ${card.pitchDeg}, roll ${card.rollDeg}`}
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, 20vw"
                  />
                ) : null}
                <span className={`absolute left-2 top-2 rounded-full border px-2 py-1 text-[10px] font-black ${canonical ? "border-emerald-200/40 bg-emerald-950/85 text-emerald-100" : "border-sky-200/30 bg-slate-950/85 text-sky-100"}`}>
                  {canonical ? "TARGET" : "INPUT"}
                </span>
              </div>
              <div className="space-y-1 border-t border-white/5 p-3 text-[11px]">
                <strong className="block text-sm text-white">{canonical ? "Canonical front" : card.id.replaceAll("-", " ")}</strong>
                <span className="block text-slate-400">Camera: yaw {signedDegrees(card.yawDeg)} · pitch {signedDegrees(card.pitchDeg)} · roll {signedDegrees(card.rollDeg)}</span>
                <span className={`block font-bold ${canonical ? "text-emerald-200" : "text-sky-200"}`}>{canonical ? "Correction target frame" : `Teacher correction: ${correction}`}</span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-3 border-t border-white/10 p-5 lg:grid-cols-[0.9fr_1.6fr]">
        <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm leading-6 text-slate-300">
          <strong className="block text-violet-200">Exact correction rule</strong>
          <p className="mt-1">{truth?.operation ?? "One global inverse camera transform; no local body-part stretching."}</p>
          <p className="mt-2 text-xs text-slate-500">The canonical frame is the target. Apple pose and Depth Pro may initialize the real photo, but they are inputs—not teacher truth.</p>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <strong className="text-sm text-cyan-100">Later user inference</strong>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-200">
            {["Front RGB + height/weight", "Apple pose + Depth Pro cues", "2D body mask/mesh", "camera-normalized front", "A–B + ratios", "fresh model → C–D + shape + tape"].map((step, index, all) => (
              <div key={step} className="contents">
                <span className="rounded-lg border border-white/10 bg-slate-950/65 px-3 py-2">{step}</span>
                {index < all.length - 1 ? <ArrowRight className="h-4 w-4 text-cyan-300" /> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">The user never supplies a side photo or full 3D scan. Those stay available only as training labels from WEAR.</p>
        </div>
      </div>
    </section>
  );
}

function RatioPanel({ person }: { person: TeacherProofPerson }) {
  const numericRatios = person.ratios.filter((item) => item.basis === "tape-number");
  const frontRatios = person.ratios.filter((item) => item.basis === "front-width");
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/65 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Your ratio idea</p>
          <h2 className="mt-1 text-xl font-black text-white">Numeric tape ratios + front A–B ratios</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">Chest and under-bust use their independent recorded WEAR numbers. Their ratio remains valid even when the visual 3D ring is partial or rejected. Front A–B ratios stay separate for camera and edge learning.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-2 text-xs font-black text-violet-200">
          <Ratio className="h-4 w-4" />
          {person.eligibleRatios}/{person.applicableRatios} ratio losses active
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {person.ratios.map((item) => (
          <article key={item.id} className={`rounded-xl border p-3 ${item.state === "eligible" ? "border-violet-400/20 bg-violet-400/5" : item.state === "masked" ? "border-amber-400/20 bg-amber-400/5" : "border-slate-500/20 bg-slate-500/5"}`}>
            <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${item.basis === "tape-number" ? "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-200" : "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"}`}>{item.basis === "tape-number" ? "numeric tape" : "front A–B"}</span>
            <span className={`mt-2 block text-[11px] font-bold ${item.state === "eligible" ? "text-violet-200" : item.state === "masked" ? "text-amber-200" : "text-slate-400"}`}>{item.label}</span>
            <strong className="mt-1 block text-xl text-white">{item.value === null ? (item.state === "masked" ? "MASKED" : "N/A") : item.value.toFixed(3)}</strong>
            <span className="mt-1 block text-[10px] leading-4 text-slate-500">
              {item.numeratorCm !== null && item.denominatorCm !== null
                ? `${item.numeratorCm.toFixed(1)} ÷ ${item.denominatorCm.toFixed(1)} cm`
                : item.reason}
            </span>
          </article>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-4 text-sm text-slate-300">
          <strong className="text-fuchsia-200">Numeric teacher · {numericRatios.filter((item) => item.state === "eligible").length}/{numericRatios.filter((item) => item.state !== "not-applicable").length} active</strong>
          <p className="mt-1">The loss compares ratios of the model’s predicted circumferences with ratios of recorded WEAR tape numbers. It does not need a closed visual chest or under-bust shape.</p>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300">
          <strong className="text-cyan-200">Front teacher · {frontRatios.filter((item) => item.state === "eligible").length}/{frontRatios.filter((item) => item.state !== "not-applicable").length} active</strong>
          <p className="mt-1">Shoulder, waist, hips and neck A–B ratios supervise the camera-normalized 2D body and edge positions.</p>
        </div>
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-slate-300 md:col-span-2">
          <strong className="text-rose-200">No target leakage</strong>
          <p className="mt-1">For photo-only users, true tape numbers remain teacher labels and the model predicts them. They become optional runtime inputs only when the user explicitly enters the same measurements.</p>
        </div>
      </div>
    </section>
  );
}

function CertificationMatrix({ people, onSelect }: { people: TeacherProofPerson[]; onSelect: (scanId: string) => void }) {
  const rows = people.flatMap((person) => person.rows);
  const coverage = {
    certified: rows.filter((row) => row.state === "certified").length,
    partial: rows.filter((row) => row.state === "partial-geometry").length,
    rejected: rows.filter((row) => row.state === "rejected-geometry").length,
    measurementOnly: rows.filter((row) => row.state === "measurement-only").length,
    notApplicable: rows.filter((row) => row.state === "not-applicable").length,
    eligibleRatios: people.reduce((sum, person) => sum + person.eligibleRatios, 0),
    applicableRatios: people.reduce((sum, person) => sum + person.applicableRatios, 0),
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Fail-closed overview</p>
        <h2 className="mt-1 text-xl font-black text-white">All ten people × all five body rows</h2>
        <p className="mt-1 text-sm text-slate-400">A rejected row stays visible for diagnosis but is never silently used for training.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Certified labels", coverage.certified, "text-emerald-200"],
            ["Partial geometry", coverage.partial, "text-amber-200"],
            ["Rejected geometry", coverage.rejected, "text-rose-200"],
            ["Tape only", coverage.measurementOnly, "text-orange-200"],
            ["Not applicable", coverage.notApplicable, "text-slate-300"],
            ["Active ratio losses", `${coverage.eligibleRatios}/${coverage.applicableRatios}`, "text-violet-200"],
          ].map(([label, value, colour]) => (
            <div key={label} className="rounded-xl border border-white/5 bg-slate-950/55 px-3 py-2">
              <strong className={`block text-xl ${colour}`}>{value}</strong>
              <span className="text-[11px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-xs">
          <thead className="bg-slate-950/70 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-bold">Person</th>
              {TEACHER_ROW_IDS.map((id) => <th key={id} className="px-3 py-3 font-bold">{id === "underbust" ? "Under-bust" : id.charAt(0).toUpperCase() + id.slice(1)}</th>)}
              <th className="px-4 py-3 font-bold">Decision</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.scanId} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onSelect(person.scanId)} className="font-black text-cyan-200 hover:text-cyan-100">{person.scanId}</button>
                  <span className="ml-2 text-slate-500">BMI {person.bmi.toFixed(1)}</span>
                </td>
                {person.rows.map((row) => (
                  <td key={row.id} className="px-3 py-3">
                    <span title={row.rejectionReasons.join(" · ") || rowStateLabel(row)} className={`inline-flex min-w-32 items-center gap-2 rounded-lg border px-2 py-1.5 ${rowStateClasses(row)}`}>
                      <RowStateIcon row={row} />
                      {row.state === "certified" || row.state === "partial-geometry" || (row.state === "rejected-geometry" && row.available)
                        ? `${format(row.widthCm)} × ${format(row.depthCm)}`
                        : row.state === "measurement-only"
                          ? `${format(row.tapeCm)} cm tape only`
                          : row.state === "not-applicable"
                            ? "N/A"
                            : "Rejected geometry"}
                    </span>
                  </td>
                ))}
                <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 font-black ${statusClasses(person)}`}>{statusCopy(person)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TeacherProofLab({
  people,
  selection,
}: {
  people: TeacherProofPerson[];
  selection: TeacherProofSelection;
}) {
  const [selectedScan, setSelectedScan] = useState(people[0]?.scanId ?? "");
  const [selectedRow, setSelectedRow] = useState<TeacherRowId>("waist");
  const [showAllRows, setShowAllRows] = useState(true);
  const [renderStates, setRenderStates] = useState<Record<string, RenderState>>({});
  const requested = useRef(new Set<string>());
  const person = people.find((candidate) => candidate.scanId === selectedScan) ?? people[0];

  const loadBlender = useCallback(async (scanId: string, force = false) => {
    if (!scanId || (requested.current.has(scanId) && !force)) return;
    requested.current.add(scanId);
    setRenderStates((current) => ({ ...current, [scanId]: { status: "rendering" } }));
    try {
      const response = await fetch("/api/try-on-test/wear-teacher-proof/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
      const payload = await response.json() as TeacherBlenderResponse;
      if (!response.ok || !payload.ok || !payload.artifacts || !payload.metadata) {
        throw new Error(payload.error || `Blender could not render ${scanId}.`);
      }
      setRenderStates((current) => ({ ...current, [scanId]: { status: "ready", payload } }));
    } catch (error) {
      requested.current.delete(scanId);
      setRenderStates((current) => ({
        ...current,
        [scanId]: {
          status: "error",
          error: error instanceof Error ? error.message : "Blender could not render this scan.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (person?.scanId) void loadBlender(person.scanId);
  }, [loadBlender, person?.scanId]);

  if (!person) {
    return <main className="mx-auto max-w-4xl p-10 text-center text-white">The ten-person teacher manifest is unavailable.</main>;
  }

  const row = person.rows.find((candidate) => candidate.id === selectedRow) ?? person.rows[0]!;
  const renderState = renderStates[person.scanId];
  const blender = renderState?.status === "ready" ? renderState.payload : null;

  function selectPerson(scanId: string) {
    setSelectedScan(scanId);
    requestAnimationFrame(() => document.getElementById("teacher-blender-stage")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <main className="mx-auto w-full max-w-[1720px] space-y-6 px-4 pb-16 pt-6 text-slate-100 sm:px-6">
      <header className="overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.24),transparent_42%),linear-gradient(145deg,#0f172a,#020617)] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Private Test Lab</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">Fresh model · V9 = 0</span>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">No GPU · no training</span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">WEAR 3D Teacher Certification</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">A fresh random WEAR proof from source scan to exact rows, A–B width, C–D depth, 3D shape, independent tape, ratios, camera normalization and the final front-only student contract.</p>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"><strong className="block text-2xl text-white">{people.length}</strong><span className="text-[11px] text-slate-400">Random scans</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"><strong className="block text-2xl text-white">5</strong><span className="text-[11px] text-slate-400">Body rows</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"><strong className="block text-2xl text-white">360°</strong><span className="text-[11px] text-slate-400">Contours</span></div>
          </div>
        </div>
        <div className="mt-6 flex gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p><strong>Honest status:</strong> every label has its own loss mask. Certified geometry trains normally; unsafe shape is masked; recorded WEAR tape remains a separate direct target; non-applicable rows contribute no loss.</p>
        </div>
      </header>

      <SelectionProof selection={selection} />
      <SubjectRail people={people} selection={selection} selected={person.scanId} onSelect={selectPerson} />
      <Pipeline person={person} />

      <section id="teacher-blender-stage" className="scroll-mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(430px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Rotate3d className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-black text-white">Blender environment · {person.scanId}</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClasses(person)}`}>{statusCopy(person)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Full raw PLY surface · exact teacher coordinate transform · no browser decimation or reconstructed origin-centred rings</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setShowAllRows((value) => !value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${showAllRows ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"}`}>{showAllRows ? "All rows visible" : "Selected row only"}</button>
              {blender?.artifacts?.blendUrl ? <a href={blender.artifacts.blendUrl} className="inline-flex items-center gap-2 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-xs font-bold text-violet-100"><Download className="h-4 w-4" />Download .blend</a> : null}
            </div>
          </div>

          {renderState?.status === "rendering" || !renderState ? (
            <div className="grid h-[630px] place-items-center bg-slate-950">
              <div className="max-w-sm text-center">
                <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-cyan-300" />
                <strong className="mt-4 block text-white">Blender is preparing {person.scanId}</strong>
                <p className="mt-2 text-sm leading-6 text-slate-400">The first load imports the exact PLY/LND pair, orients it, scales it to measured height and exports the private interactive GLB.</p>
              </div>
            </div>
          ) : null}
          {renderState?.status === "error" ? (
            <div className="grid h-[630px] place-items-center bg-rose-950/20 p-8 text-center">
              <div>
                <XCircle className="mx-auto h-10 w-10 text-rose-300" />
                <strong className="mt-3 block text-rose-100">3D render failed</strong>
                <p className="mt-2 max-w-lg text-sm text-rose-200/80">{renderState.error}</p>
                <button type="button" onClick={() => { requested.current.delete(person.scanId); void loadBlender(person.scanId, true); }} className="mt-4 rounded-lg bg-rose-200 px-4 py-2 text-sm font-bold text-rose-950">Retry Blender</button>
              </div>
            </div>
          ) : null}
          {blender ? <BlenderViewer person={person} response={blender} selectedRow={selectedRow} showAllRows={showAllRows} /> : null}

          {blender?.metadata ? (
            <div className="grid gap-2 border-t border-white/10 p-4 text-xs sm:grid-cols-4">
              <span className="rounded-lg bg-white/5 px-3 py-2 text-slate-400"><strong className="block text-white">Blender</strong>{blender.metadata.generator.version}</span>
              <span className="rounded-lg bg-white/5 px-3 py-2 text-slate-400"><strong className="block text-white">Raw faces</strong>{blender.metadata.geometry.originalFaces.toLocaleString()}</span>
              <span className="rounded-lg bg-white/5 px-3 py-2 text-slate-400"><strong className="block text-white">Browser faces</strong>{blender.metadata.geometry.browserFaces.toLocaleString()}</span>
              <span className="rounded-lg bg-white/5 px-3 py-2 text-slate-400"><strong className="block text-white">Scale</strong>{blender.metadata.geometry.uniformScaleToRecordedStature.toPrecision(5)}</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Teacher body rows">
              {person.rows.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  role="tab"
                  aria-selected={candidate.id === selectedRow}
                  onClick={() => setSelectedRow(candidate.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition ${candidate.id === selectedRow ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-slate-950/60 text-slate-400 hover:text-white"}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: rowStateColour(candidate) }} />
                  {candidate.label}
                  <RowStateIcon row={candidate} />
                </button>
              ))}
            </div>
          </div>
          <FrontEvidence person={person} selectedRow={selectedRow} />
          <CrossSection row={row} />
        </div>
      </section>

      {blender ? <CameraCorrectionPanel person={person} response={blender} /> : null}
      <RowInspector row={row} />
      <RatioPanel person={person} />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <Database className="h-6 w-6 text-cyan-300" />
          <h3 className="mt-3 text-lg font-black text-white">Exact source provenance</h3>
          <dl className="mt-3 space-y-2 text-xs text-slate-400">
            <div><dt className="font-bold text-slate-200">PLY surface</dt><dd className="break-all">{person.source.mesh}</dd></div>
            <div><dt className="font-bold text-slate-200">LND landmarks</dt><dd className="break-all">{person.source.landmarks}</dd></div>
            <div><dt className="font-bold text-slate-200">Profile</dt><dd>Height {person.source.height} · weight {person.source.weight}</dd></div>
          </dl>
        </article>
        <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
          <BadgeCheck className="h-6 w-6 text-emerald-300" />
          <h3 className="mt-3 text-lg font-black text-white">Teacher decision</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{statusCopy(person)}. Waist and hip labels unlock only when their exact plane, width, depth and shape gates pass together.</p>
        </article>
        <article className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <LockKeyhole className="h-6 w-6 text-amber-300" />
          <h3 className="mt-3 text-lg font-black text-white">Paid training remains locked</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">This proof creates no GPU and fits no model. The H200 run happens only after the teacher rows are accepted.</p>
        </article>
      </section>

      <CertificationMatrix people={people} onSelect={selectPerson} />
    </main>
  );
}
