#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const decisionsPath = process.argv[2]
  ? path.resolve(repoRoot, process.argv[2])
  : path.join(repoRoot, "scripts/ai-stylist/remaining-provisional-source-audit-decisions.json");
const audit = JSON.parse(await readFile(decisionsPath, "utf8"));
const outputDir = path.join(reportRoot, audit.outputSlug ?? "remaining-provisional-source-audit");
const minimumWidth = audit.minimumWidth ?? 1200;
const minimumHeight = audit.minimumHeight ?? 1600;

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapWords(value, maxCharacters = 58, maxLines = 5) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharacters) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, maxCharacters - 1))}…`;
  }
  return lines;
}

async function sourceBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(outputDir, { recursive: true });
const cardWidth = 440;
const cardHeight = 770;
const imageWidth = 408;
const imageHeight = 520;
const gap = 20;
const columns = 3;
const headerHeight = 105;
const boardWidth = gap + columns * (cardWidth + gap);
const rows = Math.ceil(audit.entries.length / columns);
const boardHeight = headerHeight + gap + rows * (cardHeight + gap);
const composites = [];
const auditedEntries = [];

for (let index = 0; index < audit.entries.length; index += 1) {
  const entry = audit.entries[index];
  const source = await sourceBuffer(entry.sourceImage);
  const metadata = await sharp(source, { failOn: "none" }).metadata();
  if ((metadata.width ?? 0) < minimumWidth || (metadata.height ?? 0) < minimumHeight) {
    throw new Error(`Source below expected full resolution: ${entry.identity}`);
  }
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  auditedEntries.push({ ...entry, sourceResolution: `${sourceWidth}x${sourceHeight}` });
  const productImage = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: imageWidth, height: imageHeight, fit: "contain", background: "#f3f1eb" })
    .flatten({ background: "#f3f1eb" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const verdictColor = entry.verdict.startsWith("revoke") || entry.verdict.startsWith("reject")
    ? "#9f2f23"
    : entry.verdict === "pass"
      ? "#245b3b"
      : "#8b5a13";
  const reasonLines = wrapWords(entry.reason);
  const reasonText = reasonLines
    .map(
      (line, lineIndex) =>
        `<tspan x="16" dy="${lineIndex === 0 ? 0 : 18}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const cardSvg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="32" cy="30" r="21" fill="#111"/><text x="32" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${escapeXml(entry.scenarioId)}</text><text x="64" y="27" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(entry.label.slice(0, 45))}</text><text x="64" y="48" font-family="Arial" font-size="9" fill="#777">FULL SOURCE · ${sourceWidth}×${sourceHeight}</text><text x="16" y="606" font-family="Arial" font-size="12" font-weight="700" fill="${verdictColor}">${escapeXml(entry.verdict.toUpperCase().replaceAll("-", " "))}</text><text x="16" y="635" font-family="Arial" font-size="11" fill="#444">${reasonText}</text><text x="16" y="752" font-family="Arial" font-size="8" fill="#999">${escapeXml(entry.identity)}</text></svg>`,
  );
  const card = await sharp(cardSvg)
    .composite([{ input: productImage, left: 16, top: 66 }])
    .jpeg({ quality: 95 })
    .toBuffer();
  const column = index % columns;
  const row = Math.floor(index / columns);
  composites.push({
    input: card,
    left: gap + column * (cardWidth + gap),
    top: headerHeight + gap + row * (cardHeight + gap),
  });
}

const base = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e8e6df"/><text x="20" y="38" font-family="Arial" font-size="25" font-weight="700" fill="#111">${escapeXml(audit.boardTitle ?? "Provisional products · full-source correction audit")}</text><text x="20" y="68" font-family="Arial" font-size="13" fill="#555">Manual full-source visual judgment · minimum ${minimumWidth}×${minimumHeight} · Zara-led proportion, finishing, occasion and season checks · local only</text><text x="20" y="91" font-family="Arial" font-size="11" fill="#8a3d1d">${escapeXml(audit.boardNote ?? "No outfit approval or UI integration")}</text></svg>`,
);
const boardPath = path.join(outputDir, audit.boardFilename ?? "provisional-source-audit.jpg");
await sharp(base).composite(composites).jpeg({ quality: 95 }).toFile(boardPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  sourceResolutionGate: `Every source is at least ${minimumWidth}x${minimumHeight}; each actual source dimension is recorded per entry.`,
  summary: {
    reviewed: audit.entries.length,
    pass: audit.entries.filter((entry) => entry.verdict === "pass").length,
    passWithConstraintOrCorrection: audit.entries.filter((entry) =>
      entry.verdict.startsWith("pass-with-"),
    ).length,
    revokedFromScenario: audit.entries.filter((entry) => entry.verdict.startsWith("revoke"))
      .length,
    productsRejectedFromCatalog: audit.entries.filter((entry) =>
      entry.verdict.startsWith("reject-from-catalog"),
    ).length,
    outfitsApproved: 0,
    uiIntegrated: false,
  },
  entries: auditedEntries,
  boardPath: path.relative(repoRoot, boardPath),
};
await writeFile(path.join(outputDir, "audit.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ boardPath, ...result.summary }, null, 2));
