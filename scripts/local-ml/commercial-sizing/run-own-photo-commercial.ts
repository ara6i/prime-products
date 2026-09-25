#!/usr/bin/env npx tsx

/* eslint-disable @typescript-eslint/no-explicit-any -- frozen JSON and CommonJS policy artifacts have no exported TypeScript contract */

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { GET as getSavedDataset } from "../../../app/api/try-on-test/sizing-lab/dataset/route";
import { predictAiad } from "../../../app/api/try-on-test/wear-photo-test/_lib/aiadRuntime";
import { aiadSegmentationPaths } from "../../../app/api/try-on-test/wear-photo-test/_lib/aiadSegmentation";
import { POST as predictV8 } from "../../../app/api/try-on-test/wear-photo-test/v8/route";

type Gender = "female" | "male";
type TapePair = { waist: number; hips: number };
type SavedDatasetRow = {
  setId: string;
  label: string;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  waistCm?: number;
  hipsCm?: number;
  frontImageUrl: string;
  alternateFrontImageUrl?: string;
};

type ModelKey = "aiad" | "v8";

const require = createRequire(import.meta.url);
const benchmark = require("../../../../primeStyleAI-backend/scripts/benchmarks/aiad-catalog-size-impact-lib.cjs");
const { nearestBoundary, quantile, sha256 } = require("./commercial-sizing-core.cjs");
const { productSizeGap } = require("./product-size-gap.cjs");

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const BENCHMARK_ROOT = "/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/waist-hip-commercial-validation";
const INCLUDED_CAPTURE_IDS = [
  "setayesh",
  "niayesh",
  "tanaz",
  "bahar",
  "shahnaz",
  "shahnaz-2",
  "nadia",
  "negar-2",
  "negar-4",
  "delaram",
  "shane",
] as const;

