#!/usr/bin/env node

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const REPORT = 'output/reports/ai-stylist-mens-global-unique-visual-v16-20260913';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const batch = Number(process.argv[2]);
const port = Number(process.argv[3] || 49135);
const allowBroken = process.argv[4] === 'allow-broken';

if (!batch) {
  throw new Error('Usage: capture-raw-priority-batch-pages.mjs <batch> [port]');
}

const batchPadded = String(batch).padStart(2, '0');
const outputDir = path.join(REPORT, `raw-priority-batch-${batchPadded}-pages`);
await fs.mkdir(outputDir, { recursive: true });
const batchData = JSON.parse(
  await fs.readFile(path.join(REPORT, `raw-priority-batch-${batchPadded}.json`), 'utf8'),
);
const expectedCards = batchData.products.length;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
const url = `http://127.0.0.1:${port}/${REPORT}/UNREVIEWED_RAW_PRIORITY_BATCH_${batchPadded}.html`;
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 120000 });

const render = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.card')];
  const images = [...document.images];
  return {
    cards: cards.length,
    displayedImages: images.length,
    loaded: images.filter((image) => image.complete && image.naturalWidth > 0).length,
    broken: images.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
    slots: Object.fromEntries([...new Set(cards.map((card) => card.dataset.slot))].map((slot) => [slot, cards.filter((card) => card.dataset.slot === slot).length])),
  };
});

if (
  render.cards !== expectedCards ||
  (!allowBroken && render.broken.length) ||
  (!allowBroken && render.loaded !== render.displayedImages)
) {
  throw new Error(`Render failure: ${JSON.stringify(render)}`);
}

for (let start = 1; start <= render.cards; start += 4) {
  const end = start + 3;
  await page.evaluate(({ start, end }) => {
    for (const card of document.querySelectorAll('.card')) {
      const index = Number(card.dataset.index);
      card.hidden = index < start || index > end;
    }
  }, { start, end });
  const pageNumber = String(Math.floor((start - 1) / 4) + 1).padStart(2, '0');
  await page.screenshot({ path: path.join(outputDir, `page-${pageNumber}.png`), fullPage: true });
}

await browser.close();
console.log(JSON.stringify({ batch, outputDir, allowBroken, ...render, pages: Math.ceil(render.cards / 4) }, null, 2));
