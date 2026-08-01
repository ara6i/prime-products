import { MERCHANT_LANDING_CONTENT } from "../data/merchantLandingContent";
import type { MerchantLandingViewModel } from "../types";

export function mapMerchantLandingViewModel(): MerchantLandingViewModel {
  return {
    ...MERCHANT_LANDING_CONTENT,
    commerceSteps: MERCHANT_LANDING_CONTENT.commerceSteps.map((step) => ({ ...step })),
    capabilities: MERCHANT_LANDING_CONTENT.capabilities.map((capability) => ({ ...capability })),
    campaignTerms: [...MERCHANT_LANDING_CONTENT.campaignTerms],
  };
}
