export interface AdminFeedbackRawItem {
  id: string;
  createdAt: string;
  source: "shopify" | "sdk";
  sessionId: string | null;
  sessionLabel: string | null;
  productId: string | null;
  productTitle: string | null;
  productUrl: string | null;
  recommendedSize: string | null;
  jobId: string | null;
  historyEntryId: string | null;
  rating: number | null;
  note: string | null;
  profileLoggedIn: boolean;
  profileId: string | null;
  profileName: string | null;
  profileUserId: string | null;
  profileEmail: string | null;
  ipAddress: string | null;
  ipAddressType: "public" | "local" | "unavailable" | "hidden";
  countryCode: string | null;
  countryName: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
}

export interface AdminFeedbacksResponse {
  summary: {
    total: number;
    showing: number;
    averageRating: number | null;
    ratedCount: number;
    anonymousCount: number;
    loggedInCount: number;
    ratingCounts: Record<"1" | "2" | "3" | "4" | "5", number>;
  };
  items: AdminFeedbackRawItem[];
}

export interface FeedbackStatCard {
  label: string;
  value: string;
  helper: string;
}

export interface FeedbackRatingBar {
  rating: number;
  count: number;
  percent: number;
}

export interface FeedbackListItem {
  id: string;
  dateLabel: string;
  sourceLabel: string;
  customerLabel: string;
  customerMeta: string;
  rating: number | null;
  note: string;
  productTitle: string;
  productMeta: string;
  productUrl: string | null;
  sizeLabel: string;
  visitorLabel: string;
  visitorMeta: string;
  deviceLabel: string;
}

export interface FeedbacksViewModel {
  stats: FeedbackStatCard[];
  ratingBars: FeedbackRatingBar[];
  items: FeedbackListItem[];
  hasItems: boolean;
}
