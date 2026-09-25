#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/PRODUCT_ONLY_MOCK_NECK_SOURCE_CORRECTIONS.md`;

const corrections = new Map([
  [
    "shopify_supplier:a4ba640f0d727e85cf2170649f134bc2d34d3552",
    "The only full-resolution source is a flat garment-only image. It does not prove the mock-neck T-shirt's shoulder position, chest ease, torso width, body length or hem behavior, so it cannot pass the one-by-one silhouette gate. Its stored constraint incorrectly described a cool-taupe Bermuda short and is removed with the acceptance.",
  ],
  [
    "shopify_supplier:da767e27d71701e7343c7a356396e5a5e90d680d",
    "The only full-resolution source is a flat garment-only image. It does not prove the mock-neck T-shirt's shoulder position, chest ease, torso width, body length or hem behavior, so it cannot pass the one-by-one silhouette gate. Its stored constraint incorrectly described a deep-olive travel chino and is removed with the acceptance.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const correctionsAlreadyApplied = [...corrections].every(([identity, reason]) => {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  return entry?.status === "reject" && entry.reason === reason;
});

if (correctionsAlreadyApplied) {
  console.log(
    JSON.stringify(
      {
        corrected: 0,
        alreadyApplied: corrections.size,
        qaPath,
        summary: manifest.summary,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const correctedRows = [];

for (const [identity, reason] of corrections) {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  if (!entry) throw new Error(`Missing correction target: ${identity}`);

  const prior = entry.selectedVariant;
  if (entry.status !== "accept" || !prior) {
    throw new Error(
      `Correction target is not an accepted product with source evidence: ${identity} (${entry.status})`,
    );
  }

  correctedRows.push({
    identity,
    reviewId: prior.reviewId,
    title: prior.title,
    color: prior.color,
    image: prior.image,
    reason,
  });
  entry.status = "reject";
  entry.reason = reason;
  delete entry.constraints;
  entry.selectedVariant = null;
}

const statuses = ["reject", "accept", "conditional", "duplicate-existing"];
const usableEntries = manifest.entries.filter((entry) =>
  ["accept", "conditional"].includes(entry.status),
);
const usableGroups = Map.groupBy(usableEntries, (entry) => entry.identity);
manifest.generatedAt = new Date().toISOString();
manifest.summary = {
  reviewDecisionRows: manifest.entries.length,
  uniqueIdentitiesReviewed: new Set(
    manifest.entries.map((entry) => entry.identity),
  ).size,
  usableUniqueIdentities: new Set(
    usableEntries.map((entry) => entry.identity),
  ).size,
  statusCounts: Object.fromEntries(
    statuses.map((status) => [
      status,
      manifest.entries.filter((entry) => entry.status === status).length,
    ]),
  ),
  collectionCounts: [
    ...new Set(manifest.entries.map((entry) => entry.sourceCollection)),
  ]
    .sort()
    .map((collection) => {
      const entries = manifest.entries.filter(
        (entry) => entry.sourceCollection === collection,
      );
      return {
        sourceCollection: collection,
        identities: new Set(entries.map((entry) => entry.identity)).size,
        accept: entries.filter((entry) => entry.status === "accept").length,
        conditional: entries.filter((entry) => entry.status === "conditional")
          .length,
        reject: entries.filter((entry) => entry.status === "reject").length,
        duplicateExisting: entries.filter(
          (entry) => entry.status === "duplicate-existing",
        ).length,
      };
    }),
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

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const tableRows = correctedRows
  .map(
    (row) =>
      `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **reject** | ${row.reason.replaceAll("|", "\\|")} | ${row.image} |`,
  )
  .join("\n");
const qa = `# Product-only mock-neck source corrections

Status: complete one-by-one full-resolution source correction for two formerly accepted men's top identities. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Two garment-only mock-neck T-shirts were reopened at 1350 x 1800.
- Both are rejected globally because neither image proves the on-body silhouette required by the catalog gate.
- Both records also contained constraints for unrelated bottoms; those mismatched constraints were removed rather than rewritten into unsupported approvals.
- No complete approved outfit, active planning reservation or current provisional core uses either identity.
- No product was imported, refined, background-removed or integrated into the UI by this correction.

| Review ID | Product | Color | Decision | Source judgment | Original image |
|---|---|---|---|---|---|
${tableRows}
`;
await writeFile(qaPath, qa, "utf8");

console.log(
  JSON.stringify(
    {
      corrected: correctedRows.length,
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
