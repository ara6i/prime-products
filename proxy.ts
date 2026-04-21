import { NextResponse, type NextRequest } from "next/server";

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

export function proxy(req: NextRequest) {
  const host = normalizeHost(req.headers.get("host"));
  const adminHosts = getAdminHosts();
  const isAdminHost = adminHosts.includes(host);

  const url = req.nextUrl;
  const pathname = url.pathname;

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
