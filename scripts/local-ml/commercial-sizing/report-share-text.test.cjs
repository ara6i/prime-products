'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { buildReportShareText } = require('./report-share-text.cjs');

test('copies complete data, closed product charts and links regardless of the displayed filtered rows', () => {
  const document = new JSDOM(`<main><h1>Sizing report</h1><div class="toolbar"><button>Share with ChatGPT</button></div>
    <table><thead><tr><th rowspan="2">Measure</th><th colspan="2">Our model</th></tr><tr><th>MAE</th><th>P90</th></tr></thead><tbody><tr><th>Waist</th><td>4.35</td><td>6.35</td></tr></tbody></table>
    <div class="decision-table"><table><tbody><tr><td>Only one filtered row is visible</td></tr></tbody></table></div>
    <details><summary>Pants A</summary><a href="https://preview.myaifitting.com/dashboard/ai-stylist/product/pants-a--abc">Open product</a><table><thead><tr><th>Size</th><th>Waist</th></tr></thead><tbody><tr><th>M</th><td>80</td></tr></tbody></table></details></main>`).window.document;
  const row = id => ({ decisionId: id, person: { scanId: 'person-1' }, product: { title: 'Pants A', category: 'Pants', myaifittingUrl: 'https://preview.myaifitting.com/dashboard/ai-stylist/product/pants-a--abc' },
    actualTapeCm: { waist: 80, hips: 100 }, predictedTapeCm: { waist: 81, hips: 101 }, signedErrorCm: { waist: 1, hips: 1 },
    referenceSize: 'M', predictedSize: 'M', chartSteps: 0, result: 'Exact', confidence: { label: 'N/A', ratio: null },
    apple: { status: 'OFF' }, dataQualityFlag: ['None'], keepExchange: { outcome: 'Unknown' }, notes: ['Recorded chart snapshot.'] });
  const result = buildReportShareText(document, { decisions: { aiad: [row('A001'), row('A002')], v8: [row('V001'), row('V002')] } });
  assert.match(result, /Our model · MAE \| Our model · P90/);
  for (const id of ['A001', 'A002', 'V001', 'V002']) assert.match(result, new RegExp(id));
  assert.match(result, /Our model — all 2 decisions/);
  assert.match(result, /\[Open product\]\(https:\/\/preview\.myaifitting\.com\/dashboard\/ai-stylist\/product\/pants-a--abc\)/);
  assert.match(result, /\| M \| 80 \|/);
  assert.doesNotMatch(result, /Only one filtered row|Share with ChatGPT/);
});
