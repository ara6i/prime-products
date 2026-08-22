"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WearBlender3DSection } from "../sdk-wear-mesh/WearBlender3DSection";
import type { SdkWearMatch, SdkWearPart, SdkWearPartResult, SdkWearQuery } from "./sdkWearMatcher";

interface Props {
  imageUrl: string | null;
  query: SdkWearQuery | null;
  results: SdkWearPartResult[] | null;
  heldoutOnly?: boolean;
}

interface HoldoutPerson {
  scanId: string;
  subjectId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  imageUrl: string;
  mesh: { outline: number[][]; triangles: number[][]; vertices?: number[][] };
  rowWidths: SdkWearQuery["rowWidths"];
}

interface HoldoutRun {
  person: HoldoutPerson;
  imageUrl: string;
  query: SdkWearQuery;
  results: SdkWearPartResult[];
  inputRevealAfterRank: {
    scanId: string;
    rowTapeAndCircumferenceCm: Record<string, { tape: number | null; geometryPerimeter: number | null }>;
  } | null;
}

interface ExactWearRow {
  a: { name: string; frontCm: readonly [number, number]; canonical3dCm: readonly [number, number, number] };
  b: { name: string; frontCm: readonly [number, number]; canonical3dCm: readonly [number, number, number] };
  distance3dCm: number;
  frontProjectedDistanceCm: number;
  source: string;
  protocolNote: string;
  evidenceType: "wear-lnd-segment" | "ply-cross-section";
  planeHeightCm?: number;
  planeHeightSource?: string;
  qualityFlags?: string[];
}

interface ExactWearMesh {
  scanId: string;
  units: "centimetres";
  depthUsed: false;
  verticesCm: Array<readonly [number, number]>;
  triangles: Array<readonly [number, number, number]>;
  rows: Partial<Record<SdkWearPart, ExactWearRow>>;
}

const labels: Record<SdkWearPart, string> = { neck: "Neck", chest: "Chest", underbust: "Under-bust", waist: "Natural waist", hips: "Hips" };
const rowColours: Record<SdkWearPart, string> = { neck: "#c4b5fd", chest: "#a3e635", underbust: "#f9a8d4", waist: "#facc15", hips: "#fb7185" };

function exactBounds(meshes: Array<ExactWearMesh | null>) {
  const points = meshes.flatMap((mesh) => mesh?.verticesCm ?? []);
  if (!points.length) return { minX: -30, maxX: 30, minY: 0, maxY: 180 };
  return {
    minX: Math.min(...points.map(([x]) => x)), maxX: Math.max(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)), maxY: Math.max(...points.map(([, y]) => y)),
  };
}

