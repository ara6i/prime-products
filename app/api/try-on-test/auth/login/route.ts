import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/app/try-on-test/auth/lib/db";
import { AdminUserModel } from "@/app/try-on-test/auth/lib/AdminUser";
import { signSessionToken, COOKIE_NAME, TOKEN_TTL_SECONDS } from "@/app/try-on-test/auth/lib/session";

// Node runtime — mongoose + bcryptjs are not Edge-compatible.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const username = (body.username || "").trim().toLowerCase();
  const password = body.password || "";
  if (!username || !password) {
    return NextResponse.json({ message: "Username and password required" }, { status: 400 });
  }

  await getDb();
  const user = await AdminUserModel.findOne({ username }).lean();
  if (!user) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  // Stamp the last-login time fire-and-forget — useful for audit, not
  // load-bearing for auth.
  void AdminUserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  const token = await signSessionToken({ username, uid: String(user._id) });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
  return res;
}
