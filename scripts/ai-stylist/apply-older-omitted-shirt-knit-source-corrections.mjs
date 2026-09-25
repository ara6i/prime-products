#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/OLDER_OMITTED_SHIRT_KNIT_FULL_SOURCE_CORRECTIONS.md`;
const sourceCollection = "older-omitted-local-candidates";

const rejections = new Map([
  [
    "shopify_supplier:2950c7b291a65a0052cf1680b5ad6cc594a5c5f9",
    "CLE-071 has only a hanger image over a separate T-shirt. The shiny lake-blue cloth, tiny novelty embroidery and unproven shoulder, torso and hem make it weaker than the retained worn sky-blue layer.",
  ],
  [
    "shopify_supplier:39f746168a6eba152e16f3f9733331ed7675b2bf",
    "CLE-096 has only a hanger image over a separate T-shirt. Its salmon-brown crinkle surface, pocket label and missing body-fit proof do not support a modern one-use Summer shirt.",
  ],
  [
    "shopify_supplier:696e2d08fa20656b30ab563e2144d6dc8e7f86bd",
    "CLE-087 has only a hanger image over a separate T-shirt. The shiny white cloth, bamboo embroidery and large patch pocket read novelty-led, while the shoulder, chest and hem are unproven.",
  ],
  [
    "shopify_supplier:265196dcf26920353149332f3431dcd76cd34b95",
    "CLE-069 has only a hanger image over a separate T-shirt. The pale beige vertical texture is pleasant, but the dropped shoulder, chest ease, sleeve opening and long hem are not proven on a body.",
  ],
  [
    "shopify_supplier:3537f3e93534af17f4de13a49735169e9d215955",
    "CLE-073 is a flat product-only long-sleeve shirt with no worn fit proof. The loud blue, green and white painted stripe is visually busy and does not meet the cleaner Zara-led color gate.",
  ],
  [
    "shopify_supplier:7f51f5d8e0402e07daf28ea27911bc8e74b54a7c",
    "KNI-075 is a flat white textured T-shirt with no body-fit proof. Shoulder position, chest ease, torso width, body length and hem behavior cannot be verified.",
  ],
  [
    "shopify_supplier:0b273a769388021d166d25e44f6005fa71599f1f",
    "KNI-065 is a hollow product-only olive ribbed hoodie. Its long kangaroo pocket construction is generic and no worn shoulder, body, sleeve or hem evidence exists.",
  ],
  [
    "shopify_supplier:132fcd011b65635691ca428040f53556ce93e3a3",
    "KNI-066 is a flat white quarter-zip short-sleeve top with a dated contrast plaid inner collar and very broad long body. It has no worn fit proof and fails the clean modern gate.",
  ],
  [
    "shopify_supplier:1567c4a133b03632c21e4cbfe188bc4b1dde577b",
    "KNI-086 is shown only on a hanger in a cropped close-up partly obscured by a hand. The fuzzy off-white mock neck supplies no trustworthy torso length, hem or full sleeve proof.",
  ],
  [
    "shopify_supplier:c088c69f9f54b34e8066d0bfb29314b31c32c1f0",
    "KNI-080 is presented as a cropped torso composite with fabric bunching through the waist and no reliable full-body fit. The narrow ribbed blue knit risks the tight-top proportion explicitly excluded from the new bank.",
  ],
  [
    "shopify_supplier:a286644bd6cead92f5ec66950a3c81eec1186009",
    "KNI-078 is a generic hollow-torso burgundy-and-ivory stripe sweater with no genuine worn proof. The tight-looking waist, chest badge and dated stripe treatment fail the modern silhouette and taste gates.",
  ],
  [
    "shopify_supplier:628b14cf9051f8ade734e81412d141c75b497aad",
    "KNI-071 has worn evidence, but it proves a very dropped shoulder, wide sleeve, long broad body and loose hem. That oversized shape would recreate the baggy-top imbalance the replacement outfits must remove.",
  ],
  [
    "shopify_supplier:25e4ce74d0c84d92ba777c70dc01436d62f1fe17",
    "KNI-089's worn source proves an extremely oversized chocolate sweater with ballooning sleeves, heavy cuff stacking and a long broad torso. It fails the controlled-relaxed proportion gate.",
  ],
  [
    "shopify_supplier:2693b2e7c9469df9e223abb50944033ddd9ad3d2",
    "KNI-069 is only a hanger close-up of a taupe sweater, with a hand obscuring the cuff and no full body. Shoulder, chest, sleeve, length and hem behavior remain unproven.",
  ],
  [
    "shopify_supplier:c2a773cc88b1da3d25ff4d004c1512ad6c128419",
    "KNI-081 is a flat product-only white short-sleeve Henley. Its torso width and long body may be acceptable, but there is no worn shoulder, chest, sleeve or hem proof.",
  ],
  [
    "shopify_supplier:2f70b0bd02ff2e84e5c0dad6aff41ece4e2ee646",
    "KNI-092 is a generic hollow-torso brown waffle T-shirt with a visible hem label and no trustworthy on-body evidence. The narrow chest and sleeves risk another close-fitting top.",
  ],
]);

