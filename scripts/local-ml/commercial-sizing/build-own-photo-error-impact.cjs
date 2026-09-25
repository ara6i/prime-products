#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { perturbMeasurements, summarizeScenario } = require('./run-commercial-sizing-error-impact.cjs');

const ROOT = path.resolve(__dirname, '../../..');
const BACKEND = path.resolve(ROOT, '../primeStyleAI-backend');
const benchmark = require(path.join(BACKEND, 'scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
const AXES = ['waist', 'hips', 'both'];
const DELTAS = [0, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7];

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function ownManifest(report, sourceManifest) {
  const productById = new Map(sourceManifest.products.map((entry) => [entry.product.styleRagId, entry]));
  const referenceByKey = new Map(
    report.decisions
      .filter((decision) => decision.model === 'aiad')
      .map((decision) => [`${decision.captureId}:${decision.productId}`, decision]),
  );
  const products = sourceManifest.products.map((entry) => ({
    id: entry.product.styleRagId,
    product: entry.product,
    chart: entry.chart,
    inspection: entry.inspection,
    groupId: entry.groupId,
    category: entry.category,
  }));
  const opportunities = [];
  for (const capture of report.captures) {
    for (const product of products.filter((entry) => entry.product.gender === capture.gender)) {
      const reference = referenceByKey.get(`${capture.captureId}:${product.id}`);
      assert.ok(reference, `Missing frozen reference for ${capture.captureId}/${product.id}`);
      opportunities.push({
        decisionId: `${capture.captureId}:${product.id}`,
        personScanId: capture.captureId,
        productId: product.id,
        groupId: product.groupId,
        status: reference.referenceReady ? 'Scorable' : (reference.referenceReason || 'No saved-tape size'),
        referenceSize: reference.referenceSize,
        referenceSizeIndex: reference.referenceReady ? reference.referenceIndex : -1,
      });
    }
  }
  assert.equal(opportunities.length, report.captures.length * 100);
  return {
    people: report.captures.map((capture) => ({
      scanId: capture.captureId,
      subjectId: capture.identity,
      gender: capture.gender,
      heightCm: capture.heightCm,
      actuals: capture.actuals,
    })),
    products,
    opportunities,
    productById,
  };
}

async function main() {
  const reportPath = path.resolve(process.argv[2] || '');
  const outputPath = path.resolve(process.argv[3] || '');
  if (!process.argv[2] || !process.argv[3]) {
    throw new Error('Usage: node build-own-photo-error-impact.cjs <report.json> <output.json>');
  }

  const reportBuffer = fs.readFileSync(reportPath);
  const report = JSON.parse(reportBuffer.toString('utf8'));
  assert.equal(report.schema, 'own-photo-commercial-report-v1');
  assert.equal(report.captures.length, 11);
  assert.equal(report.decisions.length, report.captures.length * 100 * 2);
  assert.ok(!report.captures.some((capture) => capture.captureId === 'shane-2' || capture.captureId === 'delaram-2'));

  const manifestPath = report.sources.productManifestPath;
  const manifestBuffer = fs.readFileSync(manifestPath);
  assert.equal(sha256(manifestBuffer), report.sources.productManifestSha256);
  const sourceManifest = JSON.parse(manifestBuffer.toString('utf8'));
  const policy = benchmark.loadLivePolicy();
  assert.deepEqual(policy.hashes, report.sources.sizingPolicyHashes);
  assert.deepEqual(policy.hashes, sourceManifest.sizingPolicyHashes);

  const manifest = ownManifest(report, sourceManifest);
  const slotsByPerson = new Map(manifest.people.map((person) => [
    person.scanId,
    manifest.opportunities.map((slot, index) => ({ ...slot, index })).filter((slot) => slot.personScanId === person.scanId),
  ]));
  const scope = { userId: 'myaifitting-ai-stylist-test' };
  const scenarios = [];

  for (const axis of AXES) {
    for (const deltaCm of DELTAS) {
      const sizeIndices = new Array(manifest.opportunities.length).fill(-2);
      for (const person of manifest.people) {
        const relevant = slotsByPerson.get(person.scanId).filter((slot) => {
          if (slot.status !== 'Scorable') return false;
          const product = manifest.productById.get(slot.productId);
          if (axis !== 'both' && !product.inspection.tapeFields.includes(axis)) {
            sizeIndices[slot.index] = -3;
            return false;
          }
          return true;
        });
        if (!relevant.length) continue;
        const changed = perturbMeasurements(person.actuals, axis, deltaCm);
        const recommendations = await policy.recommend(
          relevant.map((slot) => manifest.productById.get(slot.productId).product),
          benchmark.profileFor({ heightCm: person.heightCm, predicted: changed }, 'predicted'),
          person.gender,
          scope,
        );
        const byId = new Map(recommendations.map((row) => [row.styleRagId, row]));
        for (const slot of relevant) {
          const product = manifest.productById.get(slot.productId);
          const decision = benchmark.validDecision(byId.get(slot.productId), product.inspection, policy);
          const index = decision.ready
            ? product.chart.orderedSizes.findIndex((size) => policy.recommendation.purchasableSize(decision.label, [size]))
            : -1;
          sizeIndices[slot.index] = index;
          if (deltaCm === 0) {
            assert.equal(index, slot.referenceSizeIndex, `0 cm changed ${slot.decisionId}`);
          }
        }
      }
      const summary = summarizeScenario({ people: manifest.people, opportunities: manifest.opportunities }, sizeIndices);
      scenarios.push({ id: `${axis}:${deltaCm}`, axis, deltaCm, sizeIndices, summary });
      console.log(JSON.stringify({ scenario: `${axis}:${deltaCm}`, ...summary.total }));
    }
  }

  const reportCaptureById = new Map(report.captures.map((capture) => [capture.captureId, capture]));
  const reportDecisionByKey = new Map(report.decisions.map((decision) => [
    `${decision.captureId}:${decision.productId}:${decision.model}`,
    decision,
  ]));
  const modelScenarios = {};
  for (const model of ['aiad', 'v8']) {
    modelScenarios[model] = [];
    for (const axis of AXES) {
      for (const deltaCm of DELTAS) {
        const sizeIndices = new Array(manifest.opportunities.length).fill(-2);
        for (const person of manifest.people) {
          const capture = reportCaptureById.get(person.scanId);
          const relevant = slotsByPerson.get(person.scanId).filter((slot) => {
            if (slot.status !== 'Scorable') return false;
            const product = manifest.productById.get(slot.productId);
            if (axis !== 'both' && !product.inspection.tapeFields.includes(axis)) {
              sizeIndices[slot.index] = -3;
              return false;
            }
            return true;
          });
          if (!relevant.length) continue;
          const changed = perturbMeasurements(capture.models[model].predicted, axis, deltaCm);
          const recommendations = await policy.recommend(
            relevant.map((slot) => manifest.productById.get(slot.productId).product),
            benchmark.profileFor({ heightCm: person.heightCm, predicted: changed }, 'predicted'),
            person.gender,
            scope,
          );
          const byId = new Map(recommendations.map((row) => [row.styleRagId, row]));
          for (const slot of relevant) {
            const product = manifest.productById.get(slot.productId);
            const decision = benchmark.validDecision(byId.get(slot.productId), product.inspection, policy);
            const index = decision.ready
              ? product.chart.orderedSizes.findIndex((size) => policy.recommendation.purchasableSize(decision.label, [size]))
              : -1;
            sizeIndices[slot.index] = index;
            if (deltaCm === 0) {
              const frozen = reportDecisionByKey.get(`${person.scanId}:${slot.productId}:${model}`);
              assert.equal(index, frozen.predictedReady ? frozen.predictionIndex : -1, `0 cm changed ${model}/${slot.decisionId}`);
            }
          }
        }
        const summary = summarizeScenario({ people: manifest.people, opportunities: manifest.opportunities }, sizeIndices);
        modelScenarios[model].push({ id: `${model}:${axis}:${deltaCm}`, model, axis, deltaCm, sizeIndices, summary });
        console.log(JSON.stringify({ model, scenario: `${axis}:${deltaCm}`, ...summary.total }));
      }
    }
  }

  const result = {
    schema: 'own-photo-tape-and-model-error-impact-v2',
    createdAt: new Date().toISOString(),
    sourceReport: reportPath,
    sourceReportSha256: sha256(reportBuffer),
    sourceManifest: manifestPath,
    sourceManifestSha256: sha256(manifestBuffer),
    plan: {
      captures: manifest.people.length,
      identities: new Set(report.captures.map((capture) => capture.identity)).size,
      products: sourceManifest.products.length,
      checksPerScenario: manifest.opportunities.length,
      axes: AXES,
      deltasCm: DELTAS,
      reference: 'The size selected from saved tape on the same frozen product chart.',
      perturbation: 'Add the signed error to saved waist, hip, or both together; then rerun the same sizing policy on the same product.',
      limitation: 'This tests product-size stability. It does not measure physical garment fit.',
    },
    verification: {
      zeroErrorControlsMatched: true,
      sizingPolicyHashes: policy.hashes,
      sourceManifestMatched: true,
    },
    scenarios,
    modelScenarios,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ complete: true, outputPath, scenarios: scenarios.length, checksPerScenario: manifest.opportunities.length }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}

module.exports = { ownManifest };
