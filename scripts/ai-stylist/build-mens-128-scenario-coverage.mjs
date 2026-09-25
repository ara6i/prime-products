#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const uiAuditPath = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-zara-taste-full-matrix-v15-20260912/ui-selection-matrix-audit.json",
);
const ledgerPath = path.join(reportRoot, "global-product-reservation-ledger.json");
const supplyGapPath = path.join(reportRoot, "mens-full-bank-supply-gap-audit/audit.json");
const outputDir = path.join(reportRoot, "mens-128-scenario-coverage");
const outputJsonPath = path.join(outputDir, "coverage.json");
const outputCsvPath = path.join(outputDir, "coverage.csv");
const outputMarkdownPath = path.join(outputDir, "COVERAGE.md");

const [uiAudit, ledger, supplyGap] = await Promise.all([
  readFile(uiAuditPath, "utf8").then(JSON.parse),
  readFile(ledgerPath, "utf8").then(JSON.parse),
  readFile(supplyGapPath, "utf8").then(JSON.parse),
]);

if (uiAudit.scope?.gender !== "male") throw new Error("UI audit is not men-only");
if (uiAudit.scope?.baseScenarioCells !== 128) {
  throw new Error(`Expected 128 non-wedding men's cells, found ${uiAudit.scope?.baseScenarioCells}`);
}
if (!uiAudit.scope?.excludedOccasions?.includes("Wedding Guest")) {
  throw new Error("Wedding Guest is not excluded in the source UI audit");
}
if (ledger.weddingAndWeddingGuestExcluded !== true) {
  throw new Error("The active global ledger does not exclude Wedding/Wedding Guest");
}
if (ledger.summary.repeatedProductIdentities || ledger.summary.approvedBoardRepeatCount) {
  throw new Error("The active global ledger contains repeated product identities");
}

const rowsByScenario = new Map();
for (const row of uiAudit.rows) {
  const group = rowsByScenario.get(row.scenarioId) ?? [];
  group.push(row);
  rowsByScenario.set(row.scenarioId, group);
}
if (rowsByScenario.size !== 128) {
  throw new Error(`Expected 128 unique scenario IDs, found ${rowsByScenario.size}`);
}

const approvedOutfitsByScenario = new Map();
for (const outfit of ledger.approvedOutfits) {
  const group = approvedOutfitsByScenario.get(outfit.scenarioId) ?? [];
  group.push(outfit);
  approvedOutfitsByScenario.set(outfit.scenarioId, group);
}
const uiCompleteOutfitsByScenario = new Map();
for (const outfit of ledger.uiCompleteOutfits ?? []) {
  const group = uiCompleteOutfitsByScenario.get(outfit.scenarioId) ?? [];
  group.push(outfit);
  uiCompleteOutfitsByScenario.set(outfit.scenarioId, group);
}
const approvedPlacementsByScenario = new Map();
for (const reservation of ledger.reservations) {
  if (
    !["complete-outfit-visual-approved", "ui-complete-outfit-visual-approved"].includes(
      reservation.reservationStatus,
    )
  ) continue;
  const group = approvedPlacementsByScenario.get(reservation.scenarioId) ?? [];
  group.push(reservation);
  approvedPlacementsByScenario.set(reservation.scenarioId, group);
}

const budgetRank = new Map([
  ["budget-friendly", 0],
  ["mid-range", 1],
  ["premium", 2],
  ["luxury", 3],
]);

