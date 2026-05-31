"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { CustomerDetailSection, CustomerDetailView } from "../types";
import { CustomerStatusBadge } from "./shared/CustomerStatusBadge";

interface CustomerDetailPageProps {
  customer: CustomerDetailView;
}

function DetailSection({ section }: { section: CustomerDetailSection }) {
  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
      <h3 className="text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:text-[4.4vw]">{section.title}</h3>
      <dl className="mt-[0.833vw] grid grid-cols-2 gap-x-[1.042vw] gap-y-[0.729vw] max-lg:mt-[3vw] max-lg:grid-cols-1 max-lg:gap-y-[2.5vw]">
        {section.fields.map((field) => (
          <div key={`${section.title}-${field.label}`} className="min-w-0">
            <dt className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">{field.label}</dt>
            <dd className="mt-[0.208vw] break-words text-[clamp(13px,0.78vw,15px)] text-text-primary max-lg:mt-[1vw] max-lg:text-[3.4vw]">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CustomerDetailPage({ customer }: CustomerDetailPageProps) {
  return (
    <section className="space-y-[1.042vw] max-lg:space-y-[4vw]">
      <div className="flex flex-wrap items-center justify-between gap-[1vw] rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card px-[1.25vw] py-[1.042vw] max-lg:rounded-[5vw] max-lg:px-[4vw] max-lg:py-[4vw]">
        <div className="flex min-w-0 items-center gap-[0.833vw] max-lg:gap-[3vw]">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            title="Back to customers"
            className="h-[2.083vw] w-[2.083vw] rounded-full max-lg:h-[10vw] max-lg:w-[10vw]"
          >
            <Link href={`/admin/customers/${customer.source}`}>
              <ArrowLeft className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:text-[3vw]">
              {customer.sourceLabel} customer
            </p>
            <h2 className="mt-[0.25vw] truncate text-[clamp(26px,1.65vw,32px)] font-semibold leading-tight text-text-primary max-lg:mt-[1vw] max-lg:text-[6vw]">
              {customer.store.storeName}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[0.521vw] max-lg:gap-[2vw]">
          <CustomerStatusBadge tone={customer.store.statusTone}>{customer.store.statusLabel}</CustomerStatusBadge>
          <span className="rounded-full bg-customer-blue px-[0.625vw] py-[0.208vw] text-[clamp(11px,0.68vw,13px)] font-semibold text-brand-blue max-lg:px-[2.4vw] max-lg:py-[1vw] max-lg:text-[2.9vw]">
            {customer.sourceLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[0.833vw] max-lg:grid-cols-2 max-lg:gap-[3vw]">
        <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">Customer</p>
          <p className="mt-[0.521vw] truncate text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:mt-[2vw] max-lg:text-[4vw]">{customer.store.ownerLabel}</p>
        </div>
        <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">Identifier</p>
          <p className="mt-[0.521vw] truncate text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:mt-[2vw] max-lg:text-[4vw]">{customer.store.identifierLabel}</p>
        </div>
        <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">Plan</p>
          <p className="mt-[0.521vw] truncate text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:mt-[2vw] max-lg:text-[4vw]">{customer.store.planLabel}</p>
        </div>
        <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">Try-ons</p>
          <p className="mt-[0.521vw] truncate text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:mt-[2vw] max-lg:text-[4vw]">{customer.store.tryOnsLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        {customer.sections.map((section) => (
          <DetailSection key={section.title} section={section} />
        ))}
      </div>

      <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
        <div className="flex flex-wrap items-center justify-between gap-[1vw] max-lg:gap-[3vw]">
          <div>
            <h3 className="text-[clamp(16px,1vw,20px)] font-semibold text-text-primary max-lg:text-[4.4vw]">Size Guide Profile</h3>
            <p className="mt-[0.25vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:mt-[1vw] max-lg:text-[3vw]">
              Stored size-guide mappings and original headers for this customer.
            </p>
          </div>
          {customer.sizeGuide ? (
            <div className="flex flex-wrap gap-[0.417vw] max-lg:gap-[1.5vw]">
              <span className="rounded-full bg-customer-blue px-[0.625vw] py-[0.208vw] text-[clamp(11px,0.68vw,13px)] font-semibold text-brand-blue max-lg:px-[2.4vw] max-lg:py-[1vw] max-lg:text-[2.9vw]">
                {customer.sizeGuide.unitLabel}
              </span>
              <span className="rounded-full bg-customer-soft px-[0.625vw] py-[0.208vw] text-[clamp(11px,0.68vw,13px)] font-semibold text-customer-muted max-lg:px-[2.4vw] max-lg:py-[1vw] max-lg:text-[2.9vw]">
                {customer.sizeGuide.mappings.length} mappings
              </span>
            </div>
          ) : null}
        </div>

        {customer.sizeGuide ? (
          <>
            <div className="mt-[0.833vw] grid grid-cols-2 gap-[1.042vw] max-lg:mt-[3vw] max-lg:grid-cols-1 max-lg:gap-[3vw]">
              <div>
                <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">Learned</p>
                <p className="mt-[0.208vw] text-[clamp(13px,0.78vw,15px)] text-text-primary max-lg:mt-[1vw] max-lg:text-[3.4vw]">{customer.sizeGuide.learnedLabel}</p>
              </div>
              <div>
                <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">Confirmed</p>
                <p className="mt-[0.208vw] text-[clamp(13px,0.78vw,15px)] text-text-primary max-lg:mt-[1vw] max-lg:text-[3.4vw]">{customer.sizeGuide.confirmedLabel}</p>
              </div>
            </div>

            <div className="mt-[0.833vw] rounded-[0.833vw] border border-customer-border bg-customer-soft px-[0.833vw] py-[0.625vw] max-lg:mt-[3vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw]">
              <p className="text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted max-lg:text-[2.8vw]">Original headers</p>
              <p className="mt-[0.313vw] break-words text-[clamp(13px,0.78vw,15px)] text-text-primary max-lg:mt-[1vw] max-lg:text-[3.4vw]">
                {customer.sizeGuide.originalHeaders.length > 0 ? customer.sizeGuide.originalHeaders.join(", ") : "Not available"}
              </p>
            </div>

            <div className="mt-[0.833vw] max-h-[18vw] overflow-y-auto rounded-[0.833vw] border border-customer-border max-lg:mt-[3vw] max-lg:max-h-none max-lg:rounded-[4vw]">
              <table className="w-full table-fixed border-collapse">
                <thead className="sticky top-0 bg-customer-soft">
                  <tr className="border-b border-customer-border text-left text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted">
                    <th className="px-[0.833vw] py-[0.521vw] max-lg:px-[3vw] max-lg:py-[2vw]">Original</th>
                    <th className="px-[0.833vw] py-[0.521vw] max-lg:px-[3vw] max-lg:py-[2vw]">Mapped key</th>
                    <th className="w-[8vw] px-[0.833vw] py-[0.521vw] max-lg:w-[18vw] max-lg:px-[3vw] max-lg:py-[2vw]">Unit</th>
                    <th className="px-[0.833vw] py-[0.521vw] max-lg:px-[3vw] max-lg:py-[2vw]">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.sizeGuide.mappings.map((mapping) => (
                    <tr key={`${mapping.original}-${mapping.key}-${mapping.label}`} className="border-b border-customer-border bg-customer-card last:border-b-0">
                      <td className="px-[0.833vw] py-[0.521vw] text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3vw]">{mapping.original}</td>
                      <td className="px-[0.833vw] py-[0.521vw] text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3vw]">{mapping.key}</td>
                      <td className="px-[0.833vw] py-[0.521vw] text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3vw]">{mapping.unit ?? "None"}</td>
                      <td className="px-[0.833vw] py-[0.521vw] text-[clamp(12px,0.72vw,14px)] text-text-primary max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[3vw]">{mapping.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-[0.833vw] rounded-[0.833vw] border border-dashed border-customer-border bg-customer-soft p-[1.25vw] text-center max-lg:mt-[3vw] max-lg:rounded-[4vw] max-lg:p-[6vw]">
            <p className="text-[clamp(14px,0.84vw,16px)] font-semibold text-text-primary max-lg:text-[3.6vw]">No size-guide profile yet</p>
            <p className="mt-[0.313vw] text-[clamp(12px,0.72vw,14px)] text-text-body max-lg:mt-[1vw] max-lg:text-[3vw]">When this customer maps sizing data, it will appear here.</p>
          </div>
        )}
      </section>
    </section>
  );
}
