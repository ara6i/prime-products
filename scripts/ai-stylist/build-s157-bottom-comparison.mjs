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
const outputDir = path.join(reportRoot, "fall-office-budget-pilot-s157");
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

const fixedTopProductId = "1763829130497372160";
const fixedTopReservation = reservationByKey.get(`cj:${fixedTopProductId}`);
if (
  fixedTopReservation?.scenarioId !== "S157" ||
  fixedTopReservation?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The soft-gray quarter-zip is not the active S157 planning reservation");
}
const fixedTop = {
  productId: fixedTopProductId,
  styleRagId: `cj:${fixedTopProductId}`,
  slot: "top",
  garmentType: "ribbed quarter-zip polo",
  color: "soft gray",
  image: alphaById.get(fixedTopProductId)?.finalPath,
};
if (!fixedTop.image) throw new Error("Missing S157 final-alpha top image");

const candidateSpecs = [
  {
    key: "A",
    name: "Soft Gray and Brown Double Pleat",
    identity: "shopify_supplier:5ee70df61299c873a76cd10ed93b206f97430c23",
    decision: "reject-for-s157",
    decisionReason:
      "The controlled trouser is credible, but its dark brown sits too close to the soft-gray top and makes this budget Office look dull and heavy.",
  },
  {
    key: "B",
    name: "Soft Gray and Warm Khaki Pleat",
    identity: "shopify_supplier:df42e376c9e3794e991939daea6a358876bd573b",
    decision: "reject-for-s157-after-combined-board-review",
    decisionReason:
      "The combined board exposes a visibly wide, draped leg and conflicts with the explicit no-baggy-bottom styling rule; color cannot rescue the silhouette.",
  },
  {
    key: "C",
    name: "Soft Gray and Clean Khaki Straight",
    identity: "shopify_supplier:36775b09ed8cf6af570dd58f177804a5200ce70c",
    decision: "reject-for-s157",
    decisionReason:
      "The narrow plain-front line reads generic and slightly dated beside the relaxed quarter-zip, with less color depth than candidate B.",
  },
];
const candidates = candidateSpecs.map((candidate) => {
  const canonicalIdentity = candidate.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted S157 bottom ${candidate.identity}`);
  if (reservationByKey.has(canonicalIdentity)) {
    throw new Error(`S157 bottom candidate is already reserved: ${candidate.identity}`);
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
        `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="32" cy="34" r="20" fill="#111"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">${candidate.key}</text><text x="62" y="32" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="62" y="55" font-family="Arial" font-size="12" fill="#6a706b">Fall Work/Office · Budget-Friendly · two-piece comparison</text><text x="26" y="735" font-family="Arial" font-size="11" font-weight="700" fill="${candidate.decision.startsWith("reject") ? "#b23a2f" : "#355746"}">${candidate.decision.startsWith("reject") ? "REJECTED FOR S157" : "VISUAL FRONT-RUNNER"}</text><text x="26" y="758" font-family="Arial" font-size="9" fill="#777">${escapeXml(candidate.decisionReason.slice(0, 92))}</text><text x="26" y="790" font-family="Arial" font-size="11" font-weight="700" fill="#9a3f1d">BOTTOM REJECTED · SHOE UNSOURCED</text><text x="26" y="816" font-family="Arial" font-size="10" fill="#777">No new reservation · no complete outfit · not UI integrated.</text></svg>`,
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="30" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#111">S157 · Men’s Fall Work/Office · Bottom comparison</text><text x="30" y="70" font-family="Arial" font-size="14" fill="#555">Soft-gray ribbed quarter-zip retained · all three existing bottoms rejected after combined visual review · source a new controlled-straight trouser and shoe</text></svg>`,
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
      scenarioId: "S157",
      occasion: "Work/Office",
      season: "Fall",
      budget: "Budget-Friendly",
      status: "visual-comparison-complete-no-usable-bottom-front-runner",
      fixedPlanningProductId: fixedTopProductId,
      missingSlots: ["bottom", "shoe"],
      selectedBottomIdentity: null,
      rejectedAfterCombinedBoardReviewBottomIdentity:
        "shopify_supplier:df42e376c9e3794e991939daea6a358876bd573b",
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
