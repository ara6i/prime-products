export type CreatorChannel =
  | "instagram"
  | "tiktok"
  | "threads"
  | "youtube"
  | "pinterest"
  | "blog"
  | "other";

export type CreatorAudienceSize =
  "under-10k" | "10k-50k" | "50k-250k" | "250k-1m" | "1m-plus";

export interface CreatorWaitlistProfileRaw {
  platform: CreatorChannel;
  url: string;
}

export interface CreatorWaitlistApplicationRaw {
  id: string;
  name: string;
  email: string;
  primaryChannel: CreatorChannel;
  creatorProfiles: CreatorWaitlistProfileRaw[];
  audienceSize: CreatorAudienceSize;
  location: string;
  timezone: string | null;
  marketingConsent: boolean;
  leadSource: "creator-waitlist";
  firstJoinedAt: string;
  lastSubmittedAt: string;
  submissionCount: number;
}

export interface AdminCreatorWaitlistResponse {
  summary: {
    total: number;
    countries: number;
    audienceSizes: Partial<Record<CreatorAudienceSize, number>>;
  };
  items: CreatorWaitlistApplicationRaw[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatorWaitlistProfileView {
  platform: CreatorChannel;
  platformLabel: string;
  url: string;
  displayUrl: string;
  primary: boolean;
}

export interface CreatorWaitlistApplicationView {
  id: string;
  name: string;
  email: string;
  primaryChannelLabel: string;
  creatorProfiles: CreatorWaitlistProfileView[];
  audienceSizeLabel: string;
  location: string;
  countryFlag: string | null;
  timezoneLabel: string;
  consentLabel: string;
  joinedNewYorkLabel: string;
  lastSubmittedNewYorkLabel: string;
  submissionLabel: string;
  searchText: string;
}

export interface CreatorWaitlistViewModel {
  summary: AdminCreatorWaitlistResponse["summary"];
  items: CreatorWaitlistApplicationView[];
  largerAudienceTotal: number;
}
