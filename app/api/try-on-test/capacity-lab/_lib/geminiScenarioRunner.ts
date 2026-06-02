import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { CapacityScenarioId, CapacityTargetId } from "@/app/try-on-test/capacity-lab/types";
import type { TryOnModelId } from "@/app/try-on-test/lib/models";
import {
  SDK_REAL_ROUTE_PREFIX,
  SHOPIFY_LEGACY_ROUTE_PREFIX,
  SHOPIFY_V2_ROUTE_PREFIX,
  getServerTarget,
} from "./capacityTargets";

interface ScenarioResult {
  status: number;
  ok: boolean;
  body: string;
}

export interface GeminiScenarioProgress {
  stage: string;
  status?: "running" | "completed" | "failed";
  jobId?: string | null;
  recommendedSize?: string | null;
  backendStage?: string | null;
  pollCount?: number;
  detail?: string | null;
}

type ProgressReporter = (progress: GeminiScenarioProgress) => void;

interface JsonResponse {
  status: number;
  ok: boolean;
  body: string;
  data: unknown;
}

interface StageSummary {
  name: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

interface SdkSizingContext {
  sessionId: string;
  recommendedSize: string;
  fitInfo: FitAreaInfo[];
  silhouetteContext: Record<string, string>;
  modelImage: string;
}

interface FitAreaInfo {
  area: string;
  fit: "good" | "tight" | "loose" | "a-bit-tight" | "a-bit-loose" | "too-tight" | "too-loose";
  userValue?: number;
  garmentRange?: string;
  y?: number;
  x1?: number;
  x2?: number;
}

const SAMPLE_PERSON_PATH = "shopify/FAT-GUY-NO-HAT-NO-GLASSES (1).png";
const SAMPLE_GARMENT_PATH = "shopify/1-TMW_3BY1_10_TOMMY_HILFIGER_2_PIECE_TUXEDO_FORMAL_BLACK_ALT6 (1).jpg";
const STATUS_POLL_INTERVAL_MS = 2_000;
const SDK_FALLBACK_POLL_INTERVAL_MS = 3_000;
const SHOPIFY_FALLBACK_POLL_INTERVAL_MS = 3_000;

let cachedSdkPersonDataUri: string | null = null;
let cachedAgeCheckPersonDataUri: string | null = null;
let cachedGarmentDataUri: string | null = null;

export async function executeGeminiScenario(
  scenarioId: CapacityScenarioId,
  targetId: CapacityTargetId,
  tryOnModel: TryOnModelId,
  signal: AbortSignal,
  onProgress?: ProgressReporter,
): Promise<ScenarioResult> {
  if (scenarioId === "sdk-real-route-clone") return executeFullSdkJourneySseScenario(targetId, tryOnModel, signal, onProgress, {
    apiPrefix: SDK_REAL_ROUTE_PREFIX,
    message: "SDK real route clone journey completed.",
  });
  if (scenarioId === "shopify-real-route-clone") return executeFullShopifyRealRouteScenario(targetId, tryOnModel, signal, onProgress);
  throw new Error(`Unsafe or unsupported capacity stress scenario: ${scenarioId}`);
}

async function executeFullSdkJourneySseScenario(
  targetId: CapacityTargetId,
  tryOnModel: TryOnModelId,
  signal: AbortSignal,
  onProgress?: ProgressReporter,
  options: { apiPrefix?: string; message?: string } = {},
): Promise<ScenarioResult> {
  const baseUrl = getBaseUrl(targetId);
  const headers = getJsonHeaders(targetId);
  const stages: StageSummary[] = [];
  const sessionId = createSdkSessionId();

  const sizing = await runSdkSizingResultFlow({ baseUrl, headers, sessionId, stages, signal, onProgress, apiPrefix: options.apiPrefix });
  if (!sizing.ok) return sizing.result;

  const tryOn = await runSdkTryOnSseFlow({ targetId, baseUrl, headers, stages, signal, context: sizing.context, tryOnModel, onProgress, apiPrefix: options.apiPrefix });
  if (!tryOn.ok) return buildFlowResult(false, tryOn.status, stages, tryOn.body);

  return buildFlowResult(true, 200, stages, JSON.stringify({
    message: options.message ?? "Exact SDK journey completed.",
    recommendedSize: sizing.context.recommendedSize,
	    tryOnModel,
	    jobId: tryOn.jobId,
	    imageUrl: tryOn.imageUrl,
	    imageBytes: tryOn.imageBytes ?? null,
	    imageDelivery: tryOn.delivery,
    profileEstimate: "not run separately; SDK stores inline estimates from sizing response",
  }));
}

async function executeFullShopifyRealRouteScenario(
  targetId: CapacityTargetId,
  tryOnModel: TryOnModelId,
  signal: AbortSignal,
  onProgress?: ProgressReporter,
): Promise<ScenarioResult> {
  const baseUrl = getBaseUrl(targetId);
  const headers = getShopifyJsonHeaders(targetId);
  const stages: StageSummary[] = [];
  const sessionId = createSdkSessionId();
  const shopDomain = getShopifyShopDomain(targetId);

  const sizing = await runShopifySizingResultFlow({ baseUrl, headers, sessionId, shopDomain, stages, signal, onProgress });
  if (!sizing.ok) return sizing.result;

  const tryOn = await runShopifyTryOnFlow({ baseUrl, headers, stages, signal, context: sizing.context, shopDomain, onProgress });
  if (!tryOn.ok) return buildFlowResult(false, tryOn.status, stages, tryOn.body);

  return buildFlowResult(true, 200, stages, JSON.stringify({
    message: "Shopify real route clone journey completed.",
    recommendedSize: sizing.context.recommendedSize,
    tryOnModel,
    jobId: tryOn.jobId,
    imageUrl: tryOn.imageUrl,
    imageDelivery: tryOn.delivery,
    shopDomain,
    note: "Current real Shopify try-on route does not accept fitInfo or model override; sizing is still run first for exact storefront journey coverage.",
  }));
}

async function runShopifySizingResultFlow(input: {
  baseUrl: string;
  headers: Record<string, string>;
  sessionId: string;
  shopDomain: string;
  stages: StageSummary[];
  signal: AbortSignal;
  onProgress?: ProgressReporter;
}): Promise<{ ok: true; context: SdkSizingContext } | { ok: false; result: ScenarioResult }> {
  const bodyImage = await getSdkPersonDataUri();
  const ageCheckImage = await getAgeCheckPersonDataUri();

  const ageCheck = await postStage({
    name: "shopify.photo.age-check",
    url: `${input.baseUrl}${SHOPIFY_V2_ROUTE_PREFIX}/sizing/age-check`,
    headers: input.headers,
    body: { bodyImage: ageCheckImage },
    stages: input.stages,
    signal: input.signal,
    onProgress: input.onProgress,
  });
  if (!ageCheck.ok) return { ok: false, result: buildFlowResult(false, ageCheck.status, input.stages, ageCheck.body) };

  const recommend = await postStage({
    name: "shopify.sizing.recommend.photo",
    url: `${input.baseUrl}${SHOPIFY_V2_ROUTE_PREFIX}/sizing/recommend`,
    headers: input.headers,
    body: {
      ...buildSdkPhotoRecommendPayload(input.sessionId, bodyImage),
      shopDomain: input.shopDomain,
    },
    stages: input.stages,
    signal: input.signal,
    onProgress: input.onProgress,
  });
  if (!recommend.ok) return { ok: false, result: buildFlowResult(false, recommend.status, input.stages, recommend.body) };

  const recommendedSize = getStringField(recommend.data, "recommendedSize");
  if (!recommendedSize) {
    return {
      ok: false,
      result: buildFlowResult(false, 502, input.stages, `Shopify sizing response did not include recommendedSize: ${recommend.body.slice(0, 220)}`),
    };
  }
  input.onProgress?.({
    stage: "shopify.sizing.result-ready",
    status: "completed",
    recommendedSize,
    detail: `recommendedSize=${recommendedSize}`,
  });

  return {
    ok: true,
    context: {
      sessionId: input.sessionId,
      recommendedSize,
      fitInfo: buildFitInfoFromSizingResult(recommend.data),
      silhouetteContext: buildSilhouetteContextFromSizingResult(recommend.data, recommendedSize),
      modelImage: bodyImage,
    },
  };
}

async function runShopifyTryOnFlow(input: {
  baseUrl: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  signal: AbortSignal;
  context: SdkSizingContext;
  shopDomain: string;
  onProgress?: ProgressReporter;
}): Promise<ScenarioResult & { jobId?: string; imageUrl?: string | null; delivery?: string }> {
  const submit = await submitShopifyTryOnJob(input);
  if (!submit.ok) return toScenarioResult(submit);

  const resultSignal = createLinkedAbortController(input.signal);
  const streamUrl = getStringField(submit.data, "streamUrl");
  const streamPromise = streamUrl
    ? waitForShopifyTryOnStreamResult({
        baseUrl: input.baseUrl,
        streamUrl,
        stages: input.stages,
        signal: resultSignal.signal,
        jobId: submit.jobId,
        recommendedSize: input.context.recommendedSize,
        onProgress: input.onProgress,
      }).then((result) => {
        if (!result.ok) throw new Error(result.body);
        return { result, delivery: "shopify returned per-job SSE stream" };
      })
    : Promise.reject(new Error("Shopify try-on submit did not return streamUrl"));

  const fallbackPollPromise = pollShopifyTryOnStatus({
    baseUrl: input.baseUrl,
    headers: input.headers,
    stages: input.stages,
    jobId: submit.jobId,
    shopDomain: input.shopDomain,
    signal: resultSignal.signal,
    onProgress: input.onProgress,
  }).then((result) => {
    if (!result.ok) throw new Error(result.body);
    return { result, delivery: "fallback legacy Shopify status polling" };
  });

  let winner: { result: ScenarioResult & { data?: unknown }; delivery: string };
  try {
    winner = await Promise.any([streamPromise, fallbackPollPromise]);
  } catch (err) {
    if (input.signal.aborted) throw new DOMException("Request aborted", "AbortError");
    const message = err instanceof AggregateError
      ? err.errors.map((item) => item instanceof Error ? item.message : String(item)).join(" | ")
      : err instanceof Error
        ? err.message
        : "Shopify stream and fallback polling both failed";
    return {
      status: 502,
      ok: false,
      body: message.slice(0, 500),
    };
  } finally {
    resultSignal.abort();
  }

  return {
    ...winner.result,
    jobId: submit.jobId,
    imageUrl: getNullableStringField(winner.result.data, "imageUrl"),
    delivery: winner.delivery,
  };
}

async function submitShopifyTryOnJob(input: {
  baseUrl: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  signal: AbortSignal;
  context: SdkSizingContext;
  shopDomain: string;
  onProgress?: ProgressReporter;
}): Promise<JsonResponse & { jobId: string }> {
  const submit = await postStage({
    name: "shopify.tryon.submit",
    url: `${input.baseUrl}${SHOPIFY_LEGACY_ROUTE_PREFIX}/tryon`,
    headers: input.headers,
    body: buildShopifyTryOnPayload(input.context, input.shopDomain),
    stages: input.stages,
    signal: input.signal,
    onProgress: input.onProgress,
  });
  if (!submit.ok) return { ...submit, jobId: "" };

  const jobId = getStringField(submit.data, "jobId");
  if (!jobId) {
    return {
      status: 502,
      ok: false,
      body: `Shopify try-on submit did not return a jobId: ${submit.body.slice(0, 180)}`,
      data: submit.data,
      jobId: "",
    };
  }
  input.onProgress?.({
    stage: "shopify.tryon.submitted",
    status: "completed",
    jobId,
    recommendedSize: input.context.recommendedSize,
    detail: `jobId=${jobId}`,
  });

  return {
    ...submit,
    jobId,
  };
}

async function executeFullSdkJourneyJobStreamScenario(
  targetId: CapacityTargetId,
  tryOnModel: TryOnModelId,
  signal: AbortSignal,
  onProgress?: ProgressReporter,
  options: { apiPrefix?: string; message?: string } = {},
): Promise<ScenarioResult> {
  const baseUrl = getBaseUrl(targetId);
  const headers = getJsonHeaders(targetId);
  const stages: StageSummary[] = [];
  const sessionId = createSdkSessionId();

  const apiPrefix = options.apiPrefix ?? SDK_REAL_ROUTE_PREFIX;
  const sizing = await runSdkSizingResultFlow({ baseUrl, headers, sessionId, stages, signal, onProgress, apiPrefix });
  if (!sizing.ok) return sizing.result;

  const tryOn = await runSdkTryOnJobStreamFlow({ targetId, baseUrl, headers, stages, signal, context: sizing.context, tryOnModel, onProgress, apiPrefix });
  if (!tryOn.ok) return buildFlowResult(false, tryOn.status, stages, tryOn.body);

  return buildFlowResult(true, 200, stages, JSON.stringify({
    message: options.message ?? "SDK worker experiment journey completed.",
    recommendedSize: sizing.context.recommendedSize,
	    tryOnModel,
	    jobId: tryOn.jobId,
	    imageUrl: tryOn.imageUrl,
	    imageBytes: tryOn.imageBytes ?? null,
	    imageDelivery: tryOn.delivery,
	    profileEstimate: "not run separately; SDK stores inline estimates from sizing response",
  }));
}

async function runSdkSizingResultFlow(input: {
  baseUrl: string;
  headers: Record<string, string>;
  sessionId: string;
  stages: StageSummary[];
  signal: AbortSignal;
  onProgress?: ProgressReporter;
  apiPrefix?: string;
}): Promise<{ ok: true; context: SdkSizingContext } | { ok: false; result: ScenarioResult }> {
  const bodyImage = await getSdkPersonDataUri();
  const ageCheckImage = await getAgeCheckPersonDataUri();
  const apiPrefix = input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX;

  const ageCheck = await postStage({
    name: "sdk.photo.age-check",
    url: `${input.baseUrl}${apiPrefix}/sizing/age-check`,
    headers: input.headers,
    body: { bodyImage: ageCheckImage },
    stages: input.stages,
    signal: input.signal,
    onProgress: input.onProgress,
  });
  if (!ageCheck.ok) return { ok: false, result: buildFlowResult(false, ageCheck.status, input.stages, ageCheck.body) };

  const recommend = await postStage({
    name: "sdk.sizing.recommend.photo",
    url: `${input.baseUrl}${apiPrefix}/sizing/recommend`,
    headers: input.headers,
    body: buildSdkPhotoRecommendPayload(input.sessionId, bodyImage),
    stages: input.stages,
    signal: input.signal,
    onProgress: input.onProgress,
  });
  if (!recommend.ok) return { ok: false, result: buildFlowResult(false, recommend.status, input.stages, recommend.body) };

  const recommendedSize = getStringField(recommend.data, "recommendedSize");
  if (!recommendedSize) {
    return {
      ok: false,
      result: buildFlowResult(false, 502, input.stages, `SDK sizing response did not include recommendedSize: ${recommend.body.slice(0, 220)}`),
    };
  }
  input.onProgress?.({
    stage: "sdk.sizing.result-ready",
    status: "completed",
    recommendedSize,
    detail: `recommendedSize=${recommendedSize}`,
  });

  return {
    ok: true,
    context: {
      sessionId: input.sessionId,
      recommendedSize,
      fitInfo: buildFitInfoFromSizingResult(recommend.data),
      silhouetteContext: buildSilhouetteContextFromSizingResult(recommend.data, recommendedSize),
      modelImage: bodyImage,
    },
  };
}

async function runSdkTryOnSseFlow(input: {
  targetId: CapacityTargetId;
  baseUrl: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  signal: AbortSignal;
  context: SdkSizingContext;
  tryOnModel: TryOnModelId;
  onProgress?: ProgressReporter;
  apiPrefix?: string;
}): Promise<ScenarioResult & { jobId?: string; imageUrl?: string | null; delivery?: string; imageBytes?: number | null }> {
  const submit = await submitSdkTryOnJob(input);
  if (!submit.ok) return toScenarioResult(submit);

  const resultSignal = createLinkedAbortController(input.signal);
  const ssePromise = waitForSdkTryOnSseResult({
    targetId: input.targetId,
    baseUrl: input.baseUrl,
    stages: input.stages,
    signal: resultSignal.signal,
    jobId: submit.jobId,
    recommendedSize: input.context.recommendedSize,
    onProgress: input.onProgress,
    apiPrefix: input.apiPrefix,
  }).then((result) => {
    if (!result.ok) throw new Error(result.body);
    return { result, delivery: "sdk SSE vto-update" };
  });

  const fallbackPollPromise = pollTryOnStatus(
    input.baseUrl,
    input.headers,
    input.stages,
    submit.jobId,
    resultSignal.signal,
    input.onProgress,
    {
      includeImage: true,
      intervalMs: SDK_FALLBACK_POLL_INTERVAL_MS,
      waitStageName: "sdk.tryon.fallback-poll.wait",
      firstPollStageName: "sdk.tryon.fallback-status.first-poll",
      pollStageName: "sdk.tryon.fallback-status.poll",
    },
    input.apiPrefix,
  ).then((result) => {
    if (!result.ok) throw new Error(result.body);
    return { result, delivery: "fallback /status polling" };
  });

  let winner: { result: ScenarioResult & { data?: unknown }; delivery: string };
  try {
    winner = await Promise.any([ssePromise, fallbackPollPromise]);
  } catch (err) {
    if (input.signal.aborted) throw new DOMException("Request aborted", "AbortError");
    const message = err instanceof AggregateError
      ? err.errors.map((item) => item instanceof Error ? item.message : String(item)).join(" | ")
      : err instanceof Error
        ? err.message
        : "SDK SSE and fallback polling both failed";
    return {
      status: 502,
      ok: false,
      body: message.slice(0, 500),
    };
  } finally {
    resultSignal.abort();
  }

  return {
    ...winner.result,
    jobId: submit.jobId,
    imageUrl: getNullableStringField(winner.result.data, "imageUrl"),
    delivery: winner.delivery,
  };
}

async function runSdkTryOnJobStreamFlow(input: {
  targetId: CapacityTargetId;
  baseUrl: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  signal: AbortSignal;
  context: SdkSizingContext;
  tryOnModel: TryOnModelId;
  onProgress?: ProgressReporter;
  apiPrefix?: string;
	}): Promise<ScenarioResult & { jobId?: string; imageUrl?: string | null; delivery?: string; imageBytes?: number | null }> {
  const submit = await submitSdkTryOnJob(input);
  if (!submit.ok) return toScenarioResult(submit);

  const ready = await waitForSdkTryOnJobStreamReady({
    targetId: input.targetId,
    baseUrl: input.baseUrl,
    stages: input.stages,
    signal: input.signal,
    jobId: submit.jobId,
    recommendedSize: input.context.recommendedSize,
    onProgress: input.onProgress,
    apiPrefix: input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX,
  });
  if (!ready.ok) {
    return {
      ...ready,
      jobId: submit.jobId,
      imageUrl: null,
      delivery: "job-scoped SSE failed before result fetch",
    };
  }

  const result = await getBinaryResultStage({
    name: "sdk.tryon.result.fetch",
    url: `${input.baseUrl}${input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX}/tryon/result/${encodeURIComponent(submit.jobId)}`,
    headers: input.headers,
    stages: input.stages,
    signal: input.signal,
    detail: "fetch generated image once after job-scoped SSE completion",
    onProgress: input.onProgress,
  });
  if (!result.ok) {
    return {
      ...toScenarioResult(result),
      jobId: submit.jobId,
      imageUrl: null,
      delivery: "job-scoped SSE + result fetch failed",
    };
  }

	  return {
	    ...toScenarioResult(result),
	    jobId: submit.jobId,
	    imageUrl: null,
	    imageBytes: getNumberField(result.data, "imageBytes"),
	    delivery: "job-scoped SSE + one binary result fetch",
	  };
}

async function submitSdkTryOnJob(input: {
  baseUrl: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  signal: AbortSignal;
  context: SdkSizingContext;
  tryOnModel: TryOnModelId;
  onProgress?: ProgressReporter;
  apiPrefix?: string;
}): Promise<JsonResponse & { jobId: string }> {
  const submit = await postStage({
    name: "sdk.tryon.submit",
    url: `${input.baseUrl}${input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX}/tryon`,
    headers: input.headers,
    body: buildSdkTryOnPayload(input.context, input.tryOnModel),
    stages: input.stages,
    signal: input.signal,
    onProgress: input.onProgress,
  });
  if (!submit.ok) return { ...submit, jobId: "" };

  const jobId = getStringField(submit.data, "jobId");
  if (!jobId) {
    return {
      status: 502,
      ok: false,
      body: `Try-on submit did not return a jobId: ${submit.body.slice(0, 180)}`,
      data: submit.data,
      jobId: "",
    };
  }
  input.onProgress?.({
    stage: "sdk.tryon.submitted",
    status: "completed",
    jobId,
    recommendedSize: input.context.recommendedSize,
    detail: `jobId=${jobId}`,
  });

  return {
    ...submit,
    jobId,
  };
}

async function pollTryOnStatus(
  baseUrl: string,
  headers: Record<string, string>,
  stages: StageSummary[],
  jobId: string,
  signal: AbortSignal,
  onProgress?: ProgressReporter,
  options: {
    includeImage: boolean;
    intervalMs?: number;
    waitStageName?: string;
    firstPollStageName?: string;
    pollStageName?: string;
  } = { includeImage: true },
  apiPrefix = SDK_REAL_ROUTE_PREFIX,
): Promise<ScenarioResult & { data?: unknown }> {
  let polls = 0;
  while (!signal.aborted) {
    onProgress?.({
      stage: options.waitStageName ?? "sdk.tryon.waiting-for-backend",
      status: "running",
      jobId,
      pollCount: polls,
      detail: "waiting before next status poll",
    });
    await sleep(options.intervalMs ?? STATUS_POLL_INTERVAL_MS, signal);
    polls += 1;
    const status = await getStage({
      name: polls === 1
        ? options.firstPollStageName ?? "sdk.tryon.status.first-poll"
        : options.pollStageName ?? "sdk.tryon.status.poll",
      url: `${baseUrl}${apiPrefix}/tryon/status/${encodeURIComponent(jobId)}${options.includeImage ? "" : "?includeImage=false"}`,
      headers,
      stages,
      signal,
      detail: `poll ${polls}`,
      onProgress,
    });
    if (!status.ok) return { ...toScenarioResult(status), data: status.data };

    const state = getStringField(status.data, "status");
    onProgress?.({
      stage: `sdk.tryon.status.${state || "unknown"}`,
      status: state === "completed" ? "completed" : state === "failed" ? "failed" : "running",
      jobId,
      backendStage: getBackendStage(status.data),
      pollCount: polls,
      detail: summarizeResponse(status.data, status.body),
    });
    if (state === "completed") return { ...toScenarioResult(status), data: status.data };
    if (state === "failed") {
      return {
        status: 500,
        ok: false,
        body: `Try-on job failed: ${status.body.slice(0, 220)}`,
        data: status.data,
      };
    }
  }

  throw new DOMException("Request aborted", "AbortError");
}

async function pollShopifyTryOnStatus(input: {
  baseUrl: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  jobId: string;
  shopDomain: string;
  signal: AbortSignal;
  onProgress?: ProgressReporter;
}): Promise<ScenarioResult & { data?: unknown }> {
  let polls = 0;
  while (!input.signal.aborted) {
    input.onProgress?.({
      stage: "shopify.tryon.fallback-poll.wait",
      status: "running",
      jobId: input.jobId,
      pollCount: polls,
      detail: "waiting before next Shopify status poll",
    });
    await sleep(SHOPIFY_FALLBACK_POLL_INTERVAL_MS, input.signal);
    polls += 1;
    const url = new URL(`${SHOPIFY_LEGACY_ROUTE_PREFIX}/tryon/status/${encodeURIComponent(input.jobId)}`, input.baseUrl);
    url.searchParams.set("shopDomain", input.shopDomain);
    const status = await getStage({
      name: polls === 1 ? "shopify.tryon.fallback-status.first-poll" : "shopify.tryon.fallback-status.poll",
      url: url.toString(),
      headers: input.headers,
      stages: input.stages,
      signal: input.signal,
      detail: `poll ${polls}`,
      onProgress: input.onProgress,
    });
    if (!status.ok) return { ...toScenarioResult(status), data: status.data };

    const state = getStringField(status.data, "status");
    input.onProgress?.({
      stage: `shopify.tryon.status.${state || "unknown"}`,
      status: state === "completed" ? "completed" : state === "failed" ? "failed" : "running",
      jobId: input.jobId,
      backendStage: getBackendStage(status.data),
      pollCount: polls,
      detail: summarizeResponse(status.data, status.body),
    });
    if (state === "completed") return { ...toScenarioResult(status), data: status.data };
    if (state === "failed") {
      return {
        status: 500,
        ok: false,
        body: `Shopify try-on job failed: ${status.body.slice(0, 220)}`,
        data: status.data,
      };
    }
  }

  throw new DOMException("Request aborted", "AbortError");
}

async function waitForShopifyTryOnStreamResult(input: {
  baseUrl: string;
  streamUrl: string;
  stages: StageSummary[];
  signal: AbortSignal;
  jobId: string;
  recommendedSize: string;
  onProgress?: ProgressReporter;
}): Promise<ScenarioResult & { data?: unknown }> {
  const streamUrl = normalizeStreamUrl(input.baseUrl, input.streamUrl);
  const connectStartedAt = Date.now();
  input.onProgress?.({
    stage: "shopify.tryon.sse.connect",
    status: "running",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: "/api/v1/tryon/stream/:jobId",
  });

  const response = await fetch(streamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "text/event-stream",
      "User-Agent": "PrimeStyleAI-Capacity-Lab/1.0",
      "x-primestyle-capacity-lab": "true",
    },
    signal: input.signal,
  });

  const connectLatencyMs = Date.now() - connectStartedAt;
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    input.stages.push({
      name: "shopify.tryon.sse.connect",
      status: response.status,
      ok: false,
      latencyMs: connectLatencyMs,
      detail: body.replace(/\s+/g, " ").trim().slice(0, 180) || "Shopify stream failed to connect",
    });
    input.onProgress?.({
      stage: "shopify.tryon.sse.connect",
      status: "failed",
      jobId: input.jobId,
      recommendedSize: input.recommendedSize,
      detail: `stream failed with ${response.status}`,
    });
    return {
      status: response.status || 502,
      ok: false,
      body: body || "Shopify stream failed to connect",
      data: parseJson(body),
    };
  }

  input.stages.push({
    name: "shopify.tryon.sse.connect",
    status: response.status,
    ok: true,
    latencyMs: connectLatencyMs,
    detail: "connected to returned streamUrl",
  });
  input.onProgress?.({
    stage: "shopify.tryon.sse.connected",
    status: "completed",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: "stream connected",
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let seenEvents = 0;
  const waitStartedAt = Date.now();
  input.onProgress?.({
    stage: "shopify.tryon.sse.wait",
    status: "running",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: "waiting for Shopify job stream completion",
  });

  try {
    while (!input.signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });
      let boundaryIndex = findSseBoundary(buffer);
      while (boundaryIndex >= 0) {
        const rawEvent = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(buffer[boundaryIndex] === "\r" ? boundaryIndex + 4 : boundaryIndex + 2);
        boundaryIndex = findSseBoundary(buffer);

        const parsedEvent = parseSseEvent(rawEvent);
        if (!parsedEvent.data) continue;
        seenEvents += 1;
        const payload = parseJson(parsedEvent.data);
        if (!payload || typeof payload !== "object") continue;

        const status = getStringField(payload, "status");
        const imageUrl = getNullableStringField(payload, "imageUrl");
        input.onProgress?.({
          stage: `shopify.tryon.sse.${status || "update"}`,
          status: status === "completed" ? "completed" : status === "failed" ? "failed" : "running",
          jobId: input.jobId,
          recommendedSize: input.recommendedSize,
          detail: summarizeResponse(payload, parsedEvent.data),
        });

        if (status === "completed" && imageUrl) {
          input.stages.push({
            name: "shopify.tryon.sse.completed",
            status: 200,
            ok: true,
            latencyMs: Date.now() - waitStartedAt,
            detail: `events=${seenEvents}, status=completed, imageUrl=yes`,
          });
          await reader.cancel().catch(() => undefined);
          return {
            status: 200,
            ok: true,
            body: JSON.stringify({ ...(payload as Record<string, unknown>), jobId: input.jobId }),
            data: { ...(payload as Record<string, unknown>), jobId: input.jobId },
          };
        }

        if (status === "failed") {
          input.stages.push({
            name: "shopify.tryon.sse.failed",
            status: 500,
            ok: false,
            latencyMs: Date.now() - waitStartedAt,
            detail: `events=${seenEvents}, status=failed`,
          });
          await reader.cancel().catch(() => undefined);
          return {
            status: 500,
            ok: false,
            body: `Shopify try-on SSE failed: ${parsedEvent.data.slice(0, 220)}`,
            data: payload,
          };
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (input.signal.aborted) throw new DOMException("Request aborted", "AbortError");

  input.stages.push({
    name: "shopify.tryon.sse.completed",
    status: 502,
    ok: false,
    latencyMs: Date.now() - waitStartedAt,
    detail: `stream closed before completion; events=${seenEvents}`,
  });
  return {
    status: 502,
    ok: false,
    body: `Shopify stream closed before completion for job ${input.jobId}`,
    data: null,
  };
}

async function waitForSdkTryOnSseResult(input: {
  targetId: CapacityTargetId;
  baseUrl: string;
  stages: StageSummary[];
  signal: AbortSignal;
  jobId: string;
  recommendedSize: string;
  onProgress?: ProgressReporter;
  apiPrefix?: string;
}): Promise<ScenarioResult & { data?: unknown }> {
  const apiPrefix = input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX;
  const streamUrl = buildSdkSseStreamUrl(input.baseUrl, input.targetId, apiPrefix);
  const connectStartedAt = Date.now();
  input.onProgress?.({
    stage: "sdk.tryon.sse.connect",
    status: "running",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: `${apiPrefix}/tryon/stream`,
  });

  const response = await fetch(streamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "text/event-stream",
      "User-Agent": "PrimeStyleAI-Capacity-Lab/1.0",
      "x-primestyle-capacity-lab": "true",
    },
    signal: input.signal,
  });

  const connectLatencyMs = Date.now() - connectStartedAt;
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    input.stages.push({
      name: "sdk.tryon.sse.connect",
      status: response.status,
      ok: false,
      latencyMs: connectLatencyMs,
      detail: body.replace(/\s+/g, " ").trim().slice(0, 180) || "SSE stream failed to connect",
    });
    input.onProgress?.({
      stage: "sdk.tryon.sse.connect",
      status: "failed",
      jobId: input.jobId,
      recommendedSize: input.recommendedSize,
      detail: `stream failed with ${response.status}`,
    });
    return {
      status: response.status || 502,
      ok: false,
      body: body || "SSE stream failed to connect",
      data: parseJson(body),
    };
  }

  input.stages.push({
    name: "sdk.tryon.sse.connect",
    status: response.status,
    ok: true,
    latencyMs: connectLatencyMs,
    detail: `connected to ${apiPrefix}/tryon/stream`,
  });
  input.onProgress?.({
    stage: "sdk.tryon.sse.connected",
    status: "completed",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: "stream connected",
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let seenEvents = 0;
  const waitStartedAt = Date.now();
  input.onProgress?.({
    stage: "sdk.tryon.sse.wait",
    status: "running",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: "waiting for vto-update",
  });

  try {
    while (!input.signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });
      let boundaryIndex = findSseBoundary(buffer);
      while (boundaryIndex >= 0) {
        const rawEvent = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(buffer[boundaryIndex] === "\r" ? boundaryIndex + 4 : boundaryIndex + 2);
        boundaryIndex = findSseBoundary(buffer);

        const parsedEvent = parseSseEvent(rawEvent);
        if (!parsedEvent.data) continue;
        seenEvents += 1;
        const payload = parseJson(parsedEvent.data);
        if (!payload || typeof payload !== "object") continue;

        const galleryId = getStringField(payload, "galleryId");
        const status = getStringField(payload, "status");
        const imageUrl = getNullableStringField(payload, "imageUrl");
        if (!galleryId) {
          input.onProgress?.({
            stage: "sdk.tryon.sse.connected",
            status: "completed",
            jobId: input.jobId,
            recommendedSize: input.recommendedSize,
            detail: summarizeResponse(payload, parsedEvent.data),
          });
          continue;
        }
        if (galleryId !== input.jobId) continue;

        input.onProgress?.({
          stage: `sdk.tryon.sse.${status || "update"}`,
          status: status === "completed" ? "completed" : status === "failed" ? "failed" : "running",
          jobId: input.jobId,
          recommendedSize: input.recommendedSize,
          detail: summarizeResponse(payload, parsedEvent.data),
        });

        if (status === "completed" && imageUrl) {
          input.stages.push({
            name: "sdk.tryon.sse.vto-update",
            status: 200,
            ok: true,
            latencyMs: Date.now() - waitStartedAt,
            detail: `events=${seenEvents}, status=completed, imageUrl=yes`,
          });
          await reader.cancel().catch(() => undefined);
          return {
            status: 200,
            ok: true,
            body: JSON.stringify(payload),
            data: payload,
          };
        }

        if (status === "failed") {
          input.stages.push({
            name: "sdk.tryon.sse.vto-update",
            status: 500,
            ok: false,
            latencyMs: Date.now() - waitStartedAt,
            detail: `events=${seenEvents}, status=failed`,
          });
          await reader.cancel().catch(() => undefined);
          return {
            status: 500,
            ok: false,
            body: `Try-on SSE failed: ${parsedEvent.data.slice(0, 220)}`,
            data: payload,
          };
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (input.signal.aborted) throw new DOMException("Request aborted", "AbortError");

  input.stages.push({
    name: "sdk.tryon.sse.vto-update",
    status: 502,
    ok: false,
    latencyMs: Date.now() - waitStartedAt,
    detail: `stream closed before matching job update; events=${seenEvents}`,
  });
  return {
    status: 502,
    ok: false,
    body: `SSE stream closed before vto-update for job ${input.jobId}`,
    data: null,
  };
}

async function waitForSdkTryOnJobStreamReady(input: {
  targetId: CapacityTargetId;
  baseUrl: string;
  stages: StageSummary[];
  signal: AbortSignal;
  jobId: string;
  recommendedSize: string;
  onProgress?: ProgressReporter;
  apiPrefix?: string;
}): Promise<ScenarioResult & { data?: unknown }> {
  const streamUrl = buildSdkJobSseStreamUrl(input.baseUrl, input.targetId, input.jobId, input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX);
  const connectStartedAt = Date.now();
  input.onProgress?.({
    stage: "sdk.tryon.job-sse.connect",
    status: "running",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: `${input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX}/tryon/stream?jobId=...`,
  });

  const response = await fetch(streamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "text/event-stream",
      "User-Agent": "PrimeStyleAI-Capacity-Lab/1.0",
      "x-primestyle-capacity-lab": "true",
    },
    signal: input.signal,
  });

  const connectLatencyMs = Date.now() - connectStartedAt;
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    input.stages.push({
      name: "sdk.tryon.job-sse.connect",
      status: response.status,
      ok: false,
      latencyMs: connectLatencyMs,
      detail: body.replace(/\s+/g, " ").trim().slice(0, 180) || "Job SSE stream failed to connect",
    });
    input.onProgress?.({
      stage: "sdk.tryon.job-sse.connect",
      status: "failed",
      jobId: input.jobId,
      recommendedSize: input.recommendedSize,
      detail: `job stream failed with ${response.status}`,
    });
    return {
      status: response.status || 502,
      ok: false,
      body: body || "Job SSE stream failed to connect",
      data: parseJson(body),
    };
  }

  input.stages.push({
    name: "sdk.tryon.job-sse.connect",
    status: response.status,
    ok: true,
    latencyMs: connectLatencyMs,
    detail: `connected to ${input.apiPrefix ?? SDK_REAL_ROUTE_PREFIX}/tryon/stream?jobId=...`,
  });
  input.onProgress?.({
    stage: "sdk.tryon.job-sse.connected",
    status: "completed",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: "job stream connected",
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let seenEvents = 0;
  const waitStartedAt = Date.now();
  input.onProgress?.({
    stage: "sdk.tryon.job-sse.wait",
    status: "running",
    jobId: input.jobId,
    recommendedSize: input.recommendedSize,
    detail: "waiting for job-scoped vto-update",
  });

  try {
    while (!input.signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });
      let boundaryIndex = findSseBoundary(buffer);
      while (boundaryIndex >= 0) {
        const rawEvent = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(buffer[boundaryIndex] === "\r" ? boundaryIndex + 4 : boundaryIndex + 2);
        boundaryIndex = findSseBoundary(buffer);

        const parsedEvent = parseSseEvent(rawEvent);
        if (!parsedEvent.data) continue;
        seenEvents += 1;
        const payload = parseJson(parsedEvent.data);
        if (!payload || typeof payload !== "object") continue;

        const galleryId = getStringField(payload, "galleryId");
        const status = getStringField(payload, "status");
        if (!galleryId) {
          input.onProgress?.({
            stage: "sdk.tryon.job-sse.connected",
            status: "completed",
            jobId: input.jobId,
            recommendedSize: input.recommendedSize,
            detail: summarizeResponse(payload, parsedEvent.data),
          });
          continue;
        }
        if (galleryId !== input.jobId) continue;

        input.onProgress?.({
          stage: `sdk.tryon.job-sse.${status || "update"}`,
          status: status === "completed" ? "completed" : status === "failed" ? "failed" : "running",
          jobId: input.jobId,
          recommendedSize: input.recommendedSize,
          detail: summarizeResponse(payload, parsedEvent.data),
        });

        if (status === "completed") {
          input.stages.push({
            name: "sdk.tryon.job-sse.vto-update",
            status: 200,
            ok: true,
            latencyMs: Date.now() - waitStartedAt,
            detail: `events=${seenEvents}, status=completed, resultReady=yes`,
          });
          await reader.cancel().catch(() => undefined);
          return {
            status: 200,
            ok: true,
            body: JSON.stringify(payload),
            data: payload,
          };
        }

        if (status === "failed") {
          input.stages.push({
            name: "sdk.tryon.job-sse.vto-update",
            status: 500,
            ok: false,
            latencyMs: Date.now() - waitStartedAt,
            detail: `events=${seenEvents}, status=failed`,
          });
          await reader.cancel().catch(() => undefined);
          return {
            status: 500,
            ok: false,
            body: `Try-on job SSE failed: ${parsedEvent.data.slice(0, 220)}`,
            data: payload,
          };
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (input.signal.aborted) throw new DOMException("Request aborted", "AbortError");

  input.stages.push({
    name: "sdk.tryon.job-sse.vto-update",
    status: 502,
    ok: false,
    latencyMs: Date.now() - waitStartedAt,
    detail: `job stream closed before matching update; events=${seenEvents}`,
  });
  return {
    status: 502,
    ok: false,
    body: `Job SSE stream closed before vto-update for job ${input.jobId}`,
    data: null,
  };
}

function buildSdkPhotoRecommendPayload(sessionId: string, bodyImage: string): Record<string, unknown> {
  return {
    sessionId,
    method: "photo",
    locale: "US",
    sizingUnit: "cm",
    product: buildSdkProductContext(),
    bodyImage,
    bodyLandmarks: buildSdkLikeBodyLandmarks(),
    measurements: {
      gender: "male",
      height: 178,
      weight: 110,
      heightUnit: "cm",
      weightUnit: "kg",
      sizingUnit: "cm",
      age: 36,
      chestProfile: "broad",
      midsectionProfile: "round",
      hipProfile: "average",
    },
    sizeGuide: buildTuxedoSizeGuide(),
  };
}

function buildSdkTryOnPayload(context: SdkSizingContext, tryOnModel: TryOnModelId): Record<string, unknown> {
  return {
    modelImage: context.modelImage,
    garmentImage: getGarmentDataUri(),
    sessionId: context.sessionId,
    deviceHint: "desktop",
    category: "apparel",
    productId: "capacity-tommy-hilfiger-black-tuxedo",
    productTitle: "Two-Piece Formal Black Tuxedo",
    productFitType: "apparel",
    productType: "Tuxedo",
    productTags: ["tuxedo", "menswear", "suit", "formalwear", "apparel"],
    productDescription: "Two-piece black formal tuxedo with tailored jacket, lapel, matching trousers, and classic eveningwear structure.",
    productMaterial: "Structured wool-blend formal suiting fabric",
    model: tryOnModel,
    fitInfo: context.fitInfo.length ? context.fitInfo : buildFallbackFitInfo(),
    silhouetteContext: context.silhouetteContext,
  };
}

function buildShopifyTryOnPayload(context: SdkSizingContext, shopDomain: string): Record<string, unknown> {
  return {
    shopDomain,
    modelImage: context.modelImage,
    garmentImage: getGarmentDataUri(),
    sessionId: context.sessionId,
    productId: "capacity-tommy-hilfiger-black-tuxedo",
    productTitle: "Two-Piece Formal Black Tuxedo",
  };
}

function buildSdkProductContext(): Record<string, unknown> {
  return {
    title: "Two-Piece Formal Black Tuxedo",
    productId: "capacity-tommy-hilfiger-black-tuxedo",
    productType: "Tuxedo",
    description: "Two-piece black formal tuxedo with tailored jacket, lapel, matching trousers, and classic eveningwear structure.",
    tags: ["tuxedo", "menswear", "suit", "formalwear", "apparel"],
    vendor: "PrimeStyleAI Capacity Lab",
    variants: [{ title: "40 Regular" }, { title: "42 Regular" }, { title: "44 Regular" }, { title: "46 Regular" }],
  };
}

function buildTuxedoSizeGuide(): Record<string, unknown> {
  return {
    found: true,
    title: "Capacity Lab Tuxedo Size Guide",
    headers: ["Size", "Chest", "Waist", "Hip", "Sleeve", "Inseam", "Fit Length"],
    rows: [
      ["40 Short", "101-104", "86-91", "102-106", "83", "76", "Short"],
      ["40 Regular", "101-104", "86-91", "102-106", "86", "81", "Regular"],
      ["42 Regular", "106-109", "91-96", "107-111", "87", "81", "Regular"],
      ["44 Regular", "111-114", "96-101", "112-116", "88", "81", "Regular"],
      ["46 Regular", "116-119", "101-107", "117-121", "89", "81", "Regular"],
      ["48 Regular", "121-124", "107-112", "122-126", "90", "81", "Regular"],
      ["50 Regular", "126-130", "112-117", "127-132", "91", "81", "Regular"],
      ["52 Long", "131-135", "117-122", "133-138", "94", "86", "Long"],
    ],
    requiredFields: [
      { key: "chest", label: "Chest" },
      { key: "waist", label: "Waist" },
      { key: "hips", label: "Hips" },
      { key: "sleeveLength", label: "Sleeve" },
      { key: "inseam", label: "Inseam" },
    ],
  };
}

function buildSdkLikeBodyLandmarks(): Record<string, unknown> {
  // Server-side Capacity Lab cannot run browser MediaPipe. These landmarks are
  // a stable SDK-like fixture so backend code still exercises the same
  // bodyLandmarks branch the browser SDK normally sends.
  return {
    leftShoulder: { x: 0.43, y: 0.29, z: -0.03, visibility: 0.96 },
    rightShoulder: { x: 0.58, y: 0.29, z: -0.02, visibility: 0.96 },
    leftHip: { x: 0.45, y: 0.56, z: 0.02, visibility: 0.94 },
    rightHip: { x: 0.56, y: 0.56, z: 0.02, visibility: 0.94 },
    leftElbow: { x: 0.39, y: 0.43, z: -0.01, visibility: 0.91 },
    rightElbow: { x: 0.62, y: 0.43, z: -0.01, visibility: 0.91 },
    leftWrist: { x: 0.37, y: 0.56, z: 0.01, visibility: 0.88 },
    rightWrist: { x: 0.64, y: 0.56, z: 0.01, visibility: 0.88 },
    leftKnee: { x: 0.46, y: 0.76, z: 0.04, visibility: 0.9 },
    rightKnee: { x: 0.55, y: 0.76, z: 0.04, visibility: 0.9 },
    leftAnkle: { x: 0.46, y: 0.94, z: 0.05, visibility: 0.84 },
    rightAnkle: { x: 0.55, y: 0.94, z: 0.05, visibility: 0.84 },
    nose: { x: 0.51, y: 0.12, z: -0.04, visibility: 0.98 },
    imageWidth: 669,
    imageHeight: 1600,
  };
}

function buildFitInfoFromSizingResult(value: unknown): FitAreaInfo[] {
  const details = collectMatchDetails(value);
  if (!details.length) return buildFallbackFitInfo();

  const out: FitAreaInfo[] = [];
  for (const detail of details) {
    const measurement = getString(detail, "measurement");
    const chartRange = getString(detail, "chartRange");
    if (!measurement || !chartRange) continue;
    const userValue = parseFirstNumber(getString(detail, "userValue") ?? "");
    const fit = normalizeFit(getString(detail, "fit"));
    const pose = poseLineForMeasurement(measurement);
    out.push({
      area: measurement,
      fit,
      ...(Number.isFinite(userValue) && userValue > 0 ? { userValue } : {}),
      garmentRange: chartRange,
      ...pose,
    });
  }

  return out.length ? out : buildFallbackFitInfo();
}

function collectMatchDetails(value: unknown): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const pushArray = (raw: unknown) => {
    if (!Array.isArray(raw)) return;
    for (const item of raw) {
      if (item && typeof item === "object") out.push(item as Record<string, unknown>);
    }
  };

  if (!value || typeof value !== "object") return out;
  const root = value as Record<string, unknown>;
  pushArray(root.matchDetails);

  const sections = root.sections;
  if (sections && typeof sections === "object") {
    for (const section of Object.values(sections)) {
      if (section && typeof section === "object") pushArray((section as Record<string, unknown>).matchDetails);
    }
  }

  return out;
}

function buildFallbackFitInfo(): FitAreaInfo[] {
  return [
    { area: "Chest", fit: "good", userValue: 122, garmentRange: "121-124", y: 0.35, x1: 0.3, x2: 0.7 },
    { area: "Waist", fit: "good", userValue: 110, garmentRange: "107-112", y: 0.52, x1: 0.34, x2: 0.66 },
    { area: "Hips", fit: "good", userValue: 124, garmentRange: "122-126", y: 0.68, x1: 0.31, x2: 0.69 },
  ];
}

function buildSilhouetteContextFromSizingResult(value: unknown, recommendedSize: string): Record<string, string> {
  const estimates = getRecord(value, "estimates");
  const userMeasurementsText = formatMeasurementText(estimates) || "Chest 122 cm, Waist 110 cm, Hips 124 cm, Shoulder Width 50 cm, Sleeve Length 90 cm, Inseam 81 cm";
  const matchedRowText = getStringField(value, "matchedRowText") || "Chest 121-124 cm, Waist 107-112 cm, Hip 122-126 cm, Sleeve 90 cm, Inseam 81 cm";

  return {
    recommendedSize,
    recommendedSizeMeasurements: matchedRowText,
    sizeChartSummary: "Men's tuxedo chart from 40 Short to 52 Long with chest, waist, hip, sleeve, inseam, and fit length.",
    userMeasurementsText,
    userHeight: "178 cm",
    userWeight: "110 kg",
  };
}

function formatMeasurementText(values: Record<string, unknown> | null): string | null {
  if (!values) return null;
  const labels: Array<[string, string]> = [
    ["bust", "Bust"],
    ["chest", "Chest"],
    ["waist", "Waist"],
    ["hips", "Hips"],
    ["shoulderWidth", "Shoulder Width"],
    ["sleeveLength", "Sleeve Length"],
    ["inseam", "Inseam"],
  ];
  const parts: string[] = [];
  for (const [key, label] of labels) {
    const raw = values[key];
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) parts.push(`${label} ${Math.round(parsed * 10) / 10} cm`);
  }
  return parts.length ? parts.join(", ") : null;
}

function poseLineForMeasurement(measurement: string): Pick<FitAreaInfo, "y" | "x1" | "x2"> {
  const key = measurement.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim();
  if (key.includes("bust") || key.includes("chest")) return { y: 0.35, x1: 0.3, x2: 0.7 };
  if (key.includes("waist")) return { y: 0.52, x1: 0.34, x2: 0.66 };
  if (key.includes("hip")) return { y: 0.68, x1: 0.31, x2: 0.69 };
  return {};
}

function normalizeFit(raw: string | null): FitAreaInfo["fit"] {
  const allowed = new Set(["good", "tight", "loose", "a-bit-tight", "a-bit-loose", "too-tight", "too-loose"]);
  return raw && allowed.has(raw) ? raw as FitAreaInfo["fit"] : "good";
}

async function postStage(input: {
  name: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  stages: StageSummary[];
  signal: AbortSignal;
  onProgress?: ProgressReporter;
}): Promise<JsonResponse> {
  const startedAt = Date.now();
  input.onProgress?.({ stage: input.name, status: "running" });
  const response = await postJson(input.url, input.headers, input.body, input.signal);
  const detail = summarizeResponse(response.data, response.body);
  input.stages.push({
    name: input.name,
    status: response.status,
    ok: response.ok,
    latencyMs: Date.now() - startedAt,
    detail,
  });
  input.onProgress?.({
    stage: input.name,
    status: response.ok ? "completed" : "failed",
    recommendedSize: getStringField(response.data, "recommendedSize"),
    jobId: getStringField(response.data, "jobId"),
    backendStage: getBackendStage(response.data),
    detail,
  });
  return response;
}

async function getStage(input: {
  name: string;
  url: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  signal: AbortSignal;
  detail?: string;
  onProgress?: ProgressReporter;
}): Promise<JsonResponse> {
  const startedAt = Date.now();
  input.onProgress?.({ stage: input.name, status: "running", detail: input.detail ?? null });
  const response = await getJson(input.url, input.headers, input.signal);
  const detail = input.detail ? `${input.detail}; ${summarizeResponse(response.data, response.body)}` : summarizeResponse(response.data, response.body);
  input.stages.push({
    name: input.name,
    status: response.status,
    ok: response.ok,
    latencyMs: Date.now() - startedAt,
    detail,
  });
  input.onProgress?.({
    stage: input.name,
    status: response.ok ? "completed" : "failed",
    jobId: getStringField(response.data, "jobId"),
    backendStage: getBackendStage(response.data),
    detail,
  });
  return response;
}

async function getBinaryResultStage(input: {
  name: string;
  url: string;
  headers: Record<string, string>;
  stages: StageSummary[];
  signal: AbortSignal;
  detail?: string;
  onProgress?: ProgressReporter;
}): Promise<JsonResponse> {
  const startedAt = Date.now();
  input.onProgress?.({ stage: input.name, status: "running", detail: input.detail ?? null });
  const response = await fetch(input.url, {
    method: "GET",
    cache: "no-store",
    headers: input.headers,
    signal: input.signal,
  });
  const contentType = response.headers.get("content-type") || "";

  if (response.ok && contentType.startsWith("image/")) {
    const bytes = (await response.arrayBuffer()).byteLength;
    const jobId = response.headers.get("x-primestyleai-job-id") || null;
    const delivery = response.headers.get("x-primestyleai-image-delivery") || "binary-image";
    const data = {
      jobId,
      status: "completed",
      imageUrl: null,
      imageBytes: bytes,
      imageDelivery: delivery,
      contentType,
    };
    const detail = [
      input.detail,
      `binary image fetched; bytes=${bytes}`,
      `contentType=${contentType}`,
      `delivery=${delivery}`,
    ].filter(Boolean).join("; ");
    input.stages.push({
      name: input.name,
      status: response.status,
      ok: true,
      latencyMs: Date.now() - startedAt,
      detail,
    });
    input.onProgress?.({
      stage: input.name,
      status: "completed",
      jobId,
      detail,
    });
    return {
      status: response.status,
      ok: true,
      body: JSON.stringify(data),
      data,
    };
  }

  const body = await response.text().catch(() => "");
  const data = parseJson(body);
  const detail = input.detail ? `${input.detail}; ${summarizeResponse(data, body)}` : summarizeResponse(data, body);
  input.stages.push({
    name: input.name,
    status: response.status,
    ok: response.ok,
    latencyMs: Date.now() - startedAt,
    detail,
  });
  input.onProgress?.({
    stage: input.name,
    status: response.ok ? "completed" : "failed",
    jobId: getStringField(data, "jobId"),
    backendStage: getBackendStage(data),
    detail,
  });
  return { status: response.status, ok: response.ok, body, data };
}

function summarizeResponse(data: unknown, body: string): string {
  if (data && typeof data === "object") {
    const status = getStringField(data, "status");
    const recommendedSize = getStringField(data, "recommendedSize");
    const jobId = getStringField(data, "jobId");
    const imageUrl = getNullableStringField(data, "imageUrl");
    const parts = [
      status ? `status=${status}` : null,
      recommendedSize ? `recommendedSize=${recommendedSize}` : null,
      jobId ? `jobId=${jobId}` : null,
      imageUrl ? "imageUrl=yes" : null,
      getBackendStage(data) ? `backendStage=${getBackendStage(data)}` : null,
      getBackendStageDetail(data),
    ].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  return body.replace(/\s+/g, " ").trim().slice(0, 160);
}

function getBackendStage(data: unknown): string | null {
  const debugTiming = getRecord(data, "debugTiming");
  if (!debugTiming) return null;
  return getString(debugTiming, "currentStage");
}

function getBackendStageDetail(data: unknown): string | null {
  const debugTiming = getRecord(data, "debugTiming");
  const detail = debugTiming ? getRecord(debugTiming, "currentDetail") : null;
  if (!detail) return null;

  const pass1 = getRecord(detail, "pass1");
  const pass1Ms = pass1 ? getNumber(pass1, "durationMs") : getNumber(detail, "durationMs");
  const totalMs = getNumber(detail, "totalMs");
  const queueWaitMs = getNumber(detail, "queueWaitMs");
  const imageKb = getNumber(detail, "imageKb");
  const postGemini = getRecord(detail, "postGemini");
  const postGeminiMs = postGemini ? getNumber(postGemini, "totalMs") : null;
  const parts = [
    queueWaitMs !== null ? `queueWait=${Math.round(queueWaitMs)}ms` : null,
    pass1Ms ? `geminiMs=${Math.round(pass1Ms)}ms` : null,
    totalMs ? `backendTotal=${Math.round(totalMs)}ms` : null,
    postGeminiMs ? `postGemini=${Math.round(postGeminiMs)}ms` : null,
    imageKb ? `imageKb=${Math.round(imageKb)}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function buildFlowResult(ok: boolean, status: number, stages: StageSummary[], body: string): ScenarioResult {
  return {
    status,
    ok,
    body: JSON.stringify({
      ok,
      stages,
      result: parseJson(body) ?? body.slice(0, 500),
    }),
  };
}

function createSdkSessionId(): string {
  return `ps_sdk_capacity_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getBaseUrl(targetId: CapacityTargetId): string {
  return getServerTarget(targetId).baseUrl.replace(/\/+$/, "");
}

function getJsonHeaders(targetId: CapacityTargetId): Record<string, string> {
  const apiKey = getCapacityApiKey(targetId);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "User-Agent": "PrimeStyleAI-Capacity-Lab/1.0",
    "x-primestyle-capacity-lab": "true",
  };
}

function getShopifyJsonHeaders(targetId: CapacityTargetId): Record<string, string> {
  const token = getShopifyAdminToken(targetId);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "PrimeStyleAI-Capacity-Lab/1.0",
    "x-primestyle-capacity-lab": "true",
  };
}

function buildSdkSseStreamUrl(baseUrl: string, targetId: CapacityTargetId, apiPrefix = SDK_REAL_ROUTE_PREFIX): string {
  const apiKey = getCapacityApiKey(targetId);
  const url = new URL(`${apiPrefix}/tryon/stream`, baseUrl);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function buildSdkJobSseStreamUrl(baseUrl: string, targetId: CapacityTargetId, jobId: string, apiPrefix = SDK_REAL_ROUTE_PREFIX): string {
  const apiKey = getCapacityApiKey(targetId);
  const url = new URL(`${apiPrefix}/tryon/stream`, baseUrl);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("jobId", jobId);
  return url.toString();
}

function createLinkedAbortController(parentSignal: AbortSignal): AbortController {
  const controller = new AbortController();
  if (parentSignal.aborted) {
    controller.abort();
  } else {
    parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller;
}

function getCapacityApiKey(targetId: CapacityTargetId): string {
  const key = process.env[`PRIMESTYLE_CAPACITY_SDK_API_KEY_${targetId.toUpperCase()}`]
    || process.env.PRIMESTYLE_CAPACITY_SDK_API_KEY
    || process.env[`PRIMESTYLE_CAPACITY_LAB_API_KEY_${targetId.toUpperCase()}`]
    || process.env.PRIMESTYLE_CAPACITY_LAB_API_KEY;

  if (!key) {
    throw new Error(
      `Missing server-side SDK API key for ${targetId}. Set PRIMESTYLE_CAPACITY_SDK_API_KEY_${targetId.toUpperCase()}, PRIMESTYLE_CAPACITY_SDK_API_KEY, or PRIMESTYLE_CAPACITY_LAB_API_KEY.`,
    );
  }
  return key.trim();
}

function getShopifyAdminToken(targetId: CapacityTargetId): string {
  const token = process.env[`PRIMESTYLE_CAPACITY_SHOPIFY_ADMIN_TOKEN_${targetId.toUpperCase()}`]
    || process.env.PRIMESTYLE_CAPACITY_SHOPIFY_ADMIN_TOKEN
    || process.env[`PRIMESTYLE_ADMIN_TOKEN_${targetId.toUpperCase()}`];

  if (!token) {
    throw new Error(
      `Missing server-side Shopify admin token for ${targetId}. Set PRIMESTYLE_CAPACITY_SHOPIFY_ADMIN_TOKEN_${targetId.toUpperCase()} or PRIMESTYLE_CAPACITY_SHOPIFY_ADMIN_TOKEN.`,
    );
  }
  return token.trim();
}

function getShopifyShopDomain(targetId: CapacityTargetId): string {
  const shopDomain = process.env[`PRIMESTYLE_CAPACITY_SHOPIFY_SHOP_DOMAIN_${targetId.toUpperCase()}`]
    || process.env.PRIMESTYLE_CAPACITY_SHOPIFY_SHOP_DOMAIN;

  if (!shopDomain) {
    throw new Error(
      `Missing capacity Shopify shop domain for ${targetId}. Set PRIMESTYLE_CAPACITY_SHOPIFY_SHOP_DOMAIN_${targetId.toUpperCase()} or PRIMESTYLE_CAPACITY_SHOPIFY_SHOP_DOMAIN.`,
    );
  }
  return shopDomain.trim();
}

function normalizeStreamUrl(baseUrl: string, rawStreamUrl: string): string {
  const parsed = new URL(rawStreamUrl, baseUrl);
  const base = new URL(baseUrl);
  return `${base.origin}${parsed.pathname}${parsed.search}`;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal): Promise<JsonResponse> {
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  return parseResponse(response);
}

async function getJson(url: string, headers: Record<string, string>, signal: AbortSignal): Promise<JsonResponse> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers,
    signal,
  });
  return parseResponse(response);
}

async function parseResponse(response: Response): Promise<JsonResponse> {
  const body = await response.text().catch(() => "");
  return { status: response.status, ok: response.ok, body, data: parseJson(body) };
}

function toScenarioResult(response: JsonResponse): ScenarioResult {
  return {
    status: response.status,
    ok: response.ok,
    body: response.body,
  };
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function findSseBoundary(value: string): number {
  const lf = value.indexOf("\n\n");
  const crlf = value.indexOf("\r\n\r\n");
  if (lf < 0) return crlf;
  if (crlf < 0) return lf;
  return Math.min(lf, crlf);
}

function parseSseEvent(rawEvent: string): { event: string | null; data: string } {
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const line of rawEvent.replace(/\r\n/g, "\n").split("\n")) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).replace(/^ /, ""));
    }
  }
  return { event, data: dataLines.join("\n") };
}

