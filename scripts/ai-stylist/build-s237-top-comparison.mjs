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
const provisionalLedger = JSON.parse(
  await readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "summer-travel-budget-pilot-s237");
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
const fixedLayer = reservationByKey.get("cj:2503120536241602800");
if (
  fixedLayer?.scenarioId !== "S237" ||
  fixedLayer?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The raw-jute linen overshirt is not the active S237 planning reservation");
}

const allCandidateSpecs = [
  ["A", "shopify_supplier:80b03b09c50bc86bda698639b11ae9ba5fd81f43", "Dusty-Blue Basic Tee", "reject-for-s237", "The wet pool lifestyle image obscures the actual fabric, drape and clean dry color needed for catalog trust."],
  ["B", "shopify_supplier:859c7a6d5e1fa7b312e74df360e7a0396d88ce47", "Peacock-Blue Ribbed Tee", "reject-for-s237", "The dark fitted synthetic-looking active tee is too sporty and too body-hugging beneath the linen layer."],
  ["C", "shopify_supplier:3eac17210b7796d785c34667d4bbb8fe724be84d", "French-Blue Active Tee", "reject-for-s237", "The contrast orange neck tape, raglan construction and product-only proof read gymwear rather than polished Travel."],
  ["D", "shopify_supplier:b50f3875a4135f5b5b82ff20420885f4d6b6f40a", "Light-Blue Athletic Tee", "reject-for-s237", "The synthetic mesh and mapped athletic seam pattern conflict with the natural linen overshirt."],
  ["E", "shopify_supplier:8af50b74a00f0e4370f86a1d88f51b3ae4cb19b2", "Dusty-Periwinkle Contrast-Trim Fine Knit", "visual-front-runner-awaiting-bottom-and-shoe", "Full-source review confirms a natural shoulder, upper-hip rib hem, regular body and subtle cream trim that links cleanly to raw jute."],
  ["F", "shopify_supplier:c088c69f9f54b34e8066d0bfb29314b31c32c1f0", "Light-Blue Ribbed Knit", "reject-for-s237", "The narrow shoulders, torso bunching and mannequin-like product presentation recreate the skinny-top problem."],
].map(([key, identity, name, decision, decisionReason]) => ({
  key,
  identity,
  name,
  decision,
  decisionReason,
}));
const provisionalHoldByIdentity = new Map(
  provisionalLedger.holds.map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
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
  if (!accepted) throw new Error(`Missing accepted S237 top ${spec.identity}`);
  if (reservationByKey.has(key)) throw new Error(`S237 top is already reserved: ${spec.identity}`);
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
    name: "Raw-Jute Linen Overshirt",
    identity: fixedLayer.productKey,
    garmentType: fixedLayer.garmentType,
    color: fixedLayer.color,
    image: fixedLayer.image,
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
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${card.key}</text><text x="66" y="28" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(card.name)}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(card.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(card.color)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${card.key === "FIXED" || card.decision?.startsWith("visual") ? "#355746" : "#a63b2e"}">${escapeXml(card.key === "FIXED" ? "FIXED PLANNING RESERVATION" : card.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml((card.key === "FIXED" ? "Visually re-approved lightweight raw-jute linen overshirt." : card.decisionReason).slice(0, 70))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(card.identity.slice(0, 50))}</text></svg>`,
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S237 · Summer Travel · top decisions</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Fixed raw-jute linen overshirt · ${candidates.length} unique unreserved blue tops · original-resolution visual screening</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Dusty periwinkle knit is provisional only · unique olive travel trouser and ecru court sneaker still missing · not UI integrated</text></svg>`,
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
      scenarioId: "S237",
      occasion: "Travel",
      season: "Summer",
      budget: "Budget-Friendly",
      status: "visual-comparison-complete-front-runner-awaiting-bottom-and-shoe",
      fixedPlanningProductId: "2503120536241602800",
      candidates,
      excludedHeldCandidates,
      selectedTopIdentity: null,
      visualFrontRunnerTopIdentity:
        "shopify_supplier:8af50b74a00f0e4370f86a1d88f51b3ae4cb19b2",
      missingSlots: ["bottom", "shoe"],
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
