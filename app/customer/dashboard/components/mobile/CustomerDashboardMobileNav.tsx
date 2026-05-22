import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import { CustomerDashboardIcon } from "../shared/CustomerDashboardIcon";
import type { CustomerDashboardNavItem } from "../../types";

interface CustomerDashboardMobileNavProps {
  navItems: CustomerDashboardNavItem[];
}

export function CustomerDashboardMobileNav({ navItems }: CustomerDashboardMobileNavProps) {
  return (
    <nav className="flex gap-[2vw] overflow-x-auto px-[4vw] py-[3vw]">
      {navItems.map((item) => {
        const content = (
          <>
            <CustomerDashboardIcon name={item.icon} size={16} className="h-[3.8vw] w-[3.8vw]" />
            {item.label}
          </>
        );

        if (item.disabled) {
          return (
            <Button
              key={item.label}
              type="button"
              variant="ghost"
              disabled
              className="h-[10vw] shrink-0 gap-[2vw] rounded-full px-[4vw] text-[3.2vw] text-customer-muted opacity-70"
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
            className="h-[10vw] shrink-0 gap-[2vw] rounded-full px-[4vw] text-[3.2vw]"
          >
            <Link href={item.href}>{content}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
