"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/app/shared/components/ui/sheet";
import {
  CloseIcon,
  CheckCheckIcon,
} from "@/app/shared/components/icons";
import { NotificationCard } from "./NotificationCard";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationApi,
} from "@/app/shared/services/notification.service";
import { mapNotifications } from "@/app/shared/mappers/notification.mapper";
import { mockNotifications } from "./data";
import type { NotificationItem } from "./types";

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDrawer({
  open,
  onOpenChange,
}: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchNotifications(30);
      const mapped = mapNotifications(res.notifications);
      setNotifications(mapped.length > 0 ? mapped : mockNotifications);
    } catch {
      setNotifications(mockNotifications);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      loadNotifications();
    }
  }, [open, loaded, loadNotifications]);

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isUnread: false }))
    );
    try {
      await markAllNotificationsAsRead();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotificationApi(id);
    } catch { /* silent */ }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="bg-text-body/30"
        className="w-[20.833vw] rounded-l-[1.042vw] border-l-0 p-[0.833vw] pb-0 gap-[1.25vw]"
      >
        <SheetClose asChild>
          <button className="flex items-center gap-[0.208vw] self-start text-[0.729vw] leading-[1.146vw] text-[#6D6D6D] transition-opacity hover:opacity-70">
            <CloseIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="#6D6D6D" />
            Notification
          </button>
        </SheetClose>

        <div className="flex flex-1 flex-col gap-[0.417vw] overflow-hidden">
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-[0.208vw] self-start text-[0.625vw] leading-[1.042vw] text-brand-blue transition-opacity hover:opacity-80"
          >
            <CheckCheckIcon size={14} className="!w-[0.729vw] !h-[0.729vw]" color="#2154EF" />
            Mark all as read
          </button>

          <div className="flex flex-1 flex-col gap-[0.625vw] overflow-y-auto pb-[0.833vw]">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
