"use client";

import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Color, Mesh, type Material } from "three";
import type { WearRankingResponse, WearRevealResponse } from "../wear-side-selector/types";

interface WearPerson {
  scanId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
}

interface RenderResult {
  ok?: boolean;
  error?: string;
  metadata?: {
    scanId: string;
    crossSections?: Array<{
      row: "waist" | "hips";
      heightCm: number;
      straightABWidthCm: number;
      frontCurvedABCm: number;
      backCurvedBACm: number;
      meshCircumferenceCm: number;
    }>;
  };
  artifacts?: {
    glbUrl: string;
    pngUrl?: string;
    cameraCards?: Record<string, string>;
  };
}

interface LineupEntry {
  scanId: string;
  heightCm: number;
  role: string;
  colour: string;
  url: string;
}

const PARTS = ["waist", "hips"] as const;
const renderQueue: Array<() => Promise<void>> = [];
const renderCache = new Map<string, Promise<RenderResult>>();
let activeRenders = 0;
const MAX_CONCURRENT_BODY_LOADS = 4;

function drainRenderQueue() {
  while (activeRenders < MAX_CONCURRENT_BODY_LOADS && renderQueue.length) {
    const run = renderQueue.shift()!;
    activeRenders += 1;
    void run().finally(() => {
      activeRenders -= 1;
      drainRenderQueue();
    });
  }
}

function queuedRender(scanId: string) {
  const cached = renderCache.get(scanId);
  if (cached) return cached;
  const promise = new Promise<RenderResult>((resolve, reject) => {
    renderQueue.push(async () => {
      try {
        const response = await fetch("/api/try-on-test/sizing-lab/sdk-wear/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId, profile: "browser-comparison" }),
        });
        const payload = await response.json() as RenderResult;
        if (!response.ok || !payload.ok || !payload.artifacts) throw new Error(payload.error || `Blender could not build ${scanId}.`);
        resolve(payload);
      } catch (error) {
        renderCache.delete(scanId);
        reject(error);
      }
    });
    drainRenderQueue();
  });
  renderCache.set(scanId, promise);
  return promise;
}

async function json<Payload>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json() as Payload & { error?: string };
  if (!response.ok || payload.error) throw new Error(payload.error || "The request failed.");
  return payload;
}

function signed(value: number, digits = 1) {
  if (Math.abs(value) < 0.005) return (0).toFixed(digits);
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function LineupBody({ entry, position }: { entry: LineupEntry; position: [number, number, number] }) {
  const gltf = useGLTF(entry.url);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh) || !child.name.startsWith("REAL_WEAR_")) return;
      const tint = (material: Material) => {
        const copy = material.clone() as Material & { color?: Color; roughness?: number };
        copy.color?.set(entry.colour);
        if (copy.roughness != null) copy.roughness = 0.78;
        return copy;
      };
      child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material);
    });
    return clone;
  }, [entry.colour, gltf.scene]);
  return <group position={position}>
    <primitive object={scene} />
    <Html position={[0, Math.max(1.45, entry.heightCm / 100) + 0.08, 0]} center distanceFactor={9} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
      <div className="rounded-md border border-white/20 bg-slate-950/95 px-2 py-1 text-center text-[10px] font-black shadow-lg">
        <span className="block" style={{ color: entry.colour }}>{entry.role}</span>
        <span className="block text-white">{entry.scanId}</span>
      </div>
    </Html>
  </group>;
}

