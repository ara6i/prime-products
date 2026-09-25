#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const decisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const ledger = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "spring-casual-budget-pilot-s133");
const outputPath = path.join(outputDir, "top-comparison.jpg");
const specPath = path.join(outputDir, "top-comparison.json");

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByKey = new Map(
  ledger.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);
const fixedJacket = reservationByKey.get("cj:2505230844101616100");
if (
  fixedJacket?.scenarioId !== "S133" ||
  fixedJacket?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The washed-light-blue jacket is not the active S133 planning reservation");
}

const candidateSpecs = [
  {
    key: "A",
    identity: "shopify_supplier:da767e27d71701e7343c7a356396e5a5e90d680d",
    name: "White Mock Neck",
    decision: "reject-for-s133",
    decisionReason: "The product-only image gives no trustworthy shoulder, torso or hem fit proof beneath the jacket.",
  },
  {
    key: "B",
    identity: "shopify_supplier:c107ac6eb444c62e6fa30743adab39aed9b1804b",
    name: "White Breathable Crew",
    decision: "reject-for-s133",
    decisionReason: "The visible chest wordmark and boxy product-only presentation feel generic rather than clean Zara-led casual.",
  },
  {
    key: "C",
    identity: "shopify_supplier:7f51f5d8e0402e07daf28ea27911bc8e74b54a7c",
    name: "White Textured Crew",
    decision: "reject-for-s133",
    decisionReason: "The square chest pocket, wide boxy cut and lack of on-body proof weaken the polished Spring layer.",
  },
  {
    key: "D",
    identity: "shopify_supplier:1567c4a133b03632c21e4cbfe188bc4b1dde577b",
    name: "Off-White Ribbed Sweater",
    decision: "reject-for-s133",
    decisionReason: "The mixed-color hanger image is weak proof, and the heavy long-sleeve knit is too warm beneath the Spring jacket.",
  },
  {
    key: "E",
    identity: "shopify_supplier:101e29ecd0a490074034237fecfbfefe384e0d95",
    name: "Apricot Notched Top",
    decision: "reject-for-s133",
    decisionReason: "The long oversized tunic shape, loose sleeves and bunched hem would fight the short blouson silhouette.",
  },
];

const candidates = candidateSpecs.map((spec) => {
  const key = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(key);
  if (!accepted) throw new Error(`Missing accepted S133 top ${spec.identity}`);
  if (reservationByKey.has(key)) throw new Error(`S133 top is already reserved: ${spec.identity}`);
  if (accepted.selectedVariant?.slot !== "top") throw new Error(`Unexpected slot: ${spec.identity}`);
  return { ...spec, ...accepted.selectedVariant, constraints: accepted.constraints ?? [] };
});

async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

await mkdir(outputDir, { recursive: true });
const cards = [
  {
    key: "FIXED",
    name: "Washed-Light-Blue Blouson",
    identity: fixedJacket.productKey,
    garmentType: fixedJacket.garmentType,
    color: fixedJacket.color,
    image: fixedJacket.image,
  },
  ...candidates,
];
const cardWidth = 350;
const cardHeight = 570;
const cardBuffers = [];
for (const card of cards) {
  const original = await imageBuffer(card.image);
  if (card.key !== "FIXED") {
    await sharp(original, { failOn: "none" })
      .rotate()
      .flatten({ background: "#f5f2ea" })
      .jpeg({ quality: 96 })
      .toFile(path.join(outputDir, `candidate-${card.key.toLowerCase()}-original.jpg`));
  }
  const productImage = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 24, height: 350, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const svg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${card.key}</text><text x="66" y="28" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(card.name)}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(card.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(card.color)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${card.key === "FIXED" || card.decision?.startsWith("visual") ? "#355746" : "#a63b2e"}">${escapeXml(card.key === "FIXED" ? "FIXED PLANNING RESERVATION" : card.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml((card.key === "FIXED" ? "Visually re-approved washed-light-blue short jacket." : card.decisionReason).slice(0, 70))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(card.identity.slice(0, 50))}</text></svg>`,
  );
  cardBuffers.push(
    await sharp(svg)
      .composite([{ input: productImage, left: 12, top: 52 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const columns = 4;
const gap = 20;
const boardWidth = gap + columns * (cardWidth + gap);
const boardHeight = 130 + Math.ceil(cards.length / columns) * (cardHeight + gap);
const header = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S133 · Spring Casual Everyday · corrected top decisions</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Fixed washed-light-blue jacket · previous flower-apricot Henley rejected after full-source review</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Replacement regular top, unique stone trouser and cream gum-sole CJ shoe still missing · not UI integrated</text></svg>`,
);
await sharp(header)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: gap + (index % columns) * (cardWidth + gap),
      top: 120 + Math.floor(index / columns) * (cardHeight + gap),
    })),
  )
  .jpeg({ quality: 94 })
  .toFile(outputPath);

await writeFile(
  specPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      scenarioId: "S133",
      occasion: "Casual Everyday",
      season: "Spring",
      budget: "Budget-Friendly",
      status: "full-resolution-correction-no-top-front-runner-awaiting-top-bottom-and-shoe",
      fixedPlanningProductId: "2505230844101616100",
      candidates,
      selectedTopIdentity: null,
      visualFrontRunnerTopIdentity: null,
      missingSlots: ["top", "bottom", "shoe"],
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
