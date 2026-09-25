import { readFile, writeFile } from "node:fs/promises";

const poolPath =
  "output/reports/mens-nonwedding-scenario-pools-20260911.json";
const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const batchPath = `${reportDirectory}/raw-priority-batch-01.json`;
const sourceCollection = "raw-priority-batch-01";

const acceptedCards = new Map([
  [2, "Blue"],
  [4, "Light Blue"],
  [7, "Orange"],
  [9, "Dusty Blue"],
  [17, "Light Blue"],
  [20, "Gray"],
  [29, "Army Green"],
]);

const acceptedConstraint = (card) => {
  const constraints = {
    2: "Use the blue sleeveless open-knit polo once only for Spring or Summer Casual Everyday, Date Night, Travel, or Vacation. Pair with a controlled straight linen trouser or tailored short and a low-profile casual shoe.",
    4: "Use the light-blue regular button-down once only for Spring or Summer Office, Date Night, Travel, Vacation, or elevated Casual Everyday. Keep the bottom straight or tailored and avoid a second oversized layer.",
    7: "Use the orange relaxed mandarin-collar shirt once only for Summer Vacation, Date Night, Party, or Casual Everyday. Balance it with ecru, stone, khaki, or controlled blue bottoms and restrained footwear.",
    9: "Use the dusty-blue corduroy shirt once only for Fall or mild Winter Casual Everyday, Office, Date Night, or Travel. Pair with a straight neutral bottom and avoid making the full outfit dark or heavy.",
    17: "Use the light-blue cotton-linen straight trouser once only for Spring or Summer Casual Everyday, Travel, or Vacation. Pair with a regular-not-oversized top and a minimal sneaker, loafer, or sandal; do not style it as a puddled wide leg.",
    20: "Use the gray regular straight drawstring trouser once only for Spring or Fall Office, Casual Everyday, Date Night, or Travel. Keep the top tucked or controlled at the hem and avoid bulky outerwear.",
    29: "Use the army-green corduroy shacket once only for Fall or mild Winter Casual Everyday, Date Night, or Travel. Layer over white, ecru, light blue, or another light top with a straight bottom so the board stays balanced.",
  };
  return constraints[card];
};

const rejectionReason = (card) => {
  if ([1, 3, 6, 10, 15, 16].includes(card)) {
    return "Tight, deep-neck, contrast-trim, overlong, costume-like, or dated styling fails the modern regular-silhouette gate.";
  }
  if ([5, 8, 11, 13, 14].includes(card)) {
    return "Hanger, flat-lay, or distant single-lifestyle imagery does not prove the adult-male fit and product detail required for approval.";
  }
  if (card === 12) {
    return "The corduroy shirt is substantially overlong and oversized on body, failing the controlled relaxed-fit requirement.";
  }
  if ([18, 22, 23, 24, 25, 26, 27].includes(card)) {
    return "Baggy, extra-wide, cropped, ballooned, long-Bermuda, or puddled proportions fail the controlled-bottom requirement.";
  }
  if (card === 19) {
    return "The narrow tapered drawstring trouser recreates the skinny-bottom problem and does not add a modern straight silhouette.";
  }
  if ([21, 28, 30, 33, 37, 39].includes(card)) {
    return "Product-only imagery does not prove rise, leg or jacket proportion, hem behavior, or adult-male fit well enough for one-time allocation.";
  }
  if ([31, 35, 36, 38].includes(card)) {
    return "Shiny synthetic fabric, bulky collar or pockets, excess zips and hardware, or dated field-jacket detailing fails the restrained modern outerwear gate.";
  }
  if (card === 32) {
    return "Multiple motorsport-style patches and chest logos make the denim jacket busy, dated, and incompatible with the Zara-led brief.";
  }
  if (card === 34) {
    return "The otherwise useful chore-jacket shape has visible pseudo-brand text, inconsistent Army Green naming for a brown image, and weak variant fidelity.";
  }
  if (card === 40) {
    return "The corduroy jacket is too close-fitting and uses a cheap-looking drawstring shawl collar, so it fails the clean modern outerwear gate.";
  }
  throw new Error(`Missing rejection reason for card ${card}`);
};

