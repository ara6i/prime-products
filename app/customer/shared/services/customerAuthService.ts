"use server";

import { cookies } from "next/headers";
import { clearCustomerOnboardingCompleted } from "./customerOnboardingCompletion";
import { getCustomerApiBaseUrl } from "./customerApiBase";

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

type CustomerAuthPayload = {
  ok?: boolean;
  error?: string;
  session?: BackendSession;
  user?: CustomerUser;
  message?: string;
};

async function setCustomerSessionFromPayload(data: CustomerAuthPayload): Promise<CustomerLoginResult> {
  if (!data.ok || !data.session?.value) {
    return { ok: false, error: data.error ?? "Customer auth response did not include a session." };
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

export async function loginCustomer(username: string, password: string): Promise<CustomerLoginResult> {
  const apiBaseUrl = getCustomerApiBaseUrl();

  if (!apiBaseUrl) {
    return { ok: false, error: "Backend is not configured." };
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/customer/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Unable to reach the customer auth server. Start the local backend and try again." };
  }

  if (response.status === 401) {
    return { ok: false, error: "Invalid username or password." };
  }
  if (response.status === 404) {
    return { ok: false, error: "Customer auth backend route is missing." };
  }
  if (!response.ok) {
    return { ok: false, error: `Customer login backend failed (${response.status}).` };
  }

  return setCustomerSessionFromPayload((await response.json()) as CustomerAuthPayload);
}

export async function signupCustomer(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const apiBaseUrl = getCustomerApiBaseUrl();
  if (!apiBaseUrl) return { ok: false, error: "Backend is not configured." };

  try {
    const response = await fetch(`${apiBaseUrl}/api/customer/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as CustomerAuthPayload;
    if (!response.ok || !data.ok) return { ok: false, error: data.error ?? `Customer signup failed (${response.status}).` };
    return { ok: true, message: data.message ?? "Verification code sent." };
  } catch {
    return { ok: false, error: "Unable to reach the customer auth server. Start the local backend and try again." };
  }
}

export async function verifyCustomerEmail(
  email: string,
  code: string,
): Promise<CustomerLoginResult> {
  const apiBaseUrl = getCustomerApiBaseUrl();
  if (!apiBaseUrl) return { ok: false, error: "Backend is not configured." };

  try {
    const response = await fetch(`${apiBaseUrl}/api/customer/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as CustomerAuthPayload;
    if (!response.ok) return { ok: false, error: data.error ?? `Email verification failed (${response.status}).` };
    return setCustomerSessionFromPayload(data);
  } catch {
    return { ok: false, error: "Unable to reach the customer auth server. Start the local backend and try again." };
  }
}

export async function socialLoginCustomer(
  provider: "google" | "apple",
  token: string,
): Promise<CustomerLoginResult> {
  const apiBaseUrl = getCustomerApiBaseUrl();
  if (!apiBaseUrl) return { ok: false, error: "Backend is not configured." };
  const body = provider === "google" ? { idToken: token } : { identityToken: token };

  try {
    const response = await fetch(`${apiBaseUrl}/api/customer/auth/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as CustomerAuthPayload;
    if (!response.ok) return { ok: false, error: data.error ?? `${provider} login failed (${response.status}).` };
    return setCustomerSessionFromPayload(data);
  } catch {
    return { ok: false, error: "Unable to reach the customer auth server. Start the local backend and try again." };
  }
}

export async function logoutCustomer(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  const apiBaseUrl = getCustomerApiBaseUrl();

  if (session && apiBaseUrl) {
    try {
      await fetch(`${apiBaseUrl}/api/customer/auth/logout`, {
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
  const apiBaseUrl = getCustomerApiBaseUrl();
  if (!apiBaseUrl) return null;

  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/customer/auth/me`, {
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
