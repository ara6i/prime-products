#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const ledgerPath = path.join(reportRoot, "provisional-front-runner-ledger.json");
const outputDir = path.join(reportRoot, "provisional-front-runner-gallery");
const outputJsonPath = path.join(outputDir, "gallery.json");

const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const holds = ledger.holds;

if (holds.length !== ledger.summary.provisionalFrontRunnerHolds) {
  throw new Error(
    `Hold count mismatch: ledger=${ledger.summary.provisionalFrontRunnerHolds}, rows=${holds.length}`,
  );
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^cj:/, "");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, max) {
  const text = String(value ?? "");
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function collectMatchingImageNodes(value, wantedIdentity, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectMatchingImageNodes(item, wantedIdentity, output);
    return output;
  }

  const identityFields = [
    value.identity,
    value.productKey,
    value.productId,
    value.styleRagId,
    value.sourceProductId,
  ];
  const identityMatches = identityFields.some(
    (candidate) => normalizeIdentity(candidate) === wantedIdentity,
  );
  if (identityMatches && typeof value.image === "string" && value.image.trim()) {
    output.push(value);
  }

  for (const nested of Object.values(value)) {
    collectMatchingImageNodes(nested, wantedIdentity, output);
  }
  return output;
}

const sourceSpecs = new Map();
async function loadSourceSpec(relativePath) {
  if (!sourceSpecs.has(relativePath)) {
    const absolutePath = path.join(reportRoot, relativePath);
    sourceSpecs.set(relativePath, JSON.parse(await readFile(absolutePath, "utf8")));
  }
  return sourceSpecs.get(relativePath);
}

