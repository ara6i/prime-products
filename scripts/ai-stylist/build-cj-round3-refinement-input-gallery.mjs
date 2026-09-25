#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const reportRoot = path.join(
  process.cwd(),
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const decisionsPath = path.join(
  reportRoot,
  "cj-manual-round3/refinement-input-decisions.json",
);
const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
const readyCount = decisions.products.length;
if (readyCount !== decisions.summary.bestRefinementInputsSelected) {
  throw new Error(
    `Ready product count ${readyCount} does not match summary ${decisions.summary.bestRefinementInputsSelected}`,
  );
}
if (new Set(decisions.products.map((product) => product.productId)).size !== readyCount) {
  throw new Error("The refinement-ready product list contains a duplicate product identity");
}
await Promise.all(
  decisions.products.map(async (product) => {
    const productDir = path.dirname(path.dirname(product.bestRefinementInput));
    const productRecord = JSON.parse(
      await readFile(path.join(reportRoot, productDir, "product.json"), "utf8"),
    );
    const expectedInput = path.join("source", path.basename(product.bestRefinementInput));
    const recordedInput =
      productRecord.bestRefinementInput ?? productRecord.selectedSourceImage;
    if (String(productRecord.productId) !== String(product.productId)) {
      throw new Error(`Product record identity mismatch for ${product.productId}`);
    }
    if (
      !productRecord.status.startsWith("source-imported-") ||
      productRecord.status.includes("revoked")
    ) {
      throw new Error(`Product record is not refinement-ready: ${product.productId}`);
    }
    if (recordedInput !== expectedInput) {
      throw new Error(
        `Selected source mismatch for ${product.productId}: ${recordedInput} != ${expectedInput}`,
      );
    }
    if (
      productRecord.gates?.bestRefinementInputSelected !== true ||
      productRecord.gates?.refinementAuthorized !== false ||
      productRecord.gates?.refinementComplete !== false
    ) {
      throw new Error(`Refinement gate mismatch for ${product.productId}`);
    }
  }),
);

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const escapeHtml = (value) =>
  escapeXml(value).replaceAll("&apos;", "&#039;");

const tileWidth = 390;
const tileHeight = 525;
const columns = 4;
const rows = Math.ceil(decisions.products.length / columns);
const headerHeight = 132;
const width = columns * tileWidth;
const height = headerHeight + rows * tileHeight;

const tiles = await Promise.all(
  decisions.products.map(async (product, index) => {
    const sourcePath = path.join(reportRoot, product.bestRefinementInput);
    const image = await sharp(sourcePath, { failOn: "none" })
      .rotate()
      .resize({
        width: tileWidth - 32,
        height: 324,
        fit: "contain",
        background: "#f8f6f1",
      })
      .flatten({ background: "#f8f6f1" })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8f6f1"/><rect width="100%" height="100%" fill="none" stroke="#d8d2c7"/><circle cx="30" cy="30" r="19" fill="#171612"/><text x="30" y="36" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#fff">${index + 1}</text><text x="18" y="398" font-family="Arial" font-size="14" font-weight="700" fill="#171612">${escapeXml(product.scenarioId)} · ${escapeXml(product.category.toUpperCase())}</text><text x="18" y="424" font-family="Arial" font-size="13" fill="#486653">${escapeXml(product.selectedColor.slice(0, 44))}</text><text x="18" y="452" font-family="Arial" font-size="12" fill="#383630">${escapeXml(product.title.slice(0, 50))}</text><text x="18" y="493" font-family="Arial" font-size="10" fill="#898277">${escapeXml(product.productId)}</text></svg>`,
    );
    return sharp(label).composite([{ input: image, left: 16, top: 52 }]).png().toBuffer();
  }),
);

const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ece8df"/><text x="32" y="44" font-family="Arial" font-size="30" font-weight="700" fill="#171612">Men’s AI Stylist · ${readyCount} CJ refinement inputs</text><text x="32" y="78" font-family="Arial" font-size="16" fill="#486653">Exact-page source images · visually selected one by one · local only</text><text x="32" y="108" font-family="Arial" font-size="13" fill="#655f56">Prepared, not sent to Gemini · no background removal · no final outfit approval · no UI integration</text></svg>`,
);
const boardPath = path.join(reportRoot, "CJ_ROUND3_REFINEMENT_INPUTS.jpg");
await sharp(base)
  .composite(
    tiles.map((input, index) => ({
      input,
      left: (index % columns) * tileWidth,
      top: headerHeight + Math.floor(index / columns) * tileHeight,
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(boardPath);

const cards = decisions.products
  .map(
    (product, index) => `<article class="card">
      <div class="visual"><span>${index + 1}</span><img src="/${escapeHtml(path.join("output/reports/ai-stylist-mens-global-unique-visual-v16-20260913", product.bestRefinementInput))}" alt="${escapeHtml(product.title)}"></div>
      <div class="copy"><p class="meta">${escapeHtml(product.scenarioId)} · ${escapeHtml(product.category)}</p><h2>${escapeHtml(product.title)}</h2><p><b>Color:</b> ${escapeHtml(product.selectedColor)}</p><p>${escapeHtml(product.visualReason)}</p><code>${escapeHtml(product.productId)}</code></div>
    </article>`,
  )
  .join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${readyCount} CJ refinement inputs</title><style>*{box-sizing:border-box}body{margin:0;background:#ece8df;color:#181713;font-family:Inter,system-ui,sans-serif}header{padding:28px 34px;border-bottom:1px solid #d3cdc1;background:#f8f6f1}h1{margin:0 0 7px;font:500 40px/1.1 Georgia,serif}header p{margin:0;color:#625d54}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding:22px}.card{overflow:hidden;border:1px solid #d6d0c5;border-radius:15px;background:#fff}.visual{position:relative;height:490px;background:#faf9f6}.visual span{position:absolute;z-index:1;top:12px;left:12px;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#171612;color:#fff;font-weight:800}.visual img{width:100%;height:100%;object-fit:contain}.copy{padding:15px}.meta{margin:0;color:#486653;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.copy h2{min-height:42px;margin:7px 0 10px;font-size:16px;line-height:1.3}.copy p{color:#5f5a51;font-size:12px;line-height:1.45}.copy code{font-size:10px;color:#8a8378}@media(max-width:1000px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){main{grid-template-columns:1fr}}</style></head><body><header><h1>${readyCount} source-faithful refinement inputs</h1><p>Exact CJ product pages · visually selected one by one · local only · prepared but not sent to Gemini</p></header><main>${cards}</main></body></html>`;
const htmlPath = path.join(reportRoot, "CJ_ROUND3_REFINEMENT_INPUT_GALLERY.html");
await writeFile(htmlPath, html, "utf8");

console.log(JSON.stringify({ products: decisions.products.length, boardPath, htmlPath }, null, 2));
