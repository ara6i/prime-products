#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const alphaManifestPath = path.join(
  reportRoot,
  "cj-manual-gemini-final-alpha/alpha-approval-manifest.json",
);
const candidatesPath = path.join(
  reportRoot,
  "cj-manual-approved-candidates.json",
);
const s137DraftPath = path.join(
  reportRoot,
  "summer-casual-budget-pilot-v9-partial/agent-styled-draft.json",
);
const s193DraftPath = path.join(
  reportRoot,
  "fall-date-budget-pilot-s193-v1-partial/agent-styled-draft.json",
);
const s189DraftPath = path.join(
  reportRoot,
  "summer-date-budget-pilot-s189-v1-partial/agent-styled-draft.json",
);
const s149DraftPath = path.join(
  reportRoot,
  "spring-office-budget-pilot-s149-v1-partial/agent-styled-draft.json",
);
const s137RecomposedDraftPath = path.join(
  reportRoot,
  "s137-recomposed-candidates/agent-styled-draft.json",
);
const s193RecomposedDraftPath = path.join(
  reportRoot,
  "s193-recomposed-candidates/agent-styled-draft.json",
);
const outputJsonPath = path.join(
  reportRoot,
  "cj-manual-gemini-final-alpha/scenario-reservations.json",
);
const outputMarkdownPath = path.join(
  reportRoot,
  "CJ_FINAL_ALPHA_SCENARIO_RESERVATIONS.md",
);

const [
  alphaManifest,
  candidates,
  s137Draft,
  s149Draft,
  s189Draft,
  s193Draft,
  s137RecomposedDraft,
  s193RecomposedDraft,
] = await Promise.all([
  readFile(alphaManifestPath, "utf8").then(JSON.parse),
  readFile(candidatesPath, "utf8").then(JSON.parse),
  readFile(s137DraftPath, "utf8").then(JSON.parse),
  readFile(s149DraftPath, "utf8").then(JSON.parse),
  readFile(s189DraftPath, "utf8").then(JSON.parse),
  readFile(s193DraftPath, "utf8").then(JSON.parse),
  readFile(s137RecomposedDraftPath, "utf8").then(JSON.parse),
  readFile(s193RecomposedDraftPath, "utf8").then(JSON.parse),
]);

const productById = new Map(
  candidates.products.map((product) => [String(product.productId), product]),
);
const activeAlphaEntries = alphaManifest.entries.filter((entry) => {
  const product = productById.get(String(entry.productId));
  return (
    entry.alphaVisualDecision === "approved" &&
    String(product?.status ?? "").startsWith("approved-for")
  );
});
const styleRevokedAlphaEntries = alphaManifest.entries.filter(
  (entry) => !activeAlphaEntries.includes(entry),
);
const alphaById = new Map(
  activeAlphaEntries.map((entry) => [String(entry.productId), entry]),
);

const scenarioById = new Map([
  [
    "S133",
    {
      occasion: "Casual Everyday",
      season: "Spring",
      budget: "Budget-Friendly",
    },
  ],
  [
    "S137",
    {
      occasion: "Casual Everyday",
      season: "Summer",
      budget: "Budget-Friendly",
    },
  ],
  [
    "S141",
    { occasion: "Casual Everyday", season: "Fall", budget: "Budget-Friendly" },
  ],
  [
    "S149",
    { occasion: "Work/Office", season: "Spring", budget: "Budget-Friendly" },
  ],
  [
    "S153",
    { occasion: "Work/Office", season: "Summer", budget: "Budget-Friendly" },
  ],
  [
    "S157",
    { occasion: "Work/Office", season: "Fall", budget: "Budget-Friendly" },
  ],
  [
    "S173",
    { occasion: "Formal Evening", season: "Fall", budget: "Budget-Friendly" },
  ],
  [
    "S185",
    { occasion: "Date Night", season: "Spring", budget: "Budget-Friendly" },
  ],
  [
    "S189",
    { occasion: "Date Night", season: "Summer", budget: "Budget-Friendly" },
  ],
  [
    "S193",
    { occasion: "Date Night", season: "Fall", budget: "Budget-Friendly" },
  ],
  [
    "S205",
    {
      occasion: "Party/Night Out",
      season: "Summer",
      budget: "Budget-Friendly",
    },
  ],
  [
    "S209",
    { occasion: "Party/Night Out", season: "Fall", budget: "Budget-Friendly" },
  ],
  ["S233", { occasion: "Travel", season: "Spring", budget: "Budget-Friendly" }],
  ["S237", { occasion: "Travel", season: "Summer", budget: "Budget-Friendly" }],
  ["S241", { occasion: "Travel", season: "Fall", budget: "Budget-Friendly" }],
  [
    "S253",
    {
      occasion: "Vacation/Resort",
      season: "Summer",
      budget: "Budget-Friendly",
    },
  ],
]);

