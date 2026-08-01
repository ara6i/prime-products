"use server";

import { cookies } from "next/headers";

const PDP_STUDIO_SESSION_COOKIE_NAME = "pdp_studio_session";
const TEST_BACKEND_URL = "https://test-be-9a7k.primestyleai.com";

export interface PdpStudioUser {
  id: string;
  name: string;
  email: string;
}

interface BackendSession {
  value: string;
  maxAgeSeconds: number;
}

interface PdpStudioAuthPayload {
  ok?: boolean;
  error?: string;
  session?: BackendSession;
  user?: PdpStudioUser;
}

export interface PdpStudioAuthResult {
  ok: boolean;
  error?: string;
  user?: PdpStudioUser;
}

function getPdpStudioApiBaseUrl(): string {
  return (
    process.env.PRIMESTYLE_PDP_STUDIO_API_INTERNAL_URL ||
    process.env.PRIMESTYLE_API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    TEST_BACKEND_URL
  ).replace(/\/$/, "");
}

async function setPdpStudioSessionFromPayload(data: PdpStudioAuthPayload): Promise<PdpStudioAuthResult> {
  if (!data.ok || !data.session?.value || !data.user) {
    return { ok: false, error: data.error ?? "PDP Studio auth response did not include a session." };
  }

  const cookieStore = await cookies();
  cookieStore.set(PDP_STUDIO_SESSION_COOKIE_NAME, data.session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: data.session.maxAgeSeconds,
  });

  return { ok: true, user: data.user };
}

export async function loginPdpStudio(email: string, password: string): Promise<PdpStudioAuthResult> {
  const apiBaseUrl = getPdpStudioApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/api/pdp-studio/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as PdpStudioAuthPayload;
    if (!response.ok || !data.ok) return { ok: false, error: data.error ?? `PDP Studio login failed (${response.status}).` };
    return setPdpStudioSessionFromPayload(data);
  } catch {
    return { ok: false, error: "Unable to reach the PDP Studio auth server." };
  }
}

export async function signupPdpStudio(name: string, email: string, password: string): Promise<PdpStudioAuthResult> {
  const apiBaseUrl = getPdpStudioApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/api/pdp-studio/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as PdpStudioAuthPayload;
    if (!response.ok || !data.ok) return { ok: false, error: data.error ?? `PDP Studio signup failed (${response.status}).` };
    return setPdpStudioSessionFromPayload(data);
  } catch {
    return { ok: false, error: "Unable to reach the PDP Studio auth server." };
  }
}

export async function socialLoginPdpStudio(provider: "google" | "apple", token: string): Promise<PdpStudioAuthResult> {
  const apiBaseUrl = getPdpStudioApiBaseUrl();
  const body = provider === "google" ? { idToken: token } : { identityToken: token };

  try {
    const response = await fetch(`${apiBaseUrl}/api/pdp-studio/auth/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as PdpStudioAuthPayload;
    if (!response.ok || !data.ok) return { ok: false, error: data.error ?? `PDP Studio ${provider} login failed (${response.status}).` };
    return setPdpStudioSessionFromPayload(data);
  } catch {
    return { ok: false, error: "Unable to reach the PDP Studio auth server." };
  }
}

export async function getPdpStudioGoogleAuthUrl(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const apiBaseUrl = getPdpStudioApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/api/pdp-studio/auth/google/url`, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !data.url) return { ok: false, error: data.error ?? `Google login URL failed (${response.status}).` };
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "Unable to reach the PDP Studio auth server." };
  }
}

export async function exchangePdpStudioShopifyInstallToken(
  token: string,
): Promise<PdpStudioAuthResult> {
  const apiBaseUrl = getPdpStudioApiBaseUrl();

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/pdp-studio/shopify/install/exchange`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      },
    );
    const data = (await response
      .json()
      .catch(() => ({}))) as PdpStudioAuthPayload;
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error:
          data.error ??
          `Shopify sign-in failed (${response.status}).`,
      };
    }
    return setPdpStudioSessionFromPayload(data);
  } catch {
    return {
      ok: false,
      error: "Unable to reach the PDP Studio Shopify sign-in server.",
    };
  }
}

export async function getPdpStudioMe(): Promise<PdpStudioUser | null> {
  const apiBaseUrl = getPdpStudioApiBaseUrl();
  const cookieStore = await cookies();
  const session = cookieStore.get(PDP_STUDIO_SESSION_COOKIE_NAME)?.value;
  const authBypassEnabled = process.env.PDP_STUDIO_AUTH_BYPASS === "true";
  if (!session && !authBypassEnabled) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/pdp-studio/auth/me`, {
      headers: session
        ? { Cookie: `${PDP_STUDIO_SESSION_COOKIE_NAME}=${session}` }
        : undefined,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user?: PdpStudioUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function logoutPdpStudio(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PDP_STUDIO_SESSION_COOKIE_NAME);
}
