const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { assertReport, buildCommercialSizingHtml } = require('./generate-commercial-sizing-html.cjs');
const { analyzeCommercialReport } = require('./commercial-sizing-analysis.cjs');

const REPORT_PATH = path.resolve('/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/waist-hip-commercial-validation/waist-hip-commercial-100-20260901T115427Z/report.json');

test('rejects a non-commercial report', () => {
  assert.throws(() => assertReport({ schema: 'wrong' }), /CommercialSizingReportV1/);
});

test('builds a self-contained 100-decision HTML report from the frozen artifact', { skip: !fs.existsSync(REPORT_PATH) }, () => {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const html = buildCommercialSizingHtml(report);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /Waist\/Hip 100-Decision Commercial Validation/);
  assert.match(html, new RegExp(report.reportId));
  assert.match(html, new RegExp(report.manifest.selectionSha256));
  assert.match(html, /confidence rule did not identify safe recommendations/);
  assert.match(html, /id="decision-body"/);
  assert.match(html, /"D100"/);
  assert.doesNotMatch(html, /<script\s+src=/);
  assert.doesNotMatch(html, /<link\s+[^>]*href=/);
  assert.doesNotMatch(html, /chest|underbust|thigh/i);
  assert.match(html, /≤2.54 cm/);
  assert.match(html, /≤4 cm/);
  for (const id of ['gap-accuracy', 'boundary-accuracy', 'chart-spacing', 'commercial-conclusion']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  const analysis = analyzeCommercialReport(report);
  for (const model of ['aiad', 'v8']) for (const key of ['gapGroups', 'boundaryGroups']) {
    assert.equal(analysis.models[model][key].reduce((sum, group) => sum + group.count, 0), 100);
    assert.equal(analysis.models[model][key].reduce((sum, group) => sum + group.exact, 0), report.summaries[model].outcomes.exact.count);
  }
});
