import { getModelEntry, type TryOnModelId } from "../../lib/models";

export interface CapacityTryOnModelEstimate {
  modelId: TryOnModelId;
  modelLabel: string;
  tokensPerTryOn: number;
  rpmLimit: number;
  tpmLimit: number;
  rpdLimit: number;
  theoreticalTryOnPerMinute: number;
  safeTryOnPerMinute: number;
  quotaLabel: string;
}

const MODEL_LIMITS: Record<TryOnModelId, Omit<CapacityTryOnModelEstimate, "modelId" | "modelLabel">> = {
  "gemini-3-pro-image-preview": {
    tokensPerTryOn: 3500,
    rpmLimit: 500,
    tpmLimit: 500_000,
    rpdLimit: 15_000,
    theoreticalTryOnPerMinute: 142,
    safeTryOnPerMinute: 110,
    quotaLabel: "Nano Banana Pro quota estimate",
  },
  "gemini-3.1-flash-image-preview": {
    tokensPerTryOn: 3500,
    rpmLimit: 500,
    tpmLimit: 1_000_000,
    rpdLimit: 10_000,
    theoreticalTryOnPerMinute: 285,
    safeTryOnPerMinute: 220,
    quotaLabel: "Nano Banana 2 quota estimate",
  },
  "gemini-2.5-flash-image": {
    tokensPerTryOn: 1290,
    rpmLimit: 2000,
    tpmLimit: 1_500_000,
    rpdLimit: 50_000,
    theoreticalTryOnPerMinute: 1162,
    safeTryOnPerMinute: 900,
    quotaLabel: "Nano Banana 2.5 Flash Image quota estimate",
  },
  "virtual-try-on-001": {
    tokensPerTryOn: 0,
    rpmLimit: 0,
    tpmLimit: 0,
    rpdLimit: 0,
    theoreticalTryOnPerMinute: 0,
    safeTryOnPerMinute: 20,
    quotaLabel: "Vertex quota depends on GCP Vertex AI limits",
  },
  "virtual-try-on-preview-08-04": {
    tokensPerTryOn: 0,
    rpmLimit: 0,
    tpmLimit: 0,
    rpdLimit: 0,
    theoreticalTryOnPerMinute: 0,
    safeTryOnPerMinute: 20,
    quotaLabel: "Vertex quota depends on GCP Vertex AI limits",
  },
};

export function getCapacityTryOnModelEstimate(modelId: TryOnModelId): CapacityTryOnModelEstimate {
  const model = getModelEntry(modelId);
  const limits = MODEL_LIMITS[modelId];

  return {
    modelId,
    modelLabel: model.label,
    ...limits,
  };
}
