/**
 * Static configuration for the try-on test page. Pulled from `NEXT_PUBLIC_*`
 * env vars at build time so the page can run without any UI for credentials.
 */
export const TRY_ON_TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  apiKey: process.env.NEXT_PUBLIC_PRIMESTYLE_API_KEY ?? "",
} as const;

export const HISTORY_LIMIT = 20;
