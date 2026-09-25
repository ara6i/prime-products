import { readFile, writeFile } from "node:fs/promises";

const poolPath =
  "output/reports/mens-nonwedding-scenario-pools-20260911.json";
const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const sourceCollection = "raw-nonwedding-shoes";

const rejectionReason = (product) => {
  const title = product.title.toLowerCase();
  if (title.includes("double buckle")) {
    return "The restrained double-buckle shape is visually plausible, but the listing is not men-specific and its US 5-11 size conversion does not establish a credible men's size run. It fails the men's identity gate.";
  }
  if (title.includes("canvas sneakers")) {
    return "The image shows a retro mesh runner rather than the listed canvas sneaker, and all three named colors reuse the same black-and-orange image. Product and variant identity are not reliable enough to use.";
  }
  if (title.includes("horsebit loafers")) {
    return "The black cowhide loafer is visually acceptable in isolation, but its Coffee Brown variant reuses the black image and the existing accepted pool already covers cleaner loafer roles. This formal-heavy identity does not repair the current footwear imbalance.";
  }
  if (title.includes("toe post")) {
    return "The generic T-strap sandal is not presented as men's footwear, has inconsistent variant imagery, and does not provide a credible modern men's identity.";
  }
  if (title.includes("tropical leaf")) {
    return "The bright tropical flip-flop is loud, logo-heavy, and visually generic rather than a restrained modern resort shoe.";
  }
  if (title.includes("faux fur")) {
    return "Faux-fur platform house slippers do not fit any included non-wedding AI Stylist occasion and the imagery reads women-led rather than men's fashion.";
  }
  if (title.includes("heightening")) {
    return "Hidden-height construction, a sculpted synthetic sole, side text, and dress-sneaker hybrid styling fail the clean modern footwear gate.";
  }
  if (title.includes("old man shoes")) {
    return "Exaggerated layered panels, printed laces, and a bulky segmented sole read as a cheap dad sneaker rather than a restrained modern shoe.";
  }
  if (title.includes("fly woven") || title.includes("flying woven")) {
    return "Sock-like knit construction, oversized platform or segmented soles, and dated dress-sneaker proportions fail the modern silhouette and quality gates.";
  }
  if (title.includes("flying knit") || title.includes("net shoes")) {
    return "The generic knit trainer has loud contrast branding, a heavily molded sole, and insufficient construction quality for the Zara-led brief.";
  }
  if (title.includes("hiking shoes")) {
    return "Bulky synthetic panels, neon accents, exposed speed hooks, and large OUTDOOR branding make this a low-quality technical-looking shoe rather than a clean hiking option.";
  }
  if (title.includes("high top casual trainers")) {
    return "Crossed straps, a bulky segmented sole, and cheap mixed-material detailing create an overdesigned high-top that fails the modern quality gate.";
  }
  if (title.includes("round toe lace up platform")) {
    return "Graphic embroidery, printed foxing, a platform sole, and women-led imagery fail the men's identity and restrained-design gates.";
  }
  if (title.includes("small leather shoes")) {
    return "The tonal beige color is useful, but the bulky perforated upper, thick lugged platform, and weak product naming read as a generic fashion sneaker rather than a clean low-profile option.";
  }
  if (title.includes("plus velvet")) {
    return "The padded PU moc-toe upper, heavy orthopedic sole, visible badge, and dated winter-shoe proportions fail the modern footwear gate.";
  }
  if (title.includes("plus size shoes")) {
    return "The mesh-and-faux-suede hiking moccasin has an aggressively studded wraparound sole and cheap mixed detailing; it is neither a clean casual shoe nor a credible trail shoe.";
  }
  if (title.includes("three-joint oxford")) {
    return "The sharply pointed cap toe, strong gradient shine, and highly formal presentation repeat the exact dated formal-shoe bias the new men's catalog must remove.";
  }
  if (title.includes("patent leather")) {
    return "Artificial-PU patent shine, a pointed toe, logo hardware, and a curved dress sole look dated and costume-like rather than modern.";
  }
  if (title.includes("woven fashion brooch")) {
    return "Glossy basket-weave panels, brogue decoration, a pointed toe, and mixed faux materials create an overdesigned formal shoe that fails the Zara-led restraint gate.";
  }
  if (title.includes("lace-up british")) {
    return "Contrasting woven panels, metal lace hardware, a split-color upper, and a thick casual sole form a dated dress-sneaker hybrid.";
  }
  throw new Error(`Missing rejection reason for ${product.title}`);
};