const plannedReservations = [
  {
    productId: "2510060252201615900",
    scenarioId: "S141",
    slot: "top",
    plannedPairingBrief:
      "Pair with ecru relaxed-straight denim and a light stone suede court sneaker; keep the brown knit as the warm focal color.",
  },
  {
    productId: "2505030853171607400",
    scenarioId: "S253",
    slot: "top",
    plannedPairingBrief:
      "Pair with terracotta or soft-aqua tailored shorts and a woven leather slip-on for a bright resort look.",
  },
  {
    productId: "2503120536241602800",
    scenarioId: "S237",
    slot: "outerwear",
    plannedPairingBrief:
      "Use open as a light travel layer over a pale-sky tee with olive shorts and a clean ecru sneaker.",
  },
  {
    productId: "2505230844101616100",
    scenarioId: "S133",
    slot: "outerwear",
    plannedPairingBrief:
      "Pair with the visually screened cream chevron-knit shirt and French-blue controlled-straight trouser; finish with a unique cream gum-sole sneaker, compact cognac bag and one restrained warm accessory.",
  },
  {
    productId: "2411230856521607100",
    scenarioId: "S185",
    slot: "bottom",
    plannedPairingBrief:
      "Pair with a dusty-rose or sky-blue relaxed knit and a low-profile cream leather sneaker for a modern spring date look.",
  },
  {
    productId: "2502130357161608600",
    scenarioId: "S173",
    slot: "accessory",
    plannedPairingBrief:
      "Use with a tobacco or olive unstructured suit and warm-white shirt; the belt must match a dark-brown loafer rather than introduce black.",
  },
  {
    productId: "2503280137551608300",
    scenarioId: "S233",
    slot: "accessory",
    plannedPairingBrief:
      "Pair with the visually screened soft-blue regular overshirt and deep-olive relaxed-taper travel chino; finish with a unique off-white low-profile sneaker and olive-and-tan minimalist backpack.",
  },
  {
    productId: "2506231532431626500",
    scenarioId: "S153",
    slot: "top",
    plannedPairingBrief:
      "Pair with muted-blue or olive pleated trousers and a tobacco suede loafer for breathable summer office polish.",
  },
  {
    productId: "2505191522541624600",
    scenarioId: "S205",
    slot: "top",
    plannedPairingBrief:
      "Pair with rust or sage tailored trousers and a sand suede shoe; keep the open texture as the party detail without adding dark layers.",
  },
  {
    productId: "2411110358151627900",
    scenarioId: "S209",
    slot: "outerwear",
    plannedPairingBrief:
      "Pair with a cream knit tee, straight taupe trouser and light stone sneaker so wine red reads energetic, not heavy.",
  },
  {
    productId: "1716804667801350144",
    scenarioId: "S241",
    slot: "outerwear",
    plannedPairingBrief:
      "Pair with a light-blue chambray shirt, warm ecru trouser and tobacco sneaker for a practical color-rich fall travel look.",
  },
];

function buildProductReservation(productId, allocation) {
  const alpha = alphaById.get(String(productId));
  const product = productById.get(String(productId));
  if (!alpha) throw new Error(`Missing final-alpha approval for ${productId}`);
  if (!product)
    throw new Error(`Missing approved product metadata for ${productId}`);
  const scenario = scenarioById.get(allocation.scenarioId);
  if (!scenario)
    throw new Error(`Missing scenario definition for ${allocation.scenarioId}`);
  if (allocation.scenarioId >= "S181" && allocation.scenarioId <= "S184") {
    throw new Error(
      `Wedding Guest scenario is excluded: ${allocation.scenarioId}`,
    );
  }
  if (scenario.budget === "Premium" || scenario.budget === "Luxury") {
    throw new Error(
      `Unproven CJ pricing cannot be reserved to ${scenario.budget}`,
    );
  }
  return {
    productId: String(product.productId),
    sku: product.sku,
    title: product.title,
    garmentType: product.garmentType,
    color: product.color,
    supplierPrice: product.price,
    supplierCurrency: product.currency,
    cjPageUrl: product.cjPageUrl,
    finalImage: alpha.finalPath,
    scenarioId: allocation.scenarioId,
    ...scenario,
    slot: allocation.slot,
    outfitPosition: allocation.outfitPosition ?? null,
    reservationStatus: allocation.reservationStatus,
    plannedPairingBrief: allocation.plannedPairingBrief,
    uiIntegrated: false,
  };
}

