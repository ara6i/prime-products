import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { CustomerOverviewPlanSnapshot, CustomerOverviewUsageLimit } from "../../types/overview";

interface CustomerOverviewPlanCardProps {
  plan: CustomerOverviewPlanSnapshot;
  usageLimit: CustomerOverviewUsageLimit;
}

export function CustomerOverviewPlanCard({ plan, usageLimit }: CustomerOverviewPlanCardProps) {
  return (
    <section className="rounded-[24px] border border-customer-border bg-customer-card p-5 shadow-[0_16px_44px_rgba(33,84,239,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-customer-muted">{plan.title}</p>
          <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.035em] text-text-primary">
            {plan.value}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-body">{plan.detail}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-customer-blue text-brand-blue">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </span>
      </div>

      <div className="mt-5 grid gap-2">
        {[plan.productLabel, plan.tryOnLabel, plan.renewalLabel].map((label) => (
          <div key={label} className="flex items-center gap-2 rounded-full bg-customer-blue px-3 py-2 text-sm text-text-body">
            <span className="h-2 w-2 rounded-full bg-brand-blue" />
            {label}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-xs text-customer-muted">
          <span>{usageLimit.usedLabel}</span>
          <span>{usageLimit.limitLabel}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-customer-soft">
          <span
            className="block h-full rounded-full bg-brand-blue"
            style={{ width: `${usageLimit.percent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/customer/dashboard/plans"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
        >
          Manage
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/customer/dashboard/docs"
          className="flex h-11 items-center justify-center rounded-full bg-customer-blue px-4 text-sm font-semibold text-brand-blue transition-colors hover:bg-customer-soft"
        >
          Docs
        </Link>
      </div>
    </section>
  );
}
