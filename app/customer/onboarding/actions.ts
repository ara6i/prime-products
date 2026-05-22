"use server";

import { revalidatePath } from "next/cache";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { markCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import {
  createMerchantApiKey,
  verifyMerchantDomain,
} from "./services/onboardingService";

export async function verifyMerchantDomainAction() {
  return verifyMerchantDomain();
}

export async function createMerchantApiKeyAction() {
  return createMerchantApiKey();
}

export async function completeMerchantOnboardingAction() {
  const me = await getCustomerMe();
  if (me?.role !== "merchant") {
    throw new Error("Merchant session required.");
  }

  await markCustomerOnboardingCompleted(me.username);
  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/onboarding");
  return { ok: true };
}
