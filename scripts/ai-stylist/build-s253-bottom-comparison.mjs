#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const alphaManifest = JSON.parse(
  await readFile(
    path.join(reportRoot, "cj-manual-gemini-final-alpha/alpha-approval-manifest.json"),
    "utf8",
  ),
);
const decisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const ledger = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const provisionalLedger = JSON.parse(
  await readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "summer-resort-budget-pilot-s253");
const outputPath = path.join(outputDir, "bottom-comparison.jpg");
const specPath = path.join(outputDir, "bottom-comparison.json");

const alphaById = new Map(
  alphaManifest.entries.map((entry) => [String(entry.productId), entry]),
);
const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByKey = new Map(
  ledger.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);

const fixedTopProductId = "2505030853171607400";
const fixedTopReservation = reservationByKey.get(`cj:${fixedTopProductId}`);
if (
  fixedTopReservation?.scenarioId !== "S253" ||
  fixedTopReservation?.reservationStatus !== "reserved-not-outfit-approved"
) {
  throw new Error("The white linen shirt is not the active S253 planning reservation");
}
const fixedTop = {
  productId: fixedTopProductId,
  styleRagId: `cj:${fixedTopProductId}`,
  slot: "top",
  garmentType: "short-sleeve linen band-collar shirt",
  color: "white",
  image: alphaById.get(fixedTopProductId)?.finalPath,
};
if (!fixedTop.image) throw new Error("Missing S253 final-alpha top image");

