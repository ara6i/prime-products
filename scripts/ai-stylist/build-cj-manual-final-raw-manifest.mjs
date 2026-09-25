#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REPORT = path.resolve(
  ROOT,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const SOURCE_MANIFEST = path.join(
  REPORT,
  "cj-manual-refinement-sources/manifest.json",
);
const SOURCE_DECISIONS = path.resolve(
  ROOT,
  "scripts/ai-stylist/cj-manual-refinement-source-decisions.json",
);
const OUTPUT = path.join(REPORT, "cj-manual-final-raw-manifest.json");

const stages = [
  {
    name: "first-batch",
    result: path.join(REPORT, "cj-manual-gemini-batch/result-manifest.json"),
    decisions: path.resolve(
      ROOT,
      "scripts/ai-stylist/cj-manual-gemini-output-decisions.json",
    ),
    priority: 1,
  },
  {
    name: "source-recovery-batch",
    result: path.join(
      REPORT,
      "cj-manual-gemini-recovery-batch/result-manifest.json",
    ),
    decisions: path.resolve(
      ROOT,
      "scripts/ai-stylist/cj-manual-gemini-recovery-output-decisions.json",
    ),
    priority: 2,
  },
  {
    name: "output-repair-batch",
    result: path.join(
      REPORT,
      "cj-manual-gemini-repair-batch/result-manifest.json",
    ),
    decisions: path.resolve(
      ROOT,
      "scripts/ai-stylist/cj-manual-gemini-repair-output-decisions.json",
    ),
    priority: 3,
  },
  {
    name: "output-repair2-batch",
    result: path.join(
      REPORT,
      "cj-manual-gemini-repair2-batch/result-manifest.json",
    ),
    decisions: path.resolve(
      ROOT,
      "scripts/ai-stylist/cj-manual-gemini-repair2-output-decisions.json",
    ),
    priority: 4,
  },
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

for (const stage of stages) {
  if (!existsSync(stage.result) || !existsSync(stage.decisions)) {
    throw new Error(`Required visually reviewed stage is missing: ${stage.name}.`);
  }
}

const [sourceManifest, sourceDecisions] = await Promise.all([
  readJson(SOURCE_MANIFEST),
  readJson(SOURCE_DECISIONS),
]);
const sourceById = new Map(
  sourceManifest.products.map((product) => [product.productId, product]),
);
const sourceReadyIds = new Set(
  sourceDecisions.decisions
    .filter((decision) => decision.decision === "gemini-ready")
    .map((decision) => decision.productId),
);
if (sourceReadyIds.size !== 25) {
  throw new Error(`Expected 25 source-ready identities; found ${sourceReadyIds.size}.`);
}

const selectedById = new Map();
const excluded = [];
for (const stage of stages) {
  const [resultManifest, decisionManifest] = await Promise.all([
    readJson(stage.result),
    readJson(stage.decisions),
  ]);
  const decisionById = new Map(
    decisionManifest.decisions.map((decision) => [decision.productId, decision]),
  );
  for (const result of resultManifest.results) {
    const decision = decisionById.get(result.productId);
    if (!decision) {
      throw new Error(
        `Missing visual decision for ${result.productId} in ${stage.name}.`,
      );
    }
    if (decision.decision !== "raw-pass") {
      excluded.push({
        stage: stage.name,
        index: result.index,
        productId: result.productId,
        decision: decision.decision,
        reason: decision.reason,
      });
      continue;
    }
    if (!result.outputPath || result.error) {
      throw new Error(`Raw-pass output is unavailable for ${result.productId}.`);
    }
    const previous = selectedById.get(result.productId);
    if (!previous || stage.priority > previous.priority) {
      selectedById.set(result.productId, {
        priority: stage.priority,
        stage: stage.name,
        result,
        decision,
      });
    }
  }
}

const entries = [...sourceReadyIds]
  .map((productId) => {
    const product = sourceById.get(productId);
    const selected = selectedById.get(productId);
    if (!product || !selected) {
      throw new Error(`No visually approved raw output for source-ready ${productId}.`);
    }
    return {
      index: product.index,
      productId,
      sku: product.sku,
      title: product.title,
      garmentType: product.garmentType,
      color: product.color,
      sourcePath: product.localPath,
      sourceSha256: product.sha256,
      rawPath: selected.result.outputPath,
      rawMimeType: selected.result.outputMimeType,
      rawStage: selected.stage,
      rawBatch: stages.find((stage) => stage.name === selected.stage)?.name,
      decision: "raw-pass",
      decisionReason: selected.decision.reason,
    };
  })
  .sort((a, b) => a.index - b.index);

if (entries.length !== 25) {
  throw new Error(`Expected 25 final raw passes; found ${entries.length}.`);
}
if (new Set(entries.map((entry) => entry.productId)).size !== entries.length) {
  throw new Error("Duplicate product identity detected in final raw entries.");
}
if (entries.some((entry) => !existsSync(path.resolve(ROOT, entry.rawPath)))) {
  throw new Error("At least one approved raw file is missing from local disk.");
}

const manifest = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  weddingAndWeddingGuestExcluded: true,
  sourceSearchMethod: "manual exact CJ pages in Codex browser",
  cjSearchApiCalls: 0,
  expected: 25,
  selected: entries.length,
  uniqueProductIdentities: new Set(entries.map((entry) => entry.productId)).size,
  supersededOrExcluded: excluded,
  entries,
};
await writeFile(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output: OUTPUT, selected: entries.length }, null, 2));
