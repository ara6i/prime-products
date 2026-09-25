import { readFile, writeFile } from "node:fs/promises";

const poolPath =
  "output/reports/mens-nonwedding-scenario-pools-20260911.json";
const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const sourceCollection = "raw-nonwedding-accessory";
const identity =
  "shopify_supplier:99d198e1c97527c2d831b685dcf31464db5d7054";
const selectedColor = "H";

const pool = JSON.parse(await readFile(poolPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const existing = manifest.entries.filter(
  (entry) => entry.sourceCollection === sourceCollection,
);
if (existing.length === 1) {
  console.log(
    JSON.stringify(
      { alreadyApplied: true, decisions: 1, accepted: 1 },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (existing.length) {
  throw new Error(`Unexpected prior application: ${existing.length}`);
}
if (manifest.entries.some((entry) => entry.identity === identity)) {
  throw new Error(`Identity is already reviewed: ${identity}`);
}

const product = pool.products[identity];
if (!product) throw new Error(`Missing raw product ${identity}`);
const color = product.colors.find((candidate) => candidate.color === selectedColor);
if (!color) throw new Error(`Missing selected variant ${selectedColor}`);

const selectedVariant = {
  reviewId: "RAW-ACC-001",
  productId: identity,
  styleRagId: identity,
  sourceProductId: product.sourceProductId,
  variantId: color.variantId,
  title: product.title,
  garmentType: "minimal mesh-bracelet watch",
  slot: "watch",
  color: "silver and blue",
  image: color.sourceImageUrl,
  price: product.price,
  currency: product.currency,
};

manifest.entries.push({
  identity,
  sourceCollection,
  sourceReviewIds: ["RAW-ACC-001"],
  status: "accept",
  constraints: [
    "Use the silver mesh-bracelet watch with deep-blue dial once only for Office, Interview, Date Night, Formal Evening, or a restrained Party look. Pair it with a light, blue, camel, gray, or burgundy palette; do not let it turn the complete outfit into an all-dark uniform.",
  ],
  selectedVariant,
});

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
    .map(([duplicateIdentity, entries]) => ({
      identity: duplicateIdentity,
      rows: entries.map((entry) => ({
        sourceCollection: entry.sourceCollection,
        sourceReviewIds: entry.sourceReviewIds,
        status: entry.status,
      })),
    })),
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const qa = `# Raw Men's Non-Wedding Accessory — One-by-One Visual QA

Status: complete visual review of the one accessory identity from the raw men's non-wedding scenario pool that was absent from the decision ledger. Wedding and Wedding Guest remain excluded and untouched.

## Result

- One supplier identity reviewed across all eight recorded variants.
- One accepted identity with exactly one selected variant: H, silver mesh bracelet with deep-blue dial.
- The dial is clean and logo-free, the case is slim, and the blue adds controlled color without imitation-luxury detailing.
- The other seven variants remain part of the same identity and cannot be allocated separately.
- Use once only for Office, Interview, Date Night, Formal Evening, or a restrained Party outfit with a light or colored palette.

| Review ID | Product | Selected variant | Decision | Strict use |
|---|---|---|---|---|
| RAW-ACC-001 | ${product.title.replaceAll("|", "\\|")} | H · silver mesh · blue dial | **accept** | ${manifest.entries.at(-1).constraints[0]} |
`;
await writeFile(
  `${reportDirectory}/RAW_ACCESSORY_ONE_BY_ONE_QA.md`,
  qa,
  "utf8",
);

console.log(
  JSON.stringify(
    { added: 1, accepted: 1, selectedVariant, summary: manifest.summary },
    null,
    2,
  ),
);
