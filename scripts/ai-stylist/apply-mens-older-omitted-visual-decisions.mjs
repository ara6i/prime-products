import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const sourceCollection = "older-omitted-local-candidates";

const sources = [
  "output/reports/mens-ui-matrix-existing-candidates-20260912/index.json",
  "output/reports/mens-zara-taste-active-candidate-review-20260912/index.json",
  "output/reports/mens-zara-taste-candidate-review-20260912/index.json",
];

const slotOrder = new Map([
  ["outerwear", 0],
  ["bottom", 1],
  ["top", 2],
]);
const colorPreference = [
  "white",
  "cream",
  "ivory",
  "ecru",
  "apricot",
  "beige",
  "khaki",
  "light gray",
  "light blue",
  "yellow",
  "orange",
  "pink",
  "red",
  "green",
  "blue",
  "brown",
  "gray",
  "navy",
  "black",
];
const colorRank = (color) => {
  const normalized = String(color ?? "").toLowerCase();
  const index = colorPreference.findIndex((candidate) =>
    normalized.includes(candidate),
  );
  return index === -1 ? colorPreference.length : index;
};

const acceptedCards = new Map(
  [
    [1, "blue"],
    [2, "sapphire blue"],
    [6, "army green"],
    [8, "brown"],
    [9, "green"],
    [12, "khaki"],
    [14, "khaki"],
    [15, "army green"],
    [16, "military green"],
    [18, "blue"],
    [19, "light blue"],
    [20, "blue"],
    [21, "light blue"],
    [22, "light green"],
    [24, "khaki"],
    [29, "khaki"],
    [30, "white"],
    [31, "dusty blue"],
    [32, "dusty blue"],
    [33, "white"],
    [34, "military green"],
    [39, "green"],
    [40, "gray green"],
    [41, "white"],
    [49, "light green"],
    [50, "khaki"],
    [58, "sage"],
    [67, "royal blue"],
    [68, "royal blue"],
    [70, "military green"],
    [71, "light gray"],
    [72, "dark"],
    [75, "yellow green"],
    [76, "nostalgic blue"],
    [78, "blue"],
    [82, "light gray"],
    [83, "blue gray"],
    [85, "white"],
    [89, "khaki"],
    [90, "blue"],
    [92, "peacock blue"],
    [94, "medium blue"],
    [97, "dark navy"],
    [107, "trousers"],
    [110, "blue gray"],
    [113, "dusty blue"],
    [121, "lake blue"],
    [125, "brown"],
    [131, "white"],
    [132, "khaki"],
    [133, "blue"],
    [136, "white"],
    [138, "white"],
    [142, "blue"],
    [143, "yellow green"],
    [145, "white"],
    [146, "off white"],
    [147, "light blue"],
    [152, "ivory"],
    [153, "white"],
    [154, "brown"],
    [156, "taupe"],
    [157, "white"],
    [158, "olive"],
    [162, "light blue"],
    [164, "sky blue"],
    [168, "blue"],
    [170, "air force blue"],
    [172, "blue"],
    [175, "french blue"],
  ].map(([card, color]) => [card, color.toLowerCase()]),
);

const cardSets = {
  denimOuterwear: new Set([1, 2, 18, 19, 20, 21]),
  lightOuterwear: new Set([6, 8, 9, 12, 14, 15, 16, 29]),
  winterOuterwear: new Set([22, 24, 30, 31, 32, 33, 34, 39, 40, 41]),
  summerShorts: new Set([49, 50, 58]),
  activeShorts: new Set([67, 68]),
  casualTrousers: new Set([70, 82, 85, 89]),
  jeans: new Set([71, 72, 75, 76, 78, 83, 90, 92, 94, 97, 107, 110, 113]),
  shirts: new Set([121, 125, 131, 132, 133, 138]),
  texturedTops: new Set([136, 142, 143, 145, 146, 147, 152, 153, 154, 156, 157, 158]),
  activeTops: new Set([162, 164, 168, 170, 172, 175]),
  datedOuterwear: new Set([3, 4, 5, 7, 10, 11, 13, 17, 23, 26, 27, 28, 35, 36, 37, 38]),
  multiPieceOuterwear: new Set([25]),
  misclassifiedSets: new Set([42, 43, 44, 45, 46, 47, 48, 53, 55, 57, 60, 62, 81]),
  weakShortsJoggers: new Set([51, 52, 54, 56, 59, 61, 63, 64, 65, 66, 69]),
  baggyOrWeakBottoms: new Set([73, 74, 77, 79, 80, 84, 86, 87, 88, 91, 93, 95, 96, 98, 99, 100, 101, 102, 103, 104, 105, 106, 108, 109, 111, 112, 114, 115, 116, 117, 118]),
  weakOrSkinnyTops: new Set([119, 120, 122, 123, 124, 126, 127, 128, 129, 130, 134, 135, 137, 139, 140, 141, 144, 148, 149, 150, 151, 155, 159, 160, 161, 163, 165, 166, 167, 169, 171, 173, 174]),
};