const IDENTITY_BY_CAPTURE: Record<string, string> = {
  setayesh: "Setayesh",
  niayesh: "Niayesh",
  tanaz: "Tanaz",
  bahar: "Bahar",
  shahnaz: "Shahnaz",
  "shahnaz-2": "Shahnaz",
  nadia: "Nadia",
  "negar-2": "Negar",
  "negar-4": "Negar",
  delaram: "Delaram",
  shane: "Shane",
};

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function round(value: number | null, digits = 4) {
  if (value == null || !Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function pct(numerator: number, denominator: number) {
  return denominator ? round((100 * numerator) / denominator, 2) : null;
}

function hashBuffer(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function captureImageUrl(row: SavedDatasetRow) {
  return row.alternateFrontImageUrl || row.frontImageUrl;
}

function localImagePath(imageUrl: string) {
  if (!imageUrl.startsWith("/") || imageUrl.startsWith("/api/")) {
    throw new Error(`Own-photo report requires a checked-in public image: ${imageUrl}`);
  }
  return path.join(REPO_ROOT, "public", imageUrl);
}

function tapeRows(prediction: any): TapePair {
  const rows = new Map((prediction.rows ?? []).map((row: any) => [row.kind, row.tapeCm]));
  const waist = rows.get("waist");
  const hips = rows.get("hips");
  if (!finitePositive(waist) || !finitePositive(hips)) throw new Error("Model did not return positive waist and hip tape predictions.");
  return { waist, hips };
}

function modelErrors(predicted: TapePair, actual: TapePair) {
  return Object.fromEntries((["waist", "hips"] as const).map((field) => [field, {
    signedCm: round(predicted[field] - actual[field]),
    absoluteCm: round(Math.abs(predicted[field] - actual[field])),
  }]));
}

function cameraDiagnostic(camera: Record<string, number | null> | undefined) {
  const yaw = camera?.correction_yaw_deg;
  const pitch = camera?.correction_pitch_deg;
  const roll = camera?.correction_roll_deg;
  const values = [yaw, pitch, roll].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const maximumAbsoluteCorrectionDeg = values.length ? Math.max(...values.map(Math.abs)) : null;
  return {
    source: "V8 diagnostic correction heads",
    correctionYawDeg: round(typeof yaw === "number" ? yaw : null),
    correctionPitchDeg: round(typeof pitch === "number" ? pitch : null),
    correctionRollDeg: round(typeof roll === "number" ? roll : null),
    maximumAbsoluteCorrectionDeg: round(maximumAbsoluteCorrectionDeg),
    group: maximumAbsoluteCorrectionDeg == null ? "unknown" : maximumAbsoluteCorrectionDeg <= 5 ? "near-straight" : "angle-flagged",
    thresholdDeg: 5,
    validatedCameraTruth: false,
    changesDirectTape: false,
  };
}

function measurementSummary(captures: any[], model: ModelKey, cameraGroup = "all") {
  const selected = captures.filter((capture) => cameraGroup === "all" || capture.cameraDiagnostic.group === cameraGroup);
  const fieldSummary = (field: keyof TapePair) => {
    const errors = selected.map((capture) => capture.models[model].errors[field].absoluteCm).filter((value: unknown): value is number => typeof value === "number");
    return {
      captureCount: errors.length,
      maeCm: round(errors.reduce((sum, value) => sum + value, 0) / errors.length),
      medianAbsoluteErrorCm: round(quantile(errors, 0.5)),
      within1_27CmPct: pct(errors.filter((value) => value <= 1.27).length, errors.length),
      within2_54CmPct: pct(errors.filter((value) => value <= 2.54).length, errors.length),
      worstAbsoluteErrorCm: errors.length ? round(Math.max(...errors)) : null,
    };
  };
  return {
    model,
    cameraGroup,
    captureCount: selected.length,
    identityCount: new Set(selected.map((capture) => capture.identity)).size,
    waist: fieldSummary("waist"),
    hips: fieldSummary("hips"),
  };
}

function productSummary(decisions: any[]) {
  const referenceRecommended = decisions.filter((row) => row.referenceReady);
  const ordered = referenceRecommended.filter((row) => Number.isInteger(row.chartSteps));
  const count = (outcome: string) => decisions.filter((row) => row.outcome === outcome).length;
  const same = count("same");
  const adjacent = ordered.filter((row) => Math.abs(row.chartSteps) === 1).length;
  return {
    attempted: decisions.length,
    referenceRecommended: referenceRecommended.length,
    bothRecommended: decisions.filter((row) => row.referenceReady && row.predictedReady).length,
    same,
    samePctOfReference: pct(same, referenceRecommended.length),
    adjacent,
    withinOneSize: same + adjacent,
    withinOneSizePctOfReference: pct(same + adjacent, referenceRecommended.length),
    up: count("up"),
    down: count("down"),
    changedUnordered: count("changed_unordered"),
    lostRecommendation: count("lost_recommendation"),
    referenceUnavailable: decisions.length - referenceRecommended.length,
    averageAdjacentChartGapCm: (() => {
      const gaps = decisions.flatMap((row) => row.chartGapsCm).filter((value: unknown): value is number => typeof value === "number");
      return gaps.length ? round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length) : null;
    })(),
    averageNearestBoundaryDistanceCm: (() => {
      const values = decisions.map((row) => row.nearestBoundary?.boundaryDistanceCm).filter((value: unknown): value is number => typeof value === "number");
      return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    })(),
  };
}

async function newestFrozenManifest() {
  const entries = await readdir(BENCHMARK_ROOT, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith("waist-hip-commercial-448-"))
    .map((entry) => path.join(BENCHMARK_ROOT, entry.name)).sort().reverse();
  for (const directory of directories) {
    const file = path.join(directory, "manifest.json");
    if ((await stat(file).catch(() => null))?.isFile()) return file;
  }
  throw new Error("The frozen 448-person commercial product manifest is unavailable.");
}

async function runBatchSegmentation(rows: Array<{ input: string; output: string }>, manifestPath: string) {
  await writeFile(manifestPath, `${JSON.stringify(rows, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  const segmentation = aiadSegmentationPaths();
  const python = segmentation.python;
  const script = path.join(import.meta.dirname, "aiad-segment-photo-batch.py");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(python, [script, manifestPath], {
      cwd: REPO_ROOT,
      env: { ...process.env, U2NET_HOME: segmentation.modelDir, OMP_NUM_THREADS: "2", NUMBA_NUM_THREADS: "2", OPENBLAS_NUM_THREADS: "2" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-4000); process.stderr.write(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Batch segmentation failed (${code}): ${stderr}`)));
  });
}

