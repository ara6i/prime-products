"use client";

import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Color, Mesh, type Material } from "three";

interface RenderResponse {
  ok?: boolean;
  cached?: boolean;
  error?: string;
  metadata?: {
    scanId: string;
    source: string;
    truthBoundary: string;
    generator: { application: string; version: string; headless: boolean; pythonApi: boolean };
    geometry: { originalFaces: number; browserFaces: number; browserVertices: number };
  };
  artifacts?: {
    glbUrl: string;
    pngUrl: string;
    blendUrl: string;
    front2dUrl: string;
    side2dUrl: string;
    cameraCards?: Record<string, string>;
  };
}

interface ViewerModel {
  role: string;
  scanId: string;
  heightCm: number;
  url: string;
  front2dUrl: string;
  side2dUrl: string;
  colour: string;
}

export interface WearPhotoMeshReference {
  label: string;
  heightCm: number;
  frontOutline: number[][] | null;
  sideOutline: number[][] | null;
}

type ComparisonView = "front" | "side";
type ComparisonLayout = "overlay" | "side-by-side";

interface Blender2DMesh {
  schemaVersion: string;
  units: "centimetres";
  source: string;
  generator: { application: "Blender"; version: string; headless: boolean; pythonApi: boolean };
  verticesCm: number[][];
  triangles: number[][];
  outlineCm: number[][];
  outlineSegmentsCm?: number[][][];
  stats: {
    vertexCount: number;
    triangleCount: number;
    outlinePointCount: number;
    silhouetteSegmentCount?: number;
    sourcePlyFaceCount?: number;
    displayedSourceFaceCount?: number;
  };
}

function WearGlbModel({ model, position }: { model: ViewerModel; position: readonly [number, number, number] }) {
  const { url, colour } = model;
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const tint = (material: Material) => {
        const copy = material.clone() as Material & { color?: Color; emissive?: Color; emissiveIntensity?: number };
        copy.color?.set(colour);
        copy.emissive?.set(colour);
        if (copy.emissiveIntensity != null) copy.emissiveIntensity = 0.06;
        return copy;
      };
      child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material);
    });
    return clone;
  }, [colour, gltf.scene]);
  const heightM = Math.max(1.4, model.heightCm / 100);
  return <group position={position}>
    <primitive object={scene} />
    <Html position={[0, heightM + 0.09, 0]} center distanceFactor={5.5} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
      <div className="rounded-md border border-white/20 bg-slate-950/95 px-2 py-1 text-center text-xs font-black shadow-lg" style={{ color: colour }}><span className="block uppercase tracking-wide">{model.role}</span><span className="block text-white">{model.scanId}</span></div>
    </Html>
  </group>;
}

