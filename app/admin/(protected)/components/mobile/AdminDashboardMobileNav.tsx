import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import type { AdminDashboardNavItem } from "../../types";
import { AdminDashboardIcon } from "../shared/AdminDashboardIcon";

interface AdminDashboardMobileNavProps {
  navItems: AdminDashboardNavItem[];
}

export function AdminDashboardMobileNav({ navItems }: AdminDashboardMobileNavProps) {
  return (
    <nav className="flex gap-[2.5vw] overflow-x-auto px-[4vw] py-[3.5vw]">
      {navItems.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const content = (
          <>
            <AdminDashboardIcon name={item.icon} size={18} className="h-[4.4vw] w-[4.4vw]" />
            {item.label}
          </>
        );

        if (hasChildren && !item.disabled) {
          return (
            <details key={item.label} open={item.active} className="group shrink-0">
              <summary className="flex h-[11vw] cursor-pointer list-none items-center justify-center gap-[2.2vw] rounded-full px-[4.6vw] text-[3.6vw] font-semibold text-text-body transition-colors hover:bg-customer-soft group-open:bg-customer-blue group-open:text-brand-blue [&::-webkit-details-marker]:hidden">
                {content}
                <span className="text-[3vw] transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <div className="mt-[1.5vw] flex flex-col gap-[1vw]">
                {item.children?.map((child) => {
                  const iconClass =
                    child.icon === "sdk"
                      ? "h-[6vw] w-[6vw] object-contain"
                      : "h-[4vw] w-[4vw] object-contain";
                  return (
                    <Button
                      key={child.label}
                      asChild
                      variant={child.active ? "tunal" : "ghost"}
                      className="h-[10vw] shrink-0 gap-[2vw] rounded-full px-[4.5vw] text-[3.4vw] font-semibold"
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
              className="h-[11vw] shrink-0 gap-[2.2vw] rounded-full px-[4.6vw] text-[3.6vw] font-semibold text-customer-muted opacity-70"
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
            className="h-[11vw] shrink-0 gap-[2.2vw] rounded-full px-[4.6vw] text-[3.6vw] font-semibold"
          >
            <Link href={item.href}>{content}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
