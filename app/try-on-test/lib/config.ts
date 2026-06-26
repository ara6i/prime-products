/**
 * Static configuration for the try-on test page. Browser code only needs the
 * try-on-test API endpoints are called from the browser with a local test key so
 * the PDP lab and demo lab share the exact same auth shape.
 */
export const TRY_ON_TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  apiKey:
    process.env.NEXT_PUBLIC_PRIMESTYLE_API_KEY ??
    process.env.NEXT_PUBLIC_API_KEY ??
    process.env.PRIMESTYLE_API_KEY ??
    process.env.PS_API_KEY ??
    undefined,
} as const;

export const HISTORY_LIMIT = 20;
