"use client";

import {
  Check,
  Clock3,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Youtube,
} from "lucide-react";
import { Toaster } from "sonner";
import { EmailOtpConfirmModal } from "../../shared/EmailOtpConfirmModal";
import { Reveal } from "../../shared/Reveal";
import { WordReveal } from "../../shared/WordReveal";
import { cn } from "@/app/shared/lib/utils";
import { useLandingLanguage } from "@/app/landing/i18n";
import {
  PILOT_DEMO_URL,
  type ShareData,
  type ToolIntegration,
  usePilotContactForm,
} from "./hooks/usePilotContactForm";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "url" | "tel";
};

type RadioOption<T extends string> = {
  value: T;
  label: string;
};

const CONTACT_LINKS = [
  {
    Icon: Mail,
    label: "Email support",
    value: "support@primestyleai.com",
    href: "mailto:support@primestyleai.com",
  },
  {
    Icon: Phone,
    label: "Support number",
    value: "+1 (949) 364-4449",
    href: "tel:+19493644449",
  },
  {
    Icon: MapPin,
    label: "Address",
    value: "Laguna Niguel, California",
    href: "https://www.google.com/maps/search/?api=1&query=Laguna%20Niguel%2C%20California",
  },
];

const SOCIAL_LINKS = [
  {
    Icon: Linkedin,
    href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all",
    label: "LinkedIn",
  },
  { Icon: Instagram, href: "https://www.instagram.com/primestyleai/", label: "Instagram" },
  { Icon: Youtube, href: "https://www.youtube.com/@PrimeStyleAI", label: "YouTube" },
];

const INTEGRATION_OPTIONS: RadioOption<ToolIntegration>[] = [
  { value: "react-sdk", label: "React SDK" },
  { value: "api", label: "API" },
  { value: "shopify", label: "Shopify app" },
];

const SHARE_DATA_OPTIONS: RadioOption<ShareData>[] = [
  { value: "yes", label: "Yes, I can share pilot performance data." },
  { value: "no", label: "No, I prefer not to share performance data." },
];

const PILOT_NOTES = [
  { Icon: Clock3, title: "1 business day", body: "We review pilot applications quickly." },
  { Icon: ShieldCheck, title: "Confidential", body: "Brand and catalog details stay private." },
  { Icon: Check, title: "No credit card", body: "Qualified pilots can start without payment setup." },
];

