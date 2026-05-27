"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "./adminNotificationsClientService";
import type { AdminNotificationItem } from "./types";

interface AdminNotificationState {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  connected: boolean;
  loaded: boolean;
}

const listeners = new Set<() => void>();
let eventSource: EventSource | null = null;
let initialLoadStarted = false;
let state: AdminNotificationState = {
  notifications: [],
  unreadCount: 0,
  connected: false,
  loaded: false,
};

function emitChange() {
  for (const listener of listeners) listener();
}

function updateState(next: Partial<AdminNotificationState>) {
  state = { ...state, ...next };
  emitChange();
}

function pushNotification(notification: AdminNotificationItem, unreadCount: number) {
  const withoutDuplicate = state.notifications.filter((item) => item.id !== notification.id);
  updateState({
    notifications: [notification, ...withoutDuplicate].slice(0, 8),
    unreadCount,
    loaded: true,
  });
}

async function loadInitialNotifications() {
  if (initialLoadStarted) return;
  initialLoadStarted = true;
  try {
    const response = await fetchAdminNotifications();
    updateState({
      notifications: response.items,
      unreadCount: response.unreadCount,
      loaded: true,
    });
  } catch {
    updateState({ loaded: true });
  }
}

function ensureEventSource() {
  if (eventSource || typeof window === "undefined") return;

  eventSource = new EventSource("/api/admin/notifications/stream");
  eventSource.onopen = () => updateState({ connected: true });
  eventSource.onerror = () => updateState({ connected: false });
  eventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as {
        type?: string;
        data?: {
          notification?: AdminNotificationItem;
          unreadCount?: number;
        };
      };

      if (parsed.type === "notification" && parsed.data?.notification) {
        pushNotification(parsed.data.notification, parsed.data.unreadCount ?? state.unreadCount + 1);
      }
      if (parsed.type === "notification_read" && parsed.data?.notification) {
        const notification = parsed.data.notification;
        updateState({
          notifications: state.notifications.map((item) => (item.id === notification.id ? notification : item)),
          unreadCount: parsed.data.unreadCount ?? state.unreadCount,
        });
      }
      if (parsed.type === "unread_count" && typeof parsed.data?.unreadCount === "number") {
        updateState({ unreadCount: parsed.data.unreadCount });
      }
    } catch {
      // Ignore malformed stream events.
    }
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void loadInitialNotifications();
  ensureEventSource();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && eventSource) {
      eventSource.close();
      eventSource = null;
      updateState({ connected: false });
    }
  };
}

function getSnapshot(): AdminNotificationState {
  return state;
}

function getServerSnapshot(): AdminNotificationState {
  return state;
}

export function useAdminNotifications() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadInitialNotifications();
    ensureEventSource();
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllAdminNotificationsRead();
    updateState({
      unreadCount: 0,
      notifications: state.notifications.map((item) => ({ ...item, isRead: true })),
    });
  }, []);

  const markRead = useCallback(async (id: string) => {
    await markAdminNotificationRead(id);
    updateState({
      unreadCount: Math.max(0, state.unreadCount - 1),
      notifications: state.notifications.map((item) => (
        item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
      )),
    });
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      markAllRead,
      markRead,
    }),
    [snapshot, markAllRead, markRead],
  );
}
