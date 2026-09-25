#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/TAILORED_SHORT_FULL_SOURCE_CORRECTIONS.md`;

const rejections = new Map([
  [
    "shopify_supplier:bfbb044f3efe712b512df9251c60a88e9ded3084",
    "The 1350 x 1800 source proves this identity is a matching light-blue textured polo-and-shorts set, not a standalone bottom. Treating it as one shorts slot would misrepresent the sold product and could duplicate one supplier identity across two garment roles.",
  ],
  [
    "shopify_supplier:f750b31d46f489f0333b6f1c5c8eb365d824d365",
    "The 1350 x 1800 worn source shows a dark shiny navy short with a broad knee-length cut and generic dated presentation. It does not meet the modern, happier-color Zara-led gate.",
  ],
  [
    "shopify_supplier:a42161e9935fce9fc1afd03046053621c70ef15c",
    "The 1125 x 1500 source proves this identity is a matching dusty-pink shirt-and-shorts set, not a standalone bottom. It cannot be placed into one bottom slot without misrepresenting the product and identity-use semantics.",
  ],
  [
    "shopify_supplier:794e37299b82a5d3beae6b9aa304eb2516119885",
    "The 1350 x 1800 worn source shows a loose elastic-drawstring linen short falling to the knee with excess volume through the seat and leg. It reads as lounge-set styling, not a controlled modern tailored or Resort short.",
  ],
  [
    "shopify_supplier:15d99fe892fb4b18875db9be577aaeb178bba0fd",
    "The only 1350 x 1800 source is a flat khaki short with no worn waist, rise, thigh, length or leg-opening proof. It cannot pass the one-by-one silhouette gate.",
  ],
  [
    "shopify_supplier:b403185b6262eeb761995310623f2c018c6485a3",
    "The 1125 x 1500 worn source shows a stiff broad khaki Bermuda that reaches the knee and reads as dated dad-short tailoring. It is neither a clean above-knee modern short nor a controlled relaxed Resort silhouette.",
  ],
]);

const retained = new Map([
  [
    "shopify_supplier:5885f4c061597eb1156da3b9b4485892074cd9d8",
    "Use the light-khaki CLE-077 clean casual short once only for Spring or Summer Casual Everyday, Travel, daytime Date or relaxed Office. Its 1350 x 1800 worn source proves a controlled thigh and clean just-above-knee hem. Pair with a regular shirt, polo or compact knit and low-profile footwear; no oversized top, blazer-heavy formality or all-beige board.",
  ],
  [
    "shopify_supplier:8575f1ab5835288d4a116a8960cc6f1944d3f859",
    "Use the cool-taupe CLE-083 tailored short once only for Spring or Summer Office, Date Night, elevated Casual Everyday or Travel. Its 1920 x 1920 worn source proves a clean waistband, controlled straight leg and above-knee hem. Pair with sky blue, coral, sage, ivory or dusty-pink on top and a cream, tan or burgundy low-profile shoe; never create an all-taupe outfit.",
  ],
  [
    "shopify_supplier:b36f6a8959e78b9eb445c67e329084c879a8ca7f",
    "Use the olive-green CLE-094 technical side-zip short once only for Summer Sports / Workout, active Travel or a clean athletic Casual Everyday look. Its 1000 x 1500 worn source proves a controlled above-knee performance fit. Keep it with a light technical top and streamlined trainer; never use it for Office, Formal Evening, Suit/Tuxedo, Wedding or Wedding Guest styling. This identity is already used once in approved S137 look 1 and cannot appear again.",
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
const qa = `# Tailored-short full-source corrections

Status: complete one-by-one full-resolution review of all nine surviving accepted identities in the clean/tailored-short source collection. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Nine sources were opened individually at 1000–1920 x 1500–1920.
- Six identities are rejected for set misclassification, dated or loose knee-length shape, or missing worn fit proof.
- CLE-077, CLE-083 and CLE-094 remain accepted exactly once with the use constraints below.
- CLE-094 is already used once in approved S137 look 1. None of the six rejected identities appears in an approved outfit, active planning reservation or provisional core.
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
