#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const ledgerPath = path.join(
  reportRoot,
  "global-product-reservation-ledger.json",
);
const outputImagePath = path.join(reportRoot, "APPROVED_SHOES_GALLERY.png");
const outputJsonPath = path.join(reportRoot, "approved-shoes-gallery.json");

const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const shoes = ledger.reservations
  .filter(
    (entry) =>
      entry.slot === "shoe" &&
      [
        "complete-outfit-visual-approved",
        "ui-complete-outfit-visual-approved",
      ].includes(entry.reservationStatus),
  )
  .sort((left, right) =>
    `${left.scenarioId}-${String(left.outfitPosition).padStart(2, "0")}`.localeCompare(
      `${right.scenarioId}-${String(right.outfitPosition).padStart(2, "0")}`,
    ),
  );

const identities = shoes.map((shoe) => shoe.productKey.toLowerCase());
if (shoes.length !== 6 || new Set(identities).size !== 6) {
  throw new Error(
    `Expected 6 globally unique outfit-approved shoes after the S133 six-role approval, found ${shoes.length}/${new Set(identities).size}`,
  );
}
if (
  ledger.summary?.catalogReadyShoes !== 8 ||
  ledger.summary?.catalogReadyShoesUsed !== 6 ||
  ledger.summary?.catalogReadyShoesUnused !== 2
) {
  throw new Error(
    "Controlling shoe summary no longer matches the source-audited shoe records",
  );
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, maximum) {
  const text = String(value);
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function archetype(shoe) {
  const type = shoe.garmentType.toLowerCase();
  if (type.includes("trail")) return "trail shoe";
  if (type.includes("boot")) return "ankle boot";
  if (type.includes("loafer")) return "loafer";
  if (type.includes("sneaker")) return "lifestyle sneaker";
  return type;
}

function stylistTitle(shoe) {
  const overrides = {
    "2406240246461620500": "Tan-Suede Round-Toe Penny Loafer",
    "736610CB-75F0-45C7-9225-A3F4860A9CA4": "Light-Sand Tonal Low-Top Sneaker",
    "2504220944511605800": "Taupe-Suede Chelsea Ankle Boot",
  };
  return overrides[shoe.productId] ?? shoe.title;
}

const archetypeCounts = Object.fromEntries(
  [...new Set(shoes.map(archetype))]
    .sort()
    .map((type) => [
      type,
      shoes.filter((shoe) => archetype(shoe) === type).length,
    ]),
);
const archetypeSummary = Object.entries(archetypeCounts)
  .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
  .join(" · ");

const cardWidth = 500;
const cardHeight = 470;
const gap = 18;
const margin = 26;
const headerHeight = 154;
const columns = 3;
const rows = 2;
const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
const height =
  headerHeight + margin + rows * cardHeight + (rows - 1) * gap + margin;

const cards = await Promise.all(
  shoes.map(async (shoe, index) => {
    const image = await sharp(await readFile(shoe.image), { failOn: "none" })
      .rotate()
      .resize({
        width: 450,
        height: 300,
        fit: "contain",
        background: "#f5f3ee",
      })
      .flatten({ background: "#f5f3ee" })
      .png()
      .toBuffer();
    const cardSvg = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="28" cy="28" r="18" fill="#111"/><text x="28" y="34" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${index + 1}</text><text x="56" y="25" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(`${shoe.scenarioId} · ${shoe.occasion} · ${shoe.season}`)}</text><text x="56" y="47" font-family="Arial" font-size="12" fill="#666">${escapeXml(`${shoe.budget} · outfit ${shoe.outfitPosition}`)}</text><text x="24" y="374" font-family="Arial" font-size="17" font-weight="700" fill="#111">${escapeXml(truncate(stylistTitle(shoe), 44))}</text><text x="24" y="400" font-family="Arial" font-size="13" fill="#355746">${escapeXml(`${archetype(shoe)} · ${shoe.color}`)}</text><text x="24" y="427" font-family="Arial" font-size="12" fill="#666">${escapeXml(truncate(shoe.outfitName, 64))}</text><text x="24" y="451" font-family="Arial" font-size="11" fill="#888">outfit visual approved · identity used once · local only</text></svg>`,
    );
    return sharp(cardSvg)
      .composite([{ input: image, left: 25, top: 62 }])
      .png()
      .toBuffer();
  }),
);

const headerSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="48" font-family="Arial" font-size="31" font-weight="700" fill="#111">Men’s AI Stylist · ${shoes.length} shoes inside retained outfits</text><text x="${margin}" y="82" font-family="Arial" font-size="15" fill="#555">${escapeXml(archetypeSummary)} · all ${shoes.length} identities used once</text><text x="${margin}" y="109" font-family="Arial" font-size="14" fill="#8b3e2f">${ledger.summary.catalogReadyShoesUnused} other catalog-ready shoes remain unused; each still requires a new complete-outfit visual gate before allocation.</text><text x="${margin}" y="135" font-family="Arial" font-size="12" fill="#777">Local visual evidence · Wedding and Wedding Guest excluded · no UI integration</text></svg>`,
);

await mkdir(path.dirname(outputImagePath), { recursive: true });
await sharp(headerSvg)
  .composite(
    cards.map((input, index) => ({
      input,
      left: margin + (index % columns) * (cardWidth + gap),
      top:
        headerHeight +
        margin +
        Math.floor(index / columns) * (cardHeight + gap),
    })),
  )
  .png()
  .toFile(outputImagePath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  approvedShoes: shoes.length,
  uniqueProductIdentities: new Set(identities).size,
  usedProductIdentities: identities.length,
  unusedApprovedShoes: ledger.summary.catalogReadyShoesUnused,
  archetypeCounts,
  missingArchetypes: [
    "running shoe",
    "training shoe",
    "court or gym shoe",
    "canvas or terrace sneaker",
    "espadrille",
    "sandal or slide",
    "chukka",
    "weather-ready lifestyle boot",
    "colored lifestyle sneaker",
  ],
  weddingAndWeddingGuestExcluded: true,
  uiIntegrated: false,
  shoes,
};
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  JSON.stringify(
    { outputImagePath, outputJsonPath, ...result, shoes: undefined },
    null,
    2,
  ),
);
