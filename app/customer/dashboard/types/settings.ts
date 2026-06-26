export interface CustomerSettingsViewModel {
  store: {
    username: string;
    storeName: string;
    merchantName: string;
    domain: string;
    ownerEmail: string;
  };
  workspace: {
    projectId: string;
    projectName: string;
    storeProfileId: string;
  };
  apiKey: {
    ready: boolean;
    id: string | null;
    name: string | null;
    keyPrefix: string | null;
    allowedDomains: string[];
    lastUsedAt: string | null;
  };
  ipLimit: CustomerIpLimitSettings;
}

export interface CustomerIpLimitSettings {
  available: boolean;
  envHardDisabled: boolean;
  globalEnabled: boolean;
  sdkEnabled: boolean;
  product: {
    enabled: boolean;
    maxAttemptsPerIpProduct: number;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  store: {
    enabled: boolean;
    maxAttemptsPerIpMonth: number;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  recentRecords: CustomerIpLimitRecord[];
}

export interface CustomerIpLimitRecord {
  id: string;
  ipAddressMasked: string;
  productId: string;
  productTitle: string | null;
  productUrl: string | null;
  attemptCount: number;
  blockedAttempts: number;
  firstSeenAt: string | null;
  lastAttemptAt: string | null;
}
