import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const outputDirectory = `${reportDirectory}/mens-full-bank-supply-gap-audit`;
const auditPath = `${reportDirectory}/mens-family-role-blueprint-audit/audit.json`;
const decisionsPath = `${reportDirectory}/visual-identity-decisions.json`;
const manualAlphaPath = `${reportDirectory}/cj-manual-gemini-final-alpha/alpha-approval-manifest.json`;
const manualCandidatesPath = `${reportDirectory}/cj-manual-approved-candidates.json`;
const reservationsPath = `${reportDirectory}/global-product-reservation-ledger.json`;

const [familyAudit, decisions, manualAlpha, manualCandidates, reservations] =
  await Promise.all(
    [auditPath, decisionsPath, manualAlphaPath, manualCandidatesPath, reservationsPath].map(
      async (path) => JSON.parse(await readFile(path, "utf8")),
    ),
  );

const categoryOrder = [
  "top",
  "bottom",
  "outerwear",
  "shoe",
  "bag",
  "accessory",
  "suit",
  "watch",
];

const categoryLabels = {
  top: "Tops",
  bottom: "Bottoms",
  outerwear: "Outerwear",
  shoe: "Shoes",
  bag: "Bags",
  accessory: "Accessories",
  suit: "Suits",
  watch: "Watches",
};

const normalizeIdentity = (identity) => String(identity).trim().toLowerCase();

const categoryForDecision = (entry) => {
  const variant = entry.selectedVariant ?? {};
  if (entry.sourceCollection === "refined-cj-shoes") return "shoe";
  if (entry.sourceCollection === "cj-mens-extras") {
    const kind = String(variant.productKind ?? "accessory").toLowerCase();
    if (kind === "shoes") return "shoe";
    if (["bag", "watch", "suit"].includes(kind)) return kind;
    return "accessory";
  }

  const slot = String(variant.slot ?? "").toLowerCase();
  const garmentType = String(variant.garmentType ?? "").toLowerCase();
  if (slot === "watch" || garmentType.includes("watch")) return "watch";
  if (categoryOrder.includes(slot)) return slot;
  throw new Error(`Accepted product has no recognized category: ${entry.identity}`);
};

const candidateByProductId = new Map(
  manualCandidates.products.map((candidate) => [
    String(candidate.productId).toLowerCase(),
    candidate,
  ]),
);

const demandCounts = Object.fromEntries(categoryOrder.map((category) => [category, 0]));
const familyDemandCounts = { separates: 0, suit: 0 };
for (const scenario of familyAudit.scenarios) {
  for (const roleKey of scenario.requiredRoleKeys) {
    const [family, category] = roleKey.split(".");
    if (!categoryOrder.includes(category)) {
      throw new Error(`Unknown required role category: ${roleKey}`);
    }
    demandCounts[category] += 10;
    familyDemandCounts[family] += 10;
  }
}

const acceptedCounts = Object.fromEntries(categoryOrder.map((category) => [category, 0]));
const acceptedIdentities = new Set();
for (const entry of decisions.entries.filter((candidate) => candidate.status === "accept")) {
  const normalizedIdentity = normalizeIdentity(entry.identity);
  if (acceptedIdentities.has(normalizedIdentity)) {
    throw new Error(`Duplicate accepted decision identity: ${entry.identity}`);
  }
  acceptedIdentities.add(normalizedIdentity);
  acceptedCounts[categoryForDecision(entry)] += 1;
}

for (const entry of manualAlpha.entries.filter(
  (candidate) => {
    const source = candidateByProductId.get(
      String(candidate.productId).toLowerCase(),
    );
    return (
      candidate.alphaVisualDecision === "approved" &&
      String(source?.status ?? "").startsWith("approved-for")
    );
  },
)) {
  const productId = String(entry.productId).toLowerCase();
  const identity = normalizeIdentity(`cj:${productId}`);
  const source = candidateByProductId.get(productId);
  const category = String(source?.productKind ?? "accessory").toLowerCase();
  if (!categoryOrder.includes(category)) {
    throw new Error(`Manual CJ product has no recognized category: ${identity}`);
  }
  if (acceptedIdentities.has(identity)) {
    throw new Error(`Duplicate accepted manual CJ identity: ${identity}`);
  }
  acceptedIdentities.add(identity);
  acceptedCounts[category] += 1;
}

const reservedIdentities = new Set(
  reservations.reservations.map((reservation) =>
    normalizeIdentity(reservation.productKey),
  ),
);
const missingReservedIdentities = [...reservedIdentities].filter(
  (identity) => !acceptedIdentities.has(identity),
);
if (missingReservedIdentities.length) {
  throw new Error(
    `Reserved identities missing from accepted pool: ${missingReservedIdentities.join(", ")}`,
  );
}

