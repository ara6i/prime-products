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
const outputDir = path.join(reportRoot, "fall-travel-budget-pilot-s241");
const outputPath = path.join(outputDir, "companion-pool.jpg");
const specPath = path.join(outputDir, "companion-pool.json");

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByKey = new Map(
  ledger.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);
const fixedJacket = reservationByKey.get("cj:1716804667801350144");
if (
  fixedJacket?.scenarioId !== "S241" ||
  fixedJacket?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The rust-brown field jacket is not the active S241 planning reservation");
}

const allCandidateSpecs = [
  ["top", "T1", "shopify_supplier:f5800aaaef7e1a427ebc24fd5041ae95a71b003c", "Sky-Blue Clean Shirt", "reject-for-s241", "The hanger image layers another tee but provides no trustworthy on-body shoulder, torso or hem proof beneath the jacket."],
  ["top", "T3", "shopify_supplier:876dcc2ef3f946aa19fd72de8cef44c37098aed1", "Sky-Blue Regular Shirt", "reject-for-s241", "The dropped shoulders and long wide overshirt body create too much second-layer volume beneath the field jacket."],
  ["top", "T4", "shopify_supplier:048334ba15315bb75e75ece8e59d4743ba05dca5", "Sky-Blue Band-Collar Shirt", "reject-for-s241", "The wide boxy body and long rounded hem would bunch under the jacket and overpower the trouser line."],
  ["top", "T5", "shopify_supplier:57161b1bafab134efb446d1e28e19336e0ad28e8", "Dusty-Blue Plaid Shirt", "reject-for-s241", "The plaid competes with corduroy texture and the field jacket's four-pocket utility detail."],
  ["top", "T6", "shopify_supplier:e8997b5e3ea0731ad69c295bf646b2c7069b4b3e", "Soft-Blue Overshirt", "reject-for-s241", "The twin-pocket overshirt adds a second bulky utility layer and duplicates the jacket's visual weight."],
  ["bottom", "B1", "shopify_supplier:bf7fa4e61eb13d0ac96cfca0028b90814633535c", "Ivory Straight Jeans", "reject-for-s241", "The product-only image does not prove rise or full on-body leg shape, and the short wide hem remains risky."],
  ["bottom", "B2", "shopify_supplier:1a666f5be35d5c8b71d25f4cbf709b11f941d134", "Sand-Gray Drawstring Trouser", "reject-for-s241", "The shiny fabric, exposed drawstring and narrow jogger taper look cheap and overly athletic."],
  ["bottom", "B3", "shopify_supplier:fabf15cd2935c7ad9c6fc6909dbdb8e94ea7f169", "Light-Gray Washed Jeans", "reject-for-s241", "The cool washed gray, excess width and doubled stacked cuff create a dull baggy streetwear line."],
  ["bottom", "B4", "shopify_supplier:de0c7dfa10b7272a8c0cadea123eaaac8aff7320", "Light-Gray Relaxed Trouser", "reject-for-s241", "The isolated product image does not prove rise, thigh ease or hem behavior on a body."],
  ["bottom", "B5", "shopify_supplier:3095c87326ee7556a98852b611d3737df02b04a4", "Flax-Coffee Drawstring Trouser", "reject-for-s241", "The black sporty drawcord, washed pale tone and puddled hem weaken the polished rust-and-blue palette."],
  ["bottom", "B6", "shopify_supplier:d9afe591ad41850aec8a40b344a93310fd6b6951", "Beige Relaxed Jeans", "reject-for-s241", "The consolidated gallery shows a very wide lower leg with heavy folding and puddling over the shoes. The warm ecru color is useful, but the baggy stacked silhouette fails the Travel brief."],
].map(([group, key, identity, name, decision, decisionReason]) => ({
  group,
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
    return hold && hold.scenarioId !== "S241";
  })
  .map((spec) => ({
    key: spec.key,
    identity: spec.identity,
    name: spec.name,
    heldByScenarioId: provisionalHoldByIdentity.get(spec.identity.toLowerCase()).scenarioId,
  }));
const candidateSpecs = allCandidateSpecs.filter((spec) => {
  const hold = provisionalHoldByIdentity.get(spec.identity.toLowerCase());
  return !hold || hold.scenarioId === "S241";
});

const candidates = candidateSpecs.map((spec) => {
  const key = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(key);
  if (!accepted) throw new Error(`Missing accepted S241 candidate ${spec.identity}`);
  if (reservationByKey.has(key)) throw new Error(`S241 candidate already reserved: ${spec.identity}`);
  if (accepted.selectedVariant?.slot !== spec.group) throw new Error(`Unexpected slot: ${spec.identity}`);
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
    group: "outerwear",
    key: "FIXED",
    identity: fixedJacket.productKey,
    name: "Rust-Brown Field Jacket",
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
      .toFile(path.join(outputDir, `${card.key.toLowerCase()}-original.jpg`));
  }
  const productImage = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 24, height: 350, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const svg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${card.key}</text><text x="66" y="27" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(card.name)}</text><text x="66" y="47" font-family="Arial" font-size="10" fill="#666">${escapeXml(card.group.toUpperCase())}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(card.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(card.color)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${card.key === "FIXED" || card.decision?.startsWith("visual") ? "#355746" : "#a63b2e"}">${escapeXml(card.key === "FIXED" ? "FIXED PLANNING RESERVATION" : card.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml((card.key === "FIXED" ? "Visually re-approved rust-brown corduroy field jacket." : card.decisionReason).slice(0, 70))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(card.identity.slice(0, 50))}</text></svg>`,
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S241 · Fall Travel · existing companion decisions</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Fixed rust-brown corduroy field jacket · ${candidates.filter((item) => item.group === "top").length} remaining blue shirts · ${candidates.filter((item) => item.group === "bottom").length} unique light bottoms</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">No local top or bottom passed full-source review · sky-blue regular shirt, controlled light trouser and tobacco suede court sneaker still missing · not UI integrated</text></svg>`,
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
      scenarioId: "S241",
      occasion: "Travel",
      season: "Fall",
      budget: "Budget-Friendly",
      fixedPlanningProductId: "1716804667801350144",
      status: "visual-screen-complete-no-local-front-runner-awaiting-top-bottom-and-shoe",
      candidates,
      excludedHeldCandidates,
      selectedTopIdentity: null,
      selectedBottomIdentity: null,
      visualFrontRunnerTopIdentity: null,
      visualFrontRunnerBottomIdentity: null,
      missingSlots: ["top", "bottom", "shoe"],
      queuedTopRole: "sky-blue regular-fit travel shirt without roll tabs",
      queuedBottomRole: "warm-stone lightweight single-pleat travel trouser",
      queuedShoeRole: "tobacco suede court sneaker",
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
