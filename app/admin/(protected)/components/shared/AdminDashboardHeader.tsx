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

export function AdminDashboardHeader({
  logoutAction,
  compact = false,
  leftSlot,
}: AdminDashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-[var(--spacing-customer-gap-lg)] border-b border-customer-border bg-customer-card/95 px-[var(--spacing-customer-content-x)] py-[1.042vw] backdrop-blur max-lg:h-16 max-lg:gap-2 max-lg:px-3 max-lg:py-2">
      <div className="flex min-w-0 items-center gap-[var(--spacing-customer-gap-md)] max-lg:gap-2.5">
        {leftSlot}
        <div className="min-w-0">
          <div className="flex items-center gap-[var(--spacing-customer-gap-sm)]">
            <h1
              className={
                compact
                  ? "whitespace-nowrap text-lg font-semibold leading-none text-text-primary sm:text-xl"
                  : "text-customer-2xl font-semibold text-text-primary"
              }
            >
              Admin Dashboard
            </h1>
            <span className="rounded-full bg-customer-success-bg px-[0.625vw] py-[0.208vw] text-customer-xs font-semibold text-customer-success-text max-lg:hidden">
              Admin
            </span>
          </div>
          <p className="mt-[0.208vw] truncate text-customer-sm text-text-body max-lg:hidden">
            PrimeStyleAI · Platform workspace
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-1">
        <AdminNotificationCenter />
        <AdminDashboardThemeToggle />
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="gap-[var(--spacing-customer-gap-xs)] border-customer-border-strong bg-customer-card text-text-body hover:text-brand-blue max-lg:h-10 max-lg:w-10 max-lg:px-0"
            aria-label="Sign out"
          >
            <LogoutIcon
              size={16}
              className="h-[0.833vw] w-[0.833vw] max-lg:h-4 max-lg:w-4"
            />
            <span className="max-lg:hidden">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