async function productDecisions(capture: any, model: ModelKey, manifest: any, policy: any) {
  const products = manifest.products.filter((entry: any) => entry.product.gender === capture.gender);
  const productRows = products.map((entry: any) => entry.product);
  const scope = { userId: "myaifitting-ai-stylist-test" };
  // The checked-out policy harness intentionally uses one in-memory account
  // fixture. Keep calls sequential so one capture can never borrow another
  // call's measurements.
  const referenceRows = await policy.recommend(productRows, benchmark.profileFor({ heightCm: capture.heightCm, actuals: capture.actuals }, "actuals"), capture.gender, scope);
  const predictedRows = await policy.recommend(productRows, benchmark.profileFor({ heightCm: capture.heightCm, predicted: capture.models[model].predicted }, "predicted"), capture.gender, scope);
  const referenceById = new Map(referenceRows.map((row: any) => [row.styleRagId, row]));
  const predictedById = new Map(predictedRows.map((row: any) => [row.styleRagId, row]));

  return products.map((entry: any) => {
    const id = entry.product.styleRagId;
    const reference = benchmark.validDecision(referenceById.get(id), entry.inspection, policy);
    const prediction = benchmark.validDecision(predictedById.get(id), entry.inspection, policy);
    const compared = benchmark.compareDecisions(reference, prediction, entry.inspection, policy);
    const referenceIndex = reference.ready ? entry.chart.orderedSizes.findIndex((size: string) => policy.recommendation.purchasableSize(reference.label, [size])) : -1;
    const predictionIndex = prediction.ready ? entry.chart.orderedSizes.findIndex((size: string) => policy.recommendation.purchasableSize(prediction.label, [size])) : -1;
    const chartGapsCm = entry.inspection.tapeFields.map((field: string) => productSizeGap(entry.chart, field).meanCm).filter(Number.isFinite);
    const boundary = referenceIndex >= 0 ? nearestBoundary({
      orderedSizes: entry.chart.orderedSizes,
      referenceIndex,
      chartBySizeCm: entry.chart.valuesBySizeCm,
      predicted: capture.models[model].predicted,
    }) : null;
    return {
      captureId: capture.captureId,
      identity: capture.identity,
      model,
      productId: id,
      productTitle: entry.product.title,
      groupId: entry.groupId,
      category: entry.category,
      tapeFields: entry.inspection.tapeFields,
      referenceReady: reference.ready,
      referenceSize: reference.ready ? reference.label : null,
      referenceReason: reference.ready ? null : reference.reason,
      predictedReady: prediction.ready,
      predictedSize: prediction.ready ? prediction.label : null,
      predictedReason: prediction.ready ? null : prediction.reason,
      outcome: compared.outcome,
      chartSteps: compared.step,
      referenceIndex,
      predictionIndex,
      chartGapsCm: chartGapsCm.map((value: number) => round(value)),
      nearestBoundary: boundary,
    };
  });
}

