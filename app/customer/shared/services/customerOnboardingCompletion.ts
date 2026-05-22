"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "merchant_onboarding_completed";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function isCustomerOnboardingCompleted(username?: string | null): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;
  if (!username) return value === "1" || value.length > 0;
  return value === "1" || value === username;
}

export async function markCustomerOnboardingCompleted(username: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearCustomerOnboardingCompleted(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
