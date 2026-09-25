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
const provisionalBottom = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-round5/2501220516281609100/product.json"),
    "utf8",
  ),
);
const outputDir = path.join(reportRoot, "fall-party-budget-pilot-s209");
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
const fixedJacket = reservationByKey.get("cj:2411110358151627900");
if (
  fixedJacket?.scenarioId !== "S209" ||
  fixedJacket?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The wine-red corduroy jacket is not the active S209 planning reservation");
}
if (provisionalBottom.scenarioId !== "S209" || provisionalBottom.category !== "bottom") {
  throw new Error("The provisional S209 bottom record is missing or mismatched");
}
if (reservationByKey.has(provisionalBottom.identity.toLowerCase())) {
  throw new Error("The provisional S209 bottom is already reserved elsewhere");
}

const candidateSpecs = [
  {
    group: "top",
    key: "T6",
    identity: "shopify_supplier:1c0f112e7a66a7893bf1c88cce7a4a75b666af19",
    decision: "reject-for-s209",
    decisionReason: "The long torso, narrow body and bunched hem repeat the skinny-top problem beneath a short jacket.",
  },
];

const candidates = candidateSpecs.map((spec) => {
  const canonicalIdentity = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted S209 candidate ${spec.identity}`);
  if (reservationByKey.has(canonicalIdentity)) {
    throw new Error(`S209 candidate is already reserved: ${spec.identity}`);
  }
  if (accepted.selectedVariant?.slot !== spec.group) {
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
const fixedCard = {
  group: "outerwear",
  key: "FIXED",
  identity: fixedJacket.productKey,
  reviewId: "S209",
  garmentType: fixedJacket.garmentType,
  color: fixedJacket.color,
  image: fixedJacket.image,
  decision: "fixed-planning-reservation",
  decisionReason: "Visually re-approved wine-red short corduroy blouson; companion screening must preserve its energetic color.",
};
const bottomCard = {
  group: "bottom",
  key: "B1",
  identity: provisionalBottom.identity,
  reviewId: "CJQ-092",
  garmentType: provisionalBottom.garmentType,
  color: provisionalBottom.selectedColor,
  image: provisionalBottom.sourceAssets[0].localPath,
  decision: "source-selected-only",
  decisionReason: "Controlled camel-khaki straight trouser; exact source and shipping pass, refinement and full-board approval remain open.",
};
const cards = [fixedCard, bottomCard, ...candidates];
const cardWidth = 350;
const cardHeight = 560;
const cardBuffers = [];
for (const candidate of cards) {
  const original = await imageBuffer(candidate.image);
  await sharp(original, { failOn: "none" })
    .rotate()
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 96 })
    .toFile(path.join(outputDir, `${candidate.key.toLowerCase()}-original.jpg`));
  const productImage = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 24, height: 360, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const cardSvg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="32" cy="30" r="20" fill="#111"/><text x="32" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${candidate.key}</text><text x="62" y="27" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(candidate.group.toUpperCase())}</text><text x="62" y="47" font-family="Arial" font-size="11" fill="#666">${escapeXml(candidate.reviewId ?? "")}</text><text x="14" y="425" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(candidate.garmentType).slice(0, 40))}</text><text x="14" y="449" font-family="Arial" font-size="12" fill="#555">${escapeXml(candidate.color)}</text><text x="14" y="477" font-family="Arial" font-size="11" font-weight="700" fill="${candidate.decision.startsWith("reject") ? "#a63b2e" : candidate.decision.startsWith("held") ? "#9a5b18" : "#355746"}">${escapeXml(candidate.decision.toUpperCase().replaceAll("-", " ").slice(0, 44))}</text><text x="14" y="500" font-family="Arial" font-size="9" fill="#666">${escapeXml(candidate.decisionReason.slice(0, 67))}</text><text x="14" y="530" font-family="Arial" font-size="8" fill="#999">${escapeXml(candidate.identity.slice(0, 48))}</text></svg>`,
  );
  cardBuffers.push(
    await sharp(cardSvg)
      .composite([{ input: productImage, left: 12, top: 55 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const columns = 5;
const gap = 20;
const boardWidth = gap + columns * (cardWidth + gap);
const boardHeight = 135 + Math.ceil(cards.length / columns) * (cardHeight + gap);
const headerSvg = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S209 · Fall Party/Night Out · corrected companion decisions</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Fixed wine-red corduroy blouson · newly source-selected camel-khaki trouser · one rejected top</text><text x="20" y="98" font-family="Arial" font-size="12" fill="#8a3d1d">Warm-ivory compact top and light-stone suede shoe remain missing · bottom is not refined or reserved · not UI integrated</text></svg>`,
);
await sharp(headerSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: gap + (index % columns) * (cardWidth + gap),
      top: 125 + Math.floor(index / columns) * (cardHeight + gap),
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
      scenarioId: "S209",
      occasion: "Party/Night Out",
      season: "Fall",
      budget: "Budget-Friendly",
      fixedPlanningProductId: "2411110358151627900",
      status: "partial-two-piece-palette-and-silhouette-compatible-top-and-shoe-missing",
      visuallyReviewedAt: "2026-09-17",
      visualDecision: "pass-partial-outerwear-bottom-pairing-only",
      visualDecisionReason:
        "The wine-red cropped corduroy blouson and warm camel-khaki controlled-straight trouser form a coherent modern Fall Party base. The trouser removes the former broad drape and keeps a clean narrow-to-regular line without becoming skinny. Completion still requires a compact warm-ivory top and a unique light-stone suede sneaker.",
      partialPaletteCompatible: true,
      partialSilhouetteCompatible: true,
      selectedTopIdentity: null,
      visualFrontRunnerTopIdentity: null,
      selectedBottomIdentity: null,
      visualFrontRunnerBottomIdentity: provisionalBottom.identity,
      sourceSelectedSlots: ["bottom"],
      missingSlots: ["top", "shoe"],
      candidates,
      sourceCandidates: [bottomCard],
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
