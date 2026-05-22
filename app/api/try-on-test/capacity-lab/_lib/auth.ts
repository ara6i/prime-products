import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/app/try-on-test/auth/lib/session";

export async function hasCapacityLabAccess(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";
  if (!token) return false;
  return Boolean(await verifySessionToken(token));
}
