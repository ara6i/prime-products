import { NextResponse } from "next/server";
import { exchangePdpStudioShopifyInstallToken } from "../../shared/pdpStudioAuthService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolvePdpStudioOrigin(request: Request): string {
  const origin = new URL(request.url);

  // Next's local dev server can expose its internal 0.0.0.0 host to route
  // handlers even when the browser used localhost. Redirecting back to that
  // internal host drops the session cookie that this callback just set.
  if (origin.hostname === "0.0.0.0") {
    origin.hostname = "localhost";
  }

  return origin.origin;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";
  const destination = new URL(
    "/pdp-studio/products",
    resolvePdpStudioOrigin(request),
  );

  if (!token) {
    destination.searchParams.set("shopify", "error");
    destination.searchParams.set(
      "message",
      "The Shopify sign-in link is missing.",
    );
    return NextResponse.redirect(destination);
  }

  const result = await exchangePdpStudioShopifyInstallToken(token);
  if (!result.ok) {
    destination.searchParams.set("shopify", "error");
    destination.searchParams.set(
      "message",
      result.error || "Shopify sign-in failed.",
    );
    return NextResponse.redirect(destination);
  }

  destination.searchParams.set("shopify", "connected");
  destination.searchParams.set("onboarding", "1");
  return NextResponse.redirect(destination);
}