function BodyLineup({ entries, view }: { entries: LineupEntry[]; view: "front" | "side" }) {
  const spacing = 0.78;
  const width = Math.max(2.5, entries.length * spacing);
  const cameraPosition: [number, number, number] = view === "front"
    ? [0, 1.02, Math.max(7, width * 1.05)]
    : [Math.max(7, width * 1.05), 1.02, 0];
  return <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
    <div className="border-b border-slate-800 px-4 py-3 text-white">
      <strong className="block">{view === "front" ? "Front view: all matching bodies" : "Side view: the same matching bodies"}</strong>
      <span className="text-sm text-slate-400">Green is waist. Orange is hips. The curves and A/B points are attached to the real body surface. Drag to inspect.</span>
    </div>
    <div className="h-[620px] w-full">
      <Canvas camera={{ position: cameraPosition, fov: 34, near: 0.01, far: 40 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 5]} intensity={2.1} color="#ffffff" />
        <directionalLight position={[-4, 3, -2]} intensity={1.1} color="#93c5fd" />
        <Suspense fallback={null}>
          {entries.map((entry, index) => <LineupBody key={`${entry.scanId}-${entry.url}`} entry={entry} position={[(index - (entries.length - 1) / 2) * spacing, 0, 0]} />)}
        </Suspense>
        <gridHelper args={[Math.max(5, width + 1), Math.max(10, entries.length * 2), "#334155", "#172033"]} position={[0, -0.01, 0]} />
        <OrbitControls target={[0, 0.88, 0]} enableDamping enablePan minDistance={2.5} maxDistance={18} />
      </Canvas>
    </div>
  </div>;
}

function measurementInches(value: number) {
  return `${(value / 2.54).toFixed(2)} in`;
}

