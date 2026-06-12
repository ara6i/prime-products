"use server";

import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.PRIMESTYLE_ADMIN_API_INTERNAL_URL ||
  process.env.PRIMESTYLE_API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";
const COOKIE_NAME = "admin_session";

export type AdminFetchError = {
  status: number;
  message: string;
};

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) {
    const err: AdminFetchError = { status: 401, message: "No admin session" };
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Cookie: `${COOKIE_NAME}=${session}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    const err: AdminFetchError = { status: response.status, message };
    throw err;
  }

  return (await response.json()) as T;
}
