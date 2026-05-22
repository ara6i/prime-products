"use server";

import { cookies } from "next/headers";
import { clearCustomerOnboardingCompleted } from "./customerOnboardingCompletion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const CUSTOMER_SESSION_COOKIE_NAME = "customer_session";
const BACKEND_SESSION_COOKIE_NAME = "customer_session";

export interface CustomerUser {
  username: string;
  role?: "admin" | "merchant";
  store?: {
    username: string;
    storeName: string;
    merchantName: string;
    domain: string;
    ownerEmail: string;
    invitationCode: string;
    domainVerificationToken: string;
  };
}

interface BackendSession {
  value: string;
  maxAgeSeconds: number;
}

export interface CustomerLoginResult {
  ok: boolean;
  error?: string;
  user?: CustomerUser;
}

export async function loginCustomer(username: string, password: string): Promise<CustomerLoginResult> {
  if (!API_BASE_URL) {
    return { ok: false, error: "Backend is not configured." };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/customer/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
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
    user?: CustomerUser;
  };

  if (!data.ok || !data.session?.value) {
    return { ok: false, error: "Login failed. Please try again." };
  }

  if (data.user?.role !== "merchant") {
    return { ok: false, error: "Use the admin login for operator accounts." };
  }

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE_NAME, data.session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: data.session.maxAgeSeconds,
  });

  return { ok: true, user: data.user };
}

export async function logoutCustomer(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;

  if (session && API_BASE_URL) {
    try {
      await fetch(`${API_BASE_URL}/api/customer/auth/logout`, {
        method: "POST",
        headers: { Cookie: `${BACKEND_SESSION_COOKIE_NAME}=${session}` },
        cache: "no-store",
      });
    } catch {
      // Best-effort; clear local state even if backend logout is unreachable.
    }
  }

  cookieStore.delete(CUSTOMER_SESSION_COOKIE_NAME);
  await clearCustomerOnboardingCompleted();
}

export async function getCustomerMe(): Promise<CustomerUser | null> {
  if (!API_BASE_URL) return null;

  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/customer/auth/me`, {
      headers: { Cookie: `${BACKEND_SESSION_COOKIE_NAME}=${session}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user?: CustomerUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}
