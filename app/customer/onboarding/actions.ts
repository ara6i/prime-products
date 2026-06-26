"use server";

import {
  getMerchantOnboarding,
  saveMerchantOnboardingProfile,
  submitMerchantOnboardingReview,
  verifyMerchantDomain,
} from "./services/onboardingService";
import { mapMerchantOnboarding } from "./mappers/onboardingMapper";
import type { MerchantOnboardingProfileInput } from "./types";

export async function saveMerchantOnboardingProfileAction(
  profile: MerchantOnboardingProfileInput,
) {
  const result = await saveMerchantOnboardingProfile(profile);
  return {
    ...result,
    onboarding: mapMerchantOnboarding(result.onboarding),
  };
}

export async function getMerchantOnboardingAction() {
  return mapMerchantOnboarding(await getMerchantOnboarding());
}

export async function verifyMerchantDomainAction() {
  return verifyMerchantDomain();
}

export async function submitMerchantOnboardingReviewAction() {
  return submitMerchantOnboardingReview();
}
