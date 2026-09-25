#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "spring-casual-budget-core-s133-02");
const comparison = JSON.parse(
  await readFile(path.join(outputDir, "core-comparison.json"), "utf8"),
);
const reservations = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const decisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const provisionalLedger = JSON.parse(
  await readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8"),
);
const outerwear = reservations.reservations.find(
  (entry) => entry.scenarioId === "S133" && entry.slot === "outerwear",
);
if (!outerwear) throw new Error("Missing the controlling S133 outerwear reservation");

const top = comparison.candidates.find((entry) => entry.key === "T1");
const bottom = comparison.candidates.find((entry) => entry.key === "B1");
if (!top || !bottom) throw new Error("Missing the visually screened S133 top or bottom");

const bagIdentity = "shopify_supplier:25f0ae396193e56843b28f53ef22cb3376e9c01d";
const bag = decisions.entries.find(
  (entry) => String(entry.identity).toLowerCase() === bagIdentity,
);
if (bag?.status !== "accept" || bag.selectedVariant?.slot !== "bag") {
  throw new Error("The brown crescent crossbody is not an accepted bag identity");
}
if (
  reservations.reservations.some(
    (entry) => String(entry.productKey).toLowerCase() === bagIdentity,
  )
) {
  throw new Error("The brown crescent crossbody is already reserved");
}
if (
  provisionalLedger.holds.some(
    (entry) =>
      String(entry.identity).toLowerCase() === bagIdentity && entry.scenarioId !== "S133",
  )
) {
  throw new Error("The brown crescent crossbody is held by another scenario");
}

const products = [
  {
    role: "TOP · PROVISIONAL HOLD",
    title: "Cream Chevron Knit Shirt",
    color: top.color,
    price: top.price,
    identity: top.identity,
    image: path.join(outputDir, "t1-original.jpg"),
  },
  {
    role: "BOTTOM · PROVISIONAL HOLD",
    title: "French-Blue Clean Straight Trouser",
    color: bottom.color,
    price: bottom.price,
    identity: bottom.identity,
    image: path.join(outputDir, "b1-original.jpg"),
  },
  {
    role: "OUTERWEAR · EXISTING RESERVATION",
    title: "Washed Light-Blue Short Bomber",
    color: outerwear.color,
    price: outerwear.price,
    identity: outerwear.productKey,
    image: outerwear.image,
  },
  {
    role: "BAG · PROVISIONAL HOLD",
    title: "Brown Crescent Crossbody",
    color: "warm brown",
    price: bag.selectedVariant.price,
    identity: bag.identity,
    image: bag.selectedVariant.image,
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const cardWidth = 410;
const cardHeight = 630;
const gap = 22;
const margin = 28;
const headerHeight = 150;
const footerHeight = 170;
const width = margin * 2 + products.length * cardWidth + (products.length - 1) * gap;
const height = headerHeight + cardHeight + footerHeight + margin * 2;

const cards = [];
async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}
for (const product of products) {
  const image = await sharp(await imageBuffer(product.image), { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 28, height: 390, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const card = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><text x="18" y="30" font-family="Arial" font-size="12" font-weight="700" fill="#45634f">${escapeXml(product.role)}</text><text x="18" y="466" font-family="Arial" font-size="18" font-weight="700" fill="#111">${escapeXml(product.title)}</text><text x="18" y="496" font-family="Arial" font-size="14" fill="#666">${escapeXml(product.color)} · $${Number(product.price).toFixed(2)}</text><text x="18" y="536" font-family="Arial" font-size="12" fill="#555">Visual: controlled regular proportion · Spring-correct</text><text x="18" y="576" font-family="Arial" font-size="10" fill="#999">${escapeXml(String(product.identity).slice(0, 58))}</text></svg>`,
  );
  cards.push(
    await sharp(card)
      .composite([{ input: image, left: 14, top: 42 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const subtotal = products.reduce((sum, product) => sum + Number(product.price), 0);
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="45" font-family="Arial" font-size="30" font-weight="700" fill="#111">S133 · Spring Casual Everyday · visually screened direction</text><text x="${margin}" y="78" font-family="Arial" font-size="16" fill="#555">Cream texture · French blue · washed light blue · warm brown accent · light modern palette</text><text x="${margin}" y="108" font-family="Arial" font-size="13" fill="#8a3d1d">Current subtotal $${subtotal.toFixed(2)} · Budget-Friendly band remains feasible · no product reuse</text><text x="${margin}" y="${headerHeight + cardHeight + 44}" font-family="Arial" font-size="17" font-weight="700" fill="#111">Still required before outfit approval</text><text x="${margin}" y="${headerHeight + cardHeight + 76}" font-family="Arial" font-size="14" fill="#555">SHOE · unique cream low-profile leather sneaker with restrained gum sole</text><text x="${margin}" y="${headerHeight + cardHeight + 106}" font-family="Arial" font-size="14" fill="#555">ACCESSORY · unique warm-tortoiseshell sunglasses or restrained tobacco belt</text><text x="${margin}" y="${headerHeight + cardHeight + 145}" font-family="Arial" font-size="12" fill="#8a3d1d">PROVISIONAL DIRECTION ONLY · NOT A COMPLETE OUTFIT · NOT UI INTEGRATED</text></svg>`,
);

await mkdir(outputDir, { recursive: true });
const boardPath = path.join(outputDir, "three-piece-direction.jpg");
await sharp(base)
  .composite(
    cards.map((input, index) => ({
      input,
      left: margin + index * (cardWidth + gap),
      top: headerHeight,
    })),
  )
  .jpeg({ quality: 95 })
  .toFile(boardPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioId: "S133",
  occasion: "Casual Everyday",
  season: "Spring",
  budget: "Budget-Friendly",
  status: "visual-four-piece-core-pass-awaiting-shoe-and-accessory",
  decision: "visual-garment-direction-pass-incomplete",
  products,
  currentGarmentSubtotal: Number(subtotal.toFixed(2)),
  visualFrontRunnerBagIdentity: bagIdentity,
  candidates: [
    {
      identity: bagIdentity,
      name: "Brown Crescent Crossbody",
      garmentType: "compact crescent crossbody bag",
      color: "warm brown",
      decision: "visual-front-runner-for-s133",
      decisionReason:
        "The full worn source proves a compact crossbody scale and soft crescent structure; warm brown adds the needed grounded accent to the cream and two-blue Spring core without making it dark.",
    },
  ],
  missingSlots: ["shoe", "accessory"],
  requiredShoeSearchPhrase: "men cream leather sneakers gum sole low profile",
  completeOutfitApproved: false,
  uiIntegrated: false,
  boardPath,
};
await writeFile(
  path.join(outputDir, "three-piece-direction.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

console.log(JSON.stringify(result, null, 2));
