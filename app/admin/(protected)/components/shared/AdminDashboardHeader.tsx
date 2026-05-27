import type { ReactNode } from "react";
import { LogoutIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { AdminDashboardThemeToggle } from "./AdminDashboardThemeToggle";
import { AdminNotificationCenter } from "./notifications/AdminNotificationCenter";

interface AdminDashboardHeaderProps {
  logoutAction: () => Promise<void>;
  compact?: boolean;
  leftSlot?: ReactNode;
}

export function AdminDashboardHeader({ logoutAction, compact = false, leftSlot }: AdminDashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-[var(--spacing-customer-gap-lg)] border-b border-customer-border bg-customer-card/95 px-[var(--spacing-customer-content-x)] py-[1.042vw] backdrop-blur max-lg:px-[4vw] max-lg:py-[4vw]">
      <div className="flex min-w-0 items-center gap-[var(--spacing-customer-gap-md)] max-lg:gap-[3vw]">
        {leftSlot}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2vw]">
            <h1 className={compact ? "text-[5vw] font-semibold text-text-primary" : "text-customer-2xl font-semibold text-text-primary"}>
              Admin Dashboard
            </h1>
            <span className="rounded-full bg-customer-success-bg px-[0.625vw] py-[0.208vw] text-customer-xs font-semibold text-customer-success-text max-lg:px-[2.4vw] max-lg:py-[1vw] max-lg:text-[2.8vw]">
              Admin
            </span>
          </div>
          <p className="mt-[0.208vw] truncate text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.3vw]">
            PrimeStyleAI · Platform workspace
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2vw]">
        <AdminNotificationCenter />
        <AdminDashboardThemeToggle />
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="gap-[var(--spacing-customer-gap-xs)] border-customer-border-strong bg-customer-card text-text-body hover:text-brand-blue max-lg:h-[10vw] max-lg:px-[3.6vw] max-lg:text-[3.2vw]"
          >
            <LogoutIcon size={16} className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
            <span className="max-lg:hidden">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
