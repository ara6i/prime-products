#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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
const outputDir = path.join(reportRoot, "mens-family-role-blueprint-audit");
const outputJsonPath = path.join(outputDir, "audit.json");
const outputMarkdownPath = path.join(outputDir, "AUDIT.md");

const [
  uiAudit,
  coverage,
  queue,
  provisionalLedger,
  reservationLedger,
  suitFamilyBlueprints,
  separatesFamilyCompletions,
] = await Promise.all([
  readFile(uiAuditPath, "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "mens-128-scenario-coverage/coverage.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(path.join(reportRoot, "next-cj-exact-page-queue/queue.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(path.join(reportRoot, "mens-suit-family-blueprints/blueprints.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(
    path.join(reportRoot, "mens-separates-family-completions/completions.json"),
    "utf8",
  ).then(JSON.parse),
]);

if (uiAudit.scope?.gender !== "male" || uiAudit.scope?.baseScenarioCells !== 128) {
  throw new Error("Expected the controlling 128-cell men's UI audit");
}
if (coverage.summary?.scenarioCells !== 128) {
  throw new Error("Expected the controlling 128-cell coverage manifest");
}
if (suitFamilyBlueprints.summary?.suitEligibleScenarioCells !== 64) {
  throw new Error("Expected 64 suit-family scenario blueprints");
}
if (separatesFamilyCompletions.summary?.familyRoleDirections !== 204) {
  throw new Error("Expected 204 Separates family completion directions");
}

const suitBlueprintByScenario = new Map(
  suitFamilyBlueprints.entries.map((entry) => [entry.scenarioId, entry]),
);
const separatesCompletionsByScenario = new Map();
for (const entry of separatesFamilyCompletions.entries) {
  const entries = separatesCompletionsByScenario.get(entry.scenarioId) ?? [];
  entries.push(entry);
  separatesCompletionsByScenario.set(entry.scenarioId, entries);
}

const relevantSpecNames = new Set([
  "core-comparison.json",
  "top-comparison.json",
  "companion-pool.json",
]);
const specFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (relevantSpecNames.has(entry.name)) specFiles.push(fullPath);
  }
}
await walk(reportRoot);

const specsByScenario = new Map();
for (const specPath of specFiles) {
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  if (!/^S\d+$/.test(spec.scenarioId ?? "")) continue;
  const entries = specsByScenario.get(spec.scenarioId) ?? [];
  entries.push({
    path: path.relative(reportRoot, specPath),
    generatedAt: spec.generatedAt ?? "",
    spec,
  });
  specsByScenario.set(spec.scenarioId, entries);
}
for (const entries of specsByScenario.values()) {
  entries.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

const uiRowsByScenario = new Map();
for (const row of uiAudit.rows) {
  const rows = uiRowsByScenario.get(row.scenarioId) ?? [];
  rows.push(row);
  uiRowsByScenario.set(row.scenarioId, rows);
}

const productEvidenceByScenario = new Map();
function addProductEvidence(scenarioId, slot, identity, state) {
  const entries = productEvidenceByScenario.get(scenarioId) ?? [];
  entries.push({ slot, identity, state });
  productEvidenceByScenario.set(scenarioId, entries);
}
for (const hold of provisionalLedger.holds) {
  addProductEvidence(hold.scenarioId, hold.slot, hold.identity, "provisional-visual-hold");
}
for (const reservation of reservationLedger.reservations) {
  addProductEvidence(
    reservation.scenarioId,
    reservation.slot,
    reservation.productKey,
    reservation.reservationStatus,
  );
}

const normalizeCategory = (category) =>
  category === "suit-tuxedo" ? "suit" : category === "coat-jacket" ? "outerwear" : category;

function expectedRoleKeys(uiRows) {
  const byFamily = new Map();
  for (const row of uiRows) {
    const slots = byFamily.get(row.modeFamily) ?? new Set();
    for (const slot of row.selectedSlots) {
      const category = row.modeFamily === "suit" && slot === "outerwear"
        ? "suit"
        : normalizeCategory(slot);
      slots.add(category);
    }
    byFamily.set(row.modeFamily, slots);
  }
  return [...byFamily.entries()].flatMap(([family, slots]) =>
    [...slots].sort().map((slot) => `${family}.${slot}`),
  );
}

function defaultFamilyForCategory(category) {
  if (category === "suit" || category === "watch") return "suit";
  return "separates";
}

function roleEvidenceForScenario(scenarioId, activeSpec) {
  const evidence = [];
  for (const product of productEvidenceByScenario.get(scenarioId) ?? []) {
    evidence.push({
      roleKey: `separates.${normalizeCategory(product.slot)}`,
      category: normalizeCategory(product.slot),
      family: "separates",
      source: product.state,
      targetProduct: product.identity,
    });
  }
  const deferredRoles = activeSpec?.spec?.deferredPriceTierRoles
    ?? activeSpec?.spec?.deferredRoles
    ?? activeSpec?.spec?.queuedRoles
    ?? [];
  for (const role of deferredRoles) {
    const category = normalizeCategory(role.category);
    const family = role.family ?? defaultFamilyForCategory(category);
    evidence.push({
      roleKey: `${family}.${category}`,
      category,
      family,
      source: "active-spec-role-direction",
      targetProduct: role.targetProduct ?? role.searchPhrase ?? null,
    });
  }
  for (const role of queue.roles.filter((entry) => entry.scenarioId === scenarioId)) {
    const category = normalizeCategory(role.category);
    const family = role.family ?? defaultFamilyForCategory(category);
    evidence.push({
      roleKey: `${family}.${category}`,
      category,
      family,
      source: "manual-cj-queue-role",
      targetProduct: role.targetProduct,
    });
  }
  for (const role of suitBlueprintByScenario.get(scenarioId)?.roles ?? []) {
    const category = normalizeCategory(role.category);
    const family = role.family ?? "suit";
    evidence.push({
      roleKey: `${family}.${category}`,
      category,
      family,
      source: "suit-family-blueprint-direction",
      targetProduct: role.targetProduct,
    });
  }
  for (const role of separatesCompletionsByScenario.get(scenarioId) ?? []) {
    const category = normalizeCategory(role.category);
    const family = role.family ?? "separates";
    evidence.push({
      roleKey: `${family}.${category}`,
      category,
      family,
      source: "separates-family-completion-direction",
      targetProduct: role.targetProduct,
    });
  }
  return evidence;
}

const scenarios = coverage.scenarios.map((scenario) => {
  const uiRows = uiRowsByScenario.get(scenario.scenarioId) ?? [];
  const requiredRoleKeys = expectedRoleKeys(uiRows);
  const activeSpec = specsByScenario.get(scenario.scenarioId)?.[0] ?? null;
  const evidence = roleEvidenceForScenario(scenario.scenarioId, activeSpec);
  const evidenceRoleKeys = new Set(evidence.map((entry) => entry.roleKey));
  const coveredRoleKeys = requiredRoleKeys.filter((roleKey) => evidenceRoleKeys.has(roleKey));
  const missingRoleKeys = requiredRoleKeys.filter((roleKey) => !evidenceRoleKeys.has(roleKey));
  const nonUiRoleEvidence = evidence.filter((entry) => !requiredRoleKeys.includes(entry.roleKey));
  return {
    scenarioId: scenario.scenarioId,
    occasion: scenario.occasionLabel,
    season: scenario.seasonLabel,
    budget: scenario.budgetLabel,
    suitEligible: scenario.suitEligible,
    activeSpec: activeSpec?.path ?? null,
    activeSpecStatus: activeSpec?.spec?.status ?? null,
    approvedOutfits: scenario.approved.outfitsAcrossPieceFamilies,
    visibleOrReservedProducts: productEvidenceByScenario.get(scenario.scenarioId)?.length ?? 0,
    requiredRoleKeys,
    coveredRoleKeys,
    missingRoleKeys,
    nonUiRoleEvidence,
    roleEvidence: evidence,
    activeNextLookFamilyBlueprintComplete: missingRoleKeys.length === 0,
  };
});

const requiredActiveRoleDirections = scenarios.reduce(
  (sum, scenario) => sum + scenario.requiredRoleKeys.length,
  0,
);
const coveredActiveRoleDirections = scenarios.reduce(
  (sum, scenario) => sum + scenario.coveredRoleKeys.length,
  0,
);
const firstLookCompleteCells = scenarios.filter(
  (scenario) => scenario.activeNextLookFamilyBlueprintComplete,
).length;
const cellsWithoutActiveSpec = scenarios.filter((scenario) => !scenario.activeSpec).length;
const cellsWithNonUiRoleEvidence = scenarios.filter(
  (scenario) => scenario.nonUiRoleEvidence.length > 0,
).length;
const missingRoleCounts = {};
for (const scenario of scenarios) {
  for (const roleKey of scenario.missingRoleKeys) {
    missingRoleCounts[roleKey] = (missingRoleCounts[roleKey] ?? 0) + 1;
  }
}
const summary = {
  scenarioCells: scenarios.length,
  activeNextLookRequiredFamilyRoleDirections: requiredActiveRoleDirections,
  activeNextLookCoveredFamilyRoleDirections: coveredActiveRoleDirections,
  activeNextLookMissingFamilyRoleDirections:
    requiredActiveRoleDirections - coveredActiveRoleDirections,
  activeNextLookRoleDirectionCoveragePercent: Number(
    ((coveredActiveRoleDirections / requiredActiveRoleDirections) * 100).toFixed(2),
  ),
  activeNextLookFamilyBlueprintCompleteCells: firstLookCompleteCells,
  activeNextLookFamilyBlueprintIncompleteCells: scenarios.length - firstLookCompleteCells,
  cellsWithoutActiveSpec,
  cellsWithNonUiRoleEvidence,
  missingRoleCounts,
  fullBankRequiredUniqueProductPlacements: coverage.summary.requiredUniqueProductIdentitySlots,
  approvedUniqueProductPlacements: coverage.summary.approvedUniqueProductIdentitySlots,
  fullBankBlueprintComplete: false,
  weddingAndWeddingGuestExcluded: true,
  uiIntegrated: false,
};

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scope: "Men's 128 non-wedding scenario cells, separated by UI piece family",
  auditRule:
    "A role direction counts once for one family only. A separates shoe, bag or accessory cannot also satisfy the Suit/Tuxedo bank because global identity reuse is forbidden.",
  interpretation:
    "This measures only the active next-look blueprint depth. It does not prove any product source, complete outfit, ten-look bank or UI integration.",
  summary,
  scenarios,
};

const missingRows = Object.entries(missingRoleCounts)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([roleKey, count]) => `| ${roleKey} | ${count} |`)
  .join("\n");
