#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const reservations = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-gemini-final-alpha/scenario-reservations.json"),
    "utf8",
  ),
);
const finalAlphaReport = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-gemini-final-alpha/final-alpha-report.json"),
    "utf8",
  ),
);
const currentDecisions = JSON.parse(
  await readFile(
    path.join(repoRoot, "scripts/ai-stylist/planning-reservation-three-stage-decisions.json"),
    "utf8",
  ),
);
const outputDir = path.join(reportRoot, "planning-reservation-three-stage-audit");
const outputJsonPath = path.join(outputDir, "audit.json");

const planning = reservations.reservations.filter(
  (entry) => entry.reservationStatus === "reserved-not-outfit-approved",
);
if (planning.length !== 16) {
  throw new Error(`Expected 16 planning reservations after two style revocations, found ${planning.length}`);
}
const alphaByProductId = new Map(
  finalAlphaReport.entries.map((entry) => [String(entry.productId), entry]),
);
const decisionByProductId = new Map(
  currentDecisions.decisions.map((entry) => [String(entry.productId), entry]),
);
const entries = planning.map((reservation) => {
  const alpha = alphaByProductId.get(String(reservation.productId));
  const currentDecision = decisionByProductId.get(String(reservation.productId));
  if (!alpha) throw new Error(`Missing final-alpha report entry ${reservation.productId}`);
  if (!currentDecision) throw new Error(`Missing current decision ${reservation.productId}`);
  if (currentDecision.scenarioId !== reservation.scenarioId) {
    throw new Error(`Scenario mismatch for current decision ${reservation.productId}`);
  }
  if (alpha.alphaVisualDecision !== "approved") {
    throw new Error(`Planning reservation lacks approved alpha ${reservation.productId}`);
  }
  return {
    productId: String(reservation.productId),
    identity: `cj:${String(reservation.productId).toLowerCase()}`,
    scenarioId: reservation.scenarioId,
    occasion: reservation.occasion,
    season: reservation.season,
    budget: reservation.budget,
    slot: reservation.slot,
    garmentType: reservation.garmentType,
    color: reservation.color,
    sourcePath: path.resolve(repoRoot, alpha.sourcePath),
    refinedPath: path.resolve(repoRoot, alpha.rawPath),
    finalAlphaPath: path.resolve(repoRoot, alpha.finalPath),
    refinementStage: alpha.rawStage,
    recordedAlphaDecision: alpha.alphaVisualDecision,
    currentAuditDecision: currentDecision.decision,
    currentAuditReason: currentDecision.reason,
  };
});

