'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  RESULT,
  bmiBand,
  normalizeRangeToCm,
  classifyResult,
  nearestBoundary,
  gapErrorRatio,
  confidenceFor,
  measurementStats,
} = require('./commercial-sizing-core.cjs');

test('converts inch ranges to centimeters', () => {
  assert.deepEqual(normalizeRangeToCm({ min: 30, max: 32 }, 'in'), { min: 76.2, max: 81.28, center: 78.74 });
});

test('uses the five required BMI bands', () => {
  assert.equal(bmiBand(18.49), 'underweight');
  assert.equal(bmiBand(18.5), 'normal');
  assert.equal(bmiBand(25), 'overweight');
  assert.equal(bmiBand(30), 'obesity-i');
  assert.equal(bmiBand(35), 'obesity-ii-plus');
});

test('classifies exact, adjacent, severe and unavailable decisions', () => {
  assert.deepEqual(classifyResult(2, 2, true), { result: RESULT.exact, chartSteps: 0 });
  assert.deepEqual(classifyResult(2, 3, true), { result: RESULT.adjacent, chartSteps: 1 });
  assert.deepEqual(classifyResult(2, 0, true), { result: RESULT.severe, chartSteps: -2 });
  assert.deepEqual(classifyResult(2, null, false), { result: RESULT.unavailable, chartSteps: null });
});

test('uses the midpoint between facing chart edges for boundaries', () => {
  const boundary = nearestBoundary({
    orderedSizes: ['S', 'M', 'L'],
    referenceIndex: 1,
    predicted: { waist: 86, hips: 104 },
    chartBySizeCm: {
      S: { waist: { min: 70, max: 74, center: 72 } },
      M: { waist: { min: 76, max: 82, center: 79 }, hips: { min: 96, max: 102, center: 99 } },
      L: { waist: { min: 84, max: 90, center: 87 }, hips: { min: 104, max: 110, center: 107 } },
    },
  });
  assert.deepEqual(boundary, {
    measurement: 'hips', neighbourSize: 'L', neighbourIndex: 2, direction: 'larger', boundaryCm: 103,
    predictedTapeCm: 104, boundaryDistanceCm: 1, adjacentGapCm: 8, rangesOverlap: false,
  });
});

test('zero error produces infinity without numeric division', () => {
  assert.deepEqual(gapErrorRatio(4, 0), { value: null, display: '∞', infinite: true });
});

test('applies Aiad confidence thresholds and missing-sigma fallback', () => {
  assert.equal(confidenceFor({ model: 'aiad', boundaryDistanceCm: 4, sigmaCm: 2 }).label, 'High');
  assert.equal(confidenceFor({ model: 'aiad', boundaryDistanceCm: 2, sigmaCm: 2 }).label, 'Medium');
  assert.equal(confidenceFor({ model: 'aiad', boundaryDistanceCm: 1.9, sigmaCm: 2 }).label, 'Low');
  assert.equal(confidenceFor({ model: 'aiad', boundaryDistanceCm: 4, sigmaCm: null }).label, 'Low');
  assert.equal(confidenceFor({ model: 'v8', boundaryDistanceCm: 4, sigmaCm: 2 }).label, 'N/A');
});

test('measurement statistics ignore missing values and calculate P90', () => {
  const predictions = new Map([['a', { waist: 80 }], ['b', { waist: 90 }], ['c', { waist: null }]]);
  const actuals = new Map([['a', { waist: 78 }], ['b', { waist: 86 }], ['c', { waist: 100 }]]);
  const stats = measurementStats(predictions, actuals, 'waist');
  assert.equal(stats.count, 2);
  assert.equal(stats.maeCm, 3);
  assert.equal(stats.medianAbsoluteErrorCm, 3);
  assert.equal(stats.p90AbsoluteErrorCm, 3.8);
  assert.equal(stats.within4CmPct, 100);
});
