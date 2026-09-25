#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "fall-date-s193-existing-outerwear-screen");

const [approved, decisions, reservations, holds, scarf] = await Promise.all([
  "approved-mens-outfit-gallery/approved-outfits.json",
  "visual-identity-decisions.json",
  "global-product-reservation-ledger.json",
  "provisional-front-runner-ledger.json",
  "cj-manual-round5/1757675312575422464/product.json",
].map(async (relativePath) =>
  JSON.parse(await readFile(path.join(reportRoot, relativePath), "utf8")),
));

const core = approved.looks.find(
  (look) => look.scenarioId === "S193" && look.position === 1,
);
if (!core) throw new Error("Missing approved S193 position-one core");

const candidateIdentities = [
  "shopify_supplier:bb7c019fb9c4bae84979c18a8607fb1faeb23bbb",
  "shopify_supplier:ee5f1157bc2bcfb11222797f6c3cdbeb367d530c",
  "shopify_supplier:6dc9a69a70a364cceecd8091ca99770dd30be06f",
  "shopify_supplier:881a65e9f9d80311bf1b074fec346f7eb5c53887",
  "shopify_supplier:cb3221d742c0aaad361cfbcd62a31272142a2274",
];
const visualDecisions = [
  {
    decision: "select-existing-approved-outerwear-source",
    reason:
      "The light-khaki snap-front overshirt is the only option that keeps the board light, modern and controlled. Its clean straight body visually bridges the mineral-teal polo and Wine Red scarf, while the tonal khaki pieces remain separated by teal, burgundy and taupe rather than becoming an all-beige outfit.",
  },
  {
    decision: "reject-for-s193",
    reason:
      "The rust body competes with the Wine Red scarf as a second saturated warm statement, while the black contrast collar makes the upper half darker and busier than the Date Night brief.",
  },
  {
    decision: "reject-for-s193",
    reason:
      "The deep army-green corduroy turns the mineral-teal top muddy and too dark; its utility styling also makes the burgundy scarf feel disconnected rather than intentional.",
  },
  {
    decision: "reject-for-s193",
    reason:
      "This broader taupe-khaki utility shacket collapses into the trouser and boot family. The outfit becomes too beige-brown and visually heavy instead of clean and color-balanced.",
  },
  {
    decision: "reject-for-s193",
    reason:
      "Washed blue is individually fresh, but beside mineral teal, stone khaki, taupe and Wine Red it creates an unfocused five-color story and lowers the polish from Date Night to generic casual denim.",
  },
];
const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [entry.identity, entry]),
);
const reserved = new Set(reservations.reservations.map((entry) => entry.productKey));
const provisionallyHeld = new Set(holds.holds.map((entry) => entry.identity));

const candidates = candidateIdentities.map((identity) => {
  const entry = acceptedByIdentity.get(identity);
  if (!entry) throw new Error(`Missing accepted outerwear identity ${identity}`);
  if (reserved.has(identity)) throw new Error(`Already reserved: ${identity}`);
  if (provisionallyHeld.has(identity)) throw new Error(`Already held: ${identity}`);
  return {
    identity,
    ...entry.selectedVariant,
    constraints: entry.constraints ?? [],
  };
});

const baseItems = core.items.map((item) => ({
  identity: item.styleRagId,
  slot: item.slot,
  title: item.title,
  garmentType: item.garmentType,
  color: item.color,
  image: item.image,
  state: "approved one-use S193 core",
}));
const scarfItem = {
  identity: scarf.identity,
  slot: "accessory trial",
  title: scarf.title,
  garmentType: scarf.garmentType,
  color: scarf.selectedColor,
  image: scarf.sourceAssets[0].localPath,
  state: "exact Wine Red source · refinement pending",
};

const looks = candidates.map((candidate, index) => ({
  candidateId: `S193-EXISTING-OUTERWEAR-${String(index + 1).padStart(2, "0")}`,
  outerwear: candidate,
  ...visualDecisions[index],
  items: [
    baseItems.find((item) => item.slot === "top"),
    baseItems.find((item) => item.slot === "bottom"),
    {
      identity: candidate.identity,
      slot: "outerwear trial",
      title: candidate.title,
      garmentType: candidate.garmentType,
      color: candidate.color,
      image: candidate.image,
      state: "accepted and unreserved · outfit screen only",
    },
    baseItems.find((item) => item.slot === "shoe"),
    scarfItem,
  ],
}));

