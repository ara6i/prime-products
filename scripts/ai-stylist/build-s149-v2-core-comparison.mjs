#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const decisions = JSON.parse(
  await readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8"),
);
const reservationLedger = JSON.parse(
  await readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8"),
);
const provisionalLedger = JSON.parse(
  await readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "spring-office-budget-pilot-s149-v2");
const outputPath = path.join(outputDir, "core-comparison.jpg");
const coreOutputPath = path.join(outputDir, "core-front-runner.jpg");
const specPath = path.join(outputDir, "core-comparison.json");

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const reservationByIdentity = new Map(
  reservationLedger.reservations.map((entry) => [String(entry.productKey).toLowerCase(), entry]),
);
const provisionalHoldByIdentity = new Map(
  provisionalLedger.holds.map((entry) => [String(entry.identity).toLowerCase(), entry]),
);

const candidateSpecs = [
  ["top", "T1", "shopify_supplier:c54ee46a1c85427387e9d01b3080f28253683dc3", "Dusty-Pink Button-Up", "reject-for-s149-v2", "The consolidated gallery shows an open overshirt over a separate white tee, with dropped shoulders and a long oversized casual body. It is not a reliable self-contained Spring Office top."],
  ["top", "T2", "shopify_supplier:0312db0cd26acade9f91f474e8b9b19311c3e778", "Warm-Pink Tonal Plaid", "reject-for-s149-v2", "The loud blurred plaid, oversized body and novelty prop styling read casual streetwear rather than a polished office shirt."],
  ["top", "T3", "shopify_supplier:dd0cd78c2ea2a34c4afe10d9b0b15c3117e4d4be", "Coral Band-Collar Shirt", "reject-for-s149-v2", "The high-shine coral fabric, heavy creasing and product-only presentation look less premium and less office-capable than the dusty-pink shirt."],
  ["top", "T4", "shopify_supplier:4b02fa1f08581096e185ad135f7fb00d6d622f3d", "Pea-Green Textured Shirt", "reject-for-s149-v2", "The textured fabric is useful, but the dropped shoulder, long boxy body and flap pocket make this an overshirt rather than the cleaner office layer needed here."],
  ["top", "T5", "shopify_supplier:79749ba3c0481d9992007e844672ced11dda107a", "Light-Apricot Mandarin Shirt", "reject-for-s149-v2", "The clean regular fit is acceptable, but the near-white tonal presentation does not add the purposeful Spring color this second S149 outfit needs."],
  ["top", "T6", "shopify_supplier:a8dcfed0a90edf448875e8a847b23bfe53fe74c1", "Blue Watercolor Shirt", "reject-for-s149-v2", "The large abstract blue blotches dominate the outfit and read vacation-resort rather than modern office."],
  ["top", "T7", "shopify_supplier:2950c7b291a65a0052cf1680b5ad6cc594a5c5f9", "Lake-Blue Shirt", "reject-for-s149-v2", "The bright blue is useful, but the open-shirt-over-tee presentation, small chest motif and basic finish make it feel generic casual rather than refined office."],
  ["bottom", "B1", "shopify_supplier:b4417a8d32930a1455257578c5ba2547279f0c7b", "Medium-Gray Tailored Trouser", "visual-front-runner-awaiting-shoe", "The medium-gray trouser has a clean waist, pressed front and controlled straight leg that balances the relaxed pink shirt without becoming skinny or baggy."],
  ["bottom", "B2", "shopify_supplier:36775b09ed8cf6af570dd58f177804a5200ce70c", "Khaki Regular Trouser", "reject-for-s149-v2", "The warm khaki is office-capable, but its narrower leg and tonal warmth provide less modern contrast with dusty pink than the medium-gray trouser."],
  ["bottom", "B3", "shopify_supplier:f7a81f949ef5378b333161394812d31627fa7265", "Military-Green Trouser", "reject-for-s149-v2", "The wrinkled product-only image gives no reliable full-body fit proof and the utility green finish reads too casual for this office position."],
  ["bottom", "B4", "shopify_supplier:04d7241016fbcf860f5b98ce77b100cd3efa1689", "Camel Relaxed Trouser", "reject-for-s149-v2", "The dropped crotch, broad leg and stacked hem create the baggy casual proportion explicitly excluded from the menswear direction."],
  ["bottom", "B5", "shopify_supplier:2ee1a0fbc1261c590f394c7d2529549fd8a033c9", "Navy Relaxed Trouser", "reject-for-s149-v2", "The very wide navy leg would make the outfit dark and bottom-heavy, repeating the silhouette and palette problems this rebuild is removing."],
].map(([group, key, identity, name, decision, decisionReason]) => ({
  group,
  key,
  identity,
  name,
  decision,
  decisionReason,
}));
const frontRunnerKeys = ["B1"];
const frontRunnerKeySet = new Set(frontRunnerKeys);

