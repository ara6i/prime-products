#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const candidateRoot = path.join(
  reportRoot,
  "cj-manual-round2/2505011511051624200",
);
const historicalDraft = JSON.parse(
  await readFile(
    path.join(reportRoot, "summer-date-budget-pilot-s189-v1-partial/agent-styled-draft.json"),
    "utf8",
  ),
);
const candidate = JSON.parse(
  await readFile(path.join(candidateRoot, "product.json"), "utf8"),
);
const reservations = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);

if (reservations.reservations.some((entry) => entry.productKey === candidate.identity)) {
  throw new Error(`Candidate identity is already reserved: ${candidate.identity}`);
}

const historicalOutfit =
  historicalDraft.scenarios[0].outfitSets.separates[0];
const top = historicalOutfit.items.find((item) => item.slot === "top");
if (!top) throw new Error("S189 historical top is missing.");

const bottom = {
  styleRagId: candidate.identity,
  productId: candidate.productId,
  sourceProductId: candidate.productId,
  sku: candidate.selectedSku,
  title: candidate.title,
  slot: "bottom",
  garmentType: candidate.garmentType,
  color: candidate.selectedColor,
  material: candidate.material,
  price: candidate.price,
  currency: candidate.currency,
  image: path.join(candidateRoot, candidate.selectedSourceImage),
  cjPageUrl: candidate.cjPageUrl,
  source: "manual-cj-exact-page-source-approved",
  visualDecisionStatus: "source-approved-local-not-refined",
  visualConstraints: candidate.constraints,
};

const outfit = {
  outfitId: "S189-SEPARATES-CJ-SOURCE-CANDIDATE-01",
  position: 1,
  name: "Sunset Orange and Beige Apricot · Shoe Open",
  rationale:
    "The warm orange textured shirt carries the Summer Date color while the beige-apricot double-pleat trouser adds a clean high rise and controlled straight leg. This is a viable two-piece garment core only; it still needs a modern low-profile ecru or light-tobacco suede sneaker with a slim gum sole. The rejected glossy coffee-and-taupe dress loafer must not return.",
  requestedPalette: {
    name: "Sunset Orange, Beige Apricot and Light Suede",
  },
  actualBaseColors: [
    "sunset orange",
    "beige apricot",
  ],
  requiredShoeDirection:
    "Unique modern low-profile ecru or light-tobacco suede sneaker, round or softly almond toe, slim caramel gum sole, no glossy dress finish, no black stacked heel and no chunky platform.",
  items: [top, bottom],
};
outfit.totalPrice = Number(
  outfit.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2),
);

const identities = outfit.items.map((item) => item.styleRagId);
if (new Set(identities).size !== identities.length) {
  throw new Error("S189 CJ source candidate repeats a product identity.");
}
if (outfit.totalPrice > 500) {
  throw new Error(`S189 CJ source candidate exceeds Budget-Friendly ceiling: ${outfit.totalPrice}`);
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "source-approved-two-piece-core-shoe-gap",
  scenario: {
    id: "S189",
    gender: "male",
    occasion: "date-night",
    occasionLabel: "Date Night",
    season: "summer",
    seasonLabel: "Summer",
    budget: "budget-friendly",
    budgetLabel: "Budget-Friendly",
    budgetMin: 0,
    budgetMax: 500,
    currency: "USD",
  },
  outfit,
  gates: {
    exactCjPageReviewed: true,
    fullLengthWornProof: true,
    twoPieceGarmentCoreVisualPass: true,
    completeCompositionVisualPass: false,
    missingSlots: ["shoe"],
    productIdentityCollision: false,
    refinementAuthorized: false,
    refinementComplete: false,
    backgroundRemovalComplete: false,
    finalOutfitApproved: false,
    reserved: false,
    uiIntegrated: false,
  },
};

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

const width = 1200;
const height = 790;
const itemWidth = 350;
const itemHeight = 540;
const itemBuffers = await Promise.all(
  outfit.items.map(async (item) => {
    const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
      .rotate()
      .resize({
        width: itemWidth - 20,
        height: 410,
        fit: "contain",
        background: "#f5f2ea",
      })
      .flatten({ background: "#f5f2ea" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const labelSvg = Buffer.from(
      `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f5f2ea"/><text x="12" y="450" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="12" y="480" font-family="Arial" font-size="14" fill="#222">${escapeXml(item.garmentType.slice(0, 39))}</text><text x="12" y="508" font-family="Arial" font-size="13" fill="#666">${escapeXml(item.color.slice(0, 38))}</text><text x="12" y="530" font-family="Arial" font-size="10" fill="#888">${escapeXml(String(item.productId).slice(0, 34))}</text></svg>`,
    );
    return sharp(labelSvg)
      .composite([{ input: productImage, left: 10, top: 10 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const shoeGapSvg = Buffer.from(
  `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#f5f2ea" stroke="#b8582b" stroke-width="3" stroke-dasharray="10 8"/><text x="${itemWidth / 2}" y="205" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#b8582b">SHOE GAP</text><text x="${itemWidth / 2}" y="248" text-anchor="middle" font-family="Arial" font-size="15" fill="#333">Modern low-profile suede sneaker</text><text x="${itemWidth / 2}" y="276" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">ecru or light tobacco · slim gum sole</text><text x="${itemWidth / 2}" y="450" text-anchor="middle" font-family="Arial" font-size="13" fill="#8b3e2f">No glossy dress loafer · no black heel</text><text x="${itemWidth / 2}" y="480" text-anchor="middle" font-family="Arial" font-size="12" fill="#777">not sourced · not refined · not approved</text></svg>`,
);

const baseSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="36" y="48" font-family="Arial" font-size="27" font-weight="700" fill="#111">S189 · Men’s Summer Date Night · Budget-Friendly</text><text x="36" y="82" font-family="Arial" font-size="19" font-weight="700" fill="#b8582b">${escapeXml(outfit.name)}</text><text x="36" y="110" font-family="Arial" font-size="13" fill="#555">manual exact CJ page · source-approved two-piece core · local only</text><text x="36" y="718" font-family="Arial" font-size="13" font-weight="700" fill="#b8582b">Stylist verdict: top + trouser pass; complete outfit remains open because the shoe is missing</text><text x="36" y="745" font-family="Arial" font-size="12" fill="#666">Awaiting authorized trouser refinement and a new exact-page shoe · not reserved · not final-approved · not UI integrated</text><text x="36" y="770" font-family="Arial" font-size="12" fill="#666">Observed two-piece source subtotal: $${outfit.totalPrice.toFixed(2)} · zero product reuse</text></svg>`,
);

const outputJsonPath = path.join(candidateRoot, "s189-source-candidate.json");
const outputBoardPath = path.join(candidateRoot, "s189-source-candidate.jpg");
await mkdir(candidateRoot, { recursive: true });
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
await sharp(baseSvg)
  .composite(
    [...itemBuffers, shoeGapSvg].map((input, index) => ({
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
      productIdentity: candidate.identity,
      totalPrice: outfit.totalPrice,
      twoPieceGarmentCoreVisualPass: true,
      completeCompositionVisualPass: false,
      missingSlots: ["shoe"],
      finalOutfitApproved: false,
      reserved: false,
      uiIntegrated: false,
    },
    null,
    2,
  ),
);
