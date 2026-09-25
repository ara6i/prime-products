#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/S209_WIDE_BOTTOM_CORRECTION.md`;
const identity =
  "shopify_supplier:df42e376c9e3794e991939daea6a358876bd573b";
const reason =
  "Full-board recheck on 2026-09-17 confirms the supplier's wide-leg label: the worn khaki trouser has a broad draped leg from thigh through hem and reproduces the baggy lower-half silhouette the men's rebuild is removing. It failed this same silhouette gate in S157 and cannot be recycled into S209 or any other scenario.";

const statuses = ["reject", "accept", "conditional", "duplicate-existing"];
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entry = manifest.entries.find((candidate) => candidate.identity === identity);
if (!entry) throw new Error(`Missing S209 correction target: ${identity}`);

let prior = null;
let changed = false;
if (entry.status === "reject" && entry.reason === reason) {
  changed = false;
} else {
  if (entry.status !== "accept" || !entry.selectedVariant) {
    throw new Error(
      `S209 correction target is not an accepted product with source evidence: ${entry.status}`,
    );
  }
  prior = entry.selectedVariant;
  entry.status = "reject";
  entry.reason = reason;
  delete entry.constraints;
  entry.selectedVariant = null;
  changed = true;
}

const usableEntries = manifest.entries.filter((candidate) =>
  ["accept", "conditional"].includes(candidate.status),
);
const usableGroups = Map.groupBy(usableEntries, (candidate) => candidate.identity);
manifest.generatedAt = new Date().toISOString();
manifest.summary = {
  reviewDecisionRows: manifest.entries.length,
  uniqueIdentitiesReviewed: new Set(manifest.entries.map((candidate) => candidate.identity)).size,
  usableUniqueIdentities: new Set(usableEntries.map((candidate) => candidate.identity)).size,
  statusCounts: Object.fromEntries(
    statuses.map((status) => [
      status,
      manifest.entries.filter((candidate) => candidate.status === status).length,
    ]),
  ),
  collectionCounts: [
    ...new Set(manifest.entries.map((candidate) => candidate.sourceCollection)),
  ]
    .sort()
    .map((collection) => {
      const entries = manifest.entries.filter(
        (candidate) => candidate.sourceCollection === collection,
      );
      return {
        sourceCollection: collection,
        identities: new Set(entries.map((candidate) => candidate.identity)).size,
        accept: entries.filter((candidate) => candidate.status === "accept").length,
        conditional: entries.filter((candidate) => candidate.status === "conditional").length,
        reject: entries.filter((candidate) => candidate.status === "reject").length,
        duplicateExisting: entries.filter(
          (candidate) => candidate.status === "duplicate-existing",
        ).length,
      };
    }),
  duplicateUsableIdentities: [...usableGroups.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([duplicateIdentity, entries]) => ({
      identity: duplicateIdentity,
      rows: entries.map((candidate) => ({
        sourceCollection: candidate.sourceCollection,
        sourceReviewIds: candidate.sourceReviewIds,
        status: candidate.status,
      })),
    })),
};

if (changed) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const qa = `# S209 wide-bottom correction

Status: complete full-board visual correction. Local only; Wedding and Wedding Guest excluded.

- Identity: \`${identity}\`
- Product: ${prior.title}
- Variant: ${prior.color}
- Prior review: ${prior.reviewId}
- Decision: **reject globally**
- Reason: ${reason}
- Original source: ${prior.image}

The wine-red S209 blouson remains a planning reservation. S209 now needs a compact warm-ivory top, a controlled camel-khaki straight pleated trouser and a unique light-stone suede sneaker before a complete board can be judged.

No import, Gemini request, background removal, UI integration, remote mutation, push or deployment occurred.
`;
  await writeFile(qaPath, qa, "utf8");
}

console.log(
  JSON.stringify(
    {
      changed,
      identity,
      qaPath,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
