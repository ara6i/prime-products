"use client";

import Image from "next/image";
import { Suspense, useMemo, useState } from "react";
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
  artifacts?: { glbUrl: string; pngUrl: string; blendUrl: string };
}

interface ViewerModel {
  role: "Input" | "Matched";
  scanId: string;
  heightCm: number;
  url: string;
  colour: string;
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

function InteractiveWearViewer({ models }: { models: ViewerModel[] }) {
  const heightM = Math.max(...models.map((model) => Math.max(1.4, model.heightCm / 100)));
  const separation = models.length === 2 ? heightM * 0.72 : 0;
  const target = useMemo<[number, number, number]>(() => [0, heightM * 0.5, 0], [heightM]);
  return (
    <div className="overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-950" data-model-count={models.length}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <strong className="block text-sm text-white">Shared Blender-style 3D comparison</strong>
          <span className="text-xs text-slate-400">Both real PLY-derived meshes share one camera · drag to rotate · scroll to zoom</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">{models.map((model) => <span key={model.scanId} className="rounded-full border border-white/20 bg-slate-900 px-2 py-1" style={{ color: model.colour }}>{model.role} · {model.scanId}</span>)}</div>
      </div>
      <div className="h-[620px] w-full">
        <Canvas
          aria-label={`Interactive 3D WEAR comparison: ${models.map((model) => `${model.role} ${model.scanId}`).join(" and ")}`}
          camera={{ position: [heightM * 0.18, heightM * 0.62, heightM * (models.length === 2 ? 3.55 : 2.15)], fov: 34, near: 0.01, far: 30 }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={["#020617"]} />
          <ambientLight intensity={1.25} />
          <directionalLight position={[2.5, 3.8, 3.2]} intensity={2.4} color="#dff7ff" />
          <directionalLight position={[-2.2, 2.2, -2.8]} intensity={1.4} color="#67e8f9" />
          <Suspense fallback={null}>
            {models.map((model, index) => <WearGlbModel key={`${model.scanId}-${model.url}`} model={model} position={[models.length === 2 ? (index === 0 ? -separation / 2 : separation / 2) : 0, 0, 0]} />)}
          </Suspense>
          <gridHelper args={[models.length === 2 ? 4.5 : 3, models.length === 2 ? 22 : 15, "#334155", "#172033"]} position={[0, -0.01, 0]} />
          <OrbitControls target={target} enableDamping enablePan={false} minDistance={heightM * 0.75} maxDistance={heightM * 4.5} />
        </Canvas>
      </div>
    </div>
  );
}

export function WearBlender3DSection({ scanId, heightCm, matchedScanId, matchedHeightCm }: { scanId: string; heightCm: number | null; matchedScanId?: string | null; matchedHeightCm?: number | null }) {
  const [status, setStatus] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [results, setResults] = useState<Record<string, RenderResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [attemptSignature, setAttemptSignature] = useState("");
  const selections = useMemo(() => [
    { role: "Input" as const, scanId, heightCm: heightCm ?? 170, colour: "#22d3ee" },
    ...(matchedScanId ? [{ role: "Matched" as const, scanId: matchedScanId, heightCm: matchedHeightCm ?? heightCm ?? 170, colour: "#fb923c" }] : []),
  ].filter((item) => Boolean(item.scanId)), [heightCm, matchedHeightCm, matchedScanId, scanId]);
  const selectionSignature = selections.map((selection) => selection.scanId).join("|");

  async function renderWithBlender() {
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
  }

  const currentAttempt = attemptSignature === selectionSignature;
  const visibleStatus = currentAttempt ? status : "idle";
  const ready = visibleStatus === "ready" && selections.length > 0 && selections.every((selection) => results[selection.scanId]?.artifacts && results[selection.scanId]?.metadata);
  const viewerModels = ready ? selections.map((selection): ViewerModel => ({ ...selection, url: results[selection.scanId]!.artifacts!.glbUrl })) : [];
  return (
    <section className="space-y-4 rounded-xl border border-cyan-500/40 bg-cyan-950/15 p-4" aria-label="Blender and interactive 3D WEAR render">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-bold text-cyan-100">Blender + two-model interactive 3D</h4>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-200">Private AWS source</span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Build the exact input and matched WEAR PLY scans with Blender, then inspect both meshes side by side in one shared 3D scene and camera. Sources are downloaded from the verified private S3 archive only when not cached.
          </p>
        </div>
        <button
          type="button"
          onClick={renderWithBlender}
          disabled={!scanId || visibleStatus === "rendering"}
          className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visibleStatus === "rendering" ? "Blender is rendering…" : ready ? "Render both again" : matchedScanId ? "Render both PLY models" : `Render input ${scanId || "model"}`}
        </button>
      </div>

      {visibleStatus === "idle" ? <div className="grid gap-2 rounded-lg border border-dashed border-cyan-700/70 bg-slate-950/60 p-4 text-sm sm:grid-cols-2"><span className="text-cyan-300"><strong className="block uppercase tracking-wide">Input</strong><span className="text-white">{scanId || "none"}</span></span><span className="text-orange-300"><strong className="block uppercase tracking-wide">Matched</strong><span className="text-white">{matchedScanId || "Run the match first"}</span></span><p className="sm:col-span-2 text-xs text-slate-400">Rendering creates private local artifacts; it does not start an AWS GPU or training job.</p></div> : null}
      {visibleStatus === "rendering" ? <div className="rounded-lg border border-cyan-700 bg-slate-950 p-4 text-sm text-cyan-100"><strong className="block text-base">Building {selections.length === 2 ? "both real PLY-derived 3D artifacts" : "the real 3D artifact"}…</strong><span className="mt-1 block text-slate-400">First render may take about a minute per uncached model while Blender imports, cleans, orients, and exports the AWS PLY.</span></div> : null}
      {visibleStatus === "error" ? <div className="rounded-lg border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">{error}</div> : null}

      {ready ? <>
        <InteractiveWearViewer models={viewerModels} />
        <div className={`grid gap-4 ${selections.length === 2 ? "xl:grid-cols-2" : ""}`}>
          {selections.map((selection) => {
            const result = results[selection.scanId]!;
            return <article key={selection.scanId} className="overflow-hidden rounded-xl border border-violet-400/30 bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <div><strong className="block text-sm" style={{ color: selection.colour }}>{selection.role} · {selection.scanId}</strong><span className="text-xs text-slate-400">Headless Blender · exact AWS WEAR PLY surface</span></div>
                <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-1 text-xs font-bold text-violet-200">PNG + GLB + .blend</span>
              </div>
              <div className="relative aspect-[4/5] min-h-[420px]">
                <Image src={result.artifacts!.pngUrl} alt={`${selection.role} Blender render of WEAR scan ${selection.scanId}`} fill unoptimized className="object-contain" sizes="(min-width: 1280px) 50vw, 100vw" />
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
