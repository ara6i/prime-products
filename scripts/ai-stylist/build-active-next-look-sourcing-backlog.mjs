#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "active-next-look-sourcing-backlog");

const inputPaths = {
  familyAudit: path.join(reportRoot, "mens-family-role-blueprint-audit/audit.json"),
  fullBankAudit: path.join(reportRoot, "mens-full-bank-supply-gap-audit/audit.json"),
  queue: path.join(reportRoot, "next-cj-exact-page-queue/queue.json"),
  reservations: path.join(reportRoot, "global-product-reservation-ledger.json"),
  completions: path.join(
    reportRoot,
    "mens-separates-family-completions/completions.json",
  ),
};

const [familyAudit, fullBankAudit, queue, reservations, completions] =
  await Promise.all(
    Object.values(inputPaths).map(async (filePath) =>
      JSON.parse(await readFile(filePath, "utf8")),
    ),
  );

if (familyAudit.summary?.scenarioCells !== 128) {
  throw new Error("Expected the controlling 128-cell family-role audit.");
}
if (fullBankAudit.summary?.activeNextLookRequiredPlacements !== 1088) {
  throw new Error("Expected 1,088 active-next-look product placements.");
}
if (
  fullBankAudit.summary?.individuallyAcceptedIdentities <
  reservations.summary?.totalReservedIdentities
) {
  throw new Error("Accepted identity pool is smaller than the reservation ledger.");
}
if (reservations.summary?.totalReservedIdentities !== 41) {
  throw new Error("Expected 41 globally reserved product identities.");
}
if (
  !Number.isInteger(queue.summary?.queueRoles) ||
  queue.summary.queueRoles < 1 ||
  queue.summary.queueRoles !== queue.roles?.length
) {
  throw new Error("Manual CJ queue summary does not match its role rows.");
}

const categoryOrder = [
  "top",
  "bottom",
  "outerwear",
  "shoe",
  "bag",
  "accessory",
  "suit",
  "watch",
];
const categoryLabels = {
  top: "Tops",
  bottom: "Bottoms",
  outerwear: "Outerwear",
  shoe: "Shoes",
  bag: "Bags",
  accessory: "Accessories",
  suit: "Suits",
  watch: "Watches",
};
const directionEvidenceSources = new Set([
  "manual-cj-queue-role",
  "active-spec-role-direction",
  "separates-family-completion-direction",
  "suit-family-blueprint-direction",
]);

const normalizeCategory = (category) =>
  category === "suit-tuxedo"
    ? "suit"
    : category === "coat-jacket"
      ? "outerwear"
      : category;
const defaultQueueFamily = (category) =>
  category === "suit" || category === "watch" ? "suit" : "separates";
const unique = (values) => [...new Set(values.filter(Boolean))];
const roleKey = (scenarioId, family, category) =>
  `${scenarioId}|${family}.${normalizeCategory(category)}`;

const queueRowsByRole = new Map();
for (const row of queue.roles) {
  const family = row.family ?? defaultQueueFamily(normalizeCategory(row.category));
  const key = roleKey(row.scenarioId, family, row.category);
  const rows = queueRowsByRole.get(key) ?? [];
  rows.push(row);
  queueRowsByRole.set(key, rows);
}

const completionRoleKeys = new Set(
  completions.entries.map((entry) =>
    roleKey(entry.scenarioId, entry.family, entry.category),
  ),
);

const reservationsByRole = new Map();
for (const reservation of reservations.reservations) {
  // Every currently approved/reserved outfit is a Separates outfit. Suit-family
  // roles remain unassigned until a distinct Suit outfit passes visual review.
  const key = roleKey(reservation.scenarioId, "separates", reservation.slot);
  const rows = reservationsByRole.get(key) ?? [];
  rows.push(reservation);
  reservationsByRole.set(key, rows);
}

