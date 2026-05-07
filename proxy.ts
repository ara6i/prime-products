import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/app/try-on-test/auth/lib/session";

// Domains that should serve the /admin tree as their root.
// Configurable via ADMIN_HOSTS (comma-separated) to avoid hard-coding env-specific hosts.
const DEFAULT_ADMIN_HOSTS = [
  "admin.primestyleai.com",
  "admin.primestyle.ai",
  "admin.localhost",
];

function getAdminHosts(): string[] {
  const env = process.env.ADMIN_HOSTS;
  if (!env) return DEFAULT_ADMIN_HOSTS;
  return env.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

function normalizeHost(hostHeader: string | null): string {
  if (!hostHeader) return "";
  return hostHeader.split(":")[0]!.trim().toLowerCase();
}

export async function proxy(req: NextRequest) {
  const host = normalizeHost(req.headers.get("host"));
  const adminHosts = getAdminHosts();
  const isAdminHost = adminHosts.includes(host);

  const url = req.nextUrl;
  const pathname = url.pathname;

  // ── Try-on-test admin gate ──
  // Anything under /try-on-test except the login page itself + auth API
  // requires a valid admin session cookie. JWT signature verified
  // statelessly so this stays cheap.
  const isTryOnTestPath = pathname === "/try-on-test" || pathname.startsWith("/try-on-test/");
  const isTryOnTestLogin = pathname === "/try-on-test/login" || pathname.startsWith("/try-on-test/login/");
  const isTryOnTestAuthApi = pathname.startsWith("/api/try-on-test/auth/");
  if (isTryOnTestPath && !isTryOnTestLogin && !isTryOnTestAuthApi) {
    const token = req.cookies.get(COOKIE_NAME)?.value || "";
    const payload = token ? await verifySessionToken(token) : null;
    if (!payload) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/try-on-test/login";
      redirectUrl.search = `?from=${encodeURIComponent(pathname + url.search)}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // On the admin subdomain: rewrite every path to its /admin/* counterpart.
  if (isAdminHost) {
    if (pathname === "/" || pathname === "") {
      const rewritten = url.clone();
      rewritten.pathname = "/admin";
      return NextResponse.rewrite(rewritten);
    }
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
      const rewritten = url.clone();
      rewritten.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(rewritten);
    }
    return NextResponse.next();
  }

  // /admin/* passes through on any host — accessible at both
  // admin.primestyleai.com/* and primestyleai.com/admin/*.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals, static files, and favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
