import { NextResponse } from "next/server";
import { exchangePdpStudioShopifyInstallToken } from "../../shared/pdpStudioAuthService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";
  const destination = new URL("/pdp-studio/products", url.origin);

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
