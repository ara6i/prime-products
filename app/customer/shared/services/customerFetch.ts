"use server";

import { cookies } from "next/headers";
import { getCustomerApiBaseUrl } from "./customerApiBase";

const CUSTOMER_SESSION_COOKIE_NAME = "customer_session";
const BACKEND_SESSION_COOKIE_NAME = "customer_session";

export type CustomerFetchError = {
  status: number;
  message: string;
};

export async function customerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getCustomerApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!session) {
    const err: CustomerFetchError = { status: 401, message: "No customer session" };
    throw err;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
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
