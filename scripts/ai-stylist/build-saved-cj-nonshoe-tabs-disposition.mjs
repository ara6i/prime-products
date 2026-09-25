#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "saved-cj-nonshoe-tabs-disposition-20260917");

const savedTabs = [
  ["2411110358151627900", "Casual Corduroy Short Jacket For Men", "https://cjdropshipping.com/product/casual-corduroy-short-jacket-for-men-p-2411110358151627900.html", 1],
  ["1716804667801350144", "Vintage Corduroy Jacket Multi-bag For Men", "https://cjdropshipping.com/product/vintage-corduroy-jacket-multi-bag-for-men-p-1716804667801350144.html", 1],
  ["1383428002322452480", "Men's Fashion Color Contrast Lapel Corduroy Jacket", "https://cjdropshipping.com/product/mens-fashion-color-contrast-lapel-corduroy-jacket-p-1383428002322452480.html", 1],
  ["F60A9FF0-DDC8-4962-AAA2-CF8F17A09AD3", "Men Hip Hop Sports Jacket Bomber Jacket", "https://cjdropshipping.com/product/men-hip-hop-sports-jacket-bomber-jacket-p-F60A9FF0-DDC8-4962-AAA2-CF8F17A09AD3.html", 1],
  ["1433745735815401472", "Men's Casual Clothes Autumn Coat Men Autumn Korean Trend Tooling Jacket Men", "https://cjdropshipping.com/product/mens-casual-clothes-autumn-coat-men-autumn-korean-trend-tooling-jacket-men-p-1433745735815401472.html", 1],
  ["2502280543221601200", "British Men Business Casual Pants", "https://cjdropshipping.com/product/british-men-business-casual-pants-p-2502280543221601200.html", 1],
  ["2504061001411614200", "Men's One-shoulder Portable Training Dry Wet Separation Swimming Large Capacity Canvas Luggage Travel Bag", "https://cjdropshipping.com/product/mens-one-shoulder-portable-training-dry-wet-separation-swimming-large-capacity-canvas-luggage-travel-bag-p-2504061001411614200.html", 3],
  ["2412181055071605700", "Casual Double Pleated Straight Business Not Tight Suit Pants", "https://cjdropshipping.com/product/casual-double-pleated-straight-business-not-tight-suit-pants-p-2412181055071605700.html", 1],
  ["2505011511051624200", "Casual Double Pleated High Waist Straight Profile Suit Pants", "https://cjdropshipping.com/product/casual-double-pleated-high-waist-straight-profile-suit-pants-p-2505011511051624200.html", 1],
  ["2506240708201628500", "Men's Suit Casual Men's Linen Business Banquet Two-piece Suit", "https://cjdropshipping.com/product/mens-suit-casual-mens-linen-business-banquet-two-piece-suit-p-2506240708201628500.html", 5],
  ["2508250624061610400", "Men's Retro Solid Color Green Collar Suit Two-piece Set", "https://cjdropshipping.com/product/mens-retro-solid-color-green-collar-suit-two-piece-set-p-2508250624061610400.html", 1],
  ["2406240830401626000", "Mud Dyed Denim Straight-leg Pants Men", "https://cjdropshipping.com/product/mud-dyed-denim-straight-leg-pants-men-p-2406240830401626000.html", 8],
  ["1961001274072395778", "Men's Winter Jacket Lined Sherpa Jacket Warm Trucker Coat Multi Pocket", "https://cjdropshipping.com/product/mens-winter-jacket-lined-sherpa-jacket-warm-trucker-coat-multi-pocket-p-1961001274072395778.html", 5],
  ["2501050331241615900", "Fall Casual Polo Collar Long-sleeved Sweater", "https://cjdropshipping.com/product/fall-casual-polo-collar-long-sleeved-sweater-p-2501050331241615900.html", 3],
  ["2505230551031610500", "Suit Pants Men's Straight Loose", "https://cjdropshipping.com/product/suit-pants-mens-straight-loose-p-2505230551031610500.html", 2],
  ["2411210959461619900", "Woolen Draping Cropped Straight Casual Suit Pants For Men", "https://cjdropshipping.com/product/woolen-draping-cropped-straight-casual-suit-pants-for-men-p-2411210959461619900.html", 1],
  ["2411231226141608400", "Autumn And Winter Corduroy Suit Pants Man Pair Pleated Design Loose Straight", "https://cjdropshipping.com/product/autumn-and-winter-corduroy-suit-pants-man-pair-pleated-design-loose-straight-p-2411231226141608400.html", 1],
  ["2503050549541615200", "Sports Straight Fleece Padded Pants Men's Winter", "https://cjdropshipping.com/product/sports-straight-fleece-padded-pants-mens-winter-p-2503050549541615200.html", 3],
  ["2505140338321604700", "Summer New Short Sleeve Cuban Collar Knitted Polo Shirt", "https://cjdropshipping.com/product/summer-new-short-sleeve-cuban-collar-knitted-polo-shirt-p-2505140338321604700.html", 2],
  ["1405048494791725056", "Amalek Weekender Duffle Bag", "https://cjdropshipping.com/product/amalek-weekender-duffle-bag-p-1405048494791725056.html", 1],
  ["1556816243800420352", "Vintage Travel Bag Multifunctional Leather Duffle Bag Folding", "https://cjdropshipping.com/product/vintage-travel-bag-multifunctional-leather-duffle-bag-folding-p-1556816243800420352.html", 1],
  ["1375007945837907968", "Leather Cowskin Vintage Jean Belt Pin Buckle Simple Men's Belt Wide", "https://cjdropshipping.com/product/leather-cowskin-vintage-jean-belt-pin-buckle-simple-mens-belt-wide-p-1375007945837907968.html", 1],
  ["2406240827451600100", "Basic Style Straight Casual Jeans For Men", "https://cjdropshipping.com/product/basic-style-straight-casual-jeans-for-men-p-2406240827451600100.html", 1],
];

