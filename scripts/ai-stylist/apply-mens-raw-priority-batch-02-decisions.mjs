import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const poolPath =
  "output/reports/mens-nonwedding-scenario-pools-20260911.json";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const batchPath = `${reportDirectory}/raw-priority-batch-02.json`;
const sourceCollection = "raw-priority-batch-02";

const approvals = new Map([
  [1, "Apricot"],
  [5, "Gray"],
  [12, "Green Stripe"],
]);

const constraints = {
  1: "Use the apricot short-sleeve wrap shirt once only for Spring or Summer Date Night, Party, Vacation, Resort, or elevated Casual Everyday. Pair it with a clean straight trouser or tailored short in white, ecru, stone, or muted blue and restrained low-profile footwear.",
  5: "Use the gray fine-striped regular-relaxed button-down once only for Spring or Fall Casual Everyday, Office, Date Night, or Travel. Keep the bottom straight and lighter than charcoal so the complete outfit does not become dark or corporate.",
  12: "Use the soft green striped button-down once only for Spring or Summer Office, Casual Everyday, Date Night, or Travel. Pair it with ecru, stone, tan, or controlled mid-blue bottoms and clean low-profile footwear.",
};

const rejectionReason = (card) => {
  if ([2, 3, 8, 9, 10, 13, 15, 16].includes(card)) {
    return "Hanger, folded, or garment-only imagery does not prove the adult-male fit, shoulder, torso, length, or material behavior required for approval.";
  }
  if ([4, 6, 11].includes(card)) {
    return "The tight or dated striped construction, cheap contrast detailing, fleece lining, or exaggerated pattern fails the modern Zara-led shirt gate.";
  }
  if (card === 7) {
    return "The visible red chest tab and near-duplicate dark microstripe identity do not add enough quality or palette value over cleaner approved shirts.";
  }
  if (card === 14) {
    return "The large pseudo-brand chest patch and overlong striped overshirt treatment read generic supplier-fashion rather than clean modern styling.";
  }
  if ([17, 18, 19, 20, 21, 22, 23, 24].includes(card)) {
    return "The bottom is extra-wide, puddled, ballooned, panel-heavy, cuff-bunched, logo-marked, or otherwise outside the controlled straight-silhouette requirement.";
  }
  if (card === 25) {
    return "The only credible views are black or dark gray polyester corduroy, repeating an existing dark drawstring role without enough color, material, or silhouette value.";
  }
  if (card === 26) {
    return "The ultra-short bodybuilding cut is too tight and exposed for the versatile Sports / Workout wardrobe being built.";
  }
  if (card === 27) {
    return "Product-only imagery does not prove the length, rise, thigh volume, or adult-male fit of the bright casual short.";
  }
  if (card === 28) {
    return "The below-knee, loose active short is shapeless and recreates the baggy-bottom problem the replacement wardrobe must remove.";
  }
  if ([29, 31, 32, 33, 35, 36, 38, 40].includes(card)) {
    return "Garment-only, hanger, or synthetic-torso imagery does not prove adult-male outerwear fit; patches, bulk, lining, or generic construction further weaken the result.";
  }
  if (card === 30) {
    return "The ankle-length polyester trench, oversized lapels, skinny styling, and dramatic costume silhouette fail the restrained modern outerwear gate.";
  }
  if ([34, 37].includes(card)) {
    return "The dark synthetic corduroy jacket is tight or bulky, visually repetitive, and uses dated leather-collar or snap-front styling.";
  }
  if (card === 39) {
    return "The tonal floral pattern, bright snaps, synthetic construction, and pseudo-brand styling read busy and dated rather than clean modern outerwear.";
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
  const reviewId = `RAW-P02-${String(batchProduct.card).padStart(3, "0")}`;
  const base = {
    identity: batchProduct.identity,
    sourceCollection,
    sourceReviewIds: [reviewId],
  };
  const selectedColor = approvals.get(batchProduct.card);
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
    constraints: [constraints[batchProduct.card]],
    selectedVariant: {
      reviewId,
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
        conditional: entries.filter(
          (entry) => entry.status === "conditional",
        ).length,
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

const rows = newEntries
  .map((entry, index) => {
    const product = batch.products[index];
    const detail =
      entry.status === "accept" ? entry.constraints[0] : entry.reason;
    return `| ${product.card} | ${entry.sourceReviewIds[0]} | ${product.slot} | ${product.title.replaceAll("|", "\\|")} | ${(entry.selectedVariant?.color ?? "—").replaceAll("|", "\\|")} | **${entry.status}** | ${detail.replaceAll("|", "\\|")} |`;
  })
  .join("\n");

const qa = `# Raw Men's Priority Batch 02 — One-by-One Visual QA

Status: complete visual review of 40 previously unreviewed raw-catalog identities. Wedding and Wedding Guest remain excluded and untouched.

## Result

- 40 identities and all 148 recorded color images rendered; 188 displayed images loaded with zero broken files.
- 3 accepted with one exact color and variant selected, all tops.
- 37 rejected; every bottom and outerwear identity failed.
- Accepted colors are apricot, gray fine-stripe, and soft green stripe.
- Rejections include tight or dated shirts, logo/patch supplier styling, hanger-only products, puddled or ballooned bottoms, shapeless shorts, costume coats, and unproven synthetic outerwear.
- The accepted items are individual-product approvals only; complete outfits still require separate rendered visual QA.

## Decisions

| Card | Review ID | Slot | Product | Selected color | Decision | Visual reason or strict use |
|---:|---|---|---|---|---|---|
${rows}
`;
await writeFile(
  `${reportDirectory}/RAW_PRIORITY_BATCH_02_ONE_BY_ONE_QA.md`,
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
              entry.status === "accept" &&
              entry.selectedVariant?.slot === slot,
          ).length,
        ]),
      ),
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
