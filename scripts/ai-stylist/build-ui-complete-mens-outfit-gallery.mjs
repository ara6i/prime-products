#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "ui-complete-mens-outfit-gallery");
const ledger = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);

if (
  ledger.summary.uiCompleteOutfits !== 3 ||
  ledger.summary.uiCompleteOutfitPlacements !== 18 ||
  ledger.summary.repeatedProductIdentities !== 0
) {
  throw new Error("Expected three globally unique six-piece outfit approvals");
}

const looks = [...ledger.uiCompleteOutfits].sort((a, b) =>
  a.scenarioId.localeCompare(b.scenarioId, undefined, { numeric: true }),
);
const galleryWidth = 1800;
const margin = 28;
const headerHeight = 116;
const gap = 26;
const renderedBoards = [];
for (const look of looks) {
  const board = await sharp(look.boardPath)
    .resize({ width: galleryWidth - margin * 2, withoutEnlargement: true })
    .jpeg({ quality: 94 })
    .toBuffer({ resolveWithObject: true });
  renderedBoards.push({ ...look, input: board.data, height: board.info.height });
}

const galleryHeight =
  headerHeight +
  margin +
  renderedBoards.reduce((sum, board) => sum + board.height, 0) +
  gap * (renderedBoards.length - 1) +
  margin;
const header = Buffer.from(
  `<svg width="${galleryWidth}" height="${galleryHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#e9e7e0"/>
    <text x="${margin}" y="44" font-family="Arial" font-size="30" font-weight="700" fill="#171714">Men's AI Stylist · visually approved six-piece looks</text>
    <text x="${margin}" y="76" font-family="Arial" font-size="15" fill="#555">3 complete compositions · 18 globally unique product identities · Zara-led light and balanced palettes</text>
    <text x="${margin}" y="101" font-family="Arial" font-size="12" fill="#8a3d1d">LOCAL ONLY · WEDDING EXCLUDED · NOT CONNECTED TO THE AI STYLIST UI</text>
  </svg>`,
);

let top = headerHeight + margin;
const composites = [];
for (const board of renderedBoards) {
  composites.push({ input: board.input, left: margin, top });
  top += board.height + gap;
}

await mkdir(outputDir, { recursive: true });
const galleryPath = path.join(outputDir, "approved-six-piece-looks.jpg");
await sharp(header)
  .composite(composites)
  .jpeg({ quality: 95 })
  .toFile(galleryPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  completeOutfits: looks.length,
  uniqueProductPlacements: ledger.summary.uiCompleteOutfitPlacements,
  repeatedProductIdentities: ledger.summary.repeatedProductIdentities,
  weddingAndWeddingGuestExcluded: ledger.weddingAndWeddingGuestExcluded,
  uiIntegrated: ledger.summary.uiIntegrated,
  galleryPath,
  looks: looks.map(({ scenarioId, outfitId, name, boardPath, totalPrice }) => ({
    scenarioId,
    outfitId,
    name,
    boardPath,
    totalPrice,
  })),
};
await writeFile(
  path.join(outputDir, "gallery.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

console.log(JSON.stringify(result, null, 2));
