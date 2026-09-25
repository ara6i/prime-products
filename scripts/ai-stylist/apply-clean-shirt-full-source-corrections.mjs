#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/CLEAN_SHIRT_FULL_SOURCE_CORRECTIONS.md`;

const rejections = new Map([
  [
    "shopify_supplier:43ddfd83f0096669fb60ea61eabb9aaaa3215d9f",
    "The only 1000 x 1500 source is a hanger composition over a separate white T-shirt. Its dropped shoulder, twin oversized patch pockets, visible NATORAL label and translucent utility construction provide no trustworthy worn fit and do not meet the clean modern shirt gate.",
  ],
  [
    "shopify_supplier:5133cf34dcbeca1d1c9863f5543b720a9d2a3d51",
    "The only 1350 x 1800 source is a flat white shirt with no body-fit proof. The very dropped shoulder, long rounded hem and excess sleeve volume cannot be verified as a controlled relaxed silhouette, so the identity fails the one-by-one fit gate.",
  ],
  [
    "shopify_supplier:33e15e2feda9ed833c09ecfaf7619bb0ff2227ec",
    "The only 1350 x 1800 source is a hanger-only olive short-sleeve utility overshirt layered over another T-shirt. Twin chest pockets, two visible labels and a long curved hem make it cluttered, while shoulder, chest and length remain unproven.",
  ],
  [
    "shopify_supplier:34d9d6feb72ae5a69502a3d4eaaf59b00687c967",
    "The only 1350 x 1800 source is a hanger composition over a separate T-shirt. The muted olive piece is a long four-pocket chore layer, not a clean standalone shirt, and supplies no worn shoulder, torso, sleeve or hem proof.",
  ],
  [
    "shopify_supplier:6b0af24c8ff4871890fdd99cd65f8712fd26dc84",
    "The only 1350 x 1800 source is a hanger-only brown twin-pocket overshirt over another T-shirt. It repeats the muddy utility-layer problem, has no worn fit proof and is weaker than the retained rust color-led layer.",
  ],
  [
    "shopify_supplier:91f43b5f4d9891e9729ee85901efdf54bcd192c2",
    "The only 1350 x 1800 source is a hanger-only gray-green twin-pocket overshirt over another T-shirt. The oversized pockets, black buttons and REV REV patch look generic and cluttered, and the body silhouette is not proven.",
  ],
  [
    "shopify_supplier:9cc79e1077cee3d17f7915da83507df07302d073",
    "The only 1350 x 1800 source is a crumpled hanger composition showing a white band-collar short-sleeve overshirt over a separate crew T-shirt. Shoulder line, chest ease, sleeve opening and long rounded hem are not proven on a body.",
  ],
  [
    "shopify_supplier:9f7d27037e6928fdc58c7a87a314d205002778a1",
    "The only 1350 x 1800 source is a hanger-only sage chore overshirt over a separate T-shirt. Its three large patch pockets, long boxy body and unproven worn silhouette repeat the utility-layer issue rather than adding a clean modern shirt.",
  ],
  [
    "shopify_supplier:b6a808d03ddf4d785f11cb27682a28f57dfe224b",
    "The only 1350 x 1800 source is a hanger-only sky-blue overshirt over another T-shirt. Although the color is useful, shoulder, torso, sleeve and hem behavior are unproven, so it cannot pass the visual fit gate as a unique outfit product.",
  ],
  [
    "shopify_supplier:c44666050b8bf8d58036ec5a3b617fa5e4acfd67",
    "The worn 1350 x 1800 source proves a long broad brown twin-pocket overshirt with dropped shoulders and excess torso volume. Its muddy color and utility shape repeat stronger retained layers and conflict with the controlled modern proportion rule.",
  ],
  [
    "shopify_supplier:c8735af59187bb9c5658dd7589a49a6fee2234c9",
    "The worn 1125 x 1500 source shows a long, very boxy gray-green overshirt with two oversized chest pockets and a visible label. The dropped shoulder and broad torso would recreate the baggy-top problem the replacement bank is meant to remove.",
  ],
  [
    "shopify_supplier:ca9600de215c3efb2aacdd698d5b43f2d24813ea",
    "The only 1350 x 1800 source is a hanger-only yellow-khaki corduroy twin-pocket overshirt over another T-shirt. It has no worn fit proof and the shiny pocket-heavy surface reads generic rather than clean Zara-led texture.",
  ],
  [
    "shopify_supplier:cf650ea913be95ad2ba50025dbd654bfdc2446cc",
    "The only 1350 x 1800 source is a hanger-only mid-blue utility overshirt over another T-shirt. Two very large chest pockets, a NICE patch and missing worn fit proof make it too generic and cluttered for the approved pool.",
  ],
  [
    "shopify_supplier:f0ad2af6c72cba6799e6543fc55abf587f53ab04",
    "The only 1350 x 1800 source is a product-only gray-green utility shirt. Its mismatched oversized pockets, visible East Rain patch, black buttons and lack of worn fit proof fail both the clean-design and silhouette gates.",
  ],
  [
    "shopify_supplier:f0b8ba035fef5e787697364768f143db43efd693",
    "The only 1350 x 1800 source is a hanger-only dark olive overshirt over another T-shirt. It supplies no worn fit proof and adds another dark utility layer despite the need for happier, more varied color.",
  ],
  [
    "shopify_supplier:f5800aaaef7e1a427ebc24fd5041ae95a71b003c",
    "The only 1350 x 1800 source is a hanger-only pale-blue shirt worn open over a separate white T-shirt. The color is fresh, but shoulder, torso, sleeve and long rounded-hem behavior remain unproven; color alone is not enough to pass the fit gate.",
  ],
  [
    "shopify_supplier:fdb41e5c858c3c95c6096076635974205e82fec2",
    "The only 1350 x 1800 source is a hanger-only rust twin-pocket overshirt over another T-shirt. It has no worn fit proof and is redundant beside the stronger worn rust contrast-collar layer retained from the same source group.",
  ],
  [
    "shopify_supplier:1feb73f9a4814c97fb18176dbbb9e7dcd3e854f0",
    "The only 1350 x 1800 source is a hanger-only peacock-blue shirt over another T-shirt. The welcome color cannot compensate for missing shoulder, chest, sleeve and hem proof, so it remains unsuitable for a one-use visually approved outfit.",
  ],
  [
    "shopify_supplier:29a34029f06f4434c133662c2e7a2cacdef8d2c5",
    "The only 1350 x 1800 source is a hanger-only saturated-green shirt over another T-shirt. Its shiny crinkled surface reads inexpensive and no worn fit is available, so it cannot be kept merely to add color.",
  ],
  [
    "shopify_supplier:01a54e38ae2ddeb722f28e506509e12a9ded0c87",
    "The worn 1350 x 1800 source shows a long broad tan snap shirt with dropped shoulders, bright hardware, chest text and a large patch pocket. The graphic utility styling and excess volume are weaker than the retained clean khaki layer.",
  ],
]);

