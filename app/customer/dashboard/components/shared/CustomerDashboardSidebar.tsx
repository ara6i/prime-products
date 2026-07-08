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
    <aside
      className="hidden min-h-screen w-[84px] shrink-0 flex-col items-center gap-8 border-r border-customer-border bg-customer-card px-4 py-5 lg:flex"
      aria-label={`${storeName} dashboard navigation`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-blue/10 bg-customer-card shadow-[0_14px_32px_rgba(33,84,239,0.10)]">
        <Image
          src="/images/landing/optimized/logo-navbar-small.webp"
          alt="PrimeStyleAI"
          width={38}
          height={36}
          priority
          className="h-8 w-auto object-contain"
        />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2" aria-label={domain}>
        {navItems.map((item) => {
          const content = (
            <>
              <CustomerDashboardIcon name={item.icon} size={18} className="h-[18px] w-[18px]" />
              <span className="sr-only">{item.label}</span>
            </>
          );

          if (item.disabled) {
            return (
              <Button
                key={item.label}
                type="button"
                variant="ghost"
                disabled
                title={`${item.label} coming soon`}
                className="h-11 w-11 rounded-full text-customer-muted opacity-50"
              >
                {content}
              </Button>
            );
          }

          return (
            <Button
              key={item.label}
              asChild
              variant="ghost"
              className={`h-11 w-11 rounded-full ${
                item.active
                  ? "bg-brand-blue text-white shadow-[0_12px_26px_rgba(33,84,239,0.28)] hover:bg-brand-blue-dark"
                  : "text-customer-muted hover:bg-customer-blue hover:text-brand-blue"
              }`}
            >
              <Link href={item.href} title={item.label} aria-current={item.active ? "page" : undefined}>
                {content}
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2">
        <Link
          href="/customer/dashboard/docs"
          title="Help"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-customer-border bg-customer-card text-customer-muted shadow-[0_10px_24px_rgba(33,84,239,0.06)] transition-colors hover:bg-customer-blue hover:text-brand-blue"
        >
          <CustomerDashboardIcon name="docs" size={18} className="h-[18px] w-[18px]" />
          <span className="sr-only">Help</span>
        </Link>
      </div>
    </aside>
  );
}
