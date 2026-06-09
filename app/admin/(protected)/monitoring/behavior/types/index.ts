export interface AdminReplaySession {
  id: string;
  sessionId: string;
  source: "shopify" | "sdk";
  shopifyShopId: string | null;
  storeProfileId: string | null;
  productId: string | null;
  productTitle: string | null;
  productUrl: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  countryCode: string | null;
  eventCount: number;
  chunkCount: number;
  startedAt: string;
  lastSeenAt: string;
}

export interface AdminReplaySessionsResponse {
  sessions: AdminReplaySession[];
}

export interface AdminReplayDetailResponse {
  session: AdminReplaySession;
  events: unknown[];
}

export interface ReplaySessionCardView {
  session: AdminReplaySession;
  title: string;
  subtitle: string;
  sourceLabel: string;
  deviceLabel: string;
  eventLabel: string;
  durationLabel: string;
  lastSeenLabel: string;
}

export interface ReplayPageViewModel {
  sessions: ReplaySessionCardView[];
  totalSessionsLabel: string;
  totalEventsLabel: string;
  latestActivityLabel: string;
}
