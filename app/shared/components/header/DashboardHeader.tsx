"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { PeopleIcon } from "../icons";
import { NotificationBell } from "./NotificationBell";
import { useUnifiedStream } from "@/app/shared/hooks/useUnifiedStream";
import { useDashboardHeaderOverride } from "@/app/shared/hooks/useDashboardHeader";

const PAGE_CONFIG: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/dashboard/try-on": { title: "Try on", subtitle: "See how it fits, instantly" },
  "/dashboard/catalog": { title: "Catalog", subtitle: "AI-powered recommendations" },
  "/dashboard/closet": { title: "My Closet", subtitle: "Looks styled by you & AI, and saved items" },
  "/dashboard/billing": { title: "Billings", subtitle: "Plans, payments, and invoices" },
  "/dashboard/profile": { title: "Profile", subtitle: "Your account details" },
  "/dashboard/ai-stylist": { title: "AI Stylist", subtitle: "Get styled, effortlessly" },
};

interface DashboardHeaderProps {
  avatarInitials: string;
  avatarUrl?: string | null;
  initialTokenBalance?: number;
  initialUnreadCount?: number;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) return count.toLocaleString("en-US");
  return String(count);
}

export function DashboardHeader({
  avatarInitials,
  avatarUrl,
  initialTokenBalance = 0,
  initialUnreadCount = 0,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const { override } = useDashboardHeaderOverride();
  const { tokenBalance, unreadCount } = useUnifiedStream(
    initialTokenBalance,
    initialUnreadCount,
  );

  const config = PAGE_CONFIG[pathname] ?? { title: "Dashboard" };

  return (
    <header className="flex w-full items-center justify-between h-[2.917vw]">
      {override.leftContent ?? (
        <div className="flex items-center gap-[0.625vw]">
          <h1 className="text-[1.25vw] font-semibold leading-[1.667] text-text-primary">
            {config.title}
          </h1>
          {config.subtitle && (
            <p className="text-[0.729vw] font-normal leading-[1.571] text-text-muted">
              {config.subtitle}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-[0.104vw]">
        {/* Token Balance Badge */}
        <div className="flex items-center gap-[0.208vw] rounded-[0.573vw] bg-warning-bg px-[0.208vw] py-[0.104vw] h-[1.25vw]">
          <PeopleIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="var(--warning-text)" />
          <span className="text-[0.729vw] font-normal leading-[1.57] text-warning-text">
            {formatTokenCount(tokenBalance)}
          </span>
        </div>

        {/* Notification Bell */}
        <NotificationBell hasNotification={unreadCount > 0} />

        {/* Avatar */}
        <div className="relative flex h-[1.875vw] w-[1.875vw] shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue-light">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile"
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-[0.729vw] font-normal leading-[1.57] text-brand-blue-dark">
              {avatarInitials}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
