import { customerFetch } from "@/app/customer/shared/services/customerFetch";
import type {
  DomainVerificationResult,
  MerchantApiKeyResult,
  MerchantOnboardingData,
} from "../types";

function isLocalBackend(): boolean {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(baseUrl);
}

function createLocalDomainVerification(data: MerchantOnboardingData): DomainVerificationResult {
  return {
    verified: true,
    checkedAt: new Date().toISOString(),
    record: data.dns.record,
    foundValues: [data.dns.record.value],
  };
}

function createLocalApiKeyResult(data: MerchantOnboardingData): MerchantApiKeyResult {
  const slug = data.store.username.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const key = `ps_demo_${slug}_${Date.now().toString(36)}`;

  return {
    created: true,
    key,
    id: `local-${slug}`,
    keyPrefix: "ps_demo",
    allowedDomains: [data.store.domain, `www.${data.store.domain}`],
    projectId: `local-project-${slug}`,
    storeProfileId: `local-store-${slug}`,
    message: "Local demo key created. No live production key was generated.",
  };
}

export async function getMerchantOnboarding(): Promise<MerchantOnboardingData> {
  return customerFetch<MerchantOnboardingData>("/api/customer/onboarding");
}

export async function verifyMerchantDomain(): Promise<DomainVerificationResult> {
  try {
    const result = await customerFetch<DomainVerificationResult>("/api/customer/onboarding/domain/verify", {
      method: "POST",
    });

    if (result.verified || !isLocalBackend()) return result;

    const data = await getMerchantOnboarding();
    return createLocalDomainVerification(data);
  } catch (error) {
    if (!isLocalBackend()) throw error;
    const data = await getMerchantOnboarding();
    return createLocalDomainVerification(data);
  }
}

export async function createMerchantApiKey(): Promise<MerchantApiKeyResult> {
  try {
    return await customerFetch<MerchantApiKeyResult>("/api/customer/onboarding/api-key", {
      method: "POST",
    });
  } catch (error) {
    if (!isLocalBackend()) throw error;
    const data = await getMerchantOnboarding();
    return createLocalApiKeyResult(data);
  }
}
