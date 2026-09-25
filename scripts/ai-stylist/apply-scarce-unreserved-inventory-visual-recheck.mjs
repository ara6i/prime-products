#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const manifestPath = path.join(reportRoot, "visual-identity-decisions.json");
const reservationPath = path.join(reportRoot, "global-product-reservation-ledger.json");
const recheckPath = path.join(
  repoRoot,
  "scripts/ai-stylist/scarce-unreserved-inventory-visual-recheck.json",
);
const reportPath = path.join(reportRoot, "SCARCE_UNRESERVED_INVENTORY_RECHECK.md");

const [manifest, reservations, recheck] = await Promise.all(
  [manifestPath, reservationPath, recheckPath].map(async (filePath) =>
    JSON.parse(await readFile(filePath, "utf8")),
  ),
);

const reservedIdentities = new Set(
  reservations.reservations.map((entry) => String(entry.productKey).toLowerCase()),
);
const manifestByIdentity = new Map(
  manifest.entries.map((entry) => [String(entry.identity).toLowerCase(), entry]),
);

const identities = recheck.entries.map((entry) => entry.identity.toLowerCase());
if (new Set(identities).size !== identities.length) {
  throw new Error("Scarce-inventory recheck contains a duplicate identity.");
}
if (recheck.entries.length !== 18) {
  throw new Error(`Expected 18 scarce unreserved products, received ${recheck.entries.length}.`);
}

let rejected = 0;
let retained = 0;
for (const decision of recheck.entries) {
  const identity = decision.identity.toLowerCase();
  if (reservedIdentities.has(identity)) {
    throw new Error(`Cannot recheck reserved identity as unreserved: ${identity}`);
  }
  const entry = manifestByIdentity.get(identity);
  if (!entry) throw new Error(`Missing accepted manifest identity: ${identity}`);
  if (decision.decision === "reject-after-closer-visual-review") {
    if (entry.status !== "accept" && entry.status !== "reject") {
      throw new Error(`Unexpected status for rejected recheck ${identity}: ${entry.status}`);
    }
    entry.status = "reject";
    entry.reason = decision.reason;
    entry.constraints = [decision.reason];
    rejected += 1;
  } else if (decision.decision === "retain-for-complete-outfit-pairing") {
    if (entry.status !== "accept") {
      throw new Error(`Retained recheck identity is not accepted: ${identity}`);
    }
    retained += 1;
  } else {
    throw new Error(`Unknown scarce-inventory decision: ${decision.decision}`);
  }
}

const statuses = ["reject", "accept", "conditional", "duplicate-existing"];
const statusCounts = Object.fromEntries(
  statuses.map((status) => [
    status,
    manifest.entries.filter((entry) => entry.status === status).length,
  ]),
);
const usableEntries = manifest.entries.filter(
  (entry) => entry.status === "accept" || entry.status === "conditional",
);
const usableGroups = Map.groupBy(usableEntries, (entry) => entry.identity);
const collectionCounts = [...new Set(manifest.entries.map((entry) => entry.sourceCollection))]
  .sort()
  .map((sourceCollection) => {
    const entries = manifest.entries.filter(
      (entry) => entry.sourceCollection === sourceCollection,
    );
    return {
      sourceCollection,
      identities: new Set(entries.map((entry) => entry.identity)).size,
      accept: entries.filter((entry) => entry.status === "accept").length,
      conditional: entries.filter((entry) => entry.status === "conditional").length,
      reject: entries.filter((entry) => entry.status === "reject").length,
      duplicateExisting: entries.filter(
        (entry) => entry.status === "duplicate-existing",
      ).length,
    };
  });

manifest.generatedAt = new Date().toISOString();
manifest.summary = {
  reviewDecisionRows: manifest.entries.length,
  uniqueIdentitiesReviewed: new Set(manifest.entries.map((entry) => entry.identity)).size,
  usableUniqueIdentities: new Set(usableEntries.map((entry) => entry.identity)).size,
  statusCounts,
  collectionCounts,
  duplicateUsableIdentities: [...usableGroups.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([identity, entries]) => ({
      identity,
      rows: entries.map((entry) => ({
        sourceCollection: entry.sourceCollection,
        sourceReviewIds: entry.sourceReviewIds,
        status: entry.status,
      })),
    })),
};

if (rejected !== 5 || retained !== 13) {
  throw new Error(`Expected 5 rejected and 13 retained; received ${rejected} and ${retained}.`);
}
if (manifest.summary.duplicateUsableIdentities.length !== 0) {
  throw new Error("Usable identity duplication appeared after the scarce-inventory recheck.");
}

const rows = recheck.entries
  .map(
    (entry, index) =>
      `| ${index + 1} | ${entry.category} | ${entry.identity} | **${entry.decision}** | ${entry.reason.replaceAll("|", "\\|")} |`,
  )
  .join("\n");
const markdown = `# Scarce unreserved inventory — one-by-one visual recheck

Reviewed: ${recheck.reviewedAt}

- Exact accepted-but-unreserved product images reviewed: **${recheck.entries.length}**
- Retained only for later complete-outfit pairing: **${retained}**
- Rejected after closer Zara-led visual review: **${rejected}**
- Product identities reserved by this review: **0**
- Complete outfits approved by this review: **0**
- Paid Gemini/OpenAI generation calls: **0**
- Wedding and Wedding Guest: **excluded**
- AI Stylist UI integrated: **no**

Retained products still require season, occasion, budget, color, silhouette and full-board approval. Rejected products remain in the evidence ledger for provenance but are removed from the usable accepted pool.

| # | Category | Identity | Decision | Visual reason |
|---:|---|---|---|---|
${rows}
`;

await Promise.all([
  writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  writeFile(reportPath, markdown, "utf8"),
]);

console.log(
  JSON.stringify(
    {
      reviewed: recheck.entries.length,
      retained,
      rejected,
      usableUniqueIdentities: manifest.summary.usableUniqueIdentities,
      statusCounts: manifest.summary.statusCounts,
      reportPath,
    },
    null,
    2,
  ),
);
