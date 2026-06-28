import { NextResponse, type NextRequest } from "next/server";
import {
  isSiteAuthEnabled,
  SITE_AUTH_COOKIE_NAME,
  verifySiteSessionToken,
} from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost, isTryOnTestApiPath, isTryOnTestPath, normalizeHost } from "@/app/try-on-test/lib/access";

// Domains that should serve the /admin tree as their root.
// Configurable via ADMIN_HOSTS (comma-separated) to avoid hard-coding env-specific hosts.
const DEFAULT_ADMIN_HOSTS = [
  "admin.primestyleai.com",
  "admin.primestyle.ai",
  "admin.localhost",
];

const DEFAULT_PUBLIC_PRODUCTION_HOSTS = [
  "primestyleai.com",
  "www.primestyleai.com",
  "myaifitting.com",
  "www.myaifitting.com",
];

function getAdminHosts(): string[] {
  const env = process.env.ADMIN_HOSTS;
  if (!env) return DEFAULT_ADMIN_HOSTS;
  return env.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

function getPublicProductionHosts(): string[] {
  const env = process.env.PRIME_PRODUCTS_PUBLIC_PRODUCTION_HOSTS;
  if (!env) return DEFAULT_PUBLIC_PRODUCTION_HOSTS;
  return env.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

export async function proxy(req: NextRequest) {
  const host = normalizeHost(req.headers.get("host"));
  const adminHosts = getAdminHosts();
  const publicProductionHosts = getPublicProductionHosts();
  const isAdminHost = adminHosts.includes(host);
  const siteAuthEnabled = isSiteAuthEnabled();

  const url = req.nextUrl;
  const pathname = url.pathname;
  const isSiteLoginPath = pathname === "/login" || pathname.startsWith("/login/");
  const isTryOnTestRoute = isTryOnTestPath(pathname);
  const isTryOnTestApiRoute = isTryOnTestApiPath(pathname);
  const isPublicProductionHost = publicProductionHosts.includes(host);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApiRoute = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isTestLabRoute = pathname === "/test-lab" || pathname.startsWith("/test-lab/");
  const isTestLabApiRoute = pathname === "/api/test-lab" || pathname.startsWith("/api/test-lab/");

  if (isPublicProductionHost && isAdminApiRoute) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (isPublicProductionHost && isAdminRoute) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicProductionHost && isTestLabApiRoute) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (isPublicProductionHost && isTestLabRoute) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (isPublicProductionHost && (isTryOnTestRoute || isTryOnTestApiRoute)) {
    if (isTryOnTestApiRoute) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return new NextResponse("Not found", { status: 404 });
  }

  if ((isTryOnTestRoute || isTryOnTestApiRoute) && !isTestLabAvailableForHost(host)) {
    if (isTryOnTestApiRoute) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return new NextResponse("Not found", { status: 404 });
  }

  // ── Local/staging whole-site gate ──
  // Enabled only by env. Keeps the public site, admin screens, demo routes,
  // and local API routes behind a signed HTTP-only session cookie.
  if (siteAuthEnabled && !isSiteLoginPath) {
    const token = req.cookies.get(SITE_AUTH_COOKIE_NAME)?.value || "";
    const payload = token ? await verifySiteSessionToken(token) : null;

    if (!payload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const redirectUrl = url.clone();
      redirectUrl.pathname = "/login";
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
    if (
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next") &&
      !(siteAuthEnabled && isSiteLoginPath)
    ) {
      const rewritten = url.clone();
      rewritten.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(rewritten);
    }
    return NextResponse.next();
  }

  // Non-admin, non-public-production hosts can still expose staging/local tools
  // according to their environment allowlists.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals, static files, and favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
