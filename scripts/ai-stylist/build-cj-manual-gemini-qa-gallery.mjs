#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const REPORT =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const REQUEST_MANIFEST = path.join(
  REPORT,
  "cj-manual-gemini-batch/request-manifest.json",
);
const RESULT_MANIFEST = path.join(
  REPORT,
  "cj-manual-gemini-batch/result-manifest.json",
);
const GALLERY_MANIFEST = path.join(
  REPORT,
  "cj-manual-gemini-batch/qa-gallery-manifest.json",
);
const GALLERY = path.join(REPORT, "CJ_MANUAL_GEMINI_QA_GALLERY.html");

const requests = JSON.parse(await readFile(REQUEST_MANIFEST, "utf8"));
const results = JSON.parse(await readFile(RESULT_MANIFEST, "utf8"));
const requestById = new Map(
  requests.requests.map((request) => [request.productId, request]),
);

const rows = [];
for (const result of results.results) {
  const request = requestById.get(result.productId);
  if (!request || !result.outputPath) {
    throw new Error(`Missing source or output for ${result.productId}.`);
  }
  const [sourceMetadata, outputMetadata] = await Promise.all([
    sharp(request.localPath).metadata(),
    sharp(result.outputPath).metadata(),
  ]);
  rows.push({
    ...request,
    outputPath: result.outputPath,
    outputMimeType: result.outputMimeType,
    sourceDimensions: `${sourceMetadata.width} × ${sourceMetadata.height}`,
    outputDimensions: `${outputMetadata.width} × ${outputMetadata.height}`,
  });
}

await mkdir(path.dirname(GALLERY_MANIFEST), { recursive: true });
await writeFile(
  GALLERY_MANIFEST,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      count: rows.length,
      products: rows,
    },
    null,
    2,
  )}\n`,
);

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const cards = rows
  .map(
    (product) => `
      <article class="card" data-index="${product.index}">
        <div class="card-head">
          <span class="number">${product.index}</span>
          <div><p>${escapeHtml(product.garmentType)} · ${escapeHtml(product.color)}</p><h2>${escapeHtml(product.title)}</h2></div>
        </div>
        <div class="comparison">
          <figure><figcaption>Exact CJ source · ${product.sourceDimensions}</figcaption><div class="image-wrap"><img src="/${escapeHtml(product.localPath)}" alt="Source ${escapeHtml(product.title)}" /></div></figure>
          <figure><figcaption>Raw Gemini refinement · ${product.outputDimensions}</figcaption><div class="image-wrap"><img src="/${escapeHtml(product.outputPath)}" alt="Gemini ${escapeHtml(product.title)}" /></div></figure>
        </div>
        <code>${escapeHtml(product.productId)} · ${escapeHtml(product.sku)}</code>
      </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CJ Gemini source-faithfulness QA</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#e9e5dd;color:#181713;font-family:Inter,system-ui,sans-serif}header{padding:22px 28px;background:#f8f6f1;border-bottom:1px solid #cbc6bc}h1{margin:0 0 7px;font:500 34px/1.1 Georgia,serif}header p{margin:0;max-width:1100px;color:#635e55;line-height:1.45}main{padding:18px 22px 44px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{border:1px solid #d0cbc1;border-radius:14px;background:#fff;padding:13px}.card[hidden]{display:none}.card-head{display:grid;grid-template-columns:36px 1fr;gap:10px;align-items:start}.number{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#171612;color:white;font-weight:800}.card-head p{margin:0;color:#56715e;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.card h2{margin:4px 0 11px;font-size:15px;line-height:1.25}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:8px}figure{margin:0}figcaption{margin-bottom:5px;color:#6f685e;font-size:10px;font-weight:700}.image-wrap{height:350px;background:#f5f3ef;border:1px solid #e0ddd6;border-radius:8px;overflow:hidden}.image-wrap img{width:100%;height:100%;object-fit:contain;display:block}.card code{display:block;margin-top:9px;color:#837c71;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  </style>
</head>
<body>
  <header><h1>Source ↔ raw Gemini identity QA</h1><p>Local-only comparison board. A result passes only if color, silhouette, construction, seams, texture, hardware, sole and proportions match the exact source. Background quality is secondary here; failed identity drift is never repaired by background removal.</p></header>
  <main><section class="grid">${cards}</section></main>
</body>
</html>`;

await writeFile(GALLERY, html, "utf8");
console.log(JSON.stringify({ count: rows.length, gallery: GALLERY }, null, 2));