const boardAllocationByProductId = new Map();
for (const draft of [
  s137Draft,
  s149Draft,
  s189Draft,
  s193Draft,
  s137RecomposedDraft,
  s193RecomposedDraft,
]) {
  const qaByPosition = new Map(
    draft.visualQa.map((entry) => [Number(entry.position), entry]),
  );
  for (const scenarioGroup of draft.scenarios) {
    for (const outfit of scenarioGroup.outfitSets.separates) {
      const outfitPassed =
        qaByPosition.get(Number(outfit.position))?.decision === "pass";
      for (const item of outfit.items) {
        if (!alphaById.has(String(item.productId))) continue;
        const allocation = {
          productId: String(item.productId),
          scenarioId: scenarioGroup.scenario.id,
          slot: item.slot,
          outfitPosition: outfit.position,
          reservationStatus: outfitPassed
            ? "complete-outfit-visual-approved"
            : "reserved-not-outfit-approved",
          plannedPairingBrief: outfitPassed
            ? `Locked in visually approved ${scenarioGroup.scenario.id} look ${outfit.position}: ${outfit.name}.`
            : `Returned to planning after the source-image audit revoked ${scenarioGroup.scenario.id} look ${outfit.position}: ${outfit.name}.`,
        };
        const existing = boardAllocationByProductId.get(allocation.productId);
        if (
          allocation.reservationStatus === "complete-outfit-visual-approved" ||
          existing?.reservationStatus !== "complete-outfit-visual-approved"
        ) {
          boardAllocationByProductId.set(allocation.productId, allocation);
        }
      }
    }
  }
}

const manualReallocationByProductId = new Map([
  [
    "736610CB-75F0-45C7-9225-A3F4860A9CA4",
    {
      productId: "736610CB-75F0-45C7-9225-A3F4860A9CA4",
      scenarioId: "S133",
      slot: "shoe",
      outfitPosition: 1,
      reservationStatus: "reserved-not-outfit-approved",
      plannedPairingBrief:
        "Reallocated from the revoked S137 look 3 after a new six-piece visual board passed it with S133's cream knit shirt, French-blue straight trouser, washed-blue bomber, warm-brown crescent bag and Brown Style B belt candidate. The shoe remains planning-only until the belt is refined and the complete outfit passes final QA.",
    },
  ],
]);

const approvedBoardAllocations = [...boardAllocationByProductId.values()].map(
  (allocation) =>
    manualReallocationByProductId.get(String(allocation.productId)) ?? allocation,
);

const reservationAllocations = plannedReservations
  .filter(
    (reservation) =>
      !boardAllocationByProductId.has(String(reservation.productId)),
  )
  .map((reservation) => ({
    ...reservation,
    reservationStatus: "reserved-not-outfit-approved",
  }));
const allocations = [...approvedBoardAllocations, ...reservationAllocations];
const allocatedIds = allocations.map((allocation) =>
  String(allocation.productId),
);
const manifestIds = activeAlphaEntries.map((entry) =>
  String(entry.productId),
);

if (allocations.length !== activeAlphaEntries.length) {
  throw new Error(
    `Expected ${activeAlphaEntries.length} style-eligible final-alpha allocations, found ${allocations.length}`,
  );
}
if (new Set(allocatedIds).size !== allocatedIds.length) {
  throw new Error("A final-alpha product was allocated more than once");
}
const missingIds = manifestIds.filter(
  (productId) => !allocatedIds.includes(productId),
);
const unknownIds = allocatedIds.filter(
  (productId) => !manifestIds.includes(productId),
);
if (missingIds.length || unknownIds.length) {
  throw new Error(
    `Allocation mismatch. Missing: ${missingIds.join(", ") || "none"}; unknown: ${unknownIds.join(", ") || "none"}`,
  );
}

