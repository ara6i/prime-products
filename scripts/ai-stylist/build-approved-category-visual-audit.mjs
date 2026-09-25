#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputRoot = path.join(reportRoot, "approved-category-visual-audit");
const visualDecisionPath = path.join(reportRoot, "visual-identity-decisions.json");
const manualAlphaPath = path.join(
  reportRoot,
  "cj-manual-gemini-final-alpha/alpha-approval-manifest.json",
);
const manualCandidatesPath = path.join(
  reportRoot,
  "cj-manual-approved-candidates.json",
);

const requestedCategory = String(process.argv[2] ?? "tops").toLowerCase();
const normalizedCategory =
  requestedCategory.charAt(0).toUpperCase() + requestedCategory.slice(1);

const visualDecisions = JSON.parse(await readFile(visualDecisionPath, "utf8"));
const manualAlpha = JSON.parse(await readFile(manualAlphaPath, "utf8"));
const manualCandidates = JSON.parse(await readFile(manualCandidatesPath, "utf8"));

function categoryFor(entry) {
  const variant = entry.selectedVariant ?? {};
  const productDescription = `${variant.productKind ?? ""} ${variant.garmentType ?? ""} ${variant.title ?? ""}`.toLowerCase();
  if (/\bwatch\b/.test(productDescription)) return "Watches";
  if (entry.sourceCollection === "refined-cj-shoes") return "Shoes";
  if (entry.sourceCollection === "cj-mens-extras") {
    const kind = String(variant.productKind ?? "accessory").toLowerCase();
    if (kind === "shoes" || kind === "shoe") return "Shoes";
    if (kind === "bag") return "Bags";
    if (kind === "watch") return "Watches";
    if (kind === "suit") return "Suits";
    return "Accessories";
  }
  const slot = String(variant.slot ?? "").toLowerCase();
  if (slot === "top") return "Tops";
  if (slot === "bottom") return "Bottoms";
  if (slot === "outerwear") return "Outerwear";
  if (slot === "shoe") return "Shoes";
  if (slot === "bag") return "Bags";
  if (slot === "watch") return "Watches";
  if (slot === "accessory") return "Accessories";
  return "Other";
}

function manualCategoryFor(candidate) {
  const kind = String(candidate?.productKind ?? "").toLowerCase();
  if (kind === "shoe" || kind === "shoes") return "Shoes";
  if (kind === "bag") return "Bags";
  if (kind === "bottom") return "Bottoms";
  if (kind === "outerwear") return "Outerwear";
  if (kind === "top") return "Tops";
  return "Accessories";
}

const candidateByProductId = new Map(
  manualCandidates.products.map((candidate) => [
    String(candidate.productId).toLowerCase(),
    candidate,
  ]),
);

const accepted = visualDecisions.entries
  .filter((entry) => entry.status === "accept")
  .map((entry) => {
    const variant = entry.selectedVariant ?? {};
    return {
      identity: entry.identity,
      category: categoryFor(entry),
      reviewId: variant.reviewId ?? entry.sourceReviewIds?.join(", ") ?? "—",
      title: variant.title ?? "Untitled accepted product",
      color: variant.color ?? "unspecified",
      garmentType: variant.garmentType ?? variant.productKind ?? "—",
      image: variant.image,
      source: entry.sourceCollection,
    };
  });

for (const entry of manualAlpha.entries) {
  const candidate = candidateByProductId.get(String(entry.productId).toLowerCase());
  if (
    entry.alphaVisualDecision !== "approved" ||
    !String(candidate?.status ?? "").startsWith("approved-for")
  ) {
    continue;
  }
  accepted.push({
    identity: `cj:${String(entry.productId).toLowerCase()}`,
    category: manualCategoryFor(candidate),
    reviewId: `MANUAL-CJ-${String(entry.index).padStart(2, "0")}`,
    title: candidate?.title ?? entry.garmentType ?? "Manual CJ product",
    color: candidate?.color ?? entry.color ?? "unspecified",
    garmentType: candidate?.garmentType ?? entry.garmentType ?? "—",
    image: entry.finalPath,
    source: "manual-cj-gemini-final-alpha",
  });
}

const identities = new Set();
for (const product of accepted) {
  if (identities.has(product.identity)) {
    throw new Error(`Duplicate accepted identity: ${product.identity}`);
  }
  identities.add(product.identity);
}

const products = accepted
  .filter((product) => product.category.toLowerCase() === requestedCategory)
  .sort((left, right) =>
    `${left.garmentType}-${left.color}-${left.title}`.localeCompare(
      `${right.garmentType}-${right.color}-${right.title}`,
    ),
  );
const categoryIdentities = new Set(products.map((product) => product.identity));

