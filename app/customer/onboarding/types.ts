export interface MerchantOnboardingStore {
  username: string;
  storeName: string;
  merchantName: string;
  domain: string;
  ownerEmail: string;
  invitationCode: string;
  invitationLink: string;
}

export interface MerchantDnsRecord {
  type: "TXT";
  host: string;
  value: string;
}

export interface MerchantOnboardingData {
  store: MerchantOnboardingStore;
  dns: {
    record: MerchantDnsRecord;
    verified: boolean;
    checkedAt: string | null;
  };
}

export interface DomainVerificationResult {
  verified: boolean;
  checkedAt: string;
  record: MerchantDnsRecord;
  foundValues: string[];
}

export interface MerchantApiKeyResult {
  created: boolean;
  key: string | null;
  id: string;
  keyPrefix: string;
  allowedDomains: string[];
  projectId: string;
  storeProfileId: string;
  message: string;
}

export type OnboardingStepId = "environment" | "domain" | "api-key";

export type OnboardingStepStatus = "ready" | "locked" | "complete";

export interface OnboardingStepViewModel {
  id: OnboardingStepId;
  label: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
}

export interface MerchantOnboardingViewModel {
  storeName: string;
  merchantName: string;
  domain: string;
  ownerEmail: string;
  invitationCode: string;
  invitationLink: string;
  dnsRecord: MerchantDnsRecord;
  steps: OnboardingStepViewModel[];
}
