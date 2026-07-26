const PLATFORM_BASE = "/api/pdp-studio/platform";

interface ApiErrorPayload {
  error?: string;
  message?: string;
  issues?: Array<{ message?: string }>;
}

export class PdpStudioApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PdpStudioApiError";
  }
}

export async function pdpStudioApiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${PLATFORM_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;
  if (!response.ok) {
    const issue = data.issues?.find((item) => item.message)?.message;
    throw new PdpStudioApiError(
      data.error || data.message || issue || `PDP Studio request failed (${response.status}).`,
      response.status,
    );
  }
  return data;
}

export function pdpStudioPlatformUrl(path: string): string {
  return `${PLATFORM_BASE}${path}`;
}
