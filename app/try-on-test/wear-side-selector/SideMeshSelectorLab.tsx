"use client";

import { useEffect, useMemo, useState } from "react";
import { SDK_WEAR_PARTS } from "../sizing-lab/sdkWearMatcher";
import { WearBlender3DSection } from "../sdk-wear-mesh/WearBlender3DSection";
import type {
  WearEvaluationMetric,
  WearFrontCandidate,
  WearRankingMode,
  WearRankingResponse,
  WearRevealResponse,
} from "./types";
import { WearFrontSidePreview, WearSingleMeshPreview } from "./WearMeshPreview";
import { WearSizeGuidePanel } from "./WearSizeGuidePanel";

type CatalogPerson = {
  scanId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
};

const LABELS: Record<WearRankingMode, string> = {
  overall: "Overall torso",
  neck: "Neck",
  chest: "Chest",
  underbust: "Underbust",
  waist: "Waist",
  hips: "Hips",
};
const MODES: readonly WearRankingMode[] = ["overall", ...SDK_WEAR_PARTS];
const DEFAULT_VISIBLE = 4;

function signed(value: number) {
  if (Math.abs(value) < 0.0005) return "0.0";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function candidateMetric(candidate: WearFrontCandidate, mode: WearRankingMode) {
  if (mode === "overall") {
    return candidate.overallMeanGapCm == null
      ? "Not eligible"
      : `${candidate.overallMeanGapCm.toFixed(2)} cm mean · ${candidate.overallWorstGapCm?.toFixed(2)} cm worst · ${candidate.overallCoverage} rows`;
  }
  const gap = candidate.frontDifferenceCmByPart[mode];
  return typeof gap === "number" ? `${gap.toFixed(2)} cm front-width gap` : "Row unavailable";
}

function EvaluationTable({ title, metric }: { title: string; metric: WearEvaluationMetric }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <strong className="text-sm text-white">{title}</strong>
        <span className="text-xs text-slate-400">Coverage {metric.coverage}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Input</th>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Signed error</th>
            </tr>
          </thead>
          <tbody>
            {metric.rows.map((row) => (
              <tr key={row.part} className="border-t border-white/5 text-slate-200">
                <td className="px-3 py-2 font-semibold">{LABELS[row.part]}</td>
                <td className="px-3 py-2">{row.inputCm.toFixed(1)} cm</td>
                <td className="px-3 py-2">{row.candidateCm.toFixed(1)} cm</td>
                <td className={`px-3 py-2 font-bold ${Math.abs(row.signedErrorCm) <= 1 ? "text-emerald-300" : "text-orange-300"}`}>
                  {signed(row.signedErrorCm)} cm
                </td>
              </tr>
            ))}
            {!metric.rows.length ? (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">No comparable recorded rows.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 border-t border-white/10 text-xs">
        <span className="px-3 py-2 text-slate-400">
          MAE <strong className="text-white">{metric.meanAbsoluteErrorCm?.toFixed(2) ?? "—"} cm</strong>
        </span>
        <span className="border-l border-white/10 px-3 py-2 text-slate-400">
          Worst row <strong className="text-white">{metric.worstRowErrorCm?.toFixed(2) ?? "—"} cm</strong>
        </span>
      </div>
    </div>
  );
}

export function SideMeshSelectorLab() {
  const [catalog, setCatalog] = useState<CatalogPerson[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogMeta, setCatalogMeta] = useState({ source: 0, usable: 0, excluded: 0, exclusions: [] as string[] });
  const [scanId, setScanId] = useState("");
  const [status, setStatus] = useState<"idle" | "ranking" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WearRankingResponse | null>(null);
  const [ring, setRing] = useState(1);
  const [mode, setMode] = useState<WearRankingMode>("overall");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [reveal, setReveal] = useState<WearRevealResponse | null>(null);
  const [revealStatus, setRevealStatus] = useState<"idle" | "loading" | "error">("idle");
  const [revealError, setRevealError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/try-on-test/wear-side-selector/candidates")
      .then(async (response) => {
        const payload = await response.json() as {
          people?: CatalogPerson[];
          personCount?: number;
          sourceRecordCount?: number;
          excludedPersonCount?: number;
          exclusions?: string[];
          error?: string;
        };
        if (!response.ok || !payload.people) throw new Error(payload.error || "The WEAR catalog could not be loaded.");
        if (cancelled) return;
        setCatalog(payload.people);
        setCatalogMeta({
          source: payload.sourceRecordCount ?? 0,
          usable: payload.personCount ?? payload.people.length,
          excluded: payload.excludedPersonCount ?? 0,
          exclusions: payload.exclusions ?? [],
        });
        const initial = payload.people.find((person) => person.scanId === "NA-0217-A") ?? payload.people[0];
        if (initial) {
          setScanId(initial.scanId);
        }
      })
      .catch((caught) => {
        if (!cancelled) setCatalogError(caught instanceof Error ? caught.message : "The WEAR catalog could not be loaded.");
      });
    return () => { cancelled = true; };
  }, []);

  const selectedCatalogPerson = catalog.find((person) => person.scanId === scanId) ?? null;
  const activeRing = result?.rings.find((item) => item.ring === ring) ?? null;
  const candidateById = useMemo(
    () => new Map((activeRing?.candidates ?? []).map((candidate) => [candidate.scanId, candidate])),
    [activeRing],
  );
  const orderedIds = activeRing?.leaderboards[mode].candidateIds ?? [];
  const displayedIds = orderedIds.slice(0, visibleCount);
  const displayedCandidates = displayedIds.flatMap((id) => {
    const candidate = candidateById.get(id);
    return candidate ? [candidate] : [];
  });

  function activate(nextRing: number, nextMode: WearRankingMode) {
    const next = result?.rings.find((item) => item.ring === nextRing);
    const ids = next?.leaderboards[nextMode].candidateIds ?? [];
    setRing(nextRing);
    setMode(nextMode);
    setVisibleCount(DEFAULT_VISIBLE);
    setSelectedScanId(ids[0] ?? "");
    setReveal(null);
    setRevealStatus("idle");
    setRevealError(null);
  }

  async function runRanking() {
    if (!scanId) return;
    setStatus("ranking");
    setError(null);
    setResult(null);
    setReveal(null);
    try {
      const response = await fetch("/api/try-on-test/wear-side-selector/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
      const payload = await response.json() as WearRankingResponse & { error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Front ranking failed.");
      const firstRing = payload.rings.find((item) => item.leaderboards.overall.candidateIds.length) ?? payload.rings[0];
      setResult(payload);
      setRing(firstRing?.ring ?? 1);
      setMode("overall");
      setVisibleCount(DEFAULT_VISIBLE);
      setSelectedScanId(firstRing?.leaderboards.overall.candidateIds[0] ?? "");
      setStatus("ready");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Front ranking failed.");
    }
  }

  async function revealTruth() {
    if (!result || !selectedScanId || !displayedIds.length) return;
    setRevealStatus("loading");
    setRevealError(null);
    try {
      const response = await fetch("/api/try-on-test/wear-side-selector/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: result.runId,
          ring,
          mode,
          displayedCandidateIds: displayedIds,
          selectedScanId,
        }),
      });
      const payload = await response.json() as WearRevealResponse & { error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Hidden evaluation could not be revealed.");
      setReveal(payload);
      setRevealStatus("idle");
    } catch (caught) {
      setRevealStatus("error");
      setRevealError(caught instanceof Error ? caught.message : "Hidden evaluation could not be revealed.");
    }
  }

  const selectedCandidate = displayedCandidates.find((candidate) => candidate.scanId === selectedScanId) ?? null;
  const selectedEvaluation = reveal?.candidates.find((candidate) => candidate.scanId === selectedScanId) ?? null;

  return (
    <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-8 text-slate-100 sm:px-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">WEAR Test Lab · frozen hidden-truth run</p>
        <h1 className="mt-2 text-3xl font-black text-white">Front ranking → side choice → truth reveal → size-guide impact</h1>
        <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-300">
          One complete page for all usable WEAR people. Front ranking never reads side depth or recorded tape. Every candidate preview is the source PLY processed by headless Blender, at locked centimetre aspect ratio.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">1. Choose the hidden WEAR input</h2>
            <p className="mt-1 text-sm text-slate-400">
              {catalogMeta.usable.toLocaleString()} usable of {catalogMeta.source.toLocaleString()} records · {catalogMeta.excluded} excluded
            </p>
            {catalogMeta.exclusions.map((item) => <p key={item} className="mt-1 text-xs text-amber-200">{item}</p>)}
          </div>
          <div className="min-w-[280px] flex-1 lg:max-w-2xl">
            <label htmlFor="wear-model-select" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
              All {catalog.length.toLocaleString()} usable WEAR models
            </label>
            <select
              id="wear-model-select"
              value={scanId}
              onChange={(event) => setScanId(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-white"
            >
              {!catalog.length ? <option value="">Loading all WEAR models…</option> : null}
              {catalog.map((person) => (
                <option key={person.scanId} value={person.scanId}>
                  {person.scanId} · {person.gender} · {person.heightCm.toFixed(1)} cm · {person.weightKg.toFixed(1)} kg
                </option>
              ))}
            </select>
            {selectedCatalogPerson ? (
              <p className="mt-2 text-sm text-cyan-100">
                Selected: <strong>{selectedCatalogPerson.scanId}</strong> · {selectedCatalogPerson.gender} · {selectedCatalogPerson.heightCm.toFixed(1)} cm · {selectedCatalogPerson.weightKg.toFixed(1)} kg
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void runRanking()}
            disabled={!scanId || status === "ranking"}
            className="rounded-xl bg-cyan-300 px-5 py-3 font-black text-slate-950 disabled:opacity-50"
          >
            {status === "ranking" ? "Freezing front ranking…" : "Run front ranking"}
          </button>
        </div>
        {catalogError || error ? <p className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">{catalogError ?? error}</p> : null}
      </section>

      {result ? (
        <>
          <section className="grid gap-4 rounded-2xl border border-cyan-400/30 bg-cyan-950/10 p-5 lg:grid-cols-[340px_1fr]">
            <div>
              <h2 className="text-xl font-bold text-white">2. Frozen front result</h2>
              <p className="mt-1 text-sm text-slate-400">Input {result.input.scanId} · {result.input.heightCm.toFixed(1)} cm · {result.input.weightKg.toFixed(1)} kg</p>
              <p className="mt-2 text-xs leading-5 text-cyan-100">{result.rankingBoundary}</p>
              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Global front winner</span>
                <strong className="mt-1 block text-xl text-white">{result.globalFrontWinner?.scanId ?? "No eligible winner"}</strong>
                {result.globalFrontWinner ? <span className="text-xs text-slate-300">Ring ±{result.globalFrontWinner.ring} · {result.globalFrontWinner.overallMeanGapCm.toFixed(2)} cm mean · {result.globalFrontWinner.overallWorstGapCm.toFixed(2)} cm worst</span> : null}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Input real front mesh only — side remains locked</p>
              <WearSingleMeshPreview runId={result.runId} scanId={result.input.scanId} view="front" className="h-[420px]" />
            </div>
          </section>

          <section className="rounded-2xl border border-orange-400/30 bg-slate-900/70 p-5">
            <h2 className="text-xl font-bold text-white">3. Inspect a ring and choose one complete person</h2>
            <p className="mt-1 text-sm text-slate-400">Rings are exclusive, not cumulative. A person appears once based on the larger absolute height/weight difference.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
              {result.rings.map((item) => (
                <button
                  type="button"
                  key={item.ring}
                  onClick={() => activate(item.ring, mode)}
                  className={`rounded-lg border px-2 py-3 ${ring === item.ring ? "border-cyan-200 bg-cyan-300 text-slate-950" : "border-slate-700 bg-slate-950 text-white"}`}
                >
                  <strong className="block">±{item.ring}</strong>
                  <span className="text-xs">{item.candidateCount} people</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {MODES.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => activate(ring, item)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${mode === item ? "border-orange-200 bg-orange-300 text-slate-950" : "border-slate-600 bg-slate-950 text-slate-300"}`}
                >
                  {LABELS[item]}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Active ring: {activeRing?.label} cm/kg · {LABELS[mode]} leaderboard · rank #1 is marked and preselected. Overall uses fixed rows {result.input.overallRows.map((part) => LABELS[part]).join(", ")} ({result.input.overallCoverage}).
            </p>

            {displayedCandidates.length ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {displayedCandidates.map((candidate, index) => (
                  <article key={candidate.scanId} className={`rounded-xl border p-3 ${selectedScanId === candidate.scanId ? "border-orange-300 bg-orange-400/10" : "border-slate-700 bg-slate-950"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Front rank #{index + 1}</span>
                        <strong className="mt-1 block text-lg text-white">{candidate.scanId}</strong>
                        <span className="text-xs text-slate-400">{candidateMetric(candidate, mode)}</span>
                      </div>
                      {index === 0 ? <span className="rounded-full bg-emerald-300 px-2 py-1 text-xs font-black text-slate-950">AUTO BEST</span> : null}
                    </div>
                    <div className="mt-3">
                      <WearFrontSidePreview runId={result.runId} scanId={candidate.scanId} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                      <span>{candidate.heightCm.toFixed(1)} cm ({signed(candidate.heightDifferenceCm)}) · {candidate.weightKg.toFixed(1)} kg ({signed(candidate.weightDifferenceKg)})</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedScanId(candidate.scanId); setReveal(null); }}
                        className={`rounded-lg px-3 py-2 font-black ${selectedScanId === candidate.scanId ? "bg-orange-300 text-slate-950" : "border border-cyan-400 text-cyan-100"}`}
                      >
                        {selectedScanId === candidate.scanId ? "Selected" : "Choose this person"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="mt-5 rounded-xl border border-dashed border-slate-600 p-6 text-center text-slate-400">No eligible person in this exact ring and leaderboard.</p>}

            {orderedIds.length > visibleCount ? (
              <button type="button" onClick={() => setVisibleCount((count) => count + DEFAULT_VISIBLE)} className="mt-4 rounded-lg border border-slate-500 px-4 py-2 text-sm font-bold text-white">
                Show more in rank order ({Math.min(DEFAULT_VISIBLE, orderedIds.length - visibleCount)} more)
              </button>
            ) : null}
            {selectedScanId ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-300/30 bg-orange-400/10 p-4">
                <p className="text-sm"><strong className="text-white">{selectedScanId}</strong> will remain the user-selected body. Oracle checks will not replace it.</p>
                <button type="button" onClick={() => void revealTruth()} disabled={revealStatus === "loading"} className="rounded-lg bg-orange-300 px-5 py-3 font-black text-slate-950 disabled:opacity-50">
                  {revealStatus === "loading" ? "Opening hidden truth…" : "Lock selection and reveal"}
                </button>
              </div>
            ) : null}
            {revealError ? <p className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">{revealError}</p> : null}
          </section>

          {reveal && selectedCandidate && selectedEvaluation ? (
            <section className="space-y-5 rounded-2xl border border-emerald-400/30 bg-emerald-950/10 p-5">
              <div>
                <h2 className="text-xl font-bold text-white">4. Final results — hidden truth revealed</h2>
                <p className="mt-1 text-sm text-slate-300">{reveal.validationBoundary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Global front winner", reveal.globalFrontWinner?.scanId ?? "—"],
                  ["Your selected body", reveal.selectedScanId],
                  ["Oracle side winner", reveal.oracleSideWinnerScanId ?? "No comparable rows"],
                  ["Oracle tape winner", reveal.oracleTapeWinnerScanId ?? "No comparable rows"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-slate-950 p-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
                    <strong className="mt-1 block text-lg text-white">{value}</strong>
                  </div>
                ))}
              </div>

              <WearBlender3DSection
                key={`${result.runId}-${selectedCandidate.scanId}`}
                scanId={result.input.scanId}
                heightCm={result.input.heightCm}
                matchedScanId={selectedCandidate.scanId}
                matchedHeightCm={selectedCandidate.heightCm}
                inputRoleLabel="Hidden input"
                matchedRoleLabel="User selected"
                autoRender
                preferredView="side"
                title="Real PLY front + side comparison"
                description="Both full source PLY bodies now appear together. Front and side each support side-by-side and overlay at one locked centimetre scale."
              />

              <div className="grid gap-4 xl:grid-cols-2">
                <EvaluationTable title={`${selectedScanId} side-depth validation`} metric={selectedEvaluation.side} />
                <EvaluationTable title={`${selectedScanId} recorded-tape validation`} metric={selectedEvaluation.tape} />
              </div>
              <details className="rounded-xl border border-white/10 bg-slate-950 p-4">
                <summary className="cursor-pointer font-bold text-white">All displayed candidates: side and tape evaluation</summary>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {reveal.candidates.flatMap((candidate) => [
                    <EvaluationTable key={`${candidate.scanId}-side`} title={`${candidate.scanId} · side depth`} metric={candidate.side} />,
                    <EvaluationTable key={`${candidate.scanId}-tape`} title={`${candidate.scanId} · recorded tape`} metric={candidate.tape} />,
                  ])}
                </div>
              </details>

              <WearSizeGuidePanel runId={result.runId} selectedScanId={selectedScanId} />
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
