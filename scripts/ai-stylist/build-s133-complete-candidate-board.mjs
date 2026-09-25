#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "spring-casual-budget-core-s133-02");
const currentDirection = JSON.parse(
  await readFile(path.join(outputDir, "three-piece-direction.json"), "utf8"),
);
const reservations = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-gemini-final-alpha/scenario-reservations.json"),
    "utf8",
  ),
);
const visualDecisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const completeDecisions = JSON.parse(
  await readFile(
    path.join(repoRoot, "scripts/ai-stylist/approved-core-ui-complete-decisions.json"),
    "utf8",
  ),
);
const shoeId = "736610CB-75F0-45C7-9225-A3F4860A9CA4";
const shoe = reservations.reservations.find((entry) => entry.productId === shoeId);
if (
  !shoe ||
  shoe.scenarioId !== "S133" ||
  shoe.reservationStatus !== "reserved-not-outfit-approved" ||
  !/reallocated from the revoked S137/i.test(shoe.plannedPairingBrief)
) {
  throw new Error("The light-sand shoe is not uniquely reallocated to S133 planning");
}
if (currentDirection.scenarioId !== "S133" || currentDirection.products.length !== 4) {
  throw new Error("Expected the visually screened four-piece S133 direction");
}

const beigeBeltIdentity = "cj:1444132140966088704";
const beigeBeltDecision = visualDecisions.entries.find(
  (entry) => String(entry.identity).toLowerCase() === beigeBeltIdentity,
);
if (beigeBeltDecision?.status !== "accept") {
  throw new Error("The beige woven belt is not accepted in the visual identity ledger");
}

const itemMetadata = new Map([
  [
    "shopify_supplier:c1d7e0ae691889e61edf338a9b90f0e8389415d6",
    { slot: "top", garmentType: "short-sleeve chevron knit shirt", source: "provisional-visual-hold" },
  ],
  [
    "shopify_supplier:398e675c18f7e47723df3a8eeae3d2ca50b522ff",
    { slot: "bottom", garmentType: "controlled-straight casual trouser", source: "provisional-visual-hold" },
  ],
  [
    "cj:2505230844101616100",
    { slot: "outerwear", garmentType: "minimal suede-look bomber jacket", source: "manual-cj-gemini-final-alpha" },
  ],
  [
    "shopify_supplier:25f0ae396193e56843b28f53ef22cb3376e9c01d",
    { slot: "bag", garmentType: "compact crescent crossbody bag", source: "provisional-visual-hold" },
  ],
]);
const directionProducts = currentDirection.products.map((product) => {
  const identity = String(product.identity).toLowerCase();
  const metadata = itemMetadata.get(identity);
  if (!metadata) throw new Error(`Missing S133 product metadata: ${identity}`);
  return {
    ...product,
    ...metadata,
    styleRagId: identity,
    productId: identity.replace(/^cj:/i, ""),
    currency: "USD",
  };
});