const scenarioRows = [];
const roleRows = [];
for (const scenario of familyAudit.scenarios) {
  const scenarioRoleRows = [];
  for (const requiredRoleKey of scenario.requiredRoleKeys) {
    const [family, category] = requiredRoleKey.split(".");
    const key = roleKey(scenario.scenarioId, family, category);
    const evidence = scenario.roleEvidence.filter(
      (entry) => entry.roleKey === requiredRoleKey,
    );
    const controllingReservations = reservationsByRole.get(key) ?? [];
    const queueRows = queueRowsByRole.get(key) ?? [];
    const directionEvidence = evidence.filter(
      (entry) => directionEvidenceSources.has(entry.source),
    );
    const assignedProductIdentities = unique(
      controllingReservations.map((entry) => entry.productKey),
    );
    const status = assignedProductIdentities.length
      ? "product-assigned"
      : queueRows.length
        ? "manual-cj-queue"
        : "sourcing-brief-not-queued";
    const row = {
      roleId: key,
      scenarioId: scenario.scenarioId,
      occasion: scenario.occasion,
      season: scenario.season,
      budget: scenario.budget,
      family,
      category,
      status,
      assignedProductIdentities,
      productEvidenceSources: unique(
        controllingReservations.map((entry) => entry.reservationStatus),
      ),
      queueIds: queueRows.map((entry) => entry.queueId),
      queueStatuses: unique(queueRows.map((entry) => entry.status)),
      queueTargetProducts: unique(queueRows.map((entry) => entry.targetProduct)),
      directionSources: unique(directionEvidence.map((entry) => entry.source)),
      targetProductDirections: unique(
        directionEvidence.map((entry) => entry.targetProduct),
      ),
      hasSeparatesCompletionDirection: completionRoleKeys.has(key),
      visuallyApprovedCompleteOutfit: scenario.approvedOutfits > 0,
      uiIntegrated: false,
    };
    scenarioRoleRows.push(row);
    roleRows.push(row);
  }
  scenarioRows.push({
    scenarioId: scenario.scenarioId,
    occasion: scenario.occasion,
    season: scenario.season,
    budget: scenario.budget,
    suitEligible: scenario.suitEligible,
    requiredRoleSlots: scenarioRoleRows.length,
    productAssignedRoleSlots: scenarioRoleRows.filter(
      (entry) => entry.status === "product-assigned",
    ).length,
    unresolvedRoleSlots: scenarioRoleRows.filter(
      (entry) => entry.status !== "product-assigned",
    ).length,
    queuedUnresolvedRoleSlots: scenarioRoleRows.filter(
      (entry) => entry.status === "manual-cj-queue",
    ).length,
    unqueuedUnresolvedRoleSlots: scenarioRoleRows.filter(
      (entry) => entry.status === "sourcing-brief-not-queued",
    ).length,
    roles: scenarioRoleRows,
  });
}

const requiredRoleKeys = new Set(roleRows.map((entry) => entry.roleId));
const queueRoleKeys = new Set(queueRowsByRole.keys());
const productAssignedRoleRows = roleRows.filter(
  (entry) => entry.status === "product-assigned",
);
const queuedUnresolvedRoleRows = roleRows.filter(
  (entry) => entry.status === "manual-cj-queue",
);
const unqueuedUnresolvedRoleRows = roleRows.filter(
  (entry) => entry.status === "sourcing-brief-not-queued",
);

const reservedByCategory = Object.fromEntries(
  categoryOrder.map((category) => [category, new Set()]),
);
for (const reservation of reservations.reservations) {
  const category = normalizeCategory(reservation.slot);
  if (!reservedByCategory[category]) {
    throw new Error(`Unknown reservation category: ${reservation.slot}`);
  }
  reservedByCategory[category].add(String(reservation.productKey).toLowerCase());
}

const fullBankCategoryByName = new Map(
  fullBankAudit.categories.map((entry) => [entry.category, entry]),
);
const categories = categoryOrder.map((category) => {
  const rows = roleRows.filter((entry) => entry.category === category);
  const accepted = fullBankCategoryByName.get(category)?.individuallyAcceptedIdentities ?? 0;
  const reserved = reservedByCategory[category].size;
  return {
    category,
    label: categoryLabels[category],
    activeNextLookRequiredRoleSlots: rows.length,
    productAssignedRoleSlots: rows.filter(
      (entry) => entry.status === "product-assigned",
    ).length,
    queuedUnresolvedRoleSlots: rows.filter(
      (entry) => entry.status === "manual-cj-queue",
    ).length,
    unqueuedUnresolvedRoleSlots: rows.filter(
      (entry) => entry.status === "sourcing-brief-not-queued",
    ).length,
    individuallyAcceptedIdentities: accepted,
    reservedAcceptedIdentities: reserved,
    unreservedAcceptedIdentities: accepted - reserved,
    activeNextLookMinimumNewIdentities:
      fullBankCategoryByName.get(category)?.activeNextLookMinimumNewIdentities ?? 0,
    activeNextLookSlotAwareMinimumNewIdentities: Math.max(
      0,
      rows.filter((entry) => entry.status !== "product-assigned").length -
        (accepted - reserved),
    ),
  };
});

const families = ["separates", "suit"].map((family) => {
  const rows = roleRows.filter((entry) => entry.family === family);
  return {
    family,
    requiredRoleSlots: rows.length,
    productAssignedRoleSlots: rows.filter(
      (entry) => entry.status === "product-assigned",
    ).length,
    queuedUnresolvedRoleSlots: rows.filter(
      (entry) => entry.status === "manual-cj-queue",
    ).length,
    unqueuedUnresolvedRoleSlots: rows.filter(
      (entry) => entry.status === "sourcing-brief-not-queued",
    ).length,
  };
});

