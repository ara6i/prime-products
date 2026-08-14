import { INFLUENCER_LANDING_CONTENT } from "../data/influencerLandingContent";
import type { InfluencerLandingViewModel } from "../types";

export function mapInfluencerLandingViewModel(): InfluencerLandingViewModel {
  return {
    ...INFLUENCER_LANDING_CONTENT,
    features: INFLUENCER_LANDING_CONTENT.features.map((feature) => ({ ...feature })),
    journey: INFLUENCER_LANDING_CONTENT.journey.map((step) => ({ ...step })),
    commissionLabels: [...INFLUENCER_LANDING_CONTENT.commissionLabels],
  };
}
