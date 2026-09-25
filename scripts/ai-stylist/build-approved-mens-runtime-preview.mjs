import fs from "node:fs/promises";
import path from "node:path";

const reportRoot =
  "/Users/arashsn/Projects/PrimeStyleAI/prime-products/output/reports/" +
  "ai-stylist-mens-global-unique-visual-v16-20260913";
const reservationLedgerPath = path.join(
  reportRoot,
  "global-product-reservation-ledger.json",
);
const sourcePoolPath =
  "/Users/arashsn/Projects/PrimeStyleAI/prime-products/output/reports/" +
  "mens-nonwedding-scenario-pools-20260911.json";
const s149UiCompleteCandidatePath = path.join(
  reportRoot,
  "spring-office-budget-s149-six-piece-reuse/candidate.json",
);
const s133UiCompleteCandidatePath = path.join(
  reportRoot,
  "spring-casual-budget-core-s133-02/six-piece-complete-candidate.json",
);
const s225UiCompleteCandidatePath = path.join(
  reportRoot,
  "fall-sports-budget-s225-complete-candidate/six-piece-candidate.json",
);
const outputDirectory = path.join(reportRoot, "approved-runtime-preview");
const shoeAssetDirectory = path.join(
  outputDirectory,
  "assets",
  "cj-mens-shoes",
);
const extrasAssetDirectory = path.join(
  outputDirectory,
  "assets",
  "cj-mens-extras",
);
const outputDraftPath = path.join(outputDirectory, "agent-styled-draft.json");
const outputPoolPath = path.join(outputDirectory, "product-pool.json");
const outputManifestPath = path.join(outputDirectory, "runtime-manifest.json");

