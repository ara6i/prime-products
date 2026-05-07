import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/app/try-on-test/auth/lib/session";

/**
 * Server-side gate for /try-on-test. Anything under that path requires a
 * valid admin session cookie; anything missing or invalid is bounced to
 * /try-on-test/login. The cookie's JWT is verified statelessly here (no
 * DB call) so the gate stays cheap on every request.
 *
 * /try-on-test/login is exempt so users can actually reach the form.
 * The login API endpoints under /api/try-on-test/auth/* are also exempt.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth API routes manage themselves; never gate them.
  if (pathname.startsWith("/api/try-on-test/auth/")) return NextResponse.next();
  // Login page is the destination of the redirect — must be reachable.
  if (pathname === "/try-on-test/login" || pathname.startsWith("/try-on-test/login/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value || "";
  if (!token) return redirectToLogin(req);
  const payload = await verifySessionToken(token);
  if (!payload) return redirectToLogin(req);
  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/try-on-test/login";
  url.search = `?from=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/try-on-test/:path*"],
};
