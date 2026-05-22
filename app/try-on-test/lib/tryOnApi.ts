/**
 * Thin client for the public SDK try-on endpoints. Mirrors the SDK's
 * `api-client.ts` behavior (POST /api/v1/tryon + EventSource on
 * /api/v1/tryon/stream) so the test page exercises the exact production
 * pipeline. Network details only — no React, no UI state.
 */

import type { TryOnModelId } from "./models";

export interface SubmitTryOnPayload {
  modelImage: string;
  garmentImage: string;
  /** Test override — when set, the backend bypasses its prompt builder and
   *  sends this string to Gemini verbatim. Vertex try-on models ignore it. */
  customPrompt?: string;
  productTitle?: string;
  productDescription?: string;
  productMaterial?: string;
  /** Test override — picks a specific Gemini or Vertex try-on model. */
  model?: TryOnModelId;
}

export interface SubmitTryOnResponse {
  jobId: string;
  status: "processing" | "completed" | "failed";
  modelImageId?: string;
}

export interface VtoStreamUpdate {
  galleryId: string;
  status: "processing" | "completed" | "failed";
  imageUrl?: string | null;
  error?: string | null;
  timestamp?: number;
}

export class TryOnApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TryOnApiError";
  }
}

export interface TryOnApiClientConfig {
  baseUrl: string;
}

export function createTryOnApiClient(config: TryOnApiClientConfig) {
  const { baseUrl } = config;
  const headers = {
    "Content-Type": "application/json",
  };

  async function submit(payload: SubmitTryOnPayload): Promise<SubmitTryOnResponse> {
    const res = await fetch(`${baseUrl}/api/v1/tryon`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      throw new TryOnApiError(
        typeof data.message === "string" ? data.message : `Try-on submission failed (${res.status})`,
        typeof data.error === "string" ? data.error : "API_ERROR",
        res.status,
      );
    }

    return (await res.json()) as SubmitTryOnResponse;
  }

  function streamUrl(): string {
    return `${baseUrl}/api/v1/tryon/stream`;
  }

  return { submit, streamUrl };
}

export type TryOnApiClient = ReturnType<typeof createTryOnApiClient>;

/**
 * Open an EventSource against the SDK try-on stream and route `vto-update`
 * events for a specific job to the caller. Returns a cleanup function that
 * closes the stream and removes listeners.
 */
export function subscribeToJob(
  url: string,
  jobId: string,
  onUpdate: (update: VtoStreamUpdate) => void,
  onError?: (err: Event) => void,
): () => void {
  const source = new EventSource(url);

  const handler = (event: MessageEvent<string>) => {
    try {
      const data = JSON.parse(event.data) as VtoStreamUpdate;
      if (data.galleryId === jobId) onUpdate(data);
    } catch {
      // Ignore malformed payloads — the connection itself is still healthy.
    }
  };

  source.addEventListener("vto-update", handler as EventListener);
  if (onError) source.addEventListener("error", onError);

  return () => {
    source.removeEventListener("vto-update", handler as EventListener);
    if (onError) source.removeEventListener("error", onError);
    source.close();
  };
}
