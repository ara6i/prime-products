"use client";

import { useEffect, useRef, useState } from "react";

export interface Blender2DMesh {
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
    sourcePlyFaceCount?: number;
    displayedSourceFaceCount?: number;
  };
}

type MeshView = "front" | "side";
type Job = { run: () => Promise<void> };
const jobs: Job[] = [];
let activeJobs = 0;
const MAX_ACTIVE_RENDERS = 2;

function drainJobs() {
  while (activeJobs < MAX_ACTIVE_RENDERS && jobs.length) {
    const job = jobs.shift()!;
    activeJobs += 1;
    void job.run().finally(() => {
      activeJobs -= 1;
      drainJobs();
    });
  }
}

function queued<T>(task: () => Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    jobs.push({ run: async () => task().then(resolve, reject) });
    drainJobs();
  });
}

async function fetchMesh(runId: string, scanId: string, view: MeshView) {
  const response = await fetch("/api/try-on-test/wear-side-selector/mesh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId, scanId, view }),
  });
  const payload = await response.json() as { ok?: boolean; mesh?: Blender2DMesh; error?: string };
  if (!response.ok || !payload.ok || !payload.mesh) throw new Error(payload.error || `${view} mesh is unavailable.`);
  return payload.mesh;
}

function MeshCanvas({ mesh, colour, label }: { mesh: Blender2DMesh; colour: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !mesh.verticesCm.length) return;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#020617";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const xs = mesh.verticesCm.map((point) => point[0] ?? 0);
      const ys = mesh.verticesCm.map((point) => point[1] ?? 0);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = Math.max(1, maxX - minX);
      const height = Math.max(1, maxY - minY);
      const padding = 12 * ratio;
      // A single scale keeps the source PLY centimetre aspect ratio intact.
      const scale = Math.min((canvas.width - padding * 2) / width, (canvas.height - padding * 2) / height);
      const offsetX = (canvas.width - width * scale) / 2;
      const offsetY = (canvas.height - height * scale) / 2;
      const map = (point: number[]) => [
        offsetX + ((point[0] ?? 0) - minX) * scale,
        canvas.height - offsetY - ((point[1] ?? 0) - minY) * scale,
      ] as const;

      context.fillStyle = colour;
      context.globalAlpha = 0.34;
      for (const triangle of mesh.triangles) {
        const a = mesh.verticesCm[triangle[0] ?? -1];
        const b = mesh.verticesCm[triangle[1] ?? -1];
        const c = mesh.verticesCm[triangle[2] ?? -1];
        if (!a || !b || !c) continue;
        const shownA = map(a);
        const shownB = map(b);
        const shownC = map(c);
        context.beginPath();
        context.moveTo(shownA[0], shownA[1]);
        context.lineTo(shownB[0], shownB[1]);
        context.lineTo(shownC[0], shownC[1]);
        context.closePath();
        context.fill();
      }
      context.globalAlpha = 1;
      const segments = mesh.outlineSegmentsCm ?? [];
      context.beginPath();
      if (segments.length) {
        for (const segment of segments) {
          if (segment.length < 2) continue;
          const start = map(segment[0]!);
          const end = map(segment[1]!);
          context.moveTo(start[0], start[1]);
          context.lineTo(end[0], end[1]);
        }
      } else if (mesh.outlineCm.length > 1) {
        const start = map(mesh.outlineCm[0]!);
        context.moveTo(start[0], start[1]);
        for (const point of mesh.outlineCm.slice(1)) {
          const shown = map(point);
          context.lineTo(shown[0], shown[1]);
        }
        context.closePath();
      }
      context.strokeStyle = colour;
      context.lineWidth = 1.8 * ratio;
      context.shadowColor = colour;
      context.shadowBlur = 5 * ratio;
      context.stroke();
      context.shadowBlur = 0;
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [colour, mesh]);
  return <canvas ref={ref} className="h-full w-full" aria-label={label} />;
}

export function WearSingleMeshPreview({
  runId,
  scanId,
  view,
  colour = "#22d3ee",
  className = "h-72",
}: {
  runId: string;
  scanId: string;
  view: MeshView;
  colour?: string;
  className?: string;
}) {
  const requestKey = `${runId}:${scanId}:${view}`;
  const [result, setResult] = useState<{ key: string; mesh: Blender2DMesh | null; error: string | null }>({
    key: "",
    mesh: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    void queued(() => fetchMesh(runId, scanId, view))
      .then((value) => { if (!cancelled) setResult({ key: requestKey, mesh: value, error: null }); })
      .catch((caught) => {
        if (!cancelled) setResult({
          key: requestKey,
          mesh: null,
          error: caught instanceof Error ? caught.message : "Mesh unavailable.",
        });
      });
    return () => { cancelled = true; };
  }, [requestKey, runId, scanId, view]);
  const visible = result.key === requestKey ? result : { mesh: null, error: null };
  return (
    <div className={`relative overflow-hidden rounded-lg border border-white/10 bg-slate-950 ${className}`}>
      {visible.mesh ? <MeshCanvas mesh={visible.mesh} colour={colour} label={`${scanId} real Blender ${view} mesh`} /> : (
        <div className="grid h-full place-items-center p-3 text-center text-xs text-slate-400">
          {visible.error ?? `Building real ${view} PLY mesh…`}
        </div>
      )}
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-slate-950/90 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
        {view}
      </span>
    </div>
  );
}

export function WearFrontSidePreview({ runId, scanId }: { runId: string; scanId: string }) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-label={`${scanId} real front and side Blender meshes`}>
      <WearSingleMeshPreview runId={runId} scanId={scanId} view="front" colour="#67e8f9" className="h-64" />
      <WearSingleMeshPreview runId={runId} scanId={scanId} view="side" colour="#fb923c" className="h-64" />
    </div>
  );
}