const pool = JSON.parse(await readFile(poolPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const existing = manifest.entries.filter(
  (entry) => entry.sourceCollection === sourceCollection,
);
if (existing.length === 22) {
  console.log(
    JSON.stringify(
      { alreadyApplied: true, decisions: existing.length, accepted: 0 },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (existing.length) {
  throw new Error(`Partial prior application detected: ${existing.length}`);
}

const reviewedIdentities = new Set(
  manifest.entries.map((entry) => entry.identity),
);
const shoeIdentities = new Set();
for (const scenarioPool of pool.pools) {
  const { gender, occasion } = scenarioPool.scenario;
  if (gender !== "male") continue;
  if (["wedding", "wedding-guest"].includes(occasion)) continue;
  for (const identity of scenarioPool.productIdsBySlot?.shoe ?? []) {
    if (!reviewedIdentities.has(identity)) shoeIdentities.add(identity);
  }
}

const products = [...shoeIdentities]
  .map((identity) => pool.products[identity])
  .filter(Boolean)
  .sort((left, right) => left.title.localeCompare(right.title));
if (products.length !== 22) {
  throw new Error(`Expected 22 unreviewed raw shoes, found ${products.length}`);
}

const newEntries = products.map((product, index) => ({
  identity: product.styleRagId ?? product.productId,
  sourceCollection,
  sourceReviewIds: [`RAW-SHOE-${String(index + 1).padStart(3, "0")}`],
  status: "reject",
  reason: rejectionReason(product),
  selectedVariant: null,
}));
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
    const product = products[index];
    const colors = product.colors.map((color) => color.color).join(", ");
    return `| ${index + 1} | ${entry.sourceReviewIds[0]} | ${product.title.replaceAll("|", "\\|")} | ${colors.replaceAll("|", "\\|")} | **reject** | ${entry.reason.replaceAll("|", "\\|")} |`;
  })
  .join("\n");

const qa = `# Raw Men's Non-Wedding Shoes — One-by-One Visual QA

Status: complete visual review of all 22 shoe identities that were present in the raw men's non-wedding scenario pool but absent from the visual decision ledger. Wedding and Wedding Guest remain excluded and untouched.

## Result

- 22 identities reviewed one by one, including every recorded color image.
- 0 accepted.
- 22 rejected.
- No identity is added merely to increase shoe count.
- The main failures were gender misclassification, hidden-height or platform construction, cheap knit trainers, dated dress-sneaker hybrids, patent/pointed formal shoes, variant-image mismatch, and orthopedic-looking soles.
- The restrained double-buckle sandal still failed because the listing did not prove a men's identity or credible men's size conversion.
- The black cowhide horsebit loafer was not retained because its second color was unproven and it would deepen the already formal-heavy loafer bias rather than repair the missing casual, resort, sport, and seasonal coverage.

## Decisions

| Card | Review ID | Product | Recorded colors | Decision | Visual reason |
|---:|---|---|---|---|---|
${rows}

These rejections confirm that the remaining shoe gap must be solved through exact-page manual sourcing. None of these identities may enter an outfit or be sent for refinement.
`;
await writeFile(
  `${reportDirectory}/RAW_SHOES_ONE_BY_ONE_QA.md`,
  qa,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      added: newEntries.length,
      accepted: 0,
      rejected: newEntries.length,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
