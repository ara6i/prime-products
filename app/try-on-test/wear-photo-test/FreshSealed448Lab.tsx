"use client";
/* eslint-disable @next/next/no-img-element */

import { AlertTriangle, Check, Database, Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/app/shared/lib/utils";
import type {
  FreshSealedPersonDetail,
  FreshSealedPersonResponse,
  FreshSealedRowName,
  FreshSealedShapePoint,
  FreshSealedSummary,
} from "./freshSealed448Types";

const ROWS: Array<{ kind: FreshSealedRowName; label: string; color: string }> = [
  { kind: "neck", label: "Neck", color: "#14b8a6" },
  { kind: "chest", label: "Chest", color: "#2563eb" },
  { kind: "underbust", label: "Under-bust", color: "#8b5cf6" },
  { kind: "waist", label: "Natural waist", color: "#f59e0b" },
  { kind: "hips", label: "Hips", color: "#ec4899" },
];

function format(value: number | null | undefined, suffix = "", digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : "—";
}

function shapePoints(points: FreshSealedShapePoint[]) {
  if (points.length < 3) return "";
  const xs = points.map((point) => point.x);
  const depths = points.map((point) => point.depth);
  const minimumX = Math.min(...xs);
  const maximumX = Math.max(...xs);
  const minimumDepth = Math.min(...depths);
  const maximumDepth = Math.max(...depths);
  const width = Math.max(0.001, maximumX - minimumX);
  const depth = Math.max(0.001, maximumDepth - minimumDepth);
  return [...points, points[0]!].map((point) => (
    `${12 + ((point.x - minimumX) / width) * 176},${12 + ((point.depth - minimumDepth) / depth) * 116}`
  )).join(" ");
}

function ShapeComparison({ actual, predicted, color }: { actual: FreshSealedShapePoint[]; predicted: FreshSealedShapePoint[]; color: string }) {
  return <svg className="h-36 w-full" viewBox="0 0 200 140">
    <line stroke="#cbd5e1" strokeDasharray="3 3" x1="100" x2="100" y1="6" y2="134" />
    <line stroke="#cbd5e1" strokeDasharray="3 3" x1="6" x2="194" y1="70" y2="70" />
    {actual.length >= 3 ? <polyline fill="none" points={shapePoints(actual)} stroke="#fb923c" strokeWidth="4" /> : null}
    {predicted.length >= 3 ? <polyline fill="none" points={shapePoints(predicted)} stroke={color} strokeWidth="2.5" /> : null}
  </svg>;
}

export function FreshSealed448Lab() {
  const [summary, setSummary] = useState<FreshSealedSummary | null>(null);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [person, setPerson] = useState<FreshSealedPersonDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/try-on-test/wear-photo-test/fresh-sealed-448", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as FreshSealedSummary | { ok: false; error?: string };
        if (!response.ok || !payload.ok) throw new Error("error" in payload ? payload.error ?? "Fresh 448 result failed." : "Fresh 448 result failed.");
        if (!active) return;
        setSummary(payload);
        setSelectedScanId(payload.people.find((candidate) => candidate.scanId === "IT-4028-A")?.scanId ?? payload.people[0]?.scanId ?? "");
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Fresh 448 result failed."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedScanId) return;
    let active = true;
    void fetch(`/api/try-on-test/wear-photo-test/fresh-sealed-448?scanId=${encodeURIComponent(selectedScanId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as FreshSealedPersonResponse | { ok: false; error?: string };
        if (!response.ok || !payload.ok) throw new Error("error" in payload ? payload.error ?? "Could not load this person." : "Could not load this person.");
        if (active) setPerson(payload.person);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Could not load this person."))
    return () => { active = false; };
  }, [selectedScanId]);

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!summary || !query) return summary?.people ?? [];
    return summary.people.filter((candidate) => [candidate.scanId, candidate.subjectId, candidate.gender]
      .some((value) => value.toLowerCase().includes(query)));
  }, [search, summary]);
  const personLoading = Boolean(selectedScanId && person?.scanId !== selectedScanId);

  if (loading) return <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center"><Loader2 className="mx-auto size-8 animate-spin text-cyan-700" /><p className="mt-3 font-black">Loading the frozen 448-person result…</p></section>;
  if (!summary || error) return <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900"><AlertTriangle className="size-6" /><p className="mt-2 font-black">{error ?? "Fresh 448 result is unavailable."}</p></section>;

  return <div className="space-y-5" data-testid="fresh-sealed-448-lab">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><ShieldCheck className="size-5 text-emerald-700" /><p className="mt-2 text-2xl font-black text-emerald-950">448 / 448</p><p className="text-xs text-emerald-700">unique sealed people evaluated</p></div>
      <div className={cn("rounded-2xl border p-4", summary.gates.sealed448Passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}><Check className="size-5" /><p className="mt-2 text-2xl font-black">{summary.gates.sealed448Passed ? "Passed" : "Failed"}</p><p className="text-xs">mean line + waist/hip tape gates</p></div>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><Database className="size-5 text-blue-700" /><p className="mt-2 text-2xl font-black text-blue-950">{format(summary.timing.totalBatchInferenceMs / 1000, " s", 2)}</p><p className="text-xs text-blue-700">all 448 on CPU</p></div>
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-black uppercase text-violet-700">Waist tape MAE</p><p className="mt-2 text-2xl font-black text-violet-950">{format(summary.metrics.rows.waist.tapeCm.mae, " cm")}</p><p className="text-xs text-violet-700">worst {format(summary.metrics.rows.waist.tapeCm.maximum, " cm")}</p></div>
      <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4"><p className="text-xs font-black uppercase text-fuchsia-700">Hip tape MAE</p><p className="mt-2 text-2xl font-black text-fuchsia-950">{format(summary.metrics.rows.hips.tapeCm.mae, " cm")}</p><p className="text-xs text-fuchsia-700">95th percentile {format(summary.metrics.rows.hips.tapeCm.p95, " cm")}</p></div>
    </section>

    <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Final-test contract</p><p className="mt-2 text-sm font-black text-amber-950">Weights were frozen before the 448 answers opened. These people were not used for training or model selection, and this result cannot be used to tune this model.</p><p className="mt-2 text-xs leading-5 text-amber-800">{summary.input.importantLimit} Passing the mean gates does not mean every person is accurate.</p></section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">All 448 aggregate result</p><h2 className="mt-1 text-xl font-black">Fresh ONNX error by body row</h2></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Row</th><th className="px-4 py-3">Y MAE</th><th className="px-4 py-3">Edge MAE</th><th className="px-4 py-3">Width MAE</th><th className="px-4 py-3">Depth MAE</th><th className="px-4 py-3">Tape MAE</th><th className="px-4 py-3">Tape p95</th><th className="px-4 py-3">Worst tape</th><th className="px-4 py-3">Within 3 cm</th></tr></thead><tbody className="divide-y divide-slate-100">{ROWS.map(({ kind, label, color }) => { const row = summary.metrics.rows[kind]; return <tr key={kind}><td className="px-4 py-3 font-black" style={{ color }}>{label}<span className="ml-1 text-[10px] text-slate-400">n={row.tapeCm.count}</span></td><td className="px-4 py-3">{format(row.yPixels.mae, " px")}</td><td className="px-4 py-3">{format(row.edgePixels.mae, " px")}</td><td className="px-4 py-3">{format(row.widthCm.mae, " cm")}</td><td className="px-4 py-3">{format(row.depthCm.mae, " cm")}</td><td className="px-4 py-3 font-black">{format(row.tapeCm.mae, " cm")}</td><td className="px-4 py-3">{format(row.tapeCm.p95, " cm")}</td><td className={cn("px-4 py-3 font-black", (row.tapeCm.maximum ?? 0) > 10 ? "text-red-700" : "text-slate-900")}>{format(row.tapeCm.maximum, " cm")}</td><td className="px-4 py-3">{row.tapeCm.within3Rate == null ? "—" : `${(row.tapeCm.within3Rate * 100).toFixed(1)}%`}</td></tr>; })}</tbody></table></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Select any test person</p><h2 className="mt-1 text-xl font-black">Prediction versus hidden WEAR truth</h2><label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Search className="size-4 text-slate-400" /><input className="min-w-0 flex-1 py-2.5 text-sm font-bold outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search ID or gender" value={search} /></label><select className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" onChange={(event) => setSelectedScanId(event.target.value)} size={12} value={selectedScanId}>{filteredPeople.map((candidate) => <option key={candidate.scanId} value={candidate.scanId}>{candidate.scanId} · {candidate.gender} · tape {format(candidate.meanTapeErrorCm, " cm")}</option>)}</select><p className="mt-2 text-xs font-bold text-slate-500">Showing {filteredPeople.length} of 448 · orange = real · colored = prediction</p></div>
      {personLoading || !person ? <div className="flex min-h-[620px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="size-8 animate-spin text-cyan-700" /></div> : <PersonResult person={person} />}
    </section>
  </div>;
}

function PersonResult({ person }: { person: FreshSealedPersonDetail }) {
  return <div className="space-y-4">
    <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">{person.scanId}</p><p className="mt-1 text-sm font-bold text-slate-600">{person.gender} · {person.heightCm.toFixed(1)} cm · {person.weightKg.toFixed(1)} kg</p><div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-950"><img alt={`${person.scanId} held-out WEAR render`} className="block h-auto w-full" src={person.imageUrl} /><svg className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 1000 1000">{ROWS.flatMap(({ kind, color }) => { const row = person.rows[kind]; if (!row.validGeometry || row.actual.yNorm == null || row.actual.leftXNorm == null || row.actual.rightXNorm == null) return []; return [<g key={kind}><line stroke="#fb923c" strokeWidth="9" x1={row.actual.leftXNorm * 1000} x2={row.actual.rightXNorm * 1000} y1={row.actual.yNorm * 1000} y2={row.actual.yNorm * 1000} /><line stroke={color} strokeWidth="4" x1={row.predicted.leftXNorm * 1000} x2={row.predicted.rightXNorm * 1000} y1={row.predicted.yNorm * 1000} y2={row.predicted.yNorm * 1000} /></g>]; })}</svg></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">Mean tape error</p><p className="font-black">{format(person.meanTapeErrorCm, " cm")}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">Mean line error</p><p className="font-black">{format(person.meanLineErrorPixels, " px")}</p></div></div></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Pred width</th><th className="px-3 py-2">Real width</th><th className="px-3 py-2">Pred depth</th><th className="px-3 py-2">Real depth</th><th className="px-3 py-2">Pred tape</th><th className="px-3 py-2">Real tape</th><th className="px-3 py-2">Tape error</th></tr></thead><tbody className="divide-y divide-slate-100">{ROWS.map(({ kind, label, color }) => { const row = person.rows[kind]; return <tr key={kind}><td className="px-3 py-3 font-black" style={{ color }}>{label}</td><td className="px-3 py-3">{format(row.predicted.widthCm, " cm")}</td><td className="px-3 py-3">{format(row.actual.widthCm, " cm")}</td><td className="px-3 py-3">{format(row.predicted.depthCm, " cm")}</td><td className="px-3 py-3">{format(row.actual.depthCm, " cm")}</td><td className="px-3 py-3 font-black text-cyan-800">{format(row.predicted.tapeCm, " cm")}</td><td className="px-3 py-3 font-black text-orange-700">{format(row.actual.tapeCm, " cm")}</td><td className={cn("px-3 py-3 font-black", (row.errors.tapeCm ?? 0) <= 3 ? "text-emerald-700" : "text-red-700")}>{format(row.errors.tapeCm, " cm")}</td></tr>; })}</tbody></table></div>
    </section>
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{ROWS.map(({ kind, label, color }) => { const row = person.rows[kind]; return <div className="rounded-2xl border border-slate-200 bg-white p-4" key={kind}><p className="text-sm font-black" style={{ color }}>{label}</p><p className="mt-1 text-[11px] text-slate-500">shape error {format(row.errors.shapeCoordinate)}</p><ShapeComparison actual={row.actual.shape ?? []} color={color} predicted={row.predicted.shape} /><p className="text-center text-[10px] font-bold text-slate-500">orange real · color prediction</p></div>; })}</section>
  </div>;
}
