#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const decisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const reservationLedger = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const outputJsonPath = path.join(reportRoot, "provisional-front-runner-ledger.json");
const outputMarkdownPath = path.join(reportRoot, "PROVISIONAL_FRONT_RUNNER_LEDGER.md");

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByIdentity = new Map(
  reservationLedger.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);

async function walkJsonFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkJsonFiles(fullPath)));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(fullPath);
  }
  return files;
}

function slotFromKey(key) {
  return key
    .replace(/^visualFrontRunner/, "")
    .replace(/Identity$/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase() || "unspecified";
}

const holds = [];
for (const filePath of await walkJsonFiles(reportRoot)) {
  if (filePath === outputJsonPath) continue;
  let document;
  try {
    document = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    continue;
  }
  if (!document || Array.isArray(document) || typeof document !== "object") continue;
  for (const [key, value] of Object.entries(document)) {
    if (!/^visualFrontRunner.*Identity$/.test(key) || !value) continue;
    const identity = String(value).toLowerCase();
    const existingReservation = reservationByIdentity.get(identity);
    if (
      existingReservation &&
      existingReservation.scenarioId === document.scenarioId
    ) {
      continue;
    }
    const accepted = acceptedByIdentity.get(identity);
    const candidate = Array.isArray(document.candidates)
      ? document.candidates.find(
          (entry) => String(entry.identity ?? entry.productKey ?? "").toLowerCase() === identity,
        )
      : null;
    holds.push({
      identity,
      scenarioId: document.scenarioId ?? null,
      occasion: document.occasion ?? null,
      season: document.season ?? null,
      budget: document.budget ?? null,
      slot: slotFromKey(key),
      name: candidate?.name ?? accepted?.selectedVariant?.garmentType ?? null,
      garmentType: candidate?.garmentType ?? accepted?.selectedVariant?.garmentType ?? null,
      color: candidate?.color ?? accepted?.selectedVariant?.color ?? null,
      sourceSpec: path.relative(reportRoot, filePath),
      sourceStatus: document.status ?? null,
      acceptedCatalogIdentity: Boolean(accepted),
      reservationCollision: reservationByIdentity.has(identity),
      state: "visual-front-runner-not-selected-or-reserved",
    });
  }
}

holds.sort((a, b) =>
  `${a.scenarioId}:${a.slot}:${a.identity}`.localeCompare(`${b.scenarioId}:${b.slot}:${b.identity}`),
);
const identityCounts = new Map();
for (const hold of holds) {
  identityCounts.set(hold.identity, (identityCounts.get(hold.identity) ?? 0) + 1);
}
const repeatedIdentities = [...identityCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([identity, count]) => ({ identity, count }));
const reservationCollisions = holds
  .filter((hold) => hold.reservationCollision)
  .map((hold) => ({
    identity: hold.identity,
    provisionalScenarioId: hold.scenarioId,
    reservedScenarioId: reservationByIdentity.get(hold.identity)?.scenarioId ?? null,
  }));
const missingAcceptedIdentities = holds
  .filter((hold) => !hold.acceptedCatalogIdentity)
  .map((hold) => hold.identity);
const weddingHolds = holds.filter((hold) =>
  ["Wedding", "Wedding Guest"].includes(String(hold.occasion)),
);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  stateRule:
    "A provisional front-runner is visually preferred for one incomplete scenario but is not selected, reserved, outfit-approved, or UI-integrated.",
  identityRule:
    "One supplier-product identity may be provisionally held by at most one non-wedding scenario and may not collide with the controlling reservation ledger.",
  summary: {
    provisionalFrontRunnerHolds: holds.length,
    distinctIdentities: identityCounts.size,
    scenarios: new Set(holds.map((hold) => hold.scenarioId)).size,
    repeatedIdentities: repeatedIdentities.length,
    reservationCollisions: reservationCollisions.length,
    missingAcceptedIdentities: missingAcceptedIdentities.length,
    weddingOrWeddingGuestHolds: weddingHolds.length,
    selectedProducts: 0,
    approvedOutfitsAdded: 0,
    uiIntegrated: false,
  },
  holds,
  repeatedIdentities,
  reservationCollisions,
  missingAcceptedIdentities,
  weddingHolds,
};

const markdown = [
  "# Provisional visual front-runner ledger",
  "",
  "These products are visually preferred for incomplete local scenario drafts. They are uniqueness holds only: they are not selected, reserved, outfit-approved, or UI-integrated.",
  "",
  `- Provisional holds: ${result.summary.provisionalFrontRunnerHolds}`,
  `- Distinct identities: ${result.summary.distinctIdentities}`,
  `- Scenarios: ${result.summary.scenarios}`,
  `- Repeated identities: ${result.summary.repeatedIdentities}`,
  `- Reservation collisions: ${result.summary.reservationCollisions}`,
  `- Missing accepted identities: ${result.summary.missingAcceptedIdentities}`,
  `- Wedding / Wedding Guest holds: ${result.summary.weddingOrWeddingGuestHolds}`,
  "",
  "| Scenario | Slot | Identity | Product | Color | Source state |",
  "| --- | --- | --- | --- | --- | --- |",
  ...holds.map(
    (hold) =>
      `| ${hold.scenarioId} | ${hold.slot} | ${hold.identity} | ${hold.garmentType ?? hold.name ?? "-"} | ${hold.color ?? "-"} | ${hold.sourceStatus ?? "-"} |`,
  ),
  "",
].join("\n");

await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(outputMarkdownPath, markdown);

if (
  repeatedIdentities.length ||
  reservationCollisions.length ||
  missingAcceptedIdentities.length ||
  weddingHolds.length
) {
  throw new Error("Provisional front-runner uniqueness validation failed");
}

console.log(
  JSON.stringify(
    {
      outputJsonPath,
      outputMarkdownPath,
      ...result.summary,
    },
    null,
    2,
  ),
);
