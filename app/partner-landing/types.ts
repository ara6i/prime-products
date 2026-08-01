export type PartnerAudience = "influencer" | "merchant";

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
}

export interface PartnerInterestResult {
  ok: boolean;
  message: string;
}
