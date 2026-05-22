import type { CustomerDashboardRange, CustomerDashboardView } from "../types";

const DEFAULT_RANGE: CustomerDashboardRange = "30d";
const DEFAULT_VIEW: CustomerDashboardView = "charts";
const supportedRanges: CustomerDashboardRange[] = ["7d", "30d", "90d"];
const supportedViews: CustomerDashboardView[] = ["charts", "numbers"];

export function parseCustomerDashboardRange(value: string | string[] | undefined): CustomerDashboardRange {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (supportedRanges.includes(rawValue as CustomerDashboardRange)) {
    return rawValue as CustomerDashboardRange;
  }

  return DEFAULT_RANGE;
}

export function parseCustomerDashboardView(value: string | string[] | undefined): CustomerDashboardView {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (supportedViews.includes(rawValue as CustomerDashboardView)) {
    return rawValue as CustomerDashboardView;
  }

  return DEFAULT_VIEW;
}