const imageCache = new Map();
async function loadImageBuffer(imageReference) {
  if (!imageCache.has(imageReference)) {
    imageCache.set(
      imageReference,
      (async () => {
        if (/^https?:\/\//i.test(imageReference)) {
          const response = await fetch(imageReference, {
            headers: { "user-agent": "Mozilla/5.0 local visual QA" },
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${imageReference}`);
          }
          return Buffer.from(await response.arrayBuffer());
        }
        return readFile(
          path.isAbsolute(imageReference)
            ? imageReference
            : path.join(repoRoot, imageReference),
        );
      })(),
    );
  }
  return imageCache.get(imageReference);
}

const resolved = [];
for (const hold of holds) {
  const sourceSpec = await loadSourceSpec(hold.sourceSpec);
  const matches = collectMatchingImageNodes(
    sourceSpec,
    normalizeIdentity(hold.identity),
  );
  const selected = matches[0] ?? null;
  resolved.push({
    ...hold,
    image: selected?.image ?? null,
    sourceTitle: selected?.title ?? null,
    sourceReviewId: selected?.reviewId ?? null,
    sourcePrice: selected?.price ?? null,
    sourceCurrency: selected?.currency ?? null,
    imageResolved: Boolean(selected?.image),
  });
}

const unresolved = resolved.filter((entry) => !entry.imageResolved);
if (unresolved.length) {
  throw new Error(
    `Unable to resolve ${unresolved.length} images: ${unresolved
      .map((entry) => `${entry.scenarioId}:${entry.identity}`)
      .join(", ")}`,
  );
}

const columns = 4;
const rows = 3;
const perPage = columns * rows;
const cardWidth = 410;
const cardHeight = 595;
const gap = 18;
const margin = 24;
const headerHeight = 128;
const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
const height = headerHeight + margin + rows * cardHeight + (rows - 1) * gap + 30;
const pageCount = Math.ceil(resolved.length / perPage);
const pagePaths = [];

await mkdir(outputDir, { recursive: true });

for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
  const pageEntries = resolved.slice(pageIndex * perPage, (pageIndex + 1) * perPage);
  const cards = await Promise.all(
    pageEntries.map(async (hold, localIndex) => {
      let image;
      let imageError = null;
      try {
        image = await sharp(await loadImageBuffer(hold.image), { failOn: "none" })
          .rotate()
          .resize({
            width: cardWidth - 28,
            height: 380,
            fit: "contain",
            background: "#f5f2ea",
          })
          .flatten({ background: "#f5f2ea" })
          .jpeg({ quality: 92 })
          .toBuffer();
      } catch (error) {
        imageError = error instanceof Error ? error.message : String(error);
        image = Buffer.from(
          `<svg width="${cardWidth - 28}" height="380" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f5f2ea"/><text x="50%" y="48%" text-anchor="middle" font-family="Arial" font-size="16" fill="#9a3f1d">image unavailable</text><text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="11" fill="#777">${escapeXml(truncate(imageError, 52))}</text></svg>`,
        );
      }

      const accent = hold.slot === "top"
        ? "#4d7e69"
        : hold.slot === "bottom"
          ? "#9b6a42"
          : hold.slot === "outerwear"
            ? "#4b6c92"
            : hold.slot === "shoe"
              ? "#75554a"
              : "#7d5a91";
      const overallIndex = pageIndex * perPage + localIndex + 1;
      const svg = Buffer.from(
        `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#ffffff"/><circle cx="28" cy="28" r="18" fill="#111"/><text x="28" y="34" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${overallIndex}</text><text x="56" y="25" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(`${hold.scenarioId} · ${hold.occasion}`)}</text><text x="56" y="48" font-family="Arial" font-size="12" fill="#666">${escapeXml(`${hold.season} · ${hold.budget}`)}</text><text x="18" y="445" font-family="Arial" font-size="14" font-weight="700" fill="${accent}">${escapeXml(hold.slot.toUpperCase())}</text><text x="18" y="472" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(truncate(hold.name, 45))}</text><text x="18" y="497" font-family="Arial" font-size="12" fill="#555">${escapeXml(truncate(hold.garmentType, 52))}</text><text x="18" y="521" font-family="Arial" font-size="12" fill="#555">${escapeXml(truncate(hold.color, 52))}</text><text x="18" y="548" font-family="Arial" font-size="10" fill="#777">${escapeXml(truncate(hold.identity, 58))}</text><text x="18" y="575" font-family="Arial" font-size="11" fill="#9a3f1d">provisional hold · not selected · not outfit approved</text></svg>`,
      );
      return {
        card: await sharp(svg)
          .composite([{ input: image, left: 14, top: 58 }])
          .jpeg({ quality: 92 })
          .toBuffer(),
        imageError,
      };
    }),
  );

  for (let index = 0; index < cards.length; index += 1) {
    pageEntries[index].imageLoadError = cards[index].imageError;
  }

  const pageNumber = String(pageIndex + 1).padStart(2, "0");
  const outputImagePath = path.join(outputDir, `page-${pageNumber}.jpg`);
  const baseSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="42" font-family="Arial" font-size="29" font-weight="700" fill="#111">Men’s AI Stylist · 55 provisional holds · page ${pageIndex + 1}/${pageCount}</text><text x="${margin}" y="74" font-family="Arial" font-size="15" fill="#555">One-by-one visual re-audit · reject weak silhouette, season, imagery or Zara-led taste regardless of earlier status</text><text x="${margin}" y="102" font-family="Arial" font-size="13" fill="#777">Local only · globally unique identities · Wedding and Wedding Guest excluded · no UI integration</text></svg>`,
  );

  await sharp(baseSvg)
    .composite(
      cards.map(({ card }, index) => ({
        input: card,
        left: margin + (index % columns) * (cardWidth + gap),
        top: headerHeight + margin + Math.floor(index / columns) * (cardHeight + gap),
      })),
    )
    .jpeg({ quality: 92 })
    .toFile(outputImagePath);
  pagePaths.push(outputImagePath);
}

await writeFile(
  outputJsonPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      status: "visual-reaudit-required",
      productCount: resolved.length,
      distinctIdentities: new Set(resolved.map((entry) => entry.identity)).size,
      scenarioCount: new Set(resolved.map((entry) => entry.scenarioId)).size,
      pageCount,
      pagePaths,
      imageResolutionFailures: resolved.filter((entry) => entry.imageLoadError).length,
      repeatedIdentities: ledger.repeatedIdentities,
      reservationCollisions: ledger.reservationCollisions,
      weddingHolds: ledger.weddingHolds,
      uiIntegrated: false,
      holds: resolved,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      outputDir,
      outputJsonPath,
      productCount: resolved.length,
      distinctIdentities: new Set(resolved.map((entry) => entry.identity)).size,
      scenarioCount: new Set(resolved.map((entry) => entry.scenarioId)).size,
      pageCount,
      imageResolutionFailures: resolved.filter((entry) => entry.imageLoadError).length,
    },
    null,
    2,
  ),
);
