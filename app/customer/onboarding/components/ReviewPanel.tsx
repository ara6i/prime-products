"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Loader2, Mail, ShieldCheck, TriangleAlert } from "lucide-react";
import type { MerchantOnboardingReview } from "../types";

interface ReviewPanelProps {
  review: MerchantOnboardingReview;
  completing: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewPanel({ review, completing, onBack, onSubmit }: ReviewPanelProps) {
  if (completing || review.status === "auto_reviewing") {
    return (
      <section className="py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
          Automatic review
        </p>
        <h2 className="mx-auto mt-3 max-w-[620px] text-[clamp(1.85rem,1.15rem+1.5vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111827]">
          We are reviewing your business.
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-base leading-7 text-[#5f6b7a]">
          This should only take a moment. We are checking your storefront, ecommerce signals, catalog quality, and setup details.
        </p>
      </section>
    );
  }

  if (review.status === "approved") {
    return (
      <StatusPanel
        icon={ShieldCheck}
        tone="success"
        eyebrow="Approved"
        title="Your workspace is approved."
        description="Open the dashboard to create your production key, install the SDK, and continue to the documentation."
        primaryLabel="Open dashboard"
        primaryHref="/customer/dashboard"
      />
    );
  }

  if (review.status === "manual_review") {
    return (
      <StatusPanel
        icon={Clock3}
        tone="warning"
        eyebrow="Manual review"
        title="Your workspace is being reviewed."
        description="We received your submission. Our automatic review could not confidently approve the storefront, so a PrimeStyleAI reviewer will check it manually. You do not need to resubmit; we will email you when it is approved or if we need anything else."
        checks={review.checks}
      />
    );
  }

  if (review.status === "rejected") {
    return (
      <StatusPanel
        icon={TriangleAlert}
        tone="danger"
        eyebrow="Needs changes"
        title="This workspace needs changes before approval."
        description={review.notes ?? "Review your storefront URL and business details, then update your onboarding information before resubmitting."}
        checks={review.checks}
      />
    );
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
        Review
      </p>
      <h2 className="mt-3 max-w-[650px] text-[clamp(1.85rem,1.15rem+1.5vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111827]">
        Your workspace is ready for PrimeStyleAI review.
      </h2>
      <p className="mt-3 max-w-[640px] text-base leading-7 text-[#5f6b7a]">
        We review SDK workspaces before enabling production access. This protects your store, shoppers, and PrimeStyleAI’s try-on infrastructure.
      </p>

      <div className="mt-8 rounded-2xl border border-[#e6edf7] bg-[#fbfdff]">
        <ReviewRow
          icon={CheckCircle2}
          title="Business details received"
          description="We use your brand, catalog, website, and traffic details to prepare the right SDK configuration."
        />
        <ReviewRow
          icon={CheckCircle2}
          title="Domain verification completed"
          description="Your storefront domain is trusted for the next setup step."
        />
        <ReviewRow
          icon={Clock3}
          title="Automatic business review"
          description="PrimeStyleAI checks ecommerce quality and setup signals immediately. Unclear submissions go to manual review."
        />
        <ReviewRow
          icon={Mail}
          title="Next contact"
          description="We will use the work email from your business profile if we need anything else."
          last
        />
      </div>

      <div className="mt-7 flex items-center justify-between gap-4 border-t border-[#edf2f7] pt-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition-colors hover:text-brand-blue"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={completing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-55"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          Submit for review
        </button>
      </div>
    </section>
  );
}

function StatusPanel({
  icon: Icon,
  tone,
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryHref,
  checks = [],
}: {
  icon: typeof CheckCircle2;
  tone: "success" | "warning" | "danger";
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
  checks?: MerchantOnboardingReview["checks"];
}) {
  const toneClass = {
    success: "bg-green-50 text-green-700 ring-green-100",
    warning: "bg-amber-50 text-amber-700 ring-amber-100",
    danger: "bg-red-50 text-red-700 ring-red-100",
  }[tone];

  return (
    <section>
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${toneClass}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
        {eyebrow}
      </p>
      <h2 className="mt-3 max-w-[650px] text-[clamp(1.85rem,1.15rem+1.5vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111827]">
        {title}
      </h2>
      <p className="mt-3 max-w-[640px] text-base leading-7 text-[#5f6b7a]">
        {description}
      </p>

      {checks.length ? (
        <div className="mt-7 rounded-2xl border border-[#e6edf7] bg-[#fbfdff]">
          {checks.map((check, index) => (
            <ReviewRow
              key={check.label}
              icon={check.passed ? CheckCircle2 : TriangleAlert}
              title={check.label}
              description={check.detail}
              last={index === checks.length - 1}
            />
          ))}
        </div>
      ) : null}

      {primaryLabel && primaryHref ? (
        <a
          href={primaryHref}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
        >
          {primaryLabel}
        </a>
      ) : null}
    </section>
  );
}

function ReviewRow({
  icon: Icon,
  title,
  description,
  last = false,
}: {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[40px_1fr] gap-4 px-5 py-4 ${last ? "" : "border-b border-[#e6edf7]"}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm ring-1 ring-[#dbe6f5]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#667085]">{description}</p>
      </div>
    </div>
  );
}
