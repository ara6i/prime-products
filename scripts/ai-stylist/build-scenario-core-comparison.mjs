#!/usr/bin/env node

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const manifestPath = process.argv[2];
if (!manifestPath) {
  throw new Error("Usage: node build-scenario-core-comparison.mjs <manifest.json>");
}

const manifest = JSON.parse(await readFile(path.resolve(repoRoot, manifestPath), "utf8"));

async function resolveCandidateSpecs(currentManifest, seenPaths = []) {
  let specs;
  if (currentManifest.candidateSourceManifest || currentManifest.candidateSourceSpec) {
    if (currentManifest.candidates) {
      throw new Error("Use candidates, candidateSourceManifest, or candidateSourceSpec, not more than one");
    }
    if (currentManifest.candidateSourceManifest && currentManifest.candidateSourceSpec) {
      throw new Error("Use candidateSourceManifest or candidateSourceSpec, not both");
    }
    if (currentManifest.candidateSourceManifest) {
      const resolvedSourcePath = path.resolve(repoRoot, currentManifest.candidateSourceManifest);
      if (seenPaths.includes(resolvedSourcePath)) {
        throw new Error(`Circular candidateSourceManifest: ${resolvedSourcePath}`);
      }
      const sourceManifest = JSON.parse(await readFile(resolvedSourcePath, "utf8"));
      specs = await resolveCandidateSpecs(sourceManifest, [...seenPaths, resolvedSourcePath]);
    } else {
      const resolvedSourcePath = path.resolve(repoRoot, currentManifest.candidateSourceSpec);
      const sourceSpec = JSON.parse(await readFile(resolvedSourcePath, "utf8"));
      if (!Array.isArray(sourceSpec.candidates)) {
        throw new Error(`candidateSourceSpec has no candidates: ${resolvedSourcePath}`);
      }
      specs = sourceSpec.candidates.map(
        ({ group, slot, key, identity, name, decision, decisionReason }) => ({
          group: group ?? slot,
          key,
          identity,
          name,
          decision,
          decisionReason,
        }),
      );
    }
    specs = specs.map((candidate) => ({
      ...candidate,
      decision: candidate.decision?.replace(
        /s\d+/i,
        currentManifest.scenarioId.toLowerCase(),
      ),
    }));
    if (currentManifest.additionalCandidates) {
      if (!Array.isArray(currentManifest.additionalCandidates)) {
        throw new Error("additionalCandidates must be an array");
      }
      specs.push(...currentManifest.additionalCandidates);
    }
  } else {
    if (currentManifest.additionalCandidates) {
      throw new Error("additionalCandidates requires candidateSourceManifest or candidateSourceSpec");
    }
    if (!Array.isArray(currentManifest.candidates)) {
      throw new Error("Manifest must provide candidates or candidateSourceManifest");
    }
    specs = currentManifest.candidates.map((candidate) => ({ ...candidate }));
  }

  if (currentManifest.excludeCandidateKeys) {
    if (!Array.isArray(currentManifest.excludeCandidateKeys)) {
      throw new Error("excludeCandidateKeys must be an array");
    }
    const knownKeysBeforeExclusion = new Set(specs.map((candidate) => candidate.key));
    const unknownExclusions = currentManifest.excludeCandidateKeys.filter(
      (key) => !knownKeysBeforeExclusion.has(key),
    );
    if (unknownExclusions.length) {
      throw new Error(`Unknown excluded candidate keys: ${unknownExclusions.join(", ")}`);
    }
    const excludedKeys = new Set(currentManifest.excludeCandidateKeys);
    specs = specs.filter((candidate) => !excludedKeys.has(candidate.key));
  }

  const overrides = currentManifest.candidateOverrides ?? {};
  const knownKeys = new Set(specs.map((candidate) => candidate.key));
  const unknownOverrideKeys = Object.keys(overrides).filter((key) => !knownKeys.has(key));
  if (unknownOverrideKeys.length) {
    throw new Error(`Unknown candidate override keys: ${unknownOverrideKeys.join(", ")}`);
  }
  return specs.map((candidate) => ({
    ...candidate,
    ...(overrides[candidate.key] ?? {}),
  }));
}

