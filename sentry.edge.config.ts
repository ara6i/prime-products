import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isVercel =
  process.env.VERCEL === "1" ||
  Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_URL);
const sentryEnabled =
  process.env.NEXT_PUBLIC_ENABLE_FRONTEND_SENTRY === "true" &&
  !isVercel;

if (dsn && sentryEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.02),
  });
}
