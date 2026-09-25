#!/usr/bin/env node

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "provisional-scenario-core-gallery");

const [provisionalLedger, reservationLedger, decisions, queue] = await Promise.all([
  readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "next-cj-exact-page-queue/queue.json"), "utf8").then(JSON.parse),
]);

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);

const scenarioMap = new Map();
function scenarioRecord(source) {
  const key = source.scenarioId;
  if (!scenarioMap.has(key)) {
    scenarioMap.set(key, {
      scenarioId: key,
      occasion: source.occasion,
      season: source.season,
      budget: source.budget,
      items: [],
      sourceSpecs: new Set(),
      sourceStatuses: new Set(),
      sourceMissingSlots: new Set(),
      deferredRoles: [],
      exactQueueRoles: [],
    });
  }
  return scenarioMap.get(key);
}

for (const hold of provisionalLedger.holds) {
  const accepted = acceptedByIdentity.get(String(hold.identity).toLowerCase());
  if (!accepted?.selectedVariant) {
    throw new Error(`Missing accepted variant for provisional hold ${hold.identity}`);
  }
  const record = scenarioRecord(hold);
  record.sourceSpecs.add(hold.sourceSpec);
  record.sourceStatuses.add(hold.sourceStatus);
  record.items.push({
    identity: hold.identity,
    slot: hold.slot,
    title: hold.name || accepted.selectedVariant.title,
    garmentType: hold.garmentType || accepted.selectedVariant.garmentType,
    color: hold.color || accepted.selectedVariant.color,
    image: accepted.selectedVariant.image,
    price: accepted.selectedVariant.price,
    currency: accepted.selectedVariant.currency,
    state: "provisional-visual-hold",
  });
}

for (const reservation of reservationLedger.reservations) {
  if (reservation.reservationStatus !== "reserved-not-outfit-approved") continue;
  const record = scenarioRecord(reservation);
  record.items.push({
    identity: reservation.productKey,
    slot: reservation.slot,
    title: reservation.title,
    garmentType: reservation.garmentType,
    color: reservation.color,
    image: reservation.image,
    price: reservation.price,
    currency: reservation.currency,
    state: "refined-planning-reservation",
  });
}

for (const record of scenarioMap.values()) {
  for (const sourceSpec of record.sourceSpecs) {
    const spec = JSON.parse(await readFile(path.join(reportRoot, sourceSpec), "utf8"));
    for (const slot of spec.missingSlots ?? []) record.sourceMissingSlots.add(slot);
    for (const role of spec.deferredPriceTierRoles ?? spec.deferredRoles ?? []) {
      record.deferredRoles.push(role);
    }
  }
  record.exactQueueRoles = queue.roles
    .filter((role) => role.scenarioId === record.scenarioId)
    .map((role) => ({
      queueId: role.queueId,
      category: role.category,
      targetProduct: role.targetProduct,
      searchPhrase: role.searchPhrase,
    }));
}

const slotOrder = new Map(
  ["top", "bottom", "outerwear", "suit", "shoe", "bag", "accessory", "watch"].map(
    (slot, index) => [slot, index],
  ),
);
const scenarios = [...scenarioMap.values()]
  .map((record) => {
    const presentSlots = new Set(record.items.map((item) => item.slot));
    const inferredQueueGaps = record.exactQueueRoles
      .map((role) => role.category)
      .filter((slot) => slot !== "suit" && !presentSlots.has(slot));
    const encodedOrInferredGaps = record.sourceMissingSlots.size
      ? [...record.sourceMissingSlots]
      : inferredQueueGaps;
    return {
      ...record,
      items: record.items.sort(
        (a, b) => (slotOrder.get(a.slot) ?? 99) - (slotOrder.get(b.slot) ?? 99),
      ),
      sourceSpecs: [...record.sourceSpecs].sort(),
      sourceStatuses: [...record.sourceStatuses].sort(),
      currentCoreGaps: [...new Set(encodedOrInferredGaps)]
        .filter((slot) => !presentSlots.has(slot))
        .sort((a, b) => (slotOrder.get(a) ?? 99) - (slotOrder.get(b) ?? 99)),
      sourceMissingSlots: undefined,
      state: "combined-core-awaiting-complete-outfit-components-and-final-visual-approval",
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    };
  })
  .sort((a, b) => Number(a.scenarioId.slice(1)) - Number(b.scenarioId.slice(1)));

