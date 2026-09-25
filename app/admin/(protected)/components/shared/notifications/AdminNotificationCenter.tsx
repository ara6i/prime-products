"use client";

import Link from "next/link";
import { useState } from "react";
import { NotificationBellIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { useAdminNotifications } from "./useAdminNotifications";

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AdminNotificationCenter() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    connected,
    loaded,
    markAllRead,
    markRead,
  } = useAdminNotifications();

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((current) => !current)}
        className="relative h-[2.292vw] rounded-full border border-customer-border bg-customer-card px-[0.833vw] text-customer-sm text-text-body hover:text-brand-blue max-lg:h-10 max-lg:w-10 max-lg:px-0"
        aria-label="Open admin notifications"
      >
        <NotificationBellIcon
          size={16}
          className="h-[0.833vw] w-[0.833vw] max-lg:h-4 max-lg:w-4"
        />
        <span className="max-lg:hidden">Notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute right-[-0.208vw] top-[-0.208vw] flex min-h-[0.938vw] min-w-[0.938vw] items-center justify-center rounded-full bg-customer-danger-text px-[0.208vw] text-[0.521vw] font-semibold text-white max-lg:-right-1 max-lg:-top-1 max-lg:min-h-4 max-lg:min-w-4 max-lg:px-1 max-lg:text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.625vw)] z-50 w-[21vw] overflow-hidden rounded-[1.042vw] border border-customer-border bg-customer-card shadow-customer-card max-lg:fixed max-lg:left-3 max-lg:right-3 max-lg:top-[4.5rem] max-lg:w-auto max-lg:rounded-2xl">
          <div className="flex items-center justify-between gap-[0.833vw] border-b border-customer-border px-[1vw] py-[0.833vw] max-lg:gap-3 max-lg:px-4 max-lg:py-3">
            <div>
              <p className="text-[clamp(14px,0.84vw,16px)] font-semibold text-text-primary">
                Notifications
              </p>
              <p className="mt-[0.2vw] text-[clamp(11px,0.68vw,13px)] text-customer-muted max-lg:mt-0.5 max-lg:text-xs">
                {connected ? "Live" : "Connecting"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="h-[1.875vw] rounded-full px-[0.729vw] text-[clamp(11px,0.68vw,13px)] text-brand-blue max-lg:h-9 max-lg:px-3 max-lg:text-xs"
            >
              Mark read
            </Button>
          </div>

          <div className="max-h-[23vw] overflow-y-auto max-lg:max-h-[70dvh]">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const href =
                  typeof notification.metadata.href === "string"
                    ? notification.metadata.href
                    : "/admin/tickets";
                return (
                  <Link
                    key={notification.id}
                    href={href}
                    onClick={() => {
                      setOpen(false);
                      if (!notification.isRead) void markRead(notification.id);
                    }}
                    className="block border-b border-customer-border px-[1vw] py-[0.833vw] transition-colors last:border-b-0 hover:bg-customer-soft max-lg:px-4 max-lg:py-3"
                  >
                    <div className="flex items-start gap-[0.625vw] max-lg:gap-2.5">
                      <span
                        className={
                          notification.isRead
                            ? "mt-[0.35vw] h-[0.417vw] w-[0.417vw] rounded-full bg-customer-muted/40 max-lg:mt-1.5 max-lg:h-2 max-lg:w-2"
                            : "mt-[0.35vw] h-[0.417vw] w-[0.417vw] rounded-full bg-brand-blue max-lg:mt-1.5 max-lg:h-2 max-lg:w-2"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[clamp(13px,0.78vw,15px)] font-semibold text-text-primary max-lg:text-sm">
                          {notification.title}
                        </p>
                        <p className="mt-[0.25vw] line-clamp-2 text-[clamp(12px,0.72vw,14px)] leading-snug text-text-body max-lg:mt-1 max-lg:text-xs">
                          {notification.message}
                        </p>
                        <p className="mt-[0.35vw] text-[clamp(11px,0.68vw,13px)] text-customer-muted max-lg:mt-1 max-lg:text-xs">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-[1vw] py-[1.25vw] text-[clamp(13px,0.78vw,15px)] text-text-body max-lg:px-4 max-lg:py-5 max-lg:text-sm">
                {loaded ? "No notifications" : "Loading notifications"}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
