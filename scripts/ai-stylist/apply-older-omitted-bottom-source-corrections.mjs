#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const s189DraftPath = `${reportDirectory}/summer-date-budget-pilot-s189-v1-partial/agent-styled-draft.json`;
const qaPath = `${reportDirectory}/OLDER_OMITTED_BOTTOM_FULL_SOURCE_CORRECTIONS.md`;
const sourceCollection = "older-omitted-local-candidates";

const rejections = new Map([
  [
    "shopify_supplier:02fd40cffcd4ed8382f8fdff9b2f73376898f447",
    "CLE-065 is a wide knee-length khaki short with a low casual crotch and dated long Bermuda proportion. It fails the clean above-knee Summer silhouette gate.",
  ],
  [
    "shopify_supplier:41e34ccd7a652d2217fbbd129c0843f3e329564b",
    "STR-096 has only a flat white garment image. The source cannot prove rise, thigh ease, knee width, leg shape, full length or hem behavior, so it cannot support the previously approved S189 complete outfit.",
  ],
  [
    "shopify_supplier:6f7feed8840f5ae61fdc2bdca72c77313949b833",
    "CLE-075 is a flat product-only technical short with an integrated web belt, zip pockets and no worn leg-opening or length proof. It cannot pass as a modern one-use short from this source.",
  ],
  [
    "shopify_supplier:8d9fb6dd4f6289a656e655b8b9b0e6efe6005a3d",
    "STR-081 is a very dark washed jean with decorative ankle zips and visible stacking over the shoe. The long heavy finish and gimmick detailing fail the clean straight-leg gate.",
  ],
  [
    "shopify_supplier:aabdffc99d8e26c94746c17f630f60a6bb135e66",
    "STR-056 is an acid yellow-green jean with extreme width and heavy puddling over both shoes. It is exactly the baggy-bottom silhouette being removed.",
  ],
  [
    "shopify_supplier:ab2aa6d1c74a8d9545ea4517b457fc9d7c312e26",
    "STR-035 is a broad relaxed jean from hip to hem and pools over the sneakers. The garment overwhelms the lower body and fails the controlled-straight proportion gate.",
  ],
  [
    "shopify_supplier:afb7fb3cf9cc6771830ceb3630b7001b6b0a833a",
    "STR-045 has a loose thigh, broad lower leg and visible hem stacking. The faded peacock-blue wash is usable, but the worn silhouette is too baggy for the replacement bank.",
  ],
  [
    "shopify_supplier:c4694a3740fce46e4cb36568c29f9bd341398236",
    "STR-040 is a shiny deep-blue wide straight trouser with fabric pooling over both shoes. It reads dated and oversized rather than clean modern denim.",
  ],
  [
    "shopify_supplier:cc3c6f34d4dab24d0b855635f624057bb42a50c2",
    "PRE-078 is a shiny royal-blue two-in-one gym short with a large patch pocket, contrast compression liner, red toggle and visible logo. It is overdesigned and too body-focused for the clean activewear brief.",
  ],
  [
    "shopify_supplier:de0c7dfa10b7272a8c0cadea123eaaac8aff7320",
    "STR-091 is a flat light-gray technical pant with no worn rise, thigh, knee, length or shoe-break evidence. Product shape alone is insufficient fit proof.",
  ],
  [
    "shopify_supplier:f7a81f949ef5378b333161394812d31627fa7265",
    "STR-047 is a flat military-green chino with no worn silhouette proof and a novelty multicolor bead charm at the belt loop. It fails both the evidence and clean-detail gates.",
  ],
  [
    "shopify_supplier:f82ede51ff9fb0180d8e8318e06f575aa5f03944",
    "STR-069 is a broad pale-wash jean with a long leg and heavy puddling over both sneakers. It recreates the loose baggy-bottom proportion explicitly excluded by the user.",
  ],
  [
    "shopify_supplier:fabf15cd2935c7ad9c6fc6909dbdb8e94ea7f169",
    "STR-090 is a loose gray jean with a broad leg and stacked, folded hems. The worn source confirms uncontrolled length and volume rather than a clean straight silhouette.",
  ],
]);

