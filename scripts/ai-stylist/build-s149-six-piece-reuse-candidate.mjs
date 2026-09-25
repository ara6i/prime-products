#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "spring-office-budget-s149-six-piece-reuse");

const [approvedCoreGallery, reuseAudit, uiCompleteDecisions] = await Promise.all([
  readFile(
    path.join(reportRoot, "approved-mens-outfit-gallery/approved-outfits.json"),
    "utf8",
  ).then(JSON.parse),
  readFile(path.join(reportRoot, "approved-core-add-on-reuse-audit/audit.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(
    path.join(repoRoot, "scripts/ai-stylist/approved-core-ui-complete-decisions.json"),
    "utf8",
  ).then(JSON.parse),
]);

const core = approvedCoreGallery.looks.find((look) => look.scenarioId === "S149");
if (!core || core.items.length !== 3) {
  throw new Error("Expected the retained S149 three-piece core");
}

const addOnPlan = [
  {
    slot: "outerwear",
    identity: "shopify_supplier:5ab0310ae9053fa971557c673b0ef3ddd136b573",
    role: "white unstructured blazer",
  },
  {
    slot: "bag",
    identity: "cj:1793456734774763520",
    role: "minimal black laptop briefcase",
  },
  {
    slot: "accessory",
    identity: "cj:1375007945837907968",
    role: "plain black leather belt",
  },
];

const addOns = addOnPlan.map((plan) => {
  const candidate = reuseAudit.candidates.find((entry) => entry.identity === plan.identity);
  if (!candidate) throw new Error(`Missing reuse candidate ${plan.identity}`);
  return {
    ...candidate,
    slot: plan.slot,
    garmentType: plan.role,
    styleRagId: candidate.identity,
  };
});

const items = [...core.items, ...addOns];
const identities = items.map((item) => String(item.styleRagId).toLowerCase());
if (identities.length !== 6 || new Set(identities).size !== 6) {
  throw new Error("S149 six-piece candidate does not contain six unique identities");
}

const totalPrice = items.reduce((sum, item) => sum + Number(item.price ?? 0), 0);
if (totalPrice > 500) {
  throw new Error(`S149 six-piece candidate exceeds Budget-Friendly ceiling: ${totalPrice}`);
}
const decision = uiCompleteDecisions.decisions.find(
  (entry) => entry.scenarioId === "S149" && entry.outfitId === core.outfitId,
);
if (decision?.decision !== "approve-ui-complete-six-piece-outfit") {
  throw new Error("S149 six-piece candidate lacks an explicit complete visual approval");
}
const expectedAddOns = new Set(addOns.map((entry) => entry.identity));
if (
  decision.addOnIdentities.length !== expectedAddOns.size ||
  decision.addOnIdentities.some((identity) => !expectedAddOns.has(identity))
) {
  throw new Error("S149 six-piece decision does not match the rendered add-on identities");
}

async function imageBuffer(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(source);
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const truncate = (value, max) => {
  const text = String(value ?? "");
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
};

const cardWidth = 265;
const cardHeight = 520;
const gap = 14;
const margin = 28;
const headerHeight = 125;
const footerHeight = 105;
const width = margin * 2 + items.length * cardWidth + (items.length - 1) * gap;
const height = headerHeight + cardHeight + footerHeight + margin * 2;

const cardBuffers = await Promise.all(
  items.map(async (item) => {
    const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
      .rotate()
      .resize({ width: cardWidth - 22, height: 340, fit: "contain", background: "#f7f5ef" })
      .flatten({ background: "#f7f5ef" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const price = Number(item.price ?? 0);
    const cardSvg = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" rx="16" fill="#fff" stroke="#d8d4ca"/>
        <text x="14" y="380" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(item.slot).toUpperCase())}</text>
        <text x="14" y="408" font-family="Arial" font-size="13" font-weight="700" fill="#222">${escapeXml(truncate(item.garmentType, 34))}</text>
        <text x="14" y="434" font-family="Arial" font-size="12" fill="#666">${escapeXml(item.color)} · USD ${price.toFixed(2)}</text>
        <text x="14" y="468" font-family="Arial" font-size="9" fill="#8b857c">${escapeXml(truncate(item.styleRagId, 47))}</text>
        <text x="14" y="496" font-family="Arial" font-size="10" font-weight="700" fill="#8d4a37">${["outerwear", "bag", "accessory"].includes(item.slot) ? "EXISTING REUSE CANDIDATE" : "RETAINED CORE PRODUCT"}</text>
      </svg>`,
    );
    return sharp(cardSvg)
      .composite([{ input: productImage, left: 11, top: 24 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const baseSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ebe9e3"/>
    <text x="${margin}" y="44" font-family="Arial" font-size="29" font-weight="700" fill="#111">S149 · Spring Work / Office · approved six-piece look</text>
    <text x="${margin}" y="76" font-family="Arial" font-size="17" font-weight="700" fill="#4d7390">Sky blue · khaki · white tailoring · black leather accents</text>
    <text x="${margin}" y="103" font-family="Arial" font-size="13" fill="#666">Budget-Friendly · USD ${totalPrice.toFixed(2)} · six unique supplier identities · existing accepted inventory only</text>
    <text x="${margin}" y="${headerHeight + cardHeight + 45}" font-family="Arial" font-size="15" font-weight="700" fill="#3d715b">UI-COMPLETE SIX-PIECE LOOK · VISUAL APPROVED</text>
    <text x="${margin}" y="${headerHeight + cardHeight + 72}" font-family="Arial" font-size="12" fill="#666">Local approval only · Wedding excluded · no CJ search, Gemini request or UI integration</text>
  </svg>`,
);

await mkdir(outputDir, { recursive: true });
const boardPath = path.join(outputDir, "six-piece-candidate.jpg");
await sharp(baseSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: margin + index * (cardWidth + gap),
      top: headerHeight + margin,
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(boardPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioId: "S149",
  occasion: "Work / Office",
  season: "Spring",
  budget: "Budget-Friendly",
  budgetBand: { min: 0, max: 500 },
  totalPrice,
  identityCount: identities.length,
  repeatedIdentities: identities.length - new Set(identities).size,
  decision: decision.decision,
  decisionReason: decision.reason,
  visuallyReviewedAt: decision.visuallyReviewedAt,
  uiCompleteOutfitsAdded: 1,
  uiIntegrated: false,
  weddingAndWeddingGuestExcluded: true,
  boardPath,
  items,
};
await writeFile(path.join(outputDir, "candidate.json"), `${JSON.stringify(result, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      boardPath,
      totalPrice,
      identityCount: result.identityCount,
      repeatedIdentities: result.repeatedIdentities,
      decision: result.decision,
      uiCompleteOutfitsAdded: result.uiCompleteOutfitsAdded,
      uiIntegrated: result.uiIntegrated,
    },
    null,
    2,
  ),
);
