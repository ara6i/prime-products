#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const outputDir = path.join(reportRoot, "summer-date-premium-pilot-s191");
const outputJsonPath = path.join(outputDir, "local-recheck-20260917.json");
const outputBoardPath = path.join(outputDir, "local-recheck-20260917.jpg");
const shoeImage = path.join(
  repoRoot,
  "output/reports/cj-mens-shoes-local-20260911-v2/gemini-transparent/final-alpha/0010-1755140342032113664.png",
);

const shoe = {
  identity: "cj:1755140342032113664",
  role: "SHOE",
  title: "Two-Tone Suede Summer Loafer",
  color: "tobacco and cream",
  image: shoeImage,
};

const candidates = [
  {
    id: "S191-RECHECK-A",
    name: "Apricot, Pastel Blue and Tobacco",
    decision: "reject",
    reason:
      "Color direction is fresh, but the short is a shiny flat cutout with no worn rise, thigh or hem proof. The three-piece source subtotal is also not verified as Premium retail merchandise.",
    items: [
      {
        identity: "shopify_supplier:5cbc77ca1e59ccf3528bd29d252216688cfbd0d1",
        role: "TOP",
        title: "Apricot Linen-Look Wrap Shirt",
        color: "apricot",
        image:
          "https://cdn.shopify.com/s/files/1/0710/8231/1725/files/79ba3730142140f5b771418d33033347-Max-Origin.webp?v=1786122830",
      },
      {
        identity: "shopify_supplier:6531885c6d54dd5b10a585963227232ae011397c",
        role: "BOTTOM",
        title: "Pastel-Blue Elastic-Side Chino Short",
        color: "pastel blue",
        image:
          "https://cdn.shopify.com/s/files/1/0710/8231/1725/files/847c359c-f7c1-4ba6-8648-598d5c8279d0-Max.webp?v=1786137324",
      },
      shoe,
    ],
  },
  {
    id: "S191-RECHECK-B",
    name: "White Texture, Olive Rib and Tobacco",
    decision: "reject",
    reason:
      "The palette works, but the exposed elastic drawstring and ribbed lounge construction make the trouser Resort-casual rather than Premium Date Night. The loafer cannot rescue the formality mismatch.",
    items: [
      {
        identity: "shopify_supplier:21196d523f8b28c3b43a51b250933949f7a9bc6b",
        role: "TOP",
        title: "White Vertical-Texture Shirt",
        color: "white",
        image:
          "https://cdn.shopify.com/s/files/1/0710/8231/1725/files/7a48de83-5bc8-4340-806e-065a7d303e89-Max-Origin.webp?v=1786162600",
      },
      {
        identity: "shopify_supplier:016b87eb18f5b657fbd748be0e0957a9a1fba10c",
        role: "BOTTOM",
        title: "Army-Green Ribbed Drawstring Trouser",
        color: "army green",
        image:
          "https://cdn.shopify.com/s/files/1/0710/8231/1725/files/ce50d67af0c447f08bea9b81375fc3e5-Max-Origin.webp?v=1786255876",
      },
      shoe,
    ],
  },
  {
    id: "S191-RECHECK-C",
    name: "Pink Stripe, Cool Taupe and Tobacco",
    decision: "reject",
    reason:
      "The color is cheerful, but the synthetic high-contrast shirt and two-tone statement loafer compete. The result reads fast-fashion holiday styling, not the quieter Zara-led Premium Date finish required here.",
    items: [
      {
        identity: "shopify_supplier:abeb4a16f454bfc5ace81c839afd751a13e6092e",
        role: "TOP",
        title: "Pink-and-White Stripe Shirt",
        color: "pink and white",
        image:
          "https://cdn.shopify.com/s/files/1/0710/8231/1725/files/5cbcc7d5246047cb9774be4827c26f0a-Max-Origin.webp?v=1786291528",
      },
      {
        identity: "shopify_supplier:8575f1ab5835288d4a116a8960cc6f1944d3f859",
        role: "BOTTOM",
        title: "Cool-Taupe Tailored Bermuda Short",
        color: "cool taupe",
        image:
          "https://cdn.shopify.com/s/files/1/0710/8231/1725/files/df0034f3a9704860863ed3bca78cf3ec-Max-Origin.webp?v=1786169016",
      },
      shoe,
    ],
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value, maxLength) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function imageBuffer(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Image request failed ${response.status}: ${source}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(source);
}

const boardWidth = 1680;
const boardHeight = 1480;
const cardWidth = 520;
const cardHeight = 1260;
const imageHeight = 240;
const cardBuffers = await Promise.all(
  candidates.map(async (candidate) => {
    const itemBuffers = await Promise.all(
      candidate.items.map(async (item) =>
        sharp(await imageBuffer(item.image), { failOn: "none" })
          .rotate()
          .resize({
            width: cardWidth - 36,
            height: imageHeight,
            fit: "contain",
            background: "#f7f4ed",
          })
          .flatten({ background: "#f7f4ed" })
          .jpeg({ quality: 94 })
          .toBuffer(),
      ),
    );
    const reasonLines = wrapText(candidate.reason, 61).slice(0, 5);
    const labels = candidate.items
      .map(
        (item, index) =>
          `<text x="24" y="${120 + index * 310}" font-family="Arial" font-size="15" font-weight="700" fill="#24211d">${escapeXml(item.role)} · ${escapeXml(item.title)}</text><text x="24" y="${143 + index * 310}" font-family="Arial" font-size="13" fill="#6f685f">${escapeXml(item.color)} · ${escapeXml(item.identity.slice(0, 42))}</text>`,
      )
      .join("");
    const reasonSvg = reasonLines
      .map(
        (line, index) =>
          `<text x="24" y="${1089 + index * 24}" font-family="Arial" font-size="14" fill="#4e4740">${escapeXml(line)}</text>`,
      )
      .join("");
    const cardSvg = Buffer.from(
      `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="20" fill="#f7f4ed"/><rect x="0" y="0" width="100%" height="72" rx="20" fill="#fffaf2"/><text x="24" y="31" font-family="Arial" font-size="15" font-weight="700" fill="#a43b2c">${escapeXml(candidate.id)} · REJECT</text><text x="24" y="56" font-family="Arial" font-size="19" font-weight="700" fill="#1e1b18">${escapeXml(candidate.name)}</text>${labels}<line x1="24" x2="496" y1="1045" y2="1045" stroke="#d6cec2" stroke-width="2"/><text x="24" y="1071" font-family="Arial" font-size="15" font-weight="700" fill="#a43b2c">STYLIST VERDICT</text>${reasonSvg}<text x="24" y="1229" font-family="Arial" font-size="12" fill="#756d64">No identity reserved · no outfit approved · not UI integrated</text></svg>`,
    );
    return sharp(cardSvg)
      .composite(
        itemBuffers.map((input, index) => ({
          input,
          left: 18,
          top: 160 + index * 310,
        })),
      )
      .jpeg({ quality: 94 })
      .toBuffer();
  }),
);

const headerSvg = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9e4dc"/><text x="40" y="47" font-family="Arial" font-size="29" font-weight="700" fill="#171513">S191 · Men’s Summer Date Night · Premium</text><text x="40" y="80" font-family="Arial" font-size="17" font-weight="700" fill="#a43b2c">Local colorful combination recheck · all three rejected</text><text x="40" y="108" font-family="Arial" font-size="14" fill="#5e574f">Full-resolution source review · Zara-led Premium bar · global identity uniqueness preserved · Wedding excluded</text><text x="40" y="1444" font-family="Arial" font-size="13" fill="#5e574f">Required replacement remains: romantic Premium top + controlled linen-wool trouser + this shoe or a better exact-page shoe + compact leather bag + thin-case watch.</text></svg>`,
);

await mkdir(outputDir, { recursive: true });
await sharp(headerSvg)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: 40 + index * 550,
      top: 145,
    })),
  )
  .jpeg({ quality: 94 })
  .toFile(outputBoardPath);

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scenario: {
    id: "S191",
    gender: "male",
    occasion: "Date Night",
    season: "Summer",
    budget: "Premium",
  },
  status: "three-colorful-local-combinations-visually-rejected",
  candidates,
  conclusion: {
    approvedCore: false,
    approvedProductsReserved: 0,
    productIdentityCollision: false,
    cjSearchQuery: "men coral knit polo short sleeve",
    cjSearchResult: "blocked-by-sign-in-before-results",
    missingSlots: ["top", "bottom", "shoe", "bag", "watch"],
    uiIntegrated: false,
  },
  boardPath: outputBoardPath,
};

await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      outputJsonPath,
      outputBoardPath,
      candidateCount: candidates.length,
      approvedCore: false,
      approvedProductsReserved: 0,
      productIdentityCollision: false,
      cjSearchResult: result.conclusion.cjSearchResult,
      uiIntegrated: false,
    },
    null,
    2,
  ),
);
