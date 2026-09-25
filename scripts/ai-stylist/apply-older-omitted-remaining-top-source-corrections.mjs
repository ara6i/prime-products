#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/OLDER_OMITTED_REMAINING_TOP_FULL_SOURCE_CORRECTIONS.md`;
const sourceCollection = "older-omitted-local-candidates";

const rejections = new Map([
  [
    "shopify_supplier:275a738cb5f88c0828e599c51834fe10db3ae6e3",
    "PRE-067 is a hollow-torso product image rather than a worn fit. The long straight body, sleeve behavior and hem cannot be verified, while the gray-blue waffle quarter-zip and orange zipper trim read generic golf base layer rather than modern Zara-led knitwear.",
  ],
  [
    "shopify_supplier:2b78e1fc6772718aea0cd62c78cf3c7e19756184",
    "PRE-069 is shown only in a dark cropped gym portrait that hides the body length and hem. The bright cobalt tank carries visible MUSCLE-branded chest text and reads bodybuilding merchandise rather than clean outfit-ready activewear.",
  ],
  [
    "shopify_supplier:6d5c0d0f4d4a440fba9d1e6999216f8d6001f421",
    "PRE-079 is a visibly body-hugging bodybuilding tank with a chest logo and tight armholes. It recreates the compression-top proportion the men's rebuild explicitly excludes.",
  ],
  [
    "shopify_supplier:7e1ba5ac12ef1818d5f4d4e8e496393b0de709e4",
    "PRE-082 proves a regular worn fit, but the long side-split body and oversized tilted chest patch make it an ordinary supplier basic rather than a Zara- or Fear-of-God-level T-shirt. It does not clear the user's taste gate.",
  ],
  [
    "shopify_supplier:9545b4e9495fdd3def2212cef328ff0e2088b440",
    "PRE-092 proves an extremely dropped shoulder, very broad body, stacked sleeves and large kangaroo pocket. The light-blue waffle hoodie is exactly the loose-on-loose oversized shape the replacement outfits must avoid.",
  ],
  [
    "shopify_supplier:a007c50a9a442f6dba3d983c9e50f0e2859bbca9",
    "PRE-094 is a flat product-only performance T-shirt with no worn shoulder, chest, sleeve, length or hem proof. Repeated RUNNING text inside the collar and generic synthetic construction also fail the clean modern styling gate.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const findTarget = (identity) =>
  manifest.entries.find(
    (candidate) =>
      candidate.identity === identity && candidate.sourceCollection === sourceCollection,
  );

const reviewedRows = [];
let rejected = 0;
let alreadyApplied = 0;
for (const [identity, reason] of rejections) {
  const entry = findTarget(identity);
  if (!entry) throw new Error(`Missing rejection target: ${identity}`);
  if (entry.status === "reject" && entry.reason === reason) {
    alreadyApplied += 1;
    continue;
  }
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
  rejected += 1;
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

if (rejected > 0) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  reviewedRows.sort((left, right) =>
    left.reviewId.localeCompare(right.reviewId, undefined, { numeric: true }),
  );
  const tableRows = reviewedRows
    .map(
      (row) =>
        `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **${row.decision}** | ${row.judgment.replaceAll("|", "\\|")} | ${row.image} |`,
    )
    .join("\n");
  const qa = `# Older omitted remaining-top full-source corrections

Status: complete one-by-one full-resolution review of the six remaining accepted top records in the older omitted local-candidate collection. Wedding and Wedding Guest remain excluded and untouched.

## Result

- All six original 1000–1350 x 1333–1800 sources were opened individually.
- All six are rejected: two lack any worn proof, two are logo-led bodybuilding tanks, one is an ordinary long pocket tee below the requested taste bar, and one is visibly oversized.
- None appears in an approved outfit, active planning reservation or provisional scenario core.
- No product was imported, refined, background-removed or integrated into the UI by this correction.

| Review ID | Product | Color | Decision | Full-source judgment | Original image |
|---|---|---|---|---|---|
${tableRows}
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