const scenarios = [...rowsByScenario.entries()]
  .map(([scenarioId, uiRows]) => {
    const example = uiRows[0];
    const suitEligible = uiRows.some((row) => row.modeFamily === "suit");
    const separatesTargetOutfits = 10;
    const suitTargetOutfits = suitEligible ? 10 : 0;
    const targetOutfitsAcrossPieceFamilies = separatesTargetOutfits + suitTargetOutfits;
    const approvedCores = approvedOutfitsByScenario.get(scenarioId) ?? [];
    const uiCompleteOutfits = uiCompleteOutfitsByScenario.get(scenarioId) ?? [];
    const approvedPlacements = approvedPlacementsByScenario.get(scenarioId) ?? [];
    const approvedSeparatesOutfits = uiCompleteOutfits.length;
    const approvedSuitOutfits = 0;
    const requiredIdentitySlots = 60 + (suitEligible ? 50 : 0);
    const approvedIdentitySlots = approvedPlacements.length;
    const blockers = [];
    if (approvedSeparatesOutfits < separatesTargetOutfits) blockers.push("separates-outfits");
    if (suitEligible && approvedSuitOutfits < suitTargetOutfits) blockers.push("suit-outfits");
    if (approvedIdentitySlots < requiredIdentitySlots) blockers.push("unique-products-and-add-ons");
    if (example.budget !== "budget-friendly") blockers.push("verified-retail-price-band");
    if (ledger.summary.catalogReadyShoesUnused === 0) blockers.push("new-unique-shoes");
    const matrixStatus = blockers.length === 0
      ? "complete"
      : approvedCores.length > 0 || approvedIdentitySlots > 0
        ? "partial"
        : "missing";
    return {
      scenarioId,
      occasion: example.occasion,
      occasionLabel: example.occasionLabel,
      season: example.season,
      seasonLabel: example.seasonLabel,
      budget: example.budget,
      budgetLabel: example.budgetLabel,
      uiPiecePaths: uiRows.length,
      pieceModeFamilies: suitEligible ? ["separates", "suit"] : ["separates"],
      suitEligible,
      targets: {
        separatesOutfits: separatesTargetOutfits,
        suitOutfits: suitTargetOutfits,
        outfitsAcrossPieceFamilies: targetOutfitsAcrossPieceFamilies,
        uniqueProductIdentitySlots: requiredIdentitySlots,
      },
      approved: {
        threePieceCores: approvedCores.length,
        separatesOutfits: approvedSeparatesOutfits,
        suitOutfits: approvedSuitOutfits,
        outfitsAcrossPieceFamilies: approvedSeparatesOutfits,
        uniqueProductIdentitySlots: approvedIdentitySlots,
      },
      remaining: {
        separatesOutfits: separatesTargetOutfits - approvedSeparatesOutfits,
        suitOutfits: suitTargetOutfits - approvedSuitOutfits,
        outfitsAcrossPieceFamilies:
          targetOutfitsAcrossPieceFamilies - approvedSeparatesOutfits,
        uniqueProductIdentitySlots: requiredIdentitySlots - approvedIdentitySlots,
      },
      matrixStatus,
      blockers,
      approvedCoreNames: approvedCores.map((outfit) => outfit.name),
      uiIntegrated: false,
    };
  })
  .sort((a, b) => {
    const occasionOrder = a.occasionLabel.localeCompare(b.occasionLabel);
    if (occasionOrder) return occasionOrder;
    const seasonOrder = ["Spring", "Summer", "Fall", "Winter"].indexOf(a.seasonLabel)
      - ["Spring", "Summer", "Fall", "Winter"].indexOf(b.seasonLabel);
    if (seasonOrder) return seasonOrder;
    return (budgetRank.get(a.budget) ?? 99) - (budgetRank.get(b.budget) ?? 99);
  });

const totalTargetOutfits = scenarios.reduce(
  (sum, scenario) => sum + scenario.targets.outfitsAcrossPieceFamilies,
  0,
);
const totalApprovedOutfits = scenarios.reduce(
  (sum, scenario) => sum + scenario.approved.outfitsAcrossPieceFamilies,
  0,
);
const totalApprovedThreePieceCores = scenarios.reduce(
  (sum, scenario) => sum + scenario.approved.threePieceCores,
  0,
);
const totalRequiredIdentitySlots = scenarios.reduce(
  (sum, scenario) => sum + scenario.targets.uniqueProductIdentitySlots,
  0,
);
const totalApprovedIdentitySlots = scenarios.reduce(
  (sum, scenario) => sum + scenario.approved.uniqueProductIdentitySlots,
  0,
);
const statusCounts = Object.fromEntries(
  ["complete", "partial", "missing"].map((status) => [
    status,
    scenarios.filter((scenario) => scenario.matrixStatus === status).length,
  ]),
);

