import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SdkWearIndex, SdkWearPerson } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";
import { AIAD_FRAMING_REVISION, AIAD_MEASURES, type AiadMeasure } from "@/app/try-on-test/wear-photo-test/aiadPreprocessing";
import type { AiadBenchmarkMetric, AiadBenchmarkPerson, AiadBenchmarkReport, AiadBenchmarkRow, AiadConfidenceBucket, AiadWaistConfidenceEvaluation } from "@/app/try-on-test/wear-photo-test/aiadBenchmarkTypes";
import { AIAD_SHA256, predictAiad } from "./aiadRuntime";

const USB_COHORTS = [
  "/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/aiad-size-impact-20260831/cohort",
  "/Volumes/PrimeStorage/PrimeStyleAI-model-artifacts/aiad/wear-heldout",
];
const USB_CONFIDENCE_REPORT = "/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/aiad-size-impact-20260831/inputs/shane-confidence-adapter-benchmark-448-20260901.json";
export const AIAD_BENCHMARK_PREPROCESSING = `threshold127-largest8-fill4-close5-${AIAD_FRAMING_REVISION}` as const;
const LEGACY_BENCHMARK_PREPROCESSING = "threshold127-largest8-fill4-close5-aiad-framing" as const;
export function aiadCohortRoot() { return process.env.WEAR_AIAD_COHORT_ROOT ?? (process.platform === "darwin" ? USB_COHORTS.find(root => existsSync(path.join(root, ".local-ml", "wear-sdk-heldout", "index.json"))) : undefined) ?? process.cwd(); }
export function aiadReportPath() { return process.env.WEAR_AIAD_BENCHMARK_PATH ?? (process.platform === "darwin" && existsSync(USB_CONFIDENCE_REPORT) ? USB_CONFIDENCE_REPORT : path.join(aiadCohortRoot(), ".local-ml", "aiad-wear-student-2d-v1", "benchmark-448.json")); }
export async function loadAiadCohort() {
  const index = JSON.parse(await readFile(path.join(aiadCohortRoot(), ".local-ml", "wear-sdk-heldout", "index.json"), "utf8")) as SdkWearIndex;
  if (index.personCount !== 448 || index.expectedPersonCount !== 448 || index.people.length !== 448 || new Set(index.people.map((p) => p.scanId)).size !== 448 || index.people.some((p) => p.role !== "test" || !p.imagePath)) throw new Error("The fixed WEAR benchmark must contain exactly 448 unique test-only people.");
  return index.people;
}
export function aiadPersonSummary(p: SdkWearPerson): AiadBenchmarkPerson {
  return { scanId: p.scanId, subjectId: p.subjectId, gender: p.gender, heightCm: p.heightCm, weightKg: p.weightKg, imageUrl: `/api/try-on-test/wear-photo-test/aiad/asset?scanId=${encodeURIComponent(p.scanId)}` };
}
export async function readAiadRender(scanId: unknown) {
  if (typeof scanId !== "string" || scanId.length > 80) throw new Error("Choose a valid WEAR scan ID.");
  const person = (await loadAiadCohort()).find((p) => p.scanId === scanId);
  if (!person?.imagePath) throw new Error("This person is not in the fixed 448-person cohort.");
  const root = path.resolve(aiadCohortRoot());
  const imagePath = path.resolve(root, person.imagePath);
  if (!imagePath.startsWith(`${root}${path.sep}`)) throw new Error("Invalid cohort image path.");
  return { person, image: await readFile(imagePath) };
}
const TAPE_KEYS: Record<AiadMeasure, string> = { waist: "waist_circumference_mm", hips: "hip_circumference_mm", chest: "chest_circumference_mm", underbust: "underbust_circumference_mm", neck: "neck_base_circumference_mm", thigh: "thigh_circumference_mm" };
export function recordedAiadTapes(person: SdkWearPerson) {
  return Object.fromEntries(AIAD_MEASURES.map((kind) => {
    // The existing index already converts these values to cm despite retained
    // source-field names ending in _mm. Never divide by 10 a second time.
    const value = person.revealOnly.rowTapeAndCircumferenceCm?.[kind]?.tape ?? person.revealOnly.measurementsCm?.[TAPE_KEYS[kind]];
    return [kind, kind === "underbust" && person.gender === "male" ? null : typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null];
  })) as Record<AiadMeasure, number | null>;
}
export async function predictAiadHeldout(scanId: unknown) {
  const { person, image } = await readAiadRender(scanId);
  // The inference function receives only the render and three profile values.
  // Reveal labels AFTER inference; teacher rows and PLY perimeters never enter it.
  const prediction = await predictAiad(image, { gender: person.gender, heightCm: person.heightCm, weightKg: person.weightKg }, "thresholded-WEAR-render");
  return { ...prediction, heldout: { person: aiadPersonSummary(person), actuals: recordedAiadTapes(person), labelSource: "recorded-WEAR-tape-only" as const } };
}
function quantile(values: number[], q: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const x = (sorted.length - 1) * q, i = Math.floor(x);
  return sorted[i]! + (sorted[Math.min(i + 1, sorted.length - 1)]! - sorted[i]!) * (x - i);
}
function pct(n: number, d: number) { return d ? n * 100 / d : null; }
function errorMetric(errors: number[]): Omit<AiadBenchmarkMetric, "count"> {
  return { maeCm: errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : null,
    medianCm: quantile(errors, 0.5), p90Cm: quantile(errors, 0.9), p95Cm: quantile(errors, 0.95),
    worstCm: errors.length ? Math.max(...errors) : null,
    withinHalfInchPct: pct(errors.filter(value => value <= 1.27).length, errors.length),
    withinOneInchPct: pct(errors.filter(value => value <= 2.54).length, errors.length),
    catastrophicAbove5Cm: errors.filter(value => value > 5).length };
}
export function aiadMetrics(rows: AiadBenchmarkRow[]): Record<AiadMeasure, AiadBenchmarkMetric> {
  return Object.fromEntries(AIAD_MEASURES.map((kind) => {
    const errors = rows.filter((row) => row.ok).flatMap((row) => {
      const prediction = row.predicted[kind], truth = row.actuals[kind];
      return typeof prediction === "number" && Number.isFinite(prediction) && typeof truth === "number" && Number.isFinite(truth) && truth > 0 ? [Math.abs(prediction - truth)] : [];
    });
    return [kind, { count: errors.length, ...errorMetric(errors) }];
  })) as Record<AiadMeasure, AiadBenchmarkMetric>;
}
export function aiadWaistConfidence(rows: AiadBenchmarkRow[]): AiadWaistConfidenceEvaluation | null {
  const scored = rows.flatMap(row => {
    const predicted = row.predicted.waist, actual = row.actuals.waist, sigma = row.sigma?.waist;
    if (!row.ok || typeof predicted !== "number" || !Number.isFinite(predicted) || typeof actual !== "number" || !Number.isFinite(actual)
      || actual <= 0 || typeof sigma !== "number" || !Number.isFinite(sigma) || sigma <= 0) return [];
    const bmi = row.weightKg / ((row.heightCm / 100) ** 2);
    return [{ scanId: row.scanId, error: Math.abs(predicted - actual), sigma, bmi }];
  }).sort((a, b) => a.sigma - b.sigma || a.scanId.localeCompare(b.scanId));
  if (!scored.length) return null;
  const high = Math.round(scored.length * 0.5), next = Math.round(scored.length * 0.3);
  const definitions: Array<[AiadConfidenceBucket["id"], string, typeof scored]> = [
    ["highest-50", "Highest-confidence 50%", scored.slice(0, high)],
    ["next-30", "Next 30%", scored.slice(high, high + next)],
    ["lowest-20", "Lowest-confidence 20%", scored.slice(high + next)],
  ];
  const buckets = definitions.map(([id, label, people]): AiadConfidenceBucket => {
    const errors = people.map(person => person.error), summary = errorMetric(errors);
    const band = (test: (bmi: number) => boolean) => { const count = people.filter(person => test(person.bmi)).length; return { count, pct: pct(count, people.length) }; };
    return { id, label, count: people.length, sharePct: 100 * people.length / scored.length,
      meanSigmaCm: people.length ? people.reduce((sum, person) => sum + person.sigma, 0) / people.length : null,
      maeCm: summary.maeCm, medianCm: summary.medianCm, p90Cm: summary.p90Cm, p95Cm: summary.p95Cm,
      withinHalfInchPct: summary.withinHalfInchPct, withinOneInchPct: summary.withinOneInchPct,
      catastrophicAbove5Cm: summary.catastrophicAbove5Cm,
      bmiMix: { under25: band(bmi => bmi < 25), from25To30: band(bmi => bmi >= 25 && bmi < 30), thirtyPlus: band(bmi => bmi >= 30) } };
  });
  return { status: "clean-render-proxy", cohort: "WEAR 448 clean front renders", requestedCohort: "BodyM 487 real photos",
    requestedCohortAvailable: false, rankingSignal: "Aiad waist sigma ascending", scoredCount: scored.length, buckets,
    limitation: "Aiad did not provide the per-person BodyM 487 predictions, waist sigma and labels needed for Shane's real-photo confidence buckets. This WEAR clean-render table tests the integration and ranking logic only." };
}
export async function loadAiadReport(): Promise<AiadBenchmarkReport | null> {
  let raw: string;
  try { raw = await readFile(aiadReportPath(), "utf8"); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  const report = JSON.parse(raw) as AiadBenchmarkReport;
  const people = await loadAiadCohort();
  const expected = new Set(people.map((p) => p.scanId));
  if (report.schema !== "aiad-render-benchmark-v1" || report.modelSha256 !== AIAD_SHA256 || ![AIAD_BENCHMARK_PREPROCESSING, LEGACY_BENCHMARK_PREPROCESSING].includes(report.preprocessing) || report.rows.length !== 448 || new Set(report.rows.map((r) => r.scanId)).size !== 448 || report.rows.some((r) => !expected.has(r.scanId))) throw new Error("Stored Aiad benchmark has an unknown model, preprocessing version or 448-person cohort.");
  return { ...report, metrics: aiadMetrics(report.rows), waistConfidence: aiadWaistConfidence(report.rows),
    completed: report.rows.filter((r) => r.ok).length, failures: report.rows.filter((r) => !r.ok).length };
}
