#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const htmlPath = process.argv[2];
if (!htmlPath) throw new Error('Usage: node verify-own-photo-commercial-html.cjs <report.html>');
const html = fs.readFileSync(htmlPath, 'utf8');
const dataMatch = html.match(/<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/);
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
assert.ok(dataMatch, 'Embedded report data is missing.');
assert.ok(scriptMatch, 'Interactive report script is missing.');
new vm.Script(scriptMatch[1], { filename: htmlPath });

const data = JSON.parse(dataMatch[1]);
assert.equal(data.report.captures.length, 11);
assert.equal(data.people.length, 11);
assert.equal(new Set(data.people.map((person) => person.identity)).size, 9);
assert.ok(!data.people.some((person) => person.scanId === 'shane-2' || person.scanId === 'delaram-2'));
assert.ok(data.people.some((person) => person.scanId === 'shane'));
assert.ok(data.people.some((person) => person.scanId === 'delaram'));
assert.equal(data.products.length, 200);
assert.equal(data.products.filter((product) => product.gender === 'female').length, 100);
assert.equal(data.products.filter((product) => product.gender === 'male').length, 100);
assert.equal(data.pairs.length, 1100);
for (const model of ['aiad', 'v8']) {
  assert.equal(data.modelScenarios[model].length, 1);
  assert.equal(data.modelScenarios[model][0].axis, 'both');
  assert.equal(data.modelScenarios[model][0].deltaCm, 0);
}
assert.equal(data.cameras.captures.length, 11);
assert.ok(data.cameras.captures.some((capture) => Object.values(capture.models).some((model) => model.ok)), 'No real camera result succeeded.');
for (const capture of data.cameras.captures) {
  const reportCapture = data.report.captures.find((row) => row.captureId === capture.captureId);
  assert.ok(reportCapture);
  assert.deepEqual(Object.keys(capture.models).sort(), ['aiad', 'v8']);
  for (const [model, result] of Object.entries(capture.models)) {
    assert.ok(Math.abs(result.raw.waist.tapeCm - reportCapture.models[model].predicted.waist) < 0.02, `${capture.captureId}/${model} waist rerun changed.`);
    assert.ok(Math.abs(result.raw.hips.tapeCm - reportCapture.models[model].predicted.hips) < 0.02, `${capture.captureId}/${model} hip rerun changed.`);
    if (!result.ok) continue;
    assert.equal(result.rows.waist.directTapeChanged, false);
    assert.equal(result.rows.hips.directTapeChanged, false);
    assert.ok(result.rows.waist.depthProWidthCm > 0 || result.rows.waist.appleVisionWidthCm > 0);
    assert.ok(result.rows.hips.depthProWidthCm > 0 || result.rows.hips.appleVisionWidthCm > 0);
  }
}
for (const product of data.products) {
  const url = new URL(product.url);
  assert.equal(url.origin, 'https://preview.myaifitting.com');
  assert.ok(product.chart.orderedSizes.length > 1);
}
assert.equal(new Set(data.products.map((product) => product.url)).size, 200);
assert.equal(data.products.filter((product) => product.sourceUrl).length, 194);

for (const required of [
  'id="photo-camera"',
  'Show Apple Vision + Depth Pro lines only — model measurements stay unchanged',
  'id="gap-sweet-spot"',
  'id="gap-sweet-run"',
  'id="gap-sweet-target"',
  'Desired size accuracy (%)',
  'Find your size-guide sweet spot',
  'Both + and − error must pass',
  'Hip-only is not used because waist-first sizing can make that result look safer than it is.',
  'data-use-sweet-gap',
  'Tested ±1–7 cm tape error and 0.5–15 cm size-guide gaps.',
  'id="photo-line-dialog"',
  'Open A-to-B full screen',
  'Same A and B endpoints',
  'Result without Apple/Depth · Original ',
  'Apple Vision camera check',
  'Result with Apple Vision + Depth Pro',
  'included in both modes',
  'Shahnaz 2',
  'A smaller tape error can still cross a chart boundary.',
  'Why Aiad’s percentage is higher even though V8’s centimetre errors are smaller:',
  'not used to change waist, hip, or the official product-size percentage',
  'trained and tape-validated fusion model',
  'no validated waist or hip circumference',
  'Why the ',
  'Real-tape product coverage',
  'Exact agreement when testable',
  'Exact matches across all products',
  'Why are only ',
  'This is the same starting test for Aiad and V8.',
  'The percentage is <strong>product-size agreement</strong>',
  'not measurement accuracy',
  'Simple explanation for Rustin',
  'AdamW is not running on this page.',
  'id="photo-products"',
  'Open in MyAIFitting',
  'id="photo-share"',
  "'✓ Copied'",
]) assert.ok(html.includes(required), `Missing required report evidence: ${required}`);
assert.ok(!html.includes('id="photo-apple"'), 'Apple Vision must not have a separate switch.');
assert.ok(!html.includes('id="photo-depth"'), 'Depth Pro must not have a separate switch.');
assert.ok(!html.includes('id="photo-error-delta"'), 'Own-model mode must not add a ±1–7 cm model error control.');
assert.ok(!html.includes('id="photo-error-axis"'), 'Own-model mode must not add a model error-axis control.');

const shane = data.people.find((person) => person.scanId === 'shane');
assert.ok(shane);
for (const field of ['waist', 'hips']) {
  const aiadError = Math.abs(shane.predictions.aiad[field] - shane.actuals[field]);
  const v8Error = Math.abs(shane.predictions.v8[field] - shane.actuals[field]);
  assert.ok(v8Error < aiadError, `V8 should be closer than Aiad for Shane ${field}.`);
}

console.log(JSON.stringify({
  ok: true,
  html: htmlPath,
  bytes: Buffer.byteLength(html),
  captures: data.report.captures.length,
  identities: new Set(data.people.map((person) => person.identity)).size,
  products: data.products.length,
  pairedChecks: data.pairs.length,
  cameraSuccesses: data.cameras.captures.flatMap((capture) => Object.values(capture.models)).filter((result) => result.ok).length,
}, null, 2));