const candidateSpecs = await resolveCandidateSpecs(manifest);
const outputDir = path.join(reportRoot, manifest.outputDir);
const sourceSpec = `${manifest.outputDir}/core-comparison.json`;
const [decisions, reservationLedger, provisionalLedger] = await Promise.all([
  readFile(path.join(reportRoot, "visual-identity-decisions.json"), "utf8").then(JSON.parse),
  readFile(path.join(reportRoot, "global-product-reservation-ledger.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(path.join(reportRoot, "provisional-front-runner-ledger.json"), "utf8").then(
    JSON.parse,
  ),
]);

const acceptedByIdentity = new Map(
  decisions.entries
    .filter((entry) => entry.status === "accept")
    .map((entry) => [String(entry.identity).toLowerCase(), entry]),
);
const unavailableIdentities = new Set([
  ...reservationLedger.reservations.map((entry) => String(entry.productKey).toLowerCase()),
  ...provisionalLedger.holds
    .filter((entry) => entry.sourceSpec !== sourceSpec)
    .map((entry) => String(entry.identity).toLowerCase()),
]);
const outputPath = path.join(outputDir, "core-comparison.jpg");
const coreOutputPath = path.join(outputDir, "core-front-runner.jpg");
const specPath = path.join(outputDir, "core-comparison.json");
const frontRunnerKeySet = new Set(manifest.frontRunnerKeys ?? []);

const candidates = candidateSpecs.map((spec) => {
  const identity = String(spec.identity).toLowerCase();
  const accepted = acceptedByIdentity.get(identity);
  if (!accepted) throw new Error(`Missing accepted ${manifest.scenarioId} candidate ${identity}`);
  if (frontRunnerKeySet.has(spec.key) && unavailableIdentities.has(identity)) {
    throw new Error(
      `${manifest.scenarioId} candidate is already reserved or provisionally held: ${identity}`,
    );
  }
  if (accepted.selectedVariant?.slot !== spec.group) {
    throw new Error(`Unexpected ${spec.group} slot for ${identity}`);
  }
  return {
    ...spec,
    identity,
    ...accepted.selectedVariant,
    constraints: accepted.constraints ?? [],
    decision: spec.decision ?? "pending-visual-review",
    decisionReason:
      spec.decisionReason ?? "Awaiting board and original-resolution comparison.",
  };
});

const duplicateKeys = candidates
  .map((candidate) => candidate.key)
  .filter((key, index, values) => values.indexOf(key) !== index);
const duplicateIdentities = candidates
  .map((candidate) => candidate.identity)
  .filter((identity, index, values) => values.indexOf(identity) !== index);
if (duplicateKeys.length || duplicateIdentities.length) {
  throw new Error(
    `Duplicate candidate keys or identities: ${[...duplicateKeys, ...duplicateIdentities].join(", ")}`,
  );
}

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

function frontRunnerField(group) {
  return `visualFrontRunner${group.charAt(0).toUpperCase()}${group.slice(1)}Identity`;
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
  const decisionColor = candidate.decision.startsWith("visual") ? "#355746" : "#a63b2e";
  const svg = Buffer.from(
    `<svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fff"/><circle cx="34" cy="30" r="21" fill="#111"/><text x="34" y="35" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">${escapeXml(candidate.key)}</text><text x="66" y="27" font-family="Arial" font-size="14" font-weight="700" fill="#111">${escapeXml(candidate.name)}</text><text x="66" y="47" font-family="Arial" font-size="10" fill="#666">${escapeXml(candidate.group.toUpperCase())}</text><text x="14" y="414" font-family="Arial" font-size="13" font-weight="700" fill="#111">${escapeXml(String(candidate.garmentType).slice(0, 42))}</text><text x="14" y="440" font-family="Arial" font-size="12" fill="#555">${escapeXml(candidate.color)} · $${Number(candidate.price).toFixed(2)}</text><text x="14" y="476" font-family="Arial" font-size="11" font-weight="700" fill="${decisionColor}">${escapeXml(candidate.decision.toUpperCase().replaceAll("-", " "))}</text><text x="14" y="502" font-family="Arial" font-size="9" fill="#666">${escapeXml(candidate.decisionReason.slice(0, 72))}</text><text x="14" y="538" font-family="Arial" font-size="8" fill="#999">${escapeXml(candidate.identity.slice(0, 50))}</text></svg>`,
  );
  cardBuffers.push(
    await sharp(svg)
      .composite([{ input: productImage, left: 12, top: 52 }])
      .jpeg({ quality: 94 })
      .toBuffer(),
  );
}

const columns = manifest.columns ?? 5;
const gap = 20;
const boardWidth = gap + columns * (cardWidth + gap);
const boardHeight = 130 + Math.ceil(candidates.length / columns) * (cardHeight + gap);
const header = Buffer.from(
  `<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">${escapeXml(manifest.comparisonTitle)}</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">${escapeXml(manifest.comparisonSubtitle)}</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">${escapeXml(manifest.comparisonNote)}</text></svg>`,
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

const frontRunnerKeys = manifest.frontRunnerKeys ?? [];
const frontRunners = frontRunnerKeys.map((key) => {
  const index = candidates.findIndex((candidate) => candidate.key === key);
  if (index < 0) throw new Error(`Unknown front-runner key: ${key}`);
  if (!candidates[index].decision.startsWith("visual")) {
    throw new Error(`Front-runner ${key} lacks a visual decision`);
  }
  return { candidate: candidates[index], input: cardBuffers[index] };
});
if (frontRunners.length) {
  const widestHeaderLine = Math.max(
    manifest.coreTitle.length,
    manifest.coreSubtitle.length,
    manifest.coreNote.length,
  );
  const estimatedHeaderWidth = Math.min(1800, 40 + widestHeaderLine * 7.2);
  const coreWidth = Math.max(
    760,
    gap + frontRunners.length * (cardWidth + gap),
    estimatedHeaderWidth,
  );
  const coreHeight = 130 + cardHeight + gap;
  const coreHeader = Buffer.from(
    `<svg width="${coreWidth}" height="${coreHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eae8e1"/><text x="20" y="38" font-family="Arial" font-size="26" font-weight="700" fill="#111">${escapeXml(manifest.coreTitle)}</text><text x="20" y="68" font-family="Arial" font-size="14" fill="#555">${escapeXml(manifest.coreSubtitle)}</text><text x="20" y="96" font-family="Arial" font-size="12" fill="#8a3d1d">${escapeXml(manifest.coreNote)}</text></svg>`,
  );
  await sharp(coreHeader)
    .composite(
      frontRunners.map(({ input }, index) => ({
        input,
        left: gap + index * (cardWidth + gap),
        top: 120,
      })),
    )
    .jpeg({ quality: 94 })
    .toFile(coreOutputPath);
} else {
  await unlink(coreOutputPath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

const frontRunnerFields = Object.fromEntries(
  frontRunners.map(({ candidate }) => [frontRunnerField(candidate.group), candidate.identity]),
);
await writeFile(
  specPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localOnly: true,
      scenarioId: manifest.scenarioId,
      occasion: manifest.occasion,
      season: manifest.season,
      budget: manifest.budget,
      bank: manifest.bank ?? "separates",
      candidateSourceManifest: manifest.candidateSourceManifest ?? null,
      additionalCandidateCount: manifest.additionalCandidates?.length ?? 0,
      plannedPosition: manifest.plannedPosition ?? null,
      status: manifest.status,
      candidates,
      ...frontRunnerFields,
      missingSlots: manifest.missingSlots,
      queuedRoles: manifest.queuedRoles ?? [],
      deferredPriceTierRoles: manifest.deferredPriceTierRoles ?? [],
      productsReservedByThisComparison: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      outputPath,
      coreOutputPath: frontRunners.length ? coreOutputPath : null,
      specPath,
      candidateCount: candidates.length,
      frontRunnerCount: frontRunners.length,
    },
    null,
    2,
  ),
);
