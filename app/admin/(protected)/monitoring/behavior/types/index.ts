export interface AdminClaritySessionRaw {
  id: string;
  sessionId: string;
  sdkOpenId: string | null;
  source: string;
  productId: string | null;
  productTitle: string | null;
  productUrl: string | null;
  originUrl: string | null;
  originHost: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  countryCode: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  eventCount: number;
  eventTypes: string[];
  jobIds: string[];
}

export interface AdminClaritySessionsResponse {
  range: {
    days: number;
    from: string;
  };
  items: AdminClaritySessionRaw[];
}

export interface BehaviorSessionItem {
  id: string;
  tagName: string;
  tagValue: string;
  sessionId: string;
  sdkOpenId: string | null;
  productTitle: string;
  productMeta: string;
  productUrl: string | null;
  sourceLabel: string;
  originLabel: string;
  countryLabel: string;
  deviceLabel: string;
  lastSeenLabel: string;
  eventCountLabel: string;
  eventsLabel: string;
  jobIdsLabel: string;
}

export interface BehaviorViewModel {
  sessions: BehaviorSessionItem[];
  hasSessions: boolean;
}
