"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import {
  PRODUCT_GARMENT_GROUPS,
  PRODUCT_OUTCOME_LABELS,
  PRODUCT_TAPE_KEYS,
  type ProductGarmentGroupId,
  type ProductSizeInput,
  type ProductSizeResult,
  type ProductSizeRow,
  type ProductTapeKey,
} from "./productSizeImpact";
import styles from "./ProductSizeImpactPanel.module.css";

type ModelKey = "aiad" | "v8";
type ModelInputs = Record<ModelKey, ProductSizeInput | null>;
type ModelResults = Partial<Record<ModelKey, ProductSizeResult>>;
const MODELS: { id: ModelKey; label: string; short: string }[] = [
  { id: "aiad", label: "Aiad ONNX", short: "Aiad" },
  { id: "v8", label: "Latest prior V8 ONNX", short: "V8" },
];
const cm = (value: number | null | undefined) => value == null ? "—" : `${value.toFixed(1)} cm`;
const signedCm = (predicted: number | null | undefined, actual: number | null | undefined) =>
  predicted == null || actual == null ? "—" : `${predicted - actual > 0 ? "+" : ""}${(predicted - actual).toFixed(1)} cm`;
const percent = (value: number | null) => value == null ? "—" : `${value.toFixed(1)}%`;

function matchesRequest(result: ProductSizeResult, input: ProductSizeInput, garmentGroupId: ProductGarmentGroupId) {
  return result.schema === "wear-selected-person-size-impact-v2" && result.person?.label === input.person.label
    && result.person?.gender === input.person.gender && result.person?.heightCm === input.person.heightCm
    && result.model?.version === input.model.version && result.model?.sha256 === input.model.sha256
    && result.catalog?.group?.id === garmentGroupId && result.catalog.group.products === 100
    && result.inputs?.deductionCm === input.deductionCm
    && PRODUCT_TAPE_KEYS.every(key => (result.inputs?.predicted?.[key] ?? null) === (input.predicted[key] ?? null)
      && (result.inputs?.actuals?.[key] ?? null) === (input.actuals[key] ?? null))
    && result.counts?.total === 100 && result.products?.length === 100 && new Set(result.products.map(product => product.id)).size === 100;
}

function practicalImpact(row: ProductSizeRow | undefined, model: string) {
  if (!row) return `Run ${model} first`;
  if (row.outcome === "same") return "Same recommended size";
  if (row.outcome === "up") return row.step === 1 ? `${model} selects one size too large` : `${model} selects ${row.step ?? "a larger"} chart sizes too large`;
  if (row.outcome === "down") return row.step === -1 ? `${model} selects one size too small` : `${model} selects ${Math.abs(row.step ?? 0) || "a smaller"} chart sizes too small`;
  if (row.outcome === "missingPrediction") return `${model} does not predict every tape this chart needs`;
  if (row.outcome === "missingActual") return "Saved real tape is incomplete";
  if (row.outcome === "lost_recommendation") return `${model} loses the real-tape recommendation`;
  if (row.outcome === "gained_recommendation") return `Only ${model} returns a size`;
  return PRODUCT_OUTCOME_LABELS[row.outcome];
}

function tapeList(input: ProductSizeInput | null, keys: string[], source: "actuals" | "predicted") {
  if (!input) return "—";
  const values = keys.flatMap(key => {
    const value = input[source][key as ProductTapeKey];
    return value == null ? [] : [`${key} ${value.toFixed(1)}`];
  });
  return values.length ? `${values.join(" · ")} cm` : "—";
}