for (const look of looks) {
  if (look.items.some((item) => !item)) throw new Error("Incomplete S193 comparison row");
  if (new Set(look.items.map((item) => item.identity)).size !== look.items.length) {
    throw new Error(`Identity reuse in ${look.candidateId}`);
  }
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const truncate = (value, length) => {
  const text = String(value ?? "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
};
async function imageBuffer(source) {
  if (!/^https?:\/\//i.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

const margin = 32;
const gap = 16;
const headerHeight = 142;
const rowLabelWidth = 250;
const cardWidth = 250;
const cardHeight = 410;
const imageHeight = 275;
const rowGap = 22;
const width = margin * 2 + rowLabelWidth + 5 * cardWidth + 5 * gap;
const height =
  headerHeight + looks.length * cardHeight + (looks.length - 1) * rowGap + margin;

const baseSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e8ece8"/><text x="${margin}" y="42" font-family="Arial" font-size="28" font-weight="700" fill="#171717">S193 · Fall Date Night · accepted outerwear comparison</text><text x="${margin}" y="78" font-family="Arial" font-size="16" fill="#53635c">Same approved teal, stone-khaki and taupe core plus Wine Red scarf · five accepted unreserved layers</text><text x="${margin}" y="110" font-family="Arial" font-size="13" fill="#8b1e3f">COMPARISON ONLY · ZERO REUSE · NO RESERVATION · NO GEMINI · NOT UI-INTEGRATED</text>${looks
    .map((look, index) => {
      const y = headerHeight + index * (cardHeight + rowGap);
      return `<rect x="${margin}" y="${y}" width="${width - margin * 2}" height="${cardHeight}" rx="20" fill="#fff"/><circle cx="${margin + 35}" cy="${y + 37}" r="22" fill="#171717"/><text x="${margin + 35}" y="${y + 44}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#fff">${String.fromCharCode(65 + index)}</text><text x="${margin + 70}" y="${y + 32}" font-family="Arial" font-size="18" font-weight="700" fill="#171717">${escapeXml(truncate(look.outerwear.title, 25))}</text><text x="${margin + 70}" y="${y + 60}" font-family="Arial" font-size="13" fill="#61794d">${escapeXml(look.outerwear.color)} · $${Number(look.outerwear.price).toFixed(2)}</text><text x="${margin + 18}" y="${y + 94}" font-family="Arial" font-size="11" fill="#777">${escapeXml(truncate(look.outerwear.garmentType, 30))}</text><text x="${margin + 18}" y="${y + 120}" font-family="Arial" font-size="9" fill="#999">${escapeXml(truncate(look.outerwear.identity, 34))}</text>`;
    })
    .join("")}</svg>`,
);

const composites = [];
for (const [rowIndex, look] of looks.entries()) {
  for (const [itemIndex, item] of look.items.entries()) {
    const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
      .rotate()
      .resize({
        width: cardWidth - 22,
        height: imageHeight,
        fit: "contain",
        background: "#f6f2ea",
      })
      .flatten({ background: "#f6f2ea" })
      .jpeg({ quality: 95 })
      .toBuffer();
    const card = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight - 24}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#f7f6f1"/><text x="12" y="${imageHeight + 30}" font-family="Arial" font-size="11" font-weight="700" fill="#306b68">${escapeXml(item.slot.toUpperCase())}</text><text x="12" y="${imageHeight + 56}" font-family="Arial" font-size="12" font-weight="700" fill="#171717">${escapeXml(truncate(item.title, 30))}</text><text x="12" y="${imageHeight + 80}" font-family="Arial" font-size="11" fill="#666">${escapeXml(truncate(item.color, 30))}</text><text x="12" y="${imageHeight + 103}" font-family="Arial" font-size="8" fill="#999">${escapeXml(truncate(item.identity, 38))}</text></svg>`,
    );
    const composedCard = await sharp(card)
      .composite([{ input: productImage, left: 11, top: 8 }])
      .jpeg({ quality: 95 })
      .toBuffer();
    composites.push({
      input: composedCard,
      left: margin + rowLabelWidth + gap + itemIndex * (cardWidth + gap),
      top: headerHeight + rowIndex * (cardHeight + rowGap) + 12,
    });
  }
}

await mkdir(outputDir, { recursive: true });
const boardPath = path.join(outputDir, "comparison.jpg");
await sharp(baseSvg).composite(composites).jpeg({ quality: 96 }).toFile(boardPath);
const selectedBoardPath = path.join(outputDir, "selected-five-piece.jpg");
await sharp(boardPath)
  .extract({ left: 0, top: 0, width, height: headerHeight + cardHeight })
  .jpeg({ quality: 96 })
  .toFile(selectedBoardPath);

const record = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioId: "S193",
  occasion: "Date Night",
  season: "Fall",
  budget: "Budget-Friendly",
  status: "visual-screen-complete-existing-light-khaki-outerwear-selected-bag-still-open",
  visuallyReviewedAt: "2026-09-17",
  visualDecision: "select-existing-approved-outerwear-source-after-five-way-comparison",
  visualDecisionReason:
    "The light-khaki snap-front overshirt is the only accepted unreserved layer that preserves S193's light modern balance and clean silhouette. Rust clashes with Wine Red; army green makes teal muddy; the second khaki utility shacket turns the board brown-heavy; washed denim creates an unfocused five-color story.",
  completeOutfitApproved: false,
  outerwearSourceResolved: true,
  outerwearCatalogAccepted: true,
  outerwearReservedForS193: false,
  scarfCatalogAccepted: false,
  missingRoles: ["modern compact muted espresso or taupe bag"],
  selectedOuterwearIdentity: candidateIdentities[0],
  zeroIdentityReuse: true,
  candidates: looks,
  boardPath,
  selectedBoardPath,
};
await writeFile(
  path.join(outputDir, "comparison.json"),
  `${JSON.stringify(record, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({ boardPath, candidates: looks.length }, null, 2));