const acceptedConstraint = (card, variant) => {
  const color = variant.color;
  if (cardSets.denimOuterwear.has(card)) {
    return `Use the ${color} denim layer once only for Spring or Fall Casual Everyday, Date Night, Party, or Travel. Pair it with a regular top and a controlled straight bottom; never allocate it to Summer or Formal Evening.`;
  }
  if (cardSets.lightOuterwear.has(card)) {
    return `Use the ${color} light layer once only for Spring or Fall Casual Everyday, Date Night, Office, Party, or Travel according to its formality. Keep the companion bottom straight and the palette light or warm.`;
  }
  if (cardSets.winterOuterwear.has(card)) {
    return `Use the ${color} cold-weather layer once only for Fall or Winter Casual Everyday, Sports, or Travel. It is not valid for Summer, warm-weather Vacation, Office tailoring, or Formal Evening.`;
  }
  if (cardSets.summerShorts.has(card)) {
    return `Use the ${color} shorts once only for Spring or Summer Casual Everyday, Travel, or Vacation. Pair with a relaxed-not-oversized shirt or knit top and a non-formal summer shoe.`;
  }
  if (cardSets.activeShorts.has(card)) {
    return `Use the ${color} active shorts once only for Spring or Summer Sports, Travel, or active Casual Everyday. Pair only with an active top and training, running, or court footwear.`;
  }
  if (cardSets.casualTrousers.has(card)) {
    return `Use the ${color} trouser once only for Casual Everyday, Date Night, Office, or Travel where the fabric and season are credible. Keep the top regular and the shoe low profile.`;
  }
  if (cardSets.jeans.has(card)) {
    return `Use the ${color} jeans once only for Casual Everyday, Date Night, Party, or Travel. The accepted straight/controlled line must not be paired with an oversized top and bulky outerwear together.`;
  }
  if (cardSets.shirts.has(card)) {
    return `Use the ${color} shirt once only for Spring or Summer Casual Everyday, Date Night, Office, Party, Travel, or Vacation according to sleeve length. Pair with a straight or tailored bottom, not a puddled wide leg.`;
  }
  if (cardSets.texturedTops.has(card)) {
    return `Use the ${color} textured top once only for a seasonally appropriate Casual Everyday, Date Night, Office, Party, or Travel look. Preserve a regular silhouette and add color elsewhere when this top is neutral.`;
  }
  if (cardSets.activeTops.has(card)) {
    return `Use the ${color} active top once only for Sports, Travel, or active Casual Everyday. Pair with a genuine active bottom and performance shoe; do not place it in Office or Formal Evening.`;
  }
  throw new Error(`Missing accepted constraint for card ${card}`);
};

