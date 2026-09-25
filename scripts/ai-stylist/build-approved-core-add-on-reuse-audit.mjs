#!/usr/bin/env node

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "approved-core-add-on-reuse-audit");

const [decisions, reservationLedger, provisionalLedger] = await Promise.all([
  readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8").then(JSON.parse),
]);

const canonicalIdentity = (value) => String(value ?? "").trim().toLowerCase();
const claimedIdentities = new Set([
  ...reservationLedger.reservations.map((entry) => canonicalIdentity(entry.productKey)),
  ...provisionalLedger.holds.map((entry) => canonicalIdentity(entry.identity)),
]);

function categoryFor(entry) {
  const variant = entry.selectedVariant ?? {};
  if (entry.sourceCollection === "cj-mens-extras") {
    const kind = String(variant.productKind ?? "accessory").toLowerCase();
    if (kind === "bag") return "bag";
    if (kind === "watch") return "watch";
    if (kind === "shoes") return "shoe";
    if (kind === "suit") return "suit";
    return "accessory";
  }
  const slot = String(variant.slot ?? "").toLowerCase();
  return slot === "coat-jacket" ? "outerwear" : slot;
}

const candidates = decisions.entries
  .filter((entry) => entry.status === "accept")
  .map((entry) => {
    const variant = entry.selectedVariant ?? {};
    return {
      identity: canonicalIdentity(entry.identity),
      category: categoryFor(entry),
      reviewId: variant.reviewId ?? entry.sourceReviewIds?.join(", ") ?? "—",
      title: variant.title ?? "Untitled accepted product",
      garmentType: variant.garmentType ?? variant.productKind ?? "—",
      color: variant.color ?? "unspecified",
      image: variant.image,
      price: Number.isFinite(Number(variant.price)) ? Number(variant.price) : null,
      currency: variant.currency ?? "USD",
      sourceCollection: entry.sourceCollection,
      constraints: entry.constraints ?? [],
    };
  })
  .filter(
    (entry) =>
      ["outerwear", "bag", "accessory"].includes(entry.category) &&
      !claimedIdentities.has(entry.identity),
  )
  .sort((left, right) =>
    `${left.category}-${left.reviewId}-${left.title}`.localeCompare(
      `${right.category}-${right.reviewId}-${right.title}`,
    ),
  );

const counts = Object.fromEntries(
  ["outerwear", "bag", "accessory"].map((category) => [
    category,
    candidates.filter((entry) => entry.category === category).length,
  ]),
);

if (counts.outerwear !== 18 || counts.bag !== 3 || counts.accessory !== 10) {
  throw new Error(`Unexpected globally unclaimed add-on pool: ${JSON.stringify(counts)}`);
}

