#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "spring-office-budget-pilot-s149-v2");
const boardPath = path.join(outputDir, "watch-direction.jpg");
const specPath = path.join(outputDir, "watch-direction.json");
const watchIdentity = "shopify_supplier:99d198e1c97527c2d831b685dcf31464db5d7054";
const bottomIdentity = "shopify_supplier:b4417a8d32930a1455257578c5ba2547279f0c7b";

const [decisions, reservationLedger, provisionalLedger] = await Promise.all([
  readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8").then(JSON.parse),
]);
const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const watch = acceptedByIdentity.get(watchIdentity);
const bottom = acceptedByIdentity.get(bottomIdentity);
if (watch?.selectedVariant?.slot !== "watch") {
  throw new Error("The silver mesh watch is not an accepted watch identity");
}
if (bottom?.selectedVariant?.slot !== "bottom") {
  throw new Error("The S149 medium-gray trouser is not an accepted bottom identity");
}
if (
  reservationLedger.reservations.some(
    (entry) => String(entry.productKey).toLowerCase() === watchIdentity,
  )
) {
  throw new Error("The silver mesh watch is already reserved");
}
if (
  provisionalLedger.holds.some(
    (entry) =>
      String(entry.identity).toLowerCase() === watchIdentity && entry.scenarioId !== "S149",
  )
) {
  throw new Error("The silver mesh watch is held by another scenario");
}
if (
  !provisionalLedger.holds.some(
    (entry) =>
      String(entry.identity).toLowerCase() === bottomIdentity && entry.scenarioId === "S149",
  )
) {
  throw new Error("The S149 medium-gray trouser is not the active provisional bottom hold");
}

async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

async function productImage(entry, width, height, minimumWidth, minimumHeight) {
  const source = await imageBuffer(entry.selectedVariant.image);
  const metadata = await sharp(source, { failOn: "none" }).metadata();
  if ((metadata.width ?? 0) < minimumWidth || (metadata.height ?? 0) < minimumHeight) {
    throw new Error(
      `${entry.identity} source is too small: ${metadata.width}x${metadata.height}`,
    );
  }
  return sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width, height, fit: "contain", background: "#f4f1eb" })
    .flatten({ background: "#f4f1eb" })
    .jpeg({ quality: 95 })
    .toBuffer();
}

await mkdir(outputDir, { recursive: true });
const [bottomImage, watchImage] = await Promise.all([
  productImage(bottom, 420, 500, 1000, 1400),
  productImage(watch, 360, 360, 420, 460),
]);

const width = 1320;
const height = 820;
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9e6df"/><text x="30" y="46" font-family="Arial" font-size="29" font-weight="700" fill="#111">S149 · Spring Work / Office · second-look accessory direction</text><text x="30" y="79" font-family="Arial" font-size="15" fill="#555">Medium-gray controlled trouser + silver mesh and deep-blue dial · planned dusty coral and oxblood</text><rect x="28" y="112" width="460" height="680" rx="18" fill="#fff"/><rect x="510" y="112" width="400" height="520" rx="18" fill="#fff"/><text x="48" y="142" font-family="Arial" font-size="13" font-weight="700" fill="#45634f">BOTTOM · EXISTING PROVISIONAL HOLD</text><text x="530" y="142" font-family="Arial" font-size="13" font-weight="700" fill="#45634f">WATCH · NEW PROVISIONAL HOLD</text><text x="48" y="680" font-family="Arial" font-size="18" font-weight="700" fill="#111">Medium-Gray Controlled Trouser</text><text x="48" y="708" font-family="Arial" font-size="13" fill="#666">gray · $${Number(bottom.selectedVariant.price).toFixed(2)} · full worn proof</text><text x="530" y="540" font-family="Arial" font-size="18" font-weight="700" fill="#111">Silver Mesh Minimal Watch</text><text x="530" y="568" font-family="Arial" font-size="13" fill="#666">silver and deep blue · $${Number(watch.selectedVariant.price).toFixed(2)}</text><text x="944" y="150" font-family="Arial" font-size="20" font-weight="700" fill="#111">Why it belongs here</text><text x="944" y="190" font-family="Arial" font-size="14" fill="#444">Thin unbranded case</text><text x="944" y="218" font-family="Arial" font-size="14" fill="#444">Restrained mesh bracelet</text><text x="944" y="246" font-family="Arial" font-size="14" fill="#444">Silver repeats the trouser&apos;s cool clarity</text><text x="944" y="274" font-family="Arial" font-size="14" fill="#444">Small blue dial complements dusty coral</text><text x="944" y="334" font-family="Arial" font-size="20" font-weight="700" fill="#111">Required completion colors</text><rect x="944" y="360" width="130" height="90" rx="12" fill="#cf8078"/><text x="1009" y="476" text-anchor="middle" font-family="Arial" font-size="13" fill="#333">dusty coral</text><rect x="1092" y="360" width="130" height="90" rx="12" fill="#7b2637"/><text x="1157" y="476" text-anchor="middle" font-family="Arial" font-size="13" fill="#333">oxblood</text><text x="944" y="536" font-family="Arial" font-size="15" fill="#555">TOP · fine-knit regular long-sleeve polo</text><text x="944" y="568" font-family="Arial" font-size="15" fill="#555">SHOE · unique oxblood leather round-toe derby</text><text x="944" y="628" font-family="Arial" font-size="12" fill="#8a3d1d">No navy clothing · the blue remains a small dial accent.</text><text x="944" y="663" font-family="Arial" font-size="11" fill="#8a3d1d">PROVISIONAL ONLY · NOT OUTFIT-APPROVED · NOT UI-INTEGRATED</text><text x="944" y="735" font-family="Arial" font-size="9" fill="#888">${watchIdentity}</text></svg>`,
);
await sharp(base)
  .composite([
    { input: bottomImage, left: 48, top: 156 },
    { input: watchImage, left: 530, top: 150 },
  ])
  .jpeg({ quality: 95 })
  .toFile(boardPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioId: "S149",
  occasion: "Work / Office",
  season: "Spring",
  budget: "Budget-Friendly",
  bank: "separates",
  plannedPosition: 2,
  status: "visual-watch-front-runner-awaiting-dusty-coral-top-and-oxblood-shoe",
  visualFrontRunnerWatchIdentity: watchIdentity,
  candidates: [
    {
      identity: watchIdentity,
      name: "Silver Mesh Minimal Watch",
      garmentType: "minimal thin-case mesh-bracelet watch",
      color: "silver and deep blue",
      image: watch.selectedVariant.image,
      price: watch.selectedVariant.price,
      currency: watch.selectedVariant.currency,
      decision: "visual-front-runner-for-s149-position-2",
      decisionReason:
        "The source clearly shows an unbranded thin silver case, restrained Milanese mesh bracelet and clean deep-blue dial. Silver supports the medium-gray trouser while the small blue face complements, rather than competes with, the planned dusty-coral top and oxblood shoe.",
    },
  ],
  companionBottomIdentity: bottomIdentity,
  currentTwoPieceSubtotal: Number(
    (Number(bottom.selectedVariant.price) + Number(watch.selectedVariant.price)).toFixed(2),
  ),
  missingSlots: ["top", "shoe"],
  requiredDirections: {
    top: "dusty-coral fine-knit long-sleeve polo, regular fit",
    shoe: "oxblood leather round-toe derby with slim sole",
  },
  productsReservedByThisDirection: 0,
  completeOutfitsApproved: 0,
  uiIntegrated: false,
  boardPath,
};
await writeFile(specPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ boardPath, specPath }, null, 2));
