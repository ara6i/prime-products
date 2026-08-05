export type InfluencerDashboardSection =
  | "overview"
  | "campaigns"
  | "products"
  | "links"
  | "earnings"
  | "transactions"
  | "payouts"
  | "profile"
  | "support";

export type CreatorChannel =
  | "affiliate_rakuten"
  | "affiliate_awin"
  | "direct_connected";

export type InfluencerCampaignKind = "affiliate" | "direct";

export type InfluencerCampaignFilter = "all" | InfluencerCampaignKind | "high-rate";

export interface InfluencerProductFilters {
  channel: "all" | InfluencerCampaignKind;
  campaignId: string;
  category: string;
  region: string;
  rate: "any" | "high-rate";
  search: string;
}

export interface CampaignTerms {
  campaignId: string;
  attributionWindow: string;
  restrictions: string[];
  eligibleProducts: string;
  assetCount: number;
  lastUpdated: string;
  termsAccepted: boolean;
  fundingSource: string;
  rateType: "Fixed" | "Variable" | "Conditional";
}

export interface InfluencerDashboardCampaign {
  id: string;
  title: string;
  merchant: string;
  network: string;
  kind: InfluencerCampaignKind;
  channel: CreatorChannel;
  category: string;
  region: string;
  rate: string;
  rateValue: number;
  condition: string;
  products: number;
  accent: "rose" | "orange" | "violet" | "mint";
  avatars: string[];
}

export type CreatorProductStatus = "active" | "terms_review" | "unavailable" | "suspended";

export interface CreatorProduct {
  id: string;
  campaignId: string;
  title: string;
  merchant: string;
  image: string;
  channel: CreatorChannel;
  network: string;
  category: string;
  region: string;
  price: string;
  availability: string;
  lastUpdated: string;
  rate: string;
  rateValue: number;
  rateCondition: string;
  estimatedEarning?: string;
  status: CreatorProductStatus;
  assetCount: number;
  seller: string;
  productDestination: string;
}

export type GeneratedLinkStatus = "active" | "review" | "disabled" | "expired";

export interface GeneratedLink {
  id: string;
  label: string;
  productId: string;
  product: string;
  merchant: string;
  campaignId: string;
  campaign: string;
  channel: CreatorChannel;
  clicks: number;
  conversions: number;
  attributionExpiresAt: string;
  lastActivity: string;
  status: GeneratedLinkStatus;
  url: string;
}

export interface CreatorTransaction {
  id: string;
  product: string;
  merchant: string;
  channel: CreatorChannel;
  date: string;
  sale: string;
  rate: string;
  commission: string;
  status: "Pending" | "Validated" | "Payable" | "Paid" | "Adjusted" | "Reversed";
}

export interface PayoutStatement {
  id: string;
  period: string;
  amount: string;
  currency: string;
  transactions: number;
  adjustments: string;
  paidOn: string;
  status: "Paid" | "Scheduled";
}

export type SupportCaseType =
  | "missing_transaction"
  | "broken_link"
  | "campaign_restriction"
  | "traffic_verification"
  | "payout_support";

export interface SupportCase {
  id: string;
  type: SupportCaseType;
  subject: string;
  updatedAt: string;
  status: "Open" | "Investigating" | "Resolved";
}

export interface InfluencerDashboardData {
  creator: {
    name: string;
    role: string;
    avatar: string;
    publisherId: string;
    readiness: number;
    community: number;
    country: string;
    taxStatus: string;
    payoutMethod: string;
    payoutThreshold: string;
    properties: string[];
  };
  campaigns: InfluencerDashboardCampaign[];
  campaignTerms: CampaignTerms[];
  products: CreatorProduct[];
  generatedLinks: GeneratedLink[];
  transactions: CreatorTransaction[];
  payoutStatements: PayoutStatement[];
  supportCases: SupportCase[];
  notices: Array<{
    id: string;
    title: string;
    detail: string;
    tone: "info" | "warning" | "success";
    date: string;
  }>;
  activity: Array<{
    month: string;
    clicks: number;
    sales: number;
    paid: number;
  }>;
  profileChecklist: Array<{
    label: string;
    detail: string;
    complete: boolean;
  }>;
}
