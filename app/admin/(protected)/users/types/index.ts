export type ProfileUserSource = "sdk" | "shopify";
export type ProfileUserKind = "synced" | "event";

export interface AdminProfileUserRaw {
  id: string;
  kind: ProfileUserKind;
  source: ProfileUserSource;
  profileId: string | null;
  profileName: string | null;
  userId: string | null;
  userName: string | null;
  email: string | null;
  accountStatus: string | null;
  profileLoggedIn: boolean;
  sessionId: string | null;
  storeId: string | null;
  storeName: string | null;
  storeDomain: string | null;
  originHost: string | null;
  originUrl: string | null;
  productId: string | null;
  productTitle: string | null;
  productUrl: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  countryCode: string | null;
  gender: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  bandSize: string | null;
  cupSize: string | null;
  braSizeRegion: string | null;
  shoeEU: string | null;
  shoeUS: string | null;
  shoeUK: string | null;
  fitPreference: string | null;
  country: string | null;
  sizingUnit: string | null;
  heightUnit: string | null;
  weightUnit: string | null;
  measurementsUnit: string | null;
  measurements: Record<string, number>;
  sizeHistoryCount: number;
  topSizes: Array<{
    size: string;
    count: number;
    productId: string | null;
    productTitle: string | null;
    productImage: string | null;
    lastSeenAt: string | null;
  }>;
  photoStored: boolean;
  photoUrl: string | null;
  profileEventCount: number;
  tryOnCount: number;
  eventCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminProfileUsersResponse {
  summary: {
    total: number;
    syncedProfiles: number;
    eventProfiles: number;
    shopifyProfiles: number;
    sdkProfiles: number;
    loggedInProfiles: number;
    anonymousProfiles: number;
  };
  items: AdminProfileUserRaw[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProfileUserListItem {
  id: string;
  raw: AdminProfileUserRaw;
  profileLabel: string;
  accountLabel: string;
  sourceLabel: string;
  sourceTone: string;
  originLabel: string;
  deviceLabel: string;
  countryLabel: string;
  activityLabel: string;
  lastSeenLabel: string;
  photoUrl: string | null;
  detailRows: Array<{ label: string; value: string }>;
  measurementRows: Array<{ label: string; value: string }>;
}

export interface ProfileUserGroupItem {
  id: string;
  primaryProfile: ProfileUserListItem;
  profiles: ProfileUserListItem[];
  userLabel: string;
  accountLabel: string;
  sourceLabel: string;
  sourceTone: string;
  originLabel: string;
  deviceLabel: string;
  countryLabel: string;
  activityLabel: string;
  lastSeenLabel: string;
  profileCount: number;
  tryOnCount: number;
  profileEventCount: number;
  searchText: string;
}

export interface ProfileUsersViewModel {
  summary: AdminProfileUsersResponse["summary"];
  items: ProfileUserGroupItem[];
  profileItems: ProfileUserListItem[];
  profileTotal: number;
  userTotal: number;
  hasUsers: boolean;
}
