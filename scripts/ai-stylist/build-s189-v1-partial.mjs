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
const catalogProducts = JSON.parse(
  await readFile(
    path.join(repoRoot, "output/reports/mens-nonwedding-scenario-pools-20260911.json"),
    "utf8",
  ),
).products;
const reservations = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "summer-date-budget-pilot-s189-v1-partial");
const outputDraftPath = path.join(outputDir, "agent-styled-draft.json");
const outputBoardPath = path.join(outputDir, "contact-sheets/S189-separates.jpg");

const alphaById = new Map(
  alphaManifest.entries.map((entry) => [String(entry.productId), entry]),
);
const manualById = new Map(
  manualCandidates.products.map((entry) => [String(entry.productId), entry]),
);
const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity), entry]),
);
const reservedKeys = new Set(reservations.reservations.map((entry) => entry.productKey));

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

function acceptedItem(identity) {
  const accepted = acceptedByIdentity.get(identity);
  if (!accepted) throw new Error(`Missing accepted local product ${identity}`);
  if (reservedKeys.has(identity)) throw new Error(`Product is already reserved: ${identity}`);
  return {
    ...accepted.selectedVariant,
    source: "existing-refined-visual-ledger",
    visualDecisionStatus: "accept",
    visualConstraints: accepted.constraints ?? [],
  };
}

function sourceRevokedItem(identity, normalizedColor) {
  const product = catalogProducts[identity];
  const color = product?.colors?.find(
    (candidate) => candidate.normalizedColor === normalizedColor,
  );
  if (!product || !color) throw new Error(`Missing historical catalog product ${identity}`);
  return {
    productId: identity,
    styleRagId: identity,
    sourceProductId: product.sourceProductId,
    title: product.title,
    slot: product.slot,
    garmentType: product.garmentType,
    price: product.price,
    currency: product.currency,
    material: product.material,
    color: color.normalizedColor,
    image: color.sourceImageUrl,
    variantId: color.variantId,
    source: "existing-refined-visual-ledger",
    visualDecisionStatus: "reject",
    visualConstraints: [
      "Source-revoked: the only white-trouser image is a flat garment view and does not prove thigh, knee, leg width, length or hem behavior.",
    ],
  };
}

const outfit = {
  outfitId: "S189-SEPARATES-V1-PARTIAL-01",
  position: 1,
  name: "Sunset Orange, Clean White and Two-Tone Suede",
  rationale:
    "A relaxed-but-controlled orange mandarin-collar shirt supplies the summer color; clean white straight trousers keep the look sharp and light; the coffee-and-taupe suede loafer adds date-night polish without reverting to a black formal shoe.",
  requestedPalette: { name: "Sunset Orange, Clean White and Two-Tone Suede" },
  actualBaseColors: ["sunset orange", "clean white", "coffee brown and taupe"],
  items: [
    acceptedItem("shopify_supplier:e5e82ba0cbab8680b37ba371b3331b73d187389e"),
    sourceRevokedItem(
      "shopify_supplier:41e34ccd7a652d2217fbbd129c0843f3e329564b",
      "white",
    ),
    manualItem("2505140753031625700", "shoe"),
  ],
};
outfit.totalPrice = Number(
  outfit.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2),
);

const identities = outfit.items.map((item) => item.styleRagId);
if (new Set(identities).size !== identities.length) {
  throw new Error("S189 v1 partial contains a repeated product identity");
}
if (outfit.totalPrice > 500) {
  throw new Error(`S189 v1 exceeds Budget-Friendly ceiling: ${outfit.totalPrice}`);
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "partial-source-revoked",
  identityRule:
    "One supplier-product identity may appear once across the complete non-wedding men's matrix, regardless of color or variant.",
  summary: {
    scenarios: 1,
    targetOutfits: 10,
    visuallyReadyOutfits: 0,
    missingOutfits: 10,
    placements: 0,
    uniqueIdentities: 0,
    repeatedIdentities: 0,
    uiIntegrated: false,
  },
  visualQa: [
    {
      position: 1,
      decision: "fail",
      reason:
        "Revoked after reopening the white trouser at its full source. The only available image is a flat garment view and cannot prove thigh, knee, leg width, full length or hem behavior, so the complete Summer Date outfit no longer passes the silhouette gate.",
    },
  ],
  scenarios: [
    {
      scenario: {
        id: "S189",
        gender: "male",
        occasion: "date-night",
        occasionLabel: "Date Night",
        season: "summer",
        seasonLabel: "Summer",
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
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="36" y="48" font-family="Arial" font-size="27" font-weight="700" fill="#111">S189 · Men’s Summer Date Night · Budget-Friendly</text><text x="36" y="82" font-family="Arial" font-size="19" font-weight="700" fill="#b8582b">${escapeXml(outfit.name)}</text><text x="36" y="110" font-family="Arial" font-size="13" fill="#555">historical candidate · source-revoked after full-resolution trouser audit · local only</text><text x="36" y="728" font-family="Arial" font-size="12" fill="#666">0 of 10 outfits approved · white trouser lacks worn silhouette proof · not UI integrated</text></svg>`,
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
    {
      outputDraftPath,
      outputBoardPath,
      totalPrice: outfit.totalPrice,
      approvedOutfits: 0,
      sourceRevoked: true,
    },
    null,
    2,
  ),
);
