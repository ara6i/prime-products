#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const [decisions, ledger, provisionalLedger] = await Promise.all([
  readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8").then(
    JSON.parse,
  ),
]);
const outputDir = path.join(reportRoot, "summer-travel-budget-pilot-s237");
const outputPath = path.join(outputDir, "bottom-comparison.jpg");
const specPath = path.join(outputDir, "bottom-comparison.json");

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByKey = new Map(
  ledger.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);
const provisionalHoldByIdentity = new Map(
  provisionalLedger.holds.map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const fixedLayer = reservationByKey.get("cj:2503120536241602800");
if (
  fixedLayer?.scenarioId !== "S237" ||
  fixedLayer?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The raw-jute linen overshirt is not the active S237 planning reservation");
}
const fixedTopIdentity =
  "shopify_supplier:8af50b74a00f0e4370f86a1d88f51b3ae4cb19b2";
const fixedTopHold = provisionalHoldByIdentity.get(fixedTopIdentity);
const fixedTop = acceptedByIdentity.get(fixedTopIdentity);
if (fixedTopHold?.scenarioId !== "S237" || !fixedTop) {
  throw new Error("The dusty-periwinkle fine knit is not the active S237 visual hold");
}

const allCandidateSpecs = [
  [
    "A",
    "shopify_supplier:016b87eb18f5b657fbd748be0e0957a9a1fba10c",
    "Army-Green Ribbed Straight-Relaxed Trouser",
    "reject-for-s237",
    "The clean leg is credible, but the elastic drawstring waist and full vertical rib read Resort/loungewear; paired with the fine-knit top it also repeats texture across both halves.",
  ],
  [
    "B",
    "shopify_supplier:2757295a71470293dac80a2c7e1e5684a21f33e3",
    "Light-Khaki Technical Straight Trouser",
    "reject-for-s237",
    "The controlled crop is useful, but black webbing, zip hardware and pale nylon make the bottom technical and too close to the raw-jute neutral instead of adding the planned olive depth.",
  ],
  [
    "C",
    "shopify_supplier:5e223289e1c188fee9ac946ad1ae5bf0cc95fa20",
    "Khaki Clean Tapered Jogger",
    "reject-for-s237",
    "The narrow elastic-cuff jogger line and exposed drawstring read activewear rather than a lightweight Summer Travel trouser beneath the linen overshirt.",
  ],
  [
    "D",
    "shopify_supplier:d1af0d4c9b1ab1f720fa08ef7813c2bc3e4c6d6d",
    "Moss Technical Hiking Trouser",
    "reject-for-s237",
    "The broad technical leg, hiking construction and utility volume compete with the linen layer and would turn a polished Travel core into outdoor gear.",
  ],
  [
    "E",
    "shopify_supplier:0985e422c0e751aefea94e2693e41d7bb9e54f1b",
    "Grass-Green Cotton Cargo",
    "reject-for-s237",
    "The saturated grass green and large cargo pockets introduce a second utility statement and too much lower-half volume for the compact knit and open linen layer.",
  ],
  [
    "F",
    "shopify_supplier:a65364570732aad3921e5e57b70167ef70546c6f",
    "Khaki Single-Pocket Cargo",
    "reject-for-s237",
    "The large thigh pocket, elastic waist and heavy cuffed styling make the trouser too cargo-led and visually bulky for this refined Summer Travel direction.",
  ],
  [
    "G",
    "shopify_supplier:3095c87326ee7556a98852b611d3737df02b04a4",
    "Flax-Coffee Lightweight Drawstring Trouser",
    "reject-for-s237",
    "The long black drawcord, washed flax tone and visible hem pooling create a soft lounge silhouette and muddy the raw-jute layer instead of supplying clean olive contrast.",
  ],
].map(([key, identity, name, decision, decisionReason]) => ({
  key,
  identity,
  name,
  decision,
  decisionReason,
}));

const excludedHeldCandidates = allCandidateSpecs
  .filter((spec) => {
    const hold = provisionalHoldByIdentity.get(spec.identity.toLowerCase());
    return hold && hold.scenarioId !== "S237";
  })
  .map((spec) => ({
    key: spec.key,
    identity: spec.identity,
    name: spec.name,
    heldByScenarioId: provisionalHoldByIdentity.get(spec.identity.toLowerCase()).scenarioId,
  }));
const candidateSpecs = allCandidateSpecs.filter((spec) => {
  const hold = provisionalHoldByIdentity.get(spec.identity.toLowerCase());
  return !hold || hold.scenarioId === "S237";
});

const candidates = candidateSpecs.map((spec) => {
  const key = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(key);
  if (!accepted) throw new Error(`Missing accepted S237 bottom ${spec.identity}`);
  if (reservationByKey.has(key)) throw new Error(`S237 bottom is already reserved: ${spec.identity}`);
  if (accepted.selectedVariant?.slot !== "bottom") {
    throw new Error(`Unexpected slot for ${spec.identity}`);
  }
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
    key: "LAYER",
    name: "Raw-Jute Linen Overshirt",
    identity: fixedLayer.productKey,
    garmentType: fixedLayer.garmentType,
    color: fixedLayer.color,
    image: fixedLayer.image,
    decision: "fixed-planning-reservation",
    decisionReason: "Lightweight linen layer retained for S237.",
  },
  {
    key: "TOP",
    name: "Dusty-Periwinkle Contrast-Trim Fine Knit",
    identity: fixedTopIdentity,
    ...fixedTop.selectedVariant,
    decision: "fixed-visual-hold",
    decisionReason: "Natural shoulder, upper-hip hem and controlled regular body retained for S237.",
  },
  ...candidates,
];
const cardWidth = 350;
const cardHeight = 580;
const cardBuffers = [];
for (const card of cards) {
  const original = await imageBuffer(card.image);
  if (!["LAYER", "TOP"].includes(card.key)) {
    await sharp(original, { failOn: "none" })
      .rotate()
      .flatten({ background: "#f5f2ea" })
      .jpeg({ quality: 96 })
      .toFile(path.join(outputDir, `bottom-${card.key.toLowerCase()}-original.jpg`));
  }
  const productImage = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 24, height: 350, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const retained = ["LAYER", "TOP"].includes(card.key);
  const svg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="10" font-weight="700" fill="#fff">${escapeXml(card.key)}</text><text x="66" y="27" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(card.name.slice(0, 39))}</text><text x="66" y="47" font-family="Arial" font-size="10" fill="#666">${escapeXml(retained ? "ACTIVE S237 DIRECTION" : "BOTTOM CANDIDATE")}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(card.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(card.color)}</text><text x="14" y="476" font-family="Arial" font-size="10" font-weight="700" fill="${retained ? "#355746" : "#a63b2e"}">${escapeXml(card.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml(card.decisionReason.slice(0, 72))}</text><text x="14" y="540" font-family="Arial" font-size="8" fill="#999">${escapeXml(card.identity.slice(0, 50))}</text></svg>`,
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
const boardHeight = 140 + Math.ceil(cards.length / columns) * (cardHeight + gap);
const header = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S237 · Summer Travel · olive-bottom full-source screen</text><text x="20" y="70" font-family="Arial" font-size="14" fill="#555">Raw-jute linen layer + dusty periwinkle fine knit · ${candidates.length} unique unreserved green, khaki or flax bottoms</text><text x="20" y="101" font-family="Arial" font-size="12" fill="#8a3d1d">No local bottom passes: avoid double ribbing, lounge drawstrings, cargo volume and muddy khaki · olive travel trouser and ecru court sneaker still missing</text></svg>`,
);
await sharp(header)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: gap + (index % columns) * (cardWidth + gap),
      top: 130 + Math.floor(index / columns) * (cardHeight + gap),
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
      scenarioId: "S237",
      occasion: "Travel",
      season: "Summer",
      budget: "Budget-Friendly",
      status: "full-resolution-bottom-screen-complete-no-local-front-runner",
      fixedPlanningProductId: "2503120536241602800",
      fixedTopIdentity,
      candidates,
      excludedHeldCandidates,
      selectedBottomIdentity: null,
      visualFrontRunnerBottomIdentity: null,
      missingSlots: ["bottom", "shoe"],
      queuedBottomRole: "olive lightweight travel trouser",
      queuedShoeRole: "ecru low-profile court sneaker",
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    { outputPath, specPath, candidateCount: candidates.length, excludedHeldCandidates },
    null,
    2,
  ),
);