const candidates = candidateSpecs.map((spec) => {
  const identity = spec.identity.toLowerCase();
  const accepted = acceptedByIdentity.get(identity);
  if (!accepted) throw new Error(`Missing accepted S149 v2 candidate ${spec.identity}`);
  const reservation = reservationByIdentity.get(identity);
  const hold = provisionalHoldByIdentity.get(identity);
  if (
    frontRunnerKeySet.has(spec.key) &&
    (reservation || (hold && hold.scenarioId !== "S149"))
  ) {
    throw new Error(`S149 v2 candidate is already reserved or provisionally held: ${spec.identity}`);
  }
  if (accepted.selectedVariant?.slot !== spec.group) {
    throw new Error(`Unexpected ${spec.group} slot: ${spec.identity}`);
  }
  return {
    ...spec,
    ...accepted.selectedVariant,
    constraints: accepted.constraints ?? [],
  };
});

async function imageBuffer(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

await mkdir(outputDir, { recursive: true });
const cardWidth = 350;
const cardHeight = 570;
const cardBuffers = [];
for (const candidate of candidates) {
  const original = await imageBuffer(candidate.image);
  await sharp(original, { failOn: "none" })
    .rotate()
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 96 })
    .toFile(path.join(outputDir, `${candidate.key.toLowerCase()}-original.jpg`));
  const productImage = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: cardWidth - 24, height: 350, fit: "contain", background: "#f5f2ea" })
    .flatten({ background: "#f5f2ea" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const svg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${candidate.key}</text><text x="66" y="27" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="66" y="47" font-family="Arial" font-size="10" fill="#666">${escapeXml(candidate.group.toUpperCase())}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(candidate.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(candidate.color)} · $${Number(candidate.price).toFixed(2)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${candidate.decision.startsWith("visual") ? "#355746" : "#a63b2e"}">${escapeXml(candidate.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml(candidate.decisionReason.slice(0, 72))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(candidate.identity.slice(0, 50))}</text></svg>`,
  );
  cardBuffers.push(
    await sharp(svg)
      .composite([{ input: productImage, left: 12, top: 52 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const columns = 5;
const gap = 20;
const boardWidth = gap + columns * (cardWidth + gap);
const boardHeight = 130 + Math.ceil(candidates.length / columns) * (cardHeight + gap);
const header = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S149 · Spring Work / Office · second separates core screen</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">Seven colorful shirts · five office-capable trousers · consolidated-gallery re-audit applied</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">A true office top and oxblood round-toe derby are missing · keep controlled tailoring, not skinny or baggy extremes · not UI integrated</text></svg>`,
);
await sharp(header)
  .composite(
    cardBuffers.map((input, index) => ({
      input,
      left: gap + (index % columns) * (cardWidth + gap),
      top: 120 + Math.floor(index / columns) * (cardHeight + gap),
    })),
  )
  .jpeg({ quality: 94 })
  .toFile(outputPath);

const frontRunnerBuffers = frontRunnerKeys.map(
  (key) => cardBuffers[candidates.findIndex((candidate) => candidate.key === key)],
);
const coreWidth = gap + frontRunnerBuffers.length * (cardWidth + gap);
const coreHeight = 130 + cardHeight + gap;
const coreHeader = Buffer.from(
  `<svg width="${coreWidth}" height="${coreHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">S149 · provisional second Spring Office core</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">medium-gray controlled straight trouser · top and shoe unresolved</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">A true office top and oxblood round-toe derby are missing · one uniqueness hold only · no complete outfit · not UI integrated</text></svg>`,
);
await sharp(coreHeader)
  .composite(
    frontRunnerBuffers.map((input, index) => ({
      input,
      left: gap + index * (cardWidth + gap),
      top: 120,
    })),
  )
  .jpeg({ quality: 94 })
  .toFile(coreOutputPath);

await writeFile(
  specPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      scenarioId: "S149",
      occasion: "Work / Office",
      season: "Spring",
      budget: "Budget-Friendly",
      bank: "separates",
      plannedPosition: 2,
      status: "visual-screen-complete-bottom-front-runner-awaiting-top-and-shoe",
      candidates,
      visualFrontRunnerTopIdentity: null,
      visualFrontRunnerBottomIdentity:
        "shopify_supplier:b4417a8d32930a1455257578c5ba2547279f0c7b",
      missingSlots: ["top", "shoe"],
      queuedTopRole: "dusty-coral fine-knit long-sleeve polo",
      queuedShoeRole: "oxblood round-toe derby",
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify({ outputPath, coreOutputPath, specPath, candidateCount: candidates.length }, null, 2),
);
