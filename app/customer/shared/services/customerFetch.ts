"use server";

import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const CUSTOMER_SESSION_COOKIE_NAME = "customer_session";
const BACKEND_SESSION_COOKIE_NAME = "customer_session";

export type CustomerFetchError = {
  status: number;
  message: string;
};

export async function customerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!session) {
    const err: CustomerFetchError = { status: 401, message: "No customer session" };
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Cookie: `${BACKEND_SESSION_COOKIE_NAME}=${session}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    const err: CustomerFetchError = { status: response.status, message };
    throw err;
  }

  return (await response.json()) as T;
}