function getRecord(value: unknown, key: string): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
}

function getString(value: Record<string, unknown>, key: string): string | null {
  const raw = value[key];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
}

function getNumber(value: Record<string, unknown>, key: string): number | null {
  const raw = value[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getStringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function getNullableStringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function getNumberField(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function parseFirstNumber(value: string): number {
  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

async function getSdkPersonDataUri(): Promise<string> {
  cachedSdkPersonDataUri ??= await readResizedPublicDataUri(SAMPLE_PERSON_PATH, 1024, 85);
  return cachedSdkPersonDataUri;
}

async function getAgeCheckPersonDataUri(): Promise<string> {
  cachedAgeCheckPersonDataUri ??= await readResizedPublicDataUri(SAMPLE_PERSON_PATH, 384, 60);
  return cachedAgeCheckPersonDataUri;
}

function getGarmentDataUri(): string {
  cachedGarmentDataUri ??= readPublicDataUri(SAMPLE_GARMENT_PATH, "image/jpeg");
  return cachedGarmentDataUri;
}

function readPublicDataUri(relativePath: string, mimeType: string): string {
  const filePath = path.join(process.cwd(), relativePath);
  const value = readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${value}`;
}

async function readResizedPublicDataUri(relativePath: string, maxDimension: number, quality: number): Promise<string> {
  const filePath = path.join(process.cwd(), relativePath);
  const value = await sharp(filePath)
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  return `data:image/jpeg;base64,${value.toString("base64")}`;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }
    const timeoutId = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(new DOMException("Request aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
