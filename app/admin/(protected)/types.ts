export type AdminDashboardTheme = "light" | "dark";

export type AdminDashboardIconKey =
  | "dashboard"
  | "tickets"
  | "chats"
  | "merchants"
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
