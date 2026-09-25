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
const reservations = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "fall-sports-budget-pilot-s225-v1-partial");
const outputDraftPath = path.join(outputDir, "agent-styled-draft.json");
const outputBoardPath = path.join(outputDir, "contact-sheets/S225-separates.jpg");

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByKey = new Map(
  reservations.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);

function acceptedItem(identity, slotOverride) {
  const canonicalIdentity = identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted local product ${identity}`);
  const existingReservation = reservationByKey.get(canonicalIdentity);
  const isOwnApprovedReservation =
    existingReservation?.scenarioId === "S225" &&
    existingReservation?.outfitId === "S225-SEPARATES-V1-PARTIAL-01";
  if (existingReservation && !isOwnApprovedReservation) {
    throw new Error(`Product is already reserved outside S225: ${identity}`);
  }
  return {
    ...accepted.selectedVariant,
    styleRagId: identity,
    productId: String(accepted.selectedVariant.productId),
    slot: slotOverride ?? accepted.selectedVariant.slot,
    source: "existing-refined-visual-ledger",
    visualDecisionStatus: "accept",
    visualConstraints: accepted.constraints ?? [],
  };
}

const outfit = {
  outfitId: "S225-SEPARATES-V1-PARTIAL-01",
  position: 1,
  name: "Cerulean, Camel and Technical Gray",
  rationale:
    "A vivid cerulean half-zip supplies useful fall color; the camel technical trouser has a controlled straight leg and low-profile utility pockets; the dark-gray trail shoe is intentionally confined to this terrain-specific look, where its heavy sole and visible technical construction are appropriate.",
  requestedPalette: { name: "Cerulean, Camel and Technical Gray" },
  actualBaseColors: ["cerulean blue", "camel", "dark gray"],
  items: [
    acceptedItem("shopify_supplier:633f848f4d7aa7259991501f9453ff00e642d579", "top"),
    acceptedItem("shopify_supplier:82d34277e8ccb46321c32e4554a496abd2c93834", "bottom"),
    acceptedItem("cj:1755823247674839040", "shoe"),
  ],
};
outfit.totalPrice = Number(
  outfit.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2),
);

const identities = outfit.items.map((item) => item.styleRagId.toLowerCase());
if (new Set(identities).size !== identities.length) {
  throw new Error("S225 v1 partial contains a repeated product identity");
}
if (outfit.totalPrice > 500) {
  throw new Error(`S225 v1 exceeds Budget-Friendly ceiling: ${outfit.totalPrice}`);
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "partial-visual-approved",
  identityRule:
    "One supplier-product identity may appear once across the complete non-wedding men's matrix, regardless of color or variant.",
  summary: {
    scenarios: 1,
    targetOutfits: 10,
    visuallyReadyOutfits: 1,
    missingOutfits: 9,
    placements: 3,
    uniqueIdentities: 3,
    repeatedIdentities: 0,
    uiIntegrated: false,
  },
  visualQa: [
    {
      position: 1,
      decision: "pass",
      reason:
        "Direct four-option board review rejected the moss and khaki trousers for uncontrolled width and rejected grass green for generic cargo bulk. Full-resolution inspection confirmed that the camel technical trouser is a controlled straight fit with unobtrusive pockets. The cerulean half-zip is neither skinny nor oversized, and the heavy trail shoe is scenario-correct for a fall outdoor workout.",
    },
  ],
  scenarios: [
    {
      scenario: {
        id: "S225",
        gender: "male",
        occasion: "sports-workout",
        occasionLabel: "Sports/Workout",
        season: "fall",
        seasonLabel: "Fall",
        budget: "budget-friendly",
        budgetLabel: "Budget-Friendly",
        budgetMin: 0,
        budgetMax: 500,
        currency: "USD",
        targetOutfits: 10,
      },
      outfitSets: { separates: [outfit] },
    },
  ],
};

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

const width = 1200;
const height = 760;
const itemWidth = 350;
const itemHeight = 540;
const itemBuffers = await Promise.all(
  outfit.items.map(async (item) => {
    const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
      .rotate()
      .resize({
        width: itemWidth - 20,
        height: 410,
        fit: "contain",
        background: "#f5f2ea",
      })
      .flatten({ background: "#f5f2ea" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const labelSvg = Buffer.from(
      `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f5f2ea"/><text x="12" y="450" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="12" y="480" font-family="Arial" font-size="14" fill="#222">${escapeXml(item.garmentType.slice(0, 36))}</text><text x="12" y="508" font-family="Arial" font-size="13" fill="#666">${escapeXml(item.color.slice(0, 36))}</text><text x="12" y="530" font-family="Arial" font-size="10" fill="#888">${escapeXml(String(item.productId).slice(0, 34))}</text></svg>`,
    );
    return sharp(labelSvg)
      .composite([{ input: productImage, left: 10, top: 10 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const baseSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="36" y="48" font-family="Arial" font-size="27" font-weight="700" fill="#111">S225 · Men’s Fall Sports/Workout · Budget-Friendly</text><text x="36" y="82" font-family="Arial" font-size="19" font-weight="700" fill="#1678b7">${escapeXml(outfit.name)}</text><text x="36" y="110" font-family="Arial" font-size="13" fill="#555">cerulean blue · camel technical cloth · dark-gray trail sole · complete look visually approved · local only</text><text x="36" y="728" font-family="Arial" font-size="12" fill="#666">1 of 10 outfits approved · three unique identities · total supplier price $${outfit.totalPrice.toFixed(2)} · not UI integrated</text></svg>`,
);

await mkdir(path.dirname(outputBoardPath), { recursive: true });
await writeFile(outputDraftPath, `${JSON.stringify(result, null, 2)}\n`);
await sharp(baseSvg)
  .composite(
    itemBuffers.map((input, index) => ({ input, left: 36 + index * 382, top: 150 })),
  )
  .jpeg({ quality: 92 })
  .toFile(outputBoardPath);

console.log(
  JSON.stringify(
    { outputDraftPath, outputBoardPath, totalPrice: outfit.totalPrice, uniqueIdentities: 3 },
    null,
    2,
  ),
);