async function main() {
  loadEnvConfig(REPO_ROOT);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const outputDirectory = path.resolve(process.argv[2] || path.join(REPO_ROOT, "outputs", "own-photo-commercial-report", stamp));
  const maskDirectory = path.join(outputDirectory, "masks");
  await mkdir(maskDirectory, { recursive: true, mode: 0o700 });

  const datasetResponse = await getSavedDataset();
  const dataset = await datasetResponse.json() as { rows: SavedDatasetRow[] };
  const byId = new Map(dataset.rows.map((row) => [row.setId, row]));
  const selected = INCLUDED_CAPTURE_IDS.map((id) => {
    const row = byId.get(id);
    if (!row) throw new Error(`Saved capture is missing: ${id}`);
    if (!finitePositive(row.waistCm) || !finitePositive(row.hipsCm)) throw new Error(`Saved tape is incomplete: ${id}`);
    const imageUrl = captureImageUrl(row);
    return { row, imageUrl, imagePath: localImagePath(imageUrl), maskPath: path.join(maskDirectory, `${id}.png`) };
  });

  const segmentationManifest = path.join(maskDirectory, "batch-manifest.json");
  await runBatchSegmentation(selected.map(({ imagePath, maskPath }) => ({ input: imagePath, output: maskPath })), segmentationManifest);

  const captures: any[] = [];
  for (const [index, item] of selected.entries()) {
    const { row, imageUrl, imagePath, maskPath } = item;
    const [photo, mask] = await Promise.all([readFile(imagePath), readFile(maskPath)]);
    const profile = { heightCm: row.heightCm, weightKg: row.weightKg, gender: row.gender };
    const actuals = { waist: row.waistCm!, hips: row.hipsCm! };
    const aiad = await predictAiad(mask, profile, "aiad-rembg-photo");
    const v8Response = await predictV8(new Request("http://localhost/api/try-on-test/wear-photo-test/v8", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost" },
      body: JSON.stringify({ maskDataUrl: `data:image/png;base64,${mask.toString("base64")}`, ...profile }),
    }));
    const v8 = await v8Response.json() as any;
    if (!v8Response.ok || !v8.ok) throw new Error(`V8 failed for ${row.setId}: ${v8.error ?? v8Response.status}`);
    const aiadTape = tapeRows(aiad);
    const v8Tape = tapeRows(v8);
    const camera = cameraDiagnostic(v8.camera);
    const capture = {
      captureId: row.setId,
      identity: IDENTITY_BY_CAPTURE[row.setId],
      label: row.label,
      gender: row.gender,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      imageUrl,
      photoSha256: hashBuffer(photo),
      maskSha256: hashBuffer(mask),
      maskSource: "Aiad reference rembg u2net_human_seg, shared by Aiad and V8 for this controlled comparison",
      actuals,
      cameraDiagnostic: camera,
      models: {
        aiad: { predicted: aiadTape, errors: modelErrors(aiadTape, actuals), sigmaCm: Object.fromEntries((aiad.aiad?.measurements ?? []).filter((measurement: any) => ["waist", "hips"].includes(measurement.kind)).map((measurement: any) => [measurement.kind, round(measurement.sigmaCm)])), modelVersion: aiad.model.version, modelSha256: aiad.model.sha256 },
        v8: { predicted: v8Tape, errors: modelErrors(v8Tape, actuals), sigmaCm: null, modelVersion: v8.model.version, modelSha256: v8.model.sha256 },
      },
    };
    captures.push(capture);
    console.log(JSON.stringify({ inference: index + 1, total: selected.length, capture: row.setId, cameraGroup: camera.group, aiad: aiadTape, v8: v8Tape }));
  }

  const manifestPath = await newestFrozenManifest();
  const manifestBuffer = await readFile(manifestPath);
  const productManifest = JSON.parse(manifestBuffer.toString("utf8"));
  const policy = benchmark.loadLivePolicy();
  if (JSON.stringify(policy.hashes) !== JSON.stringify(productManifest.sizingPolicyHashes)) {
    throw new Error("The current sizing policy no longer matches the frozen product manifest.");
  }
  const decisions: any[] = [];
  for (const [index, capture] of captures.entries()) {
    for (const model of ["aiad", "v8"] as const) decisions.push(...await productDecisions(capture, model, productManifest, policy));
    console.log(JSON.stringify({ sizing: index + 1, total: captures.length, capture: capture.captureId }));
  }

  const productSummaries = Object.fromEntries((["aiad", "v8"] as const).map((model) => [model, Object.fromEntries(["all", "near-straight", "angle-flagged", "unknown"].map((group) => {
    const captureIds = new Set(captures.filter((capture) => group === "all" || capture.cameraDiagnostic.group === group).map((capture) => capture.captureId));
    return [group, productSummary(decisions.filter((row) => row.model === model && captureIds.has(row.captureId)))];
  }))]));

  const report = {
    schema: "own-photo-commercial-report-v1",
    createdAt: new Date().toISOString(),
    cohort: {
      captureCount: captures.length,
      identityCount: new Set(captures.map((capture) => capture.identity)).size,
      femaleCaptures: captures.filter((capture) => capture.gender === "female").length,
      maleCaptures: captures.filter((capture) => capture.gender === "male").length,
      includedCaptureIds: INCLUDED_CAPTURE_IDS,
      excludedSavedRows: [
        { setId: "wear3d-pilot-001", reason: "Synthetic WEAR render, not an own-photo capture." },
        { setId: "arman", reason: "Saved waist and hip tape are missing." },
        { setId: "negar", reason: "Same photo as Negar 2 but older conflicting saved tape; the newer Negar 2 row is used." },
        { setId: "delaram-2", reason: "Excluded by report scope; use the original Delaram capture only." },
        { setId: "shane-2", reason: "Excluded by report scope; use the original Shane capture only." },
        { setId: "delaram-apple-side-proof", reason: "Side-view proof image is outside both models' front-photo contract." },
      ],
    },
    method: {
      tapeTruth: "Saved waist and hip tape in the Test Lab dataset. Tape is read only after inference for scoring.",
      segmentation: "Aiad reference rembg u2net_human_seg mask shared by both frozen models so the model comparison sees the same silhouette.",
      cameraGrouping: "Near-straight means V8's largest absolute diagnostic correction is at most 5 degrees. Angle-flagged means above 5 degrees. These predicted corrections are not camera ground truth.",
      cameraEffect: "Apple Vision and Depth Pro can change the diagnostic camera-derived A-to-B visible-width measurement. They do not change Aiad or V8's original A-to-B model line or direct tape head, so product-size decisions remain unchanged.",
      products: "Each capture is checked against the same 100 gender-matched products from the frozen 200-product commercial manifest, using the current checked-out deterministic sizing policy.",
      limitations: [
        "Small private transfer sample; repeated captures of the same identity are counted as captures, not independent people.",
        "Saved tape provenance varies by capture and is not a newly audited measurement session.",
        "V8 failed the fixed 448-person benchmark; this report does not make either model SDK-ready.",
        "The controlled shared-mask comparison differs from V8's current browser default, which uses MediaPipe segmentation.",
      ],
    },
    sources: {
      productManifestPath: manifestPath,
      productManifestSha256: hashBuffer(manifestBuffer),
      sizingPolicyHashes: policy.hashes,
    },
    summaries: Object.fromEntries((["aiad", "v8"] as const).map((model) => [model, {
      measurement: Object.fromEntries(["all", "near-straight", "angle-flagged", "unknown"].map((group) => [group, measurementSummary(captures, model, group)])),
      products: productSummaries[model],
    }])),
    captures,
    decisions,
  };
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(path.join(outputDirectory, "report.json"), reportJson, { flag: "wx", mode: 0o600 });
  await writeFile(path.join(outputDirectory, "SHA256SUMS.txt"), `${sha256(reportJson)}  report.json\n`, { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ complete: true, outputDirectory, captures: captures.length, identities: report.cohort.identityCount, decisions: decisions.length }));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
