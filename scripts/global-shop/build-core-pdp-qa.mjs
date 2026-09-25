import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SHOP_PRODUCTS } from "./nano-banana-products.mjs";

const ROOT = process.cwd();
const CANDIDATE_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923/core-pdp/candidates",
);
const QA_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923/core-pdp/qa",
);
const VIEWS = [
  { id: "product-back", filename: "02-product-back.png" },
  { id: "model-front", filename: "03-model-front.png" },
  { id: "detail", filename: "08-detail.png" },
];
const CELL_WIDTH = 360;
const CELL_HEIGHT = 510;
const IMAGE_WIDTH = 320;
const IMAGE_HEIGHT = 400;
const COLUMNS = 4;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function buildSheet(view) {
  const entries = [];
  const missing = [];
  for (const product of SHOP_PRODUCTS) {
    const filePath = path.join(CANDIDATE_DIR, product.slug, view.filename);
    if (!existsSync(filePath)) {
      missing.push(`${product.slug}/${view.filename}`);
      continue;
    }
    const metadata = await sharp(filePath).metadata();
    entries.push({ product, filePath, width: metadata.width, height: metadata.height });
  }
  if (missing.length) throw new Error(`Missing ${missing.length} ${view.id} candidates:\n${missing.join("\n")}`);

  const rows = Math.ceil(entries.length / COLUMNS);
  const composites = [];
  for (const [index, entry] of entries.entries()) {
    const left = (index % COLUMNS) * CELL_WIDTH;
    const top = Math.floor(index / COLUMNS) * CELL_HEIGHT;
    const image = await sharp(entry.filePath)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
        fit: "contain",
        background: "#f7f6f3",
      })
      .png()
      .toBuffer();
    composites.push({ input: image, left: left + 20, top: top + 18 });
    const label = Buffer.from(`
      <svg width="${CELL_WIDTH}" height="72">
        <style>
          .name { font: 600 13px Arial, sans-serif; fill: #171717; }
          .meta { font: 11px Arial, sans-serif; fill: #66615b; }
        </style>
        <text x="20" y="22" class="name">${escapeXml(entry.product.name)}</text>
        <text x="20" y="45" class="meta">${escapeXml(entry.product.gender)} · ${escapeXml(entry.product.type)} · ${entry.width}×${entry.height}</text>
      </svg>`);
    composites.push({ input: label, left, top: top + 426 });
  }

  const destination = path.join(QA_DIR, `${view.id}-contact-sheet.png`);
  await sharp({
    create: {
      width: COLUMNS * CELL_WIDTH,
      height: rows * CELL_HEIGHT,
      channels: 3,
      background: "#eeeae4",
    },
  })
    .composite(composites)
    .png()
    .toFile(destination);
  return {
    view: view.id,
    count: entries.length,
    allFourByFive: entries.every(
      (entry) => Math.abs(entry.width / entry.height - 0.8) <= 0.01,
    ),
    contactSheet: path.relative(ROOT, destination),
  };
}

mkdirSync(QA_DIR, { recursive: true });
const reports = [];
for (const view of VIEWS) reports.push(await buildSheet(view));
const report = { generatedAt: new Date().toISOString(), reports };
writeFileSync(
  path.join(QA_DIR, "technical-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
