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
const outputRoot = path.join(reportRoot, "winter-party-budget-pilot-s213");
const outputJsonPath = path.join(outputRoot, "round3-source-core.json");
const outputBoardPath = path.join(outputRoot, "round3-source-core.jpg");

const selected = decisions.products.filter((entry) => entry.scenarioId === "S213");
if (selected.length !== 3) {
  throw new Error(`Expected three S213 source candidates, found ${selected.length}`);
}
const productIds = selected.map((entry) => String(entry.productId));
if (new Set(productIds).size !== productIds.length) {
  throw new Error("S213 source core repeats a supplier identity");
}

const items = await Promise.all(
  selected.map(async (entry) => {
    const product = JSON.parse(
      await readFile(path.join(round3Root, String(entry.productId), "product.json"), "utf8"),
    );
    return {
      productId: String(entry.productId),
      identity: entry.identity,
      slot: entry.category,
      title: entry.title,
      color: entry.selectedColor,
      image: path.join(reportRoot, entry.bestRefinementInput),
      landedTotalUsd: product.commercialEvidence?.landedTotalUsd ?? null,
      sourceDecision: entry.visualQaDecision,
      sourceReason: entry.visualReason,
    };
  }),
);

const slotOrder = new Map([
  ["top", 0],
  ["bottom", 1],
  ["shoe", 2],
]);
items.sort((a, b) => slotOrder.get(a.slot) - slotOrder.get(b.slot));
for (const slot of slotOrder.keys()) {
  if (!items.some((entry) => entry.slot === slot)) {
    throw new Error(`S213 ${slot} is missing`);
  }
}

const landedSubtotalUsd = Number(
  items.reduce((sum, item) => sum + Number(item.landedTotalUsd || 0), 0).toFixed(2),
);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "source-approved-three-piece-core-three-separates-roles-open",
  scenario: {
    id: "S213",
    gender: "male",
    occasion: "party-night-out",
    occasionLabel: "Party / Night Out",
    season: "winter",
    seasonLabel: "Winter",
    budget: "budget-friendly",
    budgetLabel: "Budget-Friendly",
  },
  core: {
    name: "Festive Red, Winter Ecru and Tobacco Suede",
    rationale:
      "The vivid red knit polo supplies the happy focal color, the warm beige corduroy trouser keeps a controlled cropped straight line, and the matte tobacco-brown suede loafer adds polished warmth without another black formal shoe, technical runner or chunky platform. The palette is festive and modern while the silhouettes avoid both a squeezed top and a puddled bottom.",
    landedSubtotalUsd,
    items,
    openDirections: {
      outerwear:
        "Short oatmeal, cream or light-camel Winter blouson with a natural shoulder and clean regular body; no black puffer, long coat or oversized contrast patching.",
      bag:
        "Compact soft-taupe or dark-tobacco crossbody with a clean flap, matte finish and restrained hardware; no black business satchel or cargo pockets.",
      accessory:
        "Dark-brown slim leather belt with a small matte-brass buckle or another quiet warm finishing detail; no large silver automatic buckle or distressed western hardware.",
      suitFamily:
        "The separate S213 suit-family alternative remains open and must use a unique bottle-, forest- or deep-green modern two-piece if CJ exposes one.",
    },
  },
  gates: {
    exactCjPagesReviewed: true,
    sourceInputsVisuallyReviewed: true,
    threePieceCoreVisualPass: true,
    completeCompositionVisualPass: false,
    missingSeparatesSlots: ["outerwear", "bag", "accessory"],
    separateSuitFamilyOpen: true,
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

const width = 1580;
const height = 805;
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
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f5f2ea"/><text x="12" y="450" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="12" y="480" font-family="Arial" font-size="14" fill="#222">${escapeXml(item.title.slice(0, 40))}</text><text x="12" y="508" font-family="Arial" font-size="13" fill="#666">${escapeXml(item.color.slice(0, 38))}</text><text x="12" y="530" font-family="Arial" font-size="10" fill="#888">${escapeXml(item.productId)} · landed $${Number(item.landedTotalUsd).toFixed(2)}</text></svg>`,
    );
    return sharp(label)
      .composite([{ input: image, left: 10, top: 10 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const gapCard = Buffer.from(
  `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f5f2ea" stroke="#9a3f1d" stroke-width="3" stroke-dasharray="10 8"/><text x="${cardWidth / 2}" y="105" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#9a3f1d">OPEN SEPARATES ROLES</text><text x="24" y="175" font-family="Arial" font-size="14" font-weight="700" fill="#222">OUTERWEAR</text><text x="24" y="200" font-family="Arial" font-size="13" fill="#555">oatmeal / cream short Winter blouson</text><text x="24" y="270" font-family="Arial" font-size="14" font-weight="700" fill="#222">BAG</text><text x="24" y="295" font-family="Arial" font-size="13" fill="#555">soft-taupe compact clean crossbody</text><text x="24" y="365" font-family="Arial" font-size="14" font-weight="700" fill="#222">ACCESSORY</text><text x="24" y="390" font-family="Arial" font-size="13" fill="#555">quiet dark-brown belt · small brass buckle</text><text x="${cardWidth / 2}" y="465" text-anchor="middle" font-family="Arial" font-size="12" fill="#777">separate green suit family also remains open</text><text x="${cardWidth / 2}" y="495" text-anchor="middle" font-family="Arial" font-size="12" fill="#777">not complete · not reserved · not UI integrated</text></svg>`,
);

const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="36" y="48" font-family="Arial" font-size="27" font-weight="700" fill="#111">S213 · Men’s Winter Party / Night Out · Budget-Friendly</text><text x="36" y="82" font-family="Arial" font-size="19" font-weight="700" fill="#b22f31">Festive Red, Winter Ecru and Tobacco Suede</text><text x="36" y="110" font-family="Arial" font-size="13" fill="#555">manual exact CJ pages · source-approved three-piece core · landed subtotal $${landedSubtotalUsd.toFixed(2)} · local only</text><text x="36" y="728" font-family="Arial" font-size="13" font-weight="700" fill="#9a3f1d">Stylist verdict: top + trouser + shoe pass together; outerwear, bag and accessory remain open</text><text x="36" y="755" font-family="Arial" font-size="12" fill="#666">Happy focal red · controlled corduroy leg · matte suede loafer · no black formal filler, technical runner or chunky platform</text><text x="36" y="782" font-family="Arial" font-size="12" fill="#666">Three unique identities · refinement remains unauthorized · not a complete outfit · not UI integrated</text></svg>`,
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
      landedSubtotalUsd,
      ...result.gates,
    },
    null,
    2,
  ),
);
