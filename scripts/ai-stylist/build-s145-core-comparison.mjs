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
const reservationLedger = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const provisionalLedger = JSON.parse(
  await readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "winter-casual-budget-pilot-s145");
const outputPath = path.join(outputDir, "core-comparison.jpg");
const coreOutputPath = path.join(outputDir, "core-front-runner.jpg");
const specPath = path.join(outputDir, "core-comparison.json");
const sourceSpec = "winter-casual-budget-pilot-s145/core-comparison.json";

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const unavailableIdentities = new Set([
  ...reservationLedger.reservations.map((entry) => String(entry.productKey).toLowerCase()),
  ...provisionalLedger.holds
    .filter((entry) => entry.sourceSpec !== sourceSpec)
    .map((entry) => String(entry.identity).toLowerCase()),
]);

const candidateSpecs = [
  ["outerwear", "O1", "shopify_supplier:99f159b474cc44ba3d3e7eafbc1275c2fc62f43c", "Soft-Green Puffer", "reject-for-s145", "The long shiny basic puffer is serviceable but generic and lacks the sharper cropped proportion of the leading jacket."],
  ["outerwear", "O2", "shopify_supplier:7df108deda150146a14be24dcf21c574ff57a096", "Sage Quilted Jacket", "reject-for-s145", "The deeply creased shell, long body and collapsed shoulders create an untidy oversized silhouette."],
  ["outerwear", "O3", "shopify_supplier:6b52abff343f1111ea1b4465ec34cb4c99c79d7e", "Dusty-Blue Puffer", "reject-for-s145", "The square technical body and oversized patch pockets look bulky and make the palette too dark and utilitarian."],
  ["outerwear", "O4", "shopify_supplier:fc2e19a440ca8f6b264c61c4ad8bc4227ea9f094", "Camel Sherpa Jacket", "reject-for-s145", "Only a product cutout is available; it does not prove the worn shoulder, body, sleeve or hem proportions needed for a Winter Casual hold."],
  ["outerwear", "O5", "shopify_supplier:aeec300145fdb4b330693796cf4e270f33526c42", "Beige Puffer", "reject-for-s145", "The rounded puffer volume, dangling drawcords and missing on-body proof make the silhouette less controlled."],
  ["outerwear", "O6", "shopify_supplier:4d8999448b83e0cdd90a9a1b9590776cddcb35ac", "Light-Green Puffer", "reject-for-s145", "The oversized hood, black contrast lining and technical bulk read outdoor-specific rather than clean Everyday styling."],
  ["top", "T1", "shopify_supplier:9e8719479f6d34233b8dfd557767f52a1bffa7b4", "Peacock Fine Knit", "reject-for-s145", "The narrow sleeves and close long torso risk repeating the skinny-top problem beneath the bomber."],
  ["top", "T2", "shopify_supplier:0ae1b8390f88851ec82739efb73704f9d134321e", "Mustard Half-Zip", "reject-for-s145", "The tight technical fleece body and high zip neck read dated sports base-layer rather than modern casual knitwear."],
  ["top", "T3", "shopify_supplier:beacbb3827e6eb7d02fe7ed511e1648aa3e2da0b", "Light-Apricot Cable Knit", "reject-for-s145", "The long oversized body and dropped wide sleeves would bunch under the short bomber and wash out against camel."],
  ["top", "T5", "shopify_supplier:2984c73a22084c0ed6a3de38270524b2b9a5f582", "Camel Cable Quarter-Zip", "reject-for-s145", "The narrow torso and sleeves repeat the fitted-top problem, while camel-on-camel would make the outfit muddy."],
  ["top", "T6", "shopify_supplier:cb33c4009241bb7122bb5389f3ca1452f341618d", "Warm-Apricot Ribbed Henley", "reject-for-s145", "The dropped shoulder, long loose sleeves and heavy ribbing add excess volume and another warm brown tone."],
  ["bottom", "B1", "shopify_supplier:8d9fb6dd4f6289a656e655b8b9b0e6efe6005a3d", "Dark Clean Jeans", "reject-for-s145", "Original-resolution review shows excessive width and stacked puddled hems despite the smaller board preview."],
  ["bottom", "B2", "shopify_supplier:f82ede51ff9fb0180d8e8318e06f575aa5f03944", "Nostalgic-Blue Jeans", "reject-for-s145", "The pale wash, broad leg and stacked break read baggy Spring streetwear rather than a controlled Winter line."],
  ["bottom", "B3", "shopify_supplier:fbebc32906d6ea8b0cf739471efe7542300585dc", "Blue Clean Jeans", "reject-for-s145", "The brighter medium wash and narrow ankle make the combination less balanced and seasonally grounded than dark indigo."],
  ["bottom", "B5", "shopify_supplier:b4417a8d32930a1455257578c5ba2547279f0c7b", "Medium-Gray Trouser", "reject-for-s145", "The pressed business trouser reads Office rather than Casual Everyday and would formalize the bomber unnecessarily."],
].map(([group, key, identity, name, decision, decisionReason]) => ({
  group,
  key,
  identity,
  name,
  decision,
  decisionReason,
}));

