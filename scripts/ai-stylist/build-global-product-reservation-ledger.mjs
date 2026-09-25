#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const alphaReservationsPath = path.join(
  reportRoot,
  "cj-manual-gemini-final-alpha/scenario-reservations.json",
);
const boardInputs = [
  {
    path: path.join(
      reportRoot,
      "summer-casual-budget-pilot-v9-partial/agent-styled-draft.json",
    ),
    boardPath: path.join(
      reportRoot,
      "summer-casual-budget-pilot-v9-partial/contact-sheets/S137-separates.jpg",
    ),
  },
  {
    path: path.join(
      reportRoot,
      "s137-recomposed-candidates/agent-styled-draft.json",
    ),
    boardPath: path.join(
      reportRoot,
      "s137-recomposed-candidates/s137-recomposed-candidates.jpg",
    ),
  },
  {
    path: path.join(
      reportRoot,
      "spring-office-budget-pilot-s149-v1-partial/agent-styled-draft.json",
    ),
    boardPath: path.join(
      reportRoot,
      "spring-office-budget-pilot-s149-v1-partial/contact-sheets/S149-separates.jpg",
    ),
  },
  {
    path: path.join(
      reportRoot,
      "summer-date-budget-pilot-s189-v1-partial/agent-styled-draft.json",
    ),
    boardPath: path.join(
      reportRoot,
      "summer-date-budget-pilot-s189-v1-partial/contact-sheets/S189-separates.jpg",
    ),
  },
  {
    path: path.join(
      reportRoot,
      "fall-date-budget-pilot-s193-v1-partial/agent-styled-draft.json",
    ),
    boardPath: path.join(
      reportRoot,
      "fall-date-budget-pilot-s193-v1-partial/contact-sheets/S193-separates.jpg",
    ),
  },
  {
    path: path.join(
      reportRoot,
      "s193-recomposed-candidates/agent-styled-draft.json",
    ),
    boardPath: path.join(
      reportRoot,
      "s193-recomposed-candidates/s193-recomposed-candidates.jpg",
    ),
  },
  {
    path: path.join(
      reportRoot,
      "fall-sports-budget-pilot-s225-v1-partial/agent-styled-draft.json",
    ),
    boardPath: path.join(
      reportRoot,
      "fall-sports-budget-pilot-s225-v1-partial/contact-sheets/S225-separates.jpg",
    ),
  },
];
const outputJsonPath = path.join(
  reportRoot,
  "global-product-reservation-ledger.json",
);
const outputMarkdownPath = path.join(
  reportRoot,
  "GLOBAL_PRODUCT_RESERVATION_LEDGER.md",
);

const alphaReservations = JSON.parse(
  await readFile(alphaReservationsPath, "utf8"),
);
const s149UiCompleteCandidate = JSON.parse(
  await readFile(
    path.join(
      reportRoot,
      "spring-office-budget-s149-six-piece-reuse/candidate.json",
    ),
    "utf8",
  ),
);
const s133UiCompleteCandidate = JSON.parse(
  await readFile(
    path.join(
      reportRoot,
      "spring-casual-budget-core-s133-02/six-piece-complete-candidate.json",
    ),
    "utf8",
  ),
);
const s225UiCompleteCandidate = JSON.parse(
  await readFile(
    path.join(
      reportRoot,
      "fall-sports-budget-s225-complete-candidate/six-piece-candidate.json",
    ),
    "utf8",
  ),
);
const visualDecisions = JSON.parse(
  await readFile(
    path.join(reportRoot, "visual-identity-decisions.json"),
    "utf8",
  ),
);
const boardDrafts = await Promise.all(
  boardInputs.map(async (input) => ({
    ...input,
    draft: JSON.parse(await readFile(input.path, "utf8")),
  })),
);

function canonicalProductKey(productKey) {
  return String(productKey).toLowerCase();
}

