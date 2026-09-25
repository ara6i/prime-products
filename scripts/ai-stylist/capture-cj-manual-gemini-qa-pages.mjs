#!/usr/bin/env node

import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const REPORT =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const MANIFEST = path.join(
  REPORT,
  "cj-manual-gemini-batch/qa-gallery-manifest.json",
);
const OUTPUT_DIR = path.join(REPORT, "cj-manual-gemini-qa-pages");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = Number(process.argv[2] ?? 49135);

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({
  viewport: { width: 1800, height: 1200 },
  deviceScaleFactor: 1,
});
await page.goto(
  `http://127.0.0.1:${port}/${REPORT}/CJ_MANUAL_GEMINI_QA_GALLERY.html`,
  { waitUntil: "networkidle", timeout: 120000 },
);
await page.waitForFunction(
  () => [...document.images].every((image) => image.complete),
  null,
  { timeout: 120000 },
);

const render = await page.evaluate(() => ({
  cards: document.querySelectorAll(".card").length,
  images: document.images.length,
  loaded: [...document.images].filter(
    (image) => image.complete && image.naturalWidth > 0,
  ).length,
  broken: [...document.images]
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.src),
}));

if (
  render.cards !== manifest.products.length ||
  render.images !== manifest.products.length * 2 ||
  render.loaded !== manifest.products.length * 2 ||
  render.broken.length
) {
  throw new Error(`Render failure: ${JSON.stringify(render)}`);
}

for (let start = 1; start <= render.cards; start += 4) {
  const end = Math.min(start + 3, render.cards);
  await page.evaluate(
    ({ start, end }) => {
      const cards = [...document.querySelectorAll(".card")];
      cards.forEach((card, position) => {
        card.hidden = position + 1 < start || position + 1 > end;
      });
    },
    { start, end },
  );
  const pageNumber = String(Math.floor((start - 1) / 4) + 1).padStart(2, "0");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `page-${pageNumber}.png`),
    fullPage: true,
  });
}

await browser.close();
console.log(
  JSON.stringify(
    { outputDir: OUTPUT_DIR, pages: Math.ceil(render.cards / 4), ...render },
    null,
    2,
  ),
);
