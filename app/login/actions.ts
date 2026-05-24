"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSiteAuthDb } from "@/app/shared/auth/siteAuthDb";
import { SiteAuthUserModel } from "@/app/shared/auth/SiteAuthUser";
import {
  getSiteAuthJwtSecret,
  isSiteAuthEnabled,
  sanitizeRedirectPath,
  signSiteSessionToken,
  SITE_AUTH_COOKIE_NAME,
  SITE_AUTH_TTL_SECONDS,
} from "@/app/shared/auth/siteSession";

export interface LoginState {
  error: string | null;
  errorId?: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function normalizeInput(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getAttemptKey(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headerStore.get("x-real-ip") || "local";
}

function isAttemptLocked(key: string): boolean {
  const current = failedAttempts.get(key);
  if (!current) return false;

  if (Date.now() > current.resetAt) {
    failedAttempts.delete(key);
    return false;
  }

  return current.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const current = failedAttempts.get(key);

  if (!current || now > current.resetAt) {
    failedAttempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }

  failedAttempts.set(key, { ...current, count: current.count + 1 });
}

function invalidCredentials(): LoginState {
  return {
    error: "Credentials were not correct.",
    errorId: Date.now(),
  };
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = normalizeInput(formData.get("username"));
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  const redirectTo = sanitizeRedirectPath(normalizeInput(formData.get("redirectTo")));
  const attemptKey = await getAttemptKey();

  if (!isSiteAuthEnabled() || !getSiteAuthJwtSecret()) {
    return {
      error: "Local site access is not configured.",
      errorId: Date.now(),
    };
  }

  if (!username || !password) {
    return {
      error: "Enter both username and password.",
      errorId: Date.now(),
    };
  }

  if (isAttemptLocked(attemptKey)) {
    return {
      error: "Too many attempts. Try again later.",
      errorId: Date.now(),
    };
  }

  let user: { _id: unknown; username: string; passwordHash: string } | null;
  try {
    await getSiteAuthDb();
    user = await SiteAuthUserModel.findOne({ username: username.toLowerCase() })
      .select("_id username passwordHash")
      .lean();
  } catch {
    return {
      error: "Local site access is not configured.",
      errorId: Date.now(),
    };
  }

  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    recordFailedAttempt(attemptKey);
    return invalidCredentials();
  }

  const token = await signSiteSessionToken(user.username);
  const cookieStore = await cookies();
  failedAttempts.delete(attemptKey);
  void SiteAuthUserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  cookieStore.set(SITE_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_AUTH_TTL_SECONDS,
  });

  redirect(redirectTo);
}
