#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { buildGapEngine, createGapSimulation } = require('./gap-simulation.cjs');

const ROOT = path.resolve(__dirname, '../../..');
const BACKEND = path.resolve(ROOT, '../primeStyleAI-backend');
const benchmark = require(path.join(BACKEND, 'scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function fail(message) {
  console.error(`[own-photo-commercial-html] ${message}`);
  process.exit(1);
}

const reportPath = path.resolve(process.argv[2] || '');
const outputPath = path.resolve(process.argv[3] || '');
const errorPath = path.resolve(process.argv[4] || path.join(path.dirname(reportPath), 'tape-error.json'));
const cameraPath = path.resolve(process.argv[5] || path.join(path.dirname(reportPath), 'camera-results.json'));

if (!process.argv[2] || !process.argv[3]) {
  fail('Usage: node generate-own-photo-commercial-html.cjs <report.json> <output.html> [tape-error.json] [camera-results.json]');
}
if (!fs.existsSync(reportPath)) fail(`Report not found: ${reportPath}`);
if (!fs.existsSync(errorPath)) fail(`Tape-error report not found: ${errorPath}`);
if (!fs.existsSync(cameraPath)) fail(`Camera comparison not found: ${cameraPath}`);

const templatePath = path.join(__dirname, 'own-photo-commercial-template.html');
if (!fs.existsSync(templatePath)) fail(`Template not found: ${templatePath}`);

const reportBuffer = fs.readFileSync(reportPath);
const report = JSON.parse(reportBuffer.toString('utf8'));
const errors = JSON.parse(fs.readFileSync(errorPath, 'utf8'));
const cameras = JSON.parse(fs.readFileSync(cameraPath, 'utf8'));
if (report.schema !== 'own-photo-commercial-report-v1') fail(`Unexpected report schema: ${String(report.schema)}`);
if (errors.schema !== 'own-photo-tape-and-model-error-impact-v2') fail(`Unexpected error schema: ${String(errors.schema)}`);
if (cameras.schema !== 'own-photo-camera-comparison-v1') fail(`Unexpected camera schema: ${String(cameras.schema)}`);
if (errors.sourceReportSha256 !== sha256(reportBuffer)) fail('Tape-error results do not match this report.');
if (cameras.sourceReportSha256 !== sha256(reportBuffer)) fail('Camera results do not match this report.');
if (report.cohort?.captureCount !== report.captures?.length) fail('Capture count does not match the report cohort.');
const expectedChecks = report.captures.length * 100;
const expectedDecisions = expectedChecks * 2;
if (report.captures.length !== 11 || report.decisions.length !== expectedDecisions) {
  fail(`Expected the scoped 11-capture/${expectedDecisions}-decision run; found ${report.captures.length}/${report.decisions.length}.`);
}
if (report.captures.some((capture) => capture.captureId === 'shane-2' || capture.captureId === 'delaram-2')) {
  fail('The report must use the original Shane and Delaram captures, not their -2 captures.');
}
if (errors.scenarios.length !== 45 || errors.scenarios.some((scenario) => scenario.sizeIndices.length !== expectedChecks)) {
  fail(`Expected 45 saved-tape scenarios with ${expectedChecks} checks each.`);
}
if (cameras.captures?.length !== report.captures.length || cameras.captures.some((capture, index) => capture.captureId !== report.captures[index].captureId)) {
  fail(`Camera results must match all ${report.captures.length} report captures in their frozen order.`);
}
for (const model of ['aiad', 'v8']) {
  if (errors.modelScenarios?.[model]?.length !== 45 || errors.modelScenarios[model].some((scenario) => scenario.sizeIndices.length !== expectedChecks)) {
    fail(`Expected 45 ${model} error scenarios with ${expectedChecks} checks each.`);
  }
}

const manifestBuffer = fs.readFileSync(report.sources.productManifestPath);
if (sha256(manifestBuffer) !== report.sources.productManifestSha256) fail('Frozen product manifest hash changed.');
const manifest = JSON.parse(manifestBuffer.toString('utf8'));
const policy = benchmark.loadLivePolicy();
assert.deepEqual(policy.hashes, report.sources.sizingPolicyHashes);

const capturesWithDecisions = new Map();
for (const decision of report.decisions) {
  const key = `${decision.captureId}:${decision.model}`;
  capturesWithDecisions.set(key, (capturesWithDecisions.get(key) || 0) + 1);
}
for (const capture of report.captures) {
  for (const model of ['aiad', 'v8']) {
    const count = capturesWithDecisions.get(`${capture.captureId}:${model}`);
    if (count !== 100) fail(`${capture.captureId}/${model} has ${count || 0} decisions, expected 100.`);
  }
}

const products = manifest.products.map((entry) => ({
  id: entry.product.styleRagId,
  title: entry.product.title,
  gender: entry.product.gender,
  category: entry.category,
  groupId: entry.groupId,
  chart: entry.chart,
  primarySizing: policy.recommendation.slotPrimaryFields(entry.product),
  sourceUrl: entry.product.sizeGuide?.sourceUrl || null,
  url: `https://preview.myaifitting.com/dashboard/ai-stylist/product/${encodeURIComponent(`${policy.slug.aiStylistProductSlug(entry.product.title)}--${entry.product.sourceProductId || entry.product.styleRagId.split(':').at(-1)}`)}`,
}));
const productIndex = new Map(products.map((product, index) => [product.id, index]));
const decisionMap = new Map(report.decisions.map((decision) => [
  `${decision.captureId}:${decision.productId}:${decision.model}`,
  decision,
]));
const pairs = [];
for (let captureIndex = 0; captureIndex < report.captures.length; captureIndex += 1) {
  const capture = report.captures[captureIndex];
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    if (product.gender !== capture.gender) continue;
    const aiad = decisionMap.get(`${capture.captureId}:${product.id}:aiad`);
    const v8 = decisionMap.get(`${capture.captureId}:${product.id}:v8`);
    if (!aiad || !v8) fail(`Missing paired decisions for ${capture.captureId}/${product.id}`);
    assert.equal(aiad.referenceIndex, v8.referenceIndex);
    assert.equal(aiad.referenceReady, v8.referenceReady);
    pairs.push([
      captureIndex,
      productIndex.get(product.id),
      aiad.referenceReady ? 'Scorable' : (aiad.referenceReason || 'No saved-tape size'),
      aiad.referenceReady ? aiad.referenceIndex : null,
      [aiad.predictedReady ? aiad.predictionIndex : -1],
      [v8.predictedReady ? v8.predictionIndex : -1],
      `${capture.captureId}:${product.id}`,
    ]);
  }
}
if (pairs.length !== expectedChecks) fail(`Expected ${expectedChecks} paired checks; found ${pairs.length}.`);

