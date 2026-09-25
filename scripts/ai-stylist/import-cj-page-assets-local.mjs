#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || value === undefined) {
    throw new Error(`Invalid argument near ${key ?? "end of command"}`);
  }
  args.set(key.slice(2), value);
}

const required = [
  "product-id",
  "queue-id",
  "scenario-id",
  "page-url",
  "selected-sku",
  "selected-color",
  "title",
  "category",
  "garment-type",
  "bundle-manifest",
];
for (const key of required) {
  if (!args.get(key)) throw new Error(`Missing --${key}`);
}

const productId = args.get("product-id");
const round = args.get("round") ?? "cj-manual-round3";
if (!/^cj-manual-round[0-9]+$/.test(round)) {
  throw new Error(`Invalid --round ${round}`);
}
const reportRoot = path.join(
  process.cwd(),
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const productRoot = path.join(reportRoot, round, productId);
const sourceRoot = path.join(productRoot, "source");
const productPath = path.join(productRoot, "product.json");
const manifestPath = args.get("bundle-manifest");
const bundle = JSON.parse(await readFile(manifestPath, "utf8"));

if (!Array.isArray(bundle.assets) || bundle.assets.length === 0) {
  throw new Error(`No bundled assets in ${manifestPath}`);
}

await mkdir(sourceRoot, { recursive: true });

let imported = [];
try {
  const existingProduct = JSON.parse(await readFile(productPath, "utf8"));
  if (Array.isArray(existingProduct.sourceAssets)) {
    imported = existingProduct.sourceAssets;
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const extensionFor = (contentType, sourcePath) => {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const extension = path.extname(sourcePath).slice(1).toLowerCase();
  return extension || "img";
};

for (const asset of bundle.assets) {
  if (imported.some((entry) => entry.sourceUrl === asset.url)) continue;
  const bytes = await readFile(asset.path);
  const metadata = await sharp(bytes, { failOn: "none" }).metadata();
  const extension = extensionFor(asset.contentType, asset.path);
  const index = imported.length + 1;
  const fileName = `${String(index).padStart(2, "0")}-${asset.id}.${extension}`;
  const outputPath = path.join(sourceRoot, fileName);
  await copyFile(asset.path, outputPath);
  imported.push({
    index,
    assetId: asset.id,
    sourceName: asset.name,
    sourceUrl: asset.url,
    contentType: asset.contentType,
    localPath: outputPath,
    fileName,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const tileWidth = 330;
const tileHeight = 470;
const columns = Math.min(4, imported.length);
const rows = Math.ceil(imported.length / columns);
const headerHeight = 108;
const sheetWidth = columns * tileWidth;
const sheetHeight = headerHeight + rows * tileHeight;

const tiles = await Promise.all(
  imported.map(async (asset) => {
    const image = await sharp(asset.localPath, { failOn: "none" })
      .rotate()
      .resize({
        width: tileWidth - 24,
        height: 370,
        fit: "contain",
        background: "#f7f5ef",
      })
      .flatten({ background: "#f7f5ef" })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f7f5ef"/><rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#d8d3c8"/><circle cx="27" cy="27" r="18" fill="#161512"/><text x="27" y="33" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#fff">${asset.index}</text><text x="14" y="411" font-family="Arial" font-size="13" font-weight="700" fill="#1d1c19">${escapeXml(asset.width)} × ${escapeXml(asset.height)}</text><text x="14" y="434" font-family="Arial" font-size="11" fill="#625e55">${escapeXml(asset.sourceName.slice(0, 44))}</text><text x="14" y="455" font-family="Arial" font-size="10" fill="#8b857a">${escapeXml(asset.sha256.slice(0, 20))}</text></svg>`,
    );
    return sharp(label).composite([{ input: image, left: 12, top: 50 }]).png().toBuffer();
  }),
);

const header = Buffer.from(
  `<svg width="${sheetWidth}" height="${sheetHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ece8df"/><text x="24" y="37" font-family="Arial" font-size="24" font-weight="700" fill="#171612">${escapeXml(args.get("scenario-id"))} · ${escapeXml(args.get("title"))}</text><text x="24" y="67" font-family="Arial" font-size="15" fill="#4d684f">${escapeXml(args.get("selected-color"))} · ${escapeXml(args.get("garment-type"))}</text><text x="24" y="91" font-family="Arial" font-size="12" fill="#69645b">Exact CJ page asset import · local only · source QA before refinement</text></svg>`,
);
const sheetPath = path.join(productRoot, "source-contact-sheet.jpg");
await sharp(header)
  .composite(
    tiles.map((input, index) => ({
      input,
      left: (index % columns) * tileWidth,
      top: headerHeight + Math.floor(index / columns) * tileHeight,
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(sheetPath);

const product = {
  importedAt: new Date().toISOString(),
  localOnly: true,
  method:
    "Exact logged-in CJ product page inspected manually in the Codex browser; product image assets bundled from the rendered page without using the CJ search API.",
  status: "source-imported-local-awaiting-image-selection-and-refinement",
  queueId: args.get("queue-id"),
  scenarioId: args.get("scenario-id"),
  productId,
  identity: `cj:${productId}`,
  title: args.get("title"),
  category: args.get("category"),
  garmentType: args.get("garment-type"),
  selectedSku: args.get("selected-sku"),
  selectedColor: args.get("selected-color"),
  cjPageUrl: args.get("page-url"),
  sourceAssetCount: imported.length,
  sourceContactSheet: sheetPath,
  gates: {
    exactCjPageReviewed: true,
    sourceImagesImportedLocally: true,
    bestRefinementInputSelected: false,
    refinementAuthorized: false,
    refinementComplete: false,
    backgroundRemovalComplete: false,
    finalOutfitApproved: false,
    reserved: false,
    uiIntegrated: false,
  },
  sourceAssets: imported,
};

await writeFile(productPath, `${JSON.stringify(product, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      productId,
      sourceAssetCount: imported.length,
      productPath,
      sheetPath,
      status: product.status,
    },
    null,
    2,
  ),
);
