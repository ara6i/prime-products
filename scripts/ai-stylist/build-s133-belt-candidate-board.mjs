#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "spring-casual-budget-core-s133-02");
const currentDirection = JSON.parse(
  await readFile(path.join(outputDir, "three-piece-direction.json"), "utf8"),
);
const beltDecision = JSON.parse(
  await readFile(path.join(reportRoot, "cj-manual-round4/refinement-input-decisions.json"), "utf8"),
).products[0];

if (currentDirection.scenarioId !== "S133" || currentDirection.products.length !== 4) {
  throw new Error("Expected the visually screened four-piece S133 direction");
}
if (beltDecision?.scenarioId !== "S133" || beltDecision.visualQaDecision !== "ready-for-source-faithful-refinement") {
  throw new Error("Missing the visually approved S133 belt source candidate");
}

const products = [
  ...currentDirection.products,
  {
    role: "ACCESSORY · SOURCE CANDIDATE",
    title: "Brown Cowhide Minimal Pin Belt",
    color: beltDecision.selectedColor,
    price: 3.47,
    identity: beltDecision.identity,
    image: path.join(reportRoot, beltDecision.bestRefinementInput),
    note: "Exact Brown Style B · source QA passed · refinement not authorized",
  },
];

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

const cardWidth = 365;
const cardHeight = 610;
const gap = 18;
const margin = 28;
const headerHeight = 150;
const footerHeight = 150;
const width = margin * 2 + products.length * cardWidth + (products.length - 1) * gap;
const height = headerHeight + cardHeight + footerHeight + margin * 2;

const cards = [];
for (const product of products) {
  const image = await sharp(await imageBuffer(product.image), { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 28, height: 370, fit: "contain", background: "#f7f4ed" })
    .flatten({ background: "#f7f4ed" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const note = product.note ?? "One unique identity · visually screened for this direction";
  const card = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><text x="18" y="30" font-family="Arial" font-size="11" font-weight="700" fill="#45634f">${escapeXml(product.role)}</text><text x="18" y="445" font-family="Arial" font-size="17" font-weight="700" fill="#111">${escapeXml(product.title)}</text><text x="18" y="474" font-family="Arial" font-size="13" fill="#666">${escapeXml(product.color)} · $${Number(product.price).toFixed(2)}</text><text x="18" y="515" font-family="Arial" font-size="11" fill="#555">${escapeXml(note.slice(0, 56))}</text><text x="18" y="565" font-family="Arial" font-size="9" fill="#999">${escapeXml(String(product.identity).slice(0, 58))}</text></svg>`,
  );
  cards.push(
    await sharp(card)
      .composite([{ input: image, left: 14, top: 48 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const merchandiseSubtotal = products.reduce((sum, product) => sum + Number(product.price), 0);
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="45" font-family="Arial" font-size="30" font-weight="700" fill="#111">S133 · Spring Casual Everyday · five-piece candidate direction</text><text x="${margin}" y="78" font-family="Arial" font-size="16" fill="#555">Cream texture · French blue · washed light blue · two warm-brown accents</text><text x="${margin}" y="108" font-family="Arial" font-size="13" fill="#8a3d1d">Merchandise subtotal $${merchandiseSubtotal.toFixed(2)} before shipping · five unique identities · light Spring palette</text><text x="${margin}" y="${headerHeight + cardHeight + 44}" font-family="Arial" font-size="17" font-weight="700" fill="#111">Still required before outfit approval</text><text x="${margin}" y="${headerHeight + cardHeight + 76}" font-family="Arial" font-size="14" fill="#555">SHOE · unique cream low-profile sneaker with a slim restrained sole</text><text x="${margin}" y="${headerHeight + cardHeight + 112}" font-family="Arial" font-size="12" fill="#8a3d1d">BELT IS SOURCE-APPROVED ONLY · REFINEMENT NOT AUTHORIZED · NOT A COMPLETE OUTFIT · NOT UI INTEGRATED</text></svg>`,
);

await mkdir(outputDir, { recursive: true });
const boardPath = path.join(outputDir, "five-piece-belt-candidate.jpg");
await sharp(base)
  .composite(
    cards.map((input, index) => ({
      input,
      left: margin + index * (cardWidth + gap),
      top: headerHeight,
    })),
  )
  .jpeg({ quality: 95 })
  .toFile(boardPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioId: "S133",
  occasion: "Casual Everyday",
  season: "Spring",
  budget: "Budget-Friendly",
  status: "visual-five-piece-candidate-awaiting-unique-shoe-and-belt-refinement",
  decision: "visual-direction-pass-incomplete",
  products,
  merchandiseSubtotalBeforeShipping: Number(merchandiseSubtotal.toFixed(2)),
  missingSlots: ["shoe"],
  completeOutfitApproved: false,
  beltRefinementAuthorized: false,
  beltBackgroundRemovalComplete: false,
  uiIntegrated: false,
  boardPath,
};
await writeFile(
  path.join(outputDir, "five-piece-belt-candidate.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(result, null, 2));
