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
  profile: MerchantOnboardingProfile;
  dns: {
    record: MerchantDnsRecord;
    verified: boolean;
    checkedAt: string | null;
  };
  review: MerchantOnboardingReview;
}

export interface DomainVerificationResult {
  verified: boolean;
  checkedAt: string;
  record: MerchantDnsRecord;
  foundValues: string[];
}

export type MerchantToolIntegration = "react-sdk" | "api" | "shopify";

export interface MerchantOnboardingProfile {
  name: string;
  email: string;
  website: string;
  websiteDomain: string;
  monthlyVisitors: string;
  catalogDescription: string | null;
  toolIntegration: MerchantToolIntegration;
  shareData: boolean;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string | null;
}

export interface MerchantOnboardingProfileInput {
  name: string;
  email: string;
  website: string;
  monthlyVisitors: string;
  catalogDescription: string;
  toolIntegration: MerchantToolIntegration;
  shareData: boolean;
}

export interface MerchantOnboardingProfileResult {
  ok: boolean;
  profile: MerchantOnboardingProfile;
  onboarding: MerchantOnboardingData;
}

export type MerchantOnboardingReviewStatus =
  | "draft"
  | "domain_pending"
  | "auto_reviewing"
  | "manual_review"
  | "approved"
  | "rejected";

export interface MerchantOnboardingReview {
  id: string | null;
  status: MerchantOnboardingReviewStatus;
  approvalSource: "auto" | "manual" | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  notes: string | null;
  checks: Array<{ label: string; passed: boolean; detail: string }>;
  aiReview: {
    score: number;
    isEcommerce: boolean;
    qualityScore: number;
    trafficScore: number;
    reasons: string[];
  } | null;
}

export interface MerchantOnboardingReviewResult {
  ok: boolean;
  review: MerchantOnboardingReview;
}

export type OnboardingStepId = "welcome" | "business" | "domain" | "review";

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
  profile: MerchantOnboardingProfile;
  review: MerchantOnboardingReview;
  dnsRecord: MerchantDnsRecord;
  steps: OnboardingStepViewModel[];
}
