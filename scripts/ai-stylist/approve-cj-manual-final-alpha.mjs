#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REPORT_DIR = path.resolve(
  ROOT,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913/cj-manual-gemini-final-alpha",
);
const REPORT_PATH = path.join(REPORT_DIR, "final-alpha-report.json");
const DECISIONS_PATH = path.resolve(
  ROOT,
  "scripts/ai-stylist/cj-manual-alpha-output-decisions.json",
);
const APPROVAL_MANIFEST_PATH = path.join(
  REPORT_DIR,
  "alpha-approval-manifest.json",
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const [report, decisionManifest] = await Promise.all([
  readJson(REPORT_PATH),
  readJson(DECISIONS_PATH),
]);

if (report.counts.requested !== 25 || report.counts.finalized !== 25) {
  throw new Error("Expected exactly 25 finalized local alpha assets.");
}
if (report.counts.failed !== 0) {
  throw new Error("Cannot approve a final-alpha report containing failures.");
}
const decisions = decisionManifest.decisions || [];
if (
  decisions.length !== 25 ||
  decisions.some((decision) => decision.decision !== "alpha-pass")
) {
  throw new Error("Expected 25 explicit alpha-pass visual decisions.");
}
const decisionById = new Map(
  decisions.map((decision) => [decision.productId, decision]),
);
if (decisionById.size !== decisions.length) {
  throw new Error("Duplicate identity in alpha visual decisions.");
}
const reportIds = new Set(report.entries.map((entry) => entry.productId));
if (
  reportIds.size !== 25 ||
  [...reportIds].some((productId) => !decisionById.has(productId)) ||
  [...decisionById].some(([productId]) => !reportIds.has(productId))
) {
  throw new Error("Alpha decisions do not exactly match the final-alpha report.");
}
for (const entry of report.entries) {
  const decision = decisionById.get(entry.productId);
  if (decision.index !== entry.index) {
    throw new Error(`Index mismatch for ${entry.productId}.`);
  }
  if (
    entry.finalInspection.width !== 896 ||
    entry.finalInspection.height !== 1200 ||
    !entry.finalInspection.hasAlpha ||
    entry.finalInspection.transparentPixelRatio <= 0 ||
    entry.finalInspection.borderForegroundRatio !== 0
  ) {
    throw new Error(`Measured alpha gate failed for ${entry.productId}.`);
  }
}

const approvedAt = new Date().toISOString();
const approvedEntries = report.entries.map((entry) => {
  const decision = decisionById.get(entry.productId);
  return {
    ...entry,
    alphaVisualDecision: "approved",
    alphaVisualReason: decision.reason,
    alphaVisuallyReviewedAt: decisionManifest.reviewedAt,
  };
});
const approvedReport = {
  ...report,
  alphaReview: {
    approvedAt,
    reviewedAt: decisionManifest.reviewedAt,
    reviewMethod: decisionManifest.reviewMethod,
    decisionManifest: path.relative(ROOT, DECISIONS_PATH),
    reviewed: decisions.length,
    approved: decisions.length,
    rejected: 0,
    note:
      "Alpha approval makes these local assets eligible for catalog intake; it does not allocate them to outfits or modify the AI Stylist UI.",
  },
  counts: {
    ...report.counts,
    visuallyApprovedAlpha: decisions.length,
  },
  gates: {
    ...report.gates,
    visuallyReviewedAlpha: true,
    catalogReady: true,
  },
  entries: approvedEntries,
};

const approvalManifest = {
  generatedAt: approvedAt,
  localOnly: true,
  weddingAndWeddingGuestExcluded: true,
  reportPath: path.relative(ROOT, REPORT_PATH),
  decisionsPath: path.relative(ROOT, DECISIONS_PATH),
  approved: approvedEntries.length,
  uniqueProductIdentities: new Set(
    approvedEntries.map((entry) => entry.productId),
  ).size,
  outfitReady: 0,
  catalogIntegrated: false,
  entries: approvedEntries.map((entry) => ({
    index: entry.index,
    productId: entry.productId,
    sku: entry.sku,
    garmentType: entry.garmentType,
    color: entry.color,
    finalPath: entry.finalPath,
    finalSha256: entry.finalInspection.contentSha256,
    alphaVisualDecision: entry.alphaVisualDecision,
    alphaVisualReason: entry.alphaVisualReason,
  })),
};

await Promise.all([
  writeFile(REPORT_PATH, `${JSON.stringify(approvedReport, null, 2)}\n`),
  writeFile(
    APPROVAL_MANIFEST_PATH,
    `${JSON.stringify(approvalManifest, null, 2)}\n`,
  ),
]);

console.log(
  JSON.stringify(
    {
      reportPath: REPORT_PATH,
      approvalManifestPath: APPROVAL_MANIFEST_PATH,
      approved: approvedEntries.length,
      catalogIntegrated: false,
      outfitReady: 0,
    },
    null,
    2,
  ),
);
