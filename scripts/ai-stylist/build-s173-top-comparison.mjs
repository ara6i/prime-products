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
const outputDir = path.join(reportRoot, "fall-formal-budget-pilot-s173");
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
const fixedBelt = reservationByKey.get("cj:2502130357161608600");
if (
  fixedBelt?.scenarioId !== "S173" ||
  fixedBelt?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The coffee-brown belt is not the active S173 planning reservation");
}

const candidateSpecs = [
  ["T1", "shopify_supplier:c718a3072a23b5f3daffd582a98373e700ff8129", "White Cable Turtleneck", "reject-for-s173", "The heavy cable texture and high ribbed neck are bulky under a suit and restricted to Winter use."],
  ["T2", "shopify_supplier:be3d8e8b3c2378e5b61eabc19a922df12ab5eabd", "Beige Turtleneck", "reject-for-s173", "The product-only image gives no on-body ease proof, and this turtleneck is restricted to Winter rather than Fall."],
  ["T3", "shopify_supplier:821ecfe8e5c578279ddd8f55492daca456209053", "Beige Quarter-Zip", "reject-for-s173", "The contrast orange zips, chest pocket and athletic quarter-zip construction are too sporty for Formal Evening."],
  ["T4", "shopify_supplier:1567c4a133b03632c21e4cbfe188bc4b1dde577b", "Off-White Ribbed Sweater", "reject-for-s173", "The oversized drop shoulder, thick geometric ribbing and bulky body cannot sit cleanly beneath a tailored jacket."],
  ["T5", "shopify_supplier:a286644bd6cead92f5ec66950a3c81eec1186009", "Ivory Sweater", "reject-for-s173", "The burgundy horizontal stripes, chest badge and casual crew shape conflict with a clean olive-and-coffee formal palette."],
  ["T6", "shopify_supplier:da767e27d71701e7343c7a356396e5a5e90d680d", "White Mock-Neck Knit", "reject-for-s173", "The generic product-only tee has no on-body fit proof and reads too casual and flat for the Formal Evening suit."],
  ["T7", "shopify_supplier:43ddfd83f0096669fb60ea61eabb9aaaa3215d9f", "White Button-Up", "reject-for-s173", "The translucent overshirt, twin chest pockets and visible label read casual utility rather than refined evening tailoring."],
  ["T8", "shopify_supplier:21196d523f8b28c3b43a51b250933949f7a9bc6b", "White Clean Shirt", "reject-for-s173", "The open placket and textured relaxed shirt look modern but are explicitly Spring/Summer casual, not Fall Formal."],
].map(([key, identity, name, decision, decisionReason]) => ({
  key,
  identity,
  name,
  decision,
  decisionReason,
}));

const candidates = candidateSpecs.map((spec) => {
  const key = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(key);
  if (!accepted) throw new Error(`Missing accepted S173 candidate ${spec.identity}`);
  if (reservationByKey.has(key)) throw new Error(`S173 candidate already reserved: ${spec.identity}`);
  if (accepted.selectedVariant?.slot !== "top") throw new Error(`Unexpected slot: ${spec.identity}`);
  return {
    ...spec,
    ...accepted.selectedVariant,
    constraints: accepted.constraints ?? [],
  };
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
    identity: fixedBelt.productKey,
    name: "Coffee-Brown Minimal Belt",
    garmentType: fixedBelt.garmentType,
    color: fixedBelt.color,
    image: fixedBelt.image,
    decision: "fixed-planning-reservation",
    decisionReason: "Approved once for S173; must coordinate with brown footwear.",
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
      .toFile(path.join(outputDir, `${card.key.toLowerCase()}-original.jpg`));
  }
  const productImage = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 24, height: 350, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const svg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${card.key}</text><text x="66" y="27" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(card.name)}</text><text x="66" y="47" font-family="Arial" font-size="10" fill="#666">${escapeXml(card.key === "FIXED" ? "ACCESSORY" : "TOP")}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(card.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(card.color)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${card.key === "FIXED" ? "#355746" : "#8a3d1d"}">${escapeXml(card.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml(card.decisionReason.slice(0, 72))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(card.identity.slice(0, 50))}</text></svg>`,
  );
  cardBuffers.push(
    await sharp(svg)
      .composite([{ input: productImage, left: 12, top: 52 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const columns = 5;
const gap = 20;
const boardWidth = gap + columns * (cardWidth + gap);
const boardHeight = 130 + Math.ceil(cards.length / columns) * (cardHeight + gap);
const header = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S173 · Fall Formal Evening · existing top screen</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Fixed coffee-brown belt · eight unreserved warm-light tops · soft-olive suit remains the planned anchor</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Dark-brown loafer, cream-dial watch and suit still missing · no candidate selected · not UI integrated</text></svg>`,
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
      scenarioId: "S173",
      occasion: "Formal Evening",
      season: "Fall",
      budget: "Budget-Friendly",
      fixedPlanningProductId: "2502130357161608600",
      status: "visual-screen-complete-no-existing-top-selected",
      plannedPalette: ["soft olive", "warm white", "dark coffee brown", "cream dial"],
      candidates,
      selectedTopIdentity: null,
      visualFrontRunnerTopIdentity: null,
      missingSlots: ["top", "suit-tuxedo", "shoe", "watch"],
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