const allCandidateSpecs = [
  {
    key: "A",
    name: "White and Terracotta",
    identity: "shopify_supplier:0759058bff9bafc27850609f6ef1d743903918b7",
    decision: "reject-for-s253",
    decisionReason:
      "The terracotta color is useful, but the exposed contrast rope drawcord, elastic waist and technical-lounge finish conflict with the refined white linen Resort shirt; retain only for casual or active use elsewhere.",
  },
  {
    key: "B",
    name: "White and Fruit Green",
    identity: "shopify_supplier:43f5989c13275fe2fbbaa2522fc7919bf8eec38d",
    decision: "reject-for-s253",
    decisionReason:
      "The crinkled technical fabric, exposed white drawcord and long straight hem read closer to generic active shorts than polished Zara-led resort styling.",
  },
  {
    key: "C",
    name: "White and Earthy Yellow",
    identity: "shopify_supplier:7c6e6808375d2a6074514ff2d3add76b31701e21",
    decision: "reject-for-s253",
    decisionReason:
      "The actual worn color reads beige rather than earthy yellow, leaving an ordinary washed-out white-and-khaki combination.",
  },
  {
    key: "D",
    name: "White and Pastel Blue",
    identity: "shopify_supplier:6531885c6d54dd5b10a585963227232ae011397c",
    decision: "reject-for-s253",
    decisionReason:
      "The product-only image does not prove the fit, and the saturated blue cuffed-chino construction reads more dated than the terracotta alternative.",
  },
];
const provisionalHoldByIdentity = new Map(
  provisionalLedger.holds.map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const excludedHeldCandidates = allCandidateSpecs
  .filter((candidate) => {
    const hold = provisionalHoldByIdentity.get(candidate.identity.toLowerCase());
    return hold && hold.scenarioId !== "S253";
  })
  .map((candidate) => ({
    key: candidate.key,
    identity: candidate.identity,
    name: candidate.name,
    heldByScenarioId: provisionalHoldByIdentity.get(candidate.identity.toLowerCase()).scenarioId,
  }));
const candidateSpecs = allCandidateSpecs.filter((candidate) => {
  const hold = provisionalHoldByIdentity.get(candidate.identity.toLowerCase());
  return !hold || hold.scenarioId === "S253";
});
const candidates = candidateSpecs.map((candidate) => {
  const canonicalIdentity = candidate.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(canonicalIdentity);
  if (!accepted) throw new Error(`Missing accepted S253 bottom ${candidate.identity}`);
  if (reservationByKey.has(canonicalIdentity)) {
    throw new Error(`S253 bottom candidate is already reserved: ${candidate.identity}`);
  }
  return {
    ...candidate,
    group: "bottom",
    items: [fixedTop, { ...accepted.selectedVariant, styleRagId: candidate.identity }],
    sourceConstraint: accepted.constraints ?? [],
  };
});

async function imageBuffer(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(source);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const cardWidth = 475;
const cardHeight = 850;
const itemWidth = 210;
const itemHeight = 620;
const cardBuffers = [];
await mkdir(outputDir, { recursive: true });
for (const candidate of candidates) {
  const bottom = candidate.items[1];
  await sharp(await imageBuffer(bottom.image), { failOn: "none" })
    .rotate()
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 96 })
    .toFile(path.join(outputDir, `candidate-${candidate.key.toLowerCase()}-bottom-original.jpg`));
}
for (const candidate of candidates) {
  const itemBuffers = await Promise.all(
    candidate.items.map(async (item) => {
      const productImage = await sharp(await imageBuffer(item.image), { failOn: "none" })
        .rotate()
        .resize({
          width: itemWidth - 14,
          height: 485,
          fit: "contain",
          background: "#f5f2ea",
        })
        .flatten({ background: "#f5f2ea" })
        .jpeg({ quality: 92 })
        .toBuffer();
      const labelSvg = Buffer.from(
        `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#f5f2ea"/><text x="9" y="518" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="9" y="545" font-family="Arial" font-size="11" fill="#222">${escapeXml(String(item.garmentType).slice(0, 30))}</text><text x="9" y="570" font-family="Arial" font-size="12" fill="#666">${escapeXml(String(item.color).slice(0, 30))}</text><text x="9" y="600" font-family="Arial" font-size="9" fill="#888">${escapeXml(String(item.productId).slice(0, 28))}</text></svg>`,
      );
      return sharp(labelSvg)
        .composite([{ input: productImage, left: 7, top: 8 }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }),
  );
  const cardSvg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="32" cy="34" r="20" fill="#111"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">${candidate.key}</text><text x="62" y="32" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="62" y="55" font-family="Arial" font-size="12" fill="#6a706b">Summer Vacation/Resort · Budget-Friendly</text><text x="24" y="735" font-family="Arial" font-size="11" font-weight="700" fill="${candidate.decision.startsWith("reject") ? "#b23a2f" : "#355746"}">${candidate.decision.startsWith("reject") ? "REJECTED FOR S253" : "VISUAL FRONT-RUNNER"}</text><text x="24" y="758" font-family="Arial" font-size="9" fill="#777">${escapeXml(candidate.decisionReason.slice(0, 84))}</text><text x="24" y="790" font-family="Arial" font-size="11" font-weight="700" fill="#9a3f1d">WOVEN SHOE STILL MISSING</text><text x="24" y="816" font-family="Arial" font-size="10" fill="#777">No new reservation · no complete outfit · not UI integrated.</text></svg>`,
  );
  cardBuffers.push(
    await sharp(cardSvg)
      .composite(
        itemBuffers.map((input, index) => ({
          input,
          left: 21 + index * (itemWidth + 12),
          top: 95,
        })),
      )
      .jpeg({ quality: 92 })
      .toBuffer(),
  );
}

const boardWidth = cardWidth * candidates.length + 24 * (candidates.length + 1);
const boardHeight = cardHeight + 145;
const headerSvg = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="24" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#111">S253 · Men’s Summer Vacation/Resort · Bottom comparison</text><text x="24" y="70" font-family="Arial" font-size="14" fill="#555">Same visually re-approved white linen band-collar shirt · ${candidates.length} unique unreserved warm-weather shorts · exact woven CJ shoe still required</text></svg>`,
);
await sharp(headerSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: 24 + index * (cardWidth + 24),
      top: 105,
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(outputPath);

await writeFile(
  specPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      scenarioId: "S253",
      occasion: "Vacation/Resort",
      season: "Summer",
      budget: "Budget-Friendly",
      status: "visual-comparison-complete-no-local-front-runner-awaiting-bottom-and-shoe",
      fixedPlanningProductId: fixedTopProductId,
      missingSlots: ["bottom", "shoe"],
      selectedBottomIdentity: null,
      visualFrontRunnerBottomIdentity: null,
      queuedBottomRole: "tobacco or terracotta tailored above-knee Resort short with a clean waistband",
      candidates,
      excludedHeldCandidates,
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outputPath, specPath, candidateCount: candidates.length }, null, 2));