const categories = categoryOrder.map((category) => ({
  category,
  label: categoryLabels[category],
  activeNextLookRequiredPlacements: demandCounts[category] / 10,
  requiredUniquePlacements: demandCounts[category],
  individuallyAcceptedIdentities: acceptedCounts[category],
  activeNextLookMinimumNewIdentities: Math.max(
    0,
    demandCounts[category] / 10 - acceptedCounts[category],
  ),
  minimumNewIdentitiesNeeded: Math.max(
    0,
    demandCounts[category] - acceptedCounts[category],
  ),
  acceptedSupplyPercent: Number(
    ((acceptedCounts[category] / demandCounts[category]) * 100).toFixed(2),
  ),
}));

const sum = (values) => values.reduce((total, value) => total + value, 0);
const requiredUniquePlacements = sum(
  categories.map((entry) => entry.requiredUniquePlacements),
);
const individuallyAcceptedIdentities = acceptedIdentities.size;
const minimumNewIdentitiesNeeded = sum(
  categories.map((entry) => entry.minimumNewIdentitiesNeeded),
);
const activeNextLookRequiredPlacements = sum(
  categories.map((entry) => entry.activeNextLookRequiredPlacements),
);
const activeNextLookAcceptedCapacity = sum(
  categories.map((entry) =>
    Math.min(
      entry.activeNextLookRequiredPlacements,
      entry.individuallyAcceptedIdentities,
    ),
  ),
);
const activeNextLookMinimumNewIdentities = sum(
  categories.map((entry) => entry.activeNextLookMinimumNewIdentities),
);
const approvedCorePlacements = reservations.summary.approvedCorePlacements;
const approvedUniqueProductPlacements =
  reservations.summary.approvedUniqueProductPlacements;

const result = {
  generatedAt: new Date().toISOString(),
  scope: "Men only; 128 non-wedding scenario cells; ten globally unique looks per active family.",
  localOnly: true,
  weddingAndWeddingGuestExcluded: true,
  identityRule:
    "One supplier/CJ product identity may appear in only one outfit across the complete non-wedding bank.",
  interpretation:
    "The minimum sourcing floor assumes every individually accepted product can eventually pass a UI-complete outfit and a correct price tier. The real requirement will be higher when products fail pairing, price, availability, or image gates.",
  summary: {
    scenarioCells: familyAudit.summary.scenarioCells,
    separatesFamilyUniquePlacements: familyDemandCounts.separates,
    suitFamilyUniquePlacements: familyDemandCounts.suit,
    activeNextLookRequiredPlacements,
    activeNextLookAcceptedCapacity,
    activeNextLookMinimumNewIdentities,
    requiredUniquePlacements,
    individuallyAcceptedIdentities,
    reservedIdentities: reservedIdentities.size,
    unreservedAcceptedIdentities: individuallyAcceptedIdentities - reservedIdentities.size,
    approvedThreePieceCores: reservations.summary.approvedThreePieceCores,
    approvedCorePlacements,
    approvedUniqueProductPlacements,
    uiCompleteOutfits: reservations.summary.uiCompleteOutfits,
    uiCompleteOutfitPlacements: reservations.summary.uiCompleteOutfitPlacements,
    approvedPlacementGap:
      requiredUniquePlacements - approvedUniqueProductPlacements,
    minimumNewIdentitiesNeeded,
    acceptedSupplyPercent: Number(
      ((individuallyAcceptedIdentities / requiredUniquePlacements) * 100).toFixed(2),
    ),
    repeatedReservedIdentities: reservations.summary.repeatedProductIdentities,
    uiIntegrated: false,
  },
  categories,
  sources: {
    familyAudit: auditPath,
    existingDecisionLedger: decisionsPath,
    manualCjFinalAlpha: manualAlphaPath,
    reservationLedger: reservationsPath,
  },
};

