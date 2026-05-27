"use client";

import type { AdminNotificationsResponse } from "./types";

export async function fetchAdminNotifications(): Promise<AdminNotificationsResponse> {
  const response = await fetch("/api/admin/notifications?limit=8", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load admin notifications");
  }
  return (await response.json()) as AdminNotificationsResponse;
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  const response = await fetch(`/api/admin/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Failed to mark notification read");
  }
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  const response = await fetch("/api/admin/notifications/read-all", {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Failed to mark notifications read");
  }
}
