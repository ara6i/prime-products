export interface AiStylistProductPreview {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  inventory: number | null;
  slot: string;
  gender: string;
  pipelineStage: string;
  sizeGuideStatus: string;
  updatedAt: string | null;
}

export interface AiStylistGenderSegment {
  id: "female" | "male" | "unisex" | "unknown";
  label: string;
  total: number;
  inventoryQualified: number;
  categorized: number;
  priced: number;
  categories: Record<string, number>;
  priceBands: Record<string, number>;
}

export interface AiStylistCjMensShoesProgress {
  target: number;
  imported: number;
  withImages: number;
  inventoryQualified: number;
  sizeChartDetected: number;
  lunaCandidates: number;
  readyForLuna: number;
  enriching: number;
  ragReady: number;
  needsReview: number;
  rejected: number;
  activeBatches: number;
  lastProductUpdateAt: string | null;
  remainingToImportTarget: number;
  remainingToReadyTarget: number;
  minimumOtherSupplierGap: number;
  audit: {
    generatedAt: string | null;
    reportedTotalRecords: number;
    scannedPages: number;
    scannedProducts: number;
    catalogQualified: number;
    alreadyInShopify: number;
    newCatalogQualified: number;
    rejectedReasons: Record<string, number>;
    qualityRejectedReasons: Record<string, number>;
    qualifiedSubcategories: Record<string, number>;
    verification: {
      requested: number;
      shippingAndVariantVerified: number;
      failureCount: number;
      reviewedProducts: number;
      productsWithoutCjReviews: number;
    };
  } | null;
}

export interface AiStylistGarmentExtractionSample {
  jobId: string;
  productId: string;
  styleRagId: string | null;
  sourceProductId: string | null;
  variantId: string | null;
  color: string;
  normalizedColor: string;
  garmentCategory: string;
  sourceImageUrl: string;
  resultUrl: string;
  modeUsed: "fast" | "full" | null;
  processingStrategyUsed: "direct_alpha" | "generative_extract" | null;
  pipelineVersion: string;
  providerLatencyMs: number | null;
  totalLatencyMs: number | null;
  transparentPixelRatio: number | null;
  completedAt: string | null;
}

export interface AiStylistGarmentExtractionProgress {
  generatedAt: string;
  pipelineVersion: string;
  productionUseAllowed: boolean;
  candidates: {
    eligibleProducts: number;
    distinctProductColors: number;
    selected: number;
    alreadySucceeded: number;
  };
  counts: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    needsReview: number;
    failed: number;
  };
  performance: {
    averageLatencyMs: number | null;
    imagesPerHour: number | null;
    estimatedRemainingSeconds: number | null;
    estimatedRemainingCostUsd: number | null;
  };
  latestBatch: {
    batchId: string;
    status: string;
    counts: {
      total: number;
      queued: number;
      running: number;
      succeeded: number;
      needsReview: number;
      failed: number;
    };
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  samples: AiStylistGarmentExtractionSample[];
}

export interface AiStylistScenarioCoverageGroup {
  id: string;
  label: string;
  ready: number;
  total: number;
  available: number;
  target: number;
  readinessPercent: number;
}

export interface AiStylistScenarioCoverageRow {
  id: string;
  gender: string;
  genderLabel: string;
  occasion: string;
  occasionLabel: string;
  occasionApi: string;
  season: string;
  seasonLabel: string;
  budget: string;
  budgetLabel: string;
  budgetRange: string;
  available: number;
  gap: number;
  eligibleProducts: number;
  eligibleBySlot: Record<string, number>;
  measured: boolean;
}

export interface AiStylistScenarioCoverage {
  definition: {
    source: string;
    version: string;
    formula: string;
    totalScenarios: number;
    targetPerScenario: number;
    targetOutfitSlots: number;
  };
  snapshot: {
    generatedAt: string | null;
    definitionVersion?: string | null;
    catalogRevision?: string | null;
    method: string;
    summary: {
      ready: number;
      partial: number;
      missing: number;
      availableOutfitSlots: number;
      targetOutfitSlots: number;
      outfitReadinessPercent: number;
      scenarioReadinessPercent: number;
    };
  };
  freshness: {
    catalogRevision: string | null;
    snapshotRevision: string | null;
    isCurrent: boolean;
    pollingSeconds: number;
  };
  refresh: {
    status: "idle" | "running" | "complete" | "failed";
    checked: number;
    total: number;
    percent: number;
    startedAt: string | null;
    updatedAt: string | null;
    completedAt: string | null;
    error: string | null;
  };
  qaPresets: {
    passed: number;
    failed: number;
    stale: number;
  };
  groups: {
    gender: AiStylistScenarioCoverageGroup[];
    occasion: AiStylistScenarioCoverageGroup[];
    season: AiStylistScenarioCoverageGroup[];
    budget: AiStylistScenarioCoverageGroup[];
  };
  blockers: Array<{
    id: string;
    label: string;
    blockedScenarios: number;
    detail: string;
  }>;
  scenarios: AiStylistScenarioCoverageRow[];
}