async function imageBuffer(source) {
  if (!source) throw new Error("Candidate image is missing");
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Image request failed ${response.status}: ${source}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(source);
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const truncate = (value, max) => {
  const text = String(value ?? "");
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
};

const pageSize = 8;
const pages = [];
await mkdir(outputDir, { recursive: true });
for (const fileName of await readdir(outputDir)) {
  if (/^page-\d+\.jpg$/.test(fileName)) {
    await unlink(path.join(outputDir, fileName));
  }
}
for (let offset = 0; offset < candidates.length; offset += pageSize) {
  const pageCandidates = candidates.slice(offset, offset + pageSize);
  const pageNumber = pages.length + 1;
  const cardWidth = 360;
  const cardHeight = 470;
  const gap = 18;
  const margin = 28;
  const headerHeight = 112;
  const columns = 4;
  const rows = 2;
  const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = headerHeight + margin + rows * cardHeight + (rows - 1) * gap + margin;

  const cardBuffers = await Promise.all(
    pageCandidates.map(async (candidate, index) => {
      const sourceImage = await sharp(await imageBuffer(candidate.image), { failOn: "none" })
        .rotate()
        .resize({ width: 324, height: 300, fit: "contain", background: "#f7f5ef" })
        .flatten({ background: "#f7f5ef" })
        .jpeg({ quality: 91 })
        .toBuffer();
      const price = candidate.price === null
        ? "price not recorded"
        : `${candidate.currency} ${candidate.price.toFixed(2)}`;
      const cardSvg = Buffer.from(
        `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" rx="18" fill="#ffffff" stroke="#d9d5ca"/>
          <circle cx="26" cy="26" r="17" fill="#171714"/>
          <text x="26" y="32" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#fff">${offset + index + 1}</text>
          <text x="54" y="24" font-family="Arial" font-size="12" font-weight="700" fill="#4f725d">${escapeXml(candidate.category.toUpperCase())} · ${escapeXml(candidate.reviewId)}</text>
          <text x="18" y="350" font-family="Arial" font-size="15" font-weight="700" fill="#171714">${escapeXml(truncate(candidate.title, 43))}</text>
          <text x="18" y="378" font-family="Arial" font-size="12" fill="#555">${escapeXml(truncate(candidate.garmentType, 48))}</text>
          <text x="18" y="403" font-family="Arial" font-size="12" fill="#555">${escapeXml(truncate(candidate.color, 31))} · ${escapeXml(price)}</text>
          <text x="18" y="432" font-family="Arial" font-size="10" fill="#8a847a">${escapeXml(truncate(candidate.identity, 53))}</text>
          <text x="18" y="453" font-family="Arial" font-size="10" font-weight="700" fill="#9b4a3f">UNCLAIMED · REQUIRES CORE PAIRING GATE</text>
        </svg>`,
      );
      return sharp(cardSvg)
        .composite([{ input: sourceImage, left: 18, top: 38 }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }),
  );

  const baseSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ebe9e3"/>
      <text x="${margin}" y="42" font-family="Arial" font-size="28" font-weight="700" fill="#171714">Approved-core add-on reuse gate · page ${pageNumber}/${Math.ceil(candidates.length / pageSize)}</text>
      <text x="${margin}" y="72" font-family="Arial" font-size="14" fill="#5e5a52">Accepted and globally unclaimed only · ${counts.outerwear} outerwear · ${counts.bag} bags · ${counts.accessory} accessories</text>
      <text x="${margin}" y="96" font-family="Arial" font-size="12" fill="#817a70">Visual comparison pool only · no reservation, outfit approval, CJ search, Gemini request or UI integration</text>
    </svg>`,
  );
  const outputPath = path.join(outputDir, `page-${String(pageNumber).padStart(2, "0")}.jpg`);
  await sharp(baseSvg)
    .composite(
      cardBuffers.map((input, index) => ({
        input,
        left: margin + (index % columns) * (cardWidth + gap),
        top: headerHeight + margin + Math.floor(index / columns) * (cardHeight + gap),
      })),
    )
    .jpeg({ quality: 92 })
    .toFile(outputPath);
  pages.push(outputPath);
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "comparison-pool-only-not-reserved",
  identityRule:
    "Candidates already claimed by the global reservation ledger or provisional hold ledger are excluded.",
  counts: {
    ...counts,
    candidates: candidates.length,
    pages: pages.length,
  },
  uiCompleteOutfitsAdded: 0,
  repeatedIdentities: candidates.length - new Set(candidates.map((entry) => entry.identity)).size,
  weddingAndWeddingGuestExcluded: true,
  uiIntegrated: false,
  pages,
  candidates,
};

if (result.repeatedIdentities !== 0) {
  throw new Error("Reuse audit contains repeated identities");
}

await writeFile(
  path.join(outputDir, "audit.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      outputDir,
      ...result.counts,
      repeatedIdentities: result.repeatedIdentities,
      uiCompleteOutfitsAdded: result.uiCompleteOutfitsAdded,
      uiIntegrated: result.uiIntegrated,
    },
    null,
    2,
  ),
);
