import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import type { CustomerDashboardViewOption } from "../../types";

interface CustomerDashboardViewSelectorProps {
  options: CustomerDashboardViewOption[];
}

export function CustomerDashboardViewSelector({ options }: CustomerDashboardViewSelectorProps) {
  return (
    <div
      className="flex items-center gap-[var(--spacing-customer-gap-xs)] rounded-full border border-customer-border bg-customer-soft p-[0.208vw] max-lg:p-[1vw]"
      aria-label="Analytics display mode"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          asChild
          variant={option.active ? "tunal" : "ghost"}
          size="sm"
          className="h-[1.979vw] rounded-full px-[0.729vw] text-customer-sm font-semibold max-lg:h-[8.5vw] max-lg:px-[3.2vw] max-lg:text-[3vw]"
        >
          <Link href={option.href} aria-current={option.active ? "page" : undefined}>
            {option.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
