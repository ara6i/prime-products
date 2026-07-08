import Link from "next/link";
import type { CustomerDashboardViewOption } from "../../types";

interface CustomerDashboardViewSelectorProps {
  options: CustomerDashboardViewOption[];
}

export function CustomerDashboardViewSelector({ options }: CustomerDashboardViewSelectorProps) {
  return (
    <div
      className="flex h-11 items-center gap-1 rounded-full border border-customer-border bg-customer-card p-1 shadow-[0_12px_28px_rgba(33,84,239,0.06)] max-lg:h-[10vw] max-lg:p-[1vw]"
      aria-label="Analytics display mode"
    >
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
