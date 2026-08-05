import type { PartnerIconName } from "../types";

export interface InfluencerFeature {
  number: string;
  icon: PartnerIconName;
  title: string;
  description: string;
  note: string;
}

export interface InfluencerJourneyStep {
  number: string;
  title: string;
  description: string;
}

export interface InfluencerLandingViewModel {
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    annotation: string;
    image: string;
  };
  features: InfluencerFeature[];
  journey: InfluencerJourneyStep[];
  commissionLabels: string[];
  interest: { title: string; body: string };
}
