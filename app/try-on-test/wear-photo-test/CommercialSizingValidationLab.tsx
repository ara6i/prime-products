"use client";

import { Download, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  CommercialSizingApiResponse,
  CommercialSizingConclusion,
  CommercialSizingDecisionV1,
  CommercialSizingModel,
  CommercialSizingModelSummaryV1,
  CommercialSizingReportV1,
  CommercialSizingResult,
} from "./commercialSizingTypes";
import styles from "./CommercialSizingValidationLab.module.css";

const ENDPOINT = "/api/try-on-test/wear-photo-test/commercial-size-validation";
const MODELS: CommercialSizingModel[] = ["aiad", "v8"];

function pct(value: number | null | undefined) {
  return value == null ? "N/A" : `${value.toFixed(value % 1 ? 1 : 0)}%`;
}

function cm(value: number | null | undefined, signed = false) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(1)} cm`;
}

function resultClass(result: CommercialSizingResult) {
  if (result === "Exact") return styles.exact;
  if (result === "Adjacent") return styles.adjacent;
  if (result === "2+ Sizes Wrong") return styles.severe;
  return styles.unavailable;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "good" | "bad" }) {
  return <article className={`${styles.metric} ${tone === "good" ? styles.good : tone === "bad" ? styles.bad : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function ModelSummary({ summary }: { summary: CommercialSizingModelSummaryV1 }) {
  const confidence = "status" in summary.confidence ? null : summary.confidence;
  return <article className={styles.modelCard}>
    <h3>{summary.model === "aiad" ? "Aiad frozen 448 output" : "V8 new CPU run"}</h3>
    <p>{summary.model === "aiad" ? "Existing Aiad tapes + per-measure sigma; no rerun or calibration." : "Same 10 clean renders and frozen products; no previous V8 448 result reused."}</p>
    <div className={styles.metrics}>
      <Metric label="Exact" value={pct(summary.outcomes.exact.pct)} detail={`${summary.outcomes.exact.count}/100`} tone="good" />
      <Metric label="Adjacent" value={pct(summary.outcomes.adjacent.pct)} detail={`${summary.outcomes.adjacent.count}/100`} />
      <Metric label="Within one" value={pct(summary.outcomes.withinOneSize.pct)} detail={`${summary.outcomes.withinOneSize.count}/100`} tone="good" />
      <Metric label="2+ sizes wrong" value={pct(summary.outcomes.severe.pct)} detail={`${summary.outcomes.severe.count}/100`} tone="bad" />
      <Metric label="No recommendation" value={pct(summary.outcomes.noRecommendation.pct)} detail={`${summary.outcomes.noRecommendation.count}/100 · severe`} tone="bad" />
    </div>
    <div className={styles.confidenceCallout}>{confidence
      ? <><strong>Aiad confidence stress test:</strong> High covers {pct(confidence.high.coveragePct)} ({confidence.high.count}/100), but its exact accuracy is {pct(confidence.high.exactPct)} and it contains {confidence.high.severeCount} serious misses. Low-confidence within-one-size accuracy is {pct(confidence.low.withinOneSizePct)}; {confidence.seriousMissesCaughtByLowConfidence} serious misses were caught as Low.</>
      : <><strong>Confidence: N/A.</strong> V8 has no per-person uncertainty output, so none is invented.</>}
    </div>
  </article>;
}

function BucketTable({ title, rows }: { title: string; rows: Array<{ id: string; label: string; count: number; pct: number | null }> }) {
  return <div className={styles.tableCard}><div className={styles.tableTitle}>{title}</div><table><thead><tr><th>Bucket</th><th>Count</th><th>Share</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.label}</td><td>{row.count}</td><td>{pct(row.pct)}</td></tr>)}</tbody></table></div>;
}