const retained = new Map([
  [
    "shopify_supplier:1ac34364f2a89e4e3910fa634b21b00ba6484373",
    "Use the fresh sky-blue CLE-010 twin-pocket overshirt once only as the color-led outer layer for Spring or mild-Summer Casual Everyday, Travel, daytime Date or Resort. Its 1350 x 1800 worn source proves a deliberate relaxed shoulder with a controlled straight body. Pair with a fitted-to-regular ivory top, straight cream/taupe bottom and low-profile footwear; never use it as the only top, with a loose bottom, or for Office, Formal Evening, Suit/Tuxedo, Wedding or Wedding Guest.",
  ],
  [
    "shopify_supplier:bb7c019fb9c4bae84979c18a8607fb1faeb23bbb",
    "Use the light-khaki CLE-050 snap-front overshirt once only for Spring/Fall Travel, Casual Everyday or a mild-weather daytime Date. Its 1350 x 1800 worn source proves a controlled relaxed shoulder and clean straight body with concealed slant chest pockets. Pair over coral, sky blue, ivory or sage with a controlled darker or colored bottom; never build an all-beige look or use it as Office, Formal Evening or Suit/Tuxedo tailoring.",
  ],
  [
    "shopify_supplier:ee5f1157bc2bcfb11222797f6c3cdbeb367d530c",
    "Use the warm rust CLE-061 contrast-collar overshirt once only as the statement layer for Fall Casual Everyday, Date Night, Party or Travel. Its 1350 x 1800 worn source proves a controlled relaxed shoulder and hip-length body. Keep the base and bottom regular-to-straight in ivory, stone, olive or pale blue with brown, cream or burgundy footwear; no loose bottom, no all-black board and no Formal Evening, Suit/Tuxedo, Wedding or Wedding Guest use.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const findTarget = (identity) =>
  manifest.entries.find(
    (candidate) =>
      candidate.identity === identity &&
      candidate.sourceCollection === "clean-shirts-overshirts",
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
const qa = `# Clean shirt and overshirt full-source corrections

Status: complete one-by-one full-resolution review of all 23 surviving accepted identities in the clean-shirts-overshirts source collection. Wedding and Wedding Guest remain excluded and untouched.

## Result

- All 23 original 1000–1350 x 1500–1800 sources were opened individually.
- Twenty identities are rejected for missing worn fit proof, repeated muddy utility styling, excessive volume, visible labels or graphics, or cheap-looking surface treatment.
- CLE-010, CLE-050 and CLE-061 remain accepted exactly once, only as worn and proportion-constrained outer layers.
- None of the 23 identities appears in an approved outfit, active planning reservation or provisional scenario core, so the correction removes no approved outfit and frees no reservation.
- Hanger-only bright color was not accepted as a substitute for silhouette proof. No product was imported, refined, background-removed or integrated into the UI by this correction.

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
