"use server";

import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const COOKIE_NAME = "admin_session";

export interface AdminUser {
  username: string;
}

export interface BackendSession {
  value: string;
  maxAgeSeconds: number;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function loginAdmin(username: string, password: string): Promise<LoginResult> {
  if (!API_BASE_URL) {
    return { ok: false, error: "Backend is not configured." };
  }

  console.log(`[admin/login] → POST ${API_BASE_URL}/api/admin/auth/login (user=${username})`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    console.log(`[admin/login] ← ${response.status} ${response.statusText} from backend`);
  } catch (err) {
    console.error(`[admin/login] ✗ fetch to ${API_BASE_URL} failed:`, err instanceof Error ? err.message : err);
    return { ok: false, error: "Unable to reach the server. Please try again." };
  }

  if (response.status === 401) {
    return { ok: false, error: "Invalid username or password." };
  }
  if (!response.ok) {
    return { ok: false, error: "Login failed. Please try again." };
  }

  const data = (await response.json()) as {
    ok?: boolean;
    session?: BackendSession;
    user?: AdminUser;
  };

  if (!data.ok || !data.session?.value) {
    return { ok: false, error: "Login failed. Please try again." };
  }

  const store = await cookies();
  store.set(COOKIE_NAME, data.session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: data.session.maxAgeSeconds,
  });

  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  const session = store.get(COOKIE_NAME)?.value;

  if (session && API_BASE_URL) {
    try {
      await fetch(`${API_BASE_URL}/api/admin/auth/logout`, {
        method: "POST",
        headers: { Cookie: `${COOKIE_NAME}=${session}` },
        cache: "no-store",
      });
    } catch {
      // Best-effort; we still clear the local cookie below.
    }
  }

  store.delete(COOKIE_NAME);
}

export async function getAdminMe(): Promise<AdminUser | null> {
  if (!API_BASE_URL) return null;

  const store = await cookies();
  const session = store.get(COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/auth/me`, {
      headers: { Cookie: `${COOKIE_NAME}=${session}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user?: AdminUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}
