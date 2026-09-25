#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/OLDER_OMITTED_OUTERWEAR_FULL_SOURCE_CORRECTIONS.md`;
const sourceCollection = "older-omitted-local-candidates";

const rejections = new Map([
  [
    "shopify_supplier:97d0fa66e0f0b15d1c75f32a5a86c1db3210eba1",
    "CLE-063 is a flat product-only khaki bomber with a fuzzy collar, sleeve patch, utility zip and visibly broad sleeves. It provides no worn shoulder, torso, sleeve-length or hem proof and reads as a generic supplier flight jacket rather than controlled modern outerwear.",
  ],
  [
    "shopify_supplier:a09789e253d99e246a5ec1964db4154eb9305f6a",
    "CLE-068 is a flat corduroy utility bomber with multiple bright zips, snap pockets and no worn fit proof. The broad body and sleeves cannot be trusted from this hollow product presentation.",
  ],
  [
    "shopify_supplier:b9007875eb65fea3bd88de9ad0a6b71ce38b23b6",
    "CLE-074 is a flat synthetic olive bomber with no worn shoulder, chest, body-length, sleeve or hem evidence. Its generic construction and visible neck label do not clear the Zara-led taste gate.",
  ],
  [
    "shopify_supplier:eb9f1ca89e42083379c0e262a20ac2c0b7df6d2d",
    "CLE-081 is a flat military-green corduroy bomber with broad gathered sleeves and no worn fit proof. The bulky sleeve volume and utility detailing are too uncertain for controlled outfit use.",
  ],
  [
    "shopify_supplier:0207913076417c4f3fc03599b3b2cc589b66c644",
    "CLE-085 is a flat dark-denim jacket with stark white contrast stitching, oversized patch pockets and no worn silhouette proof. The visual treatment is heavy and workwear-led rather than the clean modern denim layer required here.",
  ],
  [
    "shopify_supplier:a514a8da05fe246ab7a55950bbd761138973f084",
    "CLE-086 is shown on body, but the light-wash denim jacket has strongly dropped shoulders, broad sleeves and an oversized long torso. It recreates the uncontrolled outerwear volume the replacement bank is removing.",
  ],
  [
    "shopify_supplier:39129805d156a12a421fd64b66233122e09d62a7",
    "CLE-088 is a flat oversized light-wash denim jacket with a visibly dropped shoulder and very broad body. The source itself names and proves the baggy silhouette, so it fails the controlled-layer gate.",
  ],
  [
    "shopify_supplier:6fc1345a5afac5435b7b137404be37b0770de2f5",
    "CLE-089 is a flat pale denim jacket with a contrasting brown collar and no worn shoulder, chest, sleeve, body-length or hem proof. The washed finish and generic construction are not strong enough to justify an unproved silhouette.",
  ],
  [
    "shopify_supplier:77d31c1460181b8b51ba9beb2b5570891fae8920",
    "CLE-090 is visibly oversized on body, with an exaggerated lapel-like collar, dropped shoulders and long broad sleeves. The dramatic loose styling is incompatible with the controlled modern proportion gate.",
  ],
  [
    "shopify_supplier:b50b813f19e70580788dc58b1d3c0200845e5f6c",
    "CLE-091 is a flat dark-blue denim jacket with a long broad body, decorative rivet lines and no worn silhouette proof. It is too generic and structurally unproved to retain.",
  ],
  [
    "shopify_supplier:0b0026d57ef43627c967e2592a1523d683169666",
    "CLE-094 is a flat khaki shirt-jacket with an extra-long asymmetric hem, broad sleeves and oversized chest pockets. With no worn proof, its uncontrolled length and volume cannot support a modern outfit.",
  ],
  [
    "shopify_supplier:16979789931509ee789c04fefffd07da8162def5",
    "CLE-096 is a misclassified green striped knit cardigan rather than outerwear. Its hollow-torso source shows a visibly narrow waist and sleeves plus dated red, cream and black vertical striping, so it fails both category and taste gates.",
  ],
  [
    "shopify_supplier:31b3e47fddc26122c76c6ee3507b55b8ab91243f",
    "PRE-063 is a worn dark-gray fleece with visible vertical SPORT branding and a generic outdoor-uniform finish. The narrow dark presentation does not meet the requested modern fashion-led outerwear standard.",
  ],
  [
    "shopify_supplier:33d31748b8087e9593417b35db25cccf5f8023bf",
    "PRE-065 is a flat pale-gray cargo puffer with large patch pockets, multiple toggles and visible pseudo-brand chest text. It is bulky, logo-led and unproved on body.",
  ],
  [
    "shopify_supplier:3da72b4415a9def6f4f66e9e9fc5e5bfda3a926c",
    "PRE-071 is a flat sherpa-lined khaki puffer with dropped shoulders, very broad sleeves and no worn silhouette evidence. Its heavy crinkled volume is too uncontrolled for retention.",
  ],
  [
    "shopify_supplier:4d8999448b83e0cdd90a9a1b9590776cddcb35ac",
    "PRE-079 is a flat hooded green outdoor puffer with sleeve patches, long drawcords and visible OUTDOOR text. The busy branded construction and missing worn proof fail the clean-modern gate.",
  ],
  [
    "shopify_supplier:588b0118c8a036effadc80c4027c3144595968ab",
    "PRE-084 is a flat sage-gray puffer with visible chest lettering, bulky quilting and no worn fit proof. A product silhouette alone cannot establish controlled shoulder, torso, sleeve or hem behavior.",
  ],
  [
    "shopify_supplier:63f8844dfcf56e1be923418add8cf37728fffb0b",
    "PRE-089 is a flat dark-green hooded puffer with contrast white lining and zip tape. It has no worn silhouette proof and reads as generic bulky outdoor stock rather than a refined one-use layer.",
  ],
  [
    "shopify_supplier:6b52abff343f1111ea1b4465ec34cb4c99c79d7e",
    "PRE-090 is a flat dark dusty-blue puffer with oversized curved patch pockets, a high padded collar and no worn fit proof. The heavy volume and generic construction repeat the dark bulky outerwear problem.",
  ],
  [
    "shopify_supplier:7771fc177b9d3f64e54c30eb8b86fbfa738c0fb7",
    "PRE-092 is worn, but the white puffer is visibly boxy and carries prominent ADVANCED chest text. The logo-led generic streetwear construction does not clear the clean Zara-led taste gate.",
  ],
  [
    "shopify_supplier:858efc647d67f500a70a3b003ebc5d4d5376d421",
    "PRE-096 is a flat white padded vest with no worn shoulder, armhole, chest, torso-length or hem proof. The source cannot establish how the bulky sleeveless shape layers over a complete outfit.",
  ],
]);