const retained = new Map([
  [
    "shopify_supplier:21196d523f8b28c3b43a51b250933949f7a9bc6b",
    "Use the white KNI-088 vertical-texture shirt once only for Spring/Summer Office, Date Night, Resort dinner or elevated Casual Everyday. Its 1350 x 1800 worn source proves a natural shoulder, relaxed-but-controlled chest and a clean tucked line. Pair with a colored straight or tailored bottom and warm or colored low-profile footwear; avoid black-heavy styling, rolled sleeves in formal use, Suit/Tuxedo, Wedding or Wedding Guest.",
  ],
  [
    "shopify_supplier:8af50b74a00f0e4370f86a1d88f51b3ae4cb19b2",
    "Use the dusty-periwinkle KNI-089 contrast-trim fine-knit T-shirt once only for Spring/Summer Office, Date Night, Party or Resort. Its 1350 x 1800 worn source proves a natural shoulder, controlled straight torso, upper-hip rib hem and non-clingy sleeve. Pair with cream, warm stone, tobacco or olive controlled tailoring; no loose bottom, gray-on-gray board or dark-heavy styling. This identity remains the top hold in S237 and cannot appear elsewhere.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const findTarget = (identity) =>
  manifest.entries.find(
    (candidate) =>
      candidate.identity === identity && candidate.sourceCollection === sourceCollection,
  );
const allRejectionsApplied = [...rejections].every(([identity, reason]) => {
  const entry = findTarget(identity);
  return entry?.status === "reject" && entry.reason === reason;
});
const allRetentionsApplied = [...retained].every(([identity, constraint]) => {
  const entry = findTarget(identity);
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
  const entry = findTarget(identity);
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
  const entry = findTarget(identity);
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

reviewedRows.sort((left, right) =>
  left.reviewId.localeCompare(right.reviewId, undefined, { numeric: true }),
);
const tableRows = reviewedRows
  .map(
    (row) =>
      `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **${row.decision}** | ${row.judgment.replaceAll("|", "\\|")} | ${row.image} |`,
  )
  .join("\n");
const qa = `# Older omitted shirt and knit full-source corrections

Status: complete one-by-one full-resolution review of all five accepted clean-shirt records and all 13 accepted knit/shirt records from the older omitted local-candidate collection. Wedding and Wedding Guest remain excluded and untouched.

## Result

- All 18 original 1000–1920 x 1333–1920 sources were opened individually.
- Sixteen identities are rejected for missing worn fit proof, novelty or dated styling, visibly oversized shape, or risky close-fitting proportions.
- KNI-088 and the dusty-periwinkle KNI-089 remain accepted exactly once with narrow season, occasion, color and proportion rules.
- The dusty-periwinkle KNI-089 remains the S237 provisional top hold. None of the 16 rejected identities appears in an approved outfit, active planning reservation or provisional scenario core.
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
