"use client";

import Image from "next/image";
import { NotificationBell } from "./NotificationBell";
import { PeopleIcon } from "@/app/shared/components/icons";

interface MobileHeaderProps {
  initialTokenBalance: number;
  hasNotification?: boolean;
}

export function MobileHeader({
  initialTokenBalance,
  hasNotification = true,
}: MobileHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between">
      {/* Logo — container 56x53, image overflows to appear larger like Figma */}
      <div className="relative h-[53px] w-[56px] shrink-0 overflow-hidden">
        <Image
          src="/images/logo.png"
          alt="PrimeStyle AI"
          fill
          className="scale-[1.5] object-contain"
        />
      </div>

      {/* Right section — token badge + bell */}
      <div className="relative flex items-center gap-0">
        {/* Token badge */}
        <div className="flex h-6 items-center gap-1 rounded-[11px] bg-warning-bg px-1 py-0.5">
          <PeopleIcon size={20} className="text-warning-text" />
          <span className="text-[14px] font-normal leading-[22px] text-warning-text">
            {initialTokenBalance.toLocaleString()}
          </span>
        </div>

        {/* Notification bell */}
        <NotificationBell hasNotification={hasNotification} showDot={false} />

        {/* Notification dot — positioned relative to the right section per Figma */}
        {hasNotification && (
          <span className="absolute left-[97px] top-[17px] z-10 size-2 rounded-full bg-warning-dot" />
        )}
      </div>
    </div>
  );
}
