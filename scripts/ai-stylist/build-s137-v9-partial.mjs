#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const sourceDraftPath = path.join(
  reportRoot,
  "summer-casual-budget-pilot-v8/agent-styled-draft.json",
);
const approvedCandidatesPath = path.join(
  reportRoot,
  "cj-manual-approved-candidates.json",
);
const alphaManifestPath = path.join(
  reportRoot,
  "cj-manual-gemini-final-alpha/alpha-approval-manifest.json",
);
const outputDir = path.join(reportRoot, "summer-casual-budget-pilot-v9-partial");
const outputDraftPath = path.join(outputDir, "agent-styled-draft.json");
const outputBoardPath = path.join(outputDir, "contact-sheets/S137-separates.jpg");

const [sourceDraft, approvedCandidates, alphaManifest] = await Promise.all([
  readFile(sourceDraftPath, "utf8").then(JSON.parse),
  readFile(approvedCandidatesPath, "utf8").then(JSON.parse),
  readFile(alphaManifestPath, "utf8").then(JSON.parse),
]);

const sourceOutfits = sourceDraft.scenarios[0].outfitSets.separates;
const candidatesById = new Map(
  approvedCandidates.products.map((product) => [String(product.productId), product]),
);
const alphaById = new Map(
  alphaManifest.entries.map((entry) => [String(entry.productId), entry]),
);

function alphaPath(productId) {
  const entry = alphaById.get(String(productId));
  if (!entry) throw new Error(`Missing approved alpha for ${productId}`);
  return entry.finalPath;
}

function manualItem(productId) {
  const product = candidatesById.get(String(productId));
  if (!product) throw new Error(`Missing approved candidate ${productId}`);
  const slotByKind = { top: "top", bottom: "bottom", shoe: "shoe" };
  const slot = slotByKind[product.productKind];
  if (!slot) throw new Error(`Unsupported product kind ${product.productKind}`);
  return {
    styleRagId: `cj:${product.productId}`,
    productId: product.productId,
    sourceProductId: product.productId,
    sku: product.sku,
    title: product.title,
    slot,
    garmentType: product.garmentType,
    color: product.color,
    normalizedColor: product.color,
    baseColor: product.color,
    price: product.price,
    currency: product.currency,
    image: alphaPath(product.productId),
    cjPageUrl: product.cjPageUrl,
    source: "manual-cj-gemini-final-alpha",
    visualDecisionStatus: "accept",
    visualConstraints: [
      "one global placement only",
      "visually approved source and final alpha",
      "summer casual styling approved only in this complete look",
    ],
  };
}

function useApprovedAlphaForManualItems(outfit) {
  for (const item of outfit.items) {
    if (alphaById.has(String(item.productId))) {
      item.image = alphaPath(item.productId);
      item.source = "manual-cj-gemini-final-alpha";
    }
  }
}

const retainedPositions = [1, 2, 3, 4, 5];
const outfits = sourceOutfits
  .filter((outfit) => retainedPositions.includes(outfit.position))
  .map((outfit) => structuredClone(outfit));

for (const outfit of outfits) useApprovedAlphaForManualItems(outfit);

const look2 = outfits.find((outfit) => outfit.position === 2);
look2.name = "Washed Blue, Warm Ivory and Tan Suede";
look2.rationale =
  "A washed-blue short-sleeve shirt and warm-ivory double-pleat trouser form a light smart-casual column; the clean tan-suede penny loafer adds polish without the weight of a dark formal shoe.";
look2.requestedPalette = { name: look2.name };
look2.actualBaseColors = ["washed blue", "warm ivory", "tan brown"];
look2.items = look2.items.filter((item) => item.slot === "top");
look2.items.push(manualItem("2502280543221601200"));
look2.items.push(manualItem("2406240246461620500"));

const look4 = outfits.find((outfit) => outfit.position === 4);
look4.name = "Mint, Apricot and Light Sand";
look4.rationale =
  "A substantial light-mint cotton tee brings the happy color without clinging; an apricot-ecru pleated short and tonal light-sand low-top keep the shape relaxed, clean, and distinctly summery.";
look4.requestedPalette = { name: look4.name };
look4.actualBaseColors = ["light mint green", "apricot ecru", "light sand"];
look4.items = [
  manualItem("2501150834271620600"),
  manualItem("2504281547131609000"),
  manualItem("736610CB-75F0-45C7-9225-A3F4860A9CA4"),
];

for (const outfit of outfits) {
  outfit.outfitId = `S137-SEPARATES-V9-PARTIAL-${String(outfit.position).padStart(2, "0")}`;
  outfit.totalPrice = Number(
    outfit.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2),
  );
}

