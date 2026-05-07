import type { TryOnModelId } from "./models";

export type TryOnPhase = "idle" | "submitting" | "queued" | "generating" | "done" | "error";

export interface TryOnRunInput {
  modelImage: string;
  garmentImage: string;
  customPrompt?: string;
  productTitle?: string;
  productDescription?: string;
  productMaterial?: string;
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
