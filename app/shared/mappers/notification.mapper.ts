import type { NotificationApiItem } from "@/app/shared/services/notification.service";
import type { NotificationItem, NotificationType } from "@/app/shared/components/notification-drawer/types";

const TYPE_MAP: Record<string, NotificationType> = {
  try_on_complete: "try-on-ready",
  try_on_failed: "try-on-failed",
  token_purchase: "tokens-added",
  payment_issue: "payment-issue",
  subscription_created: "plan-active",
  subscription_cancelled: "plan-expiring",
  package_updated: "tokens-added",
  stylist_outfits_ready: "stylist-ready",
  system_announcement: "system",
  profile_updated: "profile-updated",
  general: "system",
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function mapNotification(raw: NotificationApiItem): NotificationItem {
  return {
    id: raw._id,
    type: TYPE_MAP[raw.type] ?? "system",
    title: raw.title,
    description: raw.message,
    timeAgo: formatTimeAgo(raw.createdAt),
    isUnread: !raw.isRead,
  };
}

export function mapNotifications(raw: NotificationApiItem[]): NotificationItem[] {
  return raw.map(mapNotification);
}
