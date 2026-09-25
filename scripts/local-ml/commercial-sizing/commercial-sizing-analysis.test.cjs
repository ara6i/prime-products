'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { accuracyGroups, averageChartSpacing, safeSizingSummary, GAP_GROUPS } = require('./commercial-sizing-analysis.cjs');

test('group accuracy includes failed recommendations and preserves missing and empty groups', () => {
  const rows = [
    { gap: 2, result: 'Exact' },
    { gap: 2, result: 'No Recommendation' },
    { gap: 4, result: 'Adjacent' },
    { gap: null, result: 'Exact' },
  ];
  const groups = accuracyGroups(rows, row => row.gap, GAP_GROUPS);
  assert.deepEqual(groups[0], { label: '≤2 cm', count: 2, exact: 1, exactPct: 50 });
  assert.equal(groups[1].exactPct, 0);
  assert.equal(groups[2].exactPct, null);
  assert.equal(groups.at(-1).count, 1);
  assert.equal(groups.reduce((sum, group) => sum + group.count, 0), 4);
});

test('chart spacing gives products equal weight and does not double-count repeated decisions', () => {
  const product = (id, values) => ({ product: { id }, chart: {
    orderedSizes: values.map((_, index) => String(index)),
    valuesBySizeCm: Object.fromEntries(values.map((value, index) => [String(index), { waist: { center: value } }])),
  } });
  const a = product('a', [70, 72, 74]);
  const b = product('b', [80, 90]);
  const result = averageChartSpacing([a, a, b]);
  assert.deepEqual(result.waist, { averageCm: 6, products: 2, adjacentPairs: 3 });
  assert.deepEqual(result.hips, { averageCm: null, products: 0, adjacentPairs: 0 });
});

test('safe sizing separates issued recommendations from unavailable cases and uses both failure denominators', () => {
  const row = (label, result, predictedSize) => ({ confidence: { label }, result, predictedSize });
  const result = safeSizingSummary([
    row('High', 'Exact', 'M'), row('High', '2+ Sizes Wrong', 'XS'),
    row('High', 'No Recommendation', null), row('Low', '2+ Sizes Wrong', 'XS'),
    row('Low', 'No Recommendation', null),
  ]);
  assert.equal(result.highLabelled, 3);
  assert.equal(result.highIssued, 2);
  assert.equal(result.highIssuedExactPct, 50);
  assert.equal(result.highIssuedCoveragePct, 40);
  assert.equal(result.lowWrongByTwo, 1);
  assert.equal(result.wrongByTwo, 2);
  assert.equal(result.lowFailures, 2);
  assert.equal(result.failures, 4);
  assert.equal(safeSizingSummary([row('N/A', 'Exact', 'M')]), null);
});
