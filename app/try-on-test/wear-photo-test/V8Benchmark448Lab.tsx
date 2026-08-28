"use client";
/* eslint-disable @next/next/no-img-element */

import { AlertTriangle, Check, Database, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/app/shared/lib/utils";
import type {
  V8BenchmarkPersonDetail,
  V8BenchmarkPersonResponse,
  V8BenchmarkRowName,
  V8BenchmarkShapePoint,
  V8BenchmarkSummary,
} from "./v8Benchmark448Types";

const ENDPOINT = "/api/try-on-test/wear-photo-test/v8-benchmark-448";
const ROWS: Array<{ kind: V8BenchmarkRowName; label: string; color: string }> = [
  { kind: "waist", label: "Natural waist", color: "#0891b2" },
  { kind: "hips", label: "Hips", color: "#db2777" },
];

function format(value: number | null | undefined, suffix = "", digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : "—";
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const payload = await response.json() as T | { ok: false; error?: string };
    if (!response.ok || !(payload as { ok?: boolean }).ok) {
      throw new Error("error" in (payload as { error?: string })
        ? (payload as { error?: string }).error ?? "The V8 benchmark request failed."
        : "The V8 benchmark request failed.");
    }
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The V8 benchmark request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function shapePoints(points: V8BenchmarkShapePoint[]) {
  if (points.length < 3) return "";
  return [...points, points[0]!].map((point) => {
    const x = 12 + ((point.x + 1) / 2) * 176;
    const y = 70 - point.depth * 58;
    return `${x},${y}`;
  }).join(" ");
}

function ShapeComparison({ actual, predicted, color }: {
  actual: V8BenchmarkShapePoint[];
  predicted: V8BenchmarkShapePoint[];
  color: string;
}) {
  return <svg aria-label="Predicted and real cross-section" className="h-40 w-full" viewBox="0 0 200 140">
    <line stroke="#cbd5e1" strokeDasharray="3 3" x1="100" x2="100" y1="6" y2="134" />
    <line stroke="#cbd5e1" strokeDasharray="3 3" x1="6" x2="194" y1="70" y2="70" />
    {actual.length >= 3 ? <polyline fill="none" points={shapePoints(actual)} stroke="#f97316" strokeWidth="4" /> : null}
    {predicted.length >= 3 ? <polyline fill="none" points={shapePoints(predicted)} stroke={color} strokeWidth="2.5" /> : null}
  </svg>;
}

export function V8Benchmark448Lab() {
  const [summary, setSummary] = useState<V8BenchmarkSummary | null>(null);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [person, setPerson] = useState<V8BenchmarkPersonDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchJson<V8BenchmarkSummary>(ENDPOINT)
      .then((payload) => {
        if (!active) return;
        setSummary(payload);
        setSelectedScanId(payload.people.find((candidate) => candidate.scanId === "IT-4028-A")?.scanId ?? payload.people[0]?.scanId ?? "");
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "The V8 benchmark failed."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedScanId) return;
    let active = true;
    void fetchJson<V8BenchmarkPersonResponse>(`${ENDPOINT}?scanId=${encodeURIComponent(selectedScanId)}`)
      .then((payload) => active && setPerson(payload.person))
      .catch((cause) => active && setDetailError(cause instanceof Error ? cause.message : "Could not load this person."));
    return () => { active = false; };
  }, [selectedScanId]);

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!summary || !query) return summary?.people ?? [];
    return summary.people.filter((candidate) => [candidate.scanId, candidate.subjectId, candidate.gender]
      .some((value) => value.toLowerCase().includes(query)));
  }, [search, summary]);
  const personLoading = Boolean(selectedScanId && person?.scanId !== selectedScanId && !detailError);

  if (loading) {
    return <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
      <Loader2 className="mx-auto size-8 animate-spin text-orange-700" />
      <p className="mt-3 font-black">Loading the completed V8 448 benchmark…</p>
    </section>;
  }
  if (!summary || error) {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900">
      <AlertTriangle className="size-6" />
      <p className="mt-2 font-black">{error ?? "The V8 448 benchmark is unavailable."}</p>
    </section>;
  }

  return <div className="space-y-5" data-testid="v8-benchmark-448-lab">
    <section className="rounded-3xl border-2 border-red-300 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <X className="mt-0.5 size-7 shrink-0 text-red-700" />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Completed result · not an estimate</p>
          <h2 className="mt-1 text-2xl font-black text-red-950">V8 is not okay on the 448-person benchmark.</h2>
          <p className="mt-2 text-sm leading-6 text-red-900">Waist failed. Hips has a useful average tape error, but it still failed because the predicted hip shapes do not vary correctly across people. Do not publish this model as accurate.</p>
        </div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><Database className="size-5 text-emerald-700" /><p className="mt-2 text-2xl font-black text-emerald-950">448 / 448</p><p className="text-xs text-emerald-700">people evaluated successfully</p></div>
      <GateCard label="Waist gate" passed={summary.gates.rows.waist} />
      <GateCard label="Hip gate" passed={summary.gates.rows.hips} />
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-black uppercase text-violet-700">Waist tape</p><p className="mt-2 text-2xl font-black text-violet-950">{format(summary.metrics.rows.waist.tapeCm.mae, " cm")}</p><p className="text-xs text-violet-700">P95 {format(summary.metrics.rows.waist.tapeCm.p95, " cm")} · worst {format(summary.metrics.rows.waist.tapeCm.maximum, " cm")}</p></div>
      <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4"><p className="text-xs font-black uppercase text-fuchsia-700">Hip tape</p><p className="mt-2 text-2xl font-black text-fuchsia-950">{format(summary.metrics.rows.hips.tapeCm.mae, " cm")}</p><p className="text-xs text-fuchsia-700">P95 {format(summary.metrics.rows.hips.tapeCm.p95, " cm")} · worst {format(summary.metrics.rows.hips.tapeCm.maximum, " cm")}</p></div>
    </section>

    <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Honest 448-person boundary</p>
      <p className="mt-2 text-sm font-black text-amber-950">These 448 people were not used to train V8 and were not used to select V8&apos;s checkpoint.</p>
      <p className="mt-2 text-xs leading-5 text-amber-900">Their answers had already been opened during older model testing on August 24, so this is a fixed independent benchmark for V8—not a pristine, never-viewed final test. {summary.input.importantLimit}</p>
    </section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">All 448 aggregate result</p>
        <h2 className="mt-1 text-xl font-black">V8 prediction versus WEAR truth</h2>
        <p className="mt-1 text-xs text-slate-500">CPU inference for all people: {format(summary.timing.totalBatchInferenceMs / 1000, " s")} · model SHA {summary.model.sha256.slice(0, 12)}…</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Row</th><th className="px-4 py-3">Gate</th><th className="px-4 py-3">Y MAE</th><th className="px-4 py-3">Edge MAE</th><th className="px-4 py-3">Width MAE</th><th className="px-4 py-3">Depth MAE</th><th className="px-4 py-3">Tape MAE</th><th className="px-4 py-3">Tape P95</th><th className="px-4 py-3">Worst tape</th><th className="px-4 py-3">Shape R²</th><th className="px-4 py-3">Shape variance</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{ROWS.map(({ kind, label, color }) => {
            const row = summary.metrics.rows[kind];
            return <tr key={kind}><td className="px-4 py-3 font-black" style={{ color }}>{label}</td><td className={cn("px-4 py-3 font-black", summary.gates.rows[kind] ? "text-emerald-700" : "text-red-700")}>{summary.gates.rows[kind] ? "PASS" : "FAIL"}</td><td className="px-4 py-3">{format(row.yPixels.mae, " px")}</td><td className="px-4 py-3">{format(row.edgePixels.mae, " px")}</td><td className="px-4 py-3">{format(row.widthCm.mae, " cm")}</td><td className="px-4 py-3">{format(row.depthCm.mae, " cm")}</td><td className="px-4 py-3 font-black">{format(row.tapeCm.mae, " cm")}</td><td className="px-4 py-3">{format(row.tapeCm.p95, " cm")}</td><td className="px-4 py-3 font-black text-red-700">{format(row.tapeCm.maximum, " cm")}</td><td className="px-4 py-3">{format(row.shapeCoordinate.rSquared, "", 3)}</td><td className="px-4 py-3">{format(row.shapeCoordinate.betweenPersonVarianceRatio, "", 3)}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">Inspect any benchmark person</p>
        <h2 className="mt-1 text-xl font-black">Prediction versus WEAR truth</h2>
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Search className="size-4 text-slate-400" /><input className="min-w-0 flex-1 py-2.5 text-sm font-bold outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search ID or gender" type="search" value={search} /></label>
        <select className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" onChange={(event) => { setDetailError(null); setSelectedScanId(event.target.value); }} size={14} value={selectedScanId}>{filteredPeople.map((candidate) => <option key={candidate.scanId} value={candidate.scanId}>{candidate.scanId} · {candidate.gender} · mean tape {format(candidate.meanTapeErrorCm, " cm")}</option>)}</select>
        <p className="mt-2 text-xs font-bold text-slate-500">Showing {filteredPeople.length} of 448 · orange = WEAR truth · color = V8</p>
      </div>
      {detailError ? <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900"><AlertTriangle className="size-6" /><p className="mt-2 font-black">{detailError}</p></section> : personLoading || !person ? <div className="flex min-h-[620px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="size-8 animate-spin text-orange-700" /></div> : <PersonResult person={person} />}
    </section>
  </div>;
}

function GateCard({ label, passed }: { label: string; passed: boolean }) {
  return <div className={cn("rounded-2xl border p-4", passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
    {passed ? <Check className="size-5 text-emerald-700" /> : <X className="size-5 text-red-700" />}
    <p className={cn("mt-2 text-2xl font-black", passed ? "text-emerald-950" : "text-red-950")}>{passed ? "PASS" : "FAIL"}</p>
    <p className={cn("text-xs", passed ? "text-emerald-700" : "text-red-700")}>{label}</p>
  </div>;
}

function PersonResult({ person }: { person: V8BenchmarkPersonDetail }) {
  return <div className="space-y-4">
    <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">{person.scanId}</p>
        <p className="mt-1 text-sm font-bold text-slate-600">{person.gender} · {person.heightCm.toFixed(1)} cm · {person.weightKg.toFixed(1)} kg</p>
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-950">
          <img alt={`${person.scanId} WEAR front render`} className="block h-auto w-full" src={person.imageUrl} />
          <svg className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 192 256">{ROWS.map(({ kind, color }) => {
            const row = person.rows[kind];
            return <g key={kind}><line stroke="#f97316" strokeWidth="3.5" x1={row.actual.leftXNorm * 192} x2={row.actual.rightXNorm * 192} y1={row.actual.yNorm * 256} y2={row.actual.yNorm * 256} /><line stroke={color} strokeWidth="1.8" x1={row.predicted.leftXNorm * 192} x2={row.predicted.rightXNorm * 192} y1={row.predicted.yNorm * 256} y2={row.predicted.yNorm * 256} /></g>;
          })}</svg>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center"><MetricChip label="Mean tape" value={format(person.meanTapeErrorCm, " cm")} /><MetricChip label="Worst tape" value={format(person.worstTapeErrorCm, " cm")} /><MetricChip label="Mean edge" value={format(person.meanLineErrorPixels, " px")} /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Pred width</th><th className="px-3 py-2">Real width</th><th className="px-3 py-2">Pred depth</th><th className="px-3 py-2">Real depth</th><th className="px-3 py-2">Pred tape</th><th className="px-3 py-2">Real tape</th><th className="px-3 py-2">Tape error</th><th className="px-3 py-2">Y error</th></tr></thead><tbody className="divide-y divide-slate-100">{ROWS.map(({ kind, label, color }) => {
          const row = person.rows[kind];
          return <tr key={kind}><td className="px-3 py-3 font-black" style={{ color }}>{label}</td><td className="px-3 py-3">{format(row.predicted.widthCm, " cm")}</td><td className="px-3 py-3">{format(row.actual.widthCm, " cm")}</td><td className="px-3 py-3">{format(row.predicted.depthCm, " cm")}</td><td className="px-3 py-3">{format(row.actual.depthCm, " cm")}</td><td className="px-3 py-3 font-black text-cyan-800">{format(row.predicted.tapeCm, " cm")}</td><td className="px-3 py-3 font-black text-orange-700">{format(row.actual.tapeCm, " cm")}</td><td className={cn("px-3 py-3 font-black", (row.errors.tapeCm ?? Number.POSITIVE_INFINITY) <= 1.27 ? "text-emerald-700" : "text-red-700")}>{format(row.errors.tapeCm, " cm")}</td><td className="px-3 py-3">{format(row.errors.yPixels, " px")}</td></tr>;
        })}</tbody></table>
      </div>
    </section>
    <section className="grid gap-3 md:grid-cols-2">{ROWS.map(({ kind, label, color }) => {
      const row = person.rows[kind];
      return <div className="rounded-2xl border border-slate-200 bg-white p-4" key={kind}><div className="flex items-center justify-between gap-2"><p className="text-sm font-black" style={{ color }}>{label} 32-point cross-section</p><p className="text-[11px] font-bold text-slate-500">shape error {format(row.errors.shapeCoordinate, "", 3)}</p></div><ShapeComparison actual={row.actual.shape} color={color} predicted={row.predicted.shape} /><p className="text-center text-[10px] font-bold text-slate-500">orange = real WEAR shape · color = V8 prediction</p></div>;
    })}</section>
  </div>;
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">{label}</p><p className="font-black">{value}</p></div>;
}
