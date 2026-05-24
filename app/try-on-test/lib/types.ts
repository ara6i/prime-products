import type { TryOnModelId } from "./models";

export type TryOnPhase = "idle" | "submitting" | "queued" | "generating" | "done" | "error";

export type TryOnProductCategory =
  | "apparel"
  | "shoe"
  | "bag"
  | "hat"
  | "sunglasses"
  | "necklace"
  | "bracelet"
  | "ring"
  | "belt"
  | "watch"
  | "accessory";

export type FitLabel = "good" | "tight" | "loose" | "a-bit-tight" | "a-bit-loose" | "too-tight" | "too-loose";

export interface FitAreaInfo {
  area: string;
  section?: string;
  fit: FitLabel;
  userValue?: number;
  garmentRange?: string;
  y?: number;
  x1?: number;
  x2?: number;
}

export interface SilhouetteContext {
  recommendedSize?: string;
  recommendedSizeMeasurements?: string;
  sizeChartSummary?: string;
  userMeasurementsText?: string;
  userHeight?: string;
  userWeight?: string;
}

export interface TryOnSizingRunData {
  category: TryOnProductCategory;
  productTitle?: string;
  productDescription?: string;
  productMaterial?: string;
  fitInfo?: FitAreaInfo[];
  silhouetteContext?: SilhouetteContext;
  promptPreview?: string;
}

export interface TryOnRunInput {
  modelImage: string;
  garmentImage: string;
  customPrompt?: string;
  productTitle?: string;
  productDescription?: string;
  productMaterial?: string;
  category?: TryOnProductCategory;
  fitInfo?: FitAreaInfo[];
  silhouetteContext?: SilhouetteContext;
  /** Per-request model override sent to the backend test endpoint. */
  model?: TryOnModelId;
}

export interface TryOnRunTimings {
  /** ms between submit and the backend's 202 response (queue + photo cache) */
  ackMs: number | null;
  /** ms between the 202 response and the SSE 'completed' event (Gemini generation) */
  generationMs: number | null;
  /** ms between submit and the SSE 'completed' event (end-to-end) */
  totalMs: number | null;
}

export interface TryOnRunResult {
  jobId: string;
  imageUrl: string;
  timings: TryOnRunTimings;
}

export interface HistoryEntry {
  id: string;
  startedAt: number;
  totalMs: number;
  ackMs: number | null;
  generationMs: number | null;
  promptPreview: string;
  promptKind: "default" | "custom" | "n/a";
  modelId: TryOnModelId;
  imageUrl: string | null;
  status: "done" | "error";
  errorMessage: string | null;
}