function ExactWearMeshCanvas({ meshes, labels: meshLabels, colours, overlay, label, part }: {
  meshes: Array<ExactWearMesh | null>; labels: string[]; colours: string[]; overlay: boolean; label: string; part: SdkWearPart;
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
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const active = meshes.flatMap((mesh, index) => mesh ? [{
        mesh,
        vertices: mesh.verticesCm,
        row: mesh.rows?.[part] ?? null,
        colour: colours[index]!,
        label: meshLabels[index] ?? "WEAR mesh",
        index,
      }] : []);
      // Both scans are already in the evidenced canonical WEAR X/Z frame.
      // Use their coordinates unchanged and one shared physical scale. The
      // only offset below is the common canvas margin (or the separate panel
      // origin in side-by-side mode), never a per-mesh registration.
      const shared = exactBounds(active.map(({ mesh, vertices }) => ({ ...mesh, verticesCm: vertices })));
      const rowGuides: Array<{ row: ExactWearRow; left: readonly [number, number]; right: readonly [number, number]; colour: string; index: number; originX: number; availableWidth: number }> = [];
      const drawMesh = ({ mesh, vertices, row, colour: color, index }: (typeof active)[number]) => {
        const bounds = shared;
        const padding = 5;
        const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
        const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
        const availableWidth = overlay ? canvas.width : canvas.width / Math.max(1, active.length);
        const originX = overlay ? 0 : index * availableWidth;
        const scale = Math.min(availableWidth / width, canvas.height / height);
        const offsetX = originX + (availableWidth - width * scale) / 2;
        const offsetY = (canvas.height - height * scale) / 2;
        const point = ([x, z]: readonly [number, number]) => [offsetX + (x - bounds.minX + padding) * scale, offsetY + (bounds.maxY - z + padding) * scale] as const;
        const outerEdges = new Map<string, { a: number; b: number; count: number }>();
        const addEdge = (a: number, b: number) => {
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          const existing = outerEdges.get(key);
          if (existing) existing.count += 1;
          else outerEdges.set(key, { a, b, count: 1 });
        };
        context.beginPath();
        for (const [a, b, c] of mesh.triangles) {
          const pa = point(vertices[a]!); const pb = point(vertices[b]!); const pc = point(vertices[c]!);
          context.moveTo(pa[0], pa[1]); context.lineTo(pb[0], pb[1]); context.lineTo(pc[0], pc[1]); context.closePath();
          addEdge(a, b); addEdge(b, c); addEdge(c, a);
        }
        context.fillStyle = color;
        context.globalAlpha = overlay ? 0.045 : 0.075;
        context.fill();
        context.globalAlpha = overlay ? 0.58 : 0.76;
        context.strokeStyle = color;
        context.lineWidth = Math.max(0.36 * ratio, 0.44 * ratio);
        context.shadowColor = color;
        context.shadowBlur = 1.8 * ratio;
        context.stroke();
        context.beginPath();
        for (const edge of outerEdges.values()) {
          if (edge.count !== 1) continue;
          const a = point(vertices[edge.a]!);
          const b = point(vertices[edge.b]!);
          context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]);
        }
        context.globalAlpha = 1;
        context.strokeStyle = color;
        context.lineWidth = Math.max(1.2 * ratio, 1.55 * ratio);
        context.shadowColor = color;
        context.shadowBlur = 5 * ratio;
        context.stroke();
        context.shadowBlur = 0;
        context.globalAlpha = 1;

        if (row) {
          const a = point(row.a.frontCm);
          const b = point(row.b.frontCm);
          rowGuides.push({ row, left: a[0] <= b[0] ? a : b, right: a[0] <= b[0] ? b : a, colour: color, index, originX, availableWidth });
        }
      };
      active.forEach(drawMesh);
      for (const guide of rowGuides) {
        context.save();
        context.beginPath();
        context.setLineDash(guide.index === 1 ? [10 * ratio, 7 * ratio] : []);
        context.moveTo(guide.left[0], guide.left[1]);
        context.lineTo(guide.right[0], guide.right[1]);
        context.strokeStyle = guide.colour;
        context.lineWidth = Math.max((guide.index === 0 ? 4.2 : 3.5) * ratio, 4 * ratio);
        context.shadowColor = guide.colour;
        context.shadowBlur = 8 * ratio;
        context.stroke();
        context.setLineDash([]);
        context.shadowBlur = 0;
        context.fillStyle = guide.colour;
        for (const endpoint of [guide.left, guide.right]) {
          context.beginPath();
          context.arc(endpoint[0], endpoint[1], 3.6 * ratio, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }
      const overlayLineYs = rowGuides.map((guide) => (guide.left[1] + guide.right[1]) / 2);
      const overlayTopLabelY = overlayLineYs.length ? Math.min(...overlayLineYs) - 22 * ratio : 0;
      const overlayBottomLabelY = overlayLineYs.length ? Math.max(...overlayLineYs) + 22 * ratio : 0;
      for (const guide of rowGuides) {
        context.save();
        const measurement = guide.row.evidenceType === "ply-cross-section" ? "PLY waist A–B" : `${labels[part]} LND`;
        const text = `${guide.index === 0 ? "Input" : "Match"} · ${measurement} · ${guide.row.distance3dCm.toFixed(2)} cm`;
        context.font = `800 ${Math.max(10.5, 10.5 * ratio)}px system-ui`;
        context.textBaseline = "middle";
        const textWidth = context.measureText(text).width;
        const panelRight = guide.originX + guide.availableWidth;
        const labelX = Math.max(guide.originX + 7 * ratio, Math.min(panelRight - textWidth - 12 * ratio, guide.left[0]));
        const wantedY = overlay
          ? guide.index === 0 ? overlayTopLabelY : overlayBottomLabelY
          : guide.left[1] - 18 * ratio;
        const labelHeight = 22 * ratio;
        const labelY = Math.max(labelHeight / 2 + 6 * ratio, Math.min(canvas.height - labelHeight / 2 - 6 * ratio, wantedY));
        context.fillStyle = "rgba(2,6,23,.94)";
        context.fillRect(labelX - 6 * ratio, labelY - labelHeight / 2, textWidth + 12 * ratio, labelHeight);
        context.globalAlpha = 0.7;
        context.strokeStyle = guide.colour;
        context.lineWidth = ratio;
        context.strokeRect(labelX - 6 * ratio, labelY - labelHeight / 2, textWidth + 12 * ratio, labelHeight);
        context.globalAlpha = 1;
        context.fillStyle = guide.colour;
        context.fillText(text, labelX, labelY);
        context.restore();
      }
      if (!overlay && active.length === 2) {
        context.strokeStyle = "#334155"; context.lineWidth = ratio; context.beginPath(); context.moveTo(canvas.width / 2, 0); context.lineTo(canvas.width / 2, canvas.height); context.stroke();
      }
    };
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    window.addEventListener("resize", render);
    return () => { observer.disconnect(); window.removeEventListener("resize", render); };
  }, [colours, meshLabels, meshes, overlay, part]);
  const lineSource = part === "waist" ? "raw-wear-ply-waist-cross-section" : "exact-paired-wear-lnd";
  const lineLabel = part === "waist" ? "Raw WEAR PLY cross-section" : "WEAR LND segment";
  return <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-700 bg-slate-900"><canvas ref={canvasRef} className="h-full w-full" aria-label={label} data-active-body-part={part} data-line-source={lineSource} data-alignment="canonical-wear-xz-no-per-mesh-transform" data-scale="shared-centimetre-scale" />{!overlay ? <div className="absolute inset-x-0 top-0 grid grid-cols-2 border-b border-slate-700 bg-slate-950/90 text-center text-sm font-bold"><span className="border-r border-slate-700 px-2 py-2 text-cyan-300">{meshLabels[0]}</span><span className="px-2 py-2 text-orange-300">{meshLabels[1]}</span></div> : <div className="absolute left-3 top-3 rounded bg-slate-950/90 px-3 py-2 text-sm font-bold"><span className="text-cyan-300">Cyan · {meshLabels[0]}</span><span className="mx-2 text-slate-500">/</span><span className="text-orange-300">Orange · {meshLabels[1]}</span><span className="ml-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">Unshifted · same cm scale</span></div>}<div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-slate-950/95 px-3 py-2 text-xs font-bold text-white"><span style={{ color: rowColours[part] }}>{lineLabel} · {labels[part]}</span><span className="mx-2 text-slate-500">|</span><span>solid input · dashed match</span></div></div>;
}

