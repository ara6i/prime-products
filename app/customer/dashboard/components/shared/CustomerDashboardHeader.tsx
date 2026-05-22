import type { ReactNode } from "react";
import { LogoutIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { CustomerDashboardRangeOption, CustomerDashboardViewOption } from "../../types";
import { CustomerDashboardRangeSelector } from "./CustomerDashboardRangeSelector";
import { CustomerDashboardViewSelector } from "./CustomerDashboardViewSelector";
import { CustomerDashboardThemeToggle } from "./CustomerDashboardThemeToggle";
import { StatusPill } from "./StatusPill";

interface CustomerDashboardHeaderProps {
  storeName: string;
  projectName: string;
  pageTitle: string;
  dataModeLabel: string;
  rangeLabel: string;
  statusLabel: string;
  statusTone: "success" | "warning";
  rangeOptions: CustomerDashboardRangeOption[];
  viewOptions: CustomerDashboardViewOption[];
  logoutAction: () => Promise<void>;
  compact?: boolean;
  leftSlot?: ReactNode;
}

export function CustomerDashboardHeader({
  storeName,
  projectName,
  pageTitle,
  dataModeLabel,
  rangeLabel,
  statusLabel,
  statusTone,
  rangeOptions,
  viewOptions,
  logoutAction,
  compact = false,
  leftSlot,
}: CustomerDashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-[var(--spacing-customer-gap-lg)] border-b border-customer-border bg-customer-card/95 px-[var(--spacing-customer-content-x)] py-[1.042vw] backdrop-blur max-lg:px-[4vw] max-lg:py-[4vw]">
      <div className="flex min-w-0 items-center gap-[var(--spacing-customer-gap-md)] max-lg:gap-[3vw]">
        {leftSlot}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2vw]">
            <h1 className={compact ? "text-[5vw] font-semibold tracking-[-0.04em] text-text-primary" : "text-customer-2xl font-semibold tracking-[-0.04em] text-text-primary"}>
              {compact ? "Overview" : pageTitle}
            </h1>
            <StatusPill label={statusLabel} tone={statusTone} />
          </div>
          <p className="mt-[0.208vw] truncate text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.3vw]">
            {storeName} · {projectName} · {dataModeLabel}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2vw]">
        <CustomerDashboardRangeSelector options={rangeOptions} selectedLabel={rangeLabel} />
        <CustomerDashboardViewSelector options={viewOptions} />
        <CustomerDashboardThemeToggle />
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
