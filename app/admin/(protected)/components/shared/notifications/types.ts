export type AdminNotificationPriority = "low" | "medium" | "high";

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: AdminNotificationPriority;
  isRead: boolean;
  metadata: {
    href?: string;
    ticketId?: string;
    ticketNumber?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  readAt: string | null;
}

export interface AdminNotificationsResponse {
  items: AdminNotificationItem[];
  unreadCount: number;
}
