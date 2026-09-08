"use client";

import { useEffect, useMemo, useState } from "react";

type Axis = "waist" | "hips" | "both";
type Counts = {
  denominator: number;
  sameSize: number;
  sizeUp: number;
  sizeDown: number;
  changedUnordered: number;
  noRecommendation: number;
  agreementPct: number | null;
};
type Scenario = Counts & { kind: "sweep" | "custom"; axis: Axis; deltaCm: number };
type ProductResult = {
  id: string;
  title: string;
  slot: string;
  tapeFields: string[];
  orderedStockedSizes: string[];
  referenceSize: string;
  candidateSize: string | null;
  outcome: string;
  nearestBoundary: { field: string; edge: string; boundaryCm: number; inputCm: number; distanceCm: number } | null;
  charts: Array<{ label: string; unit: string; headers: string[]; rows: string[][] }>;
};
type SizeImpact = {
  ok: true;
  catalog: {
    sha256: string;
    snapshotAt: string;
    sourceCount: number;
    qualifiedCount: number;
    genderProductCount: number;
    eligibility: string;
  };
  input: {
    inputTape: { waist?: number; hips?: number };
    candidateTape: { waist?: number; hips?: number };
    manualAxis: Axis;
    manualDeltaCm: number;
    gapCm: number;
    gapAxis: Axis;
    targetPct: number;
  };
  actual: Counts;
  scenarios: Scenario[];
  nearestBoundary: { productId: string; title: string; field: string; edge: string; boundaryCm: number; inputCm: number; distanceCm: number } | null;
  products: ProductResult[];
  gapSimulation: {
    gapCm: number;
    gapAxis: Axis;
    errorAxis: Axis;
    targetPct: number;
    scenarios: Array<Counts & { deltaCm: number; unaffected: number }>;
    sweetSpotMaxAbsErrorCm: number | null;
    passesBothDirections: boolean;
    assumption: string;
  };
  percentageMeaning: string;
};

