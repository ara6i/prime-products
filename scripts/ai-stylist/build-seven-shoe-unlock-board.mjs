#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "shoe-only-unlock-board");
const outputImagePath = path.join(outputDir, "two-shoe-only-unlocks.jpg");
const outputJsonPath = path.join(outputDir, "two-shoe-only-unlocks.json");

const gallery = JSON.parse(
  await readFile(path.join(reportRoot, "provisional-scenario-core-gallery/gallery.json"), "utf8"),
);
const scenarioIds = ["S217", "S221"];
const verdicts = {
  S217: "Burnt coral, olive and off-white need a light-gray low-profile trainer; reject neon branding and oversized foam soles.",
  S221: "Light blue and mint need a warm-gray breathable trainer with restrained gum detail; avoid black or fluorescent contrast.",
};

const byId = new Map(gallery.scenarios.map((scenario) => [scenario.scenarioId, scenario]));
const scenarios = scenarioIds.map((scenarioId) => {
  const scenario = byId.get(scenarioId);
  if (!scenario) throw new Error(`Missing provisional core ${scenarioId}`);
  const shoeRole = scenario.exactQueueRoles.find((role) => role.category === "shoe");
  if (!shoeRole) throw new Error(`Missing exact shoe role for ${scenarioId}`);
  if (scenario.items.some((item) => item.slot === "shoe")) {
    throw new Error(`${scenarioId} already contains a shoe`);
  }
  return { ...scenario, shoeRole, stylistVerdict: verdicts[scenarioId] };
});

const identities = scenarios.flatMap((scenario) => scenario.items.map((item) => item.identity.toLowerCase()));
if (new Set(identities).size !== identities.length) {
  throw new Error("Shoe-only unlock board contains a repeated held identity");
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, maximum) {
  const text = String(value ?? "");
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function wrapLines(value, maximum, maximumLines) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maximum) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maximumLines - 1) break;
  }
  if (current && lines.length < maximumLines) lines.push(current);
  if (words.join(" ").length > lines.join(" ").length && lines.length) {
    lines[lines.length - 1] = truncate(lines[lines.length - 1], maximum - 1);
  }
  return lines;
}

async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

const cardWidth = 1140;
const cardHeight = 500;
const columnGap = 22;
const rowGap = 22;
const margin = 28;
const headerHeight = 138;
const columns = 2;
const rows = Math.ceil(scenarios.length / columns);
const width = margin * 2 + columns * cardWidth + columnGap;
const height = headerHeight + margin + rows * cardHeight + (rows - 1) * rowGap + margin;

async function renderItem(item) {
  const itemWidth = 205;
  const itemHeight = 330;
  const image = await sharp(await imageBuffer(item.image), { failOn: "none" })
    .rotate()
    .resize({ width: 185, height: 230, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 93 })
    .toBuffer();
  const state = item.state === "refined-planning-reservation" ? "REFINED RESERVATION" : "PROVISIONAL HOLD";
  const svg = Buffer.from(
    `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#f5f2ea"/><text x="10" y="260" font-family="Arial" font-size="12" font-weight="700" fill="#111">${escapeXml(`${item.slot.toUpperCase()} · ${truncate(item.garmentType, 22)}`)}</text><text x="10" y="284" font-family="Arial" font-size="11" fill="#555">${escapeXml(truncate(item.color, 24))}</text><text x="10" y="310" font-family="Arial" font-size="9" font-weight="700" fill="${item.state === "refined-planning-reservation" ? "#7a4c16" : "#315844"}">${state}</text></svg>`,
  );
  return sharp(svg).composite([{ input: image, left: 10, top: 10 }]).jpeg({ quality: 93 }).toBuffer();
}