const identities = entries.map((entry) => entry.identity);
if (new Set(identities).size !== identities.length) {
  throw new Error("Planning three-stage audit contains a repeated identity");
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, maximum) {
  const text = String(value ?? "");
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

const imageWidth = 268;
const imageHeight = 300;
const cardWidth = 930;
const cardHeight = 470;
const columnGap = 22;
const rowGap = 22;
const margin = 26;
const headerHeight = 120;
const columns = 2;
const rows = 2;
const itemsPerPage = columns * rows;
const pageCount = Math.ceil(entries.length / itemsPerPage);
const pageWidth = margin * 2 + columns * cardWidth + columnGap;
const pageHeight = headerHeight + margin + rows * cardHeight + rowGap + margin;

async function renderImage(source, label) {
  const image = await sharp(await readFile(source), { failOn: "none" })
    .rotate()
    .resize({
      width: imageWidth - 16,
      height: imageHeight - 42,
      fit: "contain",
      background: "#f5f2ea",
    })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const frame = Buffer.from(
    `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="11" fill="#f5f2ea"/><text x="12" y="282" font-family="Arial" font-size="11" font-weight="700" fill="#555">${escapeXml(label)}</text></svg>`,
  );
  return sharp(frame)
    .composite([{ input: image, left: 8, top: 8 }])
    .jpeg({ quality: 94 })
    .toBuffer();
}

async function renderCard(entry, index) {
  const stages = await Promise.all([
    renderImage(entry.sourcePath, "SOURCE PRODUCT DETAIL"),
    renderImage(entry.refinedPath, "GEMINI REFINED"),
    renderImage(entry.finalAlphaPath, "FINAL ALPHA"),
  ]);
  const base = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="17" fill="#fff"/><circle cx="31" cy="31" r="19" fill="#111"/><text x="31" y="37" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${index + 1}</text><text x="62" y="28" font-family="Arial" font-size="18" font-weight="700" fill="#111">${escapeXml(`${entry.scenarioId} · ${entry.occasion}`)}</text><text x="62" y="52" font-family="Arial" font-size="12" fill="#666">${escapeXml(`${entry.season} · ${entry.budget} · ${entry.slot}`)}</text><text x="28" y="402" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(truncate(entry.garmentType, 70))}</text><text x="28" y="427" font-family="Arial" font-size="12" fill="#555">${escapeXml(`${entry.color} · ${entry.identity}`)}</text><text x="28" y="453" font-family="Arial" font-size="11" font-weight="700" fill="#355746">CURRENT AUDIT · ${escapeXml(entry.currentAuditDecision.toUpperCase().replaceAll("-", " "))} · PLANNING ONLY</text></svg>`,
  );
  return sharp(base)
    .composite(
      stages.map((input, stageIndex) => ({
        input,
        left: 28 + stageIndex * (imageWidth + 18),
        top: 78,
      })),
    )
    .jpeg({ quality: 94 })
    .toBuffer();
}

await mkdir(outputDir, { recursive: true });
const pagePaths = [];
for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
  const start = pageIndex * itemsPerPage;
  const slice = entries.slice(start, start + itemsPerPage);
  const cards = await Promise.all(
    slice.map((entry, index) => renderCard(entry, start + index)),
  );
  const base = Buffer.from(
    `<svg width="${pageWidth}" height="${pageHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="44" font-family="Arial" font-size="29" font-weight="700" fill="#111">Planning reservations · source → refinement → alpha · page ${pageIndex + 1}/${pageCount}</text><text x="${margin}" y="76" font-family="Arial" font-size="14" fill="#555">One-by-one product-detail preservation audit complete · no outfit approval · no new Gemini request</text><text x="${margin}" y="101" font-family="Arial" font-size="12" fill="#8a3d1d">Local only · Wedding and Wedding Guest excluded · every identity remains globally single-use</text></svg>`,
  );
  const pagePath = path.join(outputDir, `page-${String(pageIndex + 1).padStart(2, "0")}.jpg`);
  await sharp(base)
    .composite(
      cards.map((input, index) => ({
        input,
        left: margin + (index % columns) * (cardWidth + columnGap),
        top: headerHeight + margin + Math.floor(index / columns) * (cardHeight + rowGap),
      })),
    )
    .jpeg({ quality: 94 })
    .toFile(pagePath);
  pagePaths.push(pagePath);
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  planningReservations: entries.length,
  uniqueProductIdentities: new Set(identities).size,
  pageCount: pagePaths.length,
  currentAuditStatus: "manual-three-stage-visual-review-complete",
  reviewRule: currentDecisions.reviewRule,
  decisionCounts: Object.fromEntries(
    [...new Set(entries.map((entry) => entry.currentAuditDecision))].map((decision) => [
      decision,
      entries.filter((entry) => entry.currentAuditDecision === decision).length,
    ]),
  ),
  newGeminiRequests: 0,
  completeOutfitsApproved: 0,
  uiIntegrated: false,
  weddingAndWeddingGuestExcluded: true,
  pagePaths,
  entries,
};
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      outputJsonPath,
      pagePaths,
      planningReservations: result.planningReservations,
      uniqueProductIdentities: result.uniqueProductIdentities,
      newGeminiRequests: result.newGeminiRequests,
    },
    null,
    2,
  ),
);