function percentage(value: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function CountsCard({ counts }: { counts: Counts }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {[
        ["Exact same", counts.sameSize],
        ["Size up", counts.sizeUp],
        ["Size down", counts.sizeDown],
        ["No recommendation", counts.noRecommendation],
        ["Unordered change", counts.changedUnordered],
        ["Denominator", counts.denominator],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
          <strong className="block text-lg text-white">{value}</strong>
          <span className="text-xs text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function WearSizeGuidePanel({ runId, selectedScanId }: { runId: string; selectedScanId: string }) {
  const [manualAxis, setManualAxis] = useState<Axis>("both");
  const [manualDeltaCm, setManualDeltaCm] = useState(0.5);
  const [gapCm, setGapCm] = useState(4);
  const [gapAxis, setGapAxis] = useState<Axis>("both");
  const [targetPct, setTargetPct] = useState(90);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SizeImpact | null>(null);
  const [shownProducts, setShownProducts] = useState(12);

  async function run() {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/try-on-test/wear-side-selector/size-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, manualAxis, manualDeltaCm, gapCm, gapAxis, targetPct }),
      });
      const payload = await response.json() as SizeImpact & { error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Size-guide analysis failed.");
      setResult(payload);
      setStatus("ready");
      setShownProducts(12);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Size-guide analysis failed.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void run(), 0);
    // A new frozen selection must calculate its actual result immediately.
    // Control changes are applied only when the user presses recalculate.
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, selectedScanId]);

  const sweep = useMemo(() => result?.scenarios
    .filter((scenario) => scenario.kind === "sweep")
    .sort((left, right) => left.deltaCm - right.deltaCm) ?? [], [result]);
  const custom = result?.scenarios.find((scenario) => scenario.kind === "custom") ?? null;

  return (
    <section className="space-y-4 rounded-xl border border-violet-400/30 bg-violet-950/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">5. MyAIFitting waist/hip product-size agreement</h3>
          <p className="mt-1 max-w-4xl text-sm text-slate-300">
            The reference size comes from the hidden input&apos;s recorded tape. The comparison size comes from {selectedScanId}&apos;s recorded tape on the exact same frozen numeric chart and stocked sizes.
          </p>
        </div>
        <button type="button" onClick={() => void run()} disabled={status === "loading"} className="rounded-lg bg-violet-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">
          {status === "loading" ? "Calculating every chart…" : "Recalculate"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-xs text-slate-400">Error rows
          <select value={manualAxis} onChange={(event) => setManualAxis(event.target.value as Axis)} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            <option value="waist">Waist</option><option value="hips">Hips</option><option value="both">Waist + hips</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">Custom signed error cm
          <input type="number" step="0.1" min="-30" max="30" value={manualDeltaCm} onChange={(event) => setManualDeltaCm(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="text-xs text-slate-400">Adjacent-size spacing cm
          <input type="number" step="0.1" min="0.1" max="30" value={gapCm} onChange={(event) => setGapCm(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="text-xs text-slate-400">Gap applies to
          <select value={gapAxis} onChange={(event) => setGapAxis(event.target.value as Axis)} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            <option value="waist">Waist</option><option value="hips">Hips</option><option value="both">Waist + hips</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">Agreement target %
          <input type="number" step="0.1" min="0" max="100" value={targetPct} onChange={(event) => setTargetPct(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
      </div>

      {error ? <p className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}
      {result ? (
        <>
          <div className="rounded-xl border border-cyan-400/20 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Actual selected-candidate result</span>
                <strong className="mt-1 block text-3xl text-white">{percentage(result.actual.agreementPct)}</strong>
                <span className="text-xs text-slate-400">exact product-size agreement · {result.actual.sameSize} / {result.actual.denominator}</span>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Input waist/hips: {result.input.inputTape.waist ?? "—"} / {result.input.inputTape.hips ?? "—"} cm</p>
                <p>Selected waist/hips: {result.input.candidateTape.waist ?? "—"} / {result.input.candidateTape.hips ?? "—"} cm</p>
                <p className="font-bold text-orange-200">
                  Signed errors: waist {typeof result.input.inputTape.waist === "number" && typeof result.input.candidateTape.waist === "number"
                    ? `${result.input.candidateTape.waist - result.input.inputTape.waist > 0 ? "+" : ""}${(result.input.candidateTape.waist - result.input.inputTape.waist).toFixed(1)} cm`
                    : "—"} · hips {typeof result.input.inputTape.hips === "number" && typeof result.input.candidateTape.hips === "number"
                    ? `${result.input.candidateTape.hips - result.input.inputTape.hips > 0 ? "+" : ""}${(result.input.candidateTape.hips - result.input.inputTape.hips).toFixed(1)} cm`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="mt-3"><CountsCard counts={result.actual} /></div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
              <div className="border-b border-white/10 px-3 py-2"><strong className="text-white">Manual 0 to ±7 cm error sweep</strong></div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">Error</th><th>Agreement</th><th>Same</th><th>Up</th><th>Down</th><th>No rec.</th><th>Denominator</th></tr></thead>
                  <tbody>{sweep.map((scenario) => <tr key={scenario.deltaCm} className="border-t border-white/5"><td className="px-3 py-2 font-bold">{scenario.deltaCm > 0 ? "+" : ""}{scenario.deltaCm} cm</td><td>{percentage(scenario.agreementPct)}</td><td>{scenario.sameSize}</td><td>{scenario.sizeUp}</td><td>{scenario.sizeDown}</td><td>{scenario.noRecommendation}</td><td>{scenario.denominator}</td></tr>)}</tbody>
                </table>
              </div>
              {custom ? <p className="border-t border-white/10 px-3 py-2 text-sm">Custom {custom.deltaCm > 0 ? "+" : ""}{custom.deltaCm} cm: <strong>{percentage(custom.agreementPct)}</strong> ({custom.sameSize}/{custom.denominator})</p> : null}
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
              <div className="border-b border-white/10 px-3 py-2"><strong className="text-white">Editable adjacent-size gap simulation</strong></div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">Error</th><th>Agreement</th><th>Same</th><th>Up</th><th>Down</th><th>Denominator</th></tr></thead>
                  <tbody>{result.gapSimulation.scenarios.sort((left, right) => left.deltaCm - right.deltaCm).map((scenario) => <tr key={scenario.deltaCm} className="border-t border-white/5"><td className="px-3 py-2 font-bold">{scenario.deltaCm > 0 ? "+" : ""}{scenario.deltaCm} cm</td><td>{percentage(scenario.agreementPct)}</td><td>{scenario.sameSize}</td><td>{scenario.sizeUp}</td><td>{scenario.sizeDown}</td><td>{scenario.denominator}</td></tr>)}</tbody>
                </table>
              </div>
              <div className={`border-t px-3 py-3 text-sm ${result.gapSimulation.passesBothDirections ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
                <strong>{result.gapSimulation.passesBothDirections ? "PASS" : "FAIL"}</strong> · both + and − directions must reach {result.gapSimulation.targetPct}%.
                {result.gapSimulation.sweetSpotMaxAbsErrorCm != null ? ` Sweet spot extends through ±${result.gapSimulation.sweetSpotMaxAbsErrorCm} cm.` : " No tested non-zero error passes both directions."}
              </div>
              <p className="px-3 py-2 text-xs text-slate-500">{result.gapSimulation.assumption}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
            <strong>Nearest real chart boundary:</strong> {result.nearestBoundary
              ? ` ${result.nearestBoundary.title} · ${result.nearestBoundary.field} ${result.nearestBoundary.edge} ${result.nearestBoundary.boundaryCm.toFixed(1)} cm · ${result.nearestBoundary.distanceCm.toFixed(2)} cm away`
              : " unavailable."}
          </div>

          <details className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <summary className="cursor-pointer font-bold text-white">
              Numeric chart rows and stocked size decisions ({result.products.length} denominator products)
            </summary>
            <div className="mt-4 space-y-3">
              {result.products.slice(0, shownProducts).map((product) => (
                <details key={product.id} className="rounded-lg border border-white/10 bg-slate-900 p-3">
                  <summary className="cursor-pointer text-sm text-white">
                    <strong>{product.title}</strong> · {product.referenceSize} → {product.candidateSize ?? "no recommendation"} · {product.outcome}
                  </summary>
                  <p className="mt-2 text-xs text-slate-400">Ordered stocked sizes: {product.orderedStockedSizes.join(", ")} · inputs: {product.tapeFields.join(" + ")}</p>
                  {product.charts.map((chart) => (
                    <div key={chart.label} className="mt-3 overflow-x-auto">
                      <p className="mb-1 text-xs font-bold text-cyan-200">{chart.label} · {chart.unit}</p>
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-slate-950"><tr>{chart.headers.map((header, index) => <th key={`${header}-${index}`} className="px-2 py-1">{header}</th>)}</tr></thead>
                        <tbody>{chart.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-white/5">{row.map((value, index) => <td key={index} className="px-2 py-1">{value}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  ))}
                </details>
              ))}
              {shownProducts < result.products.length ? <button type="button" onClick={() => setShownProducts((value) => value + 24)} className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-bold text-white">Show 24 more charts</button> : null}
            </div>
          </details>

          <p className="text-xs leading-5 text-slate-400">
            {result.catalog.genderProductCount} same-gender products in frozen snapshot {result.catalog.sha256.slice(0, 12)}… · {result.catalog.eligibility} {result.percentageMeaning}
          </p>
        </>
      ) : status === "loading" ? <p className="rounded-lg border border-violet-400/20 bg-slate-950 p-4 text-sm text-violet-100">Running the selected body and every signed error through the frozen MyAIFitting charts…</p> : null}
    </section>
  );
}
