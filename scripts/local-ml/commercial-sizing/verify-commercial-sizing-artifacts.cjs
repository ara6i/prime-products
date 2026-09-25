#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_BANDS = ['underweight', 'normal', 'overweight', 'obesity-i', 'obesity-ii-plus'];
const CATEGORY_QUOTAS = {
  'Women’s pants': 20,
  'Women’s shorts': 15,
  'Women’s skirts': 15,
  'Men’s pants': 30,
  'Men’s shorts': 20,
};

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function percentages(value, pathLabel = 'root') {
  if (!value || typeof value !== 'object') return [];
  const results = [];
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${pathLabel}.${key}`;
    if (key.toLowerCase().endsWith('pct') && typeof nested === 'number') results.push([nextPath, nested]);
    results.push(...percentages(nested, nextPath));
  }
  return results;
}

function verify(directory) {
  const reportPath = path.join(directory, 'report.json');
  const manifestPath = path.join(directory, 'manifest.json');
  const workbookPath = path.join(directory, 'PrimeStyleAI_100_Product_Sizing_Validation_Completed.xlsx');
  assert.ok(fs.existsSync(reportPath), 'report.json is missing');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json is missing');
  assert.ok(fs.existsSync(workbookPath), 'completed workbook is missing');

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(report.schema, 'CommercialSizingReportV1');
  assert.equal(manifest.schema, 'commercial-sizing-manifest-v1');
  assert.equal(manifest.predictionOutcomesInspectedBeforeFreeze, false);
  assert.equal(sha256(manifestPath), report.manifest.fileSha256);
  assert.equal(manifest.selectionSha256, report.manifest.selectionSha256);

  assert.equal(report.manifest.people.length, 10);
  assert.equal(report.manifest.assignments.length, 100);
  assert.equal(new Set(report.manifest.assignments.map((row) => row.product.styleRagId)).size, 100);

  const peopleBySex = countBy(report.manifest.people, (person) => person.gender);
  assert.deepEqual(peopleBySex, { female: 5, male: 5 });
  for (const sex of ['female', 'male']) {
    const bands = report.manifest.people.filter((person) => person.gender === sex).map((person) => person.bmiBand).sort();
    assert.deepEqual(bands, [...REQUIRED_BANDS].sort(), `${sex} BMI bands are incomplete`);
  }

  for (const model of ['aiad', 'v8']) {
    const rows = report.decisions[model];
    assert.equal(rows.length, 100, `${model} must contain 100 decisions`);
    assert.equal(new Set(rows.map((row) => row.decisionId)).size, 100);
    assert.equal(new Set(rows.map((row) => row.product.id)).size, 100);
    assert.deepEqual(countBy(rows, (row) => row.person.gender), { female: 50, male: 50 });
    assert.deepEqual(countBy(rows, (row) => row.product.category), CATEGORY_QUOTAS);
    assert.equal(report.summaries[model].denominator, 100);
    assert.equal(report.summaries[model].gapBuckets.reduce((sum, bucket) => sum + bucket.count, 0), 100);
    assert.equal(report.summaries[model].boundaryBuckets.reduce((sum, bucket) => sum + bucket.count, 0), 100);
    for (const [metricPath, value] of percentages(report.summaries[model], `summaries.${model}`)) {
      assert.ok(value >= 0 && value <= 100, `${metricPath} is outside 0–100`);
    }
    for (const row of rows) {
      assert.equal(row.schema, 'CommercialSizingDecisionV1');
      assert.ok(row.product.id && row.product.title && row.product.category);
      assert.ok(Array.isArray(row.purchasableSizes) && row.purchasableSizes.length >= 2);
      assert.ok(row.chart.valuesBySizeCm && row.chart.normalizedUnit === 'cm');
      assert.ok(Number.isFinite(row.actualTapeCm.waist) && Number.isFinite(row.actualTapeCm.hips));
      assert.ok(['Exact', 'Adjacent', '2+ Sizes Wrong', 'No Recommendation'].includes(row.result));
      assert.equal(row.apple.status, 'OFF / not run');
      assert.equal(row.keepExchange.outcome, 'Unknown');
    }
  }

  const aiadKeys = report.decisions.aiad.map((row) => row.manifestPersonProductKey);
  const v8Keys = report.decisions.v8.map((row) => row.manifestPersonProductKey);
  assert.deepEqual(aiadKeys, v8Keys, 'Aiad and V8 manifests differ');
  report.decisions.aiad.forEach((row, index) => {
    const comparison = report.decisions.v8[index];
    assert.deepEqual(row.actualTapeCm, comparison.actualTapeCm, `real tapes differ at ${row.decisionId}`);
    assert.equal(row.referenceSize, comparison.referenceSize, `reference size differs at ${row.decisionId}`);
    assert.equal(row.referenceSizeIndex, comparison.referenceSizeIndex, `reference index differs at ${row.decisionId}`);
  });

  assert.equal(report.review.conclusion, 'Unanswered');
  assert.equal(report.sources.apple.status, 'OFF / not run');
  assert.equal(report.sources.v8.previous448ResultReused, false);
  assert.equal(report.summaries.v8.confidence.status, 'N/A');

  return {
    ok: true,
    reportId: report.reportId,
    manifestSelectionSha256: report.manifest.selectionSha256,
    people: report.manifest.people.length,
    uniqueProducts: report.manifest.assignments.length,
    decisionsPerModel: 100,
    categoryQuotas: CATEGORY_QUOTAS,
    review: report.review.conclusion,
  };
}

if (require.main === module) {
  try {
    const directory = process.argv[2];
    if (!directory) throw new Error('Pass the finalized report directory.');
    process.stdout.write(`${JSON.stringify(verify(path.resolve(directory)), null, 2)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  }
}

module.exports = { verify };
