#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const drafts = await Promise.all(
  [
    "summer-casual-budget-pilot-v9-partial/agent-styled-draft.json",
    "spring-office-budget-pilot-s149-v1-partial/agent-styled-draft.json",
    "summer-date-budget-pilot-s189-v1-partial/agent-styled-draft.json",
    "fall-date-budget-pilot-s193-v1-partial/agent-styled-draft.json",
    "fall-sports-budget-pilot-s225-v1-partial/agent-styled-draft.json",
  ].map((relativePath) =>
    readFile(path.join(reportRoot, relativePath), "utf8").then(JSON.parse),
  ),
);
const decisions = JSON.parse(
  await readFile("scripts/ai-stylist/approved-outfit-source-audit-decisions.json", "utf8"),
);
const manualManifest = JSON.parse(
  await readFile(path.join(reportRoot, "cj-manual-final-raw-manifest.json"), "utf8"),
);
const shoeReport = JSON.parse(
  await readFile(
    path.join(
      repoRoot,
      "output/reports/cj-mens-shoes-local-20260911-v2/gemini-transparent/final-alpha-report.json",
    ),
    "utf8",
  ),
);
const manualSourceById = new Map(
  manualManifest.entries.map((entry) => [
    String(entry.productId).toLowerCase(),
    path.resolve(repoRoot, entry.sourcePath),
  ]),
);
const shoeSourceById = new Map(
  shoeReport.entries.map((entry) => [
    String(entry.productId).toLowerCase(),
    entry.sourceImageUrl,
  ]),
);
const decisionByKey = new Map(
  decisions.decisions.map((entry) => [
    `${entry.scenarioId}:${Number(entry.position)}`,
    entry,
  ]),
);

const looks = [];
for (const draft of drafts) {
  for (const group of draft.scenarios) {
    for (const outfit of group.outfitSets.separates) {
      const decision = decisionByKey.get(`${group.scenario.id}:${Number(outfit.position)}`);
      if (!decision) throw new Error(`Missing audit decision for ${outfit.outfitId}`);
      looks.push({ scenario: group.scenario, outfit, decision });
    }
  }
}
if (looks.length !== 9) throw new Error(`Expected nine source-audited looks, found ${looks.length}`);

function sourceFor(item) {
  if (/^https?:\/\//.test(item.image)) return item.image;
  const id = String(item.productId).toLowerCase();
  return manualSourceById.get(id) ?? shoeSourceById.get(id) ?? item.image;
}

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

function wrap(value, max = 76) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line || `${line} ${word}`.length <= max) line = line ? `${line} ${word}` : word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

const outputDir = path.join(reportRoot, "approved-outfit-source-audit");
await mkdir(outputDir, { recursive: true });
const cardWidth = 760;
const cardHeight = 670;
const itemWidth = 222;
const itemHeight = 370;
const itemGap = 14;
const gap = 22;
const margin = 28;
const header = 118;
const cols = 3;
const rows = 3;
const width = margin * 2 + cols * cardWidth + (cols - 1) * gap;
const height = header + margin + rows * cardHeight + (rows - 1) * gap + margin;

const cards = await Promise.all(
  looks.map(async ({ scenario, outfit, decision }, index) => {
    const items = await Promise.all(
      outfit.items.map(async (item) => {
        const source = sourceFor(item);
        const product = await sharp(await imageBuffer(source), { failOn: "none" })
          .rotate()
          .resize({ width: itemWidth - 16, height: 276, fit: "contain", background: "#f5f2ea" })
          .flatten({ background: "#f5f2ea" })
          .jpeg({ quality: 92 })
          .toBuffer();
        const label = Buffer.from(
          `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#f5f2ea"/><text x="10" y="303" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="10" y="329" font-family="Arial" font-size="11" fill="#222">${escapeXml(String(item.garmentType).slice(0, 32))}</text><text x="10" y="352" font-family="Arial" font-size="11" fill="#666">${escapeXml(String(item.color).slice(0, 32))}</text></svg>`,
        );
        return sharp(label).composite([{ input: product, left: 8, top: 8 }]).jpeg({ quality: 92 }).toBuffer();
      }),
    );
    const color = decision.decision === "pass" ? "#2f6b4f" : "#a13d2d";
    const reasonLines = wrap(decision.reason)
      .map((line, lineIndex) => `<text x="28" y="${555 + lineIndex * 20}" font-family="Arial" font-size="12" fill="#555">${escapeXml(line)}</text>`)
      .join("");
    const base = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="28" cy="28" r="18" fill="#111"/><text x="28" y="34" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${index + 1}</text><text x="58" y="27" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(`${scenario.id} · ${scenario.occasionLabel} · ${scenario.seasonLabel}`)}</text><text x="58" y="52" font-family="Arial" font-size="13" fill="#666">${escapeXml(outfit.name)}</text><text x="28" y="91" font-family="Arial" font-size="18" font-weight="700" fill="${color}">${decision.decision === "pass" ? "PASS AFTER SOURCE AUDIT" : "REVOKED AFTER SOURCE AUDIT"}</text>${reasonLines}<text x="28" y="646" font-family="Arial" font-size="11" fill="#777">original product images · local review · no UI integration</text></svg>`,
    );
    return sharp(base)
      .composite(items.map((input, itemIndex) => ({ input, left: 28 + itemIndex * (itemWidth + itemGap), top: 132 })))
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const passed = decisions.decisions.filter((entry) => entry.decision === "pass").length;
const revoked = decisions.decisions.length - passed;
const headerSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="44" font-family="Arial" font-size="29" font-weight="700" fill="#111">Men’s outfit source-image re-audit</text><text x="${margin}" y="76" font-family="Arial" font-size="15" fill="#555">9 former approvals checked against original product imagery · ${passed} retained · ${revoked} revoked</text><text x="${margin}" y="101" font-family="Arial" font-size="13" fill="#777">Zara-led taste · season and silhouette truth · Wedding and Wedding Guest excluded · local only</text></svg>`,
);
const outputImagePath = path.join(outputDir, "nine-former-approvals-source-audit.jpg");
await sharp(headerSvg)
  .composite(cards.map((input, index) => ({
    input,
    left: margin + (index % cols) * (cardWidth + gap),
    top: header + margin + Math.floor(index / cols) * (cardHeight + gap),
  })))
  .jpeg({ quality: 92 })
  .toFile(outputImagePath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  formerApprovalsAudited: looks.length,
  retainedApprovals: passed,
  revokedApprovals: revoked,
  uiIntegrated: false,
  decisions: looks.map(({ scenario, outfit, decision }) => ({
    scenarioId: scenario.id,
    position: outfit.position,
    outfitId: outfit.outfitId,
    name: outfit.name,
    decision: decision.decision,
    reason: decision.reason,
    items: outfit.items.map((item) => ({
      slot: item.slot,
      identity: item.styleRagId,
      garmentType: item.garmentType,
      color: item.color,
      sourceImage: sourceFor(item),
    })),
  })),
};
await writeFile(path.join(outputDir, "audit.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ outputImagePath, ...result }, null, 2));
