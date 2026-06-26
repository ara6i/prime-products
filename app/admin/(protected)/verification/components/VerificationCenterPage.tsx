import Link from "next/link";
import { ArrowUpRight, Clock3, ShieldCheck } from "lucide-react";
import type { VerificationCenterView, VerificationRequestItem, VerificationStatCard } from "../types";

interface VerificationCenterPageProps {
  view: VerificationCenterView;
}

function statToneClass(tone: VerificationStatCard["tone"]): string {
  switch (tone) {
    case "green":
      return "text-customer-success-text";
    case "amber":
      return "text-customer-warning-text";
    case "rose":
      return "text-customer-danger-text";
    default:
      return "text-brand-blue";
  }
}

function StatCard({ card }: { card: VerificationStatCard }) {
  return (
    <div className="rounded-[0.938vw] border border-customer-border bg-customer-card p-[var(--spacing-customer-card)] max-lg:rounded-[4vw] max-lg:p-[4vw]">
      <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.6vw]">
        {card.label}
      </p>
      <p className={`mt-[0.313vw] text-customer-3xl font-semibold tracking-[-0.05em] max-lg:mt-[1vw] max-lg:text-[7vw] ${statToneClass(card.tone)}`}>
        {card.value}
      </p>
      <p className="mt-[0.208vw] text-customer-sm leading-[1.5] text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
        {card.helper}
      </p>
    </div>
  );
}

function VerificationStatusBadge({ item }: { item: VerificationRequestItem }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-[0.625vw] py-[0.26vw] text-customer-xs font-semibold max-lg:px-[3vw] max-lg:py-[1.3vw] max-lg:text-[2.7vw] ${item.statusToneClass}`}>
      {item.statusLabel}
    </span>
  );
}

function VerificationTable({ items }: { items: VerificationRequestItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-[0.938vw] border border-dashed border-customer-border bg-customer-card p-[var(--spacing-customer-card)] text-customer-sm text-customer-muted max-lg:rounded-[4vw] max-lg:p-[4vw] max-lg:text-[3.2vw]">
        No verification requests yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[0.938vw] border border-customer-border bg-customer-card max-lg:rounded-[4vw]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead className="bg-customer-soft">
            <tr className="border-b border-customer-border text-left text-customer-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">
              <th className="px-[1.042vw] py-[0.833vw]">Customer</th>
              <th className="px-[1.042vw] py-[0.833vw]">Domain</th>
              <th className="px-[1.042vw] py-[0.833vw]">Status</th>
              <th className="px-[1.042vw] py-[0.833vw]">Submitted</th>
              <th className="px-[1.042vw] py-[0.833vw]">Reviewed</th>
              <th className="px-[1.042vw] py-[0.833vw]">Access</th>
              <th className="px-[1.042vw] py-[0.833vw] text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-customer-border last:border-b-0">
                <td className="max-w-[18vw] px-[1.042vw] py-[0.938vw]">
                  <p className="truncate text-customer-sm font-semibold text-text-primary">{item.workspaceName}</p>
                  <p className="mt-[0.156vw] truncate text-customer-xs text-customer-muted">{item.ownerEmail}</p>
                </td>
                <td className="max-w-[13vw] px-[1.042vw] py-[0.938vw]">
                  <p className="truncate text-customer-sm font-semibold text-text-primary">{item.domain}</p>
                  <p className="mt-[0.156vw] truncate text-customer-xs text-customer-muted">{item.merchantName}</p>
                </td>
                <td className="px-[1.042vw] py-[0.938vw]">
                  <VerificationStatusBadge item={item} />
                </td>
                <td className="whitespace-nowrap px-[1.042vw] py-[0.938vw] text-customer-sm text-text-body">
                  {item.submittedLabel}
                </td>
                <td className="whitespace-nowrap px-[1.042vw] py-[0.938vw] text-customer-sm text-text-body">
                  {item.reviewedLabel}
                </td>
                <td className="whitespace-nowrap px-[1.042vw] py-[0.938vw] text-customer-sm text-text-body">
                  {item.requestedAccessLabel}
                </td>
                <td className="px-[1.042vw] py-[0.938vw] text-right">
                  <Link
                    href={`/admin/verification/${item.id}`}
                    className="inline-flex h-[2.083vw] items-center justify-center gap-[0.313vw] rounded-full border border-brand-blue/20 bg-white px-[0.833vw] text-customer-sm font-semibold text-brand-blue transition hover:border-brand-blue hover:bg-customer-blue max-lg:h-10 max-lg:gap-1.5 max-lg:px-4 max-lg:text-sm"
                  >
                    View
                    <ArrowUpRight className="h-[0.833vw] w-[0.833vw] max-lg:h-4 max-lg:w-4" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VerificationCenterPage({ view }: VerificationCenterPageProps) {
  return (
    <section className="space-y-[var(--spacing-customer-gap-lg)] max-lg:space-y-[5vw]">
      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[var(--spacing-customer-card)] max-lg:rounded-[5vw] max-lg:p-[5vw]">
        <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-customer-gap-lg)] max-lg:gap-[4vw]">
          <div className="max-w-[52vw] max-lg:max-w-none">
            <p className="inline-flex items-center gap-[0.417vw] rounded-full bg-customer-blue px-[0.729vw] py-[0.313vw] text-customer-xs font-semibold uppercase tracking-[0.12em] text-brand-blue max-lg:gap-[2vw] max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.6vw]">
              <ShieldCheck className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
              Verification Center
            </p>
            <h1 className="mt-[0.833vw] text-customer-3xl font-semibold tracking-[-0.05em] text-text-primary max-lg:mt-[3vw] max-lg:text-[7vw]">
              SDK dashboard review requests
            </h1>
            <p className="mt-[0.417vw] text-customer-sm leading-[1.6] text-text-body max-lg:mt-[2vw] max-lg:text-[3.2vw]">
              Review customer dashboard submissions from one clean queue. Open a request to approve, reject, or inspect the AI review evidence.
            </p>
          </div>
          <div className="rounded-[0.938vw] border border-customer-border bg-customer-soft p-[0.938vw] text-customer-sm text-text-body max-lg:rounded-[4vw] max-lg:p-[4vw] max-lg:text-[3.2vw]">
            <div className="flex items-center gap-[0.521vw] font-semibold text-text-primary max-lg:gap-[2vw]">
              <Clock3 className="h-[0.938vw] w-[0.938vw] text-brand-blue max-lg:h-[4vw] max-lg:w-[4vw]" />
              Live review queue
            </div>
            <p className="mt-[0.313vw] max-w-[18vw] leading-[1.5] max-lg:mt-[1vw] max-lg:max-w-none">
              Decisions update customer access, dashboard status, and notifications.
            </p>
          </div>
        </div>

        <div className="mt-[var(--spacing-customer-gap-lg)] grid grid-cols-4 gap-[var(--spacing-customer-gap-md)] max-xl:grid-cols-2 max-lg:mt-[5vw] max-lg:grid-cols-1 max-lg:gap-[3vw]">
          {view.stats.map((card) => (
            <StatCard key={card.label} card={card} />
          ))}
        </div>
      </div>

      <section className="space-y-[var(--spacing-customer-gap-md)] max-lg:space-y-[4vw]">
        <div>
          <h2 className="text-customer-xl font-semibold tracking-[-0.035em] text-text-primary max-lg:text-[5vw]">
            Customers
          </h2>
          <p className="mt-[0.208vw] text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
            Status is the current review outcome: Auto approved, Manual review, Rejected, Domain pending, or Draft.
          </p>
        </div>
        <VerificationTable items={view.allItems} />
      </section>
    </section>
  );
}
