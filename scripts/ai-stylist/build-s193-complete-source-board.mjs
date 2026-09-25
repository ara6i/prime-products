#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "fall-date-s193-complete-source-trial");

const [outerwearScreen, approved, bag] = await Promise.all([
  readFile(
    path.join(reportRoot, "fall-date-s193-existing-outerwear-screen/comparison.json"),
    "utf8",
  ).then(JSON.parse),
  readFile(
    path.join(reportRoot, "approved-mens-outfit-gallery/approved-outfits.json"),
    "utf8",
  ).then(JSON.parse),
  readFile(
    path.join(
      reportRoot,
      "cj-manual-round7/1379258188330831872/product.json",
    ),
    "utf8",
  ).then(JSON.parse),
]);

const selected = outerwearScreen.candidates.find(
  (candidate) => candidate.candidateId === "S193-EXISTING-OUTERWEAR-01",
);
if (!selected) throw new Error("Missing selected S193 light-khaki outerwear row");

const core = approved.looks.find(
  (look) => look.scenarioId === "S193" && look.position === 1,
);
if (!core) throw new Error("Missing approved S193 three-piece core");

const bagImage = bag.sourceAssets.find((asset) => asset.index === 6);
if (!bagImage) throw new Error("Missing isolated S193 bag source image");

const items = [
  ...selected.items.map((item) => ({ ...item })),
  {
    identity: bag.identity,
    slot: "bag trial",
    title: "Minimal Coffee Leather Zip Clutch",
    garmentType: bag.garmentType,
    color: bag.selectedColor,
    image: bagImage.localPath,
    state: "exact Coffee source · refinement pending",
  },
];

const slotOrder = new Map([
  ["top", 0],
  ["bottom", 1],
  ["outerwear trial", 2],
  ["shoe", 3],
  ["accessory trial", 4],
  ["bag trial", 5],
]);
items.sort((a, b) => slotOrder.get(a.slot) - slotOrder.get(b.slot));

if (items.length !== 6) throw new Error(`Expected six S193 roles, found ${items.length}`);
if (new Set(items.map((item) => item.identity)).size !== items.length) {
  throw new Error("S193 six-piece source board repeats a supplier identity");
}