const decisionStatusByKey = new Map(
  visualDecisions.entries.map((entry) => [
    canonicalProductKey(entry.identity),
    entry.status,
  ]),
);
const reservationsByKey = new Map();
for (const reservation of alphaReservations.reservations) {
  const productKey = `cj:${reservation.productId}`;
  const canonicalKey = canonicalProductKey(productKey);
  if (reservationsByKey.has(canonicalKey)) {
    throw new Error(`Repeated alpha reservation ${productKey}`);
  }
  reservationsByKey.set(canonicalKey, {
    productKey,
    productId: String(reservation.productId),
    source: "manual-cj-gemini-final-alpha",
    title: reservation.title,
    garmentType: reservation.garmentType,
    color: reservation.color,
    price: reservation.supplierPrice,
    currency: reservation.supplierCurrency,
    image: reservation.finalImage,
    scenarioId: reservation.scenarioId,
    occasion: reservation.occasion,
    season: reservation.season,
    budget: reservation.budget,
    slot: reservation.slot,
    outfitPosition: reservation.outfitPosition,
    outfitId: null,
    outfitName: null,
    reservationStatus: reservation.reservationStatus,
    plannedPairingBrief: reservation.plannedPairingBrief,
    approvedBoardPath: null,
    uiIntegrated: false,
  });
}

const boardProductKeys = [];
const approvedOutfits = [];
for (const input of boardDrafts) {
  const qaByPosition = new Map(
    input.draft.visualQa.map((entry) => [Number(entry.position), entry]),
  );
  for (const scenarioGroup of input.draft.scenarios) {
    const scenario = scenarioGroup.scenario;
    if (scenario.id >= "S181" && scenario.id <= "S184") {
      throw new Error(`Wedding Guest scenario is excluded: ${scenario.id}`);
    }
    if (
      scenario.budgetLabel === "Premium" ||
      scenario.budgetLabel === "Luxury"
    ) {
      throw new Error(
        `Approved board uses an unproven price tier: ${scenario.id}`,
      );
    }
    for (const outfit of scenarioGroup.outfitSets.separates) {
      if (qaByPosition.get(Number(outfit.position))?.decision !== "pass")
        continue;
      approvedOutfits.push({
        scenarioId: scenario.id,
        outfitId: outfit.outfitId,
        position: outfit.position,
        name: outfit.name,
        boardPath: input.boardPath,
        sourceDraftPath: input.path,
      });
      for (const item of outfit.items) {
        const productKey = String(item.styleRagId);
        const canonicalKey = canonicalProductKey(productKey);
        boardProductKeys.push(canonicalKey);
        const currentDecision = decisionStatusByKey.get(canonicalKey);
        if (currentDecision && currentDecision !== "accept") {
          throw new Error(
            `Approved board uses a non-accepted visual-ledger identity: ${productKey} (${currentDecision})`,
          );
        }
        const existing = reservationsByKey.get(canonicalKey);
        const next = {
          productKey,
          productId: String(item.productId),
          source: item.source,
          title: item.title,
          garmentType: item.garmentType,
          color: item.color,
          price: item.price,
          currency: item.currency,
          image: item.image,
          scenarioId: scenario.id,
          occasion: scenario.occasionLabel,
          season: scenario.seasonLabel,
          budget: scenario.budgetLabel,
          slot: item.slot,
          outfitPosition: outfit.position,
          outfitId: outfit.outfitId,
          outfitName: outfit.name,
          reservationStatus: "complete-outfit-visual-approved",
          plannedPairingBrief: `Locked in visually approved ${scenario.id} look ${outfit.position}: ${outfit.name}.`,
          approvedBoardPath: input.boardPath,
          uiIntegrated: false,
        };
        if (existing && existing.scenarioId !== scenario.id) {
          throw new Error(
            `Reserved scenario conflict for ${productKey}: ${existing.scenarioId} vs ${scenario.id}`,
          );
        }
        reservationsByKey.set(canonicalKey, { ...existing, ...next });
      }
    }
  }
}

