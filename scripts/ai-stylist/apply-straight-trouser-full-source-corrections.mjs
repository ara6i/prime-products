#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/STRAIGHT_TROUSER_FULL_SOURCE_CORRECTIONS.md`;

const rejections = new Map([
  [
    "shopify_supplier:00f657f5fb0ef1157e296ad9fa3404f0f0bd577d",
    "The 1350 x 1800 worn source shows a broad loose leg from thigh to hem and clear fabric puddling over both shoes. This is the baggy-bottom silhouette the rebuild explicitly excludes, not a controlled relaxed-straight jean.",
  ],
  [
    "shopify_supplier:bf7fa4e61eb13d0ac96cfca0028b90814633535c",
    "The only 1000 x 1000 source is a flat garment-only ivory jean with a visibly broad leg and no worn thigh, knee, hem or shoe-break proof. It cannot pass the controlled-straight silhouette gate.",
  ],
]);

const retained = new Map([
  [
    "shopify_supplier:2d404d28d11be77008250d5736f3877c185ccfe7",
    "Use the light-blue STR-023 jean once only for Spring or Summer Casual Everyday, Travel, daytime Date or a restrained casual Party. Its 1000 x 1500 worn source proves a clean straight leg, controlled thigh and full hem without puddling. Pair it with a compact regular or lightly relaxed top and low-profile footwear; never add a second oversized piece, bulky shoe or formal tailoring.",
  ],
  [
    "shopify_supplier:75a9c43d42d0852a63c2291928fa436c7dfbc823",
    "Use the vintage-blue STR-059 workwear jean once only for Casual Everyday, Weekend, Travel, Festival or active daytime styling. Its 1350 x 1800 worn source proves controlled thigh ease and a clean cuffed hem, but the side tool pocket excludes Office, Formal and polished Date use. Pair with a simple regular top and low-profile sneaker; no loose outer layer or second utility-heavy piece.",
  ],
  [
    "shopify_supplier:a105b728168f3b3d11d4c583d252240af3062227",
    "Use the deep-olive STR-069 chino once only for Spring or Fall Casual Everyday, Travel, creative Office or a daytime Date. Its 1350 x 1800 worn source proves a controlled relaxed taper and clean rolled hem. Pair with a light regular shirt, knit or compact layer and cream, tan, brown or muted-color footwear; never combine it with a baggy top, oversized outerwear or black-heavy palette.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const allRejectionsApplied = [...rejections].every(([identity, reason]) => {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  return entry?.status === "reject" && entry.reason === reason;
});
const allRetentionsApplied = [...retained].every(([identity, constraint]) => {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  return (
    entry?.status === "accept" &&
    Array.isArray(entry.constraints) &&
    entry.constraints.length === 1 &&
    entry.constraints[0] === constraint
  );
});

if (allRejectionsApplied && allRetentionsApplied) {
  console.log(
    JSON.stringify(
      {
        rejected: 0,
        retainedUpdated: 0,
        alreadyApplied: rejections.size + retained.size,
        qaPath,
        summary: manifest.summary,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const reviewedRows = [];

for (const [identity, reason] of rejections) {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  if (!entry) throw new Error(`Missing rejection target: ${identity}`);
  const prior = entry.selectedVariant;
  if (entry.status !== "accept" || !prior) {
    throw new Error(
      `Rejection target is not an accepted product with source evidence: ${identity} (${entry.status})`,
    );
  }
  reviewedRows.push({
    reviewId: prior.reviewId,
    title: prior.title,
    color: prior.color,
    decision: "reject",
    judgment: reason,
    image: prior.image,
  });
  entry.status = "reject";
  entry.reason = reason;
  delete entry.constraints;
  entry.selectedVariant = null;
}

for (const [identity, constraint] of retained) {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  if (!entry) throw new Error(`Missing retained target: ${identity}`);
  const selected = entry.selectedVariant;
  if (entry.status !== "accept" || !selected) {
    throw new Error(
      `Retained target is not an accepted product with source evidence: ${identity} (${entry.status})`,
    );
  }
  entry.constraints = [constraint];
  reviewedRows.push({
    reviewId: selected.reviewId,
    title: selected.title,
    color: selected.color,
    decision: "accept once",
    judgment: constraint,
    image: selected.image,
  });
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

const tableRows = reviewedRows
  .map(
    (row) =>
      `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **${row.decision}** | ${row.judgment.replaceAll("|", "\\|")} | ${row.image} |`,
  )
  .join("\n");
const qa = `# Straight and tailored trouser full-source corrections

Status: complete one-by-one full-resolution review of all five surviving accepted identities in the straight/tailored-trouser source collection. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Five sources were opened individually at 1000–1350 x 1000–1800.
- STR-004 is rejected for a visibly broad, puddled leg; STR-084 is rejected because its flat broad-leg source provides no worn silhouette proof.
- STR-023, STR-059 and STR-069 remain accepted exactly once with the use constraints below.
- Neither rejected identity appears in an approved outfit, active planning reservation or provisional core.
- No product was imported, refined, background-removed or integrated into the UI by this correction.

| Review ID | Product | Color | Decision | Full-source judgment | Original image |
|---|---|---|---|---|---|
${tableRows}
`;
await writeFile(qaPath, qa, "utf8");

console.log(
  JSON.stringify(
    {
      rejected: rejections.size,
      retainedUpdated: retained.size,
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
