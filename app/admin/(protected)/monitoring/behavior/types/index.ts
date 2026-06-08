export interface AdminBehaviorResponse {
  range: { days: number; from: string };
  kpis: {
    uniqueSessions: number;
    productViews: number;
    sdkOpened: number;
    photoUploaded: number;
    sizingStarted: number;
    sizingFailed: number;
    initiated: number;
    completed: number;
    failed: number;
    clientErrors: number;
    sizeShown: number;
    sizeAccepted: number;
    cartAdds: number;
    completionRate: number;
    sizeAcceptanceRate: number;
  };
  dailyActivity: Array<{ date: string; initiated: number; completed: number; failed: number }>;
  deviceSplit: Array<{ device: string; count: number }>;
  countrySplit: Array<{ iso2: string; name: string; count: number }>;
  topProducts: Array<{ productId: string; productTitle: string; views?: number; tryOns: number; cartAdds?: number; activity?: number }>;
  funnel: Array<{ step: string; count: number }>;
}

export interface BehaviorStatCard {
  label: string;
  value: string;
  helper: string;
}

export interface BehaviorRow {
  label: string;
  value: string;
  helper?: string;
}

export interface BehaviorViewModel {
  stats: BehaviorStatCard[];
  funnel: BehaviorRow[];
  topProducts: BehaviorRow[];
  devices: BehaviorRow[];
  countries: BehaviorRow[];
  rangeLabel: string;
}