async function renderCard(scenario, index) {
  const itemBuffers = await Promise.all(scenario.items.map(renderItem));
  const shoeBoxWidth = 330;
  const verdictText = wrapLines(scenario.stylistVerdict, 43, 5)
    .map(
      (line, lineIndex) =>
        `<text x="18" y="${232 + lineIndex * 18}" font-family="Arial" font-size="12" fill="#333">${escapeXml(line)}</text>`,
    )
    .join("");
  const shoeBox = Buffer.from(
    `<svg width="${shoeBoxWidth}" height="330" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="13" fill="#f8ebe6" stroke="#b85a3a" stroke-width="2" stroke-dasharray="8 7"/><text x="18" y="38" font-family="Arial" font-size="12" font-weight="700" fill="#9a3f1d">SHOE NOT SOURCED</text><text x="18" y="82" font-family="Arial" font-size="17" font-weight="700" fill="#111">${escapeXml(truncate(scenario.shoeRole.targetProduct, 34))}</text><text x="18" y="123" font-family="Arial" font-size="11" fill="#555">Exact CJ search</text><text x="18" y="149" font-family="Arial" font-size="12" fill="#333">${escapeXml(truncate(scenario.shoeRole.searchPhrase, 43))}</text><text x="18" y="199" font-family="Arial" font-size="11" font-weight="700" fill="#355746">STYLIST VERDICT</text>${verdictText}<text x="18" y="316" font-family="Arial" font-size="10" fill="#9a3f1d">Needs exact page + image QA before approval</text></svg>`,
  );
  const base = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#fff"/><circle cx="31" cy="30" r="19" fill="#111"/><text x="31" y="36" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${index + 1}</text><text x="62" y="29" font-family="Arial" font-size="19" font-weight="700" fill="#111">${escapeXml(`${scenario.scenarioId} · ${scenario.occasion}`)}</text><text x="62" y="54" font-family="Arial" font-size="13" fill="#666">${escapeXml(`${scenario.season} · ${scenario.budget} · ${scenario.items.length} unique held pieces`)}</text><text x="28" y="470" font-family="Arial" font-size="11" fill="#8a3d1d">INCOMPLETE · shoe target is a direction, not a product · zero new approval · not UI integrated</text></svg>`,
  );
  return sharp(base)
    .composite([
      ...itemBuffers.map((input, itemIndex) => ({ input, left: 28 + itemIndex * 220, top: 90 })),
      { input: shoeBox, left: 50 + itemBuffers.length * 220, top: 90 },
    ])
    .jpeg({ quality: 93 })
    .toBuffer();
}

const cardBuffers = await Promise.all(scenarios.map(renderCard));
const base = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${margin}" y="48" font-family="Arial" font-size="31" font-weight="700" fill="#111">Two complete garment cores blocked only by one unique shoe</text><text x="${margin}" y="82" font-family="Arial" font-size="15" fill="#555">Each held garment is globally unique and visually reviewed; every shoe target must become a different CJ product identity.</text><text x="${margin}" y="111" font-family="Arial" font-size="13" fill="#8a3d1d">S197, S249 and S253 now also require replacement bottoms · no search API · Wedding and Wedding Guest excluded</text></svg>`,
);

await mkdir(outputDir, { recursive: true });
await sharp(base)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: margin + (index % columns) * (cardWidth + columnGap),
      top: headerHeight + margin + Math.floor(index / columns) * (cardHeight + rowGap),
    })),
  )
  .jpeg({ quality: 93 })
  .toFile(outputImagePath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenarioCores: scenarios.length,
  existingUniqueHeldProductIdentities: new Set(identities).size,
  uniqueShoesRequired: scenarios.length,
  selectedShoeProductIdentities: 0,
  completeOutfitsApproved: 0,
  weddingAndWeddingGuestExcluded: true,
  uiIntegrated: false,
  scenarios,
};
await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      outputImagePath,
      outputJsonPath,
      scenarioCores: result.scenarioCores,
      existingUniqueHeldProductIdentities: result.existingUniqueHeldProductIdentities,
      uniqueShoesRequired: result.uniqueShoesRequired,
      selectedShoeProductIdentities: result.selectedShoeProductIdentities,
      completeOutfitsApproved: result.completeOutfitsApproved,
    },
    null,
    2,
  ),
);