const retained = new Map([
  [
    "shopify_supplier:048f91fa8b67f16175d1ad88b171fbd87340e32c",
    "Use the clean mid-blue STR-027 jean once only for Casual Everyday, Travel or daytime Date use. Its worn source proves regular thigh ease, a straight leg and one small shoe break. It remains the S143 provisional bottom hold and cannot appear elsewhere.",
  ],
  [
    "shopify_supplier:143a731a5392ce7a45ec9edd9ef5cf5e13b9c268",
    "Use the pale sage-wash STR-079 jean once only for Spring/Fall Casual Everyday or Travel. Its worn source proves a controlled straight leg and useful light color. It remains the S245 provisional bottom hold; pair with a controlled top and avoid another pale oversized layer.",
  ],
  [
    "shopify_supplier:7572cafda48c1fb7fd652ae7a470e2cdafb136a0",
    "Use the dark blue-gray STR-054 cuffed jean once only for Fall/Winter Casual Everyday or Travel. The source proves a controlled regular-straight leg. Keep the top light or colored and do not combine it with another dark or oversized piece.",
  ],
  [
    "shopify_supplier:8120446bbea5a8cfc540c46688949ac4a2a35a36",
    "Use the light olive CLE-084 technical short once only for Summer Sports, Hiking or active Travel. The worn source proves a clean waist, controlled thigh and above-knee hem. Do not style it as Office, Date Night, Formal Evening or Resort tailoring.",
  ],
  [
    "shopify_supplier:bd6aa91f838ac49ed1f697d80e43e20d67413186",
    "Use the cobalt PRE-073 drawstring short once only for warm-weather Sports / Workout. Its worn source proves a controlled above-knee athletic fit; pair with a light technical top and neutral trainer, and do not use it for polished Casual, Office, Date or Resort looks.",
  ],
  [
    "shopify_supplier:cb7bce975c76e67d2947ed32d70475518334f55a",
    "Use the light stone-khaki STR-041 trouser once only. Its full worn source proves a clean mid-rise, controlled straight leg and full hem. It is already locked in approved S193 Fall Date look 1 and cannot be repeated.",
  ],
  [
    "shopify_supplier:d38c480b9f56c27ada2ad07ecfe6f1d0669e5dbc",
    "Use the blue-gray STR-042 cuffed jean once only for Fall Casual Everyday, Travel or relaxed Date use. Its worn source proves a regular-relaxed thigh and controlled tapered-cuff finish. It remains the S142 provisional bottom hold and cannot appear elsewhere.",
  ],
  [
    "shopify_supplier:fbebc32906d6ea8b0cf739471efe7542300585dc",
    "Use the mid-blue STR-059 jean once only for Casual Everyday, Travel or a relaxed daytime Date. Its worn source proves a regular-straight leg with a modest full break. Pair with a lighter or colored controlled top and low-profile footwear.",
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

if (rejected > 0 || retainedUpdated > 0) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const s189 = JSON.parse(await readFile(s189DraftPath, "utf8"));
const s189AlreadyRevoked =
  s189.status === "partial-source-revoked" &&
  s189.visualQa?.[0]?.decision === "fail";
if (!s189AlreadyRevoked) {
  s189.generatedAt = new Date().toISOString();
  s189.status = "partial-source-revoked";
  s189.summary.visuallyReadyOutfits = 0;
  s189.summary.missingOutfits = 10;
  s189.summary.placements = 0;
  s189.summary.uniqueIdentities = 0;
  s189.visualQa = [
    {
      position: 1,
      decision: "fail",
      reason:
        "Revoked after reopening the white trouser at its full source. The only available image is a flat garment view and cannot prove thigh, knee, leg width, full length or hem behavior, so the complete Summer Date outfit no longer passes the silhouette gate.",
    },
  ];
  const bottom = s189.scenarios[0].outfitSets.separates[0].items.find(
    (item) => item.slot === "bottom",
  );
  bottom.visualDecisionStatus = "reject";
  bottom.visualConstraints = [rejections.get(bottom.productId)];
  await writeFile(s189DraftPath, `${JSON.stringify(s189, null, 2)}\n`, "utf8");
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
  const qa = `# Older omitted bottom full-source corrections

Status: complete one-by-one full-resolution review of all 21 remaining accepted bottom records in the older omitted local-candidate collection. Wedding and Wedding Guest remain excluded and untouched.

## Result

- All 21 original 1000–1350 x 1333–1800 sources were opened individually.
- Thirteen identities are rejected for flat-only evidence, overlong or baggy legs, puddled hems, dated Bermuda proportions, visible logos or overdesigned activewear.
- Eight remain accepted exactly once with narrow scenario and proportion constraints. The S142, S143 and S245 provisional holds and the approved S193 trouser remain protected and cannot be reused.
- S189 is revoked as a complete outfit because its white trouser has no worn silhouette proof. Its orange top and two-tone loafer remain individually accepted and become available only for a future source-proven recomposition.
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
      s189Revoked: !s189AlreadyRevoked,
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
