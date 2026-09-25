#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const inputs = [
  "summer-casual-budget-pilot-v9-partial/agent-styled-draft.json",
  "s137-recomposed-candidates/agent-styled-draft.json",
  "spring-office-budget-pilot-s149-v1-partial/agent-styled-draft.json",
  "summer-date-budget-pilot-s189-v1-partial/agent-styled-draft.json",
  "fall-date-budget-pilot-s193-v1-partial/agent-styled-draft.json",
  "s193-recomposed-candidates/agent-styled-draft.json",
  "fall-sports-budget-pilot-s225-v1-partial/agent-styled-draft.json",
];
const outputDir = path.join(reportRoot, "approved-mens-outfit-gallery");
const outputImagePath = path.join(outputDir, "approved-outfits.jpg");
const outputJsonPath = path.join(outputDir, "approved-outfits.json");
const decisions = JSON.parse(
  await readFile(
    path.join(reportRoot, "visual-identity-decisions.json"),
    "utf8",
  ),
);
const decisionStatusByIdentity = new Map(
  decisions.entries.map((entry) => [
    String(entry.identity).toLowerCase(),
    entry.status,
  ]),
);
const s133UiCompleteCandidate = JSON.parse(
  await readFile(
    path.join(
      reportRoot,
      "spring-casual-budget-core-s133-02/six-piece-complete-candidate.json",
    ),
    "utf8",
  ),
);
const s225UiCompleteCandidate = JSON.parse(
  await readFile(
    path.join(
      reportRoot,
      "fall-sports-budget-s225-complete-candidate/six-piece-candidate.json",
    ),
    "utf8",
  ),
);

const drafts = await Promise.all(
  inputs.map(async (relativePath) =>
    JSON.parse(await readFile(path.join(reportRoot, relativePath), "utf8")),
  ),
);
const looks = [];
for (const draft of drafts) {
  const qaByPosition = new Map(
    draft.visualQa.map((entry) => [Number(entry.position), entry]),
  );
  for (const scenarioGroup of draft.scenarios) {
    const scenario = scenarioGroup.scenario;
    for (const outfit of scenarioGroup.outfitSets.separates) {
      if (qaByPosition.get(Number(outfit.position))?.decision !== "pass")
        continue;
      looks.push({
        scenarioId: scenario.id,
        occasion: scenario.occasionLabel,
        season: scenario.seasonLabel,
        budget: scenario.budgetLabel,
        ...outfit,
      });
    }
  }
}
if (
  s133UiCompleteCandidate.decision !== "approve-ui-complete-six-piece-outfit" ||
  s133UiCompleteCandidate.items?.length !== 6
) {
  throw new Error("S133 complete candidate is not visually approved");
}
if (
  s225UiCompleteCandidate.decision !== "approve-ui-complete-six-piece-outfit" ||
  s225UiCompleteCandidate.items?.length !== 6 ||
  s225UiCompleteCandidate.globalIdentityCount !== 6
) {
  throw new Error("S225 complete candidate is not visually approved");
}
looks.push({
  scenarioId: "S133",
  occasion: "Casual Everyday",
  season: "Spring",
  budget: "Budget-Friendly",
  position: 1,
  outfitId: s133UiCompleteCandidate.outfitId,
  name: s133UiCompleteCandidate.name,
  rationale:
    "Cream texture and French blue form a light modern base; the sand sneaker keeps the three-piece core quiet and Spring-correct.",
  totalPrice: s133UiCompleteCandidate.items
    .filter((item) => ["top", "bottom", "shoe"].includes(item.slot))
    .reduce((sum, item) => sum + Number(item.price), 0),
  items: s133UiCompleteCandidate.items.filter((item) =>
    ["top", "bottom", "shoe"].includes(item.slot),
  ),
});
looks.sort(
  (left, right) =>
    left.scenarioId.localeCompare(right.scenarioId, undefined, { numeric: true }) ||
    Number(left.position) - Number(right.position),
);

const identities = looks.flatMap((look) =>
  look.items.map((item) => String(item.styleRagId).toLowerCase()),
);
if (looks.length !== 6)
  throw new Error(
    `Expected 6 approved cores after the S133 promotion, found ${looks.length}`,
  );
if (identities.length !== 18 || new Set(identities).size !== 18) {
  throw new Error("Approved gallery contains a repeated product identity");
}
for (const identity of identities) {
  const status = decisionStatusByIdentity.get(identity);
  if (status && status !== "accept") {
    throw new Error(
      `Gallery contains non-accepted identity ${identity}: ${status}`,
    );
  }
}

async function imageBuffer(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok)
      throw new Error(`Image request failed ${response.status}: ${source}`);
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

