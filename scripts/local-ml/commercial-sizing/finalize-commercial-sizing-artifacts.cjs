#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const USB_ROOT = process.env.WEAR_COMMERCIAL_REPORT_ROOT
  || '/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/waist-hip-commercial-validation';
const WORKBOOK = 'PrimeStyleAI_100_Product_Sizing_Validation_Completed.xlsx';
const REQUIRED = [
  'manifest.json',
  'manifest.sha256',
  'v8-cpu-inference.json',
  'report.json',
  'decisions.csv',
  'review-initial.json',
  'build-hashes.json',
  WORKBOOK,
];

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function writeNew(file, value) {
  fs.writeFileSync(file, value, { flag: 'wx', mode: 0o600 });
}

function main() {
  const buildArgument = argument('--build');
  if (!buildArgument) throw new Error('Use --build with the verified local report directory.');
  const buildDirectory = path.resolve(buildArgument);
  for (const file of REQUIRED) {
    const source = path.join(buildDirectory, file);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`Verified build artifact is missing: ${file}`);
  }
  const report = JSON.parse(fs.readFileSync(path.join(buildDirectory, 'report.json'), 'utf8'));
  if (report.schema !== 'CommercialSizingReportV1' || !/^waist-hip-commercial-100-[0-9TZ]+$/.test(report.reportId)) {
    throw new Error('The completed report identity is invalid.');
  }
  if (!USB_ROOT.startsWith('/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/')) {
    throw new Error('Final commercial artifacts must stay on the external PrimeStorage volume.');
  }
  fs.mkdirSync(USB_ROOT, { recursive: true, mode: 0o700 });
  const finalDirectory = path.join(USB_ROOT, report.reportId);
  if (fs.existsSync(finalDirectory)) throw new Error(`Immutable report already exists: ${finalDirectory}`);
  const staging = fs.mkdtempSync(path.join(USB_ROOT, '.staging-'), { encoding: 'utf8' });
  const hashes = {};
  for (const file of REQUIRED) {
    const source = path.join(buildDirectory, file);
    const target = path.join(staging, file);
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(target, 0o600);
    hashes[file] = sha256File(target);
  }
  const index = {
    schema: 'commercial-sizing-artifact-index-v1',
    reportId: report.reportId,
    finalizedAt: new Date().toISOString(),
    immutableWriteMode: 'create-only',
    files: hashes,
  };
  writeNew(path.join(staging, 'artifact-index.json'), `${JSON.stringify(index, null, 2)}\n`);
  hashes['artifact-index.json'] = sha256File(path.join(staging, 'artifact-index.json'));
  const sums = Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)).map(([file, hash]) => `${hash}  ${file}`).join('\n');
  writeNew(path.join(staging, 'SHA256SUMS.txt'), `${sums}\n`);
  fs.renameSync(staging, finalDirectory);
  process.stdout.write(`${JSON.stringify({ ok: true, reportId: report.reportId, finalDirectory, files: Object.keys(hashes).length + 1 }, null, 2)}\n`);
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

module.exports = { main };