function MeasurementTable({ report }: { report: CommercialSizingReportV1 }) {
  return <div className={styles.tableScroll}><table><thead><tr><th>Model</th><th>Measure</th><th>People</th><th>MAE</th><th>Median abs.</th><th>P90 abs.</th><th>Within 1.27</th><th>Within 2.54</th><th>Within 4</th><th>Worst</th><th>Chart spacing</th></tr></thead><tbody>{MODELS.flatMap(model => (["waist", "hips", "chest", "thigh"] as const).map(measurement => {
    const metric = report.summaries[model].measurementStats[measurement];
    return <tr key={`${model}-${measurement}`}><th className={styles.nowrap}>{model.toUpperCase()}</th><td className="capitalize">{measurement}</td><td>{metric.status === "N/A" ? <span className={styles.na}>N/A</span> : metric.count}</td><td>{cm(metric.maeCm)}</td><td>{cm(metric.medianAbsoluteErrorCm)}</td><td>{cm(metric.p90AbsoluteErrorCm)}</td><td>{pct(metric.within1_27CmPct)}</td><td>{pct(metric.within2_54CmPct)}</td><td>{pct(metric.within4CmPct)}</td><td>{cm(metric.worstAbsoluteErrorCm)}</td><td>{report.summaries[model].chartSpacing[measurement]}</td></tr>;
  }))}</tbody></table></div>;
}

function chartText(row: CommercialSizingDecisionV1) {
  return row.purchasableSizes.map(size => {
    const values = row.chart.valuesBySizeCm[size];
    const tape = (["waist", "hips"] as const).flatMap(measurement => values?.[measurement] ? [`${measurement} ${values[measurement]!.min.toFixed(1)}${values[measurement]!.max !== values[measurement]!.min ? `–${values[measurement]!.max.toFixed(1)}` : ""} cm`] : []);
    return `${size}: ${tape.join(" · ") || "N/A"}`;
  }).join(" | ");
}

type LoadedCommercialReport = CommercialSizingApiResponse & { ok: true; report: CommercialSizingReportV1 };

async function fetchCommercialReport(): Promise<LoadedCommercialReport> {
  const response = await fetch(ENDPOINT, { cache: "no-store" });
  const body = await response.json() as CommercialSizingApiResponse;
  if (!response.ok || !body.ok || !body.report) throw new Error(body.error || "Commercial report unavailable.");
  return body as LoadedCommercialReport;
}

