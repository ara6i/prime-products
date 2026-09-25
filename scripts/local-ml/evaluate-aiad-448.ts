import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { aiadMetrics, aiadPersonSummary, aiadReportPath, AIAD_BENCHMARK_PREPROCESSING, loadAiadCohort, predictAiadHeldout } from "../../app/api/try-on-test/wear-photo-test/_lib/aiadBenchmark";
import { AIAD_SHA256, aiadStatus } from "../../app/api/try-on-test/wear-photo-test/_lib/aiadRuntime";
import type { AiadBenchmarkReport, AiadBenchmarkRow } from "../../app/try-on-test/wear-photo-test/aiadBenchmarkTypes";

async function main() {
  await aiadStatus();
  const people = (await loadAiadCohort()).sort((a, b) => a.scanId.localeCompare(b.scanId));
  const rows: AiadBenchmarkRow[] = [];
  const start = Date.now();
  for (const person of people) {
    try {
      const r = await predictAiadHeldout(person.scanId);
      rows.push({ ...r.heldout.person, ok: true,
        predicted: Object.fromEntries(r.aiad!.measurements.map((m) => [m.kind, m.valueCm])),
        sigma: Object.fromEntries(r.aiad!.measurements.map((m) => [m.kind, m.sigmaCm])),
        actuals: r.heldout.actuals, inferenceMs: r.timing.inferenceMs });
    } catch (error) {
      rows.push({ ...aiadPersonSummary(person), ok: false, error: error instanceof Error ? error.message : String(error), predicted: {}, actuals: {} });
    }
    if (rows.length % 25 === 0 || rows.length === people.length) console.log(JSON.stringify({ completed: rows.length, total: 448, failures: rows.filter((r) => !r.ok).length, seconds: (Date.now() - start) / 1000 }));
  }
  const report: AiadBenchmarkReport = { schema: "aiad-render-benchmark-v1", modelSha256: AIAD_SHA256, preprocessing: AIAD_BENCHMARK_PREPROCESSING, createdAt: new Date().toISOString(), personCount: 448, inputSource: "existing-WEAR-front-50-render", labelSource: "recorded-WEAR-tape-only", completed: rows.filter((r) => r.ok).length, failures: rows.filter((r) => !r.ok).length, metrics: aiadMetrics(rows), rows };
  const target = aiadReportPath();
  await mkdir(path.dirname(target), { recursive: true });
  // Freeze each evaluation. Never silently replace a previous result.
  await writeFile(target, JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ reportPath: target, metrics: report.metrics, failures: report.failures }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
