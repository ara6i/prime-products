export type AdminDashboardTheme = "light" | "dark";

export type AdminDashboardIconKey =
  | "dashboard"
  | "revenue"
  | "support"
  | "customers"
  | "stores"
  | "tickets"
  | "chats"
  | "merchants"
  | "behavior"
  | "analytics"
  | "reports"
  | "settings";

export interface AdminDashboardNavItem {
  label: string;
  href: string;
  icon: AdminDashboardIconKey;
  active: boolean;
  disabled: boolean;
  children?: AdminDashboardNavItem[];
}
