import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const reportRoot =
  "/Users/arashsn/Projects/PrimeStyleAI/prime-products/output/reports/" +
  "ai-stylist-mens-global-unique-visual-v16-20260913";
const sourceDraftPath = path.join(
  reportRoot,
  "fall-date-budget-pilot-s193-v1-partial/agent-styled-draft.json",
);
const decisionManifestPath = path.join(
  reportRoot,
  "visual-identity-decisions.json",
);
const globalReservationsPath = path.join(
  reportRoot,
  "global-product-reservation-ledger.json",
);
const provisionalHoldsPath = path.join(
  reportRoot,
  "provisional-front-runner-ledger.json",
);
const outputDirectory = path.join(reportRoot, "s193-recomposed-candidates");
const outputJsonPath = path.join(outputDirectory, "candidates.json");
const outputDraftPath = path.join(outputDirectory, "agent-styled-draft.json");
const outputBoardPath = path.join(
  outputDirectory,
  "s193-recomposed-candidates.jpg",
);

const bottomIdentities = [
  "shopify_supplier:5ee70df61299c873a76cd10ed93b206f97430c23",
  "shopify_supplier:de0c7dfa10b7272a8c0cadea123eaaac8aff7320",
  "shopify_supplier:cb7bce975c76e67d2947ed32d70475518334f55a",
  "shopify_supplier:75a9c43d42d0852a63c2291928fa436c7dfbc823",
  "shopify_supplier:00f657f5fb0ef1157e296ad9fa3404f0f0bd577d",
  "shopify_supplier:bf7fa4e61eb13d0ac96cfca0028b90814633535c",
  "shopify_supplier:398e675c18f7e47723df3a8eeae3d2ca50b522ff",
  "shopify_supplier:3095c87326ee7556a98852b611d3737df02b04a4",
];

