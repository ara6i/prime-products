'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, gapSummary } = require('./wear-size-guide-impact.cjs');

test('validates decimal manual errors, positive gaps, and both-direction targets', () => {
  const result = validate({
    gender: 'female',
    heightCm: 170,
    inputTape: { waist: 80, hips: 100 },
    candidateTape: { waist: 81.25, hips: 98.5 },
    manualAxis: 'waist',
    manualDeltaCm: -1.25,
    gapCm: 3.5,
    gapAxis: 'both',
    targetPct: 92.5,
  });
  assert.equal(result.manualDeltaCm, -1.25);
  assert.equal(result.gapCm, 3.5);
  assert.equal(result.targetPct, 92.5);
  assert.throws(() => validate({
    gender: 'female',
    heightCm: 170,
    inputTape: { waist: 80 },
    candidateTape: { waist: 81 },
    gapCm: 0,
  }), /spacing/);
});

test('adjacent-size gap simulation reproduces zero and checks both signed directions', () => {
  const products = [{ styleRagId: 'p1' }];
  const checks = new Map([['p1', {
    tapeFields: ['waist'],
    orderedLabels: ['S', 'M', 'L'],
    stockSizes: ['S', 'M', 'L'],
  }]]);
  const reference = new Map([['p1', { ready: true, label: 'M' }]]);
  const policy = { recommendation: { purchasableSize: (label, sizes) => sizes.includes(label) ? label : null } };
  const input = { gapAxis: 'waist', manualAxis: 'waist', gapCm: 4 };
  assert.deepEqual(
    gapSummary(products, checks, reference, 0, input, policy),
    { deltaCm: 0, denominator: 1, sameSize: 1, sizeUp: 0, sizeDown: 0, noRecommendation: 0, unaffected: 0, agreementPct: 100 },
  );
  assert.equal(gapSummary(products, checks, reference, 2, input, policy).sizeUp, 1);
  assert.equal(gapSummary(products, checks, reference, -2, input, policy).sizeDown, 1);
});
