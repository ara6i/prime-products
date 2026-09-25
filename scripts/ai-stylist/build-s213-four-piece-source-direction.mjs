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
const round6Root = path.join(reportRoot, "cj-manual-round6");
const decisions = JSON.parse(
  await readFile(path.join(round3Root, "refinement-input-decisions.json"), "utf8"),
);
const scarf = JSON.parse(
  await readFile(path.join(round6Root, "2406110755381611400/product.json"), "utf8"),
);
const outputRoot = path.join(reportRoot, "winter-party-budget-pilot-s213");
const outputJsonPath = path.join(outputRoot, "four-piece-source-direction.json");
const outputBoardPath = path.join(outputRoot, "four-piece-source-direction.jpg");

const baseEntries = decisions.products.filter((entry) => entry.scenarioId === "S213");
if (baseEntries.length !== 3) {
  throw new Error(`Expected three S213 round-3 candidates, found ${baseEntries.length}`);
}

const baseItems = await Promise.all(
  baseEntries.map(async (entry) => {
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
    };
  }),
);
const items = [
  ...baseItems,
  {
    productId: String(scarf.productId),
    identity: scarf.identity,
    slot: scarf.category,
    title: scarf.title,
    color: scarf.selectedColor,
    image: path.join(round6Root, String(scarf.productId), scarf.bestRefinementInput),
    landedTotalUsd: scarf.commercialEvidence?.landedTotalUsd ?? null,
  },
];

const slotOrder = new Map([
  ["top", 0],
  ["bottom", 1],
  ["shoe", 2],
  ["accessory", 3],
]);
items.sort((a, b) => slotOrder.get(a.slot) - slotOrder.get(b.slot));
if (new Set(items.map((item) => item.identity)).size !== items.length) {
  throw new Error("S213 four-piece direction repeats a supplier identity");
}
for (const slot of slotOrder.keys()) {
  if (!items.some((item) => item.slot === slot)) {
    throw new Error(`S213 ${slot} is missing`);
  }
}

const landedSubtotalUsd = Number(
  items.reduce((sum, item) => sum + Number(item.landedTotalUsd || 0), 0).toFixed(2),
);
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "provisional-four-piece-source-direction-two-separates-roles-open",
  scenario: {
    id: "S213",
    gender: "male",
    occasion: "party-night-out",
    season: "winter",
    budget: "budget-friendly",
  },
  direction: {
    name: "Festive Red, Winter Ecru, Tobacco Suede and Warm Windowpane",
    landedSubtotalUsd,
    rationale:
      "The vivid red knit stays the happy focal point. Warm ecru corduroy gives seasonal texture and a controlled leg; the matte tobacco loafer grounds the look without black formality; the camel-and-cream windowpane scarf adds soft Winter pattern and connects the light trouser to the brown shoe. The scarf is a stronger modern finishing choice than the rejected glossy or oversized-buckle belts.",
    items,
    openDirections: {
      outerwear:
        "Short oatmeal, cream or light-camel Winter blouson with a natural shoulder and clean regular body; avoid black puffers, long formal coats, bulky contrast patching and slim safari jackets.",
      bag:
        "Compact soft-taupe, warm-gray or muted tobacco crossbody with a clean modern body and restrained hardware; avoid black business bags, glossy baguettes, cargo pockets and traditional orange-cognac messengers.",
      suitFamily:
        "The separate S213 suit-family alternative remains open and requires its own unique modern forest, bottle-green or deep-teal two-piece.",
    },
  },
  gates: {
    exactCjPagesReviewed: true,
    sourceInputsVisuallyReviewed: true,
    repeatedProductIdentities: 0,
    fourPieceDirectionReadyForVisualReview: true,
    completeCompositionVisualPass: false,
    missingSeparatesSlots: ["outerwear", "bag"],
    separateSuitFamilyOpen: true,
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

const width = 1970;
const height = 820;
const cardWidth = 340;
const cardHeight = 540;
const cards = await Promise.all(
  items.map(async (item) => {
    const image = await sharp(await readFile(item.image), { failOn: "none" })
      .rotate()
      .resize({
        width: cardWidth - 20,
        height: 410,
        fit: "contain",
        background: "#f7f3eb",
      })
      .flatten({ background: "#f7f3eb" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f7f3eb"/><text x="12" y="450" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="12" y="480" font-family="Arial" font-size="14" fill="#222">${escapeXml(item.title.slice(0, 39))}</text><text x="12" y="508" font-family="Arial" font-size="13" fill="#666">${escapeXml(item.color.slice(0, 36))}</text><text x="12" y="530" font-family="Arial" font-size="10" fill="#888">${escapeXml(item.productId)} · landed $${Number(item.landedTotalUsd).toFixed(2)}</text></svg>`,
    );
    return sharp(label)
      .composite([{ input: image, left: 10, top: 10 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const gapCard = Buffer.from(
  `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f7f3eb" stroke="#9a3f1d" stroke-width="3" stroke-dasharray="10 8"/><text x="${cardWidth / 2}" y="105" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#9a3f1d">TWO OPEN ROLES</text><text x="24" y="185" font-family="Arial" font-size="14" font-weight="700" fill="#222">OUTERWEAR</text><text x="24" y="212" font-family="Arial" font-size="13" fill="#555">oatmeal / cream short Winter blouson</text><text x="24" y="300" font-family="Arial" font-size="14" font-weight="700" fill="#222">BAG</text><text x="24" y="327" font-family="Arial" font-size="13" fill="#555">soft taupe / warm-gray compact crossbody</text><text x="${cardWidth / 2}" y="430" text-anchor="middle" font-family="Arial" font-size="12" fill="#777">separate green suit family also open</text><text x="${cardWidth / 2}" y="470" text-anchor="middle" font-family="Arial" font-size="12" fill="#777">not complete · not reserved</text><text x="${cardWidth / 2}" y="492" text-anchor="middle" font-family="Arial" font-size="12" fill="#777">not refined · not UI integrated</text></svg>`,
);

const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9e5dc"/><text x="36" y="48" font-family="Arial" font-size="27" font-weight="700" fill="#111">S213 · Men’s Winter Party / Night Out · Budget-Friendly</text><text x="36" y="82" font-family="Arial" font-size="19" font-weight="700" fill="#b22f31">Festive Red, Winter Ecru, Tobacco Suede and Warm Windowpane</text><text x="36" y="110" font-family="Arial" font-size="13" fill="#555">four exact CJ source identities · landed subtotal $${landedSubtotalUsd.toFixed(2)} · local visual direction only</text><text x="36" y="738" font-family="Arial" font-size="13" font-weight="700" fill="#9a3f1d">Stylist checkpoint: scarf replaces the failed belt direction; outerwear and bag must still pass beside all four pieces</text><text x="36" y="767" font-family="Arial" font-size="12" fill="#666">Happy red focal point · light Winter texture · controlled trouser · matte brown footwear · soft camel/cream pattern</text><text x="36" y="794" font-family="Arial" font-size="12" fill="#666">Four unique identities · zero paid generation · not a complete outfit · Wedding and Wedding Guest excluded</text></svg>`,
);

await mkdir(outputRoot, { recursive: true });
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
await sharp(base)
  .composite(
    [...cards, gapCard].map((input, index) => ({
      input,
      left: 36 + index * 382,
      top: 160,
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