function truncate(value, max) {
  const text = String(value);
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

const cardWidth = 760;
const cardHeight = 560;
const cardGap = 22;
const outerMargin = 28;
const headerHeight = 120;
const columns = 3;
const rows = 2;
const width = outerMargin * 2 + columns * cardWidth + (columns - 1) * cardGap;
const height =
  headerHeight + outerMargin + rows * cardHeight + (rows - 1) * cardGap + 44;

const cardBuffers = await Promise.all(
  looks.map(async (look, lookIndex) => {
    const itemWidth = 226;
    const itemHeight = 365;
    const itemGap = 14;
    const itemBuffers = await Promise.all(
      look.items.map(async (item) => {
        const productImage = await sharp(await imageBuffer(item.image), {
          failOn: "none",
        })
          .rotate()
          .resize({
            width: itemWidth - 16,
            height: 265,
            fit: "contain",
            background: "#f5f2ea",
          })
          .flatten({ background: "#f5f2ea" })
          .jpeg({ quality: 91 })
          .toBuffer();
        const itemSvg = Buffer.from(
          `<svg width="${itemWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="13" fill="#f5f2ea"/><text x="10" y="292" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(item.slot.toUpperCase())}</text><text x="10" y="320" font-family="Arial" font-size="12" fill="#222">${escapeXml(truncate(item.garmentType, 30))}</text><text x="10" y="345" font-family="Arial" font-size="12" fill="#666">${escapeXml(truncate(item.color, 30))}</text></svg>`,
        );
        return sharp(itemSvg)
          .composite([{ input: productImage, left: 8, top: 8 }])
          .jpeg({ quality: 91 })
          .toBuffer();
      }),
    );
    const accent = look.scenarioId === "S225" ? "#1678b7" : "#618d59";
    const hasSixPieceApproval = ["S133", "S149", "S225"].includes(look.scenarioId);
    const cardSvg = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#ffffff"/><circle cx="28" cy="28" r="18" fill="#111"/><text x="28" y="34" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${lookIndex + 1}</text><text x="58" y="27" font-family="Arial" font-size="16" font-weight="700" fill="#111">${escapeXml(`${look.scenarioId} · ${look.occasion} · ${look.season}`)}</text><text x="58" y="51" font-family="Arial" font-size="13" fill="#666">${escapeXml(look.budget)} · $${Number(look.totalPrice).toFixed(2)}</text><text x="28" y="86" font-family="Arial" font-size="18" font-weight="700" fill="${accent}">${escapeXml(truncate(look.name, 62))}</text><text x="28" y="535" font-family="Arial" font-size="12" fill="#666">three-piece core approved · 3 unique identities${hasSixPieceApproval ? " · separate six-piece approval exists" : " · add-ons still required"}</text></svg>`,
    );
    return sharp(cardSvg)
      .composite(
        itemBuffers.map((input, itemIndex) => ({
          input,
          left: 28 + itemIndex * (itemWidth + itemGap),
          top: 116,
        })),
      )
      .jpeg({ quality: 92 })
      .toBuffer();
  }),
);

const baseSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="${outerMargin}" y="46" font-family="Arial" font-size="30" font-weight="700" fill="#111">Men’s AI Stylist · 6 visually approved top-bottom-shoe cores</text><text x="${outerMargin}" y="79" font-family="Arial" font-size="15" fill="#555">1 Spring Casual · 2 Summer Casual · 1 Spring Office · 1 Fall Date · 1 Fall Trail · 18 unique identities · zero reuse</text><text x="${outerMargin}" y="104" font-family="Arial" font-size="13" fill="#777">S133, S149 and S225 have separate six-piece approvals · three cores still need add-ons · local · Wedding excluded</text></svg>`,
);

await mkdir(outputDir, { recursive: true });
await sharp(baseSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: outerMargin + (index % columns) * (cardWidth + cardGap),
      top:
        headerHeight +
        outerMargin +
        Math.floor(index / columns) * (cardHeight + cardGap),
    })),
  )
  .jpeg({ quality: 92 })
  .toFile(outputImagePath);

await writeFile(
  outputJsonPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      approvedThreePieceCores: looks.length,
      approvedCorePlacements: identities.length,
      uiCompleteOutfits: 3,
      uniqueProductIdentities: new Set(identities).size,
      repeatedProductIdentities: identities.length - new Set(identities).size,
      uiIntegrated: false,
      looks,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      outputImagePath,
      outputJsonPath,
      approvedThreePieceCores: looks.length,
      uiCompleteOutfits: 3,
      uniqueProductIdentities: new Set(identities).size,
    },
    null,
    2,
  ),
);