if (result.summary.requiredUniquePlacements !== 10_880) {
  throw new Error(
    `Expected 10,880 full-bank placements, received ${result.summary.requiredUniquePlacements}`,
  );
}
if (
  result.summary.minimumNewIdentitiesNeeded !==
  result.summary.requiredUniquePlacements - result.summary.individuallyAcceptedIdentities
) {
  throw new Error(
    `Full-bank identity shortfall does not balance: ${result.summary.minimumNewIdentitiesNeeded}`,
  );
}
if (result.summary.activeNextLookRequiredPlacements !== 1_088) {
  throw new Error(
    `Expected 1,088 active-next-look placements, received ${result.summary.activeNextLookRequiredPlacements}`,
  );
}
if (
  result.summary.activeNextLookMinimumNewIdentities !==
  sum(categories.map((entry) => entry.activeNextLookMinimumNewIdentities))
) {
  throw new Error(
    `Active-next-look identity shortfall does not balance: ${result.summary.activeNextLookMinimumNewIdentities}`,
  );
}
if (result.summary.repeatedReservedIdentities !== 0) {
  throw new Error("Reserved product identities are repeated.");
}

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);
const markdownRows = categories
  .map(
    (entry) =>
      `| ${entry.label} | ${formatNumber(entry.requiredUniquePlacements)} | ${formatNumber(entry.individuallyAcceptedIdentities)} | ${formatNumber(entry.minimumNewIdentitiesNeeded)} | ${entry.acceptedSupplyPercent.toFixed(2)}% |`,
  )
  .join("\n");

