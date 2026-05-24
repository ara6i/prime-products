import type { NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export async function hasCapacityLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;

  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  if (!token) return false;
  return Boolean(await verifySiteSessionToken(token));
}