const products = [
  ...directionProducts.slice(0, 3),
  {
    role: "SHOE · EXISTING RESERVATION",
    title: "Light-Sand Tonal Low-Top Sneaker",
    color: shoe.color,
    price: shoe.supplierPrice,
    identity: `cj:${shoe.productId}`,
    styleRagId: `cj:${shoe.productId}`,
    productId: shoe.productId,
    slot: "shoe",
    garmentType: shoe.garmentType,
    currency: shoe.supplierCurrency,
    source: "manual-cj-gemini-final-alpha",
    image: shoe.finalImage,
    note: "Already refined and alpha-approved · uniquely reallocated to S133",
  },
  directionProducts[3],
  {
    role: "ACCESSORY · ACCEPTED EXISTING INVENTORY",
    title: "Beige Woven Belt",
    color: "beige",
    price: Number(beigeBeltDecision.selectedVariant.price),
    identity: beigeBeltIdentity,
    styleRagId: beigeBeltIdentity,
    productId: String(beigeBeltDecision.selectedVariant.productId),
    slot: "accessory",
    garmentType: "beige woven belt",
    currency: beigeBeltDecision.selectedVariant.currency,
    source: "cj-mens-extras",
    image: beigeBeltDecision.selectedVariant.image,
    note: "Accepted source image · unique light casual accent",
  },
];
const identities = products.map((product) => String(product.identity).toLowerCase());
if (new Set(identities).size !== identities.length) {
  throw new Error("The S133 candidate contains a repeated supplier identity");
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

const cardWidth = 320;
const cardHeight = 595;
const gap = 15;
const margin = 26;
const headerHeight = 148;
const footerHeight = 130;
const width = margin * 2 + products.length * cardWidth + (products.length - 1) * gap;
const height = headerHeight + cardHeight + footerHeight + margin * 2;
const cards = [];
for (const product of products) {
  const image = await sharp(await imageBuffer(product.image), { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 26, height: 350, fit: "contain", background: "#f7f4ed" })
    .flatten({ background: "#f7f4ed" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const note = product.note ?? "Unique identity · visually screened for S133";
  const card = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="17" fill="#fff"/><text x="16" y="29" font-family="Arial" font-size="10" font-weight="700" fill="#45634f">${escapeXml(product.role)}</text><text x="16" y="424" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(product.title)}</text><text x="16" y="451" font-family="Arial" font-size="12" fill="#666">${escapeXml(product.color)} · $${Number(product.price).toFixed(2)}</text><text x="16" y="493" font-family="Arial" font-size="10" fill="#555">${escapeXml(note.slice(0, 54))}</text><text x="16" y="548" font-family="Arial" font-size="8" fill="#999">${escapeXml(String(product.identity).slice(0, 52))}</text></svg>`,
  );
  cards.push(
    await sharp(card)
      .composite([{ input: image, left: 13, top: 47 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const merchandiseSubtotal = products.reduce((sum, product) => sum + Number(product.price), 0);
const outfitId = "S133-SEPARATES-V1-LOCAL-01";
const approval = completeDecisions.decisions.find(
  (entry) => entry.scenarioId === "S133" && entry.outfitId === outfitId,
);
const isApproved = approval?.decision === "approve-ui-complete-six-piece-outfit";
if (approval) {
  const approvedIdentities = new Set(
    (approval.productIdentities ?? []).map((identity) => String(identity).toLowerCase()),
  );
  if (
    approvedIdentities.size !== products.length ||
    identities.some((identity) => !approvedIdentities.has(identity))
  ) {
    throw new Error("S133 complete-outfit decision does not match the rendered identities");
  }
}
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="44" font-family="Arial" font-size="29" font-weight="700" fill="#111">S133 · Spring Casual Everyday · ${isApproved ? "approved six-piece look" : "six-piece visual candidate"}</text><text x="${margin}" y="77" font-family="Arial" font-size="16" fill="#555">Cream texture · French blue · washed light blue · light sand · warm brown and beige accents</text><text x="${margin}" y="107" font-family="Arial" font-size="13" fill="#8a3d1d">Merchandise subtotal $${merchandiseSubtotal.toFixed(2)} before shipping · six globally unique identities · no dark default</text><text x="${margin}" y="${headerHeight + cardHeight + 44}" font-family="Arial" font-size="17" font-weight="700" fill="${isApproved ? "#3d715b" : "#111"}">${isApproved ? "UI-COMPLETE SIX-PIECE LOOK · VISUAL APPROVED" : "AWAITING COMPLETE-BOARD VISUAL DECISION"}</text><text x="${margin}" y="${headerHeight + cardHeight + 76}" font-family="Arial" font-size="13" fill="#555">The light-sand shoe is uniquely reserved to S133. The beige belt is a different supplier identity from S149's black belt.</text><text x="${margin}" y="${headerHeight + cardHeight + 108}" font-family="Arial" font-size="12" fill="#8a3d1d">LOCAL ONLY · WEDDING EXCLUDED · NO NEW GEMINI REQUEST · NOT UI INTEGRATED</text></svg>`,
);

const boardPath = path.join(outputDir, "six-piece-complete-candidate.jpg");
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
  outfitId,
  name: "Cream, French Blue and Washed Sky",
  occasion: "Casual Everyday",
  season: "Spring",
  budget: "Budget-Friendly",
  status: isApproved
    ? "ui-complete-six-piece-visual-approved"
    : "awaiting-complete-board-visual-decision",
  decision: approval?.decision ?? null,
  items: products,
  products,
  merchandiseSubtotalBeforeShipping: Number(merchandiseSubtotal.toFixed(2)),
  globalIdentityCount: new Set(identities).size,
  shoeCurrentScenarioId: shoe.scenarioId,
  shoeCurrentReservationStatus: shoe.reservationStatus,
  shoeReallocated: true,
  beltRefinementAuthorized: false,
  completeOutfitApproved: isApproved,
  uiCompleteOutfitsAdded: isApproved ? 1 : 0,
  uiIntegrated: false,
  boardPath,
};
await writeFile(
  path.join(outputDir, "six-piece-complete-candidate.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(result, null, 2));
