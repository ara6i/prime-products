import { CustomerDashboardIcon } from "../shared/CustomerDashboardIcon";
import type { CustomerOverviewStat, CustomerOverviewTone } from "../../types/overview";

interface CustomerOverviewStatCardProps {
  stat: CustomerOverviewStat;
}

const toneClassName: Record<CustomerOverviewTone, string> = {
  primary: "bg-brand-blue text-white shadow-[0_18px_38px_rgba(33,84,239,0.22)]",
  strong: "bg-brand-blue-dark text-white shadow-[0_18px_38px_rgba(25,62,220,0.18)]",
  green: "border border-brand-blue/10 bg-customer-card text-text-primary shadow-[0_16px_44px_rgba(33,84,239,0.06)]",
  blue: "bg-customer-blue text-text-primary shadow-[0_16px_44px_rgba(33,84,239,0.06)]",
  neutral: "border border-customer-border bg-customer-card text-text-primary shadow-[0_16px_44px_rgba(33,84,239,0.06)]",
};

const iconClassName: Record<CustomerOverviewTone, string> = {
  primary: "bg-white/18 text-white",
  strong: "bg-white/14 text-white",
  green: "bg-customer-blue text-brand-blue",
  blue: "bg-customer-card text-brand-blue",
  neutral: "bg-customer-blue text-brand-blue",
};

function isStrongTone(tone: CustomerOverviewTone): boolean {
  return tone === "primary" || tone === "strong";
}

export function CustomerOverviewStatCard({ stat }: CustomerOverviewStatCardProps) {
  return (
    <article className={`min-h-[132px] rounded-[22px] p-4 ${toneClassName[stat.tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={isStrongTone(stat.tone) ? "text-sm text-white/78" : "text-sm text-text-body"}>
          {stat.label}
        </p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClassName[stat.tone]}`}>
          <CustomerDashboardIcon name={stat.icon} size={17} className="h-[17px] w-[17px]" />
        </span>
      </div>
      <p className="mt-6 text-[30px] font-semibold leading-none tracking-[-0.03em]">{stat.value}</p>
      <p className={isStrongTone(stat.tone) ? "mt-3 text-xs text-white/72" : "mt-3 text-xs text-customer-muted"}>
        {stat.detail}
      </p>
    </article>
  );
}
