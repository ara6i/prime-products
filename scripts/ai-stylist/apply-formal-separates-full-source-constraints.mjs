#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const qaPath = `${reportDirectory}/FORMAL_SEPARATES_FULL_SOURCE_QA.md`;

const retained = new Map([
  [
    "shopify_supplier:5d5eb7a403cdcbaab147934e34260021d12d0dba",
    "Use the light-khaki FOR-050 relaxed patch-pocket blazer once only for Spring or mild-Fall creative Office, daytime Date or elevated smart Casual. The 1350 x 1800 worn source proves a natural shoulder and straight relaxed body, but its long casual cut excludes Formal Evening and Suit/Tuxedo use. Pair with a compact regular top and controlled straight or gently tapered trouser; never copy the source's wide black bottom or add another oversized piece.",
  ],
  [
    "shopify_supplier:15429f81dd127d5987c1150fa5e0d2e046530740",
    "Use the warm-khaki FOR-025 high-rise double-pleat trouser once only for Spring or Summer Office, Date Night or Formal Evening separates. The 1350 x 1800 worn source proves clean thigh ease, a pressed straight line and controlled cuffed hem. Pair with a regular shirt or fine knit and a low-profile loafer or derby; no oversized top, bulky sneaker or baggy layer.",
  ],
  [
    "shopify_supplier:36775b09ed8cf6af570dd58f177804a5200ce70c",
    "Use the light-khaki FOR-026 trouser once only for Spring or Summer Office or a polished daytime Date. The 1350 x 1800 worn source proves a clean mid-rise, regular thigh and controlled taper without ankle cling or puddling. It may remain in the S150 pale-aqua-pinstripe Office core; finish only with a compact shirt, low-profile burgundy or brown loafer, cognac office bag and light-dial watch. Never call it wide, pair it with an oversized top, or use it for Suit/Tuxedo styling.",
  ],
  [
    "shopify_supplier:5ee70df61299c873a76cd10ed93b206f97430c23",
    "Use the deep-brown FOR-037 high-rise double-pleat trouser once only for Fall or Winter Office, Date Night, Formal Evening separates or a restrained Party. The 1350 x 1800 worn source proves controlled hip and thigh ease, a clean crease and a full straight-to-tapered hem. Pair with a lighter regular shirt or knit and refined brown, burgundy or cream footwear; no oversized outerwear or muddy all-brown board.",
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
  console.log(
    JSON.stringify(
      { retainedUpdated: 0, alreadyApplied: retained.size, qaPath },
      null,
      2,
    ),
  );
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
const qa = `# Formal separates full-source QA

Status: complete one-by-one full-resolution revalidation of all four accepted identities from the formal-blazer and formal-trouser/set source groups. Wedding and Wedding Guest remain excluded and untouched.

## Result

- Four 1350 x 1800 worn sources were opened individually.
- All four remain accepted exactly once with narrower use constraints; none is approved as a Suit/Tuxedo identity.
- FOR-050 is a relaxed smart-casual blazer, not Formal Evening tailoring. FOR-025 and FOR-037 are controlled pleated trousers. FOR-026 is a clean controlled taper and remains a provisional S150 Office component, not a skinny or wide trouser.
- S150 was reopened as a combined two-piece board. Its pale-aqua pinstripe shirt and light-khaki trouser remain visually coherent, but the core still lacks its unique shoe, bag and watch and is not a complete outfit.
- No product was imported, refined, background-removed or integrated into the UI by this revalidation.

| Review ID | Product | Color | Decision | Full-source judgment | Original image |
|---|---|---|---|---|---|
${tableRows}
`;
await writeFile(qaPath, qa, "utf8");

console.log(
  JSON.stringify(
    { retainedUpdated: retained.size, qaPath, catalogSummary: manifest.summary },
    null,
    2,
  ),
);
