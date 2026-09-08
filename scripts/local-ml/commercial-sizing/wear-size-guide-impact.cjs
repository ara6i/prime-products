#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PRODUCT_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = process.env.WEAR_SIZE_IMPACT_BACKEND_ROOT
  || path.resolve(PRODUCT_ROOT, '../primeStyleAI-backend');
const {
  loadLivePolicy,
  inspectProduct,
  validDecision,
  compareDecisions,
  profileFor,
  positive,
  sha256,
} = require(path.join(BACKEND_ROOT, 'scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
const { SCHEMA } = require('./build-wear-current-waist-hip-catalog.cjs');

const DEFAULT_SNAPSHOT = path.join(
  PRODUCT_ROOT,
  '.local-ml',
  'wear-side-selector',
  'size-guide',
  'catalog-20260908.json',
);
const DELTAS = [0, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7];
const FIELD_TO_TAPE = { waist: 'waist', hips: 'hips' };

function validate(raw) {
  if (!raw || !['female', 'male'].includes(raw.gender) || !positive(raw.heightCm)) throw new Error('Invalid WEAR size-guide request.');
  const tapes = (value, label) => {
    if (!value || typeof value !== 'object') throw new Error(`${label} tape is unavailable.`);
    const result = {};
    for (const field of ['waist', 'hips']) {
      if (value[field] == null) continue;
      if (!positive(value[field]) || value[field] > 350) throw new Error(`${label} ${field} must be a positive centimetre value.`);
      result[field] = Number(value[field]);
    }
    return result;
  };
  const axis = value => ['waist', 'hips', 'both'].includes(value) ? value : 'both';
  const manualDeltaCm = Number(raw.manualDeltaCm ?? 0);
  const gapCm = Number(raw.gapCm ?? 4);
  const targetPct = Number(raw.targetPct ?? 90);
  if (!Number.isFinite(manualDeltaCm) || Math.abs(manualDeltaCm) > 30) throw new Error('Custom error must be between -30 and +30 cm.');
  if (!positive(gapCm) || gapCm > 30) throw new Error('Adjacent-size spacing must be above 0 and at most 30 cm.');
  if (!Number.isFinite(targetPct) || targetPct < 0 || targetPct > 100) throw new Error('Accuracy target must be between 0 and 100 percent.');
  return {
    gender: raw.gender,
    heightCm: Number(raw.heightCm),
    inputTape: tapes(raw.inputTape, 'Input'),
    candidateTape: tapes(raw.candidateTape, 'Candidate'),
    manualAxis: axis(raw.manualAxis),
    manualDeltaCm,
    gapCm,
    gapAxis: axis(raw.gapAxis),
    targetPct,
  };
}

function chartsFor(product) {
  const guide = product.sizeGuide;
  if (!guide) return [];
  const tables = guide.sections && Object.keys(guide.sections).length > 1
    ? Object.entries(guide.sections)
    : [['Supplier chart', guide]];
  return tables.flatMap(([label, table]) => !Array.isArray(table.headers) || !Array.isArray(table.rows) ? [] : [{
    label,
    unit: guide.unit || 'unknown',
    headers: table.headers.map(String).slice(0, 24),
    rows: table.rows.slice(0, 50).map(row => row.slice(0, 24).map(value => String(value ?? ''))),
  }]);
}

function nearestBoundary(product, referenceLabel, tape, policy) {
  const guide = policy.recommendation.projectProductSizeGuide(product.sizeGuide, 'cm');
  if (!guide) return null;
  const tables = guide.sections && Object.keys(guide.sections).length > 1 ? Object.values(guide.sections) : [guide];
  let nearest = null;
  for (const table of tables) {
    if (!Array.isArray(table.headers) || !Array.isArray(table.rows)) continue;
    const sizeColumn = policy.deterministic.findSizeColIndex(table.headers);
    const fieldMap = policy.deterministic.buildHeaderFieldMap(table.headers);
    for (const row of table.rows) {
      const label = String(row[sizeColumn] || '');
      if (!policy.recommendation.purchasableSize(label, [referenceLabel])) continue;
      for (const [column, field] of Object.entries(fieldMap)) {
        const tapeField = FIELD_TO_TAPE[field];
        if (!tapeField || !positive(tape[tapeField])) continue;
        const range = policy.deterministic.parseRange(String(row[column] || ''));
        if (!range) continue;
        const header = String(table.headers[column] || '');
        const sourceUnit = /(?:_in|\(in\)|inches?)/i.test(header)
          ? 'in'
          : /(?:_cm|\(cm\)|centimet)/i.test(header)
            ? 'cm'
            : guide.unit === 'in' ? 'in' : 'cm';
        for (const [edge, rawValue] of [['min', range.min], ['max', range.max]]) {
          const value = sourceUnit === 'in' ? rawValue * 2.54 : rawValue;
          const distanceCm = Math.abs(tape[tapeField] - value);
          if (!nearest || distanceCm < nearest.distanceCm) {
            nearest = { field: tapeField, edge, boundaryCm: value, inputCm: tape[tapeField], distanceCm };
          }
        }
      }
    }
  }
  return nearest;
}

async function recommendations(products, checks, tape, input, snapshot, policy) {
  const complete = products.filter(product => checks.get(product.styleRagId).tapeFields.every(field => positive(tape[field])));
  const person = { gender: input.gender, heightCm: input.heightCm, values: tape };
  const rows = await policy.recommend(complete, profileFor(person, 'values'), input.gender, snapshot.scope);
  return new Map(rows.map(row => [row.styleRagId, row]));
}

function summarize(products, checks, reference, prediction, policy) {
  const counts = {
    denominator: 0,
    sameSize: 0,
    sizeUp: 0,
    sizeDown: 0,
    changedUnordered: 0,
    noRecommendation: 0,
  };
  for (const product of products) {
    const check = checks.get(product.styleRagId);
    const actual = validDecision(reference.get(product.styleRagId), check, policy);
    if (!actual.ready) continue;
    counts.denominator += 1;
    const predicted = validDecision(prediction.get(product.styleRagId), check, policy);
    const comparison = compareDecisions(actual, predicted, check, policy);
    if (comparison.outcome === 'same') counts.sameSize += 1;
    else if (comparison.outcome === 'up') counts.sizeUp += 1;
    else if (comparison.outcome === 'down') counts.sizeDown += 1;
    else if (comparison.outcome === 'changed_unordered') counts.changedUnordered += 1;
    else counts.noRecommendation += 1;
  }
  return {
    ...counts,
    agreementPct: counts.denominator ? Number((100 * counts.sameSize / counts.denominator).toFixed(2)) : null,
  };
}

function changedTape(inputTape, axis, deltaCm) {
  const result = { ...inputTape };
  for (const field of ['waist', 'hips']) {
    if (positive(result[field]) && (axis === 'both' || axis === field)) result[field] += deltaCm;
  }
  return result;
}

function stockedOrder(check, policy) {
  return check.orderedLabels.filter(label => policy.recommendation.purchasableSize(label, check.stockSizes));
}

function gapSummary(products, checks, reference, deltaCm, input, policy) {
  const counts = { denominator: 0, sameSize: 0, sizeUp: 0, sizeDown: 0, noRecommendation: 0, unaffected: 0 };
  for (const product of products) {
    const check = checks.get(product.styleRagId);
    const referenceDecision = reference.get(product.styleRagId);
    const orderedStockedSizes = stockedOrder(check, policy);
    if (!referenceDecision?.ready || !orderedStockedSizes.length) continue;
    const affected = check.tapeFields.some(field => input.gapAxis === 'both' || input.gapAxis === field)
      && check.tapeFields.some(field => input.manualAxis === 'both' || input.manualAxis === field);
    if (!affected) {
      counts.unaffected += 1;
      continue;
    }
    const referenceIndex = orderedStockedSizes.findIndex(label => (
      policy.recommendation.purchasableSize(label, [referenceDecision.label])
    ));
    if (referenceIndex < 0) continue;
    counts.denominator += 1;
    const step = deltaCm === 0 ? 0 : Math.sign(deltaCm) * Math.floor((Math.abs(deltaCm) + input.gapCm / 2) / input.gapCm);
    const predictedIndex = referenceIndex + step;
    if (predictedIndex < 0 || predictedIndex >= orderedStockedSizes.length) counts.noRecommendation += 1;
    else if (step === 0) counts.sameSize += 1;
    else if (step > 0) counts.sizeUp += 1;
    else counts.sizeDown += 1;
  }
  return {
    deltaCm,
    ...counts,
    agreementPct: counts.denominator ? Number((100 * counts.sameSize / counts.denominator).toFixed(2)) : null,
  };
}

async function compare(raw) {
  const input = validate(raw);
  const snapshotPath = process.env.WEAR_SIZE_GUIDE_SNAPSHOT || DEFAULT_SNAPSHOT;
  const bytes = fs.readFileSync(snapshotPath);
  const snapshot = JSON.parse(bytes);
  if (snapshot.schema !== SCHEMA || !Array.isArray(snapshot.products) || snapshot.readOnly !== true) throw new Error('The frozen all-current waist/hip catalog is invalid.');
  const policy = loadLivePolicy();
  for (const [file, hash] of Object.entries(policy.hashes)) {
    if (snapshot.sourceHashes[file] !== hash) throw new Error('The MyAIFitting sizing source changed after this snapshot. Freeze a new catalog.');
  }
  const products = snapshot.products.filter(product => product.gender === input.gender);
  const checks = new Map(products.map(product => [product.styleRagId, inspectProduct(product, policy)]));
  const referenceRows = await recommendations(products, checks, input.inputTape, input, snapshot, policy);
  const reference = new Map(products.map(product => {
    const check = checks.get(product.styleRagId);
    return [product.styleRagId, validDecision(referenceRows.get(product.styleRagId), check, policy)];
  }));
  const candidateRows = await recommendations(products, checks, input.candidateTape, input, snapshot, policy);
  const actual = summarize(products, checks, referenceRows, candidateRows, policy);

  const scenarioInputs = [...DELTAS.map(deltaCm => ({ kind: 'sweep', axis: input.manualAxis, deltaCm })),
    { kind: 'custom', axis: input.manualAxis, deltaCm: input.manualDeltaCm }];
  const scenarios = [];
  for (const scenario of scenarioInputs) {
    const tape = changedTape(input.inputTape, scenario.axis, scenario.deltaCm);
    const predicted = await recommendations(products, checks, tape, input, snapshot, policy);
    scenarios.push({ ...scenario, ...summarize(products, checks, referenceRows, predicted, policy) });
  }

  const productResults = products.flatMap(product => {
    const check = checks.get(product.styleRagId);
    const referenceDecision = reference.get(product.styleRagId);
    if (!referenceDecision?.ready) return [];
    const predictionDecision = validDecision(candidateRows.get(product.styleRagId), check, policy);
    const comparison = compareDecisions(referenceDecision, predictionDecision, check, policy);
    return [{
      id: product.styleRagId,
      title: product.title,
      slot: product.slot,
      tapeFields: check.tapeFields,
      orderedStockedSizes: stockedOrder(check, policy),
      referenceSize: referenceDecision.label,
      candidateSize: predictionDecision.ready ? predictionDecision.label : null,
      outcome: comparison.outcome,
      nearestBoundary: nearestBoundary(product, referenceDecision.label, input.inputTape, policy),
      charts: chartsFor(product),
    }];
  });
  const nearest = productResults.flatMap(product => product.nearestBoundary
    ? [{ productId: product.id, title: product.title, ...product.nearestBoundary }]
    : []).sort((a, b) => a.distanceCm - b.distanceCm)[0] || null;

  const gapScenarios = DELTAS.map(deltaCm => gapSummary(products, checks, reference, deltaCm, input, policy));
  const byDelta = new Map(gapScenarios.map(row => [row.deltaCm, row]));
  const passingErrors = [1, 2, 3, 4, 5, 6, 7].filter(value => (
    (byDelta.get(value)?.agreementPct ?? -1) >= input.targetPct
      && (byDelta.get(-value)?.agreementPct ?? -1) >= input.targetPct
  ));
  return {
    ok: true,
    schema: 'wear-size-guide-impact-v1',
    catalog: {
      snapshotPath,
      sha256: sha256(bytes),
      snapshotAt: snapshot.finishedAt,
      sourceCount: snapshot.sourceCount,
      qualifiedCount: snapshot.qualifiedCount,
      genderProductCount: products.length,
      eligibility: snapshot.eligibility,
    },
    input,
    actual,
    scenarios,
    nearestBoundary: nearest,
    products: productResults,
    gapSimulation: {
      gapCm: input.gapCm,
      gapAxis: input.gapAxis,
      errorAxis: input.manualAxis,
      targetPct: input.targetPct,
      scenarios: gapScenarios,
      sweetSpotMaxAbsErrorCm: passingErrors.length ? Math.max(...passingErrors) : null,
      passesBothDirections: passingErrors.length > 0,
      assumption: 'Editable adjacent size centres are evenly spaced by the chosen positive centimetre gap; original real-chart labels and stocked order define the available steps.',
    },
    percentageMeaning: 'Product-size agreement only; not physical-fit or centimetre accuracy.',
  };
}

async function main() {
  let body = '';
  for await (const chunk of process.stdin) {
    body += chunk;
    if (Buffer.byteLength(body) > 32_000) throw new Error('Size-guide request is too large.');
  }
  process.stdout.write(JSON.stringify(await compare(JSON.parse(body))));
}

if (require.main === module) main().catch(error => {
  process.stdout.write(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
});

module.exports = { validate, compare, summarize, gapSummary, DELTAS };