function Blender2DMeshCanvas({
  input,
  selected,
  layout,
  view,
}: {
  input: Blender2DMesh;
  selected: Blender2DMesh;
  layout: ComparisonLayout;
  view: ComparisonView;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rectangle = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rectangle.width * ratio));
      canvas.height = Math.max(1, Math.round(rectangle.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#020617";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const meshes = [
        { mesh: input, colour: "#22d3ee", index: 0 },
        { mesh: selected, colour: "#fb923c", index: 1 },
      ];
      const allPoints = meshes.flatMap(({ mesh }) => mesh.verticesCm);
      const minimumY = Math.min(...allPoints.map((point) => point[1] ?? 0));
      const maximumY = Math.max(...allPoints.map((point) => point[1] ?? 0));
      const heightCm = Math.max(1, maximumY - minimumY);
      const meshBounds = meshes.map(({ mesh }) => {
        const ownMinimumY = Math.min(...mesh.verticesCm.map((point) => point[1] ?? 0));
        const ownMaximumY = Math.max(...mesh.verticesCm.map((point) => point[1] ?? 0));
        const ownHeight = Math.max(1, ownMaximumY - ownMinimumY);
        const lowerBody = mesh.verticesCm.filter((point) => {
          const y = point[1] ?? 0;
          return y >= ownMinimumY + ownHeight * 0.12 && y <= ownMinimumY + ownHeight * 0.42;
        });
        const centrePoints = lowerBody.length ? lowerBody : mesh.verticesCm;
        const xs = centrePoints.map((point) => point[0] ?? 0).sort((a, b) => a - b);
        const centreX = xs.length % 2
          ? xs[Math.floor(xs.length / 2)]!
          : ((xs[xs.length / 2 - 1] ?? 0) + (xs[xs.length / 2] ?? 0)) / 2;
        return { centreX };
      });
      const panelWidth = layout === "side-by-side" ? canvas.width / 2 : canvas.width;
      const padding = 24 * ratio;
      // One scale is applied to both axes. Height, not outstretched arms, controls
      // the fit so bodies keep their real centimetre aspect and never look short.
      const scale = (canvas.height - padding * 2) / heightCm;
      const mapPoint = (point: number[], index: number) => {
        const centreX = meshBounds[index]?.centreX ?? 0;
        const panelLeft = layout === "side-by-side" ? index * panelWidth : 0;
        return [
          panelLeft + panelWidth / 2 + ((point[0] ?? 0) - centreX) * scale,
          canvas.height - padding - ((point[1] ?? 0) - minimumY) * scale,
        ] as const;
      };
      for (const { mesh, colour, index } of meshes) {
        context.beginPath();
        for (const triangle of mesh.triangles) {
          const a = mapPoint(mesh.verticesCm[triangle[0]!]!, index);
          const b = mapPoint(mesh.verticesCm[triangle[1]!]!, index);
          const c = mapPoint(mesh.verticesCm[triangle[2]!]!, index);
          context.moveTo(a[0], a[1]);
          context.lineTo(b[0], b[1]);
          context.lineTo(c[0], c[1]);
          context.closePath();
        }
        context.globalAlpha = layout === "overlay" ? 0.22 : 0.42;
        context.fillStyle = colour;
        context.fill();
        context.globalAlpha = 1;
        const segments = mesh.outlineSegmentsCm ?? [];
        const outline = mesh.outlineCm;
        if (segments.length) {
          context.beginPath();
          for (const segment of segments) {
            if (segment.length < 2) continue;
            const start = mapPoint(segment[0]!, index);
            const end = mapPoint(segment[1]!, index);
            context.moveTo(start[0], start[1]);
            context.lineTo(end[0], end[1]);
          }
          context.strokeStyle = colour;
          context.lineWidth = 2.15 * ratio;
          context.shadowColor = colour;
          context.shadowBlur = 6 * ratio;
          context.stroke();
          context.shadowBlur = 0;
        } else if (outline.length > 1) {
          context.beginPath();
          const first = mapPoint(outline[0]!, index);
          context.moveTo(first[0], first[1]);
          for (const point of outline.slice(1)) {
            const shown = mapPoint(point, index);
            context.lineTo(shown[0], shown[1]);
          }
          context.closePath();
          context.strokeStyle = colour;
          context.lineWidth = 2.4 * ratio;
          context.shadowColor = colour;
          context.shadowBlur = 7 * ratio;
          context.stroke();
          context.shadowBlur = 0;
        }
      }
      if (layout === "side-by-side") {
        context.beginPath();
        context.moveTo(panelWidth, 0);
        context.lineTo(panelWidth, canvas.height);
        context.strokeStyle = "#334155";
        context.lineWidth = ratio;
        context.stroke();
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [input, layout, selected]);
  return <canvas ref={canvasRef} className="h-full w-full" aria-label={`${view} real Blender 2D mesh ${layout}`} />;
}

