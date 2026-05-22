import Image from "next/image";
import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import { CustomerDashboardIcon } from "./CustomerDashboardIcon";
import type { CustomerDashboardNavItem } from "../../types";

interface CustomerDashboardSidebarProps {
  navItems: CustomerDashboardNavItem[];
  storeName: string;
  domain: string;
}

export function CustomerDashboardSidebar({ navItems, storeName, domain }: CustomerDashboardSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[var(--spacing-customer-sidebar)] shrink-0 border-r border-customer-border bg-customer-card px-[1.042vw] py-[1.25vw] lg:flex lg:flex-col">
      <div className="flex items-center gap-[var(--spacing-customer-gap-sm)]">
        <Image
          src="/images/landing/optimized/logo-navbar-small.webp"
          alt="PrimeStyleAI"
          width={64}
          height={60}
          priority
          className="h-[2.604vw] w-auto object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-customer-sm font-semibold text-text-primary">{storeName}</p>
          <p className="truncate text-customer-xs text-customer-muted">{domain}</p>
        </div>
      </div>

      <nav className="mt-[2.083vw] flex flex-col gap-[var(--spacing-customer-gap-xs)]">
        {navItems.map((item) => {
          const content = (
            <>
              <CustomerDashboardIcon name={item.icon} size={18} className="h-[0.938vw] w-[0.938vw]" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.disabled && <span className="text-[0.521vw] uppercase tracking-[0.12em] text-customer-muted">Soon</span>}
            </>
          );

          if (item.disabled) {
            return (
              <Button
                key={item.label}
                type="button"
                variant="ghost"
                disabled
                className="h-[2.396vw] justify-start gap-[var(--spacing-customer-gap-sm)] rounded-[0.729vw] px-[0.729vw] text-customer-sm text-customer-muted opacity-70"
              >
                {content}
              </Button>
            );
          }

          return (
            <Button
              key={item.label}
              asChild
              variant={item.active ? "tunal" : "ghost"}
              className="h-[2.396vw] justify-start gap-[var(--spacing-customer-gap-sm)] rounded-[0.729vw] px-[0.729vw] text-customer-sm"
            >
              <Link href={item.href}>{content}</Link>
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[0.938vw] border border-customer-border bg-customer-soft p-[0.833vw]">
        <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-brand-blue">Support</p>
        <p className="mt-[0.313vw] text-customer-xs leading-[1.5] text-text-body">
          Need changes to your workspace? Contact the PrimeStyle team.
        </p>
      </div>
    </aside>
  );
}
