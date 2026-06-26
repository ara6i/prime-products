import { customerFetch } from "@/app/customer/shared/services/customerFetch";
import { isCustomerApiLocalBackend } from "@/app/customer/shared/services/customerApiBase";
import type {
  DomainVerificationResult,
  MerchantOnboardingData,
  MerchantOnboardingProfileInput,
  MerchantOnboardingProfileResult,
  MerchantOnboardingReviewResult,
} from "../types";

export async function getMerchantOnboarding(): Promise<MerchantOnboardingData> {
  const data = await customerFetch<MerchantOnboardingData>("/api/customer/onboarding");
  return normalizeMerchantOnboardingData(data);
}

export async function saveMerchantOnboardingProfile(
  profile: MerchantOnboardingProfileInput,
): Promise<MerchantOnboardingProfileResult> {
  try {
    const result = await customerFetch<MerchantOnboardingProfileResult>("/api/customer/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    return {
      ...result,
      onboarding: normalizeMerchantOnboardingData(result.onboarding),
    };
  } catch (error) {
    if (!isCustomerApiLocalBackend()) throw error;
    const data = await getMerchantOnboarding();
    const now = new Date().toISOString();
    const profileResult = {
      ...profile,
      websiteDomain: domainFromWebsite(profile.website) ?? data.store.domain,
      catalogDescription: profile.catalogDescription.trim() || null,
      completed: true,
      completedAt: now,
      updatedAt: now,
    };
    const fallbackData: MerchantOnboardingData = {
      ...data,
      store: {
        ...data.store,
        storeName: profileResult.websiteDomain,
        merchantName: profileResult.name,
        domain: profileResult.websiteDomain,
        ownerEmail: profileResult.email,
      },
      profile: profileResult,
      review: {
        id: null,
        status: "domain_pending",
        approvalSource: null,
        submittedAt: null,
        reviewedAt: null,
        notes: null,
        checks: [],
        aiReview: null,
      },
      dns: {
        ...data.dns,
        record: {
          ...data.dns.record,
          host: profileResult.websiteDomain === "localhost"
            ? "_primestyleai.localhost"
            : `_primestyleai.${profileResult.websiteDomain}`,
        },
      },
    };
    return {
      ok: true,
      profile: profileResult,
      onboarding: fallbackData,
    };
  }
}

export async function verifyMerchantDomain(): Promise<DomainVerificationResult> {
  return customerFetch<DomainVerificationResult>("/api/customer/onboarding/domain/verify", {
    method: "POST",
  });
}

export async function submitMerchantOnboardingReview(): Promise<MerchantOnboardingReviewResult> {
  return customerFetch<MerchantOnboardingReviewResult>("/api/customer/onboarding/review/submit", {
    method: "POST",
  });
}

function normalizeMerchantOnboardingData(data: MerchantOnboardingData): MerchantOnboardingData {
  return {
    ...data,
    profile: data.profile ?? {
      name: data.store.merchantName,
      email: data.store.ownerEmail,
      website: data.store.domain === "localhost" ? "" : `https://${data.store.domain}`,
      websiteDomain: data.store.domain === "localhost" ? "" : data.store.domain,
      monthlyVisitors: "",
      catalogDescription: null,
      toolIntegration: "react-sdk",
      shareData: false,
      completed: false,
      completedAt: null,
      updatedAt: null,
    },
    review: data.review ?? {
      id: null,
      status: "draft",
      approvalSource: null,
      submittedAt: null,
      reviewedAt: null,
      notes: null,
      checks: [],
      aiReview: null,
    },
  };
}

function domainFromWebsite(value: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}