const allItems = outfits.flatMap((outfit) => outfit.items);
const identities = allItems.map((item) => item.styleRagId);
if (new Set(identities).size !== identities.length) {
  throw new Error("S137 v9 partial contains a repeated product identity");
}
if (outfits.some((outfit) => outfit.items.length !== 3)) {
  throw new Error("Every retained S137 v9 look must contain top, bottom, and shoe");
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "partial-visual-approved",
  sourceLedger: "visual-identity-decisions.json plus final-alpha approval manifest",
  identityRule:
    "One supplier-product identity may appear once across the complete non-wedding men's matrix, regardless of color or variant.",
  summary: {
    scenarios: 1,
    targetOutfits: 10,
    visuallyReadyOutfits: outfits.length,
    missingOutfits: 10 - outfits.length,
    placements: allItems.length,
    uniqueIdentities: new Set(identities).size,
    repeatedIdentities: identities.length - new Set(identities).size,
    uiIntegrated: false,
  },
  missingFootwearBriefs: [
    "one clean ecru or white retro court sneaker with a low cupsole",
    "one tobacco or sand suede court sneaker with a restrained gum sole",
    "one woven leather slip-on or modern espadrille in stone or tobacco",
    "one minimal leather slide with thin unpadded straps and a flat sole",
    "one clean navy or ecru canvas low-top without orange trim or branding",
  ],
  visualQa: [
    {
      position: 1,
      decision: "pass",
      reason:
        "Soft-white textured polo, controlled green short and clean white low-top are light, balanced and season-correct; no tight top, wide bottom or heavy shoe.",
    },
    {
      position: 2,
      decision: "pass",
      reason:
        "Washed-blue short-sleeve shirt balances the high-rise warm-ivory double-pleat trouser; the tan-suede loafer adds a warm polished finish without making the board dark or formal-heavy.",
    },
    {
      position: 3,
      decision: "pass",
      reason:
        "Sage textured knit, straight white short and soft off-white loafer form a coherent tonal Summer look with controlled relaxed proportions.",
    },
    {
      position: 4,
      decision: "pass",
      reason:
        "Light-mint drop-shoulder tee avoids the rejected clingy active-top shape; apricot-ecru short and light-sand sneaker keep the look casual, clean and bright.",
    },
    {
      position: 5,
      decision: "pass",
      reason:
        "Soft-yellow boxy tee, beige-apricot pleated tailored short and tobacco-and-cream loafer create the strongest warm-color Zara-led statement without becoming loud.",
    },
  ],
  heldClothingLooks: sourceOutfits
    .filter((outfit) => !retainedPositions.includes(outfit.position))
    .map((outfit) => ({
      position: outfit.position,
      name: outfit.name,
      decision: "hold-clothing-replace-shoe",
    })),
  scenarios: [
    {
      scenario: sourceDraft.scenarios[0].scenario,
      outfitSets: { separates: outfits },
    },
  ],
};

await mkdir(path.dirname(outputBoardPath), { recursive: true });
await writeFile(outputDraftPath, `${JSON.stringify(result, null, 2)}\n`);

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

const cardWidth = 600;
const cardHeight = 620;
const columns = 2;
const itemWidth = 184;
const itemHeight = 430;
const cardBuffers = [];

for (const outfit of outfits) {
  const itemBuffers = await Promise.all(
    outfit.items.map(async (item) => {
      const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
        .rotate()
        .resize({
          width: itemWidth - 16,
          height: 310,
          fit: "contain",
          background: "#f5f4ef",
        })
        .flatten({ background: "#f5f4ef" })
        .jpeg({ quality: 91 })
        .toBuffer();
      const labelSvg = Buffer.from(
        `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#f5f4ef"/><text x="10" y="338" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="10" y="362" font-family="Arial" font-size="12" fill="#222">${escapeXml(item.garmentType.slice(0, 25))}</text><text x="10" y="384" font-family="Arial" font-size="12" fill="#666">${escapeXml(item.color.slice(0, 25))}</text><text x="10" y="410" font-family="Arial" font-size="10" fill="#888">${escapeXml(String(item.productId).slice(0, 25))}</text></svg>`,
      );
      return sharp(labelSvg)
        .composite([{ input: productImage, left: 8, top: 8 }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }),
  );

  const palette = outfit.actualBaseColors.join(" · ");
  const cardSvg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#ffffff"/><circle cx="28" cy="30" r="18" fill="#111"/><text x="28" y="36" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${outfit.position}</text><text x="56" y="28" font-family="Arial" font-size="17" font-weight="700" fill="#111">${escapeXml(outfit.name)}</text><text x="56" y="49" font-family="Arial" font-size="12" fill="#66706a">${escapeXml(palette)}</text><text x="18" y="600" font-family="Arial" font-size="11" fill="#777">local visual candidate · unique products · not UI integrated</text></svg>`,
  );
  cardBuffers.push(
    await sharp(cardSvg)
      .composite(
        itemBuffers.map((input, index) => ({
          input,
          left: 18 + index * (itemWidth + 8),
          top: 76,
        })),
      )
      .jpeg({ quality: 93, chromaSubsampling: "4:4:4" })
      .toBuffer(),
  );
}

const rows = Math.ceil(cardBuffers.length / columns);
const headerHeight = 120;
const boardWidth = columns * cardWidth;
const boardHeight = headerHeight + rows * cardHeight;
const boardHeader = Buffer.from(
  `<svg width="${boardWidth}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#edece7"/><text x="24" y="42" font-family="Arial" font-size="25" font-weight="700" fill="#111">S137 · Men's Casual Everyday · Summer · Budget-Friendly</text><text x="24" y="72" font-family="Arial" font-size="16" fill="#333">v9 partial · ${outfits.length}/10 visually approved core outfits · ${allItems.length}/${allItems.length} unique placements</text><text x="24" y="98" font-family="Arial" font-size="13" fill="#8a3b12">Five looks remain open because their shoes failed exact-page review; no winter or formal substitute was forced in.</text></svg>`,
);

await sharp({
  create: {
    width: boardWidth,
    height: boardHeight,
    channels: 3,
    background: "#edece7",
  },
})
  .composite([
    { input: boardHeader, left: 0, top: 0 },
    ...cardBuffers.map((input, index) => ({
      input,
      left: (index % columns) * cardWidth,
      top: headerHeight + Math.floor(index / columns) * cardHeight,
    })),
  ])
  .jpeg({ quality: 93, chromaSubsampling: "4:4:4" })
  .toFile(outputBoardPath);

console.log(
  JSON.stringify(
    {
      outputDraftPath,
      outputBoardPath,
      visuallyReadyOutfits: outfits.length,
      placements: allItems.length,
      uniqueIdentities: new Set(identities).size,
      missingOutfits: 10 - outfits.length,
    },
    null,
    2,
  ),
);