export interface AiStylistLabStatus {
  generatedAt: string;
  liveFreshness?: {
    checkedAt: string;
    intakeRevision: string | null;
    liveRevision: string | null;
    isCurrent: boolean;
    refreshRunning: boolean;
    pollingSeconds: number;
  };
  scope: {
    database: string;
    provider: "trendsi";
    minimumInventory: number;
    allowedSlots: readonly string[];
  };
  destination: {
    label: string;
    database: string;
    liveProducts: number;
    lastPublishedAt: string | null;
  };
  sync: {
    lastProductUpdateAt: string | null;
    lunaAutomationActive: boolean;
    activeBatches: number;
  };
  supplierProgress?: {
    cjMensShoes: AiStylistCjMensShoesProgress;
  };
  garmentExtraction?: AiStylistGarmentExtractionProgress;
  summary: {
    total: number;
    withImages: number;
    inventoryQualified: number;
    priced: number;
    categorized: number;
    sizeChartDetected: number;
    readyForLuna: number;
    enriching: number;
    ragReady: number;
    needsReview: number;
    rejected: number;
    excludedLowInventory: number;
    excludedMissingImage: number;
  };
  stages: Array<{ id: string; label: string; count: number }>;
  breakdowns: {
    pipeline: Record<string, number>;
    category: Record<string, number>;
    gender: Record<string, number>;
    qualityReasons: Record<string, number>;
    priceBands: Record<string, number>;
  };
  genderSegments: AiStylistGenderSegment[];
  products: {
    recent: AiStylistProductPreview[];
    lowestPrices: AiStylistProductPreview[];
    mainLive: AiStylistProductPreview[];
  };
  batches: Array<{
    runId: string;
    batchId: string | null;
    status: string;
    productCount: number;
    requestCounts: {
      completed?: number;
      failed?: number;
      total?: number;
    } | null;
    createdAt: string | null;
    updatedAt: string | null;
    appliedAt: string | null;
    releasedAt: string | null;
  }>;
}

export interface AiStylistLabStatusResponse {
  ok: boolean;
  status?: AiStylistLabStatus;
  error?: string;
  message?: string;
}

export interface AiStylistScenarioCoverageResponse {
  ok: boolean;
  scenarioCoverage?: AiStylistScenarioCoverage;
  error?: string;
  message?: string;
}

export interface AiStylistGeminiBatchSample {
  key: string;
  title: string;
  scenarioId: string;
  slot: string;
  color: string;
  imageUrl: string;
}

export interface AiStylistGeminiBatchProgress {
  status: "preparing" | "running" | "post-processing" | "complete" | "partial" | "failed";
  providerState: string;
  model: string;
  batchName: string | null;
  submitted: number;
  succeeded: number;
  failed: number;
  reused: number;
  uniqueSources: number;
  transparentSaved: number;
  readySources: number;
  duplicateRegenerations: number;
  elapsedSeconds: number | null;
  estimatedCostUsd: number | null;
  finishedAt: string | null;
  failureMessage: string | null;
  samples: AiStylistGeminiBatchSample[];
}

export interface AiStylistLunaBatchProgress {
  updatedAt: string | null;
  phase: string;
  status: string;
  scenarioUniverse: number;
  scenariosComplete: number;
  scenariosRemaining: number;
  scenariosReservedOnly: number;
  targetScenarios: number;
  batchJobsTotal: number;
  batchJobsSubmitted: number;
  batchJobsRunning: number;
  requestsTotal: number;
  requestsCompleted: number;
  requestsFailed: number;
  scenariosCommitted: number;
  scenariosBlocked: number;
  uniqueProductsClaimed: number;
  qualifiedProductsSaved: number;
  scenariosWithQualifiedProducts: number;
  visualReportsRecovered: number;
  providerResponsesRecovered: number;
  providerJobsRunning: number;
  duplicateNonExemptProducts: number;
  estimatedCostUsd: number | null;
  message: string;
  batchIds: string[];
}

export interface AiStylistBatchProgress {
  generatedAt: string;
  manualRefreshOnly: true;
  gemini: AiStylistGeminiBatchProgress;
  luna: AiStylistLunaBatchProgress;
}

export interface AiStylistBatchProgressResponse {
  ok: boolean;
  progress?: AiStylistBatchProgress;
  error?: string;
}
