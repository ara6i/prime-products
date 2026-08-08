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

export interface AiStylistLabStatus {
  generatedAt: string;
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