const normalize = (value) => String(value ?? "").toLowerCase();
if (savedTabs.length !== 23) {
  throw new Error(`Expected 23 unique non-shoe exact-product tabs, found ${savedTabs.length}`);
}
if (new Set(savedTabs.map(([productId]) => normalize(productId))).size !== savedTabs.length) {
  throw new Error("Saved non-shoe CJ tab list contains a duplicate product identity");
}

const [visualDecisions, searchDecisions, reservationLedger, manualDecisions] = await Promise.all([
  readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(repoRoot, "scripts/ai-stylist/cj-exact-page-search-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(JSON.parse),
  readFile(
    path.join(repoRoot, "scripts/ai-stylist/saved-cj-nonshoe-tabs-manual-decisions.json"),
    "utf8",
  ).then(JSON.parse),
]);

const acceptedByIdentity = new Map();
const categoryRoot = path.join(reportRoot, "approved-category-visual-audit");
for (const categoryName of await readdir(categoryRoot)) {
  const indexPath = path.join(categoryRoot, categoryName, "index.json");
  let index;
  try {
    index = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    continue;
  }
  for (const product of index.pages.flatMap((page) => page.products)) {
    acceptedByIdentity.set(normalize(product.identity), product);
  }
}

const visualByIdentity = new Map(
  visualDecisions.entries.map((entry) => [normalize(entry.identity), entry]),
);
const reservationByIdentity = new Map(
  reservationLedger.reservations.map((entry) => [normalize(entry.productKey), entry]),
);
const manualByProductId = new Map(
  manualDecisions.products.map((entry) => [normalize(entry.productId), entry]),
);
const activeCandidateByProductId = new Map();
const attemptHistoryByProductId = new Map();
for (const decision of searchDecisions.decisions) {
  if (decision.candidateProductId) {
    activeCandidateByProductId.set(normalize(decision.candidateProductId), decision);
  }
  for (const attempt of decision.searchAttempts ?? []) {
    if (!attempt.productId) continue;
    const key = normalize(attempt.productId);
    if (!attemptHistoryByProductId.has(key)) attemptHistoryByProductId.set(key, []);
    attemptHistoryByProductId.get(key).push({ queueId: decision.queueId, ...attempt });
  }
}

const products = savedTabs.map(([productId, title, cjPageUrl, openTabCount]) => {
  const key = normalize(productId);
  const identity = `cj:${productId}`;
  const accepted = acceptedByIdentity.get(normalize(identity));
  const reservation = reservationByIdentity.get(normalize(identity));
  const visual = visualByIdentity.get(normalize(identity));
  const candidate = activeCandidateByProductId.get(key);
  const manual = manualByProductId.get(key);
  const attempts = attemptHistoryByProductId.get(key) ?? [];
  const latestAttempt = attempts.at(-1) ?? null;

  let disposition;
  let canIncreaseAcceptedCatalog = false;
  let reason;
  if (accepted) {
    disposition = reservation ? "accepted-already-reserved" : "accepted-catalog-unreserved";
    reason = reservation
      ? `Already accepted and reserved to ${reservation.scenarioId} as ${reservation.slot}; it cannot be counted or used again.`
      : "Already present in the 194-identity accepted catalog; rediscovery cannot create a second identity.";
  } else if (candidate) {
    disposition = candidate.status.includes("revoked")
      ? "rejected-source-search-open"
      : "refinement-candidate-not-catalog-approved";
    reason = candidate.status.includes("revoked")
      ? latestAttempt?.reason ?? "The earlier source selection was revoked and its queue role returned to search."
      : `Selected once for ${candidate.queueId}; source refinement is not authorized or complete, and the product is not catalog-approved.`;
  } else if (manual) {
    disposition = manual.disposition;
    reason = manual.reason;
  } else if (visual?.status === "conditional") {
    disposition = "conditional-excluded";
    reason = visual.constraints?.join(" ") ?? visual.reason;
  } else if (visual?.status === "reject") {
    disposition = "rejected";
    reason = visual.constraints?.join(" ") ?? visual.reason;
  } else if (latestAttempt?.decision?.startsWith("reject-")) {
    disposition = "rejected";
    reason = latestAttempt.reason;
  } else if (latestAttempt?.decision?.startsWith("accept-")) {
    disposition = "reviewed-acceptance-not-active-needs-reconciliation";
    reason = `A historical attempt says ${latestAttempt.decision}, but the identity is neither an active candidate nor in the accepted catalog.`;
  } else {
    disposition = "no-authoritative-disposition-needs-review";
    reason = "The exact page is saved, but no accepted-catalog, reservation, visual-decision or current queue-candidate record was found.";
  }

  return {
    productId,
    identity,
    title,
    cjPageUrl,
    openTabCount,
    disposition,
    canIncreaseAcceptedCatalog,
    reason,
    acceptedCategory: accepted?.category ?? null,
    acceptedReviewId: accepted?.reviewId ?? null,
    reservedScenarioId: reservation?.scenarioId ?? null,
    reservedSlot: reservation?.slot ?? null,
    activeQueueId: candidate?.queueId ?? null,
    activeQueueStatus: candidate?.status ?? null,
    localSourceImported: manual?.localSourceImported ?? false,
    bestRefinementInputSelected: manual?.bestRefinementInputSelected ?? false,
    productRecord: manual?.productRecord ?? null,
    latestAttempt: latestAttempt
      ? {
          queueId: latestAttempt.queueId,
          decision: latestAttempt.decision,
          reason: latestAttempt.reason,
        }
      : null,
  };
});

const dispositionCounts = Object.fromEntries(
  [...new Set(products.map((product) => product.disposition))]
    .sort()
    .map((disposition) => [
      disposition,
      products.filter((product) => product.disposition === disposition).length,
    ]),
);
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scope:
    "Deduplicated non-shoe exact CJ product pages currently saved in the Codex browser, reconciled against the accepted category audit, global reservation ledger, visual decisions and manual exact-page queue.",
  browserObservation: {
    exactProductTabsIncludingShoes: 65,
    uniqueExactProductIdentitiesIncludingShoes: 36,
    uniqueNonShoeExactProductIdentities: products.length,
    duplicateBrowserTabsCollapsed: 65 - 36,
    cjCatalogSearchAuthenticated: true,
    exactPageAuthenticationObservation:
      "Authenticated CJ catalog search was re-proven in the refreshed Codex browser after the saved-tab review; no credentials were entered by the agent.",
  },
  summary: {
    productsReviewed: products.length,
    dispositionCounts,
    newAcceptedCatalogIdentities: products.filter(
      (product) => product.canIncreaseAcceptedCatalog,
    ).length,
    unresolvedIdentities: products.filter((product) =>
      product.disposition.includes("needs-review"),
    ).length,
  },
  products,
  actions: {
    imported: products.filter((product) => product.localSourceImported).length,
    submittedToGemini: 0,
    backgroundsRemoved: 0,
    catalogAdded: 0,
    outfitsChanged: 0,
    uiIntegrated: false,
  },
};

