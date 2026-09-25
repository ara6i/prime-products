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
const outputDir = path.join(reportRoot, "spring-travel-budget-pilot-s233");
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
const fixedCap = reservationByKey.get("cj:2503280137551608300");
if (
  fixedCap?.scenarioId !== "S233" ||
  fixedCap?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The light-khaki cap is not the active S233 planning reservation");
}

const allCandidateSpecs = [
  ["A", "shopify_supplier:a105b728168f3b3d11d4c583d252240af3062227", "Deep-Olive Relaxed-Taper Travel Chino", "visual-front-runner-awaiting-top-shoe-and-bag", "Full-source review corrected the label: comfortable upper-leg ease narrows to a controlled taper with styled rolled cuffs. Keep only with a regular lighter top and low-profile shoe."],
  ["B", "shopify_supplier:2757295a71470293dac80a2c7e1e5684a21f33e3", "Khaki Pocketed Straight", "reject-for-s233", "The black webbing waist, pale technical fabric and near-match to the khaki cap make the palette washed out and overly utilitarian."],
  ["C", "shopify_supplier:3082643e1c10cb4b0af5c42ab29d589195d00dcf", "Khaki Drawstring Jogger", "reject-for-s233", "The long drawstring, narrow taper and generic jogger finish recreate the skinny-bottom problem."],
  ["D", "shopify_supplier:aabdffc99d8e26c94746c17f630f60a6bb135e66", "Yellow-Green Straight Denim", "reject-for-s233", "The acid yellow-green wash, excessive width and stacked hem are too loud, baggy and uncontrolled for practical Travel."],
  ["E", "shopify_supplier:ee3ba1530d518b5036c789599b05a8f4714de2ca", "Green Technical Trouser", "reject-for-s233", "The black buckle and zips, cropped narrow leg and performance fabric conflict with the planned casual overshirt and cap."],
  ["F", "shopify_supplier:a65364570732aad3921e5e57b70167ef70546c6f", "Khaki Single-Pocket Cargo", "reject-for-s233", "The large cargo pocket, excess thigh volume and bulky cuffed styling overpower the clean Spring Travel palette."],
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
    return hold && hold.scenarioId !== "S233";
  })
  .map((spec) => ({
    key: spec.key,
    identity: spec.identity,
    name: spec.name,
    heldByScenarioId: provisionalHoldByIdentity.get(spec.identity.toLowerCase()).scenarioId,
  }));
const candidateSpecs = allCandidateSpecs.filter((spec) => {
  const hold = provisionalHoldByIdentity.get(spec.identity.toLowerCase());
  return !hold || hold.scenarioId === "S233";
});

const candidates = candidateSpecs.map((spec) => {
  const key = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(key);
  if (!accepted) throw new Error(`Missing accepted S233 bottom ${spec.identity}`);
  if (reservationByKey.has(key)) throw new Error(`S233 bottom is already reserved: ${spec.identity}`);
  if (accepted.selectedVariant?.slot !== "bottom") throw new Error(`Unexpected slot: ${spec.identity}`);
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
    name: "Light-Khaki Travel Cap",
    identity: fixedCap.productKey,
    garmentType: fixedCap.garmentType,
    color: fixedCap.color,
    image: fixedCap.image,
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
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${card.key}</text><text x="66" y="28" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(card.name)}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(card.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(card.color)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${card.key === "FIXED" || card.decision?.startsWith("visual") ? "#355746" : "#a63b2e"}">${escapeXml(card.key === "FIXED" ? "FIXED PLANNING RESERVATION" : card.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml((card.key === "FIXED" ? "Visually re-approved plain light-khaki curved-brim cap." : card.decisionReason).slice(0, 70))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(card.identity.slice(0, 50))}</text></svg>`,
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S233 · Spring Travel · bottom decisions</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Fixed light-khaki cap · planned washed-blue overshirt and ecru tee · ${candidates.length} unique unreserved travel bottoms</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">Army-green straight trouser is provisional only · unique overshirt, off-white shoe and olive-tan backpack still missing · not UI integrated</text></svg>`,
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
      scenarioId: "S233",
      occasion: "Travel",
      season: "Spring",
      budget: "Budget-Friendly",
      status: "visual-comparison-complete-front-runner-awaiting-top-shoe-and-bag",
      fixedPlanningProductId: "2503280137551608300",
      plannedMissingTop: "washed-blue regular overshirt over an ecru tee",
      candidates,
      excludedHeldCandidates,
      selectedBottomIdentity: null,
      visualFrontRunnerBottomIdentity:
        "shopify_supplier:a105b728168f3b3d11d4c583d252240af3062227",
      missingSlots: ["top", "shoe", "bag"],
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
