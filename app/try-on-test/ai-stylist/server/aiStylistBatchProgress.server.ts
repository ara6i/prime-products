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
const LUNA_V2_SUMMARY_PATH = path.join(
  process.cwd(),
  "output/reports/luna-remaining-79-luna-batch-v2/summary.json",
);
const MANUAL_VISUAL_PROGRESS_PATH = path.join(
  process.cwd(),
  "output/reports/luna-remaining-79-luna-batch-v2/manual-visual-progress.json",
);
const CODEX_MANUAL_VISUAL_PROGRESS_PATH = path.join(
  process.cwd(),
  "output/reports/codex-visual-drafts/manual-visual-progress.json",
);
const GEMINI_79_QUALIFIED_PATH = path.join(
  process.cwd(),
  "output/reports/gemini-79-qualified-products-progress.json",
);
const GEMINI_79_PROVIDER_PATH = path.join(
  process.cwd(),
  "output/reports/gemini-79-atomic-2026-08-18/provider-batches-compact.json",
);
const GEMINI_79_SEED_PATH = path.join(
  process.cwd(),
  "output/reports/gemini-79-atomic-2026-08-18/campaign-seed-proof.json",
);
const SAFE_10_RESERVATION_PATH = path.join(
  process.cwd(),
  "output/reports/luna-safe-10-reservations-2026-08-17/reservation-proof.json",
);
const SAFE_10_PUBLICATION_PATH = path.join(
  process.cwd(),
  "output/reports/luna-safe-10-reservations-2026-08-17/publication-report.json",
);
const CODEX_FINAL_SUMMARY_PATH = path.join(
  process.cwd(),
  "output/reports/codex-ai-stylist-final-summary-2026-08-20.json",
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

interface Gemini79QualifiedState {
  generatedAt?: string;
  visualReportsRecovered?: number;
  providerSucceededInspected?: number;
  provisionalQualifiedProducts?: number;
  scenariosWithProvisionalProducts?: number;
  committedScenarios?: number;
}

interface Gemini79ProviderState {
  batches?: Array<{ round?: number; state?: string }>;
}

interface Gemini79SeedState {
  preservedScenarios?: number;
  targetScenarios?: number;
}

interface Safe10ReservationState {
  counts?: { scenarios?: number };
}

interface Safe10PublicationState {
  apply?: boolean;
  completedScenariosPublished?: number;
}

interface LunaV2Summary {
  generatedAt?: string;
  cancelledByUser?: boolean;
  requestedScenarios?: number;
  succeeded?: number;
  failed?: number;
  activeShards?: number;
  costUsd?: number;
  shards?: Array<{ batchId?: string | null; scenarioId?: string; succeeded?: number }>;
}

interface ManualVisualProgress {
  completedScenarioIds?: string[];
}

interface CodexFinalSummary {
  generatedAt?: string;
  scenarioUniverse?: number;
  scenariosComplete?: number;
  scenariosRemaining?: number;
  savedOutfits?: number;
  itemReferences?: number;
  uniqueProductsUsed?: number;
  uniqueImageKeys?: number;
  refinedUniqueImageKeys?: number;
  unrefinedUniqueImageKeys?: number;
  actualBatchCostUsd?: number;
  originalMerchantImagesChanged?: number;
  unresolvedReason?: string;
}

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

function normalizeLunaState(
  state: LunaState | null,
  v2Summary: LunaV2Summary | null,
  qualified: Gemini79QualifiedState | null,
  provider: Gemini79ProviderState | null,
  seed: Gemini79SeedState | null,
  safe10: Safe10ReservationState | null,
  safe10Publication: Safe10PublicationState | null,
  manualVisual: ManualVisualProgress | null,
): AiStylistLunaBatchProgress {
  const currentProviderJobs = (provider?.batches ?? []).filter(
    (batch) => Number(batch.round ?? 0) >= 16,
  );
  const providerJobsRunning = currentProviderJobs.filter(
    (batch) => batch.state === "JOB_STATE_RUNNING",
  ).length;
  const providerResponsesRecovered = qualified?.providerSucceededInspected ?? 0;
  const hasGemini79Progress = Boolean(qualified?.generatedAt);
  const preservedScenarios = seed?.preservedScenarios ?? 0;
  const campaignScenarios = seed?.targetScenarios ?? (hasGemini79Progress ? 79 : 0);
  const safe10Scenarios = safe10?.counts?.scenarios ?? 0;
  const safe10Published = safe10Publication?.apply
    ? safe10Publication.completedScenariosPublished ?? 0
    : 0;
  const reservedOnlyScenarios = Math.max(0, safe10Scenarios - safe10Published);
  const scenarioUniverse = preservedScenarios + campaignScenarios + safe10Scenarios;
  const baselineCompletedScenarios = preservedScenarios + safe10Published;
  const scenariosComplete = baselineCompletedScenarios;
  if (v2Summary) {
    const requested = v2Summary.requestedScenarios ?? 79;
    const succeeded = v2Summary.succeeded ?? 0;
    const failed = v2Summary.failed ?? 0;
    const lunaSucceededScenarioIds = new Set(
      (v2Summary.shards ?? [])
        .filter((shard) => Number(shard.succeeded ?? 0) > 0)
        .map((shard) => String(shard.scenarioId ?? ""))
        .filter(Boolean),
    );
    const manualVisualScenarioIds = [...new Set(manualVisual?.completedScenarioIds ?? [])]
      .filter((scenarioId) => !lunaSucceededScenarioIds.has(scenarioId));
    const manualVisualCompleted = manualVisualScenarioIds.length;
    const totalSavedDrafts = succeeded + manualVisualCompleted;
    const batchIds = (v2Summary.shards ?? [])
      .map((shard) => shard.batchId)
      .filter((batchId): batchId is string => Boolean(batchId));
    return {
      updatedAt: v2Summary.generatedAt ?? state?.updatedAt ?? null,
      phase: "luna-draft-batch",
      status: v2Summary.cancelledByUser
        ? "cancelled"
        : failed > 0 && succeeded + failed >= requested
        ? "partial"
        : succeeded >= requested
          ? "complete"
          : "running",
      scenarioUniverse: scenarioUniverse || 264,
      scenariosComplete: Math.min(scenarioUniverse || 264, baselineCompletedScenarios + totalSavedDrafts),
      scenariosRemaining: Math.max(0, (scenarioUniverse || 264) - baselineCompletedScenarios - totalSavedDrafts),
      scenariosReservedOnly: reservedOnlyScenarios,
      targetScenarios: requested,
      batchJobsTotal: requested,
      batchJobsSubmitted: batchIds.length,
      batchJobsRunning: v2Summary.activeShards ?? 0,
      requestsTotal: requested,
      requestsCompleted: succeeded,
      requestsFailed: failed,
      scenariosCommitted: totalSavedDrafts,
      scenariosBlocked: failed,
      uniqueProductsClaimed: state?.uniqueProductsClaimed ?? 265,
      qualifiedProductsSaved: qualified?.provisionalQualifiedProducts ?? 0,
      scenariosWithQualifiedProducts: qualified?.scenariosWithProvisionalProducts ?? 0,
      visualReportsRecovered: qualified?.visualReportsRecovered ?? 0,
      providerResponsesRecovered: succeeded,
      providerJobsRunning: v2Summary.activeShards ?? 0,
      duplicateNonExemptProducts: 0,
      estimatedCostUsd: v2Summary.costUsd ?? null,
      message: v2Summary.cancelledByUser
        ? `Luna Batch was cancelled by the user. ${succeeded} Luna drafts plus ${manualVisualCompleted} local visual draft${manualVisualCompleted === 1 ? "" : "s"} are saved (${totalSavedDrafts} of ${requested}); Gemini image refinement is separate.`
        : `${succeeded} Luna drafts plus ${manualVisualCompleted} local visual draft${manualVisualCompleted === 1 ? "" : "s"} saved (${totalSavedDrafts} of ${requested}). Gemini image refinement is a separate Batch step.`,
      batchIds,
    };
  }
  return {
    updatedAt: qualified?.generatedAt ?? state?.updatedAt ?? null,
    phase: hasGemini79Progress ? "qualified-products-saving" : state?.phase ?? "waiting-for-status",
    status: hasGemini79Progress ? "running" : state?.status ?? "preparing",
    scenarioUniverse: scenarioUniverse || state?.targetScenarios || 264,
    scenariosComplete,
    scenariosRemaining: Math.max(0, scenarioUniverse - scenariosComplete),
    scenariosReservedOnly: reservedOnlyScenarios,
    targetScenarios: hasGemini79Progress ? 79 : state?.targetScenarios ?? 254,
    batchJobsTotal: hasGemini79Progress ? currentProviderJobs.length : state?.batchJobsTotal ?? 20,
    batchJobsSubmitted: hasGemini79Progress ? currentProviderJobs.length : state?.batchJobsSubmitted ?? 0,
    batchJobsRunning: hasGemini79Progress ? providerJobsRunning : state?.batchJobsRunning ?? 0,
    requestsTotal: hasGemini79Progress ? 79 : state?.requestsTotal ?? 254,
    requestsCompleted: hasGemini79Progress ? providerResponsesRecovered : state?.requestsCompleted ?? 0,
    requestsFailed: state?.requestsFailed ?? 0,
    scenariosCommitted: qualified?.committedScenarios ?? state?.scenariosCommitted ?? 0,
    scenariosBlocked: state?.scenariosBlocked ?? 0,
    uniqueProductsClaimed: state?.uniqueProductsClaimed ?? 265,
    qualifiedProductsSaved: qualified?.provisionalQualifiedProducts ?? 0,
    scenariosWithQualifiedProducts: qualified?.scenariosWithProvisionalProducts ?? 0,
    visualReportsRecovered: qualified?.visualReportsRecovered ?? 0,
    providerResponsesRecovered,
    providerJobsRunning,
    duplicateNonExemptProducts: state?.duplicateNonExemptProducts ?? 0,
    estimatedCostUsd: state?.estimatedCostUsd ?? null,
    message: hasGemini79Progress
      ? `${qualified?.provisionalQualifiedProducts ?? 0} qualified products are saved immediately across ${qualified?.scenariosWithProvisionalProducts ?? 0} scenarios. Full 10-outfit scenario claims remain separate.`
      : state?.message ?? "Waiting for the Luna Batch status snapshot.",
    batchIds: Array.isArray(state?.batchIds) ? state.batchIds : [],
  };
}

export async function getAiStylistBatchProgress(): Promise<AiStylistBatchProgress> {
  const [
    geminiState,
    lunaState,
    lunaV2Summary,
    manualVisual,
    codexManualVisual,
    gemini79Qualified,
    gemini79Provider,
    gemini79Seed,
    safe10Reservation,
    safe10Publication,
    codexFinalSummary,
    transparentSaved,
  ] = await Promise.all([
    readJson<GeminiState>(GEMINI_STATE_PATH),
    readJson<LunaState>(LUNA_STATE_PATH),
    readJson<LunaV2Summary>(LUNA_V2_SUMMARY_PATH),
    readJson<ManualVisualProgress>(MANUAL_VISUAL_PROGRESS_PATH),
    readJson<ManualVisualProgress>(CODEX_MANUAL_VISUAL_PROGRESS_PATH),
    readJson<Gemini79QualifiedState>(GEMINI_79_QUALIFIED_PATH),
    readJson<Gemini79ProviderState>(GEMINI_79_PROVIDER_PATH),
    readJson<Gemini79SeedState>(GEMINI_79_SEED_PATH),
    readJson<Safe10ReservationState>(SAFE_10_RESERVATION_PATH),
    readJson<Safe10PublicationState>(SAFE_10_PUBLICATION_PATH),
    readJson<CodexFinalSummary>(CODEX_FINAL_SUMMARY_PATH),
    countTransparentFiles(),
  ]);
  const submitted = geminiState?.requestCount ?? 0;
  const reused = geminiState?.reusedCount ?? 0;
  const succeeded = geminiState?.succeeded ?? 0;
  const failed = geminiState?.failed ?? 0;

  const mergedManualVisual: ManualVisualProgress = {
    completedScenarioIds: [
      ...new Set([
        ...(manualVisual?.completedScenarioIds ?? []),
        ...(codexManualVisual?.completedScenarioIds ?? []),
      ]),
    ],
  };

  const base: AiStylistBatchProgress = {
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
    luna: normalizeLunaState(
      lunaState,
      lunaV2Summary,
      gemini79Qualified,
      gemini79Provider,
      gemini79Seed,
      safe10Reservation,
      safe10Publication,
      mergedManualVisual,
    ),
  };

  if (!codexFinalSummary) return base;

  const scenarioUniverse = codexFinalSummary.scenarioUniverse ?? base.luna.scenarioUniverse;
  const scenariosComplete = codexFinalSummary.scenariosComplete ?? base.luna.scenariosComplete;
  const scenariosRemaining = codexFinalSummary.scenariosRemaining ?? Math.max(0, scenarioUniverse - scenariosComplete);
  const refinedUniqueImageKeys = codexFinalSummary.refinedUniqueImageKeys ?? base.gemini.succeeded;
  const unrefinedUniqueImageKeys = codexFinalSummary.unrefinedUniqueImageKeys ?? base.gemini.failed;
  const uniqueImageKeys = codexFinalSummary.uniqueImageKeys ?? refinedUniqueImageKeys + unrefinedUniqueImageKeys;

  return {
    ...base,
    gemini: {
      ...base.gemini,
      status: unrefinedUniqueImageKeys > 0 ? "partial" : "complete",
      providerState: "FINAL_AUDIT",
      model: "gemini-3.1-flash-image",
      submitted: uniqueImageKeys,
      succeeded: refinedUniqueImageKeys,
      failed: unrefinedUniqueImageKeys,
      reused: 0,
      uniqueSources: uniqueImageKeys,
      transparentSaved: refinedUniqueImageKeys,
      readySources: refinedUniqueImageKeys,
      estimatedCostUsd: codexFinalSummary.actualBatchCostUsd ?? base.gemini.estimatedCostUsd,
      finishedAt: codexFinalSummary.generatedAt ?? base.gemini.finishedAt,
      failureMessage: codexFinalSummary.unresolvedReason ?? base.gemini.failureMessage,
    },
    luna: {
      ...base.luna,
      updatedAt: codexFinalSummary.generatedAt ?? base.luna.updatedAt,
      status: "complete",
      scenarioUniverse,
      scenariosComplete,
      scenariosRemaining,
      scenariosCommitted: scenariosComplete,
      uniqueProductsClaimed:
        codexFinalSummary.uniqueProductsUsed ?? base.luna.uniqueProductsClaimed,
      qualifiedProductsSaved:
        codexFinalSummary.itemReferences ?? base.luna.qualifiedProductsSaved,
      scenariosWithQualifiedProducts: scenariosComplete,
      message: `${scenariosComplete} scenarios are saved with exactly 10 outfits each. ${codexFinalSummary.savedOutfits ?? scenariosComplete * 10} outfits and ${codexFinalSummary.itemReferences ?? 0} product placements are linked; ${unrefinedUniqueImageKeys} images remain unresolved.`,
    },
  };
}

export { GEMINI_TRANSPARENT_DIR };
