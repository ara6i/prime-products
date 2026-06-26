"use client";

import type { ComponentType, InputHTMLAttributes } from "react";
import { ArrowRight, CheckCircle2, Globe2, Loader2, Mail, MousePointerClick, UserRound } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import { useOnboardingProfileForm } from "../hooks/useOnboardingProfileForm";
import type { MerchantOnboardingProfile, MerchantOnboardingViewModel } from "../types";

interface BusinessProfilePanelProps {
  profile: MerchantOnboardingProfile;
  onSaved: (onboarding: MerchantOnboardingViewModel) => void;
}

export function BusinessProfilePanel({
  profile,
  onSaved,
}: BusinessProfilePanelProps) {
  const {
    values,
    touched,
    errors,
    saving,
    setField,
    markTouched,
    submit,
  } = useOnboardingProfileForm({ profile, onSaved });

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
        Business profile
      </p>
      <h2 className="mt-3 max-w-[650px] text-[clamp(1.85rem,1.15rem+1.5vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111827]">
        Tell us where the SDK will run.
      </h2>
      <p className="mt-3 max-w-[640px] text-base leading-7 text-[#5f6b7a]">
        This sets up the merchant workspace for API keys, allowed domains, documentation, and SDK usage analytics.
      </p>

      <div className="mt-6 rounded-2xl border border-[#e6edf7] bg-[#fbfdff] px-5 py-4">
        <h3 className="text-sm font-semibold text-[#111827]">
          Please answer carefully. We use these details during review.
        </h3>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-[#667085] sm:grid-cols-2">
          <InfoItem text="Your website tells us where the SDK will be allowed to run." />
          <InfoItem text="Traffic helps us prepare capacity and review the right production limits." />
          <InfoItem text="Catalog details help us understand sizing complexity, product coverage, and try-on needs." />
          <InfoItem text="Your work email is where we will follow up if we need clarification." />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          value={values.name}
          onChange={(value) => setField("name")(value)}
          onBlur={markTouched("name")}
          error={touched.name ? errors.name : undefined}
          icon={UserRound}
          autoComplete="name"
          placeholder="Jane Cooper"
        />
        <TextField
          label="Work email"
          value={values.email}
          onChange={(value) => setField("email")(value)}
          onBlur={markTouched("email")}
          error={touched.email ? errors.email : undefined}
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="jane@brand.com"
        />
        <TextField
          label="Brand website"
          value={values.website}
          onChange={(value) => setField("website")(value)}
          onBlur={markTouched("website")}
          error={touched.website ? errors.website : undefined}
          icon={Globe2}
          inputMode="url"
          autoComplete="url"
          placeholder="https://yourbrand.com"
        />
        <TextField
          label="Monthly visitors"
          value={values.monthlyVisitors}
          onChange={(value) => setField("monthlyVisitors")(value)}
          onBlur={markTouched("monthlyVisitors")}
          error={touched.monthlyVisitors ? errors.monthlyVisitors : undefined}
          icon={MousePointerClick}
          inputMode="numeric"
          placeholder="Example: 50,000"
        />
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-[#344054]">
          Apparel catalog
        </span>
        <textarea
          value={values.catalogDescription}
          onChange={(event) => setField("catalogDescription")(event.target.value)}
          onBlur={markTouched("catalogDescription")}
          rows={2}
          required
          placeholder="Tell us what you sell, how your size charts are structured, and where the SDK should appear."
          className={cn(
            "mt-2 w-full resize-none rounded-xl border bg-white px-3.5 py-3 text-sm leading-6 text-[#111827] outline-none transition-colors placeholder:text-[#98a2b3] focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10",
            touched.catalogDescription && errors.catalogDescription ? "border-text-error" : "border-[#d7e1ee]",
          )}
        />
        {touched.catalogDescription && errors.catalogDescription ? (
          <span className="mt-1.5 block text-xs font-semibold text-text-error">{errors.catalogDescription}</span>
        ) : null}
      </label>

      <label className="mt-5 flex gap-3 rounded-xl border border-[#dbe6f5] bg-[#fbfdff] px-4 py-3 text-sm leading-6 text-[#5f6b7a]">
        <input
          type="checkbox"
          checked={values.shareData}
          onChange={(event) => setField("shareData")(event.target.checked)}
          onBlur={markTouched("shareData")}
          required
          className="mt-1 h-4 w-4 rounded border-[#c9d8ef] text-brand-blue accent-brand-blue"
        />
        <span className="space-y-1">
          <span className="block font-semibold text-[#111827]">
            I can share performance data so PrimeStyleAI can measure business impact.
          </span>
          <span className="block">
            This helps us report how the SDK affects try-on engagement, size confidence, cart adds, conversion quality, return-rate reduction, and other fit-related benefits for your store.
          </span>
          {touched.shareData && errors.shareData ? (
            <span className="block text-xs font-semibold text-text-error">{errors.shareData}</span>
          ) : null}
        </span>
      </label>

      <div className="mt-7 flex justify-end border-t border-[#edf2f7] pt-6">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-55"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
          {saving ? "Saving profile" : "Continue"}
        </button>
      </div>
    </section>
  );
}

function InfoItem({ text }: { text: string }) {
  return (
    <p className="flex gap-2">
      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

function TextField({
  label,
  value,
  onChange,
  error,
  icon: Icon,
  className,
  ...props
}: TextFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium text-[#344054]">
        {label}
      </span>
      <span className="mt-2 flex h-11 items-center gap-3 rounded-xl border border-[#d7e1ee] bg-white px-3.5 transition-colors focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/10">
        <Icon className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
        <input
          {...props}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn("min-w-0 flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#98a2b3]", className)}
        />
      </span>
      {error ? <span className="mt-1.5 block text-xs font-semibold text-text-error">{error}</span> : null}
    </label>
  );
}