if (new Set(boardProductKeys).size !== boardProductKeys.length) {
  const repeats = boardProductKeys.filter(
    (key, index) => boardProductKeys.indexOf(key) !== index,
  );
  throw new Error(
    `Product reused across approved outfits: ${[...new Set(repeats)].join(", ")}`,
  );
}

if (
  s149UiCompleteCandidate.scenarioId !== "S149" ||
  s149UiCompleteCandidate.decision !== "approve-ui-complete-six-piece-outfit" ||
  s149UiCompleteCandidate.identityCount !== 6 ||
  s149UiCompleteCandidate.repeatedIdentities !== 0 ||
  s149UiCompleteCandidate.totalPrice > 500
) {
  throw new Error("S149 UI-complete candidate does not pass its controlling gates");
}
const s149Core = approvedOutfits.find(
  (entry) => entry.outfitId === "S149-SEPARATES-V1-PARTIAL-01",
);
if (!s149Core) throw new Error("The approved S149 core is missing");
const uiCompleteOutfits = [
  {
    scenarioId: "S149",
    outfitId: s149Core.outfitId,
    position: s149Core.position,
    name: s149Core.name,
    boardPath: s149UiCompleteCandidate.boardPath,
    sourceCandidatePath: path.join(
      reportRoot,
      "spring-office-budget-s149-six-piece-reuse/candidate.json",
    ),
    totalPrice: s149UiCompleteCandidate.totalPrice,
    budgetBand: s149UiCompleteCandidate.budgetBand,
    itemCount: 6,
  },
];
const uiCompleteProductKeys = [];
for (const item of s149UiCompleteCandidate.items) {
  const productKey = String(item.styleRagId ?? item.identity);
  const canonicalKey = canonicalProductKey(productKey);
  uiCompleteProductKeys.push(canonicalKey);
  const existing = reservationsByKey.get(canonicalKey);
  if (
    decisionStatusByKey.get(canonicalKey) !== "accept" &&
    existing?.reservationStatus !== "complete-outfit-visual-approved"
  ) {
    throw new Error(`S149 UI-complete board uses a non-accepted identity: ${productKey}`);
  }
  if (existing && existing.scenarioId !== "S149") {
    throw new Error(
      `S149 UI-complete identity is already reserved to ${existing.scenarioId}: ${productKey}`,
    );
  }
  reservationsByKey.set(canonicalKey, {
    ...existing,
    productKey,
    productId: String(
      item.productId ?? productKey.replace(/^cj:/i, ""),
    ),
    source: item.source ?? item.sourceCollection ?? existing?.source ?? "existing-refined-visual-ledger",
    title: item.title,
    garmentType: item.garmentType,
    color: item.color,
    price: Number(item.price),
    currency: item.currency ?? "USD",
    image: item.image,
    scenarioId: "S149",
    occasion: "Work / Office",
    season: "Spring",
    budget: "Budget-Friendly",
    slot: item.slot,
    outfitPosition: s149Core.position,
    outfitId: s149Core.outfitId,
    outfitName: s149Core.name,
    reservationStatus: "ui-complete-outfit-visual-approved",
    plannedPairingBrief:
      "Locked in the first six-role UI-complete men’s look after a combined top, bottom, outerwear, shoe, bag and accessory visual gate.",
    approvedBoardPath: s149UiCompleteCandidate.boardPath,
    uiIntegrated: false,
  });
}
if (new Set(uiCompleteProductKeys).size !== 6) {
  throw new Error("S149 UI-complete board repeats a product identity");
}

