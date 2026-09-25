#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/CONTINUATION_WIDE_BOTTOM_CORRECTIONS.md`;

const reviewed = [
  {
    identity: "shopify_supplier:bd9eb3e71ff44da3314d188440d5608833ddeaae",
    decision: "reject",
    reason:
      "Only an isolated product image exists. It shows a balloon-taper corduroy trouser with deep pleats, a very broad seat and thigh, rolled cuffs and no worn proof of rise, drape or shoe break. The useful army-green color cannot clear the visual-fit gate without on-body evidence.",
  },
  {
    identity: "shopify_supplier:04d7241016fbcf860f5b98ce77b100cd3efa1689",
    decision: "reject",
    reason:
      "The full worn source proves a broad cotton leg that falls past the shoe and visibly folds and pools over chunky trainers. The camel color is versatile, but the lower-half volume reproduces the baggy-bottom silhouette the rebuild is removing.",
  },
  {
    identity: "shopify_supplier:2ee1a0fbc1261c590f394c7d2529549fd8a033c9",
    decision: "reject",
    reason:
      "The full worn source proves a very broad navy leg with excess length stacking across both sneakers. The dark color, wide tube shape and puddled hem directly repeat the bottom-heavy styling the user rejected.",
  },
  {
    identity: "shopify_supplier:016b87eb18f5b657fbd748be0e0957a9a1fba10c",
    decision: "retain",
    reason:
      "Despite the supplier's wide-leg title, the worn source shows a controlled straight ribbed leg with a clean ankle break and no pooling. Retain it once for warm-weather Resort, Travel or relaxed Casual styling with a compact regular top; the elastic drawstring waist prevents Office, Formal or Luxury use.",
  },
];

const statuses = ["reject", "accept", "conditional", "duplicate-existing"];
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const reportRows = [];
let rejected = 0;
let retained = 0;
let alreadyApplied = 0;

for (const review of reviewed) {
  const entry = manifest.entries.find(
    (candidate) => candidate.identity === review.identity,
  );
  if (!entry) throw new Error(`Missing correction target: ${review.identity}`);

  if (review.decision === "reject") {
    if (entry.status === "reject" && entry.reason === review.reason) {
      alreadyApplied += 1;
      continue;
    }
    if (entry.status !== "accept" || !entry.selectedVariant) {
      throw new Error(
        `Correction target is not an accepted product with source evidence: ${review.identity} (${entry.status})`,
      );
    }

    const prior = entry.selectedVariant;
    reportRows.push({
      reviewId: prior.reviewId,
      title: prior.title,
      color: prior.color,
      image: prior.image,
      decision: review.decision,
      reason: review.reason,
    });
    entry.status = "reject";
    entry.reason = review.reason;
    delete entry.constraints;
    entry.selectedVariant = null;
    rejected += 1;
    continue;
  }

  if (entry.status !== "accept" || !entry.selectedVariant) {
    throw new Error(
      `Retained target is not an accepted product with source evidence: ${review.identity} (${entry.status})`,
    );
  }
  reportRows.push({
    reviewId: entry.selectedVariant.reviewId,
    title: entry.selectedVariant.title,
    color: entry.selectedVariant.color,
    image: entry.selectedVariant.image,
    decision: review.decision,
    reason: review.reason,
  });
  retained += 1;
}

const usableEntries = manifest.entries.filter((entry) =>
  ["accept", "conditional"].includes(entry.status),
);
const usableGroups = Map.groupBy(usableEntries, (entry) => entry.identity);
manifest.generatedAt = new Date().toISOString();
manifest.summary = {
  reviewDecisionRows: manifest.entries.length,
  uniqueIdentitiesReviewed: new Set(manifest.entries.map((entry) => entry.identity)).size,
  usableUniqueIdentities: new Set(usableEntries.map((entry) => entry.identity)).size,
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
        conditional: entries.filter((entry) => entry.status === "conditional").length,
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

if (rejected > 0) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  reportRows.sort((left, right) => left.reviewId.localeCompare(right.reviewId));
  const rows = reportRows
    .map(
      (row) =>
        `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **${row.decision}** | ${row.reason.replaceAll("|", "\\|")} | ${row.image} |`,
    )
    .join("\n");
  const qa = `# Continuation wide-bottom corrections

Status: complete full-source visual review of four previously accepted but unused men's bottoms. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Four source images were opened and judged individually rather than by supplier title.
- Three products are removed because they are unproven, baggy or visibly puddled.
- One ribbed green trouser remains accepted because the worn source proves a controlled straight leg and clean break despite its supplier title; its drawstring construction limits it to relaxed warm-weather scenarios.
- None of the four appears in an approved outfit, active planning reservation or provisional scenario hold.
- No product was imported, refined, background-removed or integrated into the UI by this correction.

| Review ID | Product | Color | Decision | Full-source judgment | Original image |
|---|---|---|---|---|---|
${rows}
`;
  await writeFile(qaPath, qa, "utf8");
}

console.log(
  JSON.stringify(
    {
      rejected,
      retained,
      alreadyApplied,
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
