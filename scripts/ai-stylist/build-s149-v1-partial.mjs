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
const manualCandidates = JSON.parse(
  await readFile(path.join(reportRoot, "cj-manual-approved-candidates.json"), "utf8"),
);
const decisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const reservations = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "spring-office-budget-pilot-s149-v1-partial");
const outputDraftPath = path.join(outputDir, "agent-styled-draft.json");
const outputBoardPath = path.join(outputDir, "contact-sheets/S149-separates.jpg");

const alphaById = new Map(
  alphaManifest.entries.map((entry) => [String(entry.productId), entry]),
);
const manualById = new Map(
  manualCandidates.products.map((entry) => [String(entry.productId), entry]),
);
const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservedKeys = new Set(
  reservations.reservations.map((entry) => String(entry.productKey).toLowerCase()),
);

function manualItem(productId, slot) {
  const product = manualById.get(String(productId));
  const alpha = alphaById.get(String(productId));
  if (!product || !alpha) throw new Error(`Missing approved manual product ${productId}`);
  return {
    styleRagId: `cj:${product.productId}`,
    productId: String(product.productId),
    sourceProductId: String(product.productId),
    sku: product.sku,
    title: product.title,
    slot,
    garmentType: product.garmentType,
    color: product.color,
    price: product.price,
    currency: product.currency,
    image: alpha.finalPath,
    cjPageUrl: product.cjPageUrl,
    source: "manual-cj-gemini-final-alpha",
    visualDecisionStatus: "accept",
  };
}

function acceptedItem(identity, slotOverride) {
  const canonicalIdentity = identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted local product ${identity}`);
  if (reservedKeys.has(canonicalIdentity)) throw new Error(`Product is already reserved: ${identity}`);
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
  outfitId: "S149-SEPARATES-V1-PARTIAL-01",
  position: 1,
  name: "Sky Blue, Pleated Khaki and Black Leather",
  rationale:
    "The sky-blue draped shirt brings spring color and a clean modern collar; high-rise pleated khaki trousers add controlled relaxed tailoring; one verified black cowhide penny loafer supplies office structure without turning the complete palette dark.",
  requestedPalette: { name: "Sky Blue, Pleated Khaki and Black Leather" },
  actualBaseColors: ["sky blue", "light khaki", "black"],
  items: [
    manualItem("2504270652341610800", "top"),
    acceptedItem("shopify_supplier:15429f81dd127d5987c1150fa5e0d2e046530740"),
    acceptedItem("cj:2412221429011625300", "shoe"),
  ],
};
outfit.totalPrice = Number(
  outfit.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2),
);

const identities = outfit.items.map((item) => item.styleRagId.toLowerCase());
if (new Set(identities).size !== identities.length) {
  throw new Error("S149 v1 partial contains a repeated product identity");
}
if (outfit.totalPrice > 500) {
  throw new Error(`S149 v1 exceeds Budget-Friendly ceiling: ${outfit.totalPrice}`);
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
        "Direct three-option board review selected the light pleated-khaki trouser. The straight-khaki option read too tapered and conventional, while medium gray read too dark and corporate. The chosen sky-blue, khaki and black look is spring-correct, controlled and office-polished without a tight top or puddled bottom.",
    },
  ],
  scenarios: [
    {
      scenario: {
        id: "S149",
        gender: "male",
        occasion: "work-office",
        occasionLabel: "Work/Office",
        season: "spring",
        seasonLabel: "Spring",
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
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="36" y="48" font-family="Arial" font-size="27" font-weight="700" fill="#111">S149 · Men’s Spring Work/Office · Budget-Friendly</text><text x="36" y="82" font-family="Arial" font-size="19" font-weight="700" fill="#366c8c">${escapeXml(outfit.name)}</text><text x="36" y="110" font-family="Arial" font-size="13" fill="#555">sky blue · light khaki · black leather · complete look visually approved · local only</text><text x="36" y="728" font-family="Arial" font-size="12" fill="#666">1 of 10 outfits approved · three unique identities · total supplier price $${outfit.totalPrice.toFixed(2)} · not UI integrated</text></svg>`,
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
