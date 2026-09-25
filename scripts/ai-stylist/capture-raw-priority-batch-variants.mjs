#!/usr/bin/env node

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');

const REPORT = 'output/reports/ai-stylist-mens-global-unique-visual-v16-20260913';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const batch = Number(process.argv[2]);
const requestedCards = (process.argv[3] || '')
  .split(',')
  .filter(Boolean)
  .map(Number);
const port = Number(process.argv[4] || 49135);

if (!batch || requestedCards.length === 0) {
  throw new Error('Usage: capture-raw-priority-batch-variants.mjs <batch> <comma-separated cards> [port]');
}

const batchPadded = String(batch).padStart(2, '0');
const manifestPath = path.join(REPORT, `raw-priority-batch-${batchPadded}.json`);
const outputDir = path.join(REPORT, `raw-priority-batch-${batchPadded}-pages`);
const variantDir = path.join(outputDir, 'variants');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const selected = manifest.products.filter((product) => requestedCards.includes(product.card));

if (selected.length !== requestedCards.length) {
  throw new Error(`Requested ${requestedCards.length} cards but found ${selected.length}`);
}

await fs.mkdir(variantDir, { recursive: true });

const slug = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
const url = `http://127.0.0.1:${port}/${REPORT}/UNREVIEWED_RAW_PRIORITY_BATCH_${batchPadded}.html`;
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });

const captures = [];
for (const product of selected) {
  const card = page.locator(`.card[data-index="${product.card}"]`);
  await card.scrollIntoViewIfNeeded();

  for (const color of product.colors) {
    const button = card.locator(`.thumb[data-color="${color.color.replaceAll('"', '\\"')}"]`);
    await button.click();
    await card.locator('.hero-image').evaluate((image) => image.complete && image.naturalWidth > 0);
    await page.waitForTimeout(175);

    const filename = `card-${String(product.card).padStart(2, '0')}-${slug(color.color)}.png`;
    const outputPath = path.join(variantDir, filename);
    await card.screenshot({ path: outputPath });
    captures.push({ card: product.card, color: color.color, path: outputPath });
  }
}

await browser.close();

const sheetWidth = 1800;
const sheetHeight = 2084;
const columns = 3;
const rows = 4;
const margin = 20;
const gap = 14;
const cellWidth = Math.floor((sheetWidth - (margin * 2) - (gap * (columns - 1))) / columns);
const cellHeight = Math.floor((sheetHeight - (margin * 2) - (gap * (rows - 1))) / rows);
const imageHeight = cellHeight - 44;

for (let start = 0, sheet = 1; start < captures.length; start += columns * rows, sheet += 1) {
  const slice = captures.slice(start, start + (columns * rows));
  const composites = [];

  for (let i = 0; i < slice.length; i += 1) {
    const capture = slice[i];
    const column = i % columns;
    const row = Math.floor(i / columns);
    const left = margin + column * (cellWidth + gap);
    const top = margin + row * (cellHeight + gap);
    const cardImage = await sharp(capture.path)
      .resize(cellWidth - 20, imageHeight - 16, { fit: 'contain', background: '#ffffff' })
      .png()
      .toBuffer();
    const label = `Card ${capture.card} · ${capture.color}`
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    const cellSvg = Buffer.from(`
      <svg width="${cellWidth}" height="${cellHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="${cellWidth - 2}" height="${cellHeight - 2}" rx="10" fill="#fff" stroke="#d8d3c9" stroke-width="2"/>
        <text x="14" y="${cellHeight - 14}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#171714">${label}</text>
      </svg>`);
    composites.push({ input: cellSvg, left, top });
    composites.push({ input: cardImage, left: left + 10, top: top + 8 });
  }

  const outputPath = path.join(outputDir, `variant-contact-${String(sheet).padStart(2, '0')}.png`);
  await sharp({
    create: { width: sheetWidth, height: sheetHeight, channels: 3, background: '#f2f0ea' },
  }).composite(composites).png().toFile(outputPath);
}

console.log(JSON.stringify({ batch, cards: requestedCards, captures: captures.length, sheets: Math.ceil(captures.length / 12) }, null, 2));
