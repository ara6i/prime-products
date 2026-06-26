import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink, ShieldCheck } from "lucide-react";
import type { VerificationRequestItem } from "../types";

interface VerificationRequestDetailPageProps {
  item: VerificationRequestItem;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[0.729vw] border border-customer-border bg-customer-soft p-[0.833vw] max-lg:rounded-[3vw] max-lg:p-[3vw]">
      <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.5vw]">
        {label}
      </p>
      <p className="mt-[0.208vw] break-words text-customer-sm font-semibold text-text-primary max-lg:mt-[1vw] max-lg:text-[3.2vw]">
        {value}
      </p>
    </div>
  );
}

function CheckRow({ check }: { check: VerificationRequestItem["checks"][number] }) {
  return (
    <div className="flex gap-[0.625vw] border-b border-customer-border px-[1.042vw] py-[0.833vw] last:border-b-0 max-lg:gap-[3vw] max-lg:px-[4vw] max-lg:py-[3vw]">
      {check.passed ? (
        <CheckCircle2 className="mt-[0.104vw] h-[1.042vw] w-[1.042vw] shrink-0 text-customer-success-text max-lg:h-[4.5vw] max-lg:w-[4.5vw]" />
      ) : (
        <CircleAlert className="mt-[0.104vw] h-[1.042vw] w-[1.042vw] shrink-0 text-customer-warning-text max-lg:h-[4.5vw] max-lg:w-[4.5vw]" />
      )}
      <div className="min-w-0">
        <p className="text-customer-sm font-semibold text-text-primary max-lg:text-[3.4vw]">{check.label}</p>
        <p className="mt-[0.156vw] text-customer-sm leading-[1.5] text-text-body max-lg:mt-[1vw] max-lg:text-[3.1vw]">
          {check.detail}
        </p>
      </div>
    </div>
  );
}

