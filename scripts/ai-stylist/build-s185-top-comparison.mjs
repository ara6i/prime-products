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
const outputDir = path.join(reportRoot, "spring-date-budget-pilot-s185");
const outputPath = path.join(outputDir, "top-comparison.jpg");
const specPath = path.join(outputDir, "top-comparison.json");

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

const fixedBottomProductId = "2411230856521607100";
const fixedBottomReservation = reservationByKey.get(`cj:${fixedBottomProductId}`);
if (
  fixedBottomReservation?.scenarioId !== "S185" ||
  fixedBottomReservation?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The warm-khaki pleated trouser is not the active S185 planning reservation");
}
const fixedBottom = {
  productId: fixedBottomProductId,
  styleRagId: `cj:${fixedBottomProductId}`,
  slot: "bottom",
  garmentType: "high-rise pleated cropped tailored trouser",
  color: "warm khaki",
  image: alphaById.get(fixedBottomProductId)?.finalPath,
};
if (!fixedBottom.image) throw new Error("Missing S185 final-alpha bottom image");

const candidateSpecs = [
  {
    key: "A",
    name: "Light Blue Ribbed Knit and Warm Khaki",
    identity: "shopify_supplier:c088c69f9f54b34e8066d0bfb29314b31c32c1f0",
    decision: "reject-for-s185",
    decisionReason:
      "The narrow sleeves, tight shoulder line and bunched long torso reproduce the skinny-top problem instead of a modern relaxed knit proportion.",
  },
  {
    key: "B",
    name: "Sky Blue Waffle Shirt and Warm Khaki",
    identity: "shopify_supplier:47ca6448dd910b9ff3503470a65b607a5617e9fb",
    decision: "reject-for-s185",
    decisionReason:
      "The synthetic-looking waffle texture, contrast tee dependency and long rounded hem weaken the polished Date Night silhouette.",
  },
  {
    key: "C",
    name: "Dusty Pink Shirt and Warm Khaki",
    identity: "shopify_supplier:c54ee46a1c85427387e9d01b3080f28253683dc3",
    decision: "reject-for-s185",
    decisionReason:
      "The dusty color is useful, but the shirt is an oversized open layer dependent on another tee and would overwhelm the cropped tailored trouser.",
  },
];
const candidates = candidateSpecs.map((candidate) => {
  const canonicalIdentity = candidate.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted S185 top ${candidate.identity}`);
  if (reservationByKey.has(canonicalIdentity)) {
    throw new Error(`S185 top candidate is already reserved: ${candidate.identity}`);
  }
  return {
    ...candidate,
    items: [{ ...accepted.selectedVariant, styleRagId: candidate.identity }, fixedBottom],
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
const cardHeight = 850;
const itemWidth = 230;
const itemHeight = 620;
const cardBuffers = [];
await mkdir(outputDir, { recursive: true });
for (const candidate of candidates) {
  const top = candidate.items[0];
  await sharp(await imageBuffer(top.image), { failOn: "none" })
    .rotate()
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 96 })
    .toFile(path.join(outputDir, `candidate-${candidate.key.toLowerCase()}-top-original.jpg`));
}
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
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="32" cy="34" r="20" fill="#111"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">${candidate.key}</text><text x="62" y="32" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="62" y="55" font-family="Arial" font-size="12" fill="#6a706b">Spring Date Night · Budget-Friendly · two-piece comparison</text><text x="26" y="735" font-family="Arial" font-size="11" font-weight="700" fill="#b23a2f">REJECTED FOR S185</text><text x="26" y="758" font-family="Arial" font-size="9" fill="#777">${escapeXml(candidate.decisionReason.slice(0, 92))}</text><text x="26" y="790" font-family="Arial" font-size="11" font-weight="700" fill="#9a3f1d">TOP AND CREAM COURT SNEAKER STILL MISSING</text><text x="26" y="816" font-family="Arial" font-size="10" fill="#777">No new reservation · no complete outfit · not UI integrated.</text></svg>`,
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="30" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#111">S185 · Men’s Spring Date Night · Top comparison</text><text x="30" y="70" font-family="Arial" font-size="14" fill="#555">Same visually re-approved warm-khaki pleated trouser · three unreserved colorful tops · exact cream CJ court sneaker still required</text></svg>`,
);
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
      scenarioId: "S185",
      occasion: "Date Night",
      season: "Spring",
      budget: "Budget-Friendly",
      status: "visual-comparison-complete-no-selection",
      fixedPlanningProductId: fixedBottomProductId,
      missingSlots: ["top", "shoe"],
      selectedTopIdentity: null,
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