if (!products.length) {
  throw new Error(`No accepted products found for category ${normalizedCategory}`);
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, length) {
  const text = String(value ?? "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

async function imageBuffer(source) {
  if (!source) throw new Error("Missing product image");
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Image request failed ${response.status}: ${source}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(path.isAbsolute(source) ? source : path.join(repoRoot, source));
}

const columns = 5;
const rows = 4;
const productsPerPage = columns * rows;
const cardWidth = 400;
const cardHeight = 455;
const boardWidth = columns * cardWidth;
const boardHeight = 130 + rows * cardHeight;
const categoryOutput = path.join(outputRoot, requestedCategory);
await mkdir(categoryOutput, { recursive: true });

const pages = [];
for (let offset = 0; offset < products.length; offset += productsPerPage) {
  const pageProducts = products.slice(offset, offset + productsPerPage);
  const cards = await Promise.all(
    pageProducts.map(async (product, pageIndex) => {
      let image;
      let imageError = null;
      try {
        image = await sharp(await imageBuffer(product.image), { failOn: "none" })
          .rotate()
          .resize({
            width: cardWidth - 20,
            height: 330,
            fit: "contain",
            background: "#f7f5f0",
          })
          .flatten({ background: "#f7f5f0" })
          .jpeg({ quality: 93 })
          .toBuffer();
      } catch (error) {
        imageError = String(error.message ?? error);
        image = await sharp({
          create: {
            width: cardWidth - 20,
            height: 330,
            channels: 3,
            background: "#eaded8",
          },
        })
          .composite([
            {
              input: Buffer.from(
                `<svg width="${cardWidth - 20}" height="330" xmlns="http://www.w3.org/2000/svg"><text x="24" y="155" font-family="Arial" font-size="19" font-weight="700" fill="#8f382b">IMAGE LOAD FAILED</text><text x="24" y="190" font-family="Arial" font-size="13" fill="#5b4a46">Open the source directly before judging.</text></svg>`,
              ),
            },
          ])
          .jpeg({ quality: 93 })
          .toBuffer();
      }

      const globalIndex = offset + pageIndex + 1;
      const label = Buffer.from(
        `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fffdf9"/><rect width="100%" height="44" fill="#1d1c19"/><text x="14" y="28" font-family="Arial" font-size="15" font-weight="700" fill="#ffffff">${globalIndex}. ${escapeXml(truncate(product.reviewId, 30))}</text><text x="14" y="388" font-family="Arial" font-size="16" font-weight="700" fill="#1e1d1a">${escapeXml(truncate(product.title, 43))}</text><text x="14" y="415" font-family="Arial" font-size="13" fill="#5f5b53">${escapeXml(truncate(`${product.color} · ${product.garmentType}`, 52))}</text><text x="14" y="439" font-family="Arial" font-size="11" fill="#8a847a">${escapeXml(truncate(product.identity, 57))}</text></svg>`,
      );
      const card = await sharp(label)
        .composite([{ input: image, left: 10, top: 48 }])
        .jpeg({ quality: 94 })
        .toBuffer();
      return { card, imageError };
    }),
  );

  const pageNumber = Math.floor(offset / productsPerPage) + 1;
  const pageCount = Math.ceil(products.length / productsPerPage);
  const background = Buffer.from(
    `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9e6df"/><text x="28" y="43" font-family="Arial" font-size="28" font-weight="700" fill="#171614">Men’s ${escapeXml(normalizedCategory)} · accepted-product visual re-audit</text><text x="28" y="76" font-family="Arial" font-size="15" fill="#57534d">Page ${pageNumber} of ${pageCount} · ${products.length} unique accepted identities · contact-sheet triage only</text><text x="28" y="103" font-family="Arial" font-size="13" fill="#8f382b">Any doubtful fit, material, season or image must be reopened at original resolution before it remains approved.</text></svg>`,
  );

  const pagePath = path.join(
    categoryOutput,
    `${requestedCategory}-page-${String(pageNumber).padStart(2, "0")}.jpg`,
  );
  await sharp(background)
    .composite(
      cards.map(({ card }, index) => ({
        input: card,
        left: (index % columns) * cardWidth,
        top: 130 + Math.floor(index / columns) * cardHeight,
      })),
    )
    .jpeg({ quality: 94 })
    .toFile(pagePath);

  pages.push({
    pageNumber,
    pagePath,
    products: pageProducts.map((product, index) => ({
      ...product,
      globalIndex: offset + index + 1,
      imageLoadError: cards[index].imageError,
    })),
  });
}

const indexPath = path.join(categoryOutput, "index.json");
await writeFile(
  indexPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      category: normalizedCategory,
      productCount: products.length,
      distinctIdentities: categoryIdentities.size,
      pages,
      decisionStatus: "contact-sheets-built-awaiting-one-by-one-stylist-review",
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      category: normalizedCategory,
      productCount: products.length,
      pageCount: pages.length,
      imageLoadFailures: pages.reduce(
        (count, page) =>
          count + page.products.filter((product) => product.imageLoadError).length,
        0,
      ),
      indexPath,
      pagePaths: pages.map((page) => page.pagePath),
    },
    null,
    2,
  ),
);
