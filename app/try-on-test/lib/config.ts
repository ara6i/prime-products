/**
 * Static configuration for the try-on test page. Browser code only needs the
 * backend base URL; the backend owns any first-party API key server-side.
 */
export const TRY_ON_TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
} as const;

export const HISTORY_LIMIT = 20;
