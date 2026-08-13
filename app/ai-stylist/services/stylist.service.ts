import type {
  StylistConversation,
  ModificationRequest,
  ModificationResponse,
  IntelligentOutfit,
  GarmentCutoutResult,
  OutfitCatalogAvailability,
  OutfitIntelligenceRequest,
  OutfitIntelligenceResponse,
  ProcessedStylistModel,
  StylistCatalogProduct,
  StylistHistorySession,
  StylistSizeRecommendation,
  StylistTryOnJob,
} from "@/app/ai-stylist/types";

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

const backendApiBase = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ""
).replace(/\/$/, "");

function backendUrl(path: string): string {
  return backendApiBase ? `${backendApiBase}${path}` : path;
}

let sessionRefreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: defaultHeaders,
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }

  return sessionRefreshPromise;
}

async function fetchWithSessionRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const request = () =>
    fetch(input, {
      ...init,
      credentials: "include",
    });

  const response = await request();
  if (response.status !== 401) return response;

  const refreshed = await refreshSession();
  return refreshed ? request() : response;
}

async function apiError(response: Response, fallback: string): Promise<Error> {
  if (response.status === 401) {
    return new Error("Your session expired. Please sign in again.");
  }
  const body = await response.json().catch(() => null) as
    | { message?: string; error?: string }
    | null;
  return new Error(body?.message || body?.error || fallback);
}

/* ─── Chat-free AI Stylist API ─── */

export async function processStylistModelPhoto(
  imageDataUrl: string,
): Promise<ProcessedStylistModel> {
  const res = await fetchWithSessionRetry(backendUrl("/api/stylist/model/process"), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!res.ok) {
    throw await apiError(res, "Failed to remove the model photo background");
  }
  return res.json();
}

export async function generateIntelligentOutfits(
  request: OutfitIntelligenceRequest,
): Promise<OutfitIntelligenceResponse> {
  const res = await fetchWithSessionRetry(backendUrl("/api/stylist/outfits/generate"), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw await apiError(res, "Failed to generate personalized outfits");
  }
  return res.json();
}

export async function recommendStylistOutfitSizes(
  styleRagIds: string[],
): Promise<StylistSizeRecommendation[]> {
  const res = await fetchWithSessionRetry(
    backendUrl("/api/stylist/outfits/sizes"),
    {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify({ styleRagIds }),
    },
  );
  if (!res.ok) {
    throw await apiError(res, "Failed to recommend garment sizes");
  }
  const body = (await res.json()) as {
    items?: StylistSizeRecommendation[];
  };
  return body.items ?? [];
}

export async function getOutfitCatalogAvailability(): Promise<OutfitCatalogAvailability> {
  const res = await fetchWithSessionRetry(
    backendUrl("/api/stylist/outfits/availability"),
  );
  if (!res.ok) {
    throw await apiError(res, "Failed to inspect the AI Stylist catalog");
  }
  return res.json();
}

export async function getStylistCatalogProduct(
  productId: string,
): Promise<StylistCatalogProduct> {
  const res = await fetchWithSessionRetry(
    backendUrl(`/api/stylist/catalog/products/${encodeURIComponent(productId)}`),
  );
  if (!res.ok) {
    throw await apiError(res, "Failed to load product details");
  }
  return res.json();
}

export async function processStylistGarmentCutouts(
  styleRagIds: string[],
): Promise<GarmentCutoutResult[]> {
  const res = await fetchWithSessionRetry(backendUrl("/api/stylist/garments/cutouts"), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ styleRagIds }),
  });
  if (!res.ok) {
    throw await apiError(res, "Failed to prepare garment images");
  }
  const body = (await res.json()) as { items?: GarmentCutoutResult[] };
  return body.items ?? [];
}

interface StartStylistTryOnBatchResponse {
  batchId: string;
  tokenCost: number;
  jobs: Array<{
    outfitId: string;
    galleryId: string;
    status: "processing" | "completed" | "failed";
  }>;
}

export async function startStylistTryOnBatch(input: {
  clientBatchId: string;
  modelImage: string;
  outfits: IntelligentOutfit[];
}): Promise<StartStylistTryOnBatchResponse> {
  const res = await fetchWithSessionRetry(backendUrl("/api/stylist/tryons/batch"), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({
      clientBatchId: input.clientBatchId,
      modelImage: input.modelImage,
      outfits: input.outfits.map((outfit) => ({
        outfitId: outfit.id,
        label: outfit.label,
        items: outfit.items.map((item) => ({
          id: item.id,
          styleRagId: item.styleRagId,
          title: item.title,
          brand: item.brand,
          merchantName: item.merchantName,
          slot: item.slot,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl,
          cutoutImageUrl: item.cutoutImageUrl ?? null,
          productUrl: item.productUrl,
          affiliateUrl: item.affiliateUrl,
          recommendedSize: item.recommendedSize ?? null,
          sizeConfidence: item.sizeConfidence ?? null,
          sizeStatus:
            item.sizeStatus && item.sizeStatus !== "loading"
              ? item.sizeStatus
              : "unavailable",
        })),
      })),
    }),
  });
  if (!res.ok) {
    throw await apiError(res, "Failed to start the selected outfit try-ons");
  }
  return res.json();
}

