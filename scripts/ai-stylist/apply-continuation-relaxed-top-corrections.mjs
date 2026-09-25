#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/CONTINUATION_RELAXED_TOP_CORRECTIONS.md`;

const reviewed = [
  {
    identity: "shopify_supplier:6e957afe8af083c4d271deacbc7c2860306da68f",
    decision: "reject",
    reason:
      "The full worn source proves an extremely dropped shoulder, very broad torso, elbow-length wide sleeve and long low-hip hem, while the source styling repeats the volume with matching loose sweat bottoms. The washed tangerine is cheerful, but this is uncontrolled set-led streetwear rather than the clean Zara-led proportion required for the catalog.",
  },
  {
    identity: "shopify_supplier:bd7d3b2b02cde5cdc39ecb6fb8973b884734d91b",
    decision: "reject",
    reason:
      "The full worn source proves a strongly dropped shoulder, broad box torso, elbow-length sleeves and a long low-hip hem. The centered STUDIO ARTHUR pseudo-brand mark and generic sweatshirt-neck insert further weaken the clean retail finish, so this no longer clears the modern Zara/Fear-of-God taste gate.",
  },
  {
    identity: "shopify_supplier:8be044b2ef75a018352c5bfc03846f0fecbb1fce",
    decision: "reject",
    reason:
      "The worn raglan silhouette is more controlled than the rejected oversized tees, but the visible centered REGRESS pseudo-brand wordmark, flat coffee fleece and generic kangaroo construction read weak supplier merchandise rather than a clean Zara-led hoodie. It is removed on product-quality grounds, not merely because the color is dark.",
  },
  {
    identity: "shopify_supplier:40a4127a4b2d81c1f79ac40c43b11901a63a0fc5",
    decision: "retain",
    reason:
      "The full worn source shows an intentional cream corduroy overshirt with useful texture, clean black snaps and coherent utility pockets. Keep it once only as the outfit's single relaxed layer for Casual, Travel, Campus, creative Office or a daytime Date; do not promote it to Luxury/Formal or combine it with another broad garment.",
  },
  {
    identity: "shopify_supplier:9e0be1e250cffee32747e83b7d1d0160e0d37209",
    decision: "retain",
    reason:
      "The washed camel tee is deliberately relaxed but visually coherent and Fear-of-God-adjacent rather than skinny or randomly baggy. Keep it for one low-key warm-weather Casual, Travel, Campus or Weekend look with a sharply controlled straight or tapered bottom and light minimal footwear; never pair it with another oversized piece or a muddy all-brown palette.",
  },
  {
    identity: "shopify_supplier:bf5653fbb1b32070c69c18db1553299a16569098",
    decision: "retain",
    reason:
      "The coffee heavyweight-look tee has a clean unbranded surface, deliberate drape and a controlled relaxed line suitable for one Fear-of-God-adjacent look. Keep it only with a crisp straight or tailored light bottom and low-profile footwear; it cannot be combined with a loose bottom, oversized layer or head-to-toe dark palette.",
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
      identity: review.identity,
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
    identity: review.identity,
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
  const qa = `# Continuation relaxed-top corrections

Status: complete full-source visual review of six previously accepted but unused men's tops. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Six worn source images were opened and judged individually rather than by title or catalog tags.
- Three products are removed: one uncontrolled matching-set tee and two pseudo-brand tops that fail the clean retail-quality gate.
- Three products remain accepted with narrow one-use rules because their relaxed volume is deliberate and can support a modern Zara/Fear-of-God-adjacent outfit when the companion pieces are controlled.
- None of the six appears in an approved outfit, active planning reservation or provisional scenario hold.
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
