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
const outputDir = path.join(reportRoot, "summer-sports-budget-pilot-s221");
const outputPath = path.join(outputDir, "core-comparison.jpg");
const coreOutputPath = path.join(outputDir, "core-front-runner.jpg");
const specPath = path.join(outputDir, "core-comparison.json");
const sourceSpec = "summer-sports-budget-pilot-s221/core-comparison.json";

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
  ["top", "T1", "shopify_supplier:1219f7dbc0db3bec2ffd7273bacd0624f7a32eba", "Green Quarter-Zip Top", "reject-for-s221", "The soft green is useful, but the hanger-only crop provides no shoulder, torso or hem proof for movement."],
  ["top", "T2", "shopify_supplier:3eac17210b7796d785c34667d4bbb8fe724be84d", "French-Blue Active Tee", "reject-for-s221", "The product-only image and orange neck tape make this feel generic and do not prove a controlled on-body fit."],
  ["top", "T3", "shopify_supplier:6fa78261360e35f44654e5c93b73006510ec9f1e", "White Active Henley", "reject-for-s221", "Original resolution shows a narrow shoulder, clinging chest and long tight torso that reproduce the skinny-top problem."],
  ["top", "T4", "shopify_supplier:b50f3875a4135f5b5b82ff20420885f4d6b6f40a", "Ice-Blue Raglan Performance Tee", "visual-front-runner-awaiting-shoe", "The fresh ice blue, clean raglan shoulder and regular straight body create a Summer performance top without compression tightness or oversized volume."],
  ["top", "T5", "shopify_supplier:cae0d55b7c93c8b9e1fab79255b83a125e98ddf5", "White Breathable Tank", "reject-for-s221", "The narrow stringer cut and busy gym-mirror source make the product body-focused and visually weak for the catalog."],
  ["top", "T6", "shopify_supplier:758b8e66b3ab2d4c3b0afeb0001d10385e3a6218", "White Quick-Dry Tee", "reject-for-s221", "The isolated product image supplies no reliable shoulder or torso proof and the plain white direction adds no useful Summer identity."],
  ["top", "T7", "shopify_supplier:859c7a6d5e1fa7b312e74df360e7a0396d88ce47", "Peacock-Blue Ribbed Tee", "reject-for-s221", "The long narrow ribbed tube shape and product-only proof risk a fitted synthetic silhouette rather than easy workout movement."],
  ["bottom", "B1", "shopify_supplier:56c0746f57ef998678cf3dae029f3fca9c6eb8d9", "Mint Two-in-One Running Short", "visual-front-runner-awaiting-shoe", "The source clearly proves an above-knee running outer short, fitted support liner and controlled athletic volume; its mint color works deliberately with the ice-blue tee."],
  ["bottom", "B2", "shopify_supplier:935f7217446b87c0d622a226bfc7f497f302ced4", "Green Active Short", "reject-for-s221", "The longer boxier outer layer and exposed black liner are credible but feel heavier and less fresh than the mint running short."],
  ["bottom", "B3", "shopify_supplier:c00a8e12f7f765f9c955ccb558b17b1d459338d6", "White Active Short", "reject-for-s221", "The bulky gathered waist, heavy pocket opening and phone-prop crop make the white short look awkward and less athletic."],
  ["bottom", "B4", "shopify_supplier:46530cf6f85c16a40d2139332032a8a81e18ce51", "White Drawstring Short", "reject-for-s221", "The hanger-only image lacks on-body rise and leg proof, and the visible dark hem mark weakens the clean catalog presentation."],
  ["bottom", "B5", "shopify_supplier:f750b31d46f489f0333b6f1c5c8eb365d824d365", "Navy Loose Short", "reject-for-s221", "The pressed navy short reads tailored casual rather than technical training and would reintroduce an unnecessary dark default."],
].map(([group, key, identity, name, decision, decisionReason]) => ({
  group,
  key,
  identity,
  name,
  decision,
  decisionReason,
}));

const candidates = candidateSpecs.map((spec) => {
  const identity = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(identity);
  if (!accepted) throw new Error(`Missing accepted S221 candidate ${spec.identity}`);
  if (unavailableIdentities.has(identity)) {
    throw new Error(`S221 candidate is already reserved or provisionally held: ${spec.identity}`);
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S221 · Summer Sports / Workout · existing core screen</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Seven warm-weather performance tops · five shorts · all unique and available</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Prefer breathable happy color, credible movement fit and above-knee control · unique trainer still missing · not UI integrated</text></svg>`,
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

const frontRunnerKeys = ["T4", "B1"];
const frontRunnerBuffers = frontRunnerKeys.map(
  (key) => cardBuffers[candidates.findIndex((candidate) => candidate.key === key)],
);
const coreWidth = gap + frontRunnerBuffers.length * (cardWidth + gap);
const coreHeight = 130 + cardHeight + gap;
const coreHeader = Buffer.from(
  `<svg width="${coreWidth}" height="${coreHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S221 · provisional Summer Sports core</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">airy light-blue regular athletic tee · mint two-in-one running short</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Light warm-gray breathable trainer still missing · two uniqueness holds only · no complete outfit · not UI integrated</text></svg>`,
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
      scenarioId: "S221",
      occasion: "Sports / Workout",
      season: "Summer",
      budget: "Budget-Friendly",
      status: "visual-screen-complete-two-piece-core-awaiting-shoe",
      candidates,
      visualFrontRunnerTopIdentity:
        "shopify_supplier:b50f3875a4135f5b5b82ff20420885f4d6b6f40a",
      visualFrontRunnerBottomIdentity:
        "shopify_supplier:56c0746f57ef998678cf3dae029f3fca9c6eb8d9",
      missingSlots: ["shoe"],
      queuedShoeRole: "light warm-gray breathable trainer with restrained gum detail",
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