export async function prepareStylistTryOnInputs(input: {
  modelImage: string;
  garmentImages: string[];
}): Promise<{ modelPrepared: boolean; garmentsPrepared: number }> {
  const res = await fetchWithSessionRetry(
    backendUrl("/api/stylist/tryons/prepare"),
    {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    throw await apiError(res, "Failed to prepare the selected try-on images");
  }
  return res.json();
}

interface TryOnStatusResponse {
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string | null;
  discStatus?: "pending" | "processing" | "completed" | "failed";
  discImageUrl?: string | null;
  error?: string;
  discError?: string;
  message?: string;
}

async function getStylistTryOnStatus(galleryId: string): Promise<TryOnStatusResponse> {
  const res = await fetchWithSessionRetry(
    backendUrl(`/api/stylist/tryons/${galleryId}/status`),
  );
  if (!res.ok) {
    throw await apiError(res, "Failed to check a try-on result");
  }
  return res.json();
}

export async function getStylistTryOnHistory(): Promise<StylistHistorySession[]> {
  const res = await fetchWithSessionRetry(
    backendUrl("/api/stylist/tryons/history"),
  );
  if (!res.ok) {
    throw await apiError(res, "Failed to load AI Stylist history");
  }
  const body = (await res.json()) as {
    sessions?: StylistHistorySession[];
  };
  return body.sessions ?? [];
}

export async function waitForStylistTryOnJob(input: {
  job: StylistTryOnJob;
  onProgress: (job: StylistTryOnJob) => void;
  isCancelled: () => boolean;
  timeoutMs?: number;
}): Promise<StylistTryOnJob> {
  if (!input.job.galleryId) {
    return {
      ...input.job,
      status: "failed",
      error: "The try-on job was not created.",
    };
  }
  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? 10 * 60 * 1000;
  let transientFailures = 0;
  let currentJob: StylistTryOnJob = input.job;
  let streamWakeRequested = false;
  let wakePolling: (() => void) | null = null;

  const handleStreamedUpdate = (event: Event) => {
    const detail = (
      event as CustomEvent<{
        galleryId?: string;
        status?: string;
        imageUrl?: string | null;
        error?: string | null;
      }>
    ).detail;
    if (String(detail?.galleryId ?? "") !== input.job.galleryId) return;
    if (detail.status === "completed" && detail.imageUrl) {
      currentJob = {
        ...currentJob,
        status: "completed",
        finishedAt: Date.now(),
        imageUrl: detail.imageUrl,
        discStatus: currentJob.discStatus ?? "processing",
      };
    } else if (detail.status === "failed") {
      currentJob = {
        ...currentJob,
        status: "failed",
        finishedAt: Date.now(),
        error: detail.error || "Try-on generation failed.",
      };
    }
    if (currentJob !== input.job) {
      streamWakeRequested = true;
      input.onProgress(currentJob);
      wakePolling?.();
    }
  };

  const waitForNextPoll = () =>
    new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (wakePolling === finish) wakePolling = null;
        resolve();
      };
      const timer = window.setTimeout(finish, 2500);
      wakePolling = finish;
    });

  window.addEventListener("vto-update", handleStreamedUpdate);
  try {
    while (!input.isCancelled()) {
      if (Date.now() - startedAt > timeoutMs) {
        const timedOutJob: StylistTryOnJob = {
          ...currentJob,
          status: "failed",
          finishedAt: Date.now(),
          error: "This try-on took longer than ten minutes.",
        };
        input.onProgress(timedOutJob);
        return timedOutJob;
      }
      try {
        const result = await getStylistTryOnStatus(input.job.galleryId);
        transientFailures = 0;
        if (result.status === "completed" && result.imageUrl) {
          const completedJob: StylistTryOnJob = {
            ...currentJob,
            status: "completed",
            finishedAt: Date.now(),
            imageUrl: result.imageUrl,
            discStatus: result.discStatus ?? "processing",
            ...(result.discImageUrl
              ? { discImageUrl: result.discImageUrl }
              : {}),
            ...(result.discError ? { discError: result.discError } : {}),
          };
          input.onProgress(completedJob);
          currentJob = completedJob;
          if (
            completedJob.discStatus === "completed" ||
            completedJob.discStatus === "failed"
          ) {
            return completedJob;
          }
        }
        if (result.status === "failed") {
          const failedJob: StylistTryOnJob = {
            ...currentJob,
            status: "failed",
            finishedAt: Date.now(),
            error:
              result.error || result.message || "Try-on generation failed.",
          };
          input.onProgress(failedJob);
          return failedJob;
        }
        if (result.status !== "completed") {
          currentJob = {
            ...currentJob,
            status: "processing",
            discStatus: result.discStatus ?? currentJob.discStatus,
          };
          input.onProgress(currentJob);
        }
      } catch (error) {
        transientFailures += 1;
        if (transientFailures >= 5) {
          const failedJob: StylistTryOnJob = {
            ...currentJob,
            status: "failed",
            finishedAt: Date.now(),
            error:
              error instanceof Error
                ? error.message
                : "The try-on status could not be checked.",
          };
          input.onProgress(failedJob);
          return failedJob;
        }
      }
      streamWakeRequested = false;
      await waitForNextPoll();
      if (streamWakeRequested) continue;
    }
  } finally {
    window.removeEventListener("vto-update", handleStreamedUpdate);
  }
  const cancelledJob: StylistTryOnJob = {
    ...currentJob,
    status: "failed",
    finishedAt: Date.now(),
    error: "Try-on generation was cancelled.",
  };
  input.onProgress(cancelledJob);
  return cancelledJob;
}