function MeshProofCard({
  input,
  selected,
  inputLabel,
  selectedLabel,
  view,
  unavailableReason,
}: {
  input: Blender2DMesh | null;
  selected: Blender2DMesh | null;
  inputLabel: string;
  selectedLabel: string;
  view: ComparisonView;
  unavailableReason?: string | null;
}) {
  const [layout, setLayout] = useState<ComparisonLayout>("side-by-side");
  return (
    <article className="overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <strong className="block text-base text-white">
            {input?.schemaVersion.includes("photo")
              ? `${view === "front" ? "Front" : "Side"} comparison`
              : `${view === "front" ? "Front" : "Side"} mesh`}
          </strong>
          <span className="text-xs text-slate-400">Height-locked centimetre scale · no X/Y stretching</span>
        </div>
        <div className="flex gap-2 text-sm font-black" aria-label={`${view} comparison layout`}>
          <button type="button" onClick={() => setLayout("side-by-side")} className={`rounded-lg px-3 py-2 ${layout === "side-by-side" ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-white"}`}>Side by side</button>
          <button type="button" onClick={() => setLayout("overlay")} className={`rounded-lg px-3 py-2 ${layout === "overlay" ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-white"}`}>Overlay</button>
        </div>
      </header>
      {input && selected ? (
        <>
          <div className="relative h-[440px] xl:h-[500px]">
            <Blender2DMeshCanvas input={input} selected={selected} view={view} layout={layout} />
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs font-black shadow-lg">
              <span className="text-cyan-300">Cyan · {inputLabel}</span>
              <span className="mx-2 text-slate-500">/</span>
              <span className="text-orange-300">Orange · {selectedLabel}</span>
            </div>
          </div>
          <p className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-400">
            {input.schemaVersion.includes("photo")
              ? "Cyan is the measured photo boundary only—no fake body faces. Orange draws only existing source PLY faces and true silhouette edges; no RGB render or invented fill triangles."
              : "Both colours draw existing source PLY faces and true silhouette edges. No RGB render or invented fill triangles."}
          </p>
        </>
      ) : unavailableReason ? (
        <div className="grid h-[440px] place-items-center p-8 text-center text-sm leading-6 text-amber-100 xl:h-[500px]">
          {unavailableReason}
        </div>
      ) : (
        <div className="grid h-[440px] place-items-center p-8 text-center text-sm leading-6 text-amber-100 xl:h-[500px]">
          Building the two real Blender 2D {view} meshes…
        </div>
      )}
    </article>
  );
}

