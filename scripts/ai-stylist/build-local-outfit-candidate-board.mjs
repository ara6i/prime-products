#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const specArgument = process.argv[2];
if (!specArgument) {
  throw new Error("Usage: node build-local-outfit-candidate-board.mjs <candidate-spec.json>");
}
const specPath = path.isAbsolute(specArgument)
  ? specArgument
  : path.join(repoRoot, specArgument);
const spec = JSON.parse(await readFile(specPath, "utf8"));

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(reportRoot, relativePath), "utf8"));
const visualDecisions = await readJson("visual-identity-decisions.json");
const manualAlpha = await readJson(
  "cj-manual-gemini-final-alpha/alpha-approval-manifest.json",
);
const manualCandidates = await readJson("cj-manual-approved-candidates.json");
const globalReservations = await readJson("global-product-reservation-ledger.json");
const planningReservations = await readJson(
  "planning-reservation-gallery/planning-products.json",
);
const provisionalGallery = await readJson("provisional-scenario-core-gallery/gallery.json");
const coverage = await readJson("mens-128-scenario-coverage/coverage.json");

const normalize = (value) => String(value ?? "").toLowerCase();
const candidateByProductId = new Map(
  manualCandidates.products.map((candidate) => [normalize(candidate.productId), candidate]),
);
const accepted = new Map();
for (const entry of visualDecisions.entries) {
  if (entry.status !== "accept" || !entry.selectedVariant) continue;
  const variant = entry.selectedVariant;
  accepted.set(normalize(entry.identity), {
    identity: normalize(entry.identity),
    source: entry.sourceCollection,
    title: variant.title,
    garmentType: variant.garmentType ?? variant.productKind ?? "product",
    color: variant.color ?? "unspecified",
    price: Number(variant.price),
    currency: variant.currency ?? "USD",
    image: variant.image,
  });
}
for (const alpha of manualAlpha.entries) {
  const candidate = candidateByProductId.get(normalize(alpha.productId));
  if (
    alpha.alphaVisualDecision !== "approved" ||
    !String(candidate?.status ?? "").startsWith("approved-for")
  ) {
    continue;
  }
  const identity = `cj:${normalize(alpha.productId)}`;
  accepted.set(identity, {
    identity,
    source: "manual-cj-gemini-final-alpha",
    title: candidate.title,
    garmentType: candidate.garmentType ?? candidate.productKind ?? "product",
    color: candidate.color ?? alpha.color ?? "unspecified",
    price: Number(candidate.price),
    currency: candidate.currency ?? "USD",
    image: alpha.finalPath,
  });
}

const scenario = coverage.scenarios.find((entry) => entry.scenarioId === spec.scenarioId);
if (!scenario) throw new Error(`Unknown scenario: ${spec.scenarioId}`);
for (const [field, expected] of [
  ["occasion", scenario.occasionLabel],
  ["season", scenario.seasonLabel],
  ["budget", scenario.budgetLabel],
]) {
  if (spec[field] !== expected) {
    throw new Error(`${field} mismatch for ${spec.scenarioId}: ${spec[field]} != ${expected}`);
  }
}
if (!Array.isArray(spec.items) || spec.items.length !== 6) {
  throw new Error("A complete candidate must contain exactly six product identities");
}
const requiredSlots = ["top", "bottom", "outerwear", "shoe", "bag", "accessory"];
const slots = spec.items.map((item) => item.slot);
for (const slot of requiredSlots) {
  if (slots.filter((value) => value === slot).length !== 1) {
    throw new Error(`Expected exactly one ${slot} item`);
  }
}
const identities = spec.items.map((item) => normalize(item.identity));
if (new Set(identities).size !== identities.length) {
  throw new Error("Candidate contains a repeated supplier-product identity");
}

const globalUse = new Map(
  globalReservations.reservations.map((item) => [normalize(item.productKey), item]),
);
const planningUse = new Map(
  planningReservations.products.map((item) => [normalize(item.productKey), item]),
);
const provisionalUse = new Map();
for (const scenarioEntry of provisionalGallery.scenarios) {
  for (const item of scenarioEntry.items) {
    provisionalUse.set(normalize(item.identity), { ...item, scenarioId: scenarioEntry.scenarioId });
  }
}

const products = spec.items.map((item) => {
  const identity = normalize(item.identity);
  const product = accepted.get(identity);
  if (!product) throw new Error(`Identity is not currently accepted: ${identity}`);
  const globalCollision = globalUse.get(identity);
  const sameScenarioSameOutfitReservation =
    globalCollision?.scenarioId === spec.scenarioId &&
    globalCollision?.outfitId === spec.outfitId &&
    [
      "reserved-not-outfit-approved",
      "complete-outfit-visual-approved",
      "ui-complete-outfit-visual-approved",
    ].includes(globalCollision?.reservationStatus);
  if (globalCollision && !sameScenarioSameOutfitReservation) {
    throw new Error(
      `${identity} is already approved in ${globalCollision.scenarioId}/${globalCollision.outfitId}`,
    );
  }
  const planningCollision = planningUse.get(identity);
  if (planningCollision && planningCollision.scenarioId !== spec.scenarioId) {
    throw new Error(`${identity} is planning-reserved to ${planningCollision.scenarioId}`);
  }
  const provisionalCollision = provisionalUse.get(identity);
  if (provisionalCollision && provisionalCollision.scenarioId !== spec.scenarioId) {
    throw new Error(`${identity} is provisionally held by ${provisionalCollision.scenarioId}`);
  }
  return {
    ...product,
    styleRagId: identity,
    productId: identity.replace(/^cj:/i, ""),
    slot: item.slot,
    role: item.role ?? item.slot.toUpperCase(),
    note: item.note ?? "Accepted locally · unused outside this scenario",
    priorReservation:
      sameScenarioSameOutfitReservation
        ? `same-scenario-same-outfit-${globalCollision.reservationStatus}`
        : planningCollision?.scenarioId === spec.scenarioId
        ? "same-scenario-planning-reservation"
        : provisionalCollision?.scenarioId === spec.scenarioId
          ? "same-scenario-provisional-hold"
          : null,
  };
});

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

