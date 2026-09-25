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
const outputDir = path.join(reportRoot, "fall-sports-budget-pilot-s225");
const outputPath = path.join(outputDir, "bottom-comparison.jpg");
const specPath = path.join(outputDir, "bottom-comparison.json");

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservedKeys = new Set(
  reservations.reservations.map((entry) => String(entry.productKey).toLowerCase()),
);

function acceptedItem(identity, slotOverride) {
  const canonicalIdentity = identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted item ${identity}`);
  if (reservedKeys.has(canonicalIdentity)) throw new Error(`Item is already reserved: ${identity}`);
  return {
    ...accepted.selectedVariant,
    productId: String(accepted.selectedVariant.productId),
    styleRagId: identity,
    slot: slotOverride ?? accepted.selectedVariant.slot,
  };
}

const fixedTop = acceptedItem(
  "shopify_supplier:633f848f4d7aa7259991501f9453ff00e642d579",
);
const fixedShoe = acceptedItem("cj:1755823247674839040", "shoe");
const candidates = [
  {
    key: "A",
    name: "Cerulean, Moss and Dark Gray",
    identity: "shopify_supplier:d1af0d4c9b1ab1f720fa08ef7813c2bc3e4c6d6d",
  },
  {
    key: "B",
    name: "Cerulean, Grass Green and Dark Gray",
    identity: "shopify_supplier:0985e422c0e751aefea94e2693e41d7bb9e54f1b",
  },
  {
    key: "C",
    name: "Cerulean, Camel and Dark Gray",
    identity: "shopify_supplier:82d34277e8ccb46321c32e4554a496abd2c93834",
  },
  {
    key: "D",
    name: "Cerulean, Khaki and Dark Gray",
    identity: "shopify_supplier:a65364570732aad3921e5e57b70167ef70546c6f",
  },
].map((candidate) => ({
  ...candidate,
  items: [fixedTop, acceptedItem(candidate.identity), fixedShoe],
}));

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
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="30" cy="32" r="19" fill="#111"/><text x="30" y="38" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#fff">${candidate.key}</text><text x="58" y="30" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="58" y="51" font-family="Arial" font-size="11" fill="#6a706b">Fall Sports/Workout · trail use · comparison only</text><text x="16" y="754" font-family="Arial" font-size="10" fill="#777">Reject uncontrolled cargo volume. Not UI integrated.</text></svg>`,
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
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="26" y="40" font-family="Arial" font-size="25" font-weight="700" fill="#111">S225 · Men’s Fall Sports/Workout · Trail-bottom comparison</text><text x="26" y="68" font-family="Arial" font-size="13" fill="#555">Same cerulean technical fleece and dark-gray trail shoe · four outdoor bottoms · direct visual decision required</text></svg>`,
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
      scenarioId: "S225",
      occasion: "Sports/Workout",
      season: "Fall",
      budget: "Budget-Friendly",
      status: "visual-comparison-only",
      candidates,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