const retained = new Map([
  [
    "shopify_supplier:4053ab1a30e1f7ad07258026caf87816c082c008",
    "Use the dusty-blue PRE-073 puffer once only for Winter Travel, Casual Everyday or Sports / Workout. Its worn source proves controlled shoulder width, regular torso volume, full sleeves and an upper-hip hem. It remains the S245 provisional outerwear hold; pair it with a controlled colored top, straight light bottom and low-profile weather-ready footwear, and do not add another bulky piece.",
  ],
  [
    "shopify_supplier:7d49a77c6a00bae512e0cf904b9b68d8402b81e9",
    "Use the light-khaki PRE-093 technical shell once only for Spring/Fall Sports / Workout, active Travel or rain-ready Casual Everyday. Its worn source proves a regular shoulder, clean straight body and upper-hip length. Pair it with a brighter base, controlled straight bottom and streamlined trainer; do not style it as Office, Date Night, Formal Evening or Resort tailoring.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const findTarget = (identity) =>
  manifest.entries.find(
    (candidate) =>
      candidate.identity === identity &&
      candidate.sourceCollection === sourceCollection,
  );

const reviewedRows = [];
let rejected = 0;
let retainedUpdated = 0;
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

for (const [identity, constraint] of retained) {
  const entry = findTarget(identity);
  if (!entry) throw new Error(`Missing retained target: ${identity}`);
  if (
    entry.status === "accept" &&
    Array.isArray(entry.constraints) &&
    entry.constraints.length === 1 &&
    entry.constraints[0] === constraint
  ) {
    alreadyApplied += 1;
    continue;
  }
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
  retainedUpdated += 1;
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

const olderOmittedSummary = manifest.summary.collectionCounts.find(
  (entry) => entry.sourceCollection === sourceCollection,
);
if (
  manifest.summary.statusCounts.accept !== 223 ||
  manifest.summary.statusCounts.reject !== 2905 ||
  olderOmittedSummary?.accept !== 12 ||
  olderOmittedSummary?.reject !== 163
) {
  throw new Error(
    `Unexpected post-audit counts: ${JSON.stringify({
      statusCounts: manifest.summary.statusCounts,
      olderOmittedSummary,
    })}`,
  );
}

if (rejected > 0 || retainedUpdated > 0) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (reviewedRows.length > 0) {
  reviewedRows.sort((left, right) =>
    left.reviewId.localeCompare(right.reviewId, undefined, { numeric: true }),
  );
  const tableRows = reviewedRows
    .map(
      (row) =>
        `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **${row.decision}** | ${row.judgment.replaceAll("|", "\\|")} | ${row.image} |`,
    )
    .join("\n");
  const qa = `# Older omitted outerwear full-source corrections

Status: complete one-by-one full-resolution review of all 23 remaining accepted outerwear records in the older omitted local-candidate collection. Wedding and Wedding Guest remain excluded and untouched.

## Result

- All 23 original 1000–1350 x 1333–1800 sources were opened individually.
- Twenty-one are rejected for flat-only fit evidence, uncontrolled volume, prominent text or patches, generic supplier construction, misclassification, or an oversized denim/puffer silhouette.
- Two remain accepted once: the worn dusty-blue PRE-073 puffer protected for S245 and the worn light-khaki PRE-093 technical shell for narrow active Travel, Sports / Workout or rain-ready Casual use.
- None of the 21 rejected identities appears in an approved outfit, active planning reservation or provisional scenario core.
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
      retainedUpdated,
      alreadyApplied,
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
