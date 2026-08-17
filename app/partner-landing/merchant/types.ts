import type { PartnerIconName } from "../types";

export interface MerchantCommerceStep {
  number: string;
  icon: PartnerIconName;
  title: string;
  description: string;
}

export interface MerchantCapability {
  icon: PartnerIconName;
  title: string;
  description: string;
  label: string;
}

export interface MerchantLandingViewModel {
  hero: {
    eyebrow: string;
    titleLead: string;
    titleMiddleLead: string;
    titleMiddleTail: string;
    titleAccent: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    annotation: string;
    image: string;
    heroImage: string;
    heroMobileImage: string;
    pillars: Array<{
      title: string;
      description: string;
      image: string;
      imageAlt: string;
    }>;
  };
  commerceSteps: MerchantCommerceStep[];
  capabilities: MerchantCapability[];
  campaignTerms: string[];
  interest: { title: string; body: string };
}
