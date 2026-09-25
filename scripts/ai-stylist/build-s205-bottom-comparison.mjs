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
const outputDir = path.join(reportRoot, "summer-party-budget-pilot-s205");
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

const fixedTopProductId = "2505191522541624600";
const fixedTopReservation = reservationByKey.get(`cj:${fixedTopProductId}`);
if (
  fixedTopReservation?.scenarioId !== "S205" ||
  fixedTopReservation?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The warm-white pointelle shirt is not the active S205 planning reservation");
}
const fixedTop = {
  productId: fixedTopProductId,
  styleRagId: `cj:${fixedTopProductId}`,
  slot: "top",
  garmentType: "long-sleeve pointelle open-collar shirt",
  color: "warm white",
  image: alphaById.get(fixedTopProductId)?.finalPath,
};
if (!fixedTop.image) throw new Error("Missing S205 final-alpha top image");

const candidateSpecs = [
  {
    key: "A",
    name: "Warm White and Ribbed Army Green",
    identity: "shopify_supplier:016b87eb18f5b657fbd748be0e0957a9a1fba10c",
    decision: "reject-for-s205",
    decisionReason:
      "The lounge drawstring, dropped-looking rise, heavy ribbing and overly stylized source image do not provide trustworthy polished Party tailoring.",
  },
  {
    key: "B",
    name: "Warm White and French Blue",
    identity: "shopify_supplier:398e675c18f7e47723df3a8eeae3d2ca50b522ff",
    decision: "reject-after-full-resolution-for-s205",
    decisionReason:
      "Full-resolution review shows a broad loose leg with excessive drape rather than the controlled straight silhouette required for a polished Summer Party outfit. The French blue is excellent, but this cut is not.",
  },
  {
    key: "C",
    name: "Warm White and Flax Coffee",
    identity: "shopify_supplier:3095c87326ee7556a98852b611d3737df02b04a4",
    decision: "reject-for-s205",
    decisionReason:
      "The black drawcord looks sporty, the hem puddles over the shoe and the near-monochrome pale palette washes out the pointelle shirt.",
  },
];
const candidates = candidateSpecs.map((candidate) => {
  const canonicalIdentity = candidate.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted S205 bottom ${candidate.identity}`);
  if (reservationByKey.has(canonicalIdentity)) {
    throw new Error(`S205 bottom candidate is already reserved: ${candidate.identity}`);
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
const cardHeight = 850;
const itemWidth = 230;
const itemHeight = 620;
const cardBuffers = [];
await mkdir(outputDir, { recursive: true });
for (const candidate of candidates) {
  const bottom = candidate.items[1];
  await sharp(await imageBuffer(bottom.image), { failOn: "none" })
    .rotate()
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 96 })
    .toFile(path.join(outputDir, `candidate-${candidate.key.toLowerCase()}-bottom-original.jpg`));
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
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="32" cy="34" r="20" fill="#111"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">${candidate.key}</text><text x="62" y="32" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="62" y="55" font-family="Arial" font-size="12" fill="#6a706b">Summer Party/Night Out · Budget-Friendly</text><text x="26" y="735" font-family="Arial" font-size="11" font-weight="700" fill="${candidate.decision.startsWith("reject") ? "#b23a2f" : "#355746"}">${candidate.decision.startsWith("reject") ? "REJECTED FOR S205" : "VISUAL FRONT-RUNNER"}</text><text x="26" y="758" font-family="Arial" font-size="9" fill="#777">${escapeXml(candidate.decisionReason.slice(0, 92))}</text><text x="26" y="790" font-family="Arial" font-size="11" font-weight="700" fill="#9a3f1d">CONTROLLED BOTTOM + SAND SUEDE SHOE MISSING</text><text x="26" y="816" font-family="Arial" font-size="10" fill="#777">No new reservation · no complete outfit · not UI integrated.</text></svg>`,
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="30" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#111">S205 · Men’s Summer Party/Night Out · Bottom comparison</text><text x="30" y="70" font-family="Arial" font-size="14" fill="#555">Same visually re-approved warm-white pointelle shirt · all three local bottoms rejected · controlled French-blue bottom and sand suede shoe still required</text></svg>`,
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
      scenarioId: "S205",
      occasion: "Party/Night Out",
      season: "Summer",
      budget: "Budget-Friendly",
      status: "full-resolution-correction-no-usable-bottom-awaiting-bottom-and-shoe",
      fixedPlanningProductId: fixedTopProductId,
      missingSlots: ["bottom", "shoe"],
      selectedBottomIdentity: null,
      visualFrontRunnerBottomIdentity: null,
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