const tableRows = products.map(
  (product) =>
    `| \`${product.productId}\` | ${product.openTabCount} | ${product.disposition} | ${product.reason.replaceAll("|", "/")} |`,
);
const markdown = `# Saved CJ non-shoe tab reconciliation — 2026-09-17

The browser contained **65 exact-product tabs / 36 unique CJ identities**. After excluding the 13 shoe identities in those tabs, this audit reconciles **${products.length} unique non-shoe identities**.

- Dispositions: ${Object.entries(dispositionCounts)
  .map(([disposition, count]) => `${disposition} ${count}`)
  .join(", ")}
- New accepted catalog identities: **${result.summary.newAcceptedCatalogIdentities}**
- Unresolved identities requiring fresh visual review: **${result.summary.unresolvedIdentities}**
- CJ catalog search authenticated: **no**

One CJ product ID remains one global identity. Duplicate tabs, another color or another scenario never create another product.

| Product ID | Open tabs | Current disposition | Controlling reason |
|---|---:|---|---|
${tableRows.join("\n")}

${result.actions.imported} products were imported locally as source-only refinement candidates. No product was submitted to Gemini, background-removed, added to the accepted catalog, reserved, placed in an outfit or integrated into the UI during this reconciliation.
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDir, "audit.json"), `${JSON.stringify(result, null, 2)}\n`),
  writeFile(path.join(outputDir, "AUDIT.md"), markdown),
]);

console.log(
  JSON.stringify(
    {
      outputDir,
      ...result.browserObservation,
      ...result.summary,
    },
    null,
    2,
  ),
);
