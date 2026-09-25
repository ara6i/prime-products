#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const manifestPath = process.argv[2];
const outputPath = process.argv[3];
if (!manifestPath || !outputPath) {
  throw new Error(
    "Usage: node render-image-bundle-contact-sheet.mjs <bundle-manifest.json> <output.jpg>",
  );
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const assets = manifest.assets || [];
const columns = 5;
const tileWidth = 300;
const tileHeight = 360;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const tiles = await Promise.all(
  assets.map(async (asset, index) => {
    const image = await sharp(asset.path, { failOn: "none" })
      .rotate()
      .resize({
        width: tileWidth - 16,
        height: tileHeight - 52,
        fit: "contain",
        background: "#f7f6f2",
      })
      .flatten({ background: "#f7f6f2" })
      .jpeg({ quality: 90 })
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="10" y="330" font-family="Arial" font-size="14" font-weight="700" fill="#111111">${index + 1}. ${escapeXml(asset.name.slice(0, 18))}</text><text x="10" y="350" font-family="Arial" font-size="11" fill="#666666">${escapeXml(asset.id)}</text></svg>`,
    );
    return sharp(label)
      .composite([{ input: image, left: 8, top: 8 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const rows = Math.ceil(tiles.length / columns);
await sharp({
  create: {
    width: columns * tileWidth,
    height: rows * tileHeight,
    channels: 3,
    background: "#e9e6df",
  },
})
  .composite(
    tiles.map((input, index) => ({
      input,
      left: (index % columns) * tileWidth,
      top: Math.floor(index / columns) * tileHeight,
    })),
  )
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
  .toFile(outputPath);

await writeFile(
  `${outputPath}.json`,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceManifest: path.resolve(manifestPath),
      outputPath: path.resolve(outputPath),
      count: assets.length,
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify({ outputPath, count: assets.length }, null, 2));
