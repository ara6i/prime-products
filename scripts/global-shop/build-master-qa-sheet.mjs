import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SHOP_PRODUCTS, validateProducts } from "./nano-banana-products.mjs";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public/media/global-shop/showcase-v4");
const REPORT_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923/qa",
);
const CELL_WIDTH = 420;
const CELL_HEIGHT = 590;
const IMAGE_WIDTH = 360;
const IMAGE_HEIGHT = 450;
const COLUMNS = 4;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

validateProducts();
mkdirSync(REPORT_DIR, { recursive: true });

const missing = [];
const records = [];
for (const product of SHOP_PRODUCTS) {
  const filePath = path.join(
    PUBLIC_DIR,
    product.gender,
    product.slug,
    "01-product-front.png",
  );
  if (!existsSync(filePath)) {
    missing.push(product.slug);
    continue;
  }
  const metadata = await sharp(filePath).metadata();
  records.push({
    ...product,
    filePath,
    width: metadata.width,
    height: metadata.height,
    aspectRatio: Number((metadata.width / metadata.height).toFixed(4)),
  });
}

if (missing.length) {
  throw new Error(`Missing ${missing.length} masters:\n${missing.join("\n")}`);
}

const rows = Math.ceil(records.length / COLUMNS);
const composites = [];
for (const [index, record] of records.entries()) {
  const left = (index % COLUMNS) * CELL_WIDTH;
  const top = Math.floor(index / COLUMNS) * CELL_HEIGHT;
  const image = await sharp(record.filePath)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
      fit: "contain",
      background: "#f7f6f3",
    })
    .png()
    .toBuffer();
  composites.push({ input: image, left: left + 30, top: top + 24 });
  const label = Buffer.from(`
    <svg width="${CELL_WIDTH}" height="100">
      <style>
        .name { font: 600 15px Arial, sans-serif; fill: #171717; }
        .meta { font: 12px Arial, sans-serif; fill: #66615b; }
      </style>
      <text x="30" y="24" class="name">${escapeXml(record.name)}</text>
      <text x="30" y="49" class="meta">${escapeXml(record.gender)} · ${escapeXml(record.type)} · ${record.width}×${record.height}</text>
      <text x="30" y="72" class="meta">${escapeXml(record.color)}</text>
    </svg>`);
  composites.push({ input: label, left, top: top + 485 });
}

const sheetPath = path.join(REPORT_DIR, "masters-contact-sheet.png");
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
  .toFile(sheetPath);

const report = {
  generatedAt: new Date().toISOString(),
  expectedCount: SHOP_PRODUCTS.length,
  actualCount: records.length,
  allFourByFive: records.every(
    (record) => Math.abs(record.aspectRatio - 0.8) <= 0.01,
  ),
  contactSheet: path.relative(ROOT, sheetPath),
  records: records.map((record) => ({
    slug: record.slug,
    gender: record.gender,
    type: record.type,
    name: record.name,
    color: record.color,
    width: record.width,
    height: record.height,
    aspectRatio: record.aspectRatio,
    path: path.relative(ROOT, record.filePath),
  })),
};
writeFileSync(
  path.join(REPORT_DIR, "masters-technical-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