const decisions = [
  {
    status: "visual-rejected",
    reason:
      "The supposedly straight brown trouser still reads narrow through the thigh and cropped at the ankle; it repeats the rejected skinny/cropped silhouette.",
  },
  {
    status: "visual-rejected",
    reason:
      "The light-gray trouser is shown product-only, so rise, seat, leg line and hem behavior cannot be verified well enough for a complete outfit approval.",
  },
  {
    status: "complete-outfit-visual-approved",
    reason:
      "The full-resolution source shows a clean mid-rise straight leg with controlled ease and a full hem. Mineral teal, light stone khaki and taupe suede form a modern transitional Fall Date palette without turning dark or formal-heavy.",
  },
  {
    status: "visual-rejected",
    reason:
      "The vintage jean is cropped with a conspicuously roomy seat and tapered cuff; its casual sneaker-led styling does not resolve cleanly over the Chelsea boot.",
  },
  {
    status: "visual-rejected",
    reason:
      "The light-blue jean is too loose and puddled for this compact knit and Chelsea boot, recreating the baggy-bottom imbalance the rebuild is removing.",
  },
  {
    status: "visual-rejected",
    reason:
      "The ivory jean has no on-body source proof, leaving the rise, leg width and boot break unresolved.",
  },
  {
    status: "visual-rejected",
    reason:
      "The cropped French-blue trouser competes with the teal top and is constrained to Spring or Summer; it is not credible for this Fall boot outfit.",
  },
  {
    status: "visual-rejected",
    reason:
      "The lightweight drawstring trouser is a Spring or Summer relaxed-daytime piece; its lounge construction is too casual for this Fall Date brief.",
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, length) {
  const text = String(value);
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`;
}

async function imageBuffer(image) {
  if (!/^https?:\/\//i.test(image)) return fs.readFile(image);
  const response = await fetch(image);
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}): ${image}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const [sourceDraft, decisionManifest, globalReservations, provisionalHolds] =
  await Promise.all(
    [
      sourceDraftPath,
      decisionManifestPath,
      globalReservationsPath,
      provisionalHoldsPath,
    ].map(async (file) => JSON.parse(await fs.readFile(file, "utf8"))),
  );

const sourceOutfit = sourceDraft.scenarios[0].outfitSets.separates[0];
const top = structuredClone(
  sourceOutfit.items.find((item) => item.slot === "top"),
);
const shoe = structuredClone(
  sourceOutfit.items.find((item) => item.slot === "shoe"),
);
if (!top || !shoe) throw new Error("S193 source top or shoe is missing.");

const acceptedByIdentity = new Map(
  decisionManifest.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [entry.identity, entry]),
);
const globallyReserved = new Set(
  globalReservations.reservations.map((entry) => entry.productKey),
);
const provisionallyHeld = new Set(
  provisionalHolds.holds.map((entry) => entry.identity),
);

const candidates = bottomIdentities.map((identity, index) => {
  const entry = acceptedByIdentity.get(identity);
  if (!entry) throw new Error(`Missing accepted bottom ${identity}.`);
  if (globallyReserved.has(identity)) {
    throw new Error(`Candidate is already globally reserved: ${identity}.`);
  }
  if (provisionallyHeld.has(identity)) {
    throw new Error(`Candidate is already provisionally held: ${identity}.`);
  }
  const bottom = {
    ...structuredClone(entry.selectedVariant),
    styleRagId: identity,
    productId: identity,
    source: "existing-refined-visual-ledger",
    visualDecisionStatus: "accept",
    visualConstraints: entry.constraints ?? [],
  };
  return {
    candidateId: `S193-RECOMPOSED-${String(index + 1).padStart(2, "0")}`,
    scenarioId: "S193",
    occasion: "Date Night",
    season: "Fall",
    budget: "Budget-Friendly",
    status: decisions[index].status,
    visualReason: decisions[index].reason,
    outfitId:
      decisions[index].status === "complete-outfit-visual-approved"
        ? "S193-SEPARATES-V2-RECOMPOSED-01"
        : null,
    position:
      decisions[index].status === "complete-outfit-visual-approved" ? 1 : null,
    name:
      decisions[index].status === "complete-outfit-visual-approved"
        ? "Mineral Teal, Stone Khaki and Taupe Suede"
        : `${top.color}, ${bottom.color} and ${shoe.color}`,
    totalPrice: Number(
      [top, bottom, shoe]
        .reduce((sum, item) => sum + Number(item.price ?? 0), 0)
        .toFixed(2),
    ),
    items: [top, bottom, shoe],
  };
});

await fs.mkdir(outputDirectory, { recursive: true });
const columns = 4;
const rows = Math.ceil(candidates.length / columns);
const cardWidth = 760;
const cardHeight = 670;
const gap = 22;
const headerHeight = 118;
const itemWidth = 220;
const imageHeight = 390;
const boardWidth = gap + columns * (cardWidth + gap);
const boardHeight = headerHeight + rows * (cardHeight + gap) + gap;
const composites = [];

for (const [candidateIndex, candidate] of candidates.entries()) {
  const column = candidateIndex % columns;
  const row = Math.floor(candidateIndex / columns);
  for (const [itemIndex, item] of candidate.items.entries()) {
    const source = await imageBuffer(item.image);
    const image = await sharp(source, { failOn: "none" })
      .resize(itemWidth - 16, imageHeight - 16, {
        fit: "contain",
        background: "#f8f7f2",
      })
      .flatten({ background: "#f8f7f2" })
      .jpeg({ quality: 95 })
      .toBuffer();
    const svg = Buffer.from(`
      <svg width="${itemWidth}" height="535" xmlns="http://www.w3.org/2000/svg">
        <rect width="${itemWidth}" height="535" rx="15" fill="#f8f7f2"/>
        <text x="12" y="414" font-family="Arial" font-size="17" font-weight="700" fill="#171717">${escapeXml(item.slot.toUpperCase())}</text>
        <text x="12" y="445" font-family="Arial" font-size="14" fill="#222">${escapeXml(truncate(item.garmentType, 27))}</text>
        <text x="12" y="474" font-family="Arial" font-size="14" fill="#666">${escapeXml(truncate(item.color, 27))}</text>
        <text x="12" y="506" font-family="Arial" font-size="12" fill="#888">${escapeXml(truncate(item.reviewId ?? item.productId, 27))}</text>
      </svg>
    `);
    const itemCard = await sharp(svg)
      .composite([{ input: image, left: 8, top: 8 }])
      .png()
      .toBuffer();
    composites.push({
      input: itemCard,
      left: gap + column * (cardWidth + gap) + 28 + itemIndex * (itemWidth + 14),
      top: headerHeight + row * (cardHeight + gap) + 104,
    });
  }
}

const baseSvg = Buffer.from(`
  <svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${boardWidth}" height="${boardHeight}" fill="#e9e7df"/>
    <text x="24" y="42" font-family="Arial" font-size="30" font-weight="700" fill="#171717">S193 · Fall Date Night · unused-bottom comparison</text>
    <text x="24" y="77" font-family="Arial" font-size="18" fill="#555">Same accepted teal knit and taupe Chelsea boot · eight accepted unreserved bottoms · comparison only · no product reuse</text>
    ${candidates
      .map((candidate, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return `
          <g transform="translate(${gap + column * (cardWidth + gap)}, ${headerHeight + row * (cardHeight + gap)})">
            <rect width="${cardWidth}" height="${cardHeight}" rx="20" fill="#fff"/>
            <circle cx="39" cy="40" r="22" fill="#171717"/>
            <text x="39" y="47" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#fff">${String.fromCharCode(65 + index)}</text>
            <text x="72" y="35" font-family="Arial" font-size="20" font-weight="700" fill="#171717">${escapeXml(truncate(candidate.items[1].title, 51))}</text>
            <text x="72" y="64" font-family="Arial" font-size="15" fill="#61794d">${escapeXml(candidate.items[1].color)} · $${candidate.totalPrice.toFixed(2)}</text>
            <text x="28" y="91" font-family="Arial" font-size="14" font-weight="700" fill="${candidate.status === "complete-outfit-visual-approved" ? "#3e7041" : "#a0483f"}">${candidate.status === "complete-outfit-visual-approved" ? "VISUAL APPROVED" : "REJECTED"}</text>
            <text x="28" y="657" font-family="Arial" font-size="12" fill="#777">${escapeXml(candidate.items[1].styleRagId)}</text>
          </g>`;
      })
      .join("")}
  </svg>
`);

await sharp(baseSvg)
  .composite(composites)
  .jpeg({ quality: 96 })
  .toFile(outputBoardPath);
await fs.writeFile(
  outputJsonPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      sourceDraftPath,
      summary: {
        candidates: candidates.length,
        acceptedUnreservedBottoms: candidates.length,
        approvedOutfitsAdded: candidates.filter(
          (candidate) =>
            candidate.status === "complete-outfit-visual-approved",
        ).length,
        uiIntegrated: false,
      },
      candidates,
    },
    null,
    2,
  )}\n`,
);

const approvedCandidates = candidates.filter(
  (candidate) => candidate.status === "complete-outfit-visual-approved",
);
await fs.writeFile(
  outputDraftPath,
  `${JSON.stringify(
    {
      version: "s193-recomposed-source-audited-v1",
      generatedAt: new Date().toISOString(),
      localOnly: true,
      sourceDraftPath,
      summary: {
        visuallyReadyOutfits: approvedCandidates.length,
        placements: approvedCandidates.flatMap((candidate) => candidate.items)
          .length,
        uniqueIdentities: new Set(
          approvedCandidates.flatMap((candidate) =>
            candidate.items.map((item) => item.styleRagId),
          ),
        ).size,
        repeatedIdentities: 0,
        uiIntegrated: false,
      },
      visualQa: candidates.map((candidate, index) => ({
        position: candidate.position ?? index + 100,
        outfitId:
          candidate.outfitId ?? `S193-REJECTED-CANDIDATE-${index + 1}`,
        decision:
          candidate.status === "complete-outfit-visual-approved"
            ? "pass"
            : "reject",
        reason: candidate.visualReason,
      })),
      scenarios: [
        {
          scenario: {
            id: "S193",
            gender: "male",
            occasion: "date-night",
            occasionLabel: "Date Night",
            season: "fall",
            seasonLabel: "Fall",
            budget: "budget-friendly",
            budgetLabel: "Budget-Friendly",
            budgetMin: 0,
            budgetMax: 500,
            currency: "USD",
            targetOutfits: 10,
          },
          outfitSets: {
            separates: approvedCandidates.map((candidate) => ({
              position: candidate.position,
              outfitId: candidate.outfitId,
              name: candidate.name,
              rationale:
                "A mineral-teal fine-knit polo supplies the color, a light stone-khaki straight trouser gives controlled ease without puddling, and a taupe suede Chelsea boot adds clean Fall weight.",
              totalPrice: candidate.totalPrice,
              items: candidate.items,
            })),
            suit: [],
          },
        },
      ],
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      outputBoardPath,
      outputJsonPath,
      outputDraftPath,
      candidates: candidates.length,
      approved: approvedCandidates.length,
    },
    null,
    2,
  ),
);
