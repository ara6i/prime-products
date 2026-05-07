import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/app/try-on-test/auth/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || "";
  if (!token) return NextResponse.json({ authenticated: false }, { status: 200 });
  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ authenticated: false }, { status: 200 });
  return NextResponse.json({ authenticated: true, username: payload.sub }, { status: 200 });
}
