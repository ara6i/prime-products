#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/CLEAN_LAYER_FULL_SOURCE_QA.md`;

const retained = new Map([
  [
    "shopify_supplier:5ab0310ae9053fa971557c673b0ef3ddd136b573",
    "Use the soft-white CLE-037 lightweight patch-pocket blazer once only for Spring or Summer creative Office, daytime Date, Resort dinner or elevated Casual Everyday. Its 1350 x 1800 worn source proves a natural shoulder and clean relaxed body, but not Suit/Tuxedo or Formal Evening construction. Pair with a colored regular top and controlled straight or tailored bottom; avoid an all-white board, rolled sleeves in formal styling or another loose piece.",
  ],
  [
    "shopify_supplier:f23bed156981c3eefb1fe37ab832a7e947f07775",
    "Use the washed-sky-blue CLE-063 soft blazer-shacket once only for Spring or mild-Summer Travel, Resort, smart Casual or a daytime Date. The 1350 x 1800 worn source supports a relaxed unstructured layer, not polished Office, Formal Evening or Suit/Tuxedo use. Pair over ivory, coral, tobacco or muted green with a controlled bottom and low-profile footwear; never combine it with faded blue denim or another loose layer.",
  ],
  [
    "shopify_supplier:2f30cccc9b77808ce60e8aef94ba5ed6271a4556",
    "Use the cropped mottled-brown CLE-077 distressed faux-leather blouson once only for Fall Mid-Range Casual Everyday, Date Night, Party or Travel. Its 1350 x 1800 worn source proves a dropped relaxed shoulder and upper-hip ribbed hem, so every companion must remain controlled and lighter in coral, ivory, sage, burgundy or pale blue. Never add a loose bottom, brown-on-brown palette, black-heavy board, Formal Evening, Suit/Tuxedo, Wedding or Wedding Guest styling.",
  ],
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const alreadyApplied = [...retained].every(([identity, constraint]) => {
  const entry = manifest.entries.find((candidate) => candidate.identity === identity);
  return (
    entry?.status === "accept" &&
    Array.isArray(entry.constraints) &&
    entry.constraints.length === 1 &&
    entry.constraints[0] === constraint
  );
});

if (alreadyApplied) {
  console.log(JSON.stringify({ retainedUpdated: 0, alreadyApplied: 3, qaPath }, null, 2));
  process.exit(0);
}

const rows = [];
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
  rows.push({
    reviewId: selected.reviewId,
    title: selected.title,
    color: selected.color,
    judgment: constraint,
    image: selected.image,
  });
}

manifest.generatedAt = new Date().toISOString();
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const tableRows = rows
  .map(
    (row) =>
      `| ${row.reviewId} | ${row.title.replaceAll("|", "\\|")} | ${row.color} | **accept once** | ${row.judgment.replaceAll("|", "\\|")} | ${row.image} |`,
  )
  .join("\n");
const qa = `# Clean modern layer full-source QA

Status: complete one-by-one full-resolution revalidation of all three accepted identities in the clean-modern-layer source group. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Three 1350 x 1800 worn sources were opened individually.
- All three remain accepted exactly once with narrower season, occasion and proportion rules.
- The white and sky-blue pieces are soft unstructured smart-casual layers, not Suit/Tuxedo products. The mottled-brown blouson is deliberately relaxed and must be the only loose or dark-heavy piece.
- No product was imported, refined, background-removed or integrated into the UI by this revalidation.

| Review ID | Product | Color | Decision | Full-source judgment | Original image |
|---|---|---|---|---|---|
${tableRows}
`;
await writeFile(qaPath, qa, "utf8");

console.log(JSON.stringify({ retainedUpdated: 3, qaPath }, null, 2));