const cardWidth = 330;
const cardHeight = 610;
const gap = 15;
const margin = 26;
const headerHeight = 150;
const footerHeight = 130;
const width = margin * 2 + products.length * cardWidth + (products.length - 1) * gap;
const height = headerHeight + cardHeight + footerHeight + margin * 2;
const cards = [];
for (const product of products) {
  const image = await sharp(await imageBuffer(product.image), { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 26, height: 360, fit: "contain", background: "#f7f4ed" })
    .flatten({ background: "#f7f4ed" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const card = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="17" fill="#fff"/><text x="16" y="29" font-family="Arial" font-size="11" font-weight="700" fill="#45634f">${escapeXml(product.role)}</text><text x="16" y="436" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(truncate(product.title, 39))}</text><text x="16" y="463" font-family="Arial" font-size="12" fill="#666">${escapeXml(product.color)} · $${product.price.toFixed(2)}</text><text x="16" y="506" font-family="Arial" font-size="10" fill="#555">${escapeXml(truncate(product.note, 51))}</text><text x="16" y="562" font-family="Arial" font-size="8" fill="#999">${escapeXml(truncate(product.identity, 55))}</text></svg>`,
  );
  cards.push(
    await sharp(card)
      .composite([{ input: image, left: 13, top: 48 }])
      .jpeg({ quality: 95 })
      .toBuffer(),
  );
}

const subtotal = products.reduce((sum, product) => sum + product.price, 0);
const isApproved = spec.decision === "approve-ui-complete-six-piece-outfit";
const isRejected = spec.decision === "reject-complete-six-piece-outfit";
if (isApproved && (!spec.decisionReason || !spec.visuallyReviewedAt)) {
  throw new Error("An approved candidate requires decisionReason and visuallyReviewedAt");
}
if (isRejected && (!spec.decisionReason || !spec.visuallyReviewedAt)) {
  throw new Error("A rejected candidate requires decisionReason and visuallyReviewedAt");
}
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="44" font-family="Arial" font-size="29" font-weight="700" fill="#111">${escapeXml(spec.scenarioId)} · ${escapeXml(spec.season)} ${escapeXml(spec.occasion)} · ${isApproved ? "approved six-piece look" : isRejected ? "rejected six-piece composition" : "six-piece visual candidate"}</text><text x="${margin}" y="78" font-family="Arial" font-size="16" fill="#555">${escapeXml(spec.palette)}</text><text x="${margin}" y="108" font-family="Arial" font-size="13" fill="#8a3d1d">Merchandise subtotal $${subtotal.toFixed(2)} before shipping · six globally unique accepted identities</text><text x="${margin}" y="${headerHeight + cardHeight + 44}" font-family="Arial" font-size="17" font-weight="700" fill="${isApproved ? "#3d715b" : isRejected ? "#9a3f2f" : "#111"}">${isApproved ? "UI-COMPLETE SIX-PIECE LOOK · VISUAL APPROVED" : isRejected ? "COMPLETE COMPOSITION · VISUAL REJECTED" : "AWAITING COMPLETE-BOARD VISUAL DECISION"}</text><text x="${margin}" y="${headerHeight + cardHeight + 76}" font-family="Arial" font-size="13" fill="#555">${escapeXml(spec.stylingIntent)}</text><text x="${margin}" y="${headerHeight + cardHeight + 108}" font-family="Arial" font-size="12" fill="#8a3d1d">${isApproved ? "LOCAL ONLY · WEDDING EXCLUDED · NO GEMINI REQUEST · LOCALLY RESERVED · NOT UI INTEGRATED" : "LOCAL ONLY · WEDDING EXCLUDED · NO GEMINI REQUEST · NOT RESERVED OR UI INTEGRATED"}</text></svg>`,
);

const outputDir = path.join(reportRoot, spec.outputDir);
await mkdir(outputDir, { recursive: true });
const boardPath = path.join(outputDir, "six-piece-candidate.jpg");
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
  scenarioId: spec.scenarioId,
  outfitId: spec.outfitId,
  name: spec.name,
  occasion: spec.occasion,
  season: spec.season,
  budget: spec.budget,
  palette: spec.palette,
  stylingIntent: spec.stylingIntent,
  status: isApproved
    ? "ui-complete-six-piece-visual-approved"
    : isRejected
      ? "complete-board-visual-rejected"
      : "awaiting-complete-board-visual-decision",
  decision: spec.decision ?? null,
  decisionReason: spec.decisionReason ?? null,
  visuallyReviewedAt: spec.visuallyReviewedAt ?? null,
  products,
  items: products,
  merchandiseSubtotalBeforeShipping: Number(subtotal.toFixed(2)),
  globalIdentityCount: new Set(identities).size,
  completeOutfitApproved: isApproved,
  uiIntegrated: false,
  boardPath,
};
await writeFile(
  path.join(outputDir, "six-piece-candidate.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(result, null, 2));
