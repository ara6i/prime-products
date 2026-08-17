import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AiStylistBatchProgress,
  AiStylistGeminiBatchProgress,
  AiStylistGeminiBatchSample,
  AiStylistLunaBatchProgress,
} from "../types";

const GEMINI_ROOT = path.join(
  process.cwd(),
  "output/imagegen/gemini-3-1-flash-image-safe-10-batch",
);
const GEMINI_STATE_PATH = path.join(GEMINI_ROOT, "batch-state.json");
const GEMINI_TRANSPARENT_DIR = path.join(GEMINI_ROOT, "transparent");
const LUNA_STATE_PATH = path.join(
  process.cwd(),
  "output/reports/luna-20-batch-live-status.json",
);

interface GeminiOutputState {
  key?: string;
  sequence?: number;
  transparentPath?: string;
  representative?: {
    title?: string;
    scenarioId?: string;
    slot?: string;
    normalizedColor?: string;
  };
}

interface GeminiState {
  state?: string;
  model?: string;
  batchName?: string;
  requestCount?: number;
  reusedCount?: number;
  succeeded?: number;
  failed?: number;
  totalReadySources?: number;
  elapsedSeconds?: number;
  estimatedBatchCostUsd?: number;
  finishedAt?: string;
  failures?: Array<{ error?: string }>;
  outputs?: GeminiOutputState[];
}

type LunaState = Partial<AiStylistLunaBatchProgress>;

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function countTransparentFiles(): Promise<number> {
  try {
    const files = await readdir(GEMINI_TRANSPARENT_DIR);
    return files.filter((file) => /^safe10-\d+\.png$/u.test(file)).length;
  } catch {
    return 0;
  }
}

function geminiStatus(
  state: GeminiState | null,
  transparentSaved: number,
): AiStylistGeminiBatchProgress["status"] {
  if (!state?.batchName) return "preparing";
  if (state.state === "JOB_STATE_FAILED" || state.state === "JOB_STATE_CANCELLED") {
    return "failed";
  }
  if (state.state !== "JOB_STATE_SUCCEEDED") return "running";
  if (!state.finishedAt) return "post-processing";
  if ((state.failed ?? 0) > 0) return "partial";
  return transparentSaved >= (state.succeeded ?? 0) ? "complete" : "post-processing";
}

function selectGeminiSamples(outputs: GeminiOutputState[]): AiStylistGeminiBatchSample[] {
  if (outputs.length === 0) return [];
  const indexes = Array.from({ length: Math.min(6, outputs.length) }, (_, index) =>
    Math.round((index * (outputs.length - 1)) / Math.max(1, Math.min(6, outputs.length) - 1)),
  );

  return indexes.flatMap((index) => {
    const output = outputs[index];
    const filename = output?.transparentPath
      ? path.basename(output.transparentPath)
      : output?.sequence
        ? `safe10-${String(output.sequence).padStart(3, "0")}.png`
        : null;
    if (!output?.key || !filename || !/^safe10-\d+\.png$/u.test(filename)) return [];

    return [{
      key: output.key,
      title: output.representative?.title ?? "Refined garment",
      scenarioId: output.representative?.scenarioId ?? "Safe 10",
      slot: output.representative?.slot ?? "garment",
      color: output.representative?.normalizedColor ?? "",
      imageUrl: `/api/try-on-test/ai-stylist/batch-progress/image/${filename}`,
    }];
  });
}

function normalizeLunaState(state: LunaState | null): AiStylistLunaBatchProgress {
  return {
    updatedAt: state?.updatedAt ?? null,
    phase: state?.phase ?? "waiting-for-status",
    status: state?.status ?? "preparing",
    targetScenarios: state?.targetScenarios ?? 254,
    batchJobsTotal: state?.batchJobsTotal ?? 20,
    batchJobsSubmitted: state?.batchJobsSubmitted ?? 0,
    batchJobsRunning: state?.batchJobsRunning ?? 0,
    requestsTotal: state?.requestsTotal ?? 254,
    requestsCompleted: state?.requestsCompleted ?? 0,
    requestsFailed: state?.requestsFailed ?? 0,
    scenariosCommitted: state?.scenariosCommitted ?? 0,
    scenariosBlocked: state?.scenariosBlocked ?? 0,
    uniqueProductsClaimed: state?.uniqueProductsClaimed ?? 265,
    duplicateNonExemptProducts: state?.duplicateNonExemptProducts ?? 0,
    estimatedCostUsd: state?.estimatedCostUsd ?? null,
    message: state?.message ?? "Waiting for the Luna Batch status snapshot.",
    batchIds: Array.isArray(state?.batchIds) ? state.batchIds : [],
  };
}

export async function getAiStylistBatchProgress(): Promise<AiStylistBatchProgress> {
  const [geminiState, lunaState, transparentSaved] = await Promise.all([
    readJson<GeminiState>(GEMINI_STATE_PATH),
    readJson<LunaState>(LUNA_STATE_PATH),
    countTransparentFiles(),
  ]);
  const submitted = geminiState?.requestCount ?? 0;
  const reused = geminiState?.reusedCount ?? 0;
  const succeeded = geminiState?.succeeded ?? 0;
  const failed = geminiState?.failed ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    manualRefreshOnly: true,
    gemini: {
      status: geminiStatus(geminiState, transparentSaved),
      providerState: geminiState?.state ?? "NOT_SUBMITTED",
      model: geminiState?.model ?? "gemini-3.1-flash-image",
      batchName: geminiState?.batchName ?? null,
      submitted,
      succeeded,
      failed,
      reused,
      uniqueSources: submitted + reused,
      transparentSaved,
      readySources: geminiState?.totalReadySources ?? succeeded + reused,
      duplicateRegenerations: 0,
      elapsedSeconds: geminiState?.elapsedSeconds ?? null,
      estimatedCostUsd: geminiState?.estimatedBatchCostUsd ?? null,
      finishedAt: geminiState?.finishedAt ?? null,
      failureMessage: geminiState?.failures?.[0]?.error ?? null,
      samples: selectGeminiSamples(geminiState?.outputs ?? []),
    },
    luna: normalizeLunaState(lunaState),
  };
}

export { GEMINI_TRANSPARENT_DIR };