const queuedCompletionRoleKeys = [...completionRoleKeys].filter((key) =>
  queueRoleKeys.has(key),
);
const unqueuedCompletionRoleKeys = [...completionRoleKeys].filter(
  (key) => !queueRoleKeys.has(key),
);
const queueRoleKeysOutsideRequiredMatrix = [...queueRoleKeys].filter(
  (key) => !requiredRoleKeys.has(key),
);

const summary = {
  scenarioCells: scenarioRows.length,
  activeNextLookRequiredRoleSlots: roleRows.length,
  productAssignedRoleSlots: productAssignedRoleRows.length,
  unresolvedRoleSlots:
    queuedUnresolvedRoleRows.length + unqueuedUnresolvedRoleRows.length,
  queuedUnresolvedRoleSlots: queuedUnresolvedRoleRows.length,
  unqueuedUnresolvedRoleSlots: unqueuedUnresolvedRoleRows.length,
  currentManualCjQueueRows: queue.roles.length,
  currentManualCjQueueUniqueRoleSlots: queueRoleKeys.size,
  currentQueueDuplicateRoleRows: queue.roles.length - queueRoleKeys.size,
  queueRoleKeysOutsideRequiredMatrix: queueRoleKeysOutsideRequiredMatrix.length,
  separatesCompletionDirections: completionRoleKeys.size,
  separatesCompletionDirectionsQueued: queuedCompletionRoleKeys.length,
  separatesCompletionDirectionsNotQueued: unqueuedCompletionRoleKeys.length,
  individuallyAcceptedIdentities:
    fullBankAudit.summary.individuallyAcceptedIdentities,
  reservedAcceptedIdentities: reservations.summary.totalReservedIdentities,
  unreservedAcceptedIdentities:
    fullBankAudit.summary.individuallyAcceptedIdentities -
    reservations.summary.totalReservedIdentities,
  activeNextLookMinimumNewIdentities:
    fullBankAudit.summary.activeNextLookMinimumNewIdentities,
  activeNextLookSlotAwareMinimumNewIdentities: categories.reduce(
    (total, entry) =>
      total + entry.activeNextLookSlotAwareMinimumNewIdentities,
    0,
  ),
  fullBankRequiredUniqueProductPlacements:
    fullBankAudit.summary.requiredUniquePlacements,
  fullBankMinimumNewIdentities:
    fullBankAudit.summary.minimumNewIdentitiesNeeded,
  weddingAndWeddingGuestExcluded: true,
  paidGenerationCallsMade: 0,
  uiIntegrated: false,
};

if (summary.activeNextLookRequiredRoleSlots !== 1088) {
  throw new Error(
    `Expected 1,088 active-next-look role slots, received ${summary.activeNextLookRequiredRoleSlots}.`,
  );
}
if (
  summary.productAssignedRoleSlots + summary.unresolvedRoleSlots !==
  summary.activeNextLookRequiredRoleSlots
) {
  throw new Error("Assigned and unresolved role accounting does not balance.");
}
if (
  summary.unreservedAcceptedIdentities !==
  summary.individuallyAcceptedIdentities - summary.reservedAcceptedIdentities
) {
  throw new Error(
    `Unreserved accepted identity accounting does not balance: ${summary.unreservedAcceptedIdentities}.`,
  );
}
if (summary.separatesCompletionDirections !== 204) {
  throw new Error("Expected 204 separates completion directions.");
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scope:
    "Men only; first complete look for every active family across 128 non-wedding scenario cells.",
  identityRule:
    "Every supplier identity is globally unique across all non-wedding men's scenarios, families and outfit positions; variants do not create a new identity.",
  interpretation:
    "Product-assigned requires a record in the controlling global reservation ledger; provisional evidence elsewhere is not assignment proof. Manual-CJ-queue means an unresolved role is explicitly tracked in the current logged-in browser queue. Sourcing-brief-not-queued means the role has a direction but no reserved identity and no current CJ queue row. Unreserved accepted inventory must be visually paired before any new sourcing; it is not auto-assigned by this audit.",
  summary,
  categories,
  families,
  scenarios: scenarioRows,
  unqueuedSeparatesCompletionDirections: completions.entries.filter((entry) =>
    unqueuedCompletionRoleKeys.includes(
      roleKey(entry.scenarioId, entry.family, entry.category),
    ),
  ),
  sources: inputPaths,
};