if (
  s133UiCompleteCandidate.scenarioId !== "S133" ||
  s133UiCompleteCandidate.decision !== "approve-ui-complete-six-piece-outfit" ||
  s133UiCompleteCandidate.completeOutfitApproved !== true ||
  s133UiCompleteCandidate.globalIdentityCount !== 6 ||
  s133UiCompleteCandidate.items?.length !== 6 ||
  s133UiCompleteCandidate.merchandiseSubtotalBeforeShipping > 500
) {
  throw new Error("S133 UI-complete candidate does not pass its controlling gates");
}
const s133Core = {
  scenarioId: "S133",
  outfitId: s133UiCompleteCandidate.outfitId,
  position: 1,
  name: s133UiCompleteCandidate.name,
  boardPath: s133UiCompleteCandidate.boardPath,
  sourceDraftPath: null,
};
approvedOutfits.push(s133Core);
uiCompleteOutfits.push({
  ...s133Core,
  sourceCandidatePath: path.join(
    reportRoot,
    "spring-casual-budget-core-s133-02/six-piece-complete-candidate.json",
  ),
  totalPrice: s133UiCompleteCandidate.merchandiseSubtotalBeforeShipping,
  budgetBand: { min: 0, max: 500 },
  itemCount: 6,
});
const s133ProductKeys = [];
for (const item of s133UiCompleteCandidate.items) {
  const productKey = String(item.styleRagId ?? item.identity);
  const canonicalKey = canonicalProductKey(productKey);
  s133ProductKeys.push(canonicalKey);
  const existing = reservationsByKey.get(canonicalKey);
  if (["top", "bottom", "shoe"].includes(item.slot)) {
    boardProductKeys.push(canonicalKey);
  }
  const acceptedExistingAlpha =
    existing?.scenarioId === "S133" &&
    existing?.reservationStatus === "reserved-not-outfit-approved";
  if (
    decisionStatusByKey.get(canonicalKey) !== "accept" &&
    !acceptedExistingAlpha
  ) {
    throw new Error(`S133 UI-complete board uses a non-accepted identity: ${productKey}`);
  }
  if (existing && existing.scenarioId !== "S133") {
    throw new Error(
      `S133 UI-complete identity is already reserved to ${existing.scenarioId}: ${productKey}`,
    );
  }
  reservationsByKey.set(canonicalKey, {
    ...existing,
    productKey,
    productId: String(item.productId ?? productKey.replace(/^cj:/i, "")),
    source: item.source ?? existing?.source ?? "existing-refined-visual-ledger",
    title: item.title,
    garmentType: item.garmentType,
    color: item.color,
    price: Number(item.price),
    currency: item.currency ?? "USD",
    image: item.image,
    scenarioId: "S133",
    occasion: "Casual Everyday",
    season: "Spring",
    budget: "Budget-Friendly",
    slot: item.slot,
    outfitPosition: 1,
    outfitId: s133Core.outfitId,
    outfitName: s133Core.name,
    reservationStatus: "ui-complete-outfit-visual-approved",
    plannedPairingBrief:
      "Locked after a six-role Spring Casual visual gate using a cream knit, controlled French-blue trouser, washed-blue short bomber, sand sneaker, warm-brown crescent bag and unique beige woven belt.",
    approvedBoardPath: s133UiCompleteCandidate.boardPath,
    uiIntegrated: false,
  });
}
if (new Set(s133ProductKeys).size !== 6) {
  throw new Error("S133 UI-complete board repeats a product identity");
}
if (s133ProductKeys.some((key) => uiCompleteProductKeys.includes(key))) {
  throw new Error("S133 and S149 UI-complete boards share a supplier identity");
}