export function PilotContactSection() {
  const { translate } = useLandingLanguage();
  const {
    form,
    touched,
    errors,
    submitted,
    submitting,
    submitError,
    setField,
    markTouched,
    handleSubmit,
    otpOpen,
    otpEmail,
    setOtpOpen,
    handleOtpVerified,
  } = usePilotContactForm();

  return (
    <section id="contact" className="relative overflow-hidden bg-white px-5 py-14 md:px-8 md:py-[clamp(5rem,7vw,7rem)]">
      <EmailOtpConfirmModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        email={otpEmail}
        onVerified={handleOtpVerified}
      />
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          className: "rounded-2xl",
          style: {
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(33,84,239,0.24)",
            boxShadow: "0 16px 44px rgba(33,84,239,0.16)",
            width: "min(92vw, 460px)",
            padding: "14px 16px",
            fontSize: "15px",
            lineHeight: "1.45",
          },
        }}
      />
      <div className="mx-auto grid w-full max-w-[1220px] items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] xl:max-w-[88.889vw]">
        <Reveal as="article" className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit rounded-full border border-brand-blue/15 bg-brand-blue-pale/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-blue-dark">
              {translate("Contact")}
            </span>
            <h2 className="max-w-[12ch] text-[clamp(2rem,1.5rem+2.2vw,3.65rem)] font-medium leading-[1.05] text-text-primary">
              <WordReveal text={translate("Contact us")} />
            </h2>
            <p className="max-w-[58ch] text-base leading-[1.65] text-text-body md:text-[1.05rem]">
              {translate(
                "Share your brand profile, catalog scope, and integration requirements. Our team reviews each pilot request and follows up with next steps."
              )}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-y border-text-primary/10 py-5">
            {CONTACT_LINKS.map(({ Icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-3 rounded-2xl px-1 py-1 transition-colors hover:text-brand-blue"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-blue/15 bg-brand-blue-pale/45 text-brand-blue-dark transition-colors group-hover:border-brand-blue/30 group-hover:bg-brand-blue-pale">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text-hint">{translate(label)}</span>
                  <span className="block break-words text-base font-semibold text-text-primary transition-colors group-hover:text-brand-blue">
                    {label === "Address" ? translate(value) : value}
                  </span>
                </span>
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold text-text-primary">{translate("Social links")}</span>
            <div className="flex flex-wrap items-center gap-3">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-text-primary/10 bg-white text-text-body shadow-[0_8px_24px_rgba(28,29,30,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-blue/25 hover:bg-brand-blue-pale/45 hover:text-brand-blue"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {PILOT_NOTES.map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-3 rounded-2xl bg-brand-blue-pale/35 p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" strokeWidth={1.8} />
                <div>
                  <div className="text-sm font-semibold text-text-primary">{translate(title)}</div>
                  <p className="mt-1 text-xs leading-[1.45] text-text-body">{translate(body)}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal variant="blur" delay={2}>
          <div className="relative overflow-hidden rounded-[28px] border border-brand-blue/10 bg-gradient-to-b from-white via-white to-brand-blue-pale/30 p-4 shadow-[0_24px_72px_rgba(33,84,239,0.12)] md:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-purple/10 blur-[90px]"
            />
            <div className="relative">
              <form
                onSubmit={handleSubmit}
                noValidate
                aria-hidden={submitted}
                className={cn(
                  "relative flex flex-col gap-5 transition-opacity duration-300",
                  submitted ? "pointer-events-none select-none opacity-0" : "opacity-100"
                )}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-blue">
                    {translate("Pilot form")}
                  </span>
                  <h3 className="text-2xl font-semibold leading-tight text-text-primary md:text-[2rem]">
                    {translate("Decision Engine Pilot Application")}
                  </h3>
                  <p className="max-w-[58ch] text-sm leading-[1.6] text-text-body">
                    {translate("Share the basics and we will follow up with the next step for your store.")}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={translate("Full name")}
                    required
                    value={form.name}
                    onChange={setField("name")}
                    onBlur={markTouched("name")}
                    error={touched.name ? errors.name : undefined}
                    placeholder={translate("Jane Cooper")}
                    autoComplete="name"
                  />
                  <Field
                    label={translate("Work email")}
                    type="email"
                    required
                    value={form.email}
                    onChange={setField("email")}
                    onBlur={markTouched("email")}
                    error={touched.email ? errors.email : undefined}
                    placeholder={translate("jane@brand.com")}
                    autoComplete="email"
                    inputMode="email"
                  />
                  <Field
                    label={translate("Brand website")}
                    required
                    value={form.website}
                    onChange={setField("website")}
                    onBlur={markTouched("website")}
                    error={touched.website ? errors.website : undefined}
                    placeholder={translate("https://yourbrand.com")}
                    autoComplete="url"
                    inputMode="url"
                  />
                  <Field
                    label={translate("Monthly visitors")}
                    required
                    value={form.monthlyVisitors}
                    onChange={setField("monthlyVisitors")}
                    onBlur={markTouched("monthlyVisitors")}
                    error={touched.monthlyVisitors ? errors.monthlyVisitors : undefined}
                    placeholder={translate("Example: 50,000")}
                    inputMode="numeric"
                  />
                </div>

                <Textarea
                  label={translate("Apparel catalog")}
                  value={form.catalogDescription}
                  onChange={setField("catalogDescription")}
                  onBlur={markTouched("catalogDescription")}
                  placeholder={translate("Tell us what you sell, your size chart setup, and where you want the pilot to run.")}
                />

                <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                  <RadioGroup
                    label={translate("Integration")}
                    name="contact-tool-integration"
                    value={form.toolIntegration}
                    onChange={(value) => setField("toolIntegration")(value)}
                    options={INTEGRATION_OPTIONS.map((option) => ({ ...option, label: translate(option.label) }))}
                  />
                  <RadioGroup
                    label={translate("Pilot measurement")}
                    name="contact-share-data"
                    value={form.shareData}
                    onChange={(value) => setField("shareData")(value)}
                    options={SHARE_DATA_OPTIONS.map((option) => ({ ...option, label: translate(option.label) }))}
                    layout="stack"
                  />
                </div>

                <p className="text-xs leading-[1.55] text-text-hint">
                  {translate(
                    "By applying, you agree to share data on the impact of the Decision Engine if your brand is selected."
                  )}
                </p>

                {submitError ? (
                  <div className="rounded-2xl border border-text-error/20 bg-text-error/5 px-4 py-3 text-sm text-text-error">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "inline-flex h-[52px] min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:ring-offset-2",
                    submitting
                      ? "cursor-wait bg-brand-blue/70"
                      : "cursor-pointer bg-brand-blue hover:-translate-y-0.5 hover:bg-brand-blue-dark hover:shadow-[0_16px_32px_rgba(33,84,239,0.2)]"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {translate("Submitting application...")}
                    </>
                  ) : (
                    <>
                      {translate("Submit pilot application")}
                      <Send className="h-4 w-4" strokeWidth={2} />
                    </>
                  )}
                </button>
              </form>

              <div
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-300",
                  submitted ? "opacity-100" : "translate-y-3 opacity-0"
                )}
              >
                <SuccessState translate={translate} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  required,
}: FieldProps) {
  const isValid = !error && value.trim().length > 0;

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-primary">
        {label}
        {required ? <span className="text-brand-blue"> *</span> : null}
      </span>
      <span className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
          className={cn(
            "h-11 w-full rounded-lg border bg-white px-3 pr-9 text-sm text-text-primary placeholder:text-text-hint transition-all duration-200",
            "focus:outline-none focus:ring-2",
            error
              ? "border-text-error/50 focus:border-text-error focus:ring-text-error/15"
              : isValid
              ? "border-status-success/45 focus:border-status-success focus:ring-status-success/15"
              : "border-text-primary/12 focus:border-brand-blue focus:ring-brand-blue/15"
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all",
            isValid ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
        >
          <Check className="h-4 w-4 text-status-success" strokeWidth={3} />
        </span>
      </span>
      <span className={cn("text-xs text-text-error transition-all", error ? "opacity-100" : "h-0 opacity-0")}>
        {error}
      </span>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: Pick<FieldProps, "label" | "value" | "onChange" | "onBlur" | "placeholder">) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={4}
        className="min-h-[118px] w-full resize-none rounded-lg border border-text-primary/12 bg-white px-3 py-3 text-sm leading-[1.55] text-text-primary placeholder:text-text-hint transition-all duration-200 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
      />
    </label>
  );
}

function RadioGroup<T extends string>({
  label,
  name,
  value,
  onChange,
  options,
  layout = "inline",
}: {
  label: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  layout?: "inline" | "stack";
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-text-primary">{label}</legend>
      <div className={cn("flex gap-2", layout === "stack" ? "flex-col" : "flex-row flex-wrap")}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200",
                checked
                  ? "border-brand-blue bg-brand-blue-pale/70 text-brand-blue-dark"
                  : "border-text-primary/10 bg-white text-text-body hover:border-brand-blue/25 hover:bg-brand-blue-pale/25",
                layout === "stack" ? "w-full" : ""
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all",
                  checked ? "border-brand-blue bg-brand-blue" : "border-text-primary/25 bg-white"
                )}
              >
                {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function SuccessState({ translate }: { translate: (value: string, replacements?: Record<string, string | number>) => string }) {
  return (
    <div className="relative flex w-full max-w-[35rem] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-blue/20 bg-brand-blue-pale/60 text-brand-blue">
        <Check className="h-8 w-8" strokeWidth={2.6} />
      </div>
      <h3 className="text-2xl font-semibold text-text-primary md:text-[2rem]">{translate("Application submitted.")}</h3>
      <p className="max-w-[36ch] text-sm leading-[1.6] text-text-body">
        {translate("Thanks. We will review your pilot request and reach out within 1 business day if your brand is a fit.")}
      </p>
      <a
        href={PILOT_DEMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto mt-2 inline-flex h-11 items-center justify-center rounded-full border border-brand-blue/25 bg-white px-5 text-sm font-semibold text-brand-blue transition-all hover:-translate-y-0.5 hover:border-brand-blue hover:bg-brand-blue-pale/40"
      >
        {translate("Browse our demo while you wait")}
      </a>
    </div>
  );
}
