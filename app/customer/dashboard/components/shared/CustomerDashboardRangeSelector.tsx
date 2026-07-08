import Link from "next/link";
import { CalendarIcon } from "@/app/shared/components/icons";
import type { CustomerDashboardRangeOption } from "../../types";

interface CustomerDashboardRangeSelectorProps {
  options: CustomerDashboardRangeOption[];
  selectedLabel: string;
}

export function CustomerDashboardRangeSelector({ options, selectedLabel }: CustomerDashboardRangeSelectorProps) {
  return (
    <div
      className="flex h-11 items-center gap-1 rounded-full border border-customer-border bg-customer-card p-1 shadow-[0_12px_28px_rgba(33,84,239,0.06)] max-lg:h-[10vw] max-lg:p-[1vw]"
      aria-label={selectedLabel}
    >
      <span className="hidden items-center pl-2 pr-1 text-brand-blue lg:inline-flex">
        <CalendarIcon size={16} className="h-4 w-4" />
      </span>
      {options.map((option) => (
        <Link
          key={option.value}
          href={option.href}
          aria-current={option.active ? "page" : undefined}
          className={`flex h-8 items-center rounded-full px-3 text-sm font-semibold transition-colors max-lg:h-[8vw] max-lg:px-[3vw] max-lg:text-[3vw] ${
            option.active
              ? "bg-brand-blue text-white"
              : "text-text-body hover:bg-customer-blue hover:text-brand-blue"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
