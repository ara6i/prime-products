#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const REPORT =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const INPUT = path.join(REPORT, "cj-manual-approved-candidates.json");
const OUTPUT_DIR = path.join(REPORT, "cj-manual-refinement-sources");
const MANIFEST = path.join(OUTPUT_DIR, "manifest.json");
const GALLERY = path.join(REPORT, "CJ_MANUAL_REFINEMENT_SOURCE_GALLERY.html");

const source = JSON.parse(await readFile(INPUT, "utf8"));
await mkdir(OUTPUT_DIR, { recursive: true });

const extensionFor = (contentType) => {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
};

const downloaded = [];
for (const [index, product] of source.products.entries()) {
  const response = await fetch(product.sourceImage, {
    headers: { "user-agent": "Mozilla/5.0 PrimeStyleAI local visual QA" },
  });
  if (!response.ok) {
    throw new Error(
      `Source download failed for ${product.productId}: ${response.status}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error(
      `Unexpected content type for ${product.productId}: ${contentType}`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  const extension = extensionFor(contentType);
  const fileName = `${String(index + 1).padStart(2, "0")}-${product.productId}-source.${extension}`;
  const localPath = path.join(OUTPUT_DIR, fileName);
  await writeFile(localPath, bytes);

  downloaded.push({
    index: index + 1,
    productId: product.productId,
    sku: product.sku,
    title: product.title,
    productKind: product.productKind,
    garmentType: product.garmentType,
    color: product.color,
    status: product.status,
    cjPageUrl: product.cjPageUrl,
    sourceImage: product.sourceImage,
    localPath,
    contentType,
    bytes: bytes.length,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

await writeFile(
  MANIFEST,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      source: INPUT,
      instruction:
        "These are source candidates only. Each image must pass full-resolution identity, detail, color, silhouette, and single-product-boundary QA before any Gemini refinement request.",
      products: downloaded,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const cards = downloaded
  .map(
    (product) => `
      <article class="card" data-index="${product.index}">
        <div class="image-wrap">
          <span class="number">${product.index}</span>
          <img src="/${escapeHtml(product.localPath)}" alt="${escapeHtml(product.title)}" />
        </div>
        <div class="content">
          <p class="kind">${escapeHtml(product.productKind)} · ${escapeHtml(product.garmentType)}</p>
          <h2>${escapeHtml(product.title)}</h2>
          <p><b>Selected color:</b> ${escapeHtml(product.color)}</p>
          <p><b>Source:</b> ${product.width} × ${product.height} · ${Math.round(product.bytes / 1024)} KB</p>
          <p><b>Status:</b> ${escapeHtml(product.status)}</p>
          <code>${escapeHtml(product.productId)} · ${escapeHtml(product.sku)}</code>
        </div>
      </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CJ manual refinement source QA</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#eeeae3;color:#191815;font-family:Inter,system-ui,sans-serif}
    header{padding:24px 30px;border-bottom:1px solid #d3cec4;background:#f7f4ee} h1{margin:0 0 8px;font:500 38px/1.1 Georgia,serif}
    header p{max-width:940px;margin:0;color:#656158;line-height:1.5} main{padding:22px 26px 50px}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.card{overflow:hidden;border:1px solid #d9d5cc;border-radius:14px;background:#fff}
    .card[hidden]{display:none}.image-wrap{position:relative;height:520px;background:#faf9f6}.image-wrap img{width:100%;height:100%;object-fit:contain;display:block}
    .number{position:absolute;z-index:1;top:10px;left:10px;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#171612;color:#fff;font-weight:800}
    .content{padding:13px}.kind{margin:0;color:#486653;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}h2{min-height:44px;margin:7px 0 10px;font-size:16px;line-height:1.3}
    .content p{margin:5px 0;color:#615d55;font-size:11px;line-height:1.4}.content code{display:block;margin-top:9px;overflow:hidden;color:#8b857a;font-size:9px;text-overflow:ellipsis;white-space:nowrap}
  </style>
</head>
<body>
  <header><h1>29 CJ refinement source candidates</h1><p>Local pre-generation board. Approval here requires a single clear product identity, the exact selected color, enough construction and texture detail, usable garment boundaries, and no mixed-product or low-resolution ambiguity. No image on this page has been sent to Gemini yet.</p></header>
  <main><section class="grid">${cards}</section></main>
</body>
</html>`;

await writeFile(GALLERY, html, "utf8");
console.log(
  JSON.stringify(
    {
      products: downloaded.length,
      manifest: MANIFEST,
      gallery: GALLERY,
      dimensions: downloaded.map(({ productId, width, height, bytes }) => ({
        productId,
        width,
        height,
        bytes,
      })),
    },
    null,
    2,
  ),
);