const categoryRows = categories
  .map(
    (entry) =>
      `| ${entry.label} | ${entry.activeNextLookRequiredRoleSlots} | ${entry.productAssignedRoleSlots} | ${entry.queuedUnresolvedRoleSlots} | ${entry.unqueuedUnresolvedRoleSlots} | ${entry.individuallyAcceptedIdentities} | ${entry.unreservedAcceptedIdentities} | ${entry.activeNextLookMinimumNewIdentities} | ${entry.activeNextLookSlotAwareMinimumNewIdentities} |`,
  )
  .join("\n");
const familyRows = families
  .map(
    (entry) =>
      `| ${entry.family} | ${entry.requiredRoleSlots} | ${entry.productAssignedRoleSlots} | ${entry.queuedUnresolvedRoleSlots} | ${entry.unqueuedUnresolvedRoleSlots} |`,
  )
  .join("\n");
const unqueuedCompletionRows = result.unqueuedSeparatesCompletionDirections
  .map(
    (entry) =>
      `| ${entry.scenarioId} | ${entry.occasion} | ${entry.season} | ${entry.budget} | ${entry.category} | ${entry.targetProduct.replaceAll("|", "\\|")} |`,
  )
  .join("\n");

const markdown = `# Active next-look sourcing backlog

This is the controlling local scale correction for the first complete men's look in every non-wedding UI family. It does not claim that the current ${summary.currentManualCjQueueRows}-row CJ queue covers the 128-scenario matrix.

- Required active-next-look product role slots: **${summary.activeNextLookRequiredRoleSlots}**
- Role slots with a scenario reservation: **${summary.productAssignedRoleSlots}**
- Unresolved role slots: **${summary.unresolvedRoleSlots}**
- Unresolved role slots represented in the current CJ queue: **${summary.queuedUnresolvedRoleSlots}**
- Unresolved role slots not represented in the current CJ queue: **${summary.unqueuedUnresolvedRoleSlots}**
- Current CJ queue: **${summary.currentManualCjQueueRows} rows / ${summary.currentManualCjQueueUniqueRoleSlots} unique role slots**
- Existing accepted product identities: **${summary.individuallyAcceptedIdentities}**
- Already reserved accepted identities: **${summary.reservedAcceptedIdentities}**
- Accepted identities still requiring visual outfit allocation: **${summary.unreservedAcceptedIdentities}**
- Category-capacity new-identity floor for the first-look matrix: **${summary.activeNextLookMinimumNewIdentities}**
- Slot-aware new-identity floor after honoring current reservations: **${summary.activeNextLookSlotAwareMinimumNewIdentities}**
- Full ten-look bank requirement: **${summary.fullBankRequiredUniqueProductPlacements} placements / ${summary.fullBankMinimumNewIdentities} additional identities at minimum**
- Wedding and Wedding Guest: **excluded**
- Paid Gemini/OpenAI generation calls in this audit: **0**
- AI Stylist UI integrated: **no**

## Correct work order

1. Visually pair the **${summary.unreservedAcceptedIdentities}** accepted, unreserved identities into compatible scenario-family roles; never auto-assign by category alone.
2. Keep the existing **${summary.queuedUnresolvedRoleSlots}** queued role slots as manual exact-CJ-page searches.
3. Add explicit queue coverage for the remaining **${summary.unqueuedUnresolvedRoleSlots}** unresolved role slots in controlled batches, preserving family identity so Suit shoes/bags/accessories are not conflated with Separates.
4. Approve complete outfits visually before reservation, refinement, background removal, or UI wiring.

## Category accounting

| Category | First-look roles | Product-assigned roles | Queued unresolved | Unqueued unresolved | Accepted identities | Accepted and unreserved | Category-capacity floor | Slot-aware floor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${categoryRows}

## Family accounting

| Family | First-look roles | Product-assigned roles | Queued unresolved | Unqueued unresolved |
|---|---:|---:|---:|---:|
${familyRows}

## Current queue coverage defect

The current queue now records \`family\` explicitly, so a product direction cannot silently satisfy both Separates and Suit/Tuxedo. Its remaining limitation is scope: it is the manually reviewed Budget-Friendly tranche, not the full 128-scenario sourcing program.

Only **${summary.separatesCompletionDirectionsQueued} of ${summary.separatesCompletionDirections}** explicit Separates completion directions have a queue role for the same scenario-family-category; **${summary.separatesCompletionDirectionsNotQueued}** remain unqueued.

| Scenario | Occasion | Season | Budget | Category | Unqueued exact styling direction |
|---|---|---|---|---|---|
${unqueuedCompletionRows}

No supplier import, Gemini/OpenAI generation, background removal, UI write, push or deployment is performed by this audit.
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDir, "backlog.json"), `${JSON.stringify(result, null, 2)}\n`),
  writeFile(path.join(outputDir, "BACKLOG.md"), markdown),
]);

console.log(JSON.stringify(summary, null, 2));