const reservations = allocations.map((allocation) =>
  buildProductReservation(allocation.productId, allocation),
);
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  gender: "male",
  weddingAndWeddingGuestExcluded: true,
  identityRule:
    "Each supplier-product identity is reserved once across the complete non-wedding men's matrix; variants do not create new identities.",
  pricingRule:
    "CJ supplier prices do not prove Premium or Luxury retail tiers. These reservations are Budget-Friendly only until real retail pricing and material proof exist.",
  statusRule:
    "Only complete-outfit-visual-approved means the product is inside a complete outfit that passed visual QA. Reserved-not-outfit-approved is planning only.",
  summary: {
    alphaAssetQualityApprovedProducts: alphaManifest.entries.length,
    finalAlphaApprovedProducts: activeAlphaEntries.length,
    styleRevokedAfterOutfitVisualQa: styleRevokedAlphaEntries.length,
    uniqueReservedProductIdentities: new Set(allocatedIds).size,
    completeOutfitVisualApprovedPlacements: reservations.filter(
      (entry) => entry.reservationStatus === "complete-outfit-visual-approved",
    ).length,
    reservedNotOutfitApproved: reservations.filter(
      (entry) => entry.reservationStatus === "reserved-not-outfit-approved",
    ).length,
    scenariosTouched: new Set(reservations.map((entry) => entry.scenarioId))
      .size,
    repeatedProductIdentities: allocatedIds.length - new Set(allocatedIds).size,
    uiIntegrated: false,
  },
  reservations,
};

const markdownRows = reservations.map(
  (entry) =>
    `| ${entry.productId} | ${entry.garmentType} | ${entry.color} | ${entry.scenarioId} | ${entry.occasion} | ${entry.season} | ${entry.slot} | ${entry.outfitPosition ?? "-"} | ${entry.reservationStatus} |`,
);
const markdown = `# CJ final-alpha scenario reservations

Generated: ${result.generatedAt}

Local-only planning ledger for the ${activeAlphaEntries.length} style-eligible transparent product assets. Wedding and Wedding Guest are excluded. A reservation prevents global identity reuse; it does not make an incomplete outfit ready for the AI Stylist UI.

- Alpha assets passing technical extraction QA: ${result.summary.alphaAssetQualityApprovedProducts}
- Final-alpha products still passing the product-style gate: ${result.summary.finalAlphaApprovedProducts}
- Alpha assets revoked after complete-outfit visual QA: ${result.summary.styleRevokedAfterOutfitVisualQa}
- Unique reserved identities: ${result.summary.uniqueReservedProductIdentities}
- Products inside complete visually approved outfits: ${result.summary.completeOutfitVisualApprovedPlacements}
- Reserved but not yet outfit-approved: ${result.summary.reservedNotOutfitApproved}
- Repeated identities: ${result.summary.repeatedProductIdentities}
- UI integrated: no

| Product identity | Garment | Color | Scenario | Occasion | Season | Slot | Outfit | State |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- |
${markdownRows.join("\n")}

## Guardrails

- Every identity above occurs exactly once in this ledger.
- ${result.summary.completeOutfitVisualApprovedPlacements} entries are currently inside complete outfits, including the source-audited S137 and S193 recompositions.
- The other ${result.summary.reservedNotOutfitApproved} entries are styling reservations only; their future complete outfits still require one-by-one visual review.
- CJ product 2505140753031625700 retains a technically clean transparent alpha but was removed from this ledger after complete-outfit review proved the glossy traditional dress loafer was not Zara-led and reinforced the catalog's formal-shoe bias.
- CJ product 1763829130497372160 also retains a technically clean alpha but was removed after the full source proved a dropped shoulder, broad boxy lounge body, long layered white tee and drawstring-pant context that fail the Work / Office and Zara-led silhouette gates.
- All reservations remain Budget-Friendly. No supplier wholesale price is being used to fabricate Premium or Luxury positioning.
- Nothing in this ledger is connected to the AI Stylist UI.
`;

await mkdir(path.dirname(outputJsonPath), { recursive: true });
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    {
      outputJsonPath,
      outputMarkdownPath,
      ...result.summary,
    },
    null,
    2,
  ),
);
