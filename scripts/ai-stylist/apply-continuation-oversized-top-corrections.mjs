#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/CONTINUATION_OVERSIZED_TOP_CORRECTIONS.md`;

const rejections = new Map([
  [
    "shopify_supplier:5c758ac61260c421f746e98c9c2f2e01b4ade9d0",
    "The full 1350 x 1800 worn source proves a strongly dropped shoulder, broad boxy torso, ballooned sleeves and a long rounded hem. The washed light-green color is useful, but the silhouette is an oversized rugby-style top and fails the requested controlled Zara-led proportion.",
  ],
  [
    "shopify_supplier:7c40cbcdae439432e35573190c8d60bfd6d86d7e",
    "The full 1350 x 1800 worn source proves a very dropped shoulder, extra-wide sleeve, broad torso and long upper-thigh hem. The pale orange wash is attractive, but this is the loose oversized T-shirt silhouette the men's rebuild is removing.",
  ],
  [
    "shopify_supplier:23fad7d8c89e1ea3b24c130f572debc4d738ed9e",
    "The full 1350 x 1800 worn source proves a heavily dropped shoulder, very broad chest and long tunic-like body below the hip. The burnt-coral color is strong, but the cut directly repeats the oversized-top problem and does not clear the catalog taste gate.",
  ],
]);

const statuses = ["reject", "accept", "conditional", "duplicate-existing"];
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const reviewedRows = [];
let rejected = 0;
let alreadyApplied = 0;

for (const [identity, reason] of rejections) {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  if (!entry) throw new Error(`Missing correction target: ${identity}`);
  if (entry.status === "reject" && entry.reason === reason) {
    alreadyApplied += 1;
    continue;
  }
  if (entry.status !== "accept" || !entry.selectedVariant) {
    throw new Error(
      `Correction target is not an accepted product with source evidence: ${identity} (${entry.status})`,
    );
  }

  const prior = entry.selectedVariant;
  reviewedRows.push({
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
  rejected += 1;
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
  reviewedRows.sort((left, right) => left.reviewId.localeCompare(right.reviewId));
  const rows = reviewedRows
    .map(
      (row) =>
        `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **reject** | ${row.reason.replaceAll("|", "\\|")} | ${row.image} |`,
    )
    .join("\n");
  const qa = `# Continuation oversized-top corrections

Status: complete full-resolution visual correction of three previously accepted but unused men's tops. Wedding and Wedding Guest remain excluded and untouched.

## Result

- All three 1350 x 1800 worn sources were opened and inspected individually.
- All three are rejected from the accepted catalog because their dropped shoulders, broad bodies and long hems recreate the oversized-top failure the user explicitly asked to remove.
- None was present in an approved outfit, active planning reservation or provisional scenario hold.
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
      alreadyApplied,
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
