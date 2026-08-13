export type PartnerAudience = "influencer" | "merchant" | "supplier";

export type CreatorPrimaryChannel =
  | "instagram"
  | "tiktok"
  | "threads"
  | "youtube"
  | "pinterest"
  | "blog"
  | "other";

export type CreatorAudienceSize =
  "under-10k" | "10k-50k" | "50k-250k" | "250k-1m" | "1m-plus";

export type PartnerIconName =
  | "bag"
  | "link"
  | "wallet"
  | "users"
  | "brief"
  | "approval"
  | "chart"
  | "sparkle"
  | "profile"
  | "catalog"
  | "product"
  | "ruler"
  | "cart"
  | "cycle"
  | "receipt"
  | "shield";

export interface PartnerInterestPayload {
  audience: PartnerAudience;
  name: string;
  email: string;
  website?: string;
  primaryChannel?: CreatorPrimaryChannel;
  creatorProfiles?: Array<{
    platform: CreatorPrimaryChannel;
    url: string;
  }>;
  audienceSize?: CreatorAudienceSize;
  location?: string;
  timezone?: string;
  marketingConsent?: boolean;
  leadSource?: "creator-waitlist";
}

export interface PartnerInterestResult {
  ok: boolean;
  message: string;
}
