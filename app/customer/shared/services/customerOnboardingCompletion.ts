"use server";

import { cookies } from "next/headers";
import { customerFetch } from "./customerFetch";

const COOKIE_NAME = "merchant_onboarding_completed";

interface CustomerOnboardingGateResponse {
  review?: {
    status?: string | null;
  } | null;
}

export async function isCustomerOnboardingCompleted(username?: string | null): Promise<boolean> {
  void username;
  try {
    const data = await customerFetch<CustomerOnboardingGateResponse>("/api/customer/onboarding");
    return data.review?.status === "approved";
  } catch {
    return false;
  }
}

export async function markCustomerOnboardingCompleted(username: string): Promise<void> {
  void username;
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function clearCustomerOnboardingCompleted(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