export function CommercialSizingValidationLab() {
  const [report, setReport] = useState<CommercialSizingReportV1 | null>(null);
  const [workbookFileName, setWorkbookFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<CommercialSizingModel>("aiad");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [result, setResult] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [conclusion, setConclusion] = useState<CommercialSizingConclusion>("Unanswered");
  const [rationale, setRationale] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await fetchCommercialReport();
      setReport(body.report);
      setWorkbookFileName(body.workbookFileName || "completed workbook");
      setConclusion(body.report.review.conclusion);
      setRationale(body.report.review.rationale);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Commercial report unavailable.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    void fetchCommercialReport().then(body => {
      if (!active) return;
      setReport(body.report);
      setWorkbookFileName(body.workbookFileName || "completed workbook");
      setConclusion(body.report.review.conclusion);
      setRationale(body.report.review.rationale);
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : "Commercial report unavailable.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => report ? [...new Set(report.decisions.aiad.map(row => row.product.category))].sort() : [], [report]);
  const rows = useMemo(() => {
    if (!report) return [];
    const query = search.trim().toLowerCase();
    return report.decisions[model].filter(row => {
      const searchable = [row.decisionId, row.person.scanId, row.person.bmiBand, row.product.title, row.product.category, row.product.supplier, row.referenceSize, row.predictedSize, row.result, row.confidence.label].join(" ").toLowerCase();
      return (!query || searchable.includes(query))
        && (category === "all" || row.product.category === category)
        && (result === "all" || row.result === result)
        && (confidence === "all" || row.confidence.label === confidence);
    });
  }, [category, confidence, model, report, result, search]);

  const submitReview = async () => {
    setReviewBusy(true);
    setReviewMessage(null);
    try {
      const response = await fetch(`${ENDPOINT}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conclusion, rationale }) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || "Could not save review.");
      setReviewMessage("Reviewer conclusion saved as a separate append-only USB artifact.");
      await load();
    } catch (cause) { setReviewMessage(cause instanceof Error ? cause.message : "Could not save review."); }
    finally { setReviewBusy(false); }
  };

  if (loading) return <div className={styles.loading}>Loading and checksum-verifying the private USB report…</div>;
  if (error || !report) return <div className={styles.error} role="alert"><strong>Report unavailable.</strong><br />{error}<button type="button" className={styles.button} onClick={() => void load()}><RefreshCw size={14} /> Retry</button></div>;

  return <div className={styles.page} data-testid="commercial-sizing-validation-lab">
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Frozen commercial decision validation · private localhost only</p>
      <h2>100 waist/hip product decisions</h2>
      <p>10 fixed WEAR people × 10 unique products. Five women and five men cover underweight, normal, overweight, obesity I and obesity II+. Aiad and V8 use the identical person/product manifest and the same real-tape reference size.</p>
      <div className={styles.heroActions}><a className={styles.download} href={`${ENDPOINT}?format=xlsx`}><Download size={15} /> Download {workbookFileName}</a><span className={styles.hash}>manifest {report.manifest.selectionSha256}</span></div>
    </section>

    <div className={styles.warningStack}>{report.warnings.map(warning => <div className={styles.warning} key={warning}><ShieldAlert size={14} /> {warning}</div>)}</div>

    <section className={styles.comparison} aria-label="Aiad and V8 comparison"><ModelSummary summary={report.summaries.aiad} /><ModelSummary summary={report.summaries.v8} /></section>

    <section className={styles.section}><div className={styles.sectionHeader}><div><h3>Category mix and sensitivity buckets</h3><p>Every percentage reconciles to the frozen 100-decision denominator. Boundary distance is measured from the AI tape to the nearest adjacent waist/hip size boundary.</p></div></div><div className={styles.twoTables}>
      <div className={styles.tableCard}><div className={styles.tableTitle}>Frozen category mix</div><table><thead><tr><th>Category</th><th>Count</th><th>Share</th></tr></thead><tbody>{report.summaries.aiad.categoryMix.map(row => <tr key={row.category}><td>{row.category}</td><td>{row.count}</td><td>{pct(row.pct)}</td></tr>)}</tbody></table></div>
      <div className={styles.twoTables}><BucketTable title="Adjacent chart gap" rows={report.summaries.aiad.gapBuckets} /><BucketTable title="Aiad boundary distance" rows={report.summaries.aiad.boundaryBuckets} /></div>
    </div></section>

    <section className={styles.section}><div className={styles.sectionHeader}><div><h3>Secondary tape diagnostics</h3><p>These statistics use the 10 unique people, not 100 repeated product rows. Chest and thigh chart spacing is N/A because this commercial catalog is waist/hip-only.</p></div></div><MeasurementTable report={report} /></section>

    <section className={styles.section}><div className={styles.sectionHeader}><div><h3>Searchable decision rows</h3><p>{rows.length} of 100 {model.toUpperCase()} rows shown. Exact = same ordered stocked size; Adjacent = one step; No Recommendation is severe.</p></div></div>
      <div className={styles.filters}>
        <label>Search<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Person, product, result…" /></label>
        <label>Model<select value={model} onChange={event => setModel(event.target.value as CommercialSizingModel)}><option value="aiad">Aiad · 100 rows</option><option value="v8">V8 · 100 rows</option></select></label>
        <label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Result / confidence<select value={`${result}|${confidence}`} onChange={event => { const [nextResult, nextConfidence] = event.target.value.split("|"); setResult(nextResult); setConfidence(nextConfidence); }}><option value="all|all">All results</option><option value="Exact|all">Exact</option><option value="Adjacent|all">Adjacent</option><option value="2+ Sizes Wrong|all">2+ sizes wrong</option><option value="No Recommendation|all">No recommendation</option><option value="all|High">High confidence</option><option value="all|Medium">Medium confidence</option><option value="all|Low">Low confidence</option></select></label>
      </div>
      <div className={styles.tableScroll}><table className={styles.decisionTable}><thead><tr><th>ID / person</th><th>Product</th><th>Real vs predicted tape</th><th>Reference → AI size</th><th>Impact</th><th>Gap / boundary</th><th>Confidence</th><th>Evidence</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.model}-${row.decisionId}`}>
        <td className={styles.nowrap}><strong>{row.decisionId}</strong><br /><small>{row.person.scanId}<br />{row.person.gender} · {row.person.bmiBand} · BMI {row.person.bmi.toFixed(1)}</small></td>
        <td><strong>{row.product.title}</strong><small>{row.product.category} · {row.product.supplier || "supplier N/A"}<br />Stock: {row.purchasableSizes.join(", ")}</small></td>
        <td className={styles.nowrap}>Waist {cm(row.actualTapeCm.waist)} → {cm(row.predictedTapeCm.waist)} <strong>({cm(row.signedErrorCm.waist, true)})</strong><br />Hips {cm(row.actualTapeCm.hips)} → {cm(row.predictedTapeCm.hips)} <strong>({cm(row.signedErrorCm.hips, true)})</strong></td>
        <td className={styles.nowrap}><strong>{row.referenceSize}</strong> → <strong>{row.predictedSize || "None"}</strong><small>indices {row.referenceSizeIndex} → {row.predictedSizeIndex ?? "N/A"} · steps {row.chartSteps == null ? "N/A" : row.chartSteps > 0 ? `+${row.chartSteps}` : row.chartSteps}</small></td>
        <td><span className={`${styles.result} ${resultClass(row.result)}`}>{row.result}</span></td>
        <td className={styles.nowrap}>Gap {cm(row.adjacentGap?.cm)}<br />Boundary {cm(row.nearestBoundary?.distanceCm)}<small>{row.nearestBoundary ? `${row.nearestBoundary.measurement} → ${row.nearestBoundary.neighbourSize} (${row.nearestBoundary.direction})` : "N/A"}<br />gap/error {row.gapErrorRatio?.display ?? "N/A"}</small></td>
        <td><span className={styles.confidence}>{row.confidence.label}</span><small>{row.confidence.ratio == null ? "ratio N/A" : `boundary/σ ${row.confidence.ratio.toFixed(2)}`}<br />Apple {row.apple.status}</small></td>
        <td><details className={styles.details}><summary>Chart + material</summary><div className={styles.detailsGrid}><div><strong>Chart values</strong><small>{chartText(row)}</small></div><div><strong>Material/stretch</strong><small>{row.product.rawMaterial || "N/A"}<br />{row.product.stretchEvidence.join(" · ") || "No stretch evidence recorded"}</small></div><div><strong>Quality</strong><small>{row.dataQualityFlag.join(" · ")}</small></div><div><strong>Keep/exchange</strong><small>Unknown · keep rate N/A</small></div></div></details></td>
      </tr>)}</tbody></table></div>
    </section>

    <section className={styles.section}><div className={styles.sectionHeader}><div><h3>Mandatory reviewer conclusion</h3><p>This does not auto-pass. Review the 100 rows and choose YES, CONDITIONALLY, or NO with a written rationale.</p></div></div><div className={styles.review}>
      <label>Conclusion<select value={conclusion} onChange={event => setConclusion(event.target.value as CommercialSizingConclusion)}><option value="Unanswered" disabled>Unanswered</option><option value="YES">YES</option><option value="CONDITIONALLY">CONDITIONALLY</option><option value="NO">NO</option></select></label>
      <label>Rationale<textarea value={rationale} onChange={event => setRationale(event.target.value)} placeholder="Why this is or is not commercially acceptable…" /></label>
      <button type="button" className={styles.button} disabled={reviewBusy || conclusion === "Unanswered" || rationale.trim().length < 10} onClick={() => void submitReview()}>{reviewBusy ? "Saving…" : "Save conclusion"}</button>
    </div><div className={styles.reviewStatus}><strong>Current: {report.review.conclusion}</strong>{report.review.rationale ? <> · {report.review.rationale}</> : " · no reviewer decision yet."}{report.review.updatedAt ? ` · ${new Date(report.review.updatedAt).toLocaleString()}` : ""}{reviewMessage ? <><br />{reviewMessage}</> : null}</div></section>
  </div>;
}
