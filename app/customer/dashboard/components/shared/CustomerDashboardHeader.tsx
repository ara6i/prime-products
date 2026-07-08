import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, CircleAlert } from "lucide-react";
import { LogoutIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { CustomerDashboardNavItem, CustomerDashboardRangeOption, CustomerDashboardViewOption } from "../../types";
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
  navItems?: CustomerDashboardNavItem[];
  domain?: string;
  ownerEmail?: string;
  compact?: boolean;
  compactTitle?: string;
  leftSlot?: ReactNode;
  showAnalyticsControls?: boolean;
  showViewControls?: boolean;
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
  navItems = [],
  domain,
  ownerEmail,
  compact = false,
  compactTitle = "Overview",
  leftSlot,
  showAnalyticsControls = true,
  showViewControls = false,
}: CustomerDashboardHeaderProps) {
  if (!compact) {
    return (
      <header className="flex items-center justify-between gap-5 px-5 py-4">
        <nav
          className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-customer-border bg-customer-card p-1 shadow-[0_12px_28px_rgba(33,84,239,0.06)]"
          aria-label="Customer dashboard sections"
        >
          {navItems.map((item) => {
            if (item.disabled) {
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  className="h-10 rounded-full px-4 text-sm font-medium text-customer-muted opacity-60"
                >
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-brand-blue text-white shadow-[0_10px_24px_rgba(33,84,239,0.24)]"
                    : "text-text-body hover:bg-customer-blue hover:text-brand-blue"
                }`}
              >
                {item.label === "Documentation" ? "Docs" : item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {showAnalyticsControls ? (
            <div className="hidden items-center gap-2 2xl:flex">
              <CustomerDashboardRangeSelector options={rangeOptions} selectedLabel={rangeLabel} />
              {showViewControls ? <CustomerDashboardViewSelector options={viewOptions} /> : null}
            </div>
          ) : null}

          <CustomerDashboardThemeToggle />
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-customer-border bg-customer-card text-brand-blue shadow-[0_12px_28px_rgba(33,84,239,0.06)] [[data-customer-theme=dark]_&]:text-white"
            aria-label={statusLabel}
            title={statusLabel}
          >
            <Bell className="h-5 w-5" aria-hidden />
            <CircleAlert className="absolute right-2 top-2 h-3 w-3 fill-brand-blue text-brand-blue" aria-hidden />
          </button>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-11 max-w-[230px] items-center gap-3 rounded-full border border-customer-border bg-customer-card py-1 pl-1.5 pr-3 text-left shadow-[0_12px_28px_rgba(33,84,239,0.06)] transition-colors hover:bg-customer-blue"
              title="Sign out"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">
                {storeName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden min-w-0 2xl:block">
                <span className="block truncate text-sm font-semibold text-text-primary">{storeName}</span>
                <span className="block truncate text-xs text-customer-muted">{ownerEmail || domain || dataModeLabel}</span>
              </span>
              <LogoutIcon size={16} className="h-4 w-4 shrink-0 text-brand-blue [[data-customer-theme=dark]_&]:text-white" />
            </button>
          </form>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-[var(--spacing-customer-gap-lg)] border-b border-customer-border bg-customer-card/95 px-[var(--spacing-customer-content-x)] py-[1.042vw] backdrop-blur max-lg:px-[4vw] max-lg:py-[4vw]">
      <div className="flex min-w-0 items-center gap-[var(--spacing-customer-gap-md)] max-lg:gap-[3vw]">
        {leftSlot}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2vw]">
            <h1 className={compact ? "text-[5vw] font-semibold tracking-[-0.04em] text-text-primary" : "text-customer-2xl font-semibold tracking-[-0.04em] text-text-primary"}>
              {compact ? compactTitle : pageTitle}
            </h1>
            <StatusPill label={statusLabel} tone={statusTone} />
          </div>
          <p className="mt-[0.208vw] truncate text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.3vw]">
            {storeName} · {projectName} · {dataModeLabel}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2vw]">
        {showAnalyticsControls ? (
          <>
            <CustomerDashboardRangeSelector options={rangeOptions} selectedLabel={rangeLabel} />
            {showViewControls ? <CustomerDashboardViewSelector options={viewOptions} /> : null}
          </>
        ) : null}
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
