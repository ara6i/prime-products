#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const approved = JSON.parse(
  await readFile(
    path.join(reportRoot, "approved-mens-outfit-gallery/approved-outfits.json"),
    "utf8",
  ),
);
const cap = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-round5/1448635526763646976/product.json"),
    "utf8",
  ),
);

const core = approved.looks.find(
  (look) => look.scenarioId === "S137" && look.position === 1,
);
if (!core) throw new Error("Missing approved S137 position-one core");

const items = [
  ...core.items.map((item) => ({
    slot: item.slot,
    title: item.title,
    color: item.color,
    identity: item.styleRagId,
    image: item.image,
    state: "approved one-use S137 core",
  })),
  {
    slot: "accessory trial",
    title: cap.title,
    color: cap.selectedColor,
    identity: cap.identity,
    image: cap.sourceAssets[0].localPath,
    state: "source-selected only · shipping and refinement pending",
  },
];

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const truncate = (value, length) => {
  const text = String(value ?? "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
};
async function imageBuffer(source) {
  if (!/^https?:\/\//i.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

const cardWidth = 330;
const cardHeight = 560;
const imageHeight = 352;
const gap = 18;
const margin = 28;
const headerHeight = 145;
const footerHeight = 118;
const width = margin * 2 + items.length * cardWidth + (items.length - 1) * gap;
const height = headerHeight + cardHeight + footerHeight + margin * 2;

const cards = [];
for (const item of items) {
  const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
    .rotate()
    .resize({
      width: cardWidth - 28,
      height: imageHeight,
      fit: "contain",
      background: "#f7f4ec",
    })
    .flatten({ background: "#f7f4ec" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const card = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><text x="16" y="28" font-family="Arial" font-size="12" font-weight="700" fill="#41665a">${escapeXml(item.slot.toUpperCase())}</text><text x="16" y="426" font-family="Arial" font-size="15" font-weight="700" fill="#171717">${escapeXml(truncate(item.title, 38))}</text><text x="16" y="455" font-family="Arial" font-size="12" fill="#666">${escapeXml(truncate(item.color, 38))}</text><text x="16" y="493" font-family="Arial" font-size="10" fill="#8a562a">${escapeXml(truncate(item.state, 52))}</text><text x="16" y="531" font-family="Arial" font-size="8" fill="#999">${escapeXml(truncate(item.identity, 55))}</text></svg>`,
  );
  cards.push(
    await sharp(card)
      .composite([{ input: productImage, left: 14, top: 48 }])
      .jpeg({ quality: 95 })
      .toBuffer(),
  );
}

const header = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9ebe3"/><text x="${margin}" y="42" font-family="Arial" font-size="28" font-weight="700" fill="#171717">S137 · Summer Casual · washed-blue cap compatibility trial</text><text x="${margin}" y="77" font-family="Arial" font-size="16" fill="#53635c">Soft white · fresh green · clean white · faded washed blue</text><text x="${margin}" y="108" font-family="Arial" font-size="13" fill="#8a562a">Four-piece partial styling check · not a six-role outfit · zero product identity reuse</text><text x="${margin}" y="${headerHeight + cardHeight + 43}" font-family="Arial" font-size="16" font-weight="700" fill="#41665a">PARTIAL PALETTE COMPATIBILITY PASSED · COMPLETE OUTFIT NOT APPROVED</text><text x="${margin}" y="${headerHeight + cardHeight + 75}" font-family="Arial" font-size="13" fill="#555">The faded blue cap adds a relaxed cool accent while the white-green core remains light, clean and clearly Summer.</text><text x="${margin}" y="${headerHeight + cardHeight + 104}" font-family="Arial" font-size="11" fill="#8a562a">LOCAL ONLY · WEDDING EXCLUDED · NO GEMINI · NOT CATALOG-ACCEPTED, RESERVED OR UI-INTEGRATED</text></svg>`,
);

const outputDir = path.join(reportRoot, "summer-casual-s137-washed-blue-cap-trial");
await mkdir(outputDir, { recursive: true });
const boardPath = path.join(outputDir, "four-piece-partial.jpg");
await sharp(header)
  .composite(
    cards.map((input, index) => ({
      input,
      left: margin + index * (cardWidth + gap),
      top: headerHeight,
    })),
  )
  .jpeg({ quality: 95 })
  .toFile(boardPath);

const record = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioId: "S137",
  occasion: "Casual Everyday",
  season: "Summer",
  budget: "Budget-Friendly",
  status: "partial-four-piece-palette-compatibility-passed",
  visuallyReviewedAt: "2026-09-17",
  visualDecision: "pass-partial-palette-only",
  visualDecisionReason:
    "The faded medium-blue cap gives the soft-white textured polo, fresh-green tailored short and clean white sneaker a relaxed cool accent without making the composition dark, over-sporty or seasonally heavy. The four-piece balance is modern and Summer-correct, but it is not a complete six-role outfit and the cap still lacks shipping, refinement and final catalog gates.",
  completeOutfitApproved: false,
  capCatalogAccepted: false,
  zeroIdentityReuse: new Set(items.map((item) => item.identity)).size === items.length,
  items,
  boardPath,
};
await writeFile(
  path.join(outputDir, "four-piece-partial.json"),
  `${JSON.stringify(record, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(record, null, 2));
