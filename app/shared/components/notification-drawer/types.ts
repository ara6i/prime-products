export type NotificationType =
  | "try-on-progress"
  | "try-on-ready"
  | "try-on-failed"
  | "tokens-added"
  | "tokens-refunded"
  | "plan-active"
  | "tokens-low"
  | "plan-expiring"
  | "stylist-ready"
  | "payment-issue"
  | "system"
  | "profile-updated";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timeAgo: string;
  isUnread: boolean;
}