function FrontSideMeshProof({
  models,
  photoReference,
}: {
  models: ViewerModel[];
  photoReference: WearPhotoMeshReference | null;
}) {
  const [wearMeshes, setWearMeshes] = useState<Record<string, { front: Blender2DMesh; side: Blender2DMesh }>>({});
  const [photoMeshes, setPhotoMeshes] = useState<{ front: Blender2DMesh | null; side: Blender2DMesh | null }>({ front: null, side: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(models.map(async (model) => {
      const [frontResponse, sideResponse] = await Promise.all([fetch(model.front2dUrl), fetch(model.side2dUrl)]);
      const [front, side] = await Promise.all([frontResponse.json(), sideResponse.json()]) as [Blender2DMesh & { error?: string }, Blender2DMesh & { error?: string }];
      if (!frontResponse.ok || front.error || !sideResponse.ok || side.error) throw new Error(front.error || side.error || `Blender 2D projections are unavailable for ${model.scanId}.`);
      return [model.scanId, { front, side }] as const;
    })).then((entries) => {
      if (!cancelled) setWearMeshes(Object.fromEntries(entries));
    }).catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "The WEAR Blender 2D meshes are unavailable.");
    });
    return () => { cancelled = true; };
  }, [models]);

  useEffect(() => {
    if (!photoReference) return;
    let cancelled = false;
    const build = async (outline: number[][] | null) => {
      if (!outline) return null;
      const response = await fetch("/api/try-on-test/wear-side-selector/photo-2d-mesh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heightCm: photoReference.heightCm, outline }),
      });
      const payload = await response.json() as { ok?: boolean; mesh?: Blender2DMesh; error?: string };
      if (!response.ok || !payload.ok || !payload.mesh) throw new Error(payload.error || "Blender could not build the saved-photo 2D mesh.");
      return payload.mesh;
    };
    Promise.all([build(photoReference.frontOutline), build(photoReference.sideOutline)])
      .then(([front, side]) => {
        if (!cancelled) setPhotoMeshes({ front, side });
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "The saved-photo Blender 2D meshes are unavailable.");
      });
    return () => { cancelled = true; };
  }, [photoReference]);

  const selectedModel = photoReference ? models[0] : models[1];
  const selectedMeshes = selectedModel ? wearMeshes[selectedModel.scanId] : null;
  const inputModel = photoReference ? null : models[0];
  const inputMeshes = photoReference ? photoMeshes : inputModel ? wearMeshes[inputModel.scanId] : null;
  const inputLabel = photoReference?.label ?? inputModel?.role ?? "Input";
  const selectedLabel = selectedModel?.role ?? "Selected WEAR";
  return (
    <section className="space-y-3 rounded-xl border border-orange-400/30 bg-orange-950/10 p-4" aria-label="Front and side mesh proof">
      <div>
        <h4 className="text-lg font-bold text-white">{photoReference ? "Real WEAR mesh + photo boundary · front + side" : "All mesh results · front + side · one page"}</h4>
        <p className="mt-1 text-sm text-slate-300">Front and side stay together here. WEAR uses existing PLY surface faces; saved photos remain honest measured boundaries unless a real reconstructed body mesh exists.</p>
        {photoReference ? <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">Cyan includes the complete person silhouette, including arms and hands. It is not a body mesh. A true cyan mesh requires a reconstruction engine or an imported GLB/PLY body.</p> : null}
      </div>
      {error ? <p className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <MeshProofCard
          input={inputMeshes?.front ?? null}
          selected={selectedMeshes?.front ?? null}
          inputLabel={inputLabel}
          selectedLabel={selectedLabel}
          view="front"
          unavailableReason={photoReference && !photoReference.frontOutline ? "This input has no usable front-photo outline for a Blender 2D comparison." : null}
        />
        <MeshProofCard
          input={inputMeshes?.side ?? null}
          selected={selectedMeshes?.side ?? null}
          inputLabel={inputLabel}
          selectedLabel={selectedLabel}
          view="side"
          unavailableReason={photoReference && !photoReference.sideOutline ? "This saved model has no usable side-photo outline, so a real side comparison cannot be shown." : null}
        />
      </div>
    </section>
  );
}

function InteractiveWearViewer({ models, preferredView }: { models: ViewerModel[]; preferredView: "front" | "side" }) {
  const heightM = Math.max(...models.map((model) => Math.max(1.4, model.heightCm / 100)));
  const separation = models.length === 2 ? heightM * 0.72 : 0;
  const target = useMemo<[number, number, number]>(() => [0, heightM * 0.5, 0], [heightM]);
  return (
    <div className="overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-950" data-model-count={models.length}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <strong className="block text-sm text-white">Shared Blender-style 3D comparison</strong>
          <span className="text-xs text-slate-400">{models.length === 2 ? "Both real PLY-derived meshes share one camera" : "The selected real PLY body uses the same canonical frame"} · drag to rotate · scroll to zoom</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">{models.map((model) => <span key={model.scanId} className="rounded-full border border-white/20 bg-slate-900 px-2 py-1" style={{ color: model.colour }}>{model.role} · {model.scanId}</span>)}</div>
      </div>
      <div className="h-[620px] w-full">
        <Canvas
          aria-label={`Interactive 3D WEAR comparison: ${models.map((model) => `${model.role} ${model.scanId}`).join(" and ")}`}
          camera={{
            position: preferredView === "side"
              ? [heightM * (models.length === 2 ? 3.55 : 2.15), heightM * 0.62, heightM * 0.18]
              : [heightM * 0.18, heightM * 0.62, heightM * (models.length === 2 ? 3.55 : 2.15)],
            fov: 34,
            near: 0.01,
            far: 30,
          }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={["#020617"]} />
          <ambientLight intensity={1.25} />
          <directionalLight position={[2.5, 3.8, 3.2]} intensity={2.4} color="#dff7ff" />
          <directionalLight position={[-2.2, 2.2, -2.8]} intensity={1.4} color="#67e8f9" />
          <Suspense fallback={null}>
            {models.map((model, index) => {
              const offset = models.length === 2 ? (index === 0 ? -separation / 2 : separation / 2) : 0;
              return <WearGlbModel
                key={`${model.scanId}-${model.url}`}
                model={model}
                position={preferredView === "side" ? [0, 0, offset] : [offset, 0, 0]}
              />;
            })}
          </Suspense>
          <gridHelper args={[models.length === 2 ? 4.5 : 3, models.length === 2 ? 22 : 15, "#334155", "#172033"]} position={[0, -0.01, 0]} />
          <OrbitControls target={target} enableDamping enablePan={false} minDistance={heightM * 0.75} maxDistance={heightM * 4.5} />
        </Canvas>
      </div>
    </div>
  );
}

interface WearBlender3DSectionProps {
  scanId: string;
  heightCm: number | null;
  matchedScanId?: string | null;
  matchedHeightCm?: number | null;
  inputRoleLabel?: string;
  matchedRoleLabel?: string;
  preferredView?: "front" | "side";
  title?: string;
  description?: string;
  inputColour?: string;
  photoReference?: WearPhotoMeshReference | null;
  autoRender?: boolean;
}

export function WearBlender3DSection({
  scanId,
  heightCm,
  matchedScanId,
  matchedHeightCm,
  inputRoleLabel = "Input",
  matchedRoleLabel = "Matched",
  preferredView = "front",
  title = "Blender + two-model interactive 3D",
  description = "Build the exact input and matched WEAR PLY scans with Blender, then inspect both meshes side by side in one shared 3D scene and camera. Sources are downloaded from the verified private S3 archive only when not cached.",
  inputColour = "#22d3ee",
  photoReference = null,
  autoRender = false,
}: WearBlender3DSectionProps) {
  const [status, setStatus] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [results, setResults] = useState<Record<string, RenderResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [attemptSignature, setAttemptSignature] = useState("");
  const selections = useMemo(() => [
    { role: inputRoleLabel, scanId, heightCm: heightCm ?? 170, colour: inputColour },
    ...(matchedScanId ? [{ role: matchedRoleLabel, scanId: matchedScanId, heightCm: matchedHeightCm ?? heightCm ?? 170, colour: "#fb923c" }] : []),
  ].filter((item) => Boolean(item.scanId)), [heightCm, inputColour, inputRoleLabel, matchedHeightCm, matchedRoleLabel, matchedScanId, scanId]);
  const selectionSignature = selections.map((selection) => selection.scanId).join("|");

  const renderWithBlender = useCallback(async () => {
    if (!scanId) return;
    setAttemptSignature(selectionSignature);
    setStatus("rendering");
    setError(null);
    try {
      const rendered = await Promise.all(selections.map(async (selection) => {
        const response = await fetch("/api/try-on-test/sizing-lab/sdk-wear/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId: selection.scanId }),
        });
        const payload = await response.json() as RenderResponse;
        if (!response.ok || !payload.ok || !payload.artifacts || !payload.metadata) {
          throw new Error(payload.error || `Blender could not render ${selection.scanId}.`);
        }
        return [selection.scanId, payload] as const;
      }));
      setResults(Object.fromEntries(rendered));
      setStatus("ready");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Blender could not render this WEAR scan.");
    }
  }, [scanId, selectionSignature, selections]);

  useEffect(() => {
    if (!autoRender || !scanId || attemptSignature === selectionSignature) return;
    const timer = window.setTimeout(() => void renderWithBlender(), 0);
    return () => window.clearTimeout(timer);
  }, [attemptSignature, autoRender, renderWithBlender, scanId, selectionSignature]);

  const currentAttempt = attemptSignature === selectionSignature;
  const visibleStatus = currentAttempt ? status : "idle";
  const ready = visibleStatus === "ready" && selections.length > 0 && selections.every((selection) => results[selection.scanId]?.artifacts && results[selection.scanId]?.metadata);
  const viewerModels = useMemo(() => ready ? selections.map((selection): ViewerModel => ({
    ...selection,
    url: results[selection.scanId]!.artifacts!.glbUrl,
    front2dUrl: results[selection.scanId]!.artifacts!.front2dUrl,
    side2dUrl: results[selection.scanId]!.artifacts!.side2dUrl,
  })) : [], [ready, results, selections]);
  return (
    <section className="space-y-4 rounded-xl border border-cyan-500/40 bg-cyan-950/15 p-4" aria-label="Blender and interactive 3D WEAR render">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-bold text-cyan-100">{title}</h4>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-200">Private AWS source</span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={renderWithBlender}
          disabled={!scanId || visibleStatus === "rendering"}
          className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visibleStatus === "rendering" ? "Blender is rendering…" : ready ? "Render again" : matchedScanId ? "Render both PLY models" : `Render ${inputRoleLabel} PLY`}
        </button>
      </div>

      {visibleStatus === "idle" ? <div className={`grid gap-2 rounded-lg border border-dashed border-cyan-700/70 bg-slate-950/60 p-4 text-sm ${matchedScanId ? "sm:grid-cols-2" : ""}`}>{selections.map((selection) => <span key={selection.scanId} style={{ color: selection.colour }}><strong className="block uppercase tracking-wide">{selection.role}</strong><span className="text-white">{selection.scanId}</span></span>)}<p className={matchedScanId ? "sm:col-span-2 text-xs text-slate-400" : "text-xs text-slate-400"}>Rendering creates private local artifacts; it does not start an AWS GPU or training job.</p></div> : null}
      {visibleStatus === "rendering" ? <div className="rounded-lg border border-cyan-700 bg-slate-950 p-4 text-sm text-cyan-100"><strong className="block text-base">Building {selections.length === 2 ? "both real PLY-derived 3D artifacts" : "the real 3D artifact"}…</strong><span className="mt-1 block text-slate-400">First render may take about a minute per uncached model while Blender imports, cleans, orients, and exports the AWS PLY.</span></div> : null}
      {visibleStatus === "error" ? <div className="rounded-lg border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">{error}</div> : null}

      {ready ? <>
        <FrontSideMeshProof models={viewerModels} photoReference={photoReference} />
        <InteractiveWearViewer models={viewerModels} preferredView={preferredView} />
        <div className={`grid gap-4 ${selections.length === 2 ? "xl:grid-cols-2" : ""}`}>
          {selections.map((selection) => {
            const result = results[selection.scanId]!;
            return <article key={selection.scanId} className="overflow-hidden rounded-xl border border-violet-400/30 bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <div><strong className="block text-sm" style={{ color: selection.colour }}>{selection.role} · {selection.scanId}</strong><span className="text-xs text-slate-400">Headless Blender · exact AWS WEAR PLY surface</span></div>
                <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-1 text-xs font-bold text-violet-200">PNG + GLB + .blend</span>
              </div>
              <div className="relative aspect-[4/5] min-h-[420px]">
                <Image
                  src={preferredView === "side" && result.artifacts!.cameraCards?.["side-right-90"]
                    ? result.artifacts!.cameraCards["side-right-90"]!
                    : result.artifacts!.pngUrl}
                  alt={`${selection.role} Blender ${preferredView} render of WEAR scan ${selection.scanId}`}
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="(min-width: 1280px) 50vw, 100vw"
                />
              </div>
              <div className="border-t border-slate-800 p-3">
                <strong className="text-white">{result.metadata!.generator.application} {result.metadata!.generator.version}</strong>
                <p className="mt-1 text-sm text-slate-300">{result.metadata!.geometry.originalFaces.toLocaleString()} original faces → {result.metadata!.geometry.browserFaces.toLocaleString()} browser faces · {result.cached ? "cached" : "new render"}</p>
                <p className="mt-1 text-xs text-slate-500">{result.metadata!.truthBoundary}</p>
                <div className="mt-3 flex flex-wrap gap-2"><a href={result.artifacts!.glbUrl} download className="rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-400/20">{selection.scanId} GLB</a><a href={result.artifacts!.blendUrl} download className="rounded-lg border border-violet-400/50 bg-violet-400/10 px-3 py-2 text-sm font-bold text-violet-100 hover:bg-violet-400/20">{selection.scanId} .blend</a></div>
              </div>
            </article>;
          })}
        </div>
      </> : null}
    </section>
  );
}
