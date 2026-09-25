#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputRoot = path.join(reportRoot, "spring-resort-budget-pilot-s249");
const sourceSpec = JSON.parse(
  await readFile(path.join(outputRoot, "core-comparison.json"), "utf8"),
);
const bottom = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-round3/2505011440591613300/product.json"),
    "utf8",
  ),
);
const top = sourceSpec.candidates.find(
  (entry) => entry.key === "T1" && entry.decision.startsWith("visual"),
);
if (!top) throw new Error("Missing S249 sunny-yellow visual front-runner");
if (bottom.identity === top.identity) throw new Error("S249 two-piece direction repeats an identity");

const items = [
  {
    slot: "top",
    title: "Sunny-Yellow Openwork Shirt",
    color: top.color,
    identity: top.identity,
    image: path.join(outputRoot, "t1-original.jpg"),
    priceUsd: top.price,
    priceBasis: "catalog price",
    state: "existing provisional visual hold",
  },
  {
    slot: "bottom",
    title: bottom.title,
    color: bottom.selectedColor,
    identity: bottom.identity,
    image: path.join(
      reportRoot,
      "cj-manual-round3/2505011440591613300",
      bottom.bestRefinementInput,
    ),
    priceUsd: bottom.commercialEvidence.landedTotalUsd,
    priceBasis: "CJ landed source cost",
    state: "source-selected only; refinement unauthorized",
  },
];
const twoPieceSubtotalUsd = Number(
  items.reduce((sum, item) => sum + Number(item.priceUsd), 0).toFixed(2),
);
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenario: {
    id: "S249",
    gender: "male",
    occasion: "Vacation / Resort",
    season: "Spring",
    budget: "Budget-Friendly",
  },
  status: "two-piece-source-direction-passed-awaiting-unique-shoe",
  visualDecision: "pass-two-piece-source-direction-only",
  visualDecisionReason:
    "The sunny-yellow openwork camp-collar shirt provides the cheerful focal color, while the warm Light Beige tailored Bermuda supplies a clean high waist, single pleat, side adjuster and controlled cuffed above-knee line. The balance is modern Resort and avoids a skinny top, baggy or elastic-waist bottom, cargo bulk and a dark-heavy palette. The outfit is not complete until a unique low-profile cream suede rope-sole shoe passes exact-page and full-board review.",
  twoPieceSubtotalUsd,
  pricingCaveat:
    "The top uses its current catalog price while the new bottom uses its rendered CJ landed source cost, so this subtotal is directional rather than a final retail outfit price.",
  items,
  openRole: {
    category: "shoe",
    queueId: "CJQ-004",
    targetProduct: "unique cream suede rope-sole espadrille",
  },
  gates: {
    topOriginalVisuallyReviewed: true,
    bottomAllGalleryStatesVisuallyReviewed: true,
    pairBoardVisuallyReviewed: true,
    repeatedProductIdentities: 0,
    refinementAuthorized: false,
    refinementComplete: false,
    backgroundRemovalComplete: false,
    completeOutfitApproved: false,
    reserved: false,
    uiIntegrated: false,
  },
};

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const cardWidth = 360;
const cardHeight = 545;
const width = 1240;
const height = 780;
const cards = await Promise.all(
  items.map(async (item) => {
    const image = await sharp(await readFile(item.image), { failOn: "none" })
      .rotate()
      .resize({
        width: cardWidth - 24,
        height: 390,
        fit: "contain",
        background: "#f7f2e8",
      })
      .flatten({ background: "#f7f2e8" })
      .jpeg({ quality: 94 })
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#f7f2e8"/><text x="14" y="430" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="14" y="460" font-family="Arial" font-size="14" fill="#222">${escapeXml(item.title.slice(0, 42))}</text><text x="14" y="487" font-family="Arial" font-size="13" fill="#756247">${escapeXml(item.color)}</text><text x="14" y="515" font-family="Arial" font-size="10" fill="#777">$${Number(item.priceUsd).toFixed(2)} ${escapeXml(item.priceBasis)}</text><text x="14" y="536" font-family="Arial" font-size="9" fill="#997044">${escapeXml(item.state.slice(0, 55))}</text></svg>`,
    );
    return sharp(label)
      .composite([{ input: image, left: 12, top: 20 }])
      .jpeg({ quality: 94 })
      .toBuffer();
  }),
);
const shoeGap = Buffer.from(
  `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#f7f2e8" stroke="#b78642" stroke-width="3" stroke-dasharray="12 9"/><text x="${cardWidth / 2}" y="92" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#946329">UNIQUE SHOE OPEN</text><text x="${cardWidth / 2}" y="190" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">cream suede espadrille</text><text x="${cardWidth / 2}" y="221" text-anchor="middle" font-family="Arial" font-size="15" fill="#555">low rope sole · quiet round toe</text><text x="${cardWidth / 2}" y="330" text-anchor="middle" font-family="Arial" font-size="13" fill="#777">No black formal shoe</text><text x="${cardWidth / 2}" y="358" text-anchor="middle" font-family="Arial" font-size="13" fill="#777">No chunky platform</text><text x="${cardWidth / 2}" y="386" text-anchor="middle" font-family="Arial" font-size="13" fill="#777">No repeated S137 identity</text><text x="${cardWidth / 2}" y="488" text-anchor="middle" font-family="Arial" font-size="12" fill="#946329">CJQ-004 remains open</text></svg>`,
);
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eee9dc"/><text x="40" y="48" font-family="Arial" font-size="28" font-weight="700" fill="#111">S249 · Men’s Spring Vacation / Resort · Budget-Friendly</text><text x="40" y="84" font-family="Arial" font-size="20" font-weight="700" fill="#d39c1f">Sunny Yellow and Warm Light Beige</text><text x="40" y="112" font-family="Arial" font-size="13" fill="#5f5a50">visually reviewed two-piece source direction · directional subtotal $${twoPieceSubtotalUsd.toFixed(2)} · local only</text><text x="40" y="715" font-family="Arial" font-size="15" font-weight="700" fill="#4d6c50">PAIRING PASSES · COMPLETE OUTFIT NOT APPROVED</text><text x="40" y="744" font-family="Arial" font-size="12" fill="#666">Happy upper color · tailored warm-neutral short · controlled modern proportions · one unique shoe still required</text><text x="40" y="766" font-family="Arial" font-size="10" fill="#946329">NO GEMINI · NO BACKGROUND REMOVAL · NOT RESERVED · NOT UI INTEGRATED · WEDDING EXCLUDED</text></svg>`,
);

await mkdir(outputRoot, { recursive: true });
const jsonPath = path.join(outputRoot, "two-piece-source-direction.json");
const boardPath = path.join(outputRoot, "two-piece-source-direction.jpg");
await writeFile(jsonPath, `${JSON.stringify({ ...result, boardPath }, null, 2)}\n`, "utf8");
await sharp(base)
  .composite(
    [...cards, shoeGap].map((input, index) => ({
      input,
      left: 40 + index * 400,
      top: 145,
    })),
  )
  .jpeg({ quality: 94 })
  .toFile(boardPath);

console.log(JSON.stringify({ jsonPath, boardPath, ...result.gates }, null, 2));