if (
  s225UiCompleteCandidate.scenarioId !== "S225" ||
  s225UiCompleteCandidate.decision !== "approve-ui-complete-six-piece-outfit" ||
  s225UiCompleteCandidate.completeOutfitApproved !== true ||
  s225UiCompleteCandidate.globalIdentityCount !== 6 ||
  s225UiCompleteCandidate.items?.length !== 6 ||
  s225UiCompleteCandidate.merchandiseSubtotalBeforeShipping > 500
) {
  throw new Error("S225 UI-complete candidate does not pass its controlling gates");
}
const s225Core = approvedOutfits.find(
  (entry) => entry.outfitId === "S225-SEPARATES-V1-PARTIAL-01",
);
if (!s225Core) throw new Error("The approved S225 core is missing");
uiCompleteOutfits.push({
  ...s225Core,
  name: s225UiCompleteCandidate.name,
  boardPath: s225UiCompleteCandidate.boardPath,
  sourceCandidatePath: path.join(
    reportRoot,
    "fall-sports-budget-s225-complete-candidate/six-piece-candidate.json",
  ),
  totalPrice: s225UiCompleteCandidate.merchandiseSubtotalBeforeShipping,
  budgetBand: { min: 0, max: 500 },
  itemCount: 6,
});
const s225ProductKeys = [];
for (const item of s225UiCompleteCandidate.items) {
  const productKey = String(item.styleRagId ?? item.identity);
  const canonicalKey = canonicalProductKey(productKey);
  s225ProductKeys.push(canonicalKey);
  const existing = reservationsByKey.get(canonicalKey);
  if (decisionStatusByKey.get(canonicalKey) !== "accept") {
    throw new Error(`S225 UI-complete board uses a non-accepted identity: ${productKey}`);
  }
  if (existing && existing.scenarioId !== "S225") {
    throw new Error(
      `S225 UI-complete identity is already reserved to ${existing.scenarioId}: ${productKey}`,
    );
  }
  reservationsByKey.set(canonicalKey, {
    ...existing,
    productKey,
    productId: String(item.productId ?? productKey.replace(/^cj:/i, "")),
    source: item.source ?? existing?.source ?? "existing-refined-visual-ledger",
    title: item.title,
    garmentType: item.garmentType,
    color: item.color,
    price: Number(item.price),
    currency: item.currency ?? "USD",
    image: item.image,
    scenarioId: "S225",
    occasion: "Sports / Workout",
    season: "Fall",
    budget: "Budget-Friendly",
    slot: item.slot,
    outfitPosition: s225Core.position,
    outfitId: s225Core.outfitId,
    outfitName: s225UiCompleteCandidate.name,
    reservationStatus: "ui-complete-outfit-visual-approved",
    plannedPairingBrief:
      "Locked after the complete S225 Fall Sports visual gate: cerulean technical half-zip, tapered camel utility trouser, pale gray-green rain shell, dark-gray trail shoe, clean black performance backpack and minimal training gloves.",
    approvedBoardPath: s225UiCompleteCandidate.boardPath,
    uiIntegrated: false,
  });
}
if (new Set(s225ProductKeys).size !== 6) {
  throw new Error("S225 UI-complete board repeats a product identity");
}
if (
  s225ProductKeys.some(
    (key) => uiCompleteProductKeys.includes(key) || s133ProductKeys.includes(key),
  )
) {
  throw new Error("S225 shares a supplier identity with another UI-complete board");
}

if (new Set(boardProductKeys).size !== boardProductKeys.length) {
  throw new Error("Approved top-bottom-shoe cores share a supplier identity");
}

