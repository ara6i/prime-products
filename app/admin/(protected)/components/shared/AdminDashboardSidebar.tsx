import Image from "next/image";
import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import type { AdminDashboardNavItem } from "../../types";
import { AdminDashboardIcon } from "./AdminDashboardIcon";

interface AdminDashboardSidebarProps {
  navItems: AdminDashboardNavItem[];
}

export function AdminDashboardSidebar({ navItems }: AdminDashboardSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[var(--spacing-customer-sidebar)] shrink-0 border-r border-customer-border bg-customer-card px-[1.146vw] py-[1.458vw] lg:flex lg:flex-col">
      <div className="flex items-center gap-[0.833vw]">
        <Image
          src="/images/landing/optimized/logo-navbar-small.webp"
          alt="PrimeStyleAI"
          width={64}
          height={60}
          priority
          className="h-[3.125vw] w-auto object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-[clamp(15px,0.9vw,18px)] font-semibold text-text-primary">PrimeStyle Admin</p>
          <p className="truncate text-[clamp(12px,0.7vw,14px)] text-customer-muted">Platform workspace</p>
        </div>
      </div>

      <nav className="mt-[2.5vw] flex flex-col gap-[0.417vw]">
        {navItems.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const content = (
            <>
              <AdminDashboardIcon name={item.icon} size={20} className="h-[clamp(18px,1.05vw,22px)] w-[clamp(18px,1.05vw,22px)]" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.disabled && <span className="text-[clamp(10px,0.6vw,12px)] uppercase text-customer-muted">Soon</span>}
            </>
          );

          if (hasChildren && !item.disabled) {
            return (
              <details key={item.label} open={item.active} className="group">
                <summary className="flex h-[clamp(44px,2.75vw,54px)] cursor-pointer list-none items-center justify-start gap-[0.833vw] rounded-[0.833vw] px-[0.833vw] text-[clamp(14px,0.84vw,16px)] font-semibold text-text-body transition-colors hover:bg-surface-light group-open:bg-brand-blue-light group-open:text-brand-blue-dark [&::-webkit-details-marker]:hidden">
                  {content}
                  <span className="text-[clamp(14px,0.84vw,16px)] transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <div className="mt-[0.417vw] flex flex-col gap-[0.313vw] pl-[1.667vw]">
                  {item.children?.map((child) => {
                    const iconClass =
                      child.icon === "sdk"
                        ? "h-[clamp(22px,1.25vw,26px)] w-[clamp(22px,1.25vw,26px)] object-contain"
                        : "h-[clamp(15px,0.9vw,18px)] w-[clamp(15px,0.9vw,18px)] object-contain";
                    return (
                      <Button
                        key={child.label}
                        asChild
                        variant={child.active ? "tunal" : "ghost"}
                        className="h-[clamp(38px,2.3vw,46px)] justify-start gap-[0.625vw] rounded-[0.729vw] px-[0.833vw] text-[clamp(13px,0.78vw,15px)] font-semibold"
                      >
                        <Link href={child.href}>
                          <AdminDashboardIcon name={child.icon} size={child.icon === "sdk" ? 24 : 16} className={iconClass} />
                          {child.label}
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              </details>
            );
          }

          if (item.disabled) {
            return (
              <Button
                key={item.label}
                type="button"
                variant="ghost"
                disabled
                className="h-[clamp(44px,2.75vw,54px)] justify-start gap-[0.833vw] rounded-[0.833vw] px-[0.833vw] text-[clamp(14px,0.84vw,16px)] font-semibold text-customer-muted opacity-70"
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
              className="h-[clamp(44px,2.75vw,54px)] justify-start gap-[0.833vw] rounded-[0.833vw] px-[0.833vw] text-[clamp(14px,0.84vw,16px)] font-semibold"
            >
              <Link href={item.href}>{content}</Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