const rejectedReason = (card) => {
  if (cardSets.datedOuterwear.has(card)) {
    return "Dated, cheaply detailed, overly slim, or visually repetitive outerwear does not add a credible modern Zara-led role.";
  }
  if (cardSets.multiPieceOuterwear.has(card)) {
    return "Vest-and-chest-bag set cannot be treated as one clean standalone outerwear identity without misrepresenting the sold product.";
  }
  if (cardSets.misclassifiedSets.has(card)) {
    return "Complete top-and-bottom set is misclassified as a standalone bottom; splitting it would misrepresent the product and create styling collisions.";
  }
  if (cardSets.weakShortsJoggers.has(card)) {
    return "Cut is overly long, tapered, generic, poorly proven, or visually repetitive, so it does not justify a unique bottom allocation.";
  }
  if (cardSets.baggyOrWeakBottoms.has(card)) {
    return "Baggy or puddled silhouette, dated wash or decoration, excessive taper, weak fit proof, or near-duplicate denim fails the controlled-bottom gate.";
  }
  if (cardSets.weakOrSkinnyTops.has(card)) {
    return "Skin-tight, dated, overdesigned, generic, visually repetitive, or weakly proven top fails the modern regular-silhouette and product-detail gates.";
  }
  throw new Error(`Missing rejection reason for card ${card}`);
};

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const alreadyApplied = manifest.entries.filter(
  (entry) => entry.sourceCollection === sourceCollection,
);
if (alreadyApplied.length === 175) {
  console.log(
    JSON.stringify(
      {
        alreadyApplied: true,
        decisions: alreadyApplied.length,
        accepted: alreadyApplied.filter((entry) => entry.status === "accept").length,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (alreadyApplied.length) {
  throw new Error(`Partial prior application detected: ${alreadyApplied.length}`);
}

const reviewedIdentities = new Set(manifest.entries.map((entry) => entry.identity));
const groupsByIdentity = new Map();
for (const sourcePath of sources) {
  const index = JSON.parse(await readFile(sourcePath, "utf8"));
  for (const [category, rows] of Object.entries(index.categories)) {
    for (const row of rows) {
      const identity = row.styleRagId ?? row.productId;
      if (!identity || reviewedIdentities.has(identity)) continue;
      if (!groupsByIdentity.has(identity)) {
        groupsByIdentity.set(identity, {
          identity,
          categories: new Set(),
          variants: new Map(),
        });
      }
      const group = groupsByIdentity.get(identity);
      group.categories.add(category);
      group.variants.set(row.variantId ?? row.image, row);
    }
  }
}

const groups = [...groupsByIdentity.values()].map((group) => {
  const variants = [...group.variants.values()].sort(
    (left, right) =>
      colorRank(left.color) - colorRank(right.color) ||
      String(left.color).localeCompare(String(right.color)),
  );
  return { ...group, variants, representative: variants[0] };
});
groups.sort((left, right) => {
  const slotDifference =
    (slotOrder.get(left.representative.slot) ?? 99) -
    (slotOrder.get(right.representative.slot) ?? 99);
  if (slotDifference) return slotDifference;
  const categoryDifference = [...left.categories][0].localeCompare(
    [...right.categories][0],
  );
  if (categoryDifference) return categoryDifference;
  return left.representative.title.localeCompare(right.representative.title);
});

if (groups.length !== 175 || acceptedCards.size !== 70) {
  throw new Error(
    `Decision set mismatch: candidates=${groups.length}, accepted=${acceptedCards.size}`,
  );
}

const newEntries = groups.map((group, index) => {
  const card = index + 1;
  const selectedColor = acceptedCards.get(card);
  const base = {
    identity: group.identity,
    sourceCollection,
    sourceReviewIds: group.variants.map((variant) => variant.reviewId),
  };
  if (!selectedColor) {
    return {
      ...base,
      status: "reject",
      reason: rejectedReason(card),
      selectedVariant: null,
    };
  }
  const selectedVariant = group.variants.find(
    (variant) => String(variant.color).toLowerCase() === selectedColor,
  );
  if (!selectedVariant) {
    throw new Error(`Missing selected color ${selectedColor} for card ${card}`);
  }
  return {
    ...base,
    status: "accept",
    constraints: [acceptedConstraint(card, selectedVariant)],
    selectedVariant,
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
      conditional: entries.filter((entry) => entry.status === "conditional").length,
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

const markdownRows = newEntries
  .map((entry, index) => {
    const group = groups[index];
    const variant = entry.selectedVariant;
    const title = variant?.title ?? group.representative.title;
    const color = variant?.color ?? "—";
    const detail =
      entry.status === "accept" ? entry.constraints.join(" ") : entry.reason;
    return `| ${index + 1} | ${entry.sourceReviewIds.join(", ")} | ${title.replaceAll("|", "\\|")} | ${String(color).replaceAll("|", "\\|")} | **${entry.status}** | ${detail.replaceAll("|", "\\|")} |`;
  })
  .join("\n");

const qa = `# Older Omitted Local Candidates — One-by-One Visual QA

Status: complete visual review of every identity that appeared only in the three older capped candidate indexes. Wedding and Wedding Guest remain excluded and untouched.

## Result

- 175 unique identities reviewed one by one, including every recorded color image.
- 70 accepted with one exact color and SKU selected.
- 105 rejected.
- Accepted additions: 24 outerwear, 22 bottoms, and 24 tops.
- No shoes, suits, bags, watches, or standalone accessories existed in this omitted pool.
- Full sets were rejected when cataloged only as a bottom; splitting a sold set would misrepresent its product identity.
- Baggy or puddled jeans, skinny tops, cheap/dated outerwear, and near-duplicate basics were rejected even when their metadata sounded suitable.

## Decisions

| Card | Review IDs | Product | Selected color | Decision | Visual reason or strict use |
|---:|---|---|---|---|---|
${markdownRows}

An accepted product is not automatically an approved outfit. Each identity may be allocated once only after its complete outfit passes season, occasion, budget, palette, silhouette, and final rendered-board review.
`;

await writeFile(
  `${reportDirectory}/OLDER_OMITTED_CANDIDATES_ONE_BY_ONE_QA.md`,
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