const reservations = [...reservationsByKey.values()].sort((a, b) => {
  const scenarioOrder = a.scenarioId.localeCompare(b.scenarioId, undefined, {
    numeric: true,
  });
  if (scenarioOrder) return scenarioOrder;
  const outfitOrder = (a.outfitPosition ?? 999) - (b.outfitPosition ?? 999);
  if (outfitOrder) return outfitOrder;
  return a.productKey.localeCompare(b.productKey);
});
const allKeys = reservations.map((entry) =>
  canonicalProductKey(entry.productKey),
);
const visuallyApprovedReservations = reservations.filter((entry) =>
  ["complete-outfit-visual-approved", "ui-complete-outfit-visual-approved"].includes(
    entry.reservationStatus,
  ),
);
const coreReservations = visuallyApprovedReservations.filter((entry) =>
  ["top", "bottom", "shoe"].includes(entry.slot),
);
const uiCompleteReservations = reservations.filter(
  (entry) => entry.reservationStatus === "ui-complete-outfit-visual-approved",
);
const plannedReservations = reservations.filter(
  (entry) => entry.reservationStatus === "reserved-not-outfit-approved",
);
const alphaKeys = new Set(
  alphaReservations.reservations.map((entry) =>
    canonicalProductKey(`cj:${entry.productId}`),
  ),
);
const shoeTerm = /shoe|sneaker|loafer|boot|derby|slide|espadrille/i;
const existingAcceptedShoeKeys = new Set(
  visualDecisions.entries
    .filter(
      (entry) =>
        entry.status === "accept" &&
        (entry.selectedVariant?.slot === "shoe" ||
          shoeTerm.test(String(entry.selectedVariant?.garmentType ?? ""))),
    )
    .map((entry) => canonicalProductKey(entry.identity)),
);
const finalAlphaShoeKeys = new Set(
  alphaReservations.reservations
    .filter((entry) => entry.slot === "shoe")
    .map((entry) => canonicalProductKey(`cj:${entry.productId}`)),
);
const catalogReadyShoeKeys = new Set([
  ...existingAcceptedShoeKeys,
  ...finalAlphaShoeKeys,
]);
const approvedShoeKeys = new Set(
  visuallyApprovedReservations
    .filter((entry) => entry.slot === "shoe")
    .map((entry) => canonicalProductKey(entry.productKey)),
);
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  gender: "male",
  weddingAndWeddingGuestExcluded: true,
  identityRule:
    "Each supplier-product identity may occur once across every complete non-wedding men's scenario, regardless of color or variant.",
  statusRule:
    "Complete-outfit-visual-approved is a legacy reservation label for a rendered top-bottom-shoe core. Ui-complete-outfit-visual-approved means all six required Separates roles passed together. Reserved-not-outfit-approved is planning only.",
  summary: {
    approvedThreePieceCores: approvedOutfits.length,
    approvedCorePlacements: coreReservations.length,
    approvedUniqueProductPlacements: visuallyApprovedReservations.length,
    uiCompleteOutfits: uiCompleteOutfits.length,
    uiCompleteOutfitPlacements: uiCompleteReservations.length,
    plannedOnlyReservations: plannedReservations.length,
    totalReservedIdentities: reservations.length,
    finalAlphaApprovedProducts: alphaKeys.size,
    finalAlphaInsideApprovedOutfits: visuallyApprovedReservations.filter((entry) =>
      alphaKeys.has(canonicalProductKey(entry.productKey)),
    ).length,
    finalAlphaStillPlanningOnly: plannedReservations.filter((entry) =>
      alphaKeys.has(canonicalProductKey(entry.productKey)),
    ).length,
    repeatedProductIdentities: allKeys.length - new Set(allKeys).size,
    approvedBoardRepeatCount:
      boardProductKeys.length - new Set(boardProductKeys).size,
    scenariosWithApprovedOutfits: new Set(
      visuallyApprovedReservations.map((entry) => entry.scenarioId),
    ).size,
    scenariosWithUiCompleteOutfits: new Set(
      uiCompleteOutfits.map((entry) => entry.scenarioId),
    ).size,
    catalogReadyShoes: catalogReadyShoeKeys.size,
    catalogReadyShoesUsed: [...catalogReadyShoeKeys].filter((key) =>
      approvedShoeKeys.has(key),
    ).length,
    catalogReadyShoesUnused: [...catalogReadyShoeKeys].filter(
      (key) => !approvedShoeKeys.has(key),
    ).length,
    uiIntegrated: false,
  },
  approvedOutfits,
  uiCompleteOutfits,
  reservations,
};

