"use client";

import { useState } from "react";
import { Button } from "@/app/shared/components/ui/button";
import { NotificationBellIcon } from "@/app/shared/components/icons";
import { NotificationDrawer } from "@/app/shared/components/notification-drawer";

interface NotificationBellProps {
  hasNotification?: boolean;
  showDot?: boolean;
}

export function NotificationBell({
  hasNotification = true,
  showDot = true,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="icon"
        size="icon"
        className="relative h-[2.083vw] w-[2.083vw] p-[0.625vw] rounded-full"
        onClick={() => setOpen(true)}
      >
        <NotificationBellIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="var(--brand-blue)" />
        {hasNotification && showDot && (
          <span className="absolute top-[0.313vw] right-[0.313vw] h-[0.417vw] w-[0.417vw] rounded-full bg-warning-dot" />
        )}
      </Button>
      <NotificationDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
