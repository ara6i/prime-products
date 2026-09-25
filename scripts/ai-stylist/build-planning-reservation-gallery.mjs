#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const reservationPath = path.join(
  reportRoot,
  "global-product-reservation-ledger.json",
);
const outputDir = path.join(reportRoot, "planning-reservation-gallery");
const outputImagePath = path.join(outputDir, "planning-products.jpg");
const outputJsonPath = path.join(outputDir, "planning-products.json");

const reservations = JSON.parse(await readFile(reservationPath, "utf8"));
const products = reservations.reservations.filter(
  (entry) => entry.reservationStatus === "reserved-not-outfit-approved",
);
if (products.length !== 14) {
  throw new Error(
    `Expected 14 planning-only reservations after the S133 promotion plus the S189 loafer and S157 quarter-zip style revocations, found ${products.length}`,
  );
}
const identities = products.map((entry) =>
  String(entry.productKey).toLowerCase(),
);
if (new Set(identities).size !== products.length) {
  throw new Error("Planning gallery contains a repeated product identity");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, max) {
  const text = String(value);
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

const columns = 4;
const rows = Math.ceil(products.length / columns);
const cardWidth = 410;
const cardHeight = 595;
const gap = 18;
const margin = 24;
const headerHeight = 118;
const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
const height =
  headerHeight + margin + rows * cardHeight + (rows - 1) * gap + 30;

const cards = await Promise.all(
  products.map(async (product, index) => {
    const image = await sharp(await readFile(product.image), { failOn: "none" })
      .rotate()
      .resize({
        width: cardWidth - 28,
        height: 390,
        fit: "contain",
        background: "#f5f2ea",
      })
      .flatten({ background: "#f5f2ea" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const accent =
      product.slot === "top"
        ? "#4d7e69"
        : product.slot === "bottom"
          ? "#9b6a42"
          : product.slot === "outerwear"
            ? "#4b6c92"
            : "#7d5a91";
    const svg = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#ffffff"/><circle cx="28" cy="28" r="18" fill="#111"/><text x="28" y="34" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${index + 1}</text><text x="56" y="25" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(`${product.scenarioId} · ${product.occasion}`)}</text><text x="56" y="48" font-family="Arial" font-size="12" fill="#666">${escapeXml(`${product.season} · ${product.budget}`)}</text><text x="18" y="453" font-family="Arial" font-size="14" font-weight="700" fill="${accent}">${escapeXml(product.slot.toUpperCase())}</text><text x="18" y="481" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(truncate(product.garmentType, 47))}</text><text x="18" y="508" font-family="Arial" font-size="13" fill="#555">${escapeXml(truncate(product.color, 50))}</text><text x="18" y="536" font-family="Arial" font-size="11" fill="#777">CJ ${escapeXml(product.productId)}</text><text x="18" y="568" font-family="Arial" font-size="11" fill="#9a3f1d">planning only · outfit not approved · not UI integrated</text></svg>`,
    );
    return sharp(svg)
      .composite([{ input: image, left: 14, top: 62 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const baseSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="44" font-family="Arial" font-size="29" font-weight="700" fill="#111">Men’s AI Stylist · ${products.length} planning-only final-alpha products</text><text x="${margin}" y="76" font-family="Arial" font-size="15" fill="#555">After the source-audit revocations, these products still require a complete-look visual pass before approval.</text><text x="${margin}" y="101" font-family="Arial" font-size="13" fill="#777">Local only · unique supplier identities · Wedding and Wedding Guest excluded · no UI integration</text></svg>`,
);

await mkdir(outputDir, { recursive: true });
await sharp(baseSvg)
  .composite(
    cards.map((input, index) => ({
      input,
      left: margin + (index % columns) * (cardWidth + gap),
      top:
        headerHeight +
        margin +
        Math.floor(index / columns) * (cardHeight + gap),
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(outputImagePath);

await writeFile(
  outputJsonPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      status: "collection-level-visual-reaudit-required",
      productCount: products.length,
      uniqueProductIdentities: new Set(identities).size,
      completeOutfitApprovedCount: 0,
      uiIntegrated: false,
      products,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      outputImagePath,
      outputJsonPath,
      productCount: products.length,
      uniqueProductIdentities: new Set(identities).size,
    },
    null,
    2,
  ),
);
