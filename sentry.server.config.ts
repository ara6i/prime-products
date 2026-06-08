import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const isVercel =
  process.env.VERCEL === "1" ||
  Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_URL);
const sentryEnabled =
  (process.env.SENTRY_FRONTEND_ENABLED ?? process.env.NEXT_PUBLIC_ENABLE_FRONTEND_SENTRY) === "true" &&
  !isVercel;

function scrubEvent(event: Sentry.Event): Sentry.Event {
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
  }
  if (typeof event.request?.query_string === "string") {
    event.request.query_string = event.request.query_string.replace(/(key|token|secret|password)=([^&]+)/gi, "$1=[redacted]");
  }
  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      if (/image|photo|base64|authorization|cookie|token|secret|password|apikey/i.test(key)) {
        event.extra[key] = "[redacted]";
      }
    }
  }
  return event;
}

if (dsn && sentryEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
    beforeSend: (event) => scrubEvent(event as Sentry.Event) as any,
  });
}