function safeAssetName(scenarioId, item) {
  const identifier = String(item.productId ?? item.styleRagId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${scenarioId.toLowerCase()}-${identifier}${path.extname(item.image)}`;
}

async function approvedOutfitFromSource(approvedOutfit) {
  const sourceDraftPath = approvedOutfit.sourceDraftPath
    ? path.resolve(approvedOutfit.sourceDraftPath)
    : path.resolve(
        path.dirname(approvedOutfit.boardPath),
        "..",
        "agent-styled-draft.json",
      );
  const sourceDraft = JSON.parse(await fs.readFile(sourceDraftPath, "utf8"));
  const sourceScenario = sourceDraft.scenarios.find(
    (entry) => entry.scenario.id === approvedOutfit.scenarioId,
  );
  if (!sourceScenario) {
    throw new Error(
      `Missing source scenario ${approvedOutfit.scenarioId} in ${sourceDraftPath}`,
    );
  }
  const sourceOutfits = [
    ...(sourceScenario.outfits ?? []),
    ...(sourceScenario.outfitSets?.separates ?? []),
    ...(sourceScenario.outfitSets?.suit ?? []),
  ];
  const outfit = sourceOutfits.find(
    (candidate) => candidate.outfitId === approvedOutfit.outfitId,
  );
  if (!outfit) {
    throw new Error(
      `Missing approved outfit ${approvedOutfit.outfitId} in ${sourceDraftPath}`,
    );
  }
  return {
    sourceDraftPath,
    scenario: structuredClone(sourceScenario.scenario),
    outfit: structuredClone(outfit),
  };
}

async function main() {
  const [
    ledger,
    sourcePool,
    s149UiCompleteCandidate,
    s133UiCompleteCandidate,
    s225UiCompleteCandidate,
  ] = await Promise.all([
    fs.readFile(reservationLedgerPath, "utf8").then(JSON.parse),
    fs.readFile(sourcePoolPath, "utf8").then(JSON.parse),
    fs.readFile(s149UiCompleteCandidatePath, "utf8").then(JSON.parse),
    fs.readFile(s133UiCompleteCandidatePath, "utf8").then(JSON.parse),
    fs.readFile(s225UiCompleteCandidatePath, "utf8").then(JSON.parse),
  ]);
  if (ledger.summary?.approvedThreePieceCores !== 6) {
    throw new Error(
      `Expected six controlling approved three-piece cores after the S133 approval, found ${ledger.summary?.approvedThreePieceCores ?? "unknown"}.`,
    );
  }

  await fs.mkdir(shoeAssetDirectory, { recursive: true });
  await fs.mkdir(extrasAssetDirectory, { recursive: true });
  for (const assetDirectory of [shoeAssetDirectory, extrasAssetDirectory]) {
    for (const entry of await fs.readdir(assetDirectory, {
      withFileTypes: true,
    })) {
      if (entry.isFile()) {
        await fs.unlink(path.join(assetDirectory, entry.name));
      }
    }
  }

  const productPool = {};
  const scenarios = [];
  const copiedAssets = [];
  const identities = new Set();
  const sourceDraftPaths = [];

  for (const approvedOutfit of ledger.approvedOutfits) {
    const source = approvedOutfit.scenarioId === "S133"
      ? {
          sourceDraftPath: s133UiCompleteCandidatePath,
          scenario: {
            id: "S133",
            gender: "male",
            occasion: "casual-day",
            occasionLabel: "Casual Everyday",
            season: "spring",
            seasonLabel: "Spring",
            budget: "budget-friendly",
            budgetLabel: "Budget-Friendly",
            budgetMin: 0,
            budgetMax: 500,
            currency: "USD",
          },
          outfit: {
            outfitId: s133UiCompleteCandidate.outfitId,
            position: 1,
            name: s133UiCompleteCandidate.name,
            rationale:
              "Cream texture and controlled French blue stay light for Spring; the washed-blue short bomber, sand sneaker, warm-brown crescent bag and beige woven belt complete a modern casual look without dark filler.",
            items: s133UiCompleteCandidate.items.map((item) => ({
              ...item,
              styleRagId: String(item.styleRagId ?? item.identity),
              productId: String(item.productId ?? item.identity),
            })),
            totalPrice: s133UiCompleteCandidate.merchandiseSubtotalBeforeShipping,
            approvalScope: "ui-complete-six-role-separates",
          },
        }
      : await approvedOutfitFromSource(approvedOutfit);
    sourceDraftPaths.push(source.sourceDraftPath);
    const outfit = source.outfit;
    if (outfit.outfitId !== approvedOutfit.outfitId) {
      throw new Error(
        `Approved outfit identity changed for ${approvedOutfit.scenarioId}.`,
      );
    }
    if (approvedOutfit.scenarioId === "S149") {
      if (
        s149UiCompleteCandidate.decision !==
          "approve-ui-complete-six-piece-outfit" ||
        s149UiCompleteCandidate.items.length !== 6
      ) {
        throw new Error("S149 runtime preview lacks its approved six-piece candidate");
      }
      outfit.items = s149UiCompleteCandidate.items.map((item) => ({
        ...item,
        productId: String(
          item.productId ?? String(item.styleRagId ?? item.identity).replace(/^cj:/i, ""),
        ),
        styleRagId: String(item.styleRagId ?? item.identity),
        source: item.source ?? item.sourceCollection ?? "existing-refined-visual-ledger",
      }));
      outfit.totalPrice = s149UiCompleteCandidate.totalPrice;
      outfit.approvalScope = "ui-complete-six-role-separates";
    } else if (approvedOutfit.scenarioId === "S225") {
      if (
        s225UiCompleteCandidate.decision !==
          "approve-ui-complete-six-piece-outfit" ||
        s225UiCompleteCandidate.items.length !== 6
      ) {
        throw new Error("S225 runtime preview lacks its approved six-piece candidate");
      }
      outfit.name = s225UiCompleteCandidate.name;
      outfit.rationale = s225UiCompleteCandidate.decisionReason;
      outfit.items = s225UiCompleteCandidate.items.map((item) => ({
        ...item,
        productId: String(
          item.productId ?? String(item.styleRagId ?? item.identity).replace(/^cj:/i, ""),
        ),
        styleRagId: String(item.styleRagId ?? item.identity),
        source: item.source ?? "existing-refined-visual-ledger",
      }));
      outfit.totalPrice = s225UiCompleteCandidate.merchandiseSubtotalBeforeShipping;
      outfit.approvalScope = "ui-complete-six-role-separates";
    } else if (approvedOutfit.scenarioId !== "S133") {
      outfit.approvalScope = "approved-three-piece-core";
    }

    for (const item of outfit.items) {
      const identity = String(item.styleRagId);
      if (!identity || identities.has(identity)) {
        throw new Error(
          `Repeated or missing product identity: ${identity || "empty"}`,
        );
      }
      identities.add(identity);
      const originalSource = item.source;
      if (path.isAbsolute(String(item.image ?? ""))) {
        await fs.access(item.image);
        const assetCollection =
          item.slot === "shoe" ? "mens-shoes" : "mens-extras";
        const assetDirectory =
          assetCollection === "mens-shoes"
            ? shoeAssetDirectory
            : extrasAssetDirectory;
        const assetName = safeAssetName(approvedOutfit.scenarioId, item);
        const copiedPath = path.join(assetDirectory, assetName);
        await fs.copyFile(item.image, copiedPath);
        item.originalSource = originalSource;
        item.source = "manual-cj-gemini-local-alpha";
        item.assetCollection = assetCollection;
        item.image = copiedPath;
        copiedAssets.push({
          scenarioId: approvedOutfit.scenarioId,
          styleRagId: identity,
          assetCollection,
          path: copiedPath,
        });
      }

      const sourceProduct = sourcePool.products?.[String(item.productId)] ?? {};
      productPool[String(item.productId)] = {
        ...sourceProduct,
        productId: String(item.productId),
        styleRagId: identity,
        sourceProductId: String(item.sourceProductId ?? item.productId),
        title: String(item.title),
        slot: String(item.slot),
        garmentType: String(
          item.garmentType ?? sourceProduct.garmentType ?? "",
        ),
        price: Number(item.price ?? sourceProduct.price ?? 0),
        currency: String(item.currency ?? sourceProduct.currency ?? "USD"),
        color: String(item.color ?? sourceProduct.color ?? ""),
      };
    }

    const existingScenario = scenarios.find(
      (entry) => entry.scenario.id === source.scenario.id,
    );
    if (existingScenario) {
      existingScenario.outfitSets.separates.push(outfit);
      existingScenario.scenario.targetOutfits =
        existingScenario.outfitSets.separates.length;
    } else {
      scenarios.push({
        scenario: {
          ...source.scenario,
          targetOutfits: 1,
        },
        outfitSets: {
          separates: [outfit],
          suit: [],
        },
      });
    }
  }

  if (scenarios.some((entry) => /wedding/i.test(entry.scenario.occasion))) {
    throw new Error("Wedding content is forbidden in the local men's preview.");
  }
  if (identities.size !== 27 || copiedAssets.length !== 19) {
    throw new Error(
      `Expected 27 unique placements and nineteen local assets after the S133, S149 and S225 six-piece approvals; found ${identities.size} and ${copiedAssets.length}.`,
    );
  }

  const generatedAt = new Date().toISOString();
  const draft = {
    version: "local-mens-approved-runtime-preview-v1",
    generatedAt,
    localOnly: true,
    weddingAndWeddingGuestExcluded: true,
    inputs: {
      reservationLedgerPath,
      poolPath: outputPoolPath,
      sourcePoolPath,
      sourceDraftPaths: [...new Set(sourceDraftPaths)],
    },
    summary: {
      scenarios: scenarios.length,
      approvedThreePieceCores: ledger.summary.approvedThreePieceCores,
      uiCompleteOutfits: ledger.summary.uiCompleteOutfits,
      placements: identities.size,
      uniqueIdentities: identities.size,
      repeatedIdentities: 0,
      copiedLocalAssets: copiedAssets.length,
      uiIntegrated: false,
    },
    scenarios,
  };
  const pool = {
    version: "local-mens-approved-runtime-pool-v1",
    generatedAt,
    localOnly: true,
    products: productPool,
  };
  const manifest = {
    version: "local-mens-approved-runtime-manifest-v1",
    generatedAt,
    localOnly: true,
    draftPath: outputDraftPath,
    poolPath: outputPoolPath,
    shoeAssetDirectory,
    extrasAssetDirectory,
    environment: {
      AI_STYLIST_LOCAL_MENS_DRAFT_PATH: outputDraftPath,
      AI_STYLIST_LOCAL_MENS_SHOE_ASSET_DIR: shoeAssetDirectory,
      AI_STYLIST_LOCAL_MENS_EXTRAS_ASSET_DIR: extrasAssetDirectory,
    },
    copiedAssets,
  };

  await Promise.all([
    fs.writeFile(outputDraftPath, `${JSON.stringify(draft, null, 2)}\n`),
    fs.writeFile(outputPoolPath, `${JSON.stringify(pool, null, 2)}\n`),
    fs.writeFile(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
  ]);
  console.log(
    JSON.stringify(
      {
        outputDraftPath,
        outputPoolPath,
        outputManifestPath,
        summary: draft.summary,
      },
      null,
      2,
    ),
  );
}

await main();