export function VerificationRequestDetailPage({
  item,
  approveAction,
  rejectAction,
}: VerificationRequestDetailPageProps) {
  return (
    <section className="space-y-[var(--spacing-customer-gap-md)] max-lg:space-y-[4vw]">
      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[var(--spacing-customer-card)] max-lg:rounded-[5vw] max-lg:p-[5vw]">
        <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-customer-gap-md)] max-lg:gap-[4vw]">
          <div className="min-w-0">
            <Link
              href="/admin/verification"
              className="inline-flex items-center gap-[0.313vw] text-customer-sm font-semibold text-brand-blue transition hover:text-brand-blue-dark max-lg:gap-1.5 max-lg:text-sm"
            >
              <ArrowLeft className="h-[0.833vw] w-[0.833vw] max-lg:h-4 max-lg:w-4" aria-hidden />
              Back to Verification Center
            </Link>
            <p className="mt-[1.042vw] inline-flex items-center gap-[0.417vw] rounded-full bg-customer-blue px-[0.729vw] py-[0.313vw] text-customer-xs font-semibold uppercase tracking-[0.12em] text-brand-blue max-lg:mt-[4vw] max-lg:gap-[2vw] max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[2.6vw]">
              <ShieldCheck className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
              Verification request
            </p>
            <h1 className="mt-[0.625vw] text-customer-3xl font-semibold tracking-[-0.05em] text-text-primary max-lg:mt-[2vw] max-lg:text-[7vw]">
              {item.workspaceName}
            </h1>
            <p className="mt-[0.313vw] text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
              {item.ownerEmail}
            </p>
          </div>
          <span className={`inline-flex rounded-full px-[0.833vw] py-[0.365vw] text-customer-sm font-semibold max-lg:px-[3.5vw] max-lg:py-[1.5vw] max-lg:text-[3vw] ${item.statusToneClass}`}>
            {item.statusLabel}
          </span>
        </div>

        <div className="mt-[var(--spacing-customer-gap-lg)] grid grid-cols-4 gap-[var(--spacing-customer-gap-sm)] max-xl:grid-cols-2 max-lg:mt-[5vw] max-lg:grid-cols-1 max-lg:gap-[3vw]">
          <InfoField label="Domain" value={item.domain} />
          <InfoField label="Submitted" value={item.submittedLabel} />
          <InfoField label="Reviewed" value={item.reviewedLabel} />
          <InfoField label="Access" value={item.requestedAccessLabel} />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_22vw] gap-[var(--spacing-customer-gap-md)] max-xl:grid-cols-1 max-lg:gap-[4vw]">
        <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[var(--spacing-customer-card)] max-lg:rounded-[5vw] max-lg:p-[5vw]">
          <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-customer-gap-md)]">
            <div>
              <h2 className="text-customer-xl font-semibold tracking-[-0.035em] text-text-primary max-lg:text-[5vw]">
                Business review
              </h2>
              <p className="mt-[0.208vw] text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
                AI review evidence and setup details for this customer workspace.
              </p>
            </div>
            <a
              href={item.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[0.313vw] rounded-full border border-brand-blue/20 px-[0.729vw] py-[0.365vw] text-customer-sm font-semibold text-brand-blue transition hover:border-brand-blue hover:bg-customer-blue max-lg:gap-1.5 max-lg:px-3 max-lg:py-2 max-lg:text-sm"
            >
              Website
              <ExternalLink className="h-[0.833vw] w-[0.833vw] max-lg:h-4 max-lg:w-4" aria-hidden />
            </a>
          </div>

          <div className="mt-[var(--spacing-customer-gap-md)] grid grid-cols-2 gap-[var(--spacing-customer-gap-sm)] max-lg:mt-[4vw] max-lg:grid-cols-1 max-lg:gap-[3vw]">
            <InfoField label="Merchant" value={item.merchantName} />
            <InfoField label="Monthly traffic" value={item.monthlyTraffic} />
          </div>

          <div className="mt-[var(--spacing-customer-gap-sm)] rounded-[0.729vw] border border-customer-border bg-customer-soft p-[0.833vw] max-lg:mt-[3vw] max-lg:rounded-[3vw] max-lg:p-[3vw]">
            <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.5vw]">
              Catalog
            </p>
            <p className="mt-[0.313vw] text-customer-sm leading-[1.55] text-text-primary max-lg:mt-[1vw] max-lg:text-[3.2vw]">
              {item.catalogDescription}
            </p>
          </div>

          <div className="mt-[var(--spacing-customer-gap-sm)] rounded-[0.729vw] border border-customer-border bg-customer-soft p-[0.833vw] max-lg:mt-[3vw] max-lg:rounded-[3vw] max-lg:p-[3vw]">
            <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.5vw]">
              Review notes
            </p>
            <p className="mt-[0.313vw] text-customer-sm leading-[1.55] text-text-primary max-lg:mt-[1vw] max-lg:text-[3.2vw]">
              {item.notes}
            </p>
          </div>

          <div className="mt-[var(--spacing-customer-gap-md)] overflow-hidden rounded-[0.729vw] border border-customer-border max-lg:mt-[4vw] max-lg:rounded-[3vw]">
            {item.checks.length ? (
              item.checks.map((check) => <CheckRow key={check.label} check={check} />)
            ) : (
              <div className="p-[1.042vw] text-customer-sm text-customer-muted max-lg:p-[4vw] max-lg:text-[3.2vw]">
                No review checks recorded.
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[var(--spacing-customer-card)] max-lg:rounded-[5vw] max-lg:p-[5vw]">
          <h2 className="text-customer-xl font-semibold tracking-[-0.035em] text-text-primary max-lg:text-[5vw]">
            Decision
          </h2>
          <p className="mt-[0.208vw] text-customer-sm leading-[1.55] text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
            Approve clear ecommerce businesses. Reject only when production access should stay blocked.
          </p>

          <div className="mt-[var(--spacing-customer-gap-md)] grid gap-[var(--spacing-customer-gap-sm)] max-lg:mt-[4vw] max-lg:gap-[3vw]">
            {item.canApprove ? (
              <form action={approveAction} className="grid gap-[0.625vw] max-lg:gap-[2.5vw]">
                <input type="hidden" name="id" value={item.id} />
                <textarea
                  name="note"
                  placeholder="Optional approval note"
                  rows={4}
                  className="resize-none rounded-[0.521vw] border border-customer-border bg-white px-[0.833vw] py-[0.729vw] text-customer-sm text-text-primary outline-none transition focus:border-brand-blue max-lg:rounded-[2.5vw] max-lg:px-[3vw] max-lg:py-[3vw] max-lg:text-[3.2vw]"
                />
                <button
                  type="submit"
                  className="rounded-[0.521vw] bg-brand-blue px-[0.938vw] py-[0.729vw] text-customer-sm font-semibold text-white transition hover:bg-[#1744d8] max-lg:rounded-[2.5vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.2vw]"
                >
                  Approve
                </button>
              </form>
            ) : null}
            {item.canReject ? (
              <form action={rejectAction} className="grid gap-[0.625vw] max-lg:gap-[2.5vw]">
                <input type="hidden" name="id" value={item.id} />
                <textarea
                  name="note"
                  placeholder="Required rejection note"
                  required
                  rows={4}
                  className="resize-none rounded-[0.521vw] border border-customer-border bg-white px-[0.833vw] py-[0.729vw] text-customer-sm text-text-primary outline-none transition focus:border-customer-danger-text max-lg:rounded-[2.5vw] max-lg:px-[3vw] max-lg:py-[3vw] max-lg:text-[3.2vw]"
                />
                <button
                  type="submit"
                  className="rounded-[0.521vw] border border-customer-danger-text bg-white px-[0.938vw] py-[0.729vw] text-customer-sm font-semibold text-customer-danger-text transition hover:bg-customer-danger-bg max-lg:rounded-[2.5vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.2vw]"
                >
                  Reject
                </button>
              </form>
            ) : null}
            {!item.canApprove && !item.canReject ? (
              <div className="rounded-[0.729vw] border border-customer-border bg-customer-soft p-[0.833vw] text-customer-sm leading-[1.55] text-text-body max-lg:rounded-[3vw] max-lg:p-[3vw] max-lg:text-[3.2vw]">
                No manual decision is needed for the current status.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