const pool = JSON.parse(await readFile(poolPath, "utf8"));
const batch = JSON.parse(await readFile(batchPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const existing = manifest.entries.filter(
  (entry) => entry.sourceCollection === sourceCollection,
);
if (existing.length === 40) {
  console.log(
    JSON.stringify(
      {
        alreadyApplied: true,
        decisions: existing.length,
        accepted: existing.filter((entry) => entry.status === "accept").length,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (existing.length) {
  throw new Error(`Partial prior application detected: ${existing.length}`);
}

const newEntries = batch.products.map((batchProduct) => {
  const product = pool.products[batchProduct.identity];
  const base = {
    identity: batchProduct.identity,
    sourceCollection,
    sourceReviewIds: [
      `RAW-P01-${String(batchProduct.card).padStart(3, "0")}`,
    ],
  };
  const selectedColor = acceptedCards.get(batchProduct.card);
  if (!selectedColor) {
    return {
      ...base,
      status: "reject",
      reason: rejectionReason(batchProduct.card),
      selectedVariant: null,
    };
  }
  const color = product.colors.find(
    (candidate) => candidate.color === selectedColor,
  );
  if (!color) {
    throw new Error(
      `Missing ${selectedColor} for card ${batchProduct.card}: ${product.title}`,
    );
  }
  return {
    ...base,
    status: "accept",
    constraints: [acceptedConstraint(batchProduct.card)],
    selectedVariant: {
      reviewId: base.sourceReviewIds[0],
      productId: batchProduct.identity,
      styleRagId: batchProduct.identity,
      sourceProductId: product.sourceProductId,
      variantId: color.variantId,
      title: product.title,
      garmentType: product.garmentType,
      slot: batchProduct.slot,
      color: color.color,
      image: color.sourceImageUrl,
      price: product.price,
      currency: product.currency,
    },
  };
});
manifest.entries.push(...newEntries);

const statusCounts = Object.fromEntries(
  ["reject", "accept", "conditional", "duplicate-existing"].map((status) => [
    status,
    manifest.entries.filter((entry) => entry.status === status).length,
  ]),
);
const uniqueIdentities = new Set(manifest.entries.map((entry) => entry.identity));
const usableEntries = manifest.entries.filter(
  (entry) => entry.status === "accept" || entry.status === "conditional",
);
const usableIdentities = new Set(usableEntries.map((entry) => entry.identity));
const usableGroups = Map.groupBy(usableEntries, (entry) => entry.identity);
const collectionCounts = [
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
  });

manifest.generatedAt = new Date().toISOString();
manifest.summary = {
  reviewDecisionRows: manifest.entries.length,
  uniqueIdentitiesReviewed: uniqueIdentities.size,
  usableUniqueIdentities: usableIdentities.size,
  statusCounts,
  collectionCounts,
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

const rows = newEntries
  .map((entry, index) => {
    const batchProduct = batch.products[index];
    const product = pool.products[batchProduct.identity];
    const color = entry.selectedVariant?.color ?? "—";
    const detail =
      entry.status === "accept" ? entry.constraints[0] : entry.reason;
    return `| ${batchProduct.card} | ${entry.sourceReviewIds[0]} | ${batchProduct.slot} | ${product.title.replaceAll("|", "\\|")} | ${String(color).replaceAll("|", "\\|")} | **${entry.status}** | ${detail.replaceAll("|", "\\|")} |`;
  })
  .join("\n");

const qa = `# Raw Men's Priority Batch 01 — One-by-One Visual QA

Status: complete visual review of 40 previously unreviewed raw-catalog identities. Wedding and Wedding Guest remain excluded and untouched.

## Result

- 40 identities and all 203 recorded color images rendered without broken images.
- 7 accepted with one exact color and variant selected: four tops, two bottoms, and one outerwear identity.
- 33 rejected.
- Accepted colors intentionally add blue, light blue, orange, dusty blue, gray, and army green rather than another all-black bank.
- Rejections include tight or dated shirts, deep V-necks, overlong costume shapes, hanger-only products, baggy or puddled trousers, below-knee shorts, and cheap or unproven jackets.
- The accepted items are individual-product approvals only; complete outfits still require separate rendered visual QA.

## Decisions

| Card | Review ID | Slot | Product | Selected color | Decision | Visual reason or strict use |
|---:|---|---|---|---|---|---|
${rows}
`;
await writeFile(
  `${reportDirectory}/RAW_PRIORITY_BATCH_01_ONE_BY_ONE_QA.md`,
  qa,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      added: newEntries.length,
      accepted: newEntries.filter((entry) => entry.status === "accept").length,
      rejected: newEntries.filter((entry) => entry.status === "reject").length,
      acceptedBySlot: Object.fromEntries(
        ["top", "bottom", "outerwear"].map((slot) => [
          slot,
          newEntries.filter(
            (entry) =>
              entry.status === "accept" && entry.selectedVariant.slot === slot,
          ).length,
        ]),
      ),
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