/* ─── Conversation API ─── */

export async function startConversation(body: {
  prompt: string;
  count?: number;
  weatherContext?: Record<string, unknown>;
  intentOnly?: boolean;
}): Promise<StylistConversation> {
  const res = await fetch("/api/stylist/conversations", {
    method: "POST",
    credentials: "include",
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to start conversation");
  return res.json();
}

export async function sendMessage(
  conversationId: string,
  prompt: string
): Promise<StylistConversation> {
  const res = await fetch(
    `/api/stylist/conversations/${conversationId}/messages`,
    {
      method: "POST",
      credentials: "include",
      headers: defaultHeaders,
      body: JSON.stringify({ prompt }),
    }
  );
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function getConversation(
  conversationId: string
): Promise<StylistConversation> {
  const res = await fetch(
    `/api/stylist/conversations/${conversationId}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function listConversations(): Promise<
  Array<{ id: string; title: string; previewImages?: string[] }>
> {
  const res = await fetch("/api/stylist/conversations", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to list conversations");
  return res.json();
}

/* ─── Outfit Generation ─── */

export async function generateWithModel(
  conversationId: string,
  modelImage: string,
  count = 5
): Promise<{ status: string; messageId: string }> {
  const res = await fetch(
    `/api/stylist/conversations/${conversationId}/generate`,
    {
      method: "POST",
      credentials: "include",
      headers: defaultHeaders,
      body: JSON.stringify({ modelImage, count }),
    }
  );
  if (!res.ok) {
    if (res.status === 402) throw new Error("Insufficient tokens");
    throw new Error("Failed to generate outfits");
  }
  return res.json();
}

/* ─── SSE Stream for outfit generation ─── */

export function streamOutfitUpdates(
  conversationId: string,
  onEvent: (event: { type: string; data: Record<string, unknown> }) => void,
  onError?: (error: Error) => void
): () => void {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${baseUrl}/api/stylist/conversations/${conversationId}/stream`;
  const eventSource = new EventSource(url, { withCredentials: true });

  const events = [
    "progress",
    "outfit-cover-ready",
    "outfits-ready",
    "outfit-tryon-ready",
    "all-tryons-complete",
    "outfit-transparent-ready",
    "no-outfits",
    "complete",
  ];

  for (const evt of events) {
    eventSource.addEventListener(evt, (e) => {
      try {
        onEvent({ type: evt, data: JSON.parse(e.data) });
      } catch {}
    });
  }

  eventSource.addEventListener("generation-error", (e) => {
    try {
      onEvent({ type: "generation-error", data: JSON.parse(e.data) });
    } catch {}
    onError?.(new Error("Generation failed"));
  });

  eventSource.onerror = () => {
    eventSource.close();
    onError?.(new Error("SSE connection error"));
  };

  return () => eventSource.close();
}

/* ─── Saved Outfits ─── */

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/stylist/conversations/${conversationId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function deleteAllConversations(): Promise<void> {
  const res = await fetch("/api/stylist/conversations", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete conversations");
}

/* ─── Background Removal ─── */

export async function processTransparentImages(
  conversationId: string
): Promise<{ queued: number }> {
  const res = await fetch(`/api/stylist/conversations/${conversationId}/process-transparent`, {
    method: "POST",
    credentials: "include",
    headers: defaultHeaders,
  });
  if (!res.ok) throw new Error("Failed to process transparent images");
  return res.json();
}

/* ─── Outfit Modification ─── */

export async function modifyOutfit(
  request: ModificationRequest
): Promise<ModificationResponse> {
  const res = await fetch("/api/stylist/outfit/modify", {
    method: "POST",
    credentials: "include",
    headers: defaultHeaders,
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to modify outfit");
  }
  return res.json();
}
