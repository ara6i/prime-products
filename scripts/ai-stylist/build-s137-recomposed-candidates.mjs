import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const reportRoot =
  "/Users/arashsn/Projects/PrimeStyleAI/prime-products/output/reports/" +
  "ai-stylist-mens-global-unique-visual-v16-20260913";
const sourceDraftPath = path.join(
  reportRoot,
  "summer-casual-budget-pilot-v9-partial/agent-styled-draft.json",
);
const outputDirectory = path.join(reportRoot, "s137-recomposed-candidates");
const outputJsonPath = path.join(outputDirectory, "candidates.json");
const outputDraftPath = path.join(outputDirectory, "agent-styled-draft.json");
const outputBoardPath = path.join(
  outputDirectory,
  "s137-recomposed-candidates.jpg",
);

const proposals = [
  {
    candidateId: "S137-RECOMPOSED-01",
    outfitId: "S137-SEPARATES-V10-RECOMPOSED-02",
    position: 2,
    name: "Sage, Warm Ivory and Tan Suede",
    rationale:
      "The textured sage polo supplies soft color, the warm-ivory high-rise double-pleat trouser adds controlled summer tailoring, and the low tan-suede loafer keeps the palette warm without defaulting to black.",
    productIds: [
      "2505250900531609500",
      "2502280543221601200",
      "2406240246461620500",
    ],
  },
  {
    candidateId: "S137-RECOMPOSED-02",
    outfitId: "S137-SEPARATES-V10-RECOMPOSED-03",
    position: 3,
    name: "Light Mint, Beige Apricot and Light Sand",
    rationale:
      "The substantial mint tee is balanced by a cleaner pleated tailored short instead of the revoked drawstring pairing; the tonal sand sneaker keeps the result young, light, and distinctly summery.",
    productIds: [
      "2501150834271620600",
      "2406110219091605300",
      "736610CB-75F0-45C7-9225-A3F4860A9CA4",
    ],
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

const sourceDraft = JSON.parse(await fs.readFile(sourceDraftPath, "utf8"));
const sourceOutfits = sourceDraft.scenarios[0].outfitSets.separates;
const itemsByProductId = new Map(
  sourceOutfits
    .flatMap((outfit) => outfit.items)
    .map((item) => [String(item.productId), item]),
);
const usedIdentities = new Set();
const candidates = proposals.map((proposal) => {
  const items = proposal.productIds.map((productId) => {
    const item = itemsByProductId.get(productId);
    if (!item) throw new Error(`Missing S137 source item ${productId}.`);
    if (usedIdentities.has(item.styleRagId)) {
      throw new Error(`Repeated proposal identity ${item.styleRagId}.`);
    }
    usedIdentities.add(item.styleRagId);
    return structuredClone(item);
  });
  if (new Set(items.map((item) => item.slot)).size !== 3) {
    throw new Error(
      `${proposal.candidateId} is not a complete top/bottom/shoe core.`,
    );
  }
  return {
    ...proposal,
    status:
      proposal.candidateId === "S137-RECOMPOSED-01"
        ? "complete-outfit-visual-approved"
        : "visual-rejected",
    scenarioId: "S137",
    occasion: "Casual Everyday",
    season: "Summer",
    budget: "Budget-Friendly",
    totalPrice: Number(
      items.reduce((sum, item) => sum + item.price, 0).toFixed(2),
    ),
    items,
  };
});

await fs.mkdir(outputDirectory, { recursive: true });
const cardWidth = 930;
const cardHeight = 690;
const gap = 24;
const headerHeight = 115;
const itemWidth = 276;
const imageHeight = 380;
const boardWidth = gap + candidates.length * (cardWidth + gap);
const boardHeight = headerHeight + cardHeight + gap * 2;
const composites = [];

for (const [candidateIndex, candidate] of candidates.entries()) {
  const itemCards = await Promise.all(
    candidate.items.map(async (item, itemIndex) => {
      const image = await sharp(item.image, { failOn: "none" })
        .resize(itemWidth - 20, imageHeight - 20, {
          fit: "contain",
          background: "#f8f7f2",
        })
        .flatten({ background: "#f8f7f2" })
        .jpeg({ quality: 94 })
        .toBuffer();
      const svg = Buffer.from(`
        <svg width="${itemWidth}" height="510" xmlns="http://www.w3.org/2000/svg">
          <rect width="${itemWidth}" height="510" rx="16" fill="#f8f7f2"/>
          <rect x="10" y="10" width="${itemWidth - 20}" height="${imageHeight - 20}" rx="10" fill="#f8f7f2"/>
          <text x="14" y="404" font-family="Arial" font-size="18" font-weight="700" fill="#191919">${escapeXml(item.slot.toUpperCase())}</text>
          <text x="14" y="436" font-family="Arial" font-size="16" fill="#222">${escapeXml(truncate(item.garmentType, 29))}</text>
          <text x="14" y="466" font-family="Arial" font-size="15" fill="#666">${escapeXml(truncate(item.color, 31))}</text>
          <text x="14" y="494" font-family="Arial" font-size="14" fill="#777">${escapeXml(item.styleRagId)}</text>
        </svg>
      `);
      const card = await sharp(svg)
        .composite([{ input: image, left: 10, top: 10 }])
        .png()
        .toBuffer();
      return {
        input: card,
        left:
          gap +
          candidateIndex * (cardWidth + gap) +
          28 +
          itemIndex * (itemWidth + 14),
        top: headerHeight + 136,
      };
    }),
  );
  composites.push(...itemCards);
}

const baseSvg = Buffer.from(`
  <svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${boardWidth}" height="${boardHeight}" fill="#e9e7df"/>
    <text x="24" y="42" font-family="Arial" font-size="30" font-weight="700" fill="#171717">S137 · Summer Casual recomposition review</text>
    <text x="24" y="75" font-family="Arial" font-size="18" fill="#555">Six accepted, globally unused identities · no product reuse · Wedding excluded · one approved, one rejected</text>
    ${candidates
      .map(
        (candidate, index) => `
          <g transform="translate(${gap + index * (cardWidth + gap)}, ${headerHeight})">
            <rect width="${cardWidth}" height="${cardHeight}" rx="20" fill="#fff"/>
            <text x="28" y="42" font-family="Arial" font-size="23" font-weight="700" fill="#151515">${index + 1}. ${escapeXml(candidate.name)}</text>
            <text x="28" y="76" font-family="Arial" font-size="17" fill="#637d4d">Budget-Friendly · $${candidate.totalPrice.toFixed(2)}</text>
            <text x="28" y="108" font-family="Arial" font-size="15" fill="#666">${escapeXml(truncate(candidate.rationale, 108))}</text>
            <text x="28" y="665" font-family="Arial" font-size="15" fill="#777">${
              candidate.status === "complete-outfit-visual-approved"
                ? "visual-approved · source-audited pieces · globally unique"
                : "visual-rejected · uncertain long-on-wide proportion"
            }</text>
          </g>
        `,
      )
      .join("")}
  </svg>
`);

await sharp(baseSvg)
  .composite(composites)
  .jpeg({ quality: 95 })
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
        placements: usedIdentities.size,
        uniqueIdentities: usedIdentities.size,
        repeatedIdentities: 0,
        approvedOutfitsAdded: 1,
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
      version: "s137-recomposed-source-audited-v1",
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
      visualQa: candidates.map((candidate) => ({
        position: candidate.position,
        outfitId: candidate.outfitId,
        decision:
          candidate.status === "complete-outfit-visual-approved"
            ? "pass"
            : "reject",
        reason:
          candidate.status === "complete-outfit-visual-approved"
            ? "The source audit already established that the sage knit, warm-ivory trouser and tan-suede loafer are individually strong. Together they form a controlled modern Summer Casual silhouette with soft color, clean tailoring and low-profile footwear."
            : "The long drop-shoulder mint T-shirt still lacks on-body length proof and may overwhelm the knee-length tailored short, so the complete silhouette is not reliable enough to approve.",
      })),
      scenarios: [
        {
          scenario: {
            id: "S137",
            gender: "male",
            occasion: "casual-day",
            occasionLabel: "Casual Everyday",
            season: "summer",
            seasonLabel: "Summer",
            budget: "budget-friendly",
            budgetLabel: "Budget-Friendly",
            budgetMin: 0,
            budgetMax: 500,
            currency: "USD",
            targetOutfits: 10,
          },
          outfitSets: {
            separates: candidates.map((candidate) => ({
              position: candidate.position,
              outfitId: candidate.outfitId,
              name: candidate.name,
              rationale: candidate.rationale,
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
