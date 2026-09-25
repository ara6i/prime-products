import { readFile } from "node:fs/promises";
import path from "node:path";

import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_REPORT_PATH = path.join(
  process.cwd(),
  "private-reports",
  "waist-hip-commercial-100.html",
);

const SECURITY_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "img-src data:",
    "connect-src 'none'",
    "font-src data:",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
  ].join("; "),
  "Content-Type": "text/html; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function configuredReportPath(): string {
  return process.env.COMMERCIAL_SIZING_HTML_PATH?.trim() || DEFAULT_REPORT_PATH;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const html = await readFile(configuredReportPath(), "utf8");
    return new Response(html, { status: 200, headers: SECURITY_HEADERS });
  } catch (error) {
    console.error("[commercial-sizing-report] HTML artifact unavailable", error);
    return new Response("Commercial sizing report is temporarily unavailable.", {
      status: 503,
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

