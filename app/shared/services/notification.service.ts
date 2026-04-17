export interface NotificationApiItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

interface NotificationsResponse {
  notifications: NotificationApiItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchNotifications(limit = 20, offset = 0): Promise<NotificationsResponse> {
  const res = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, {
    method: "PUT",
    credentials: "include",
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await fetch("/api/notifications/read-all", {
    method: "PUT",
    credentials: "include",
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}
