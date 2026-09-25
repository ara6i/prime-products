#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "winter-office-budget-pilot-s161");
const boardPath = path.join(outputDir, "brown-trouser-direction.jpg");
const specPath = path.join(outputDir, "brown-trouser-direction.json");
const bottomIdentity = "shopify_supplier:5ee70df61299c873a76cd10ed93b206f97430c23";

const [decisions, reservationLedger, provisionalLedger] = await Promise.all([
  readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8").then(JSON.parse),
]);

const accepted = decisions.entries.find(
  (entry) => String(entry.identity).toLowerCase() === bottomIdentity,
);
if (accepted?.status !== "accept" || accepted.selectedVariant?.slot !== "bottom") {
  throw new Error("The S161 brown trouser is not an accepted bottom identity");
}
if (
  reservationLedger.reservations.some(
    (entry) => String(entry.productKey).toLowerCase() === bottomIdentity,
  )
) {
  throw new Error("The S161 brown trouser is already reserved");
}
if (
  provisionalLedger.holds.some(
    (entry) =>
      String(entry.identity).toLowerCase() === bottomIdentity && entry.scenarioId !== "S161",
  )
) {
  throw new Error("The S161 brown trouser is held by another scenario");
}

async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

await mkdir(outputDir, { recursive: true });
const source = await imageBuffer(accepted.selectedVariant.image);
const metadata = await sharp(source, { failOn: "none" }).metadata();
if ((metadata.width ?? 0) < 1000 || (metadata.height ?? 0) < 1400) {
  throw new Error(`S161 trouser source is too small: ${metadata.width}x${metadata.height}`);
}
await sharp(source, { failOn: "none" })
  .rotate()
  .flatten({ background: "#f3f0e9" })
  .jpeg({ quality: 96 })
  .toFile(path.join(outputDir, "bottom-original.jpg"));

const productImage = await sharp(source, { failOn: "none" })
  .rotate()
  .resize({ width: 500, height: 560, fit: "contain", background: "#f3f0e9" })
  .flatten({ background: "#f3f0e9" })
  .jpeg({ quality: 95 })
  .toBuffer();

const width = 1320;
const height = 850;
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9e6df"/><text x="32" y="48" font-family="Arial" font-size="30" font-weight="700" fill="#111">S161 · Winter Work / Office · controlled brown direction</text><text x="32" y="82" font-family="Arial" font-size="15" fill="#555">Existing full-resolution trouser · planned soft-blue, camel and burgundy companions · Budget-Friendly</text><rect x="28" y="118" width="550" height="710" rx="18" fill="#fff"/><text x="48" y="148" font-family="Arial" font-size="13" font-weight="700" fill="#45634f">BOTTOM · PROVISIONAL VISUAL HOLD</text><text x="48" y="765" font-family="Arial" font-size="19" font-weight="700" fill="#111">Deep-Brown Double-Pleat Trouser</text><text x="48" y="793" font-family="Arial" font-size="13" fill="#666">brown · $${Number(accepted.selectedVariant.price).toFixed(2)} · full 1350 × 1800 worn proof</text><text x="612" y="155" font-family="Arial" font-size="20" font-weight="700" fill="#111">Why this silhouette passes</text><text x="612" y="193" font-family="Arial" font-size="15" fill="#444">High clean rise · restrained double pleat · controlled thigh ease</text><text x="612" y="221" font-family="Arial" font-size="15" fill="#444">Pressed straight-to-tapered leg · full hem · no puddling</text><text x="612" y="249" font-family="Arial" font-size="15" fill="#444">Winter Office weight and finish · neither skinny nor baggy</text><text x="612" y="310" font-family="Arial" font-size="20" font-weight="700" fill="#111">Required light-and-color balance</text><rect x="612" y="340" width="128" height="94" rx="12" fill="#b7d3df"/><text x="676" y="458" text-anchor="middle" font-family="Arial" font-size="13" fill="#333">soft sky blue</text><rect x="760" y="340" width="128" height="94" rx="12" fill="#bd8d59"/><text x="824" y="458" text-anchor="middle" font-family="Arial" font-size="13" fill="#333">camel</text><rect x="908" y="340" width="128" height="94" rx="12" fill="#7d2636"/><text x="972" y="458" text-anchor="middle" font-family="Arial" font-size="13" fill="#333">burgundy</text><rect x="1056" y="340" width="128" height="94" rx="12" fill="#efe8da" stroke="#c8c0b4"/><text x="1120" y="458" text-anchor="middle" font-family="Arial" font-size="13" fill="#333">winter cream</text><text x="612" y="528" font-family="Arial" font-size="20" font-weight="700" fill="#111">Still required before outfit approval</text><text x="612" y="568" font-family="Arial" font-size="15" fill="#555">TOP · soft sky-blue fine-knit long-sleeve polo, regular fit</text><text x="612" y="600" font-family="Arial" font-size="15" fill="#555">OUTERWEAR · camel wool car coat, clean regular proportion</text><text x="612" y="632" font-family="Arial" font-size="15" fill="#555">SHOE · unique burgundy suede round-toe derby, slim rubber sole</text><text x="612" y="682" font-family="Arial" font-size="13" fill="#8a3d1d">Do not pair with the soft-gray S157 top: that combination was rejected as muddy.</text><text x="612" y="718" font-family="Arial" font-size="12" fill="#8a3d1d">PROVISIONAL DIRECTION ONLY · NOT SELECTED · NOT OUTFIT-APPROVED · NOT UI-INTEGRATED</text><text x="612" y="780" font-family="Arial" font-size="10" fill="#888">${escapeXml(bottomIdentity)}</text></svg>`,
);

await sharp(base)
  .composite([{ input: productImage, left: 53, top: 160 }])
  .jpeg({ quality: 95 })
  .toFile(boardPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioId: "S161",
  occasion: "Work / Office",
  season: "Winter",
  budget: "Budget-Friendly",
  status: "full-resolution-bottom-front-runner-awaiting-light-top-camel-coat-and-burgundy-shoe",
  directionBottomIdentity: bottomIdentity,
  candidates: [
    {
      identity: bottomIdentity,
      name: "Deep-Brown Double-Pleat Trouser",
      garmentType: "controlled straight-to-tapered double-pleat trouser",
      color: "deep brown",
      image: accepted.selectedVariant.image,
      price: accepted.selectedVariant.price,
      currency: accepted.selectedVariant.currency,
      decision: "visual-front-runner-for-s161",
      decisionReason:
        "The full worn source proves a clean high rise, restrained double pleat, controlled thigh ease, pressed straight-to-tapered leg and full hem without pooling. It is viable only with the lighter soft-blue, camel and winter-cream balance encoded here.",
    },
  ],
  missingSlots: ["top", "outerwear", "shoe"],
  requiredDirections: {
    top: "soft sky-blue fine-knit long-sleeve polo, regular fit",
    outerwear: "camel wool car coat, regular fit",
    shoe: "burgundy suede round-toe derby with slim rubber sole",
  },
  rejectedPairing: {
    scenarioId: "S157",
    reason:
      "The same trouser is too close in value to S157's soft-gray ribbed quarter-zip and would create a muddy gray-brown Office board.",
  },
  productsReservedByThisDirection: 0,
  completeOutfitsApproved: 0,
  uiIntegrated: false,
  boardPath,
};

await writeFile(specPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ boardPath, specPath, source: `${metadata.width}x${metadata.height}` }, null, 2));
