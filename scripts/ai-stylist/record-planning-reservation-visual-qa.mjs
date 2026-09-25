#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const reservationsPath = path.join(
  reportRoot,
  "cj-manual-gemini-final-alpha/scenario-reservations.json",
);
const decisionSourcePath = path.join(
  repoRoot,
  "scripts/ai-stylist/planning-reservation-three-stage-decisions.json",
);
const evidenceDir = path.join(
  reportRoot,
  "planning-reservation-three-stage-audit",
);
const outputJsonPath = path.join(
  reportRoot,
  "planning-reservation-gallery/one-by-one-visual-qa.json",
);
const outputMarkdownPath = path.join(
  reportRoot,
  "planning-reservation-gallery/ONE_BY_ONE_VISUAL_QA.md",
);

const [reservationLedger, recordedDecisions] = await Promise.all([
  readFile(reservationsPath, "utf8").then(JSON.parse),
  readFile(decisionSourcePath, "utf8").then(JSON.parse),
]);
const decisionByProductId = new Map(
  recordedDecisions.decisions.map((entry) => [String(entry.productId), entry]),
);
const planning = reservationLedger.reservations.filter(
  (entry) => entry.reservationStatus === "reserved-not-outfit-approved",
);
if (planning.length !== 16) {
  throw new Error(
    `Expected 16 current planning reservations after two style revocations, found ${planning.length}`,
  );
}

const decisions = planning.map((product, index) => {
  const productId = String(product.productId);
  const audit = decisionByProductId.get(productId);
  if (!audit) throw new Error(`Missing three-stage visual decision for ${productId}`);
  if (audit.scenarioId !== product.scenarioId) {
    throw new Error(`Scenario mismatch for ${productId}`);
  }
  if (!String(audit.decision).startsWith("pass")) {
    throw new Error(
      `Rejected product survived into planning reservations: ${productId} (${audit.decision})`,
    );
  }
  return {
    reviewOrder: index + 1,
    productId,
    identity: `cj:${productId}`,
    scenarioId: product.scenarioId,
    title: product.title,
    garmentType: product.garmentType,
    color: product.color,
    slot: product.slot,
    decision: "pass",
    auditDecision: audit.decision,
    reason: audit.reason,
    finalImage: product.finalImage,
    completeOutfitApproved: false,
    uiIntegrated: false,
  };
});
const identities = decisions.map((entry) => entry.identity.toLowerCase());
if (new Set(identities).size !== decisions.length) {
  throw new Error("Planning visual QA contains a repeated identity");
}

const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  evidenceDirectory: evidenceDir,
  reviewMethod:
    "Each current planning product was checked across its original source, refined image and transparent alpha. Product-level preservation and scenario suitability are recorded separately from complete-outfit approval.",
  summary: {
    reviewed: decisions.length,
    pass: decisions.length,
    reject: 0,
    styleRevokedBeforeThisLedger:
      reservationLedger.summary.styleRevokedAfterOutfitVisualQa,
    completeOutfitApproved: 0,
    uiIntegrated: false,
  },
  decisions,
};

const rows = decisions.map(
  (entry) =>
    `| ${entry.reviewOrder} | ${entry.identity} | ${entry.scenarioId} | ${entry.garmentType} | ${entry.color} | ${entry.auditDecision} | ${entry.reason} |`,
);
const markdown = `# Planning-reservation one-by-one visual QA

Generated: ${result.generatedAt}

Evidence directory: \`${evidenceDir}\`

The ${decisions.length} remaining planning-only final-alpha products passed their source → refinement → alpha product gate. The revoked glossy S189 loafer and boxy gray S157 quarter-zip are deliberately absent.

- Products reviewed and retained: ${result.summary.reviewed}
- Products style-revoked before this ledger: ${result.summary.styleRevokedBeforeThisLedger}
- Complete outfits approved here: 0
- AI Stylist UI integrations: 0

Product-level retention only preserves a product for companion sourcing. It does not approve a complete outfit.

| # | Identity | Scenario | Garment | Color | Decision | Visual reason and restriction |
| ---: | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}
`;

await mkdir(path.dirname(outputJsonPath), { recursive: true });
await Promise.all([
  writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(outputMarkdownPath, markdown),
]);
console.log(
  JSON.stringify(
    { outputJsonPath, outputMarkdownPath, ...result.summary },
    null,
    2,
  ),
);