const allIdentities = scenarios.flatMap((scenario) =>
  scenario.items.map((item) => String(item.identity).toLowerCase()),
);
const repeatedIdentities = [...new Set(allIdentities.filter((identity, index) => allIdentities.indexOf(identity) !== index))];
if (repeatedIdentities.length) {
  throw new Error(`Repeated identities in provisional core gallery: ${repeatedIdentities.join(", ")}`);
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fitText(value, limit) {
  const text = String(value ?? "");
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`;
}

async function imageBuffer(source) {
  if (!source) throw new Error("Missing scenario-core image source");
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(outputDir, { recursive: true });
for (const filename of await readdir(outputDir)) {
  if (/^page-\d+\.jpg$/.test(filename)) await unlink(path.join(outputDir, filename));
}
const itemWidth = 250;
const itemHeight = 330;
const imageHeight = 230;
const itemGap = 16;
const leftTextWidth = 330;
const rowWidth = 1480;
const rowHeight = 390;
const pageHeaderHeight = 90;
const rowsPerPage = 4;
let imageResolutionFailures = 0;

async function renderItem(item) {
  let productImage;
  try {
    const original = await imageBuffer(item.image);
    const metadata = await sharp(original, { failOn: "none" }).metadata();
    if ((metadata.width ?? 0) < 420 || (metadata.height ?? 0) < 420) imageResolutionFailures += 1;
    productImage = await sharp(original, { failOn: "none" })
      .rotate()
      .resize({ width: itemWidth - 20, height: imageHeight, fit: "contain", background: "#f4f2ed" })
      .flatten({ background: "#f4f2ed" })
      .jpeg({ quality: 94 })
      .toBuffer();
  } catch (error) {
    imageResolutionFailures += 1;
    productImage = await sharp({
      create: { width: itemWidth - 20, height: imageHeight, channels: 3, background: "#efe3df" },
    })
      .jpeg()
      .toBuffer();
  }
  const stateColor = item.state === "refined-planning-reservation" ? "#7a4c16" : "#315844";
  const price = Number.isFinite(Number(item.price))
    ? `${item.currency ?? "USD"} ${Number(item.price).toFixed(2)}`
    : "price unavailable";
  const svg = Buffer.from(
    `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#fff"/><text x="12" y="252" font-family="Arial" font-size="11" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())} · ${escapeXml(fitText(item.garmentType, 29))}</text><text x="12" y="273" font-family="Arial" font-size="11" fill="#555">${escapeXml(fitText(item.color, 26))} · ${escapeXml(price)}</text><text x="12" y="297" font-family="Arial" font-size="9" font-weight="700" fill="${stateColor}">${escapeXml(item.state === "refined-planning-reservation" ? "REFINED RESERVATION" : "PROVISIONAL HOLD")}</text><text x="12" y="316" font-family="Arial" font-size="8" fill="#888">${escapeXml(fitText(item.identity, 40))}</text></svg>`,
  );
  return sharp(svg)
    .composite([{ input: productImage, left: 10, top: 10 }])
    .jpeg({ quality: 94 })
    .toBuffer();
}