const corePriceUsd = Number(core.totalPrice);
const outerwearPriceUsd = Number(selected.outerwear.price);
const bagLandedUsd = Number(bag.commercialEvidence?.landedTotalUsd ?? 0);
const observedSubtotalExcludingScarfUsd = Number(
  (corePriceUsd + outerwearPriceUsd + bagLandedUsd).toFixed(2),
);
if (observedSubtotalExcludingScarfUsd > 500) {
  throw new Error(
    `S193 source candidate exceeds Budget-Friendly ceiling before scarf: ${observedSubtotalExcludingScarfUsd}`,
  );
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const truncate = (value, length) => {
  const text = String(value ?? "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
};
async function imageBuffer(source) {
  if (!/^https?:\/\//i.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

const margin = 30;
const gap = 14;
const headerHeight = 145;
const cardWidth = 250;
const cardHeight = 430;
const imageHeight = 300;
const footerHeight = 110;
const width = margin * 2 + items.length * cardWidth + (items.length - 1) * gap;
const height = headerHeight + cardHeight + footerHeight;

const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e8ece8"/><text x="${margin}" y="42" font-family="Arial" font-size="28" font-weight="700" fill="#171717">S193 · Men’s Fall Date Night · complete six-piece source trial</text><text x="${margin}" y="78" font-family="Arial" font-size="17" fill="#53635c">Mineral teal · stone khaki · taupe suede · wine red · coffee leather</text><text x="${margin}" y="110" font-family="Arial" font-size="13" fill="#8b1e3f">SOURCE COMPOSITION REVIEW · 6 UNIQUE IDENTITIES · LOCAL ONLY · NO GEMINI · NOT UI-INTEGRATED</text><text x="${margin}" y="${headerHeight + cardHeight + 38}" font-family="Arial" font-size="15" font-weight="700" fill="#355746">STYLIST CHECKPOINT: composition assembled for direct visual judgment</text><text x="${margin}" y="${headerHeight + cardHeight + 68}" font-family="Arial" font-size="12" fill="#666">Observed subtotal excluding scarf: $${observedSubtotalExcludingScarfUsd.toFixed(2)} · scarf and clutch remain unrefined · no reservation yet</text><text x="${margin}" y="${headerHeight + cardHeight + 94}" font-family="Arial" font-size="11" fill="#8b1e3f">Wedding and Wedding Guest excluded · exact CJ clutch source imported locally · background removal pending authorization</text></svg>`,
);

const composites = [];
for (const [index, item] of items.entries()) {
  const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
    .rotate()
    .resize({
      width: cardWidth - 20,
      height: imageHeight,
      fit: "contain",
      background: "#f7f3eb",
    })
    .flatten({ background: "#f7f3eb" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const card = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="15" fill="#f7f6f1"/><text x="12" y="${imageHeight + 31}" font-family="Arial" font-size="11" font-weight="700" fill="#306b68">${escapeXml(item.slot.toUpperCase().replace(" TRIAL", ""))}</text><text x="12" y="${imageHeight + 58}" font-family="Arial" font-size="12" font-weight="700" fill="#171717">${escapeXml(truncate(item.title, 31))}</text><text x="12" y="${imageHeight + 83}" font-family="Arial" font-size="11" fill="#666">${escapeXml(truncate(item.color, 28))}</text><text x="12" y="${imageHeight + 108}" font-family="Arial" font-size="8" fill="#999">${escapeXml(truncate(item.identity, 39))}</text></svg>`,
  );
  const composedCard = await sharp(card)
    .composite([{ input: productImage, left: 10, top: 9 }])
    .jpeg({ quality: 95 })
    .toBuffer();
  composites.push({
    input: composedCard,
    left: margin + index * (cardWidth + gap),
    top: headerHeight,
  });
}

await mkdir(outputDir, { recursive: true });
const boardPath = path.join(outputDir, "six-piece-source-board.jpg");
await sharp(base).composite(composites).jpeg({ quality: 96 }).toFile(boardPath);

const record = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenario: {
    id: "S193",
    gender: "male",
    occasion: "Date Night",
    season: "Fall",
    budget: "Budget-Friendly",
  },
  candidateId: "S193-SEPARATES-SOURCE-TRIAL-01",
  name: "Mineral Teal, Stone Khaki, Taupe Suede, Wine Red and Coffee Leather",
  status:
    "six-piece-source-composition-visually-approved-awaiting-refinement-authorization",
  visuallyReviewedAt: "2026-09-19",
  visualDecision: "approve-complete-source-composition",
  visualDecisionReason:
    "The clean coffee clutch is visually quieter and more modern than the rejected satchels. Its flat geometry and deep warm brown ground the taupe suede boot, while the mineral-teal polo and Wine Red scarf keep the tonal stone-khaki layers lively. The result is controlled rather than baggy, not dark-dominant, and reads as a credible Zara-led Fall Date outfit.",
  items,
  economics: {
    coreSupplierSubtotalUsd: corePriceUsd,
    outerwearPriceUsd,
    bagLandedUsd,
    scarfPriceUsd: null,
    observedSubtotalExcludingScarfUsd,
    budgetFriendlyCeilingUsd: 500,
  },
  gates: {
    exactCjBagPageReviewed: true,
    exactCoffeeSkuProven: true,
    detailedIsolatedBagImageSelected: true,
    repeatedProductIdentities: 0,
    completeSixRoleCompositionPresent: true,
    completeCompositionVisualPass: true,
    finalOutfitApproved: false,
    refinementAuthorized: false,
    refinementComplete: false,
    backgroundRemovalComplete: false,
    reserved: false,
    uiIntegrated: false,
  },
  boardPath,
};
await writeFile(
  path.join(outputDir, "candidate.json"),
  `${JSON.stringify(record, null, 2)}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      boardPath,
      itemCount: items.length,
      repeatedProductIdentities: 0,
      observedSubtotalExcludingScarfUsd,
    },
    null,
    2,
  ),
);
