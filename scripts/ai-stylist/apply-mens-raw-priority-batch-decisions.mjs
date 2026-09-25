import { readFile, writeFile } from "node:fs/promises";

const configPath = process.argv[2];
if (!configPath) {
  throw new Error("Pass a raw-priority decision config JSON path.");
}

const config = JSON.parse(await readFile(configPath, "utf8"));
const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const poolPath =
  "output/reports/mens-nonwedding-scenario-pools-20260911.json";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const batchPath = `${reportDirectory}/raw-priority-batch-${config.batch}.json`;
const sourceCollection = `raw-priority-batch-${config.batch}`;
const reviewPrefix = `RAW-P${config.batch}`;

const pool = JSON.parse(await readFile(poolPath, "utf8"));
const batch = JSON.parse(await readFile(batchPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const existing = manifest.entries.filter(
  (entry) => entry.sourceCollection === sourceCollection,
);
if (existing.length === batch.products.length) {
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

const rejectionReason = (card) => {
  const group = config.rejectionGroups.find((candidate) =>
    candidate.cards.includes(card),
  );
  if (!group) throw new Error(`Missing rejection reason for card ${card}`);
  return group.reason;
};

const newEntries = batch.products.map((batchProduct) => {
  const product = pool.products[batchProduct.identity];
  const reviewId = `${reviewPrefix}-${String(batchProduct.card).padStart(3, "0")}`;
  const base = {
    identity: batchProduct.identity,
    sourceCollection,
    sourceReviewIds: [reviewId],
  };
  const approval = config.approvals[String(batchProduct.card)];
  if (!approval) {
    return {
      ...base,
      status: "reject",
      reason: rejectionReason(batchProduct.card),
      selectedVariant: null,
    };
  }
  const color = product.colors.find(
    (candidate) => candidate.color === approval.color,
  );
  if (!color) {
    throw new Error(
      `Missing ${approval.color} for card ${batchProduct.card}: ${product.title}`,
    );
  }
  return {
    ...base,
    status: "accept",
    constraints: [approval.constraint],
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

const qa = `# Raw Men's Priority Batch ${config.batch} — One-by-One Visual QA

Status: complete visual review of ${batch.products.length} previously unreviewed raw-catalog identities. Wedding and Wedding Guest remain excluded and untouched.

## Result

${config.qaSummary.map((line) => `- ${line}`).join("\n")}
- The accepted items are individual-product approvals only; complete outfits still require separate rendered visual QA.

## Decisions

| Card | Review ID | Slot | Product | Selected color | Decision | Visual reason or strict use |
|---:|---|---|---|---|---|---|
${rows}
`;
await writeFile(
  `${reportDirectory}/RAW_PRIORITY_BATCH_${config.batch}_ONE_BY_ONE_QA.md`,
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
