#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const round3Root = path.join(reportRoot, "cj-manual-round3");
const decisions = JSON.parse(
  await readFile(path.join(round3Root, "refinement-input-decisions.json"), "utf8"),
);
const outputRoot = path.join(reportRoot, "winter-formal-budget-pilot-s177");
const outputJsonPath = path.join(outputRoot, "round3-source-core.json");
const outputBoardPath = path.join(outputRoot, "round3-source-core.jpg");

const selected = decisions.products.filter((entry) => entry.scenarioId === "S177");
if (selected.length !== 2) {
  throw new Error(`Expected two S177 source candidates, found ${selected.length}`);
}
const productIds = selected.map((entry) => String(entry.productId));
if (new Set(productIds).size !== productIds.length) {
  throw new Error("S177 source core repeats a supplier identity");
}

const items = selected.map((entry) => ({
  productId: String(entry.productId),
  identity: entry.identity,
  slot: entry.category,
  title: entry.title,
  color: entry.selectedColor,
  image: path.join(reportRoot, entry.bestRefinementInput),
  sourceDecision: entry.visualQaDecision,
  sourceReason: entry.visualReason,
}));

const top = items.find((entry) => entry.slot === "top");
const bottom = items.find((entry) => entry.slot === "bottom");
if (!top || !bottom) throw new Error("S177 top or bottom is missing");

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "source-approved-two-piece-core-other-roles-open",
  scenario: {
    id: "S177",
    gender: "male",
    occasion: "formal-evening",
    occasionLabel: "Formal Evening",
    season: "winter",
    seasonLabel: "Winter",
    budget: "budget-friendly",
    budgetLabel: "Budget-Friendly",
  },
  core: {
    name: "Garnet and Winter Cream · Formal Core",
    rationale:
      "The deep garnet fine-knit polo and winter-cream double-pleat trouser create a clear, warmer formal-evening palette. The top is controlled and compact rather than squeezed, and the trouser is straight with only a restrained break. The core avoids another black/navy outfit and avoids both skinny taper and puddled volume.",
    items: [top, bottom],
    openDirections: {
      outerwear:
        "Pearl-gray single-breasted wool-blend topcoat with a natural shoulder and clean knee-length line.",
      shoe:
        "Dark-chocolate suede round-to-soft-almond side-zip ankle boot with a slim sole; no moc toe, work sole, pointed toe or height-increasing construction.",
      bag:
        "Oxblood or tobacco slim evening folio with matte finish and restrained hardware.",
      accessory:
        "Soft-sage silk-blend scarf or minimal warm-metal detail; do not use a pocket square without a jacket pocket.",
    },
  },
  gates: {
    exactCjPagesReviewed: true,
    sourceInputsVisuallyReviewed: true,
    twoPieceGarmentCoreVisualPass: true,
    completeCompositionVisualPass: false,
    missingSlots: ["outerwear", "shoe", "bag", "accessory"],
    repeatedProductIdentities: 0,
    refinementAuthorized: false,
    refinementComplete: false,
    backgroundRemovalComplete: false,
    finalOutfitApproved: false,
    reserved: false,
    uiIntegrated: false,
  },
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const width = 1200;
const height = 790;
const cardWidth = 350;
const cardHeight = 540;
const productCards = await Promise.all(
  items.map(async (item) => {
    const image = await sharp(await readFile(item.image), { failOn: "none" })
      .rotate()
      .resize({
        width: cardWidth - 20,
        height: 410,
        fit: "contain",
        background: "#f5f2ea",
      })
      .flatten({ background: "#f5f2ea" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f5f2ea"/><text x="12" y="450" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="12" y="480" font-family="Arial" font-size="14" fill="#222">${escapeXml(item.title.slice(0, 40))}</text><text x="12" y="508" font-family="Arial" font-size="13" fill="#666">${escapeXml(item.color.slice(0, 38))}</text><text x="12" y="530" font-family="Arial" font-size="10" fill="#888">${escapeXml(item.productId)}</text></svg>`,
    );
    return sharp(label)
      .composite([{ input: image, left: 10, top: 10 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const gapCard = Buffer.from(
  `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f5f2ea" stroke="#8b3e2f" stroke-width="3" stroke-dasharray="10 8"/><text x="${cardWidth / 2}" y="120" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#8b3e2f">OPEN ROLES</text><text x="24" y="175" font-family="Arial" font-size="14" font-weight="700" fill="#222">OUTERWEAR</text><text x="24" y="200" font-family="Arial" font-size="13" fill="#555">pearl-gray clean wool topcoat</text><text x="24" y="250" font-family="Arial" font-size="14" font-weight="700" fill="#222">SHOE</text><text x="24" y="275" font-family="Arial" font-size="13" fill="#555">dark-chocolate slim suede boot</text><text x="24" y="325" font-family="Arial" font-size="14" font-weight="700" fill="#222">BAG</text><text x="24" y="350" font-family="Arial" font-size="13" fill="#555">oxblood or tobacco evening folio</text><text x="24" y="400" font-family="Arial" font-size="14" font-weight="700" fill="#222">ACCESSORY</text><text x="24" y="425" font-family="Arial" font-size="13" fill="#555">soft-sage scarf · no fake pocket square</text><text x="${cardWidth / 2}" y="490" text-anchor="middle" font-family="Arial" font-size="12" fill="#777">not sourced · not refined · not approved</text></svg>`,
);

const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="36" y="48" font-family="Arial" font-size="27" font-weight="700" fill="#111">S177 · Men’s Winter Formal Evening · Budget-Friendly</text><text x="36" y="82" font-family="Arial" font-size="19" font-weight="700" fill="#7f2237">Garnet and Winter Cream · Formal Core</text><text x="36" y="110" font-family="Arial" font-size="13" fill="#555">manual exact CJ pages · source-approved two-piece core · local only</text><text x="36" y="718" font-family="Arial" font-size="13" font-weight="700" fill="#8b3e2f">Stylist verdict: top + trouser pass; four unique roles remain open</text><text x="36" y="745" font-family="Arial" font-size="12" fill="#666">No glossy dress shoe, black filler or oversized layer · not reserved · not final-approved · not UI integrated</text><text x="36" y="770" font-family="Arial" font-size="12" fill="#666">Zero product reuse · refinement remains unauthorized</text></svg>`,
);

await mkdir(outputRoot, { recursive: true });
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
await sharp(base)
  .composite(
    [...productCards, gapCard].map((input, index) => ({
      input,
      left: 36 + index * 382,
      top: 150,
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(outputBoardPath);

console.log(
  JSON.stringify(
    {
      outputJsonPath,
      outputBoardPath,
      ...result.gates,
    },
    null,
    2,
  ),
);