const cameraView = {
  ...cameras,
  sourceReport: path.basename(cameras.sourceReport || reportPath),
  captures: cameras.captures.map((capture) => ({
    ...capture,
    models: Object.fromEntries(Object.entries(capture.models).map(([model, result]) => [model, result.ok ? result : {
      ...result,
      error: String(result.error || '').includes('No 3D body pose detected')
        ? 'Apple Vision 3D: no reliable body pose detected.'
        : 'The camera tool failed for this photo.',
    }])),
  })),
};

const viewData = {
  report,
  people: report.captures.map((capture) => ({
    scanId: capture.captureId,
    identity: capture.identity,
    gender: capture.gender,
    heightCm: capture.heightCm,
    actuals: capture.actuals,
    predictions: {
      aiad: capture.models.aiad.predicted,
      v8: capture.models.v8.predicted,
    },
    cameraGroup: capture.cameraDiagnostic.group,
  })),
  products,
  pairs,
  scenarios: errors.scenarios,
  modelScenarios: Object.fromEntries(Object.entries(errors.modelScenarios).map(([model, scenarios]) => [
    model,
    scenarios.filter((scenario) => scenario.axis === 'both' && scenario.deltaCm === 0),
  ])),
  tapeErrorCreatedAt: errors.createdAt,
  cameras: cameraView,
  generatedAt: cameras.createdAt || report.createdAt,
};

const safeJson = JSON.stringify(viewData)
  .replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');
let template = fs.readFileSync(templatePath, 'utf8');
if (!template.includes('__REPORT_DATA__')) fail('Template report-data marker is missing.');
if (!template.includes('__GAP_ENGINE__')) fail('Template gap-engine marker is missing.');
if (!template.includes('__GAP_SIMULATION__')) fail('Template gap-simulation marker is missing.');

template = template
  .replace('__REPORT_DATA__', safeJson)
  .replace('__GAP_ENGINE__', buildGapEngine(report.sources.sizingPolicyHashes))
  .replace('__GAP_SIMULATION__', createGapSimulation.toString())
  .replaceAll('__CAPTURE_COUNT__', String(report.cohort.captureCount))
  .replaceAll('__IDENTITY_COUNT__', String(report.cohort.identityCount))
  .replaceAll('__CHECK_COUNT__', expectedChecks.toLocaleString('en-US'));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, template);

console.log(JSON.stringify({
  ok: true,
  input: reportPath,
  tapeError: errorPath,
  cameraResults: cameraPath,
  output: outputPath,
  bytes: Buffer.byteLength(template),
  captures: report.captures.length,
  pairedChecks: pairs.length,
  scenarios: errors.scenarios.length,
}, null, 2));