if (result.summary.totalReservedIdentities !== 41) {
  throw new Error(
    `Expected 41 total reservations after the S133, S149 and S225 UI-complete looks, found ${result.summary.totalReservedIdentities}`,
  );
}
if (result.summary.approvedCorePlacements !== 18) {
  throw new Error(
    `Expected 18 approved core placements after approving S133, found ${result.summary.approvedCorePlacements}`,
  );
}
if (result.summary.plannedOnlyReservations !== 14) {
  throw new Error(
    `Expected 14 planned-only reservations after promoting S133's two planning products, found ${result.summary.plannedOnlyReservations}`,
  );
}
if (
  result.summary.approvedUniqueProductPlacements !== 27 ||
  result.summary.uiCompleteOutfits !== 3 ||
  result.summary.uiCompleteOutfitPlacements !== 18
) {
  throw new Error(
    `Unexpected UI-complete state: ${JSON.stringify({
      approvedUniqueProductPlacements: result.summary.approvedUniqueProductPlacements,
      uiCompleteOutfits: result.summary.uiCompleteOutfits,
      uiCompleteOutfitPlacements: result.summary.uiCompleteOutfitPlacements,
    })}`,
  );
}
if (
  result.summary.catalogReadyShoes !== 8 ||
  result.summary.catalogReadyShoesUsed !== 6 ||
  result.summary.catalogReadyShoesUnused !== 2
) {
  throw new Error(
    `Unexpected shoe coverage: ${JSON.stringify({
      ready: result.summary.catalogReadyShoes,
      used: result.summary.catalogReadyShoesUsed,
      unused: result.summary.catalogReadyShoesUnused,
    })}`,
  );
}
if (
  result.summary.repeatedProductIdentities ||
  result.summary.approvedBoardRepeatCount
) {
  throw new Error(
    "Global reservation ledger contains a repeated product identity",
  );
}

const markdownRows = reservations.map(
  (entry) =>
    `| ${entry.productKey} | ${entry.garmentType} | ${entry.color} | ${entry.scenarioId} | ${entry.occasion} | ${entry.season} | ${entry.slot} | ${entry.outfitPosition ?? "-"} | ${entry.reservationStatus} |`,
);
const markdown = `# Global men's product reservation ledger

Generated: ${result.generatedAt}

This is the controlling local ledger for the rebuilt non-wedding men's matrix. It combines the final-alpha planning reservations with every product already used in a visually approved top-bottom-shoe core.

- Visually approved three-piece cores: ${result.summary.approvedThreePieceCores}
- Product placements inside those cores: ${result.summary.approvedCorePlacements}
- UI-complete six-role Separates looks: ${result.summary.uiCompleteOutfits}
- Unique placements across approved cores and their approved add-ons: ${result.summary.approvedUniqueProductPlacements}
- Planned-only product reservations: ${result.summary.plannedOnlyReservations}
- Total reserved identities: ${result.summary.totalReservedIdentities}
- Repeated identities across approved boards: ${result.summary.approvedBoardRepeatCount}
- Catalog-ready shoes: ${result.summary.catalogReadyShoes}
- Catalog-ready shoes used once: ${result.summary.catalogReadyShoesUsed}
- Catalog-ready shoes still unused: ${result.summary.catalogReadyShoesUnused}
- AI Stylist UI integrated: no

| Product identity | Garment | Color | Scenario | Occasion | Season | Slot | Outfit | State |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- |
${markdownRows.join("\n")}

## Enforcement

- A product key may appear once only, including color variants of the same supplier identity.
- S137 has two approved three-piece cores after source-image re-audit; S133, S149, S193 and S225 have one each. S189 was revoked because its white trouser has no worn silhouette proof.
- S133, S149 and S225 are visually approved UI-complete six-role Separates looks. The two S137 cores plus S193 still need unique outerwear, bag and accessory roles.
- Planning reservations are not outfit approvals.
- Wedding and Wedding Guest remain excluded.
- Nothing in this ledger is connected to the AI Stylist UI.
`;

await mkdir(path.dirname(outputJsonPath), { recursive: true });
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    { outputJsonPath, outputMarkdownPath, ...result.summary },
    null,
    2,
  ),
);
