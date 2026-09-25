#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/KNIT_POLO_FULL_SOURCE_CORRECTIONS.md`;

const corrections = new Map([
  [
    "shopify_supplier:4364e9fb40a107fbdd3db7c2b04eb9ebef44b1e2",
    "The only 1350 x 1800 source is a flat garment-only khaki mock-neck knit. It cannot prove shoulder position, chest ease, torso width, body length or hem behavior, so it fails the one-by-one silhouette gate.",
  ],
  [
    "shopify_supplier:c718a3072a23b5f3daffd582a98373e700ff8129",
    "The only 1350 x 1800 source is a hollow garment-only white cable turtleneck shaped into a narrow chest, waist and sleeve line. It provides no wearer proof and visually conflicts with the no-skinny-top direction.",
  ],
  [
    "shopify_supplier:fbfc103acc2f63512ef6f1c5b1038a150ab8c1db",
    "The 1000 x 1333 source shows a body-hugging peacock-blue mock neck with a tight chest, waist, upper arm and forearm plus sleeve stacking. It is the skinny fitted silhouette the rebuild explicitly excludes.",
  ],
  [
    "shopify_supplier:821ecfe8e5c578279ddd8f55492daca456209053",
    "The worn 1350 x 1800 source proves fit, but the beige waffle quarter-zip has a generic technical-golf body, contrast orange zipper tape and an extra vertical chest zip. It does not meet the modern Zara-led taste gate and should not be forced into Casual, Travel or Date styling.",
  ],
  [
    "shopify_supplier:be3d8e8b3c2378e5b61eabc19a922df12ab5eabd",
    "The only 1350 x 1800 source is a hollow garment-only beige turtleneck shaped into a narrow torso and sleeves. It cannot prove a straight non-skinny body and therefore contradicts its former acceptance constraint.",
  ],
  [
    "shopify_supplier:f7e9aaeca612a242f9dc832cf56866df4010398c",
    "The only 1000 x 1333 source is a flat garment-only green mock-neck T-shirt. Its long rectangular body does not establish real shoulder, chest, torso or hem behavior, so it cannot pass complete-silhouette review.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const correctionsAlreadyApplied = [...corrections].every(([identity, reason]) => {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  return entry?.status === "reject" && entry.reason === reason;
});

if (correctionsAlreadyApplied) {
  console.log(
    JSON.stringify(
      {
        corrected: 0,
        alreadyApplied: corrections.size,
        qaPath,
        summary: manifest.summary,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const correctedRows = [];

for (const [identity, reason] of corrections) {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  if (!entry) throw new Error(`Missing correction target: ${identity}`);

  const prior = entry.selectedVariant;
  if (entry.status !== "accept" || !prior) {
    throw new Error(
      `Correction target is not an accepted product with source evidence: ${identity} (${entry.status})`,
    );
  }

  correctedRows.push({
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

const tableRows = correctedRows
  .map(
    (row) =>
      `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **reject** | ${row.reason.replaceAll("|", "\\|")} | ${row.image} |`,
  )
  .join("\n");
const qa = `# Knit and polo full-source corrections

Status: complete one-by-one full-resolution review of all eight remaining accepted identities in the knit/polo source collection after the two earlier mock-neck record corrections. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Eight accepted sources were opened individually at 1000–1350 x 1333–1800.
- Six identities are rejected below for unproved garment-only fit, a visibly skinny silhouette, or dated technical detailing that fails the Zara-led taste gate.
- Two identities remain accepted: KNI-029, the light-green washed relaxed polo, and KNI-047, the chocolate textured knit polo. Both have worn fit evidence and require controlled lighter bottoms.
- None of the six rejected identities appears in an approved outfit, active planning reservation or provisional core.
- No product was imported, refined, background-removed or integrated into the UI by this correction.

| Review ID | Product | Color | Decision | Full-source judgment | Original image |
|---|---|---|---|---|---|
${tableRows}
`;
await writeFile(qaPath, qa, "utf8");

console.log(
  JSON.stringify(
    {
      corrected: correctedRows.length,
      retained: ["KNI-029", "KNI-047"],
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