const frontRunnerKeys = [];
const frontRunnerKeySet = new Set(frontRunnerKeys);
const candidates = candidateSpecs.map((spec) => {
  const identity = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(identity);
  if (!accepted) throw new Error(`Missing accepted S145 candidate ${spec.identity}`);
  if (frontRunnerKeySet.has(spec.key) && unavailableIdentities.has(identity)) {
    throw new Error(`S145 candidate is already reserved or provisionally held: ${spec.identity}`);
  }
  if (accepted.selectedVariant?.slot !== spec.group) {
    throw new Error(`Unexpected ${spec.group} slot: ${spec.identity}`);
  }
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
const cardWidth = 350;
const cardHeight = 570;
const cardBuffers = [];
for (const candidate of candidates) {
  const original = await imageBuffer(candidate.image);
  await sharp(original, { failOn: "none" })
    .rotate()
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 96 })
    .toFile(path.join(outputDir, `${candidate.key.toLowerCase()}-original.jpg`));
  const productImage = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 24, height: 350, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const svg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${candidate.key}</text><text x="66" y="27" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="66" y="47" font-family="Arial" font-size="10" fill="#666">${escapeXml(candidate.group.toUpperCase())}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(candidate.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(candidate.color)} · $${Number(candidate.price).toFixed(2)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${candidate.decision.startsWith("visual") ? "#355746" : "#a63b2e"}">${escapeXml(candidate.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml(candidate.decisionReason.slice(0, 72))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(candidate.identity.slice(0, 50))}</text></svg>`,
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
const boardHeight = 130 + Math.ceil(candidates.length / columns) * (cardHeight + gap);
const header = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S145 · Winter Casual Everyday · corrected source screen</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Weak lavender button-neck and narrow faded jean removed after full-resolution review</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">No provisional core remains · replacement top, bottom, outerwear and shoe required · not UI integrated</text></svg>`,
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

const frontRunnerBuffers = frontRunnerKeys.map(
  (key) => cardBuffers[candidates.findIndex((candidate) => candidate.key === key)],
);
const coreWidth = Math.max(900, gap + frontRunnerBuffers.length * (cardWidth + gap));
const coreHeight = 130 + cardHeight + gap;
const coreHeader = Buffer.from(
  `<svg width="${coreWidth}" height="${coreHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S145 · corrected Winter Casual empty core</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Previous top and bottom rejected at full source resolution</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Replacement top, bottom, outerwear and shoe required · no complete outfit · not UI integrated</text></svg>`,
);
await sharp(coreHeader)
  .composite(
    frontRunnerBuffers.map((input, index) => ({
      input,
      left: gap + index * (cardWidth + gap),
      top: 120,
    })),
  )
  .jpeg({ quality: 94 })
  .toFile(coreOutputPath);

await writeFile(
  specPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      scenarioId: "S145",
      occasion: "Casual Everyday",
      season: "Winter",
      budget: "Budget-Friendly",
      status: "full-resolution-correction-no-approved-core-awaiting-top-bottom-outerwear-and-shoe",
      candidates,
      visualFrontRunnerOuterwearIdentity: null,
      visualFrontRunnerTopIdentity: null,
      visualFrontRunnerBottomIdentity: null,
      missingSlots: ["top", "bottom", "outerwear", "shoe"],
      queuedOuterwearRole: "short camel sherpa-collar blouson with full worn fit proof",
      queuedShoeRole: "tobacco rounded chukka",
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify({ outputPath, coreOutputPath, specPath, candidateCount: candidates.length }, null, 2),
);
