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
const outputDir = path.join(reportRoot, "spring-sports-budget-pilot-s217");
const outputPath = path.join(outputDir, "core-comparison.jpg");
const coreOutputPath = path.join(outputDir, "core-front-runner.jpg");
const specPath = path.join(outputDir, "core-comparison.json");
const sourceSpec = "spring-sports-budget-pilot-s217/core-comparison.json";

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
  ["outerwear", "O1", "shopify_supplier:daa47d98069dac45b7357df942b7c8dd908fea47", "Off-White Lightweight Technical Shell", "visual-front-runner-awaiting-shoe", "Full-source proof confirms a regular shoulder, light movement ease and straight hip-length body; use it as S217's light neutral rather than another bulky active layer."],
  ["outerwear", "O2", "shopify_supplier:efbb598e499c729a655456c1e97f1b5247d4f81e", "Gray-Green Rain Shell", "reject-for-s217", "The oversized hood, long sleeve volume and face-covering styling are too extreme for a clean everyday workout look."],
  ["outerwear", "O3", "shopify_supplier:75180814820b72eb8664e3e545c6a0e780b86680", "Lime Lightweight Jacket", "reject-for-s217", "The product-only image provides no body or hem proof, and the flat neon shell looks cheaper than the leading option."],
  ["outerwear", "O4", "shopify_supplier:6630dc2632bcf5d749f8ca2811f8295abdb23953", "Caramel Technical Shell", "reject-for-s217", "The bulky pocketed outdoor construction and saturated orange would compete with the coral performance top."],
  ["top", "T1", "shopify_supplier:f4059b07f867790eb39da047ce3dd310bfa15a81", "Burnt-Coral Vent-Mapped Active Tee", "visual-front-runner-awaiting-shoe", "The happy coral color, tonal ventilation mapping and regular athletic body provide energy without a tight compression silhouette."],
  ["top", "T2", "shopify_supplier:d96901e0ac30be7968a06da5904c90f342d70091", "Light-Blue Quarter-Zip", "reject-for-s217", "The tight torso, dark raglan sleeves and high contrast read like an older running base layer."],
  ["top", "T3", "shopify_supplier:9545b4e9495fdd3def2212cef328ff0e2088b440", "Light-Blue Active Hoodie", "reject-for-s217", "The oversized waffle hoodie is streetwear-volume rather than a controlled Spring workout layer."],
  ["top", "T4", "shopify_supplier:758b8e66b3ab2d4c3b0afeb0001d10385e3a6218", "White Active Tee", "reject-for-s217", "The product-only white tee has no on-body fit proof and adds no useful color direction."],
  ["top", "T5", "shopify_supplier:a007c50a9a442f6dba3d983c9e50f0e2859bbca9", "Air-Force-Blue Active Tee", "reject-for-s217", "The generic product-only tee lacks shoulder, torso and hem proof, so its apparent regular shape cannot be trusted."],
  ["bottom", "B1", "shopify_supplier:f3c07fc2e1f6106c028c1f8c44d239a552272766", "Paris-Gray Jogger", "reject-for-s217", "The broad thigh, cargo zip and gathered cuff create more utility volume than the cleaner green trouser."],
  ["bottom", "B2", "shopify_supplier:4c4b6c0dc2e550e21c5df9c184304a46796c8abb", "Air-Force-Blue Jogger", "reject-for-s217", "The shiny fabric, narrow cuff and gym-staged presentation look more synthetic and less versatile."],
  ["bottom", "B3", "shopify_supplier:5e223289e1c188fee9ac946ad1ae5bf0cc95fa20", "Khaki Tapered Jogger", "reject-for-s217", "The exposed black drawstring, beach styling and short elastic cuff read casual rather than performance-led."],
  ["bottom", "B4", "shopify_supplier:ee3ba1530d518b5036c789599b05a8f4714de2ca", "Olive Ankle-Length Technical Trouser", "visual-front-runner-awaiting-shoe", "Full-source proof shows useful thigh ease, a controlled taper and functional ankle length without a skinny leg or excess fabric."],
  ["bottom", "B5", "shopify_supplier:e9f0e6b53869ae4cf56d10459a1446020f507fd3", "Light-Blue Training Short", "reject-for-s217", "The exposed black compression liner and warm-weather short conflict with the light shell's cooler Spring coverage."],
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
  if (!accepted) throw new Error(`Missing accepted S217 candidate ${spec.identity}`);
  if (unavailableIdentities.has(identity)) {
    throw new Error(`S217 candidate is already reserved or provisionally held: ${spec.identity}`);
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S217 · Spring Sports / Workout · existing core screen</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Four shells · five performance tops · five controlled bottoms · all unique and available</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Prefer light, energetic color and real movement proportions · light-gray trainer still missing · not UI integrated</text></svg>`,
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

const frontRunnerKeys = ["O1", "T1", "B4"];
const frontRunnerBuffers = frontRunnerKeys.map(
  (key) => cardBuffers[candidates.findIndex((candidate) => candidate.key === key)],
);
const coreWidth = gap + frontRunnerBuffers.length * (cardWidth + gap);
const coreHeight = 130 + cardHeight + gap;
const coreHeader = Buffer.from(
  `<svg width="${coreWidth}" height="${coreHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S217 · provisional Spring Sports core</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">off-white windbreaker · burnt-coral performance tee · olive technical trouser</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Light-gray streamlined trainer still missing · three uniqueness holds only · no complete outfit · not UI integrated</text></svg>`,
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
      scenarioId: "S217",
      occasion: "Sports / Workout",
      season: "Spring",
      budget: "Budget-Friendly",
      status: "visual-screen-complete-three-piece-core-awaiting-shoe",
      candidates,
      visualFrontRunnerOuterwearIdentity:
        "shopify_supplier:daa47d98069dac45b7357df942b7c8dd908fea47",
      visualFrontRunnerTopIdentity:
        "shopify_supplier:f4059b07f867790eb39da047ce3dd310bfa15a81",
      visualFrontRunnerBottomIdentity:
        "shopify_supplier:ee3ba1530d518b5036c789599b05a8f4714de2ca",
      missingSlots: ["shoe"],
      queuedShoeRole: "light-gray streamlined trainer",
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
