import type { TryOnModelId } from "./models";
import type { HistoryEntry, TryOnRunInput, TryOnRunResult, TryOnRunTimings, TryOnSizingRunData } from "./types";

export interface RunRequest {
  modelDataUri: string;
  garmentDataUri: string;
  customPrompt?: string;
  model: TryOnModelId;
  sizing?: TryOnSizingRunData | null;
}

export function buildTryOnRunInput(req: RunRequest): TryOnRunInput {
  const input: TryOnRunInput = {
    modelImage: req.modelDataUri,
    garmentImage: req.garmentDataUri,
    model: req.model,
  };
  if (req.customPrompt && req.customPrompt.trim().length > 0) {
    input.customPrompt = req.customPrompt;
  }
  if (req.sizing) {
    input.category = req.sizing.category;
    input.productTitle = req.sizing.productTitle;
    input.productDescription = req.sizing.productDescription;
    input.productMaterial = req.sizing.productMaterial;
    input.fitInfo = req.sizing.fitInfo;
    input.silhouetteContext = req.sizing.silhouetteContext;
  }
  return input;
}

export function buildSuccessHistoryEntry(args: {
  result: TryOnRunResult;
  startedAt: number;
  prompt: string;
  promptKind: "default" | "custom" | "n/a";
  modelId: TryOnModelId;
}): HistoryEntry {
  return {
    id: args.result.jobId,
    startedAt: args.startedAt,
    totalMs: args.result.timings.totalMs ?? 0,
    ackMs: args.result.timings.ackMs,
    generationMs: args.result.timings.generationMs,
    promptPreview: previewPrompt(args.prompt),
    promptKind: args.promptKind,
    modelId: args.modelId,
    imageUrl: args.result.imageUrl,
    status: "done",
    errorMessage: null,
  };
}

export function buildErrorHistoryEntry(args: {
  startedAt: number;
  endedAt: number;
  prompt: string;
  promptKind: "default" | "custom" | "n/a";
  modelId: TryOnModelId;
  errorMessage: string;
}): HistoryEntry {
  return {
    id: `error-${args.startedAt}`,
    startedAt: args.startedAt,
    totalMs: args.endedAt - args.startedAt,
    ackMs: null,
    generationMs: null,
    promptPreview: previewPrompt(args.prompt),
    promptKind: args.promptKind,
    modelId: args.modelId,
    imageUrl: null,
    status: "error",
    errorMessage: args.errorMessage,
  };
}

export function emptyTimings(): TryOnRunTimings {
  return { ackMs: null, generationMs: null, totalMs: null };
}

function previewPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 80).trim()}…`;
}
