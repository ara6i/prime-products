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
const catalogProducts = JSON.parse(
  await readFile(
    path.join(repoRoot, "output/reports/mens-nonwedding-scenario-pools-20260911.json"),
    "utf8",
  ),
).products;
const reservations = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "summer-date-budget-pilot-s189");
const outputPath = path.join(outputDir, "top-comparison.jpg");
const specPath = path.join(outputDir, "top-comparison.json");

const alphaById = new Map(
  alphaManifest.entries.map((entry) => [String(entry.productId), entry]),
);
const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity), entry]),
);
const reservedKeys = new Set(reservations.reservations.map((entry) => entry.productKey));

const fixedBottomIdentity = "shopify_supplier:41e34ccd7a652d2217fbbd129c0843f3e329564b";
const fixedBottomProduct = catalogProducts[fixedBottomIdentity];
const fixedBottomColor = fixedBottomProduct?.colors?.find(
  (candidate) => candidate.normalizedColor === "white",
);
if (!fixedBottomProduct || !fixedBottomColor) {
  throw new Error(`Missing historical bottom ${fixedBottomIdentity}`);
}
const fixedBottom = {
  productId: fixedBottomIdentity,
  styleRagId: fixedBottomIdentity,
  slot: fixedBottomProduct.slot,
  garmentType: fixedBottomProduct.garmentType,
  color: fixedBottomColor.normalizedColor,
  image: fixedBottomColor.sourceImageUrl,
  visualDecisionStatus: "reject",
};
const fixedShoe = {
  productId: "2505140753031625700",
  slot: "shoe",
  garmentType: "two-tone suede penny loafer",
  color: "coffee brown and taupe",
  image: alphaById.get("2505140753031625700").finalPath,
};
const candidates = [
  {
    key: "A",
    name: "Orange, White and Two-Tone Suede",
    identity: "shopify_supplier:e5e82ba0cbab8680b37ba371b3331b73d187389e",
  },
  {
    key: "B",
    name: "Dusty Pink, White and Two-Tone Suede",
    identity: "shopify_supplier:c54ee46a1c85427387e9d01b3080f28253683dc3",
  },
  {
    key: "C",
    name: "Gum Leaf, White and Two-Tone Suede",
    identity: "shopify_supplier:8da71f7e1638e59e5928945028ae2e449e9ee06a",
  },
  {
    key: "D",
    name: "Botanical Green, White and Two-Tone Suede",
    identity: "shopify_supplier:8f7de0e337311ae5efdcd33749694b44661e6bbc",
  },
].map((candidate) => {
  const accepted = acceptedByIdentity.get(candidate.identity);
  if (!accepted) throw new Error(`Missing accepted top ${candidate.identity}`);
  if (reservedKeys.has(candidate.identity)) throw new Error(`Top is already reserved: ${candidate.identity}`);
  return {
    ...candidate,
    items: [accepted.selectedVariant, fixedBottom, fixedShoe],
    sourceConstraint: accepted.constraints,
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

const cardWidth = 430;
const cardHeight = 780;
const itemWidth = 129;
const itemHeight = 610;
const cardBuffers = [];

for (const candidate of candidates) {
  const itemBuffers = await Promise.all(
    candidate.items.map(async (item) => {
      const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
        .rotate()
        .resize({
          width: itemWidth - 10,
          height: 480,
          fit: "contain",
          background: "#f5f2ea",
        })
        .flatten({ background: "#f5f2ea" })
        .jpeg({ quality: 92 })
        .toBuffer();
      const labelSvg = Buffer.from(
        `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#f5f2ea"/><text x="7" y="505" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="7" y="530" font-family="Arial" font-size="10" fill="#222">${escapeXml(item.garmentType.slice(0, 20))}</text><text x="7" y="553" font-family="Arial" font-size="10" fill="#666">${escapeXml(item.color.slice(0, 20))}</text><text x="7" y="588" font-family="Arial" font-size="8" fill="#888">${escapeXml(String(item.productId).slice(0, 18))}</text></svg>`,
      );
      return sharp(labelSvg)
        .composite([{ input: productImage, left: 5, top: 8 }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }),
  );
  const cardSvg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="30" cy="32" r="19" fill="#111"/><text x="30" y="38" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#fff">${candidate.key}</text><text x="58" y="30" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="58" y="51" font-family="Arial" font-size="11" fill="#9a3f2d">historical comparison · bottom source revoked</text><text x="16" y="754" font-family="Arial" font-size="10" fill="#777">No option is approved. White trouser lacks worn silhouette proof.</text></svg>`,
  );
  cardBuffers.push(
    await sharp(cardSvg)
      .composite(
        itemBuffers.map((input, index) => ({
          input,
          left: 15 + index * (itemWidth + 6),
          top: 92,
        })),
      )
      .jpeg({ quality: 92 })
      .toBuffer(),
  );
}

const boardWidth = cardWidth * candidates.length + 26 * (candidates.length + 1);
const boardHeight = cardHeight + 142;
const headerSvg = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="26" y="40" font-family="Arial" font-size="25" font-weight="700" fill="#111">S189 · Men’s Summer Date Night · Historical top comparison</text><text x="26" y="68" font-family="Arial" font-size="13" fill="#9a3f2d">All four options are revoked because the shared white trouser has no worn fit proof</text></svg>`,
);
await mkdir(outputDir, { recursive: true });
await sharp(headerSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: 26 + index * (cardWidth + 26),
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
      scenarioId: "S189",
      occasion: "Date Night",
      season: "Summer",
      budget: "Budget-Friendly",
      status: "historical-comparison-source-revoked",
      candidates,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
