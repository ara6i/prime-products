"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AIAD_FRAMING_REVISION, AIAD_MEASURES, type AiadMeasure } from "./aiadPreprocessing";
import type { AiadBenchmarkPerson, AiadBenchmarkReport } from "./aiadBenchmarkTypes";
import type { FreshGeometryPrediction } from "./freshGeometryTypes";
import { FreshGeometryResult } from "./FreshGeometryResult";
import { ProductSizeImpactPanel } from "./ProductSizeImpactPanel";
import { BodyTapeComparison } from "./BodyTapeComparison";
import { selectedPersonSizeInput } from "./productSizeImpact";

type Result = FreshGeometryPrediction & { heldout: { person: AiadBenchmarkPerson; actuals: Partial<Record<AiadMeasure, number | null>> } };
const cm = (value: number | null | undefined) => value == null ? "—" : value.toFixed(2);
const pct = (value: number | null | undefined) => value == null ? "—" : `${value.toFixed(1)}%`;

export function AiadBenchmark448Lab() {
  const [models, setModels] = useState<AiadBenchmarkPerson[]>([]);
  const [report, setReport] = useState<AiadBenchmarkReport | null>(null);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"id" | "waist" | "hips">("id");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const predictionRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/try-on-test/wear-photo-test/aiad/benchmark", { cache: "no-store", signal: controller.signal }).then(async (r) => {
      const body = await r.json();
      if (!r.ok || !body.ok || body.models?.length !== 448) throw new Error(body.error ?? "The 448-person cohort is unavailable.");
      setModels(body.models); setReport(body.report);
    }).catch((e) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => () => { predictionRequest.current?.abort(); predictionRequest.current = null; }, []);
  const selectPerson = useCallback(async (scanId: string) => {
    predictionRequest.current?.abort();
    const controller = new AbortController();
    predictionRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), 60_000);
    setSelected(scanId); setBusy(true); setError(null); setResult(null);
    try {
      const r = await fetch("/api/try-on-test/wear-photo-test/aiad", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ heldoutScanId: scanId }), signal: controller.signal });
      const body = await r.json();
      if (!r.ok || !body.ok || body.heldout?.person.scanId !== scanId) throw new Error(body.error ?? "Selected-person inference failed.");
      if (predictionRequest.current === controller && !controller.signal.aborted) setResult(body);
    } catch (e) { if (predictionRequest.current === controller) setError(controller.signal.aborted ? "Person inference timed out. Select the person again to retry." : e instanceof Error ? e.message : "Inference failed."); }
    finally { clearTimeout(timer); if (predictionRequest.current === controller) setBusy(false); }
  }, []);
  const rowsById = useMemo(() => new Map(report?.rows.map((row) => [row.scanId, row]) ?? []), [report]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return models.filter((m) => `${m.scanId} ${m.gender} ${m.heightCm} ${m.weightKg}`.toLowerCase().includes(query)).sort((a, b) => {
      if (sort === "id") return a.scanId.localeCompare(b.scanId);
      const errorFor = (id: string) => { const row = rowsById.get(id), p = row?.predicted[sort], t = row?.actuals[sort]; return p != null && t != null ? Math.abs(p - t) : -1; };
      return errorFor(b.scanId) - errorFor(a.scanId);
    });
  }, [models, rowsById, search, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / 40));
  return <div className="space-y-5" data-testid="aiad-448-lab">
    {report ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950">
      Saved report preprocessing: <code>{report.preprocessing}</code>.
      {report.preprocessing.endsWith(AIAD_FRAMING_REVISION) ? " This saved run uses the current adapter revision." : " This historical report predates our exact-framing/OpenCV parity fixes; its original scores are preserved, not presented as a new run of the corrected adapter."}
      {" "}Selecting a person runs a separate current-adapter diagnostic and does not update the saved table or aggregate metrics. This report is not Aiad’s independently reported benchmark.
    </p> : null}