if (totalTargetOutfits !== 1920) {
  throw new Error(`Expected 1,920 target outfits across piece families, found ${totalTargetOutfits}`);
}
if (totalRequiredIdentitySlots !== 10880) {
  throw new Error(`Expected 10,880 unique identity slots, found ${totalRequiredIdentitySlots}`);
}
if (totalApprovedThreePieceCores !== ledger.summary.approvedThreePieceCores) {
  throw new Error("Coverage core count does not match the global ledger");
}
if (totalApprovedOutfits !== ledger.summary.uiCompleteOutfits) {
  throw new Error("Coverage UI-complete outfit count does not match the global ledger");
}
if (totalApprovedIdentitySlots !== ledger.summary.approvedUniqueProductPlacements) {
  throw new Error("Coverage placement count does not match the global ledger");
}

const summary = {
  scenarioCells: scenarios.length,
  uiPiecePaths: uiAudit.scope.uiReachableGarmentPaths,
  separatesBanks: scenarios.length,
  suitBanks: scenarios.filter((scenario) => scenario.suitEligible).length,
  totalOutfitBanks: scenarios.length + scenarios.filter((scenario) => scenario.suitEligible).length,
  targetOutfits: totalTargetOutfits,
  approvedOutfits: totalApprovedOutfits,
  approvedThreePieceCores: totalApprovedThreePieceCores,
  missingOutfits: totalTargetOutfits - totalApprovedOutfits,
  outfitReadinessPercent: Number(((totalApprovedOutfits / totalTargetOutfits) * 100).toFixed(3)),
  requiredUniqueProductIdentitySlots: totalRequiredIdentitySlots,
  approvedUniqueProductIdentitySlots: totalApprovedIdentitySlots,
  missingApprovedIdentitySlots: totalRequiredIdentitySlots - totalApprovedIdentitySlots,
  approvedPlacementPercent: Number(
    ((totalApprovedIdentitySlots / totalRequiredIdentitySlots) * 100).toFixed(3),
  ),
  catalogReadyProductIdentities: supplyGap.summary.individuallyAcceptedIdentities,
  catalogReadyInventoryGap: supplyGap.summary.minimumNewIdentitiesNeeded,
  completeScenarioCells: statusCounts.complete,
  partialScenarioCells: statusCounts.partial,
  missingScenarioCells: statusCounts.missing,
  repeatedProductIdentities: ledger.summary.repeatedProductIdentities,
  catalogReadyShoes: ledger.summary.catalogReadyShoes,
  catalogReadyShoesUsed: ledger.summary.catalogReadyShoesUsed,
  catalogReadyShoesUnused: ledger.summary.catalogReadyShoesUnused,
  weddingAndWeddingGuestExcluded: true,
  uiIntegrated: false,
};

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  sourceUiAudit: uiAuditPath,
  sourceReservationLedger: ledgerPath,
  targetRule:
    "Each of 128 non-wedding men's scenario cells needs ten separates looks; the 64 Office, Formal Evening, Date Night and Party cells also need ten distinct suit looks. Optional add-on selections filter those banks and require their own globally unique products.",
  identityRule:
    "A supplier-product identity may appear once only across every outfit bank, scenario, piece path, color and variant.",
  summary,
  scenarios,
};

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(";") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const csvHeaders = [
  "scenarioId",
  "occasion",
  "season",
  "budget",
  "uiPiecePaths",
  "suitEligible",
  "targetOutfits",
  "approvedThreePieceCores",
  "approvedOutfits",
  "remainingOutfits",
  "requiredUniqueIdentitySlots",
  "approvedUniqueIdentitySlots",
  "remainingUniqueIdentitySlots",
  "status",
  "blockers",
];
const csvRows = scenarios.map((scenario) => [
  scenario.scenarioId,
  scenario.occasionLabel,
  scenario.seasonLabel,
  scenario.budgetLabel,
  scenario.uiPiecePaths,
  scenario.suitEligible,
  scenario.targets.outfitsAcrossPieceFamilies,
  scenario.approved.threePieceCores,
  scenario.approved.outfitsAcrossPieceFamilies,
  scenario.remaining.outfitsAcrossPieceFamilies,
  scenario.targets.uniqueProductIdentitySlots,
  scenario.approved.uniqueProductIdentitySlots,
  scenario.remaining.uniqueProductIdentitySlots,
  scenario.matrixStatus,
  scenario.blockers,
]);
const csv = [csvHeaders, ...csvRows]
  .map((row) => row.map(csvCell).join(","))
  .join("\n");