function FallbackSource({ imageUrl, label }: { imageUrl: string | null; label: string }) {
  return <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-700 bg-slate-900"><div className="absolute left-2 top-2 z-10 rounded bg-black/80 px-3 py-2 text-sm font-bold text-white">{label}</div>{imageUrl ? <img src={imageUrl} alt={label} className="absolute inset-0 h-full w-full object-contain" /> : <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-300">Real PLY mesh is only available for held-out WEAR-to-WEAR comparison.</div>}</div>;
}

function Overlay({ imageUrl, selected, part, inputLabel = "User front", exactInput, exactSelected, meshLoading }: { imageUrl: string | null; selected: SdkWearMatch | null; part: SdkWearPart; inputLabel?: string; exactInput?: ExactWearMesh | null; exactSelected?: ExactWearMesh | null; meshLoading?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"side-by-side" | "overlay">("side-by-side");
  const exactReady = Boolean(exactInput && exactSelected);
  const inputLandmark = exactInput?.rows?.[part];
  const matchedLandmark = exactSelected?.rows?.[part];
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-sm text-slate-300">
        <span className="flex items-center gap-2"><button type="button" onClick={() => setView("side-by-side")} className={`rounded-md px-3 py-1.5 ${view === "side-by-side" ? "bg-cyan-500 font-bold text-slate-950" : "bg-slate-800 text-white"}`}>Side by side</button><button type="button" onClick={() => setView("overlay")} className={`rounded-md px-3 py-1.5 ${view === "overlay" ? "bg-cyan-500 font-bold text-slate-950" : "bg-slate-800 text-white"}`}>Overlay</button></span>
        <span className="flex items-center gap-2"><button type="button" aria-label="Zoom out" onClick={() => setZoom((v) => Math.max(.75, v - .1))} className="rounded-md bg-slate-800 px-3 py-1.5 text-lg text-white">−</button><strong>{Math.round(zoom * 100)}%</strong><button type="button" aria-label="Zoom in" onClick={() => setZoom((v) => Math.min(2, v + .1))} className="rounded-md bg-slate-800 px-3 py-1.5 text-lg text-white">+</button></span>
      </div>
      <div className="p-2" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>{exactReady ? <ExactWearMeshCanvas meshes={[exactInput ?? null, exactSelected ?? null]} labels={[inputLabel, `Matched · ${selected?.scanId ?? "WEAR"}`]} colours={["#22d3ee", "#fb923c"]} overlay={view === "overlay"} label={view === "overlay" ? "Unshifted canonical PLY front mesh overlay" : "Exact PLY front meshes side by side"} part={part} /> : meshLoading ? <div className="grid aspect-[3/4] place-items-center rounded-lg border border-slate-700 bg-slate-900 p-6 text-center text-base text-cyan-100">Loading the two real WEAR PLY front meshes…</div> : view === "side-by-side" ? <div className="grid grid-cols-2 gap-2"><FallbackSource imageUrl={imageUrl} label={inputLabel} /><FallbackSource imageUrl={selected?.imageUrl ?? null} label="Matched WEAR front" /></div> : <FallbackSource imageUrl={imageUrl} label="Real PLY mesh not loaded" />}</div>
      {inputLandmark && matchedLandmark ? <div className="grid gap-2 border-t border-slate-700 bg-slate-950 p-3 sm:grid-cols-2">
        {[{ role: "Input", scanId: exactInput?.scanId, row: inputLandmark, tone: "text-cyan-300" }, { role: "Matched", scanId: exactSelected?.scanId, row: matchedLandmark, tone: "text-orange-300" }].map((item) => <div key={item.role} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300"><strong className={item.tone}>{item.role} · {item.scanId}</strong><span className="mt-1 block text-white">{item.row.a.name} ↔ {item.row.b.name}</span><span className="mt-1 block">{item.row.evidenceType === "ply-cross-section" ? "PLY-derived A–B breadth" : "Exact 3D LND distance"}: <strong className="text-white">{item.row.distance3dCm.toFixed(2)} cm</strong></span>{item.row.evidenceType === "ply-cross-section" ? <span className="mt-1 block text-amber-300">Raw PLY intersections at WEAR waist_height {item.row.planeHeightCm?.toFixed(1)} cm · no waist landmarks invented.</span> : null}</div>)}
        {view === "overlay" ? <p className="sm:col-span-2 text-xs text-slate-400">Unshifted physical overlay: both meshes use their original canonical WEAR X/Z coordinates and one shared centimetre scale. No mesh-specific translation, rotation, scaling, stretching, or landmark registration is applied. Any head, floor, or landmark-line difference remains visible.</p> : null}
      </div> : null}
      {part === "waist" && exactReady && (!inputLandmark || !matchedLandmark) ? <p className="border-t border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">A validated raw-PLY waist section is unavailable for one of these scans, so no Iliocristale substitute is shown.</p> : null}
    </div>
  );
}


export function SdkWearMeshPanel({ imageUrl, results, heldoutOnly = false }: Props) {
  const [sourceMode, setSourceMode] = useState<"heldout" | "user">("heldout");
  const [part, setPart] = useState<SdkWearPart>("waist");
  const [selectedScanByPart, setSelectedScanByPart] = useState<Partial<Record<SdkWearPart, string>>>({});
  const [selectedHoldoutScanByPart, setSelectedHoldoutScanByPart] = useState<Partial<Record<SdkWearPart, string>>>({});
  const [holdoutPeople, setHoldoutPeople] = useState<HoldoutPerson[]>([]);
  const [holdoutSearch, setHoldoutSearch] = useState("");
  const [holdoutScanId, setHoldoutScanId] = useState("");
  const [holdoutStatus, setHoldoutStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [holdoutError, setHoldoutError] = useState<string | null>(null);
  const [holdoutRun, setHoldoutRun] = useState<HoldoutRun | null>(null);
  const [exactMeshes, setExactMeshes] = useState<Record<string, ExactWearMesh>>({});
  const active = useMemo(() => results?.find((result) => result.part === part) ?? null, [part, results]);
  const selectedCandidate = active?.candidates.find((candidate) => candidate.scanId === selectedScanByPart[part]) ?? active?.selected ?? null;
  const visibleHoldoutPeople = useMemo(() => {
    const search = holdoutSearch.trim().toLowerCase();
    return (search ? holdoutPeople.filter((person) => person.scanId.toLowerCase().includes(search) || person.subjectId.toLowerCase().includes(search)) : holdoutPeople);
  }, [holdoutPeople, holdoutSearch]);
  const selectedHoldoutPerson = useMemo(() => holdoutPeople.find((person) => person.scanId === holdoutScanId) ?? null, [holdoutPeople, holdoutScanId]);
  const holdoutActive = holdoutRun?.results.find((result) => result.part === part) ?? null;
  const selectedHoldoutCandidate = holdoutActive?.candidates.find((candidate) => candidate.scanId === selectedHoldoutScanByPart[part]) ?? holdoutActive?.selected ?? null;
  const exactMeshLoading = Boolean(
    holdoutRun?.person.scanId
    && selectedHoldoutCandidate?.scanId
    && (!exactMeshes[holdoutRun.person.scanId] || !exactMeshes[selectedHoldoutCandidate.scanId]),
  );
  const activeSourceMode = heldoutOnly ? "heldout" : sourceMode;
  const visiblePartResults = activeSourceMode === "heldout" ? holdoutRun?.results ?? null : results;

  useEffect(() => {
    fetch("/api/try-on-test/sizing-lab/sdk-wear/match", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ people?: HoldoutPerson[] }>)
      .then((payload) => {
        const people = payload.people ?? [];
        setHoldoutPeople(people);
        // Start on a held-out person with at least one strict-cohort neighbour
        // so the first replay demonstrates the gate instead of immediately
        // showing an empty result for a unique profile.
        const demo = people.find((person) => person.scanId === "IT-4770-A") ?? people[0];
        setHoldoutScanId((current) => current || demo?.scanId || "");
      })
      .catch(() => setHoldoutPeople([]));
  }, []);

  useEffect(() => {
    const inputScanId = holdoutRun?.person.scanId;
    const matchScanId = selectedHoldoutCandidate?.scanId;
    if (!inputScanId || !matchScanId) return;
    let cancelled = false;
    Promise.all([inputScanId, matchScanId].map(async (scanId) => {
      const response = await fetch(`/api/try-on-test/sizing-lab/sdk-wear/mesh?scanId=${encodeURIComponent(scanId)}`, { cache: "no-store" });
      const payload = await response.json() as { ok?: boolean; mesh?: ExactWearMesh; error?: string };
      if (!response.ok || !payload.ok || !payload.mesh) throw new Error(payload.error || "Real WEAR PLY mesh unavailable.");
      return payload.mesh;
    })).then((meshes) => {
      if (!cancelled) setExactMeshes((current) => ({ ...current, ...Object.fromEntries(meshes.map((mesh) => [mesh.scanId, mesh])) }));
    }).catch(() => {
      // The panel deliberately does not manufacture a substitute mesh.
    });
    return () => { cancelled = true; };
  }, [holdoutRun?.person.scanId, selectedHoldoutCandidate?.scanId]);

  async function runHoldoutSdkTest() {
    const person = holdoutPeople.find((candidate) => candidate.scanId === holdoutScanId);
    if (!person) return;
    setHoldoutStatus("loading");
    setHoldoutError(null);
    try {
      // The selected held-out input is the generated WEAR mesh itself. No
      // landmark detector, RGB photo, tape, or circumference is used.
      const query: SdkWearQuery = { outline: person.mesh.outline, rowWidths: person.rowWidths, heightCm: person.heightCm };
      if (query.outline.length < 3 || !Object.keys(query.rowWidths).length) throw new Error("The selected WEAR mesh has no usable visible geometry.");
      const response = await fetch("/api/try-on-test/sizing-lab/sdk-wear/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics: { heightCm: person.heightCm, weightKg: person.weightKg, gender: person.gender }, query, strictOnly: true, excludeScanId: person.scanId }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string; results?: SdkWearPartResult[]; inputRevealAfterRank?: HoldoutRun["inputRevealAfterRank"] };
      if (!response.ok || !payload.ok || !payload.results) throw new Error(payload.error || "The SDK hold-out test failed.");
      setHoldoutRun({ person, imageUrl: person.imageUrl, query, results: payload.results, inputRevealAfterRank: payload.inputRevealAfterRank ?? null });
      setSelectedHoldoutScanByPart({});
      setHoldoutStatus("ready");
    } catch (error) {
      setHoldoutStatus("error");
      setHoldoutError(error instanceof Error ? error.message : "The SDK hold-out test failed.");
    }
  }
  return (
    <div className="space-y-4 rounded-2xl border-2 border-cyan-200 bg-slate-950 p-4 text-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h3 className="text-xl font-bold">SDK · WEAR mesh</h3><p className="mt-1 text-sm text-slate-300">{heldoutOnly ? "Select any unseen WEAR mesh, then compare its nearest matches clearly." : "Choose one clear test source. The two tests are never mixed."}</p></div>
        {visiblePartResults ? <label className="text-sm font-semibold text-slate-200">Body part<select value={part} onChange={(event) => setPart(event.target.value as SdkWearPart)} className="ml-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white">{visiblePartResults.map((result) => <option key={result.part} value={result.part}>{labels[result.part]}</option>)}</select></label> : null}
      </div>
      {!heldoutOnly ? <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2 sm:grid-cols-2" aria-label="SDK WEAR test source">
        <button type="button" onClick={() => setSourceMode("heldout")} className={`rounded-lg px-4 py-3 text-left ${sourceMode === "heldout" ? "bg-cyan-500 font-bold text-slate-950" : "bg-slate-950 text-white"}`}>
          <span className="block text-base">Held-out WEAR model</span>
          <span className={`mt-1 block text-sm ${sourceMode === "heldout" ? "text-cyan-950" : "text-slate-400"}`}>Pick any of the 448 unseen test meshes.</span>
        </button>
        <button type="button" onClick={() => setSourceMode("user")} className={`rounded-lg px-4 py-3 text-left ${sourceMode === "user" ? "bg-cyan-500 font-bold text-slate-950" : "bg-slate-950 text-white"}`}>
          <span className="block text-base">Normal user photo</span>
          <span className={`mt-1 block text-sm ${sourceMode === "user" ? "text-cyan-950" : "text-slate-400"}`}>Use the uploaded person after Analyze.</span>
        </button>
      </div> : null}

      {activeSourceMode === "heldout" ? <section className="space-y-4 rounded-xl border border-amber-700/70 bg-amber-950/20 p-4" aria-label="Held-out WEAR SDK test">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="text-lg font-bold text-amber-100">Choose the unseen WEAR model</h4><p className="mt-1 text-sm text-amber-100/80">This mesh becomes the SDK input. Its measurements stay hidden while matching.</p></div>
          <span className="rounded-full border border-amber-500/60 bg-amber-400/10 px-3 py-1 text-sm font-bold text-amber-200">{holdoutPeople.length || "…"} held-out models</span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input value={holdoutSearch} onChange={(event) => setHoldoutSearch(event.target.value)} placeholder="Search held-out model number" aria-label="Search held-out WEAR model number" className="rounded border border-amber-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-300" />
          <select value={holdoutScanId} onChange={(event) => { setHoldoutScanId(event.target.value); setHoldoutRun(null); setHoldoutStatus("idle"); }} aria-label="Select held-out WEAR person" className="rounded border border-amber-700 bg-slate-950 px-3 py-2 text-sm text-white">
            {visibleHoldoutPeople.map((person) => <option key={person.scanId} value={person.scanId}>{person.scanId} · H {person.heightCm.toFixed(1)} · W {person.weightKg.toFixed(1)} kg</option>)}
          </select>
          <button type="button" onClick={runHoldoutSdkTest} disabled={!holdoutScanId || holdoutStatus === "loading"} className="rounded bg-amber-500 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{holdoutStatus === "loading" ? "Finding nearest meshes…" : "Find nearest meshes"}</button>
        </div>
        {selectedHoldoutPerson && !holdoutRun ? <div className="grid gap-4 rounded-xl border border-amber-800 bg-slate-950/70 p-3 sm:grid-cols-[180px_1fr]">
          <FallbackSource imageUrl={selectedHoldoutPerson.imageUrl} label="Selected WEAR front render" />
          <div className="self-center text-base text-amber-50"><strong className="block text-xl text-white">{selectedHoldoutPerson.scanId}</strong><span className="mt-2 block">{selectedHoldoutPerson.gender} · {selectedHoldoutPerson.heightCm.toFixed(1)} cm · {selectedHoldoutPerson.weightKg.toFixed(1)} kg</span><span className="mt-3 block text-sm text-amber-200/80">Press “Find nearest meshes.” The selected model is excluded from its own results.</span></div>
        </div> : null}
        <WearBlender3DSection key={selectedHoldoutPerson?.scanId ?? holdoutScanId} scanId={selectedHoldoutPerson?.scanId ?? holdoutScanId} heightCm={selectedHoldoutPerson?.heightCm ?? null} matchedScanId={selectedHoldoutCandidate?.scanId ?? null} matchedHeightCm={selectedHoldoutCandidate?.heightCm ?? null} />
        {holdoutStatus === "error" ? <p className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">{holdoutError}</p> : null}
        {holdoutRun ? <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label="Nearest held-out model for each body part">{holdoutRun.results.map((result) => <button type="button" key={result.part} onClick={() => setPart(result.part)} className={`rounded-lg border p-3 text-left ${part === result.part ? "border-cyan-300 bg-cyan-400/10" : "border-slate-700 bg-slate-950 hover:border-cyan-500"}`}><span className="block text-sm font-semibold text-slate-300">{labels[result.part]}</span><strong className="mt-1 block text-base text-white">{result.selected?.scanId ?? "No strict match"}</strong><span className="mt-1 block text-sm text-slate-300">{result.selected ? `Width difference ${result.selected.frontWidthDifferenceCm.toFixed(2)} cm` : "No model passed every gate"}</span></button>)}</div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)]">
            <Overlay imageUrl={holdoutRun.imageUrl} inputLabel={`Input · ${holdoutRun.person.scanId}`} selected={selectedHoldoutCandidate} part={part} exactInput={exactMeshes[holdoutRun.person.scanId] ?? null} exactSelected={selectedHoldoutCandidate ? exactMeshes[selectedHoldoutCandidate.scanId] ?? null : null} meshLoading={exactMeshLoading} />
            <aside className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div><span className="text-sm text-slate-400">Body part</span><h5 className="text-xl font-bold text-white">{labels[part]}</h5></div>
              {selectedHoldoutCandidate ? <CandidateCard part={part} candidate={selectedHoldoutCandidate} status={holdoutActive?.status ?? "matched"} estimate={null} input={{ scanId: holdoutRun.person.scanId, heightCm: holdoutRun.person.heightCm, weightKg: holdoutRun.person.weightKg, frontWidthCm: holdoutRun.query.rowWidths[part]?.frontWidthCm ?? null, reveal: holdoutRun.inputRevealAfterRank?.rowTapeAndCircumferenceCm[part] ?? null }} /> : <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-100">No other held-out person passed same gender, ±1 cm height, ±1 kg weight, and the 1.27 cm width gate for this part.</div>}
              {holdoutActive?.candidates?.length ? <div className="space-y-2"><div className="text-sm font-bold text-slate-200">Nearest strict matches</div>{holdoutActive.candidates.map((candidate) => <button type="button" key={candidate.scanId} onClick={() => setSelectedHoldoutScanByPart((current) => ({ ...current, [part]: candidate.scanId }))} className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm ${selectedHoldoutCandidate?.scanId === candidate.scanId ? "border-orange-400 bg-orange-400/10" : "border-slate-700 bg-slate-950 hover:border-cyan-400"}`}><span><strong>#{candidate.rank} · {candidate.scanId}</strong><small className="mt-1 block text-slate-400">H {candidate.heightCm.toFixed(1)} · W {candidate.weightKg.toFixed(1)}</small></span><span>{candidate.frontWidthDifferenceCm.toFixed(2)} cm</span></button>)}</div> : null}
            </aside>
          </div>
          <p className="text-sm text-slate-300">Cyan = selected SDK input. Orange = nearest eligible WEAR mesh. Use Overlay or Side by side above.</p>
        </div>
        : null}
      </section> : null}

      {activeSourceMode === "user" ? <section className="space-y-4 rounded-xl border border-cyan-800 bg-cyan-950/20 p-4" aria-label="Normal user photo SDK test">
        {!results ? <div className="rounded-xl border border-dashed border-cyan-700 p-5 text-base text-cyan-100"><strong className="block text-lg">Normal user photo is not analyzed yet.</strong><span className="mt-1 block text-sm text-cyan-100/70">Choose a person above and click Analyze. This view will then show only that person’s matches.</span></div> : <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label="SDK match for each body part">{results.map((result) => <button type="button" key={result.part} onClick={() => setPart(result.part)} className={`rounded-lg border p-3 text-left ${part === result.part ? "border-cyan-300 bg-cyan-400/10" : "border-slate-700 bg-slate-950 hover:border-cyan-500"}`}><span className="block text-sm font-semibold text-slate-300">{labels[result.part]}</span><strong className="mt-1 block text-base text-white">{result.selected?.scanId ?? "No model"}</strong><span className="mt-1 block text-sm text-slate-300">{result.status === "matched" ? "Matched" : result.status === "estimated" ? "Estimated" : "Unavailable"}{result.selected ? ` · ${result.selected.frontWidthDifferenceCm.toFixed(2)} cm` : ""}</span></button>)}</div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)]">
            <Overlay imageUrl={imageUrl} selected={selectedCandidate} part={part} />
            <aside className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div><span className="text-sm text-slate-400">Body part</span><h5 className="text-xl font-bold">{labels[part]}</h5></div>
              {!active || active.status === "unavailable" ? <p className="text-sm text-amber-300">No usable front row was found.</p> : null}
              {selectedCandidate ? <CandidateCard part={part} candidate={selectedCandidate} status={active?.status ?? "matched"} estimate={active?.estimate ?? null} /> : null}
              {active?.candidates?.length ? <div className="space-y-2"><div className="text-sm font-bold text-slate-200">Nearest bodies</div>{active.candidates.map((candidate) => <button type="button" key={candidate.scanId} onClick={() => setSelectedScanByPart((current) => ({ ...current, [part]: candidate.scanId }))} className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm ${selectedCandidate?.scanId === candidate.scanId ? "border-orange-400 bg-orange-400/10" : "border-slate-700 bg-slate-950 hover:border-cyan-400"}`}><span>#{candidate.rank} · {candidate.scanId}</span><span>{candidate.frontWidthDifferenceCm.toFixed(2)} cm</span></button>)}</div> : null}
            </aside>
          </div>
        </>}
      </section> : null}
    </div>
  );
}

function CandidateCard({ part, candidate, status, estimate, input }: { part: SdkWearPart; candidate: SdkWearMatch; status: SdkWearPartResult["status"]; estimate: SdkWearPartResult["estimate"]; input?: { scanId: string; heightCm: number; weightKg: number; frontWidthCm: number | null; reveal: { tape: number | null; geometryPerimeter: number | null } | null } }) {
  const reveal = candidate.revealOnly.rowTapeAndCircumferenceCm[part];
  const inputTape = input?.reveal?.tape;
  const matchedTape = reveal?.tape;
  const tapeDifferenceCm = typeof inputTape === "number" && typeof matchedTape === "number" ? Math.abs(matchedTape - inputTape) : null;
  const passesHalfInchTapeCheck = tapeDifferenceCm != null ? tapeDifferenceCm <= 1.27 : null;
  const gateLabel = candidate.profileWindow.tier === "strict" ? "Strict profile: ±1 cm / ±1 kg" : `Expanded profile: ±${candidate.profileWindow.heightCm ?? "wide"} cm / ±${candidate.profileWindow.weightKg ?? "wide"} kg`;
  const signed = (value: number, digits = 1) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
  const rows = input ? [
    { label: "Height", input: `${input.heightCm.toFixed(1)} cm`, match: `${candidate.heightCm.toFixed(1)} cm`, difference: `${signed(candidate.heightCm - input.heightCm)} cm` },
    { label: "Weight", input: `${input.weightKg.toFixed(1)} kg`, match: `${candidate.weightKg.toFixed(1)} kg`, difference: `${signed(candidate.weightKg - input.weightKg)} kg` },
    { label: `${labels[part]} front width`, input: input.frontWidthCm == null ? "—" : `${input.frontWidthCm.toFixed(2)} cm`, match: `${candidate.frontWidthCm.toFixed(2)} cm`, difference: input.frontWidthCm == null ? "—" : `${signed(candidate.frontWidthCm - input.frontWidthCm, 2)} cm` },
  ] : [];
  return <div className="space-y-4 rounded-xl border border-orange-400/50 bg-slate-950 p-4">
    <div className="flex items-center justify-between gap-2"><div><div className="text-sm font-semibold text-slate-400">Matched WEAR model</div><div className="text-xl font-bold text-orange-300">#{candidate.rank} · {candidate.scanId}</div></div><span className={`rounded-full border px-3 py-1 text-sm font-bold ${status === "matched" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-amber-500/60 bg-amber-500/10 text-amber-300"}`}>{status === "matched" ? "Passed" : "Estimated"}</span></div>
    <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300">{gateLabel}</div>
    {input ? <div className="overflow-hidden rounded-lg border border-slate-700">
      <div className="grid grid-cols-[1.25fr_1fr_1fr_1fr] bg-slate-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-300"><span>Metric</span><span className="text-cyan-300">Input</span><span className="text-orange-300">Matched</span><span>Difference</span></div>
      {rows.map((row) => <div key={row.label} className="grid grid-cols-[1.25fr_1fr_1fr_1fr] items-center border-t border-slate-800 px-3 py-3 text-sm"><strong className="pr-2 text-white">{row.label}</strong><span className="font-semibold text-cyan-200">{row.input}</span><span className="font-semibold text-orange-200">{row.match}</span><span className="font-bold text-white">{row.difference}</span></div>)}
    </div> : <div className="grid grid-cols-2 gap-3 text-sm text-slate-200"><span>Height<br /><strong>{candidate.heightCm.toFixed(1)} cm</strong></span><span>Weight<br /><strong>{candidate.weightKg.toFixed(1)} kg</strong></span><span>Front width<br /><strong>{candidate.frontWidthCm.toFixed(2)} cm</strong></span><span>Width difference<br /><strong>{candidate.frontWidthDifferenceCm.toFixed(2)} cm</strong></span></div>}
    {estimate ? <div className="border-t border-slate-700 pt-3 text-sm text-amber-200">Estimated result: {estimate.circumferenceCm?.toFixed(1) ?? "—"} cm <span className="text-amber-100/70">({estimate.confidence} confidence)</span></div> : null}
    <div className="overflow-hidden rounded-lg border border-emerald-700/50">
      <div className="bg-emerald-950/40 px-3 py-2 text-sm font-bold text-emerald-200">Circumference values — revealed after ranking</div>
      <div className={`grid gap-px bg-emerald-800/40 text-sm ${input ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {input ? <div className="bg-slate-950 p-3"><span className="block text-xs font-bold uppercase tracking-wide text-cyan-300">Selected input model · {input.scanId}</span><strong className="mt-1 block text-white">{labels[part]} tape: {input.reveal?.tape?.toFixed(1) ?? "—"} cm</strong></div> : null}
        <div className="bg-slate-950 p-3"><span className="block text-xs font-bold uppercase tracking-wide text-orange-300">Front-width matched model · {candidate.scanId}</span><strong className="mt-1 block text-white">{labels[part]} tape: {reveal?.tape?.toFixed(1) ?? "—"} cm</strong></div>
      </div>
      {tapeDifferenceCm != null ? <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-800/50 bg-slate-900 px-3 py-3 text-sm"><span><strong className="text-white">Absolute tape difference: {tapeDifferenceCm.toFixed(1)} cm</strong><small className="ml-2 text-slate-400">({(tapeDifferenceCm / 2.54).toFixed(2)} in)</small></span><strong className={`rounded-full border px-3 py-1 ${passesHalfInchTapeCheck ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-red-500/60 bg-red-500/10 text-red-300"}`}>{passesHalfInchTapeCheck ? "Passes half-inch tape check" : "Fails half-inch tape check"}</strong></div> : null}
      <p className="border-t border-emerald-800/50 bg-slate-950 px-3 py-2 text-xs text-slate-400">Half an inch is 1.27 cm. This post-ranking tape check is not used to choose the front-width match.</p>
    </div>
  </div>;
}
