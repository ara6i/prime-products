import type { CustomerDashboardIconKey } from ".";

export type CustomerOverviewTone = "primary" | "strong" | "green" | "blue" | "neutral";

export type CustomerOverviewActivityStatus = "completed" | "pending" | "failed";

export interface CustomerOverviewStat {
  label: string;
  value: string;
  detail: string;
  icon: CustomerDashboardIconKey;
  tone: CustomerOverviewTone;
}

export interface CustomerOverviewPlanSnapshot {
  title: string;
  value: string;
  detail: string;
  productLabel: string;
  tryOnLabel: string;
  renewalLabel: string;
}

export interface CustomerOverviewUsageLimit {
  title: string;
  usedLabel: string;
  limitLabel: string;
  percent: number;
}

export interface CustomerOverviewChartPoint {
  label: string;
  completed: number;
  initiated: number;
}

export interface CustomerOverviewProduct {
  id: string;
  title: string;
  detail: string;
  value: string;
  percent: number;
}

export interface CustomerOverviewActivityRow {
  id: string;
  requestId: string;
  activity: string;
  detail: string;
  value: string;
  status: CustomerOverviewActivityStatus;
  statusLabel: string;
  dateLabel: string;
}

export interface CustomerOverviewViewModel {
  greetingName: string;
  subtitle: string;
  plan: CustomerOverviewPlanSnapshot;
  stats: CustomerOverviewStat[];
  usageLimit: CustomerOverviewUsageLimit;
  chart: CustomerOverviewChartPoint[];
  products: CustomerOverviewProduct[];
  activities: CustomerOverviewActivityRow[];
}