const markdown = `# Men's full-bank supply gap audit

This is the controlling scale check for the local, men-only, non-wedding AI Stylist rebuild. It separates individually accepted product identities, approved three-piece cores and UI-complete outfits.

- Scenario cells: **${result.summary.scenarioCells}**
- Required globally unique product placements: **${formatNumber(result.summary.requiredUniquePlacements)}**
- Individually accepted product identities: **${formatNumber(result.summary.individuallyAcceptedIdentities)}**
- Minimum additional identities still required: **${formatNumber(result.summary.minimumNewIdentitiesNeeded)}**
- First complete look per active family: **${formatNumber(result.summary.activeNextLookRequiredPlacements)} placements**, with a best-case minimum of **${formatNumber(result.summary.activeNextLookMinimumNewIdentities)} new identities** still required
- Visually approved three-piece cores: **${result.summary.approvedThreePieceCores}**
- Placements inside approved cores: **${result.summary.approvedCorePlacements}**
- UI-complete outfits: **${result.summary.uiCompleteOutfits}**
- Unique placements across approved cores and add-ons: **${result.summary.approvedUniqueProductPlacements}**
- Reserved identities: **${result.summary.reservedIdentities}** (${result.summary.unreservedAcceptedIdentities} individually accepted identities remain unreserved)
- Repeated reserved identities: **${result.summary.repeatedReservedIdentities}**
- Wedding and Wedding Guest: **excluded**
- AI Stylist UI integrated: **no**

| Category | Full-bank demand | Accepted pool | Minimum new identities | Supply covered |
|---|---:|---:|---:|---:|
${markdownRows}

The **${formatNumber(result.summary.minimumNewIdentitiesNeeded)}** shortfall is a mathematical minimum, not a sourcing promise. It assumes all ${formatNumber(result.summary.individuallyAcceptedIdentities)} currently accepted products can be placed successfully. Complete visual pairing, correct season, occasion, budget tier, availability, source-image quality, refinement, and background-removal gates will increase the real sourcing requirement.

There are two distinct gaps:

1. **Candidate supply gap:** ${formatNumber(result.summary.minimumNewIdentitiesNeeded)} additional unique identities at minimum.
2. **UI-complete outfit gap:** ${formatNumber(1920 - result.summary.uiCompleteOutfits)} of 1,920 target looks remain incomplete. One S133 look, one S149 look and one S225 look are complete; the other three approved top-bottom-shoe cores still need their required unique add-ons.

The practical first phase is still the complete 128-cell matrix, not a smaller scenario set: one complete look for every active Separates or Suit family needs ${formatNumber(result.summary.activeNextLookRequiredPlacements)} unique placements. Category matching shows the current pool can cover at most ${formatNumber(result.summary.activeNextLookAcceptedCapacity)} of those slots before season, occasion, budget, and complete-board failures, leaving a best-case floor of ${formatNumber(result.summary.activeNextLookMinimumNewIdentities)} newly sourced identities for phase one.

No CJ search API, Gemini call, import, background-removal job, UI integration, push, or deployment is performed by this audit.
`;

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const width = 1680;
const height = 1320;
const barStart = 440;
const barWidth = 770;
const rowStart = 500;
const rowHeight = 82;
const maxDemand = Math.max(...categories.map((entry) => entry.requiredUniquePlacements));
const categoryRows = categories
  .map((entry, index) => {
    const y = rowStart + index * rowHeight;
    const demandWidth = (entry.requiredUniquePlacements / maxDemand) * barWidth;
    const acceptedWidth = Math.max(
      3,
      (entry.individuallyAcceptedIdentities / maxDemand) * barWidth,
    );
    return `
      <text x="80" y="${y + 25}" class="row-label">${escapeXml(entry.label)}</text>
      <rect x="${barStart}" y="${y}" width="${demandWidth}" height="34" rx="17" fill="#dedbd2"/>
      <rect x="${barStart}" y="${y}" width="${acceptedWidth}" height="34" rx="17" fill="#3d715b"/>
      <text x="1240" y="${y + 25}" class="row-value">${formatNumber(entry.individuallyAcceptedIdentities)} / ${formatNumber(entry.requiredUniquePlacements)}</text>
      <text x="1510" y="${y + 25}" class="row-gap">-${formatNumber(entry.minimumNewIdentitiesNeeded)}</text>
    `;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .kicker { font: 800 18px Arial, sans-serif; letter-spacing: 3px; fill: #3d715b; }
    .title { font: 700 58px Georgia, serif; fill: #1c1b18; }
    .subtitle { font: 400 23px Arial, sans-serif; fill: #68645c; }
    .metric { font: 700 42px Arial, sans-serif; fill: #1c1b18; }
    .metric-label { font: 600 16px Arial, sans-serif; letter-spacing: 1px; fill: #736f67; }
    .row-label { font: 700 25px Arial, sans-serif; fill: #282620; }
    .row-value { font: 700 23px Arial, sans-serif; fill: #3d715b; }
    .row-gap { font: 700 23px Arial, sans-serif; fill: #a3453d; text-anchor: end; }
    .legend { font: 500 18px Arial, sans-serif; fill: #5e5a52; }
    .footer { font: 500 19px Arial, sans-serif; fill: #5e5a52; }
  </style>
  <rect width="100%" height="100%" fill="#f4f2ed"/>
  <text x="80" y="74" class="kicker">LOCAL · MEN ONLY · WEDDING EXCLUDED · ZERO REUSE</text>
  <text x="80" y="148" class="title">Full-bank product supply gap</text>
  <text x="80" y="190" class="subtitle">128 scenario cells · ten unique looks per active family · candidate approval is not outfit approval</text>

  <rect x="80" y="240" width="340" height="150" rx="22" fill="#ffffff" stroke="#dedbd2"/>
  <text x="110" y="310" class="metric">${formatNumber(result.summary.requiredUniquePlacements)}</text>
  <text x="110" y="350" class="metric-label">UNIQUE PLACEMENTS REQUIRED</text>

  <rect x="445" y="240" width="340" height="150" rx="22" fill="#ffffff" stroke="#dedbd2"/>
  <text x="475" y="310" class="metric">${formatNumber(result.summary.individuallyAcceptedIdentities)}</text>
  <text x="475" y="350" class="metric-label">INDIVIDUALLY ACCEPTED</text>

  <rect x="810" y="240" width="340" height="150" rx="22" fill="#ffffff" stroke="#dedbd2"/>
  <text x="840" y="310" class="metric" fill="#a3453d">${formatNumber(result.summary.minimumNewIdentitiesNeeded)}</text>
  <text x="840" y="350" class="metric-label">MINIMUM STILL TO SOURCE</text>

  <rect x="1175" y="240" width="425" height="150" rx="22" fill="#ffffff" stroke="#dedbd2"/>
  <text x="1205" y="310" class="metric">${result.summary.uiCompleteOutfits} full · ${result.summary.approvedUniqueProductPlacements} pieces</text>
  <text x="1205" y="350" class="metric-label">UI-COMPLETE LOOKS · APPROVED PLACEMENTS</text>

  <circle cx="450" cy="442" r="9" fill="#3d715b"/><text x="470" y="449" class="legend">accepted pool</text>
  <circle cx="650" cy="442" r="9" fill="#dedbd2"/><text x="670" y="449" class="legend">full-bank demand</text>
  <text x="1510" y="449" class="legend" text-anchor="end">minimum gap</text>

  ${categoryRows}

  <line x1="80" y1="1185" x2="1600" y2="1185" stroke="#d7d3ca"/>
  <text x="80" y="1230" class="footer">First complete look in every active family: 1,088 placements · minimum ${formatNumber(result.summary.activeNextLookMinimumNewIdentities)} new identities before visual pairing failures.</text>
  <text x="80" y="1265" class="footer">Full bank: ${formatNumber(result.summary.minimumNewIdentitiesNeeded)}-product best-case shortfall · ${result.summary.reservedIdentities} reserved identities · zero repeats · UI not integrated.</text>
</svg>`;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(`${outputDirectory}/audit.json`, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/AUDIT.md`, markdown, "utf8"),
  sharp(Buffer.from(svg)).png().toFile(`${outputDirectory}/supply-gap.png`),
]);

console.log(
  JSON.stringify(
    {
      outputDirectory,
      summary: result.summary,
      categories,
    },
    null,
    2,
  ),
);