const pagePaths = [];
for (let pageIndex = 0; pageIndex < Math.ceil(scenarios.length / rowsPerPage); pageIndex += 1) {
  const pageScenarios = scenarios.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
  const pageHeight = pageHeaderHeight + pageScenarios.length * rowHeight + 20;
  const base = Buffer.from(
    `<svg width="${rowWidth}" height="${pageHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9e7e1"/><text x="20" y="36" font-family="Arial" font-size="26" font-weight="700" fill="#111">Men&apos;s incomplete scenario cores · page ${pageIndex + 1}/${Math.ceil(scenarios.length / rowsPerPage)}</text><text x="20" y="64" font-family="Arial" font-size="13" fill="#555">Green = existing visual hold · amber = refined planning reservation · combined for actual pairing review · no complete outfit approval</text></svg>`,
  );
  const composites = [];
  for (let rowIndex = 0; rowIndex < pageScenarios.length; rowIndex += 1) {
    const scenario = pageScenarios[rowIndex];
    const y = pageHeaderHeight + rowIndex * rowHeight;
    const queueSummary = scenario.exactQueueRoles
      .map((role) => `${role.category}: ${role.targetProduct}`)
      .join(" · ");
    const gapSummary = scenario.currentCoreGaps.length ? scenario.currentCoreGaps.join(", ") : "not encoded in source spec";
    const rowSvg = Buffer.from(
      `<svg width="${rowWidth - 20}" height="${rowHeight - 12}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#f8f7f3"/><text x="16" y="32" font-family="Arial" font-size="22" font-weight="700" fill="#111">${escapeXml(scenario.scenarioId)} · ${escapeXml(scenario.occasion)}</text><text x="16" y="57" font-family="Arial" font-size="13" font-weight="700" fill="#5f5a51">${escapeXml(scenario.season)} · ${escapeXml(scenario.budget)} · ${scenario.items.length} held/reserved piece${scenario.items.length === 1 ? "" : "s"}</text><text x="16" y="88" font-family="Arial" font-size="11" fill="#8a3d1d">Current core gaps: ${escapeXml(fitText(gapSummary, 43))}</text><text x="16" y="115" font-family="Arial" font-size="10" fill="#555">CJ queue: ${escapeXml(fitText(queueSummary || "none; non-budget roles remain deferred", 47))}</text><text x="16" y="146" font-family="Arial" font-size="10" font-weight="700" fill="#a63b2e">INCOMPLETE · NOT OUTFIT-APPROVED · NOT UI-INTEGRATED</text><text x="16" y="176" font-family="Arial" font-size="9" fill="#777">Combined view checks color and silhouette compatibility only.</text></svg>`,
    );
    composites.push({ input: rowSvg, left: 10, top: y });
    const itemBuffers = await Promise.all(scenario.items.map(renderItem));
    itemBuffers.forEach((input, itemIndex) => {
      composites.push({
        input,
        left: leftTextWidth + itemIndex * (itemWidth + itemGap),
        top: y + 24,
      });
    });
  }
  const pagePath = path.join(outputDir, `page-${String(pageIndex + 1).padStart(2, "0")}.jpg`);
  await sharp(base).composite(composites).jpeg({ quality: 94 }).toFile(pagePath);
  pagePaths.push(pagePath);
}

const summary = {
  incompleteScenarioCores: scenarios.length,
  provisionalVisualHolds: provisionalLedger.summary.provisionalFrontRunnerHolds,
  refinedPlanningReservations: scenarios
    .flatMap((scenario) => scenario.items)
    .filter((item) => item.state === "refined-planning-reservation").length,
  distinctProductIdentities: new Set(allIdentities).size,
  repeatedProductIdentities: repeatedIdentities.length,
  pageCount: pagePaths.length,
  imageResolutionFailures,
  completeOutfitsApproved: 0,
  uiIntegrated: false,
};

await writeFile(
  path.join(outputDir, "gallery.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      scope: "Incomplete men's non-wedding scenario cores only",
      reviewRule:
        "A combined core remains provisional until every required component exists and the complete outfit passes visual review.",
      summary,
      scenarios,
      pagePaths,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputDir, ...summary }, null, 2));