export function ProductSizeImpactPanel({ inputs, personLabel, gender }: {
  inputs: ModelInputs; personLabel: string; gender: "female" | "male";
}) {
  const groups = PRODUCT_GARMENT_GROUPS.filter(group => group.gender === gender);
  const [garmentGroupId, setGarmentGroupId] = useState<ProductGarmentGroupId>(() => `${gender}-pants` as ProductGarmentGroupId);
  const [deductionCm, setDeductionCm] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [state, setState] = useState<{ key: string; pending?: boolean; data?: ModelResults; error?: string } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const activeGroup = groups.find(group => group.id === garmentGroupId)
    ?? groups.find(group => group.id === `${gender}-pants`)
    ?? groups[0];
  const requests = Object.fromEntries(MODELS.flatMap(model => inputs[model.id]
    ? [[model.id, { ...inputs[model.id]!, deductionCm, garmentGroupId: activeGroup.id }]] : [])) as Partial<Record<ModelKey, ProductSizeInput & { garmentGroupId: ProductGarmentGroupId }>>;
  const requestKey = JSON.stringify({ personLabel, gender, activeGroup: activeGroup.id, requests });
  const current = state?.key === requestKey ? state : null;
  const results = current?.data ?? {};
  const baseResult = results.aiad ?? results.v8;

  useEffect(() => () => { controllerRef.current?.abort(); }, [requestKey]);

  async function runComparison() {
    const entries = Object.entries(requests) as [ModelKey, ProductSizeInput & { garmentGroupId: ProductGarmentGroupId }][];
    if (!entries.length || current?.pending) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 45_000);
    setState({ key: requestKey, pending: true });
    setPage(0);
    try {
      const pairs = await Promise.all(entries.map(async ([model, request]) => {
        const response = await fetch("/api/try-on-test/wear-photo-test/product-sizes", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request), signal: controller.signal,
        });
        const payload = await response.json() as ProductSizeResult | { ok: false; error?: string };
        if (!response.ok || !payload.ok) throw new Error("error" in payload && payload.error ? payload.error : `${model} product comparison failed.`);
        if (!matchesRequest(payload, request, activeGroup.id)) throw new Error(`The ${model} response does not match this person and garment group.`);
        return [model, payload] as const;
      }));
      if (!controller.signal.aborted) setState({ key: requestKey, data: Object.fromEntries(pairs) });
    } catch (error) {
      if (controllerRef.current === controller) setState({ key: requestKey, error: controller.signal.aborted
        ? "Comparison cancelled or timed out. You can retry."
        : error instanceof Error ? error.message : "Product comparison failed." });
    } finally { clearTimeout(timer); }
  }

  const rows = useMemo(() => (baseResult?.products ?? []).map(base => ({
    base,
    aiad: results.aiad?.products.find(product => product.id === base.id),
    v8: results.v8?.products.find(product => product.id === base.id),
  })), [baseResult?.products, results.aiad?.products, results.v8?.products]);
  const items = rows.filter(row => `${row.base.title} ${row.base.category} ${row.base.supplier}`.toLowerCase().includes(search.trim().toLowerCase())
    && (filter === "all" || (filter === "changed" ? [row.aiad, row.v8].some(product => product && ["up", "down", "changed_unordered", "lost_recommendation"].includes(product.outcome))
      : filter === "review" ? row.base.issues.length || row.base.warnings.length || row.base.chartOnlySizes.length || row.base.stockOnlySizes.length
        : [row.aiad, row.v8].some(product => product?.outcome === filter))));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / 20) - 1));
  const referenceInput = inputs.aiad ?? inputs.v8;
  const shownTapes = PRODUCT_TAPE_KEYS.filter(key => referenceInput?.actuals[key] != null || inputs.aiad?.predicted[key] != null || inputs.v8?.predicted[key] != null);

  return <section className={styles.panel} aria-label="Selected person product-size test" data-testid="selected-person-size-impact">
    <header className={styles.header}><div><p className={styles.eyebrow}>2 · REAL PRODUCT SIZE IMPACT</p><h2>{personLabel.split(" · ")[0]} · real tape vs Aiad vs V8</h2><p>Choose one garment type. Every test uses 100 distinct, in-stock products with numeric supplier size charts.</p></div></header>
    <div className={styles.modelReadiness}>
      {MODELS.map(model => <article className={inputs[model.id] ? styles.ready : styles.missing} key={model.id}>
        {inputs[model.id] ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
        <div><strong>{model.label}</strong><small>{inputs[model.id] ? `${inputs[model.id]!.model.version} · ready for this person` : `Run the ${model.short} photo tab for this same person`}</small></div>
      </article>)}
    </div>
    <p className={styles.note}>This uses each model’s original direct tape outputs. Mouse-edited A-to-B lines, Apple Vision and Depth Pro do not change these tape values. V8 predicts only waist and hips, so it will honestly show “missing required tape” on chest-driven charts.</p>
    <div className={styles.actions}>
      <label>Garment type<select aria-label="Product garment group" value={activeGroup.id} onChange={event => { setGarmentGroupId(event.target.value as ProductGarmentGroupId); setPage(0); }}>
        {groups.map(group => <option key={group.id} value={group.id}>{group.label} · 100 products</option>)}
      </select></label>
      <label>Optional sensitivity<select aria-label="Product-size clothing sensitivity" value={deductionCm} onChange={event => setDeductionCm(Number(event.target.value))}>
        <option value={0}>Original tape · no deduction</option><option value={1}>What-if · torso −1 cm</option><option value={2}>What-if · torso −2 cm</option><option value={4}>What-if · torso −4 cm</option>
      </select></label>
      <button type="button" className={styles.primary} disabled={!Object.keys(requests).length || current?.pending} onClick={() => void runComparison()}>
        {current?.pending ? <><Loader2 size={16} className="animate-spin" /> Comparing {activeGroup.label}…</> : `Compare 100 ${activeGroup.label}`}
      </button>
    </div>
    {!Object.keys(requests).length ? <div className={styles.empty}>Choose Shahnaz, Shane, Delaram or another saved person, then run Aiad and/or V8. The first model result unlocks this product test; running both adds both columns.</div> : null}
    {deductionCm > 0 ? <p className={styles.warning}>This subtraction is a sensitivity test only. It does not modify the saved model result or real tape.</p> : null}
    {referenceInput && !Object.values(referenceInput.actuals).some(value => value != null) ? <p className={styles.warning}>No real tape is stored for this upload, so an accuracy impact cannot be calculated.</p> : null}
    {state && !current ? <p className={styles.note} role="status">The person, model output or garment type changed. Run the product comparison again; the old result is hidden.</p> : null}
    {current?.error ? <p className={styles.error} role="alert">{current.error}</p> : null}

    {baseResult ? <div aria-live="polite">
      <div className={styles.tapeGrid}>
        <table><thead><tr><th>Body tape</th><th>Real tape</th><th>Aiad prediction</th><th>Aiad error</th><th>V8 prediction</th><th>V8 error</th></tr></thead><tbody>
          {shownTapes.map(key => <tr key={key}><th>{key}</th><td>{cm(referenceInput?.actuals[key])}</td><td>{cm(inputs.aiad?.predicted[key])}</td><td>{signedCm(inputs.aiad?.predicted[key], referenceInput?.actuals[key])}</td><td>{cm(inputs.v8?.predicted[key])}</td><td>{signedCm(inputs.v8?.predicted[key], referenceInput?.actuals[key])}</td></tr>)}
        </tbody></table>
      </div>
      <section className={styles.percentageSection} aria-label="Commercial garment-size percentages">
        <div className={styles.percentageHeading}><div><p className={styles.eyebrow}>SHANE’S COMMERCIAL TEST</p><h3>What percentage of real chart recommendations changes?</h3></div><strong>100 {baseResult.catalog.group.label}</strong></div>
        <div className={styles.tableScroll}><table><thead><tr><th>Model</th><th>Correct size</th><th>Selects larger</th><th>Selects smaller</th><th>Model unavailable</th><th>Changed or unavailable</th><th>Both return a size</th></tr></thead><tbody>
          {MODELS.map(model => {
            const result = results[model.id];
            if (!result) return <tr key={model.id}><th>{model.label}</th><td colSpan={6}>Not run for this person.</td></tr>;
            const c = result.counts;
            return <tr key={model.id}><th>{model.label}</th>
              <td><strong className={styles.correctPct}>{percent(c.correctPct)}</strong><small>{c.same} / {c.referenceRecommended} real-tape recommendations</small></td>
              <td><strong>{percent(c.largerPct)}</strong><small>{c.up} / {c.referenceRecommended}</small></td>
              <td><strong>{percent(c.smallerPct)}</strong><small>{c.down} / {c.referenceRecommended}</small></td>
              <td><strong>{percent(c.modelUnavailablePct)}</strong><small>{c.modelUnavailableOnReference} / {c.referenceRecommended} · {c.missingPredictionOnReference} missing tape</small></td>
              <td><strong className={c.changedOrUnavailablePct === 0 ? styles.correctPct : styles.wrongPct}>{percent(c.changedOrUnavailablePct)}</strong><small>{c.referenceRecommended - c.same} / {c.referenceRecommended}</small></td>
              <td><strong>{percent(c.pairedCoveragePct)}</strong><small>{c.bothRecommended} / {c.total} tested products</small></td>
            </tr>;
          })}
        </tbody></table></div>
      </section>
      <p className={styles.note}>The commercial denominator is every product where saved real tape returns a supported, stocked size. Missing model tape and lost recommendations count against the model; they do not disappear. “Both return a size” uses all 100 tested products. These are chart-decision percentages, not proof that the physical garment fits.</p>
      <div className={styles.filters}><label>Find a product<input aria-label="Search selected-person products" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Name or category" /></label><label>Show<select aria-label="Filter selected-person products" value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}><option value="all">All 100 products</option><option value="changed">Changed or lost size</option><option value="same">Same size</option><option value="missingPrediction">Model missing chart tape</option><option value="review">Chart / stock review</option></select></label></div>
      <div className={styles.tableScroll}><table><thead><tr><th>Product</th><th>Chart uses</th><th>Real tape → size</th><th>Aiad tape → size impact</th><th>V8 tape → size impact</th><th>Real chart</th></tr></thead><tbody>
        {items.slice(currentPage * 20, currentPage * 20 + 20).map(({ base, aiad, v8 }) => <tr key={base.id}>
          <td><strong>{base.title}</strong><small>{base.category} · {base.supplier}</small></td>
          <td>{base.tapeFields.join(" + ") || "—"}<small>Basis: {base.basis}</small></td>
          <td><strong>{aiad?.referenceSize ?? v8?.referenceSize ?? "—"}</strong><small>{tapeList(referenceInput, base.tapeFields, "actuals")}</small></td>
          <td><strong>{aiad?.predictedSize ?? "—"}</strong><small>{tapeList(inputs.aiad, base.tapeFields, "predicted")}</small><span className={aiad?.outcome === "same" ? styles.same : styles.changed}>{practicalImpact(aiad, "Aiad")}</span></td>
          <td><strong>{v8?.predictedSize ?? "—"}</strong><small>{tapeList(inputs.v8, base.tapeFields, "predicted")}</small><span className={v8?.outcome === "same" ? styles.same : styles.changed}>{practicalImpact(v8, "V8")}</span></td>
          <td><details><summary>View supplier chart</summary><p>Stock sizes: {base.stockSizes.join(", ") || "none"}. Chart basis: {base.basis}.</p>
            {base.warnings.map(warning => <p key={warning} className={styles.warning}>{warning}</p>)}
            {base.chartOnlySizes.length ? <p>Chart labels without stock: {base.chartOnlySizes.join(", ")}.</p> : null}
            {base.stockOnlySizes.length ? <p>Stock labels without a chart row: {base.stockOnlySizes.join(", ")}.</p> : null}
            {base.ignoredFields.length ? <p>Chart fields not predicted here: {base.ignoredFields.join(", ")}.</p> : null}
            {base.charts.map((chart, index) => <div key={`${chart.label}:${index}`}><p><strong>{chart.label}</strong> · {chart.unit}</p><div className={styles.tableScroll}><table><thead><tr>{chart.headers.map((header, i) => <th key={i}>{header}</th>)}</tr></thead><tbody>{chart.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div></div>)}
          </details></td>
        </tr>)}
      </tbody></table></div>
      {!items.length ? <p className={styles.empty}>No products match this filter.</p> : null}
      <div className={styles.pagination}><span>{items.length} products · page {currentPage + 1} / {Math.max(1, Math.ceil(items.length / 20))}</span><div><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" disabled={(currentPage + 1) * 20 >= items.length} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
      <p className={styles.note}>Frozen catalog: {baseResult.catalog.snapshotAt}. Product and chart data are read-only. No customer profile, supplier chart, tape answer or model weight is modified.</p>
    </div> : null}
  </section>;
}