<section className="rounded-3xl border border-teal-200 bg-teal-50 p-5"><h2 className="text-2xl font-black text-teal-950">{models.length || "Loading"} fixed WEAR test people</h2><p className="mt-2 text-sm leading-6 text-teal-950">This is our independently rerun integration benchmark: existing front-50 renders → thresholded silhouette → Aiad’s frozen ONNX → recorded WEAR tape comparison. No teacher geometry, measured tape, or line positions enter the model. This is not the same as a normal phone-photo segmentation test.</p><p className="mt-2 text-xs leading-5 text-teal-800">No training, tuning or calibration runs here. The cohort has been inspected during earlier project testing; it is not a new pristine blind test. All missing labels and inference failures remain visible.</p></section>
    <section className="overflow-hidden rounded-3xl border border-cyan-200 bg-white" aria-label="Waist confidence bucket benchmark">
      <div className="p-5"><p className="text-xs font-black uppercase tracking-widest text-cyan-700">1 · Shane’s confidence test</p><h3 className="mt-2 text-xl font-black">Can Aiad know when one front photo is risky?</h3><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">Required production proof: BodyM 487 real photos, ranked by predicted waist risk into 50% / 30% / 20%. Aiad supplied only aggregate BodyM results, not the per-person predictions, sigma and tape labels needed to calculate those buckets.</p></div>
      {report?.waistConfidence ? <><p className="mx-5 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Proxy only:</strong> {report.waistConfidence.limitation}</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase"><tr><th className="p-3">Confidence bucket</th><th className="p-3">People</th><th className="p-3">Mean sigma</th><th className="p-3">MAE</th><th className="p-3">Median</th><th className="p-3">P90</th><th className="p-3">P95</th><th className="p-3">Within ½″</th><th className="p-3">Within 1″</th><th className="p-3">BMI mix</th><th className="p-3">Errors &gt;5 cm</th></tr></thead><tbody>{report.waistConfidence.buckets.map(bucket => <tr className="border-t border-slate-100" key={bucket.id}><th className="p-3">{bucket.label}<small className="mt-1 block font-normal text-slate-500">{pct(bucket.sharePct)}</small></th><td className="p-3">{bucket.count}</td><td className="p-3">{cm(bucket.meanSigmaCm)}</td><td className="p-3 font-bold">{cm(bucket.maeCm)}</td><td className="p-3">{cm(bucket.medianCm)}</td><td className="p-3">{cm(bucket.p90Cm)}</td><td className="p-3">{cm(bucket.p95Cm)}</td><td className="p-3">{pct(bucket.withinHalfInchPct)}</td><td className="p-3">{pct(bucket.withinOneInchPct)}</td><td className="min-w-52 p-3 text-xs">&lt;25: {bucket.bmiMix.under25.count} ({pct(bucket.bmiMix.under25.pct)})<br />25–30: {bucket.bmiMix.from25To30.count} ({pct(bucket.bmiMix.from25To30.pct)})<br />30+: {bucket.bmiMix.thirtyPlus.count} ({pct(bucket.bmiMix.thirtyPlus.pct)})</td><td className="p-3 font-bold text-red-700">{bucket.catastrophicAbove5Cm}</td></tr>)}</tbody></table></div></> : <p className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">The installed 448 report has no per-person Aiad sigma yet, so even the clean-render proxy cannot be calculated from that saved file.</p>}
    </section>
    {report ? <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="p-5"><h3 className="text-lg font-black">Completed {report.completed}/448 · failures {report.failures}</h3><p className="mt-1 text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()} · model {report.modelSha256.slice(0, 16)}… · all errors in cm</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase"><tr><th className="p-3">Measure</th><th className="p-3">Labels scored</th><th className="p-3">MAE</th><th className="p-3">Median</th><th className="p-3">P90</th><th className="p-3">P95</th><th className="p-3">Worst</th><th className="p-3">Within ½″</th><th className="p-3">Within 1″</th><th className="p-3">Errors &gt;5 cm</th></tr></thead><tbody>{AIAD_MEASURES.map((kind) => { const m = report.metrics[kind]; return <tr className="border-t border-slate-100" key={kind}><th className="p-3 capitalize">{kind}</th><td className="p-3">{m.count}</td><td className="p-3 font-bold">{cm(m.maeCm)}</td><td className="p-3">{cm(m.medianCm)}</td><td className="p-3">{cm(m.p90Cm)}</td><td className="p-3">{cm(m.p95Cm)}</td><td className="p-3 text-red-700">{cm(m.worstCm)}</td><td className="p-3">{pct(m.withinHalfInchPct)}</td><td className="p-3">{pct(m.withinOneInchPct)}</td><td className="p-3 font-bold text-red-700">{m.catastrophicAbove5Cm}</td></tr>; })}</tbody></table></div></section> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">No completed integration report is installed yet. You can still select any available person and run the frozen model. Aiad’s reported results are not substituted for a missing local run.</p>}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="flex flex-wrap gap-3 p-4"><input aria-label="Search Aiad WEAR people" className="min-w-48 flex-1 rounded-lg border border-slate-300 p-2 text-sm" placeholder="Search scan ID, gender, height…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /><select aria-label="Sort Aiad benchmark" className="rounded-lg border border-slate-300 p-2 text-sm" value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); setPage(0); }}><option value="id">Scan ID</option><option value="waist">Worst waist first</option><option value="hips">Worst hips first</option></select></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase"><tr><th className="p-3">Person · view result</th><th className="p-3">Profile</th><th className="p-3">Waist predicted / tape</th><th className="p-3">Waist Δ</th><th className="p-3">Hips predicted / tape</th><th className="p-3">Hips Δ</th></tr></thead><tbody>{visible.slice(page * 40, (page + 1) * 40).map((m) => { const row = rowsById.get(m.scanId); const delta = (kind: "waist" | "hips") => row?.predicted[kind] != null && row.actuals[kind] != null ? row.predicted[kind]! - row.actuals[kind]! : null; return <tr className={`border-t border-slate-100 ${selected === m.scanId ? "bg-teal-50" : ""}`} key={m.scanId}><th className="p-3"><button type="button" className="font-bold text-teal-800 underline" onClick={() => void selectPerson(m.scanId)}>{m.scanId}</button>{row?.error ? <p className="mt-1 text-xs text-red-700">{row.error}</p> : null}</th><td className="p-3 text-xs">{m.gender} · {m.heightCm.toFixed(1)} cm · {m.weightKg.toFixed(1)} kg</td><td className="p-3">{cm(row?.predicted.waist)} / {cm(row?.actuals.waist)}</td><td className="p-3 font-bold">{cm(delta("waist"))}</td><td className="p-3">{cm(row?.predicted.hips)} / {cm(row?.actuals.hips)}</td><td className="p-3 font-bold">{cm(delta("hips"))}</td></tr>; })}</tbody></table></div><div className="flex justify-between gap-3 border-t p-4 text-sm"><button type="button" disabled={page === 0} className="disabled:opacity-40" onClick={() => setPage((p) => p - 1)}>Previous</button><span>{visible.length} people · page {page + 1}/{pageCount}</span><button type="button" disabled={page + 1 >= pageCount} className="disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>Next</button></div></section>
    {busy ? <p className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm"><Loader2 className="size-4 animate-spin" /> Running {selected} through Aiad ONNX…</p> : null}
    {result ? <BodyTapeComparison input={selectedPersonSizeInput(result, result.heldout.actuals, result.heldout.person.scanId)} actuals={result.heldout.actuals} personLabel={result.heldout.person.scanId} /> : null}
    {result ? <FreshGeometryResult prediction={result} imageUrl={result.heldout.person.imageUrl} actuals={result.heldout.actuals} key={`${result.heldout.person.scanId}:${result.aiad?.manuallyEditedRows?.join(",") ?? "raw"}`} lineEditError={null} lineRecalibrating={false} applyLabel="Apply guide edits only · keep benchmark unchanged" onRecalculateLines={async (lines) => { setResult((current) => current ? { ...current, aiad: current.aiad ? { ...current.aiad, manuallyEditedRows: current.rows.flatMap((r) => lines[r.kind] ? [r.kind] : []) } : undefined, rows: current.rows.map((row) => { const line = lines[row.kind]; return line && row.line ? { ...row, line: { ...row.line, photo: { left: { x: line.leftX, y: line.y }, right: { x: line.rightX, y: line.y } } } } : row; }) } : current); }} /> : null}
    {result ? <ProductSizeImpactPanel key={result.heldout.person.scanId}
      inputs={{ aiad: selectedPersonSizeInput(result, result.heldout.actuals, result.heldout.person.scanId), v8: null }}
      personLabel={result.heldout.person.scanId} gender={result.profile.gender} /> : null}
  </div>;
}