function BodyMeasurements({ scanId, role, render, error, selected }: { scanId: string; role: string; render?: RenderResult; error?: string; selected?: boolean }) {
  const rows = render?.metadata?.crossSections ?? [];
  return <article className={`rounded-2xl border p-4 ${selected ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100" : "border-slate-200 bg-slate-50"}`}>
    <span className="text-xs font-black uppercase tracking-wide text-teal-700">{role}</span>
    <strong className="mt-1 block text-lg">{scanId}</strong>
    {rows.length ? <div className="mt-3 space-y-3">{rows.map((row) => <div key={row.row} className="rounded-xl bg-white p-3 text-xs shadow-sm">
      <strong className="text-sm capitalize">{row.row}</strong>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        <div><dt className="text-slate-500">Straight A–B width</dt><dd className="font-black">{row.straightABWidthCm.toFixed(2)} cm <span className="font-medium text-slate-400">· {measurementInches(row.straightABWidthCm)}</span></dd></div>
        <div><dt className="text-slate-500">Front body curve A→B</dt><dd className="font-black text-teal-700">{row.frontCurvedABCm.toFixed(2)} cm <span className="font-medium text-slate-400">· {measurementInches(row.frontCurvedABCm)}</span></dd></div>
        <div><dt className="text-slate-500">Back body curve B→A</dt><dd className="font-black">{row.backCurvedBACm.toFixed(2)} cm <span className="font-medium text-slate-400">· {measurementInches(row.backCurvedBACm)}</span></dd></div>
        <div><dt className="text-slate-500">Complete mesh loop</dt><dd className="font-black">{row.meshCircumferenceCm.toFixed(2)} cm <span className="font-medium text-slate-400">· {measurementInches(row.meshCircumferenceCm)}</span></dd></div>
      </dl>
    </div>)}</div> : error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">3D body unavailable: {error}</p> : <p className="mt-3 text-sm text-slate-500">Building the real body and attached curves…</p>}
  </article>;
}

function TapeResult({ reveal, selectedScanId, inputScanId }: { reveal: WearRevealResponse; selectedScanId: string; inputScanId: string }) {
  const selected = reveal.candidates.find((candidate) => candidate.scanId === selectedScanId);
  if (!selected) return null;
  const inputRows = selected.tape.rows;
  const candidateTape = (candidate: WearRevealResponse["candidates"][number], part: "waist" | "hips") => (
    candidate.tape.rows.find((row) => row.part === part)
  );
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
    <span className="text-xs font-black uppercase tracking-[.18em] text-emerald-800">Final tape check</span>
    <h2 className="mt-2 text-2xl font-black text-slate-950">Your chosen side body: {selectedScanId}</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">Tape was hidden while you chose the body. It is now open for the selected WEAR person and every front match.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {inputRows.map((row) => <div key={row.part} className="rounded-2xl border border-emerald-200 bg-white p-4">
        <span className="text-xs font-black uppercase text-emerald-800">{inputScanId} · {row.part}</span>
        <strong className="mt-1 block text-2xl">{row.inputCm.toFixed(1)} cm <span className="text-base font-semibold text-slate-400">· {measurementInches(row.inputCm)}</span></strong>
        <span className="text-xs text-slate-500">Recorded WEAR tape</span>
      </div>)}
    </div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-emerald-100/70 text-slate-700"><tr><th className="px-4 py-3">Body part</th><th className="px-4 py-3">Selected person</th><th className="px-4 py-3">Chosen match</th><th className="px-4 py-3">Tape difference</th></tr></thead>
        <tbody>{selected.tape.rows.map((row) => <tr key={row.part} className="border-t border-emerald-100"><td className="px-4 py-4 font-black capitalize">{row.part}</td><td className="px-4 py-4">{row.inputCm.toFixed(1)} cm</td><td className="px-4 py-4">{row.candidateCm.toFixed(1)} cm</td><td className="px-4 py-4 font-black">{signed(row.signedErrorCm)} cm</td></tr>)}</tbody>
      </table>
    </div>
    <p className="mt-4 text-sm font-bold text-slate-800">Average waist + hip tape difference: {selected.tape.meanAbsoluteErrorCm?.toFixed(2) ?? "—"} cm.</p>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-200 bg-white">
      <table className="min-w-[780px] w-full text-left text-sm">
        <thead className="bg-emerald-100/70 text-slate-700"><tr><th className="px-4 py-3">Found person</th><th className="px-4 py-3">Waist tape</th><th className="px-4 py-3">Waist difference</th><th className="px-4 py-3">Hip tape</th><th className="px-4 py-3">Hip difference</th><th className="px-4 py-3">Average difference</th></tr></thead>
        <tbody>{reveal.candidates.map((candidate) => {
          const waist = candidateTape(candidate, "waist");
          const hips = candidateTape(candidate, "hips");
          const chosen = candidate.scanId === selectedScanId;
          return <tr key={candidate.scanId} className={`border-t border-emerald-100 ${chosen ? "bg-amber-50" : ""}`}>
            <td className="px-4 py-4 font-black">{chosen ? "✓ " : ""}{candidate.scanId}</td>
            <td className="px-4 py-4">{waist ? `${waist.candidateCm.toFixed(1)} cm` : "—"}</td>
            <td className="px-4 py-4 font-bold">{waist ? `${signed(waist.signedErrorCm)} cm` : "—"}</td>
            <td className="px-4 py-4">{hips ? `${hips.candidateCm.toFixed(1)} cm` : "—"}</td>
            <td className="px-4 py-4 font-bold">{hips ? `${signed(hips.signedErrorCm)} cm` : "—"}</td>
            <td className="px-4 py-4 font-black">{candidate.tape.meanAbsoluteErrorCm != null ? `${candidate.tape.meanAbsoluteErrorCm.toFixed(2)} cm` : "—"}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}

export function FrontMatchLab() {
  const [people, setPeople] = useState<WearPerson[]>([]);
  const [scanId, setScanId] = useState("");
  const [result, setResult] = useState<WearRankingResponse | null>(null);
  const [tolerance, setTolerance] = useState(1);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [reveal, setReveal] = useState<WearRevealResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "ranking" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Loading WEAR people…");
  const [renders, setRenders] = useState<Record<string, RenderResult>>({});
  const [renderErrors, setRenderErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void json<{ people: WearPerson[] }>("/api/try-on-test/wear-side-selector/candidates").then((payload) => {
      if (cancelled) return;
      setPeople(payload.people);
      setScanId(payload.people.find((person) => person.scanId === "NA-0217-A")?.scanId ?? payload.people[0]?.scanId ?? "");
      setStatus("idle");
      setMessage("");
    }).catch((error) => {
      if (cancelled) return;
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "WEAR people could not be loaded.");
    });
    return () => { cancelled = true; };
  }, []);

  const selectedPerson = people.find((person) => person.scanId === scanId) ?? null;
  const scenario = result?.rings.find((ring) => ring.ring === tolerance) ?? null;
  const shownCandidates = useMemo(() => {
    if (!scenario) return [];
    return scenario.leaderboards.overall.candidateIds.slice(0, 10).flatMap((candidateId) => {
      const candidate = scenario.candidates.find((item) => item.scanId === candidateId);
      return candidate ? [candidate] : [];
    });
  }, [scenario]);
  const shownIds = useMemo(() => shownCandidates.map((candidate) => candidate.scanId), [shownCandidates]);
  const requestedBodyIds = useMemo(
    () => result ? [result.input.scanId, ...shownIds] : [],
    [result, shownIds],
  );

  useEffect(() => {
    if (!requestedBodyIds.length) return;
    let cancelled = false;
    for (const id of requestedBodyIds) {
      void queuedRender(id).then((rendered) => {
        if (!cancelled) setRenders((current) => ({ ...current, [id]: rendered }));
      }).catch((error) => {
        if (!cancelled) setRenderErrors((current) => ({ ...current, [id]: error instanceof Error ? error.message : "Blender render failed." }));
      });
    }
    return () => { cancelled = true; };
  }, [requestedBodyIds]);

  const currentRenderFailures = requestedBodyIds.flatMap((id) => renderErrors[id] ? [{ scanId: id, message: renderErrors[id] }] : []);

  const lineupEntries = useMemo(() => {
    if (!result) return [];
    const inputRender = renders[result.input.scanId];
    const entries: LineupEntry[] = inputRender?.artifacts ? [{ scanId: result.input.scanId, heightCm: result.input.heightCm, role: "INPUT", colour: "#22d3ee", url: inputRender.artifacts.glbUrl }] : [];
    shownCandidates.forEach((candidate, index) => {
      const rendered = renders[candidate.scanId];
      if (!rendered?.artifacts) return;
      entries.push({ scanId: candidate.scanId, heightCm: candidate.heightCm, role: `MATCH ${index + 1}`, colour: selectedScanId === candidate.scanId ? "#fbbf24" : "#cbd5e1", url: rendered.artifacts.glbUrl });
    });
    return entries;
  }, [renders, result, selectedScanId, shownCandidates]);

  async function runRanking() {
    if (!scanId) return;
    setStatus("ranking");
    setMessage("Finding same-gender people by height, weight, waist and hips…");
    setResult(null);
    setSelectedScanId("");
    setReveal(null);
    try {
      const ranked = await json<WearRankingResponse>("/api/try-on-test/wear-front-side-proof/wear-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
      setTolerance(ranked.rings.find((ring) => ring.candidateCount > 0)?.ring ?? 0);
      setResult(ranked);
      setStatus("ready");
      setMessage("Front ranking is ready. Choose a height and weight scenario.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The matching test failed.");
    }
  }

  async function revealTape() {
    if (!result || !selectedScanId || !shownIds.length) return;
    setMessage("Opening the hidden waist and hip tape values for the final check…");
    try {
      const opened = await json<WearRevealResponse>("/api/try-on-test/wear-front-side-proof/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: result.runId, tolerance, displayedCandidateIds: shownIds, selectedScanId }),
      });
      setReveal(opened);
      setMessage("Final tape comparison is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tape comparison failed.");
    }
  }

  function chooseScenario(nextTolerance: number) {
    setTolerance(nextTolerance);
    setSelectedScanId("");
    setReveal(null);
    setMessage("Choose the side body that looks closest.");
  }

  return <main className="min-h-[calc(100vh-64px)] bg-[#f4f7fb] px-4 py-8 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-[1540px] space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="text-xs font-black uppercase tracking-[.22em] text-teal-700">WEAR front → side matching</span>
        <h1 className="mt-2 max-w-5xl text-3xl font-black tracking-tight sm:text-4xl">Choose one WEAR person. Find similar bodies. Then choose the side shape.</h1>
        <p className="mt-3 max-w-5xl text-base leading-7 text-slate-600">This uses your real WEAR 3D bodies. First it filters by height and weight. Then it ranks the matches using only waist and hip front A–B widths. Tape is hidden until you finish choosing.</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid items-end gap-4 lg:grid-cols-[1fr_auto]">
          <label><span className="mb-2 block text-sm font-black text-slate-700">1. Choose a WEAR person</span><select value={scanId} onChange={(event) => { setScanId(event.target.value); setResult(null); setSelectedScanId(""); setReveal(null); }} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-teal-500">{people.map((person) => <option key={person.scanId} value={person.scanId}>{person.scanId} · {person.gender} · {person.heightCm.toFixed(1)} cm · {person.weightKg.toFixed(1)} kg</option>)}</select></label>
          <button type="button" onClick={() => void runRanking()} disabled={!selectedPerson || status === "ranking" || status === "loading"} className="rounded-xl bg-slate-950 px-7 py-3 font-black text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{status === "ranking" ? "Finding matches…" : "Find matches"}</button>
        </div>
        {message ? <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${status === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-slate-100 text-slate-700"}`}>{message}</p> : null}
      </section>

      {result ? <>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <span className="text-xs font-black uppercase tracking-[.18em] text-teal-700">2. Choose height + weight range</span>
          <h2 className="mt-2 text-2xl font-black">Choose one separate height + weight band</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600"><strong>±3 includes only the ±3 band:</strong> the largest height or weight difference is more than 2 and no more than 3. It does not include ±0, ±1 or ±2. This is not waist or hip tolerance.</p>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-11">{result.rings.map((ring) => <button type="button" key={ring.ring} onClick={() => chooseScenario(ring.ring)} className={`rounded-xl border px-2 py-3 text-center transition ${tolerance === ring.ring ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 hover:border-slate-400"}`}><strong className="block text-base">±{ring.ring}</strong><span className="mt-1 block text-[11px] text-slate-500">{ring.candidateCount} people</span></button>)}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="text-xs font-black uppercase tracking-[.18em] text-teal-700">3. Front match</span><h2 className="mt-2 text-2xl font-black">Best {Math.min(10, shownCandidates.length)} people in only the ±{tolerance} band</h2><p className="mt-2 text-sm text-slate-600">Ranked only by waist and hip front A–B widths. Smaller is closer.</p></div><div className="rounded-xl bg-slate-100 px-4 py-3 text-sm"><strong>{result.input.scanId}</strong><span className="ml-2 text-slate-500">{result.input.heightCm.toFixed(1)} cm · {result.input.weightKg.toFixed(1)} kg</span></div></div>
          {shownCandidates.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{shownCandidates.map((candidate, index) => <article key={candidate.scanId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-black uppercase text-teal-700">Front match {index + 1}</span><strong className="mt-1 block text-lg">{candidate.scanId}</strong><p className="mt-2 text-xs text-slate-500">Height {signed(candidate.heightDifferenceCm)} cm · weight {signed(candidate.weightDifferenceKg)} kg</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs">{PARTS.map((part) => <div key={part} className="rounded-lg bg-white p-2"><span className="block capitalize text-slate-500">{part} A–B gap</span><b>{candidate.frontDifferenceCmByPart[part]?.toFixed(2) ?? "—"} cm</b></div>)}</div></article>)}</div> : <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">No same-gender person has both height and weight inside this range. Choose a larger number.</p>}
        </section>

        {shownCandidates.length ? <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <span className="text-xs font-black uppercase tracking-[.18em] text-teal-700">4. Real bodies and real body curves</span><h2 className="mt-2 text-2xl font-black">Front and side views</h2><p className="mt-2 max-w-5xl text-sm leading-6 text-slate-600">Blender cuts each real PLY body at the saved WEAR waist and hip height. Green and orange curves touch the complete body surface. A body already saved in S3 usually loads in 1–3 seconds. A missing browser body takes about 10–15 seconds to prepare.</p>
            <div className="mt-5 space-y-4">
              {lineupEntries.length ? <div className="grid gap-5 xl:grid-cols-2"><BodyLineup entries={lineupEntries} view="front" /><BodyLineup entries={lineupEntries} view="side" /></div> : null}
              {lineupEntries.length + currentRenderFailures.length < requestedBodyIds.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600"><strong className="block text-base text-slate-900">Loading the remaining real bodies…</strong><span className="mt-2 block">{lineupEntries.length} of {requestedBodyIds.length} are ready. Saved S3 bodies load quickly; a body without a saved browser copy takes about 10–15 seconds.</span></div> : currentRenderFailures.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{lineupEntries.length} real 3D bodies are visible. {currentRenderFailures.map((failure) => `${failure.scanId} could not provide a closed waist/hip body curve`).join("; ")}.</div> : <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">All {requestedBodyIds.length} real 3D bodies are visible side by side above.</div>}
            </div>
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><strong>What the numbers mean:</strong> straight A–B is the direct left-to-right width. Front body curve follows the skin from A to B. Back body curve follows the other half. Both curves together make the complete mesh loop.</div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <BodyMeasurements scanId={result.input.scanId} role="Selected WEAR person" render={renders[result.input.scanId]} error={renderErrors[result.input.scanId]} />
              {shownCandidates.map((candidate, index) => <BodyMeasurements key={candidate.scanId} scanId={candidate.scanId} role={`Front match ${index + 1}`} render={renders[candidate.scanId]} error={renderErrors[candidate.scanId]} selected={selectedScanId === candidate.scanId} />)}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <span className="text-xs font-black uppercase tracking-[.18em] text-teal-700">5. Choose the closest side</span><h2 className="mt-2 text-2xl font-black">Choose from the side-view room above</h2><p className="mt-2 text-sm text-slate-600">Look at the side shapes above, then select the matching ID below. Tape stays hidden until you confirm.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{shownCandidates.map((candidate, index) => {
              const chosen = selectedScanId === candidate.scanId;
              const bodyUnavailable = Boolean(renderErrors[candidate.scanId]);
              return <button type="button" key={candidate.scanId} disabled={bodyUnavailable} onClick={() => { setSelectedScanId(candidate.scanId); setReveal(null); setMessage(`${candidate.scanId} selected. Open the final tape check when ready.`); }} className={`rounded-2xl border p-4 text-left transition ${bodyUnavailable ? "cursor-not-allowed border-red-200 bg-red-50 opacity-70" : chosen ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "border-slate-200 bg-white hover:border-slate-400"}`}><div className="flex items-start justify-between"><div><span className="text-xs font-black uppercase text-slate-500">Match {index + 1}</span><strong className="mt-1 block text-lg">{candidate.scanId}</strong></div>{chosen ? <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500 font-black text-white">✓</span> : null}</div><p className="mt-3 text-xs font-semibold text-slate-600">{candidate.heightCm.toFixed(1)} cm · {candidate.weightKg.toFixed(1)} kg</p><span className={`mt-3 inline-block rounded-lg px-3 py-2 text-xs font-black text-white ${bodyUnavailable ? "bg-red-700" : "bg-slate-950"}`}>{bodyUnavailable ? "3D body unavailable" : "Select this side"}</span></button>;
            })}</div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4"><p className="text-sm font-semibold text-slate-700">{selectedScanId ? `${selectedScanId} is selected.` : "Select one side body first."}</p><button type="button" onClick={() => void revealTape()} disabled={!selectedScanId} className="rounded-xl bg-emerald-700 px-6 py-3 font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">Use this side and compare tape</button></div>
          </section>
        </> : null}

        {reveal && selectedScanId ? <TapeResult reveal={reveal} selectedScanId={selectedScanId} inputScanId={result.input.scanId} /> : null}
      </> : null}
    </div>
  </main>;
}
