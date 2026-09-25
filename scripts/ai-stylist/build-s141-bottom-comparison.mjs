#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const alphaManifest = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-gemini-final-alpha/alpha-approval-manifest.json"),
    "utf8",
  ),
);
const decisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const ledger = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "fall-casual-budget-pilot-s141");
const outputPath = path.join(outputDir, "bottom-comparison.jpg");
const specPath = path.join(outputDir, "bottom-comparison.json");

const alphaById = new Map(
  alphaManifest.entries.map((entry) => [String(entry.productId), entry]),
);
const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByKey = new Map(
  ledger.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);

const fixedTopProductId = "2510060252201615900";
const fixedTopReservation = reservationByKey.get(`cj:${fixedTopProductId}`);
if (
  fixedTopReservation?.scenarioId !== "S141" ||
  fixedTopReservation?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The warm-brown polo is not the active S141 planning reservation");
}
const fixedTop = {
  productId: fixedTopProductId,
  styleRagId: `cj:${fixedTopProductId}`,
  slot: "top",
  garmentType: "long-sleeve polo sweater",
  color: "warm brown",
  image: alphaById.get(fixedTopProductId)?.finalPath,
};
if (!fixedTop.image) throw new Error("Missing S141 final-alpha top image");

const candidateSpecs = [
  {
    key: "A",
    name: "Warm Brown and Ivory Denim",
    identity: "shopify_supplier:bf7fa4e61eb13d0ac96cfca0028b90814633535c",
    decision: "reject-for-s141",
    decisionReason: "Product-only image gives no on-body fit proof and the short wide hem risks a cropped boxy line.",
  },
  {
    key: "B",
    name: "Warm Brown and Light-Gray Denim",
    identity: "shopify_supplier:fabf15cd2935c7ad9c6fc6909dbdb8e94ea7f169",
    decision: "reject-for-s141",
    decisionReason: "Washed gray and visible ankle stacking make the Fall palette dull and the silhouette less controlled.",
  },
  {
    key: "C",
    name: "Warm Brown and Beige Relaxed Denim",
    identity: "shopify_supplier:d9afe591ad41850aec8a40b344a93310fd6b6951",
    decision: "reject-for-s141",
    decisionReason: "The worn proof is wide and puddled at the shoe, directly violating the controlled-bottom rule.",
  },
];
const candidates = candidateSpecs.map((candidate) => {
  const canonicalIdentity = candidate.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted S141 bottom ${candidate.identity}`);
  if (reservationByKey.has(canonicalIdentity)) {
    throw new Error(`S141 bottom candidate is already reserved: ${candidate.identity}`);
  }
  return {
    ...candidate,
    items: [fixedTop, { ...accepted.selectedVariant, styleRagId: candidate.identity }],
    sourceConstraint: accepted.constraints ?? [],
  };
});

async function imageBuffer(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(source);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const cardWidth = 520;
const cardHeight = 810;
const itemWidth = 230;
const itemHeight = 620;
const cardBuffers = [];
for (const candidate of candidates) {
  const itemBuffers = await Promise.all(
    candidate.items.map(async (item) => {
      const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
        .rotate()
        .resize({
          width: itemWidth - 14,
          height: 485,
          fit: "contain",
          background: "#f5f2ea",
        })
        .flatten({ background: "#f5f2ea" })
        .jpeg({ quality: 92 })
        .toBuffer();
      const labelSvg = Buffer.from(
        `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#f5f2ea"/><text x="9" y="518" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="9" y="545" font-family="Arial" font-size="12" fill="#222">${escapeXml(String(item.garmentType).slice(0, 34))}</text><text x="9" y="570" font-family="Arial" font-size="12" fill="#666">${escapeXml(String(item.color).slice(0, 34))}</text><text x="9" y="600" font-family="Arial" font-size="9" fill="#888">${escapeXml(String(item.productId).slice(0, 30))}</text></svg>`,
      );
      return sharp(labelSvg)
        .composite([{ input: productImage, left: 7, top: 8 }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }),
  );
  const cardSvg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="32" cy="34" r="20" fill="#111"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">${candidate.key}</text><text x="62" y="32" font-family="Arial" font-size="17" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="62" y="55" font-family="Arial" font-size="12" fill="#6a706b">Fall Casual · Budget-Friendly · two-piece comparison</text><text x="26" y="716" font-family="Arial" font-size="12" font-weight="700" fill="#b23a2f">BOTTOM REJECTED FOR S141</text><text x="26" y="739" font-family="Arial" font-size="10" fill="#777">${escapeXml(candidate.decisionReason.slice(0, 82))}</text><text x="26" y="764" font-family="Arial" font-size="11" font-weight="700" fill="#9a3f1d">BOTTOM AND SHOE STILL MISSING</text><text x="26" y="788" font-family="Arial" font-size="10" fill="#777">No reservation · no complete outfit · not UI integrated.</text></svg>`,
  );
  cardBuffers.push(
    await sharp(cardSvg)
      .composite(
        itemBuffers.map((input, index) => ({
          input,
          left: 24 + index * (itemWidth + 12),
          top: 95,
        })),
      )
      .jpeg({ quality: 92 })
      .toBuffer(),
  );
}

const boardWidth = cardWidth * candidates.length + 30 * (candidates.length + 1);
const boardHeight = cardHeight + 145;
const headerSvg = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="30" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#111">S141 · Men’s Fall Casual Everyday · Bottom comparison</text><text x="30" y="70" font-family="Arial" font-size="14" fill="#555">Same visually re-approved warm-brown polo · three unreserved accepted bottoms · shoe intentionally absent until exact CJ sourcing</text></svg>`,
);
await mkdir(outputDir, { recursive: true });
await sharp(headerSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: 30 + index * (cardWidth + 30),
      top: 105,
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(outputPath);

await writeFile(
  specPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      scenarioId: "S141",
      occasion: "Casual Everyday",
      season: "Fall",
      budget: "Budget-Friendly",
      status: "visual-comparison-complete-no-selection",
      fixedPlanningProductId: fixedTopProductId,
      missingSlots: ["bottom", "shoe"],
      selectedBottomIdentity: null,
      candidates,
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