const scenarioRows = scenarios
  .map(
    (scenario) =>
      `| ${scenario.scenarioId} | ${scenario.occasion} | ${scenario.season} | ${scenario.budget} | ${scenario.coveredRoleKeys.length}/${scenario.requiredRoleKeys.length} | ${scenario.missingRoleKeys.join(", ") || "none"} | ${scenario.activeSpec ?? "no active spec"} |`,
  )
  .join("\n");
const markdown = `# Men's family-level role blueprint audit

Generated: ${result.generatedAt}

This audit prevents one generic product direction from being counted twice across the Separates and Suit/Tuxedo UI families. It measures the active next-look blueprint only; it is not proof of a complete product bank.

- Scenario cells: ${summary.scenarioCells}
- Required active-next-look family roles: ${summary.activeNextLookRequiredFamilyRoleDirections}
- Covered family role directions: ${summary.activeNextLookCoveredFamilyRoleDirections}
- Missing family role directions: ${summary.activeNextLookMissingFamilyRoleDirections}
- Direction coverage: ${summary.activeNextLookRoleDirectionCoveragePercent}%
- Cells with a complete active-next-look family blueprint: ${summary.activeNextLookFamilyBlueprintCompleteCells}/${summary.scenarioCells}
- Cells without an active comparison spec: ${summary.cellsWithoutActiveSpec}
- Full-bank required unique product placements: ${summary.fullBankRequiredUniqueProductPlacements}
- Approved unique product placements: ${summary.approvedUniqueProductPlacements}
- Full ten-look bank blueprint complete: no
- Wedding and Wedding Guest: excluded
- UI integrated: no

## Missing active-next-look roles by family

| Family role | Cells missing it |
|---|---:|
${missingRows}

## All scenario cells

| Scenario | Occasion | Season | Budget | Covered | Missing family roles | Active source spec |
|---|---|---|---|---:|---|---|
${scenarioRows}
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(outputMarkdownPath, markdown),
]);

console.log(JSON.stringify({ outputJsonPath, outputMarkdownPath, ...summary }, null, 2));
