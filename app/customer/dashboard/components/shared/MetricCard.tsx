import { CustomerDashboardIcon } from "./CustomerDashboardIcon";
import type { CustomerDashboardMetricCard } from "../../types";

interface MetricCardProps {
  metric: CustomerDashboardMetricCard;
}

const toneClasses: Record<CustomerDashboardMetricCard["tone"], string> = {
  blue: "bg-customer-blue text-brand-blue [[data-customer-theme=dark]_&]:bg-customer-soft [[data-customer-theme=dark]_&]:text-white",
  green: "bg-customer-success-bg text-customer-success-text",
  neutral: "bg-customer-soft text-text-body",
  amber: "bg-customer-warning-bg text-customer-warning-text",
  rose: "bg-customer-danger-bg text-customer-danger-text",
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="rounded-[0.938vw] border border-customer-border bg-customer-card p-[0.938vw] shadow-customer-card max-lg:rounded-[4.8vw] max-lg:p-[4vw]">
      <div className="flex items-center justify-between gap-[var(--spacing-customer-gap-md)]">
        <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.8vw]">
          {metric.label}
        </p>
        <span className={`flex h-[2.083vw] w-[2.083vw] items-center justify-center rounded-full max-lg:h-[9vw] max-lg:w-[9vw] ${toneClasses[metric.tone]}`}>
          <CustomerDashboardIcon name={metric.icon} size={18} className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </span>
      </div>
      <p className="mt-[0.729vw] text-customer-2xl font-semibold tracking-[-0.04em] text-text-primary max-lg:mt-[3vw] max-lg:text-[8vw]">
        {metric.value}
      </p>
      <p className="mt-[0.208vw] text-customer-sm leading-[1.5] text-text-body max-lg:mt-[1vw] max-lg:text-[3.4vw]">
        {metric.detail}
      </p>
    </article>
  );
}