const occasionRows = [...new Set(scenarios.map((scenario) => scenario.occasionLabel))]
  .sort()
  .map((occasion) => {
    const group = scenarios.filter((scenario) => scenario.occasionLabel === occasion);
    return `| ${occasion} | ${group.length} | ${group.reduce((sum, row) => sum + row.targets.outfitsAcrossPieceFamilies, 0)} | ${group.reduce((sum, row) => sum + row.approved.threePieceCores, 0)} | ${group.reduce((sum, row) => sum + row.approved.outfitsAcrossPieceFamilies, 0)} | ${group.filter((row) => row.matrixStatus === "partial").length} | ${group.filter((row) => row.matrixStatus === "missing").length} |`;
  });
const scenarioRows = scenarios.map(
  (scenario) =>
    `| ${scenario.scenarioId} | ${scenario.occasionLabel} | ${scenario.seasonLabel} | ${scenario.budgetLabel} | ${scenario.suitEligible ? "separates + suit" : "separates"} | ${scenario.approved.threePieceCores} | ${scenario.approved.outfitsAcrossPieceFamilies}/${scenario.targets.outfitsAcrossPieceFamilies} | ${scenario.approved.uniqueProductIdentitySlots}/${scenario.targets.uniqueProductIdentitySlots} | ${scenario.matrixStatus} | ${scenario.blockers.join(", ")} |`,
);
const markdown = `# Men's 128-cell AI Stylist coverage

Generated: ${result.generatedAt}

This is the controlling local progress manifest for the non-wedding men's objective. It is derived from the actual UI piece-path audit and the current zero-repeat product reservation ledger.

- Scenario cells: ${summary.scenarioCells}
- UI-reachable Pieces paths: ${summary.uiPiecePaths}
- Outfit banks: ${summary.totalOutfitBanks} (${summary.separatesBanks} separates + ${summary.suitBanks} suit)
- Required complete outfits: ${summary.targetOutfits}
- Visually approved three-piece cores: ${summary.approvedThreePieceCores}
- UI-complete outfits: ${summary.approvedOutfits}
- Outfit readiness: ${summary.outfitReadinessPercent}%
- Required globally unique product placements: ${summary.requiredUniqueProductIdentitySlots}
- Approved product placements: ${summary.approvedUniqueProductIdentitySlots}
- Placement readiness: ${summary.approvedPlacementPercent}%
- Scenario cells complete / partial / missing: ${summary.completeScenarioCells} / ${summary.partialScenarioCells} / ${summary.missingScenarioCells}
- Catalog-ready shoes used / ready / unused: ${summary.catalogReadyShoesUsed} / ${summary.catalogReadyShoes} / ${summary.catalogReadyShoesUnused}
- Repeated identities: ${summary.repeatedProductIdentities}
- Wedding and Wedding Guest: excluded and untouched
- AI Stylist UI integrated: no

## Why the target is 1,920 outfits

Every one of the 128 cells needs ten separates outfits. Work / Office, Formal Evening, Date Night, and Party / Night Out also expose a distinct Suit / Tuxedo family, adding 64 ten-outfit suit banks. Optional Outerwear, Bag, Watch, and Accessory selections filter those banks; they do not create fake duplicate outfit banks, but their products must still be globally unique.

## Coverage by occasion

| Occasion | Cells | Target outfits | Approved three-piece cores | UI-complete outfits | Partial cells | Missing cells |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${occasionRows.join("\n")}

## All 128 cells

| ID | Occasion | Season | Budget | Required families | Approved cores | UI-complete outfits | Approved core placements | Status | Current blockers |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
${scenarioRows.join("\n")}
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(outputCsvPath, `${csv}\n`),
  writeFile(outputMarkdownPath, markdown),
]);

console.log(
  JSON.stringify(
    { outputJsonPath, outputCsvPath, outputMarkdownPath, ...summary },
    null,
    2,
  ),
);
