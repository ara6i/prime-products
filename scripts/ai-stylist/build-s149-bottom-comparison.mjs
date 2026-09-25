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
const reservations = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "spring-office-budget-pilot-s149");
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
const reservedKeys = new Set(
  reservations.reservations.map((entry) => String(entry.productKey).toLowerCase()),
);

const fixedTop = {
  productId: "2504270652341610800",
  slot: "top",
  garmentType: "draped one-piece-collar long-sleeve shirt",
  color: "sky blue",
  image: alphaById.get("2504270652341610800").finalPath,
};
const shoeIdentity = "cj:2412221429011625300";
const acceptedShoe = acceptedByIdentity.get(shoeIdentity);
if (!acceptedShoe) throw new Error(`Missing accepted shoe ${shoeIdentity}`);
if (reservedKeys.has(shoeIdentity)) throw new Error(`Shoe is already reserved: ${shoeIdentity}`);
const fixedShoe = {
  ...acceptedShoe.selectedVariant,
  slot: "shoe",
  styleRagId: shoeIdentity,
};
const candidates = [
  {
    key: "A",
    name: "Sky Blue, Pleated Khaki and Black",
    identity: "shopify_supplier:15429f81dd127d5987c1150fa5e0d2e046530740",
  },
  {
    key: "B",
    name: "Sky Blue, Straight Khaki and Black",
    identity: "shopify_supplier:36775b09ed8cf6af570dd58f177804a5200ce70c",
  },
  {
    key: "C",
    name: "Sky Blue, Medium Gray and Black",
    identity: "shopify_supplier:b4417a8d32930a1455257578c5ba2547279f0c7b",
  },
].map((candidate) => {
  const accepted = acceptedByIdentity.get(candidate.identity);
  if (!accepted) throw new Error(`Missing accepted bottom ${candidate.identity}`);
  if (reservedKeys.has(candidate.identity)) throw new Error(`Bottom is already reserved: ${candidate.identity}`);
  return {
    ...candidate,
    items: [fixedTop, accepted.selectedVariant, fixedShoe],
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

const cardWidth = 520;
const cardHeight = 820;
const itemWidth = 158;
const itemHeight = 640;
const cardBuffers = [];

for (const candidate of candidates) {
  const itemBuffers = await Promise.all(
    candidate.items.map(async (item) => {
      const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
        .rotate()
        .resize({
          width: itemWidth - 12,
          height: 500,
          fit: "contain",
          background: "#f5f2ea",
        })
        .flatten({ background: "#f5f2ea" })
        .jpeg({ quality: 92 })
        .toBuffer();
      const labelSvg = Buffer.from(
        `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#f5f2ea"/><text x="8" y="530" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="8" y="556" font-family="Arial" font-size="11" fill="#222">${escapeXml(item.garmentType.slice(0, 23))}</text><text x="8" y="580" font-family="Arial" font-size="11" fill="#666">${escapeXml(item.color.slice(0, 23))}</text><text x="8" y="612" font-family="Arial" font-size="9" fill="#888">${escapeXml(String(item.productId).slice(0, 22))}</text></svg>`,
      );
      return sharp(labelSvg)
        .composite([{ input: productImage, left: 6, top: 8 }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }),
  );
  const cardSvg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="32" cy="34" r="20" fill="#111"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">${candidate.key}</text><text x="62" y="32" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="62" y="54" font-family="Arial" font-size="12" fill="#6a706b">Spring Work/Office · Budget-Friendly · comparison only</text><text x="18" y="790" font-family="Arial" font-size="11" fill="#777">Choose by full silhouette, not tags. Not UI integrated.</text></svg>`,
  );
  cardBuffers.push(
    await sharp(cardSvg)
      .composite(
        itemBuffers.map((input, index) => ({
          input,
          left: 17 + index * (itemWidth + 6),
          top: 100,
        })),
      )
      .jpeg({ quality: 92 })
      .toBuffer(),
  );
}

const boardWidth = cardWidth * candidates.length + 32 * (candidates.length + 1);
const boardHeight = cardHeight + 150;
const headerSvg = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="32" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#111">S149 · Men’s Spring Work/Office · Bottom comparison</text><text x="32" y="70" font-family="Arial" font-size="14" fill="#555">Same sky-blue draped shirt and black cowhide penny loafer · three tailored trousers · direct visual decision required</text></svg>`,
);
await mkdir(outputDir, { recursive: true });
await sharp(headerSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: 32 + index * (cardWidth + 32),
      top: 110,
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
      scenarioId: "S149",
      occasion: "Work/Office",
      season: "Spring",
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
