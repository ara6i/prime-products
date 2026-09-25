import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SHOP_PRODUCTS } from "./nano-banana-products.mjs";

const ROOT = process.cwd();
const CANDIDATE_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923/model-variants/candidates",
);
const QA_DIR = path.join(
  ROOT,
  "output/reports/global-shop-nano-banana-v4-20260923/model-variants/qa",
);
const VIEWS = [
  ["model-three-quarter", "04-model-three-quarter.png"],
  ["model-back", "05-model-back.png"],
  ["model-movement", "06-model-movement.png"],
  ["model-crop", "07-model-crop.png"],
  ["model-alternate", "09-model-alternate.png"],
];
const CELL_WIDTH = 300;
const CELL_HEIGHT = 426;
const IMAGE_WIDTH = 270;
const IMAGE_HEIGHT = 336;
const COLUMNS = 5;

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function buildSheet([viewId, filename]) {
  const entries = [];
  for (const product of SHOP_PRODUCTS) {
    const filePath = path.join(CANDIDATE_DIR, product.slug, filename);
    if (!existsSync(filePath)) throw new Error(`Missing ${product.slug}/${filename}`);
    const metadata = await sharp(filePath).metadata();
    entries.push({ product, filePath, width: metadata.width, height: metadata.height });
  }
  const rows = Math.ceil(entries.length / COLUMNS);
  const composites = [];
  for (const [index, entry] of entries.entries()) {
    const left = (index % COLUMNS) * CELL_WIDTH;
    const top = Math.floor(index / COLUMNS) * CELL_HEIGHT;
    const image = await sharp(entry.filePath)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "contain", background: "#f7f6f3" })
      .png()
      .toBuffer();
    composites.push({ input: image, left: left + 15, top: top + 12 });
    const label = Buffer.from(`
      <svg width="${CELL_WIDTH}" height="70">
        <style>.name{font:600 11px Arial;fill:#171717}.meta{font:10px Arial;fill:#66615b}</style>
        <text x="15" y="21" class="name">${escapeXml(entry.product.name)}</text>
        <text x="15" y="43" class="meta">${entry.product.gender} · ${entry.product.type} · ${entry.width}×${entry.height}</text>
      </svg>`);
    composites.push({ input: label, left, top: top + 350 });
  }
  const destination = path.join(QA_DIR, `${viewId}-contact-sheet.png`);
  await sharp({
    create: {
      width: COLUMNS * CELL_WIDTH,
      height: rows * CELL_HEIGHT,
      channels: 3,
      background: "#eeeae4",
    },
  }).composite(composites).png().toFile(destination);
  return {
    view: viewId,
    count: entries.length,
    allFourByFive: entries.every((entry) => Math.abs(entry.width / entry.height - 0.8) <= 0.01),
    contactSheet: path.relative(ROOT, destination),
  };
}

mkdirSync(QA_DIR, { recursive: true });
const reports = [];
for (const view of VIEWS) reports.push(await buildSheet(view));
const report = { generatedAt: new Date().toISOString(), reports };
writeFileSync(path.join(QA_DIR, "technical-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
