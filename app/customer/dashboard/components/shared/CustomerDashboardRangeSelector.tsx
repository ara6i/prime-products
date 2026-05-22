import Link from "next/link";
import { CalendarIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { CustomerDashboardRangeOption } from "../../types";

interface CustomerDashboardRangeSelectorProps {
  options: CustomerDashboardRangeOption[];
  selectedLabel: string;
}

export function CustomerDashboardRangeSelector({ options, selectedLabel }: CustomerDashboardRangeSelectorProps) {
  return (
    <div
      className="flex items-center gap-[var(--spacing-customer-gap-xs)] rounded-full border border-customer-border bg-customer-soft p-[0.208vw] max-lg:p-[1vw]"
      aria-label={selectedLabel}
    >
      <span className="hidden items-center pl-[0.521vw] pr-[0.208vw] text-text-body lg:inline-flex">
        <CalendarIcon size={16} className="h-[0.833vw] w-[0.833vw]" />
      </span>
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
