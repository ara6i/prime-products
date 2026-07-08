"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X, Check, Loader2 } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import { EmailOtpConfirmModal } from "./EmailOtpConfirmModal";
import { getPilotRequestUrl } from "./pilotRequest";
import { useLandingLanguage } from "@/app/landing/i18n";

interface PilotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ToolIntegration = "react-sdk" | "shopify";
type ShareData = "yes" | "no";

interface FormState {
  name: string;
  email: string;
  website: string;
  monthlyVisitors: string;
  catalogDescription: string;
  toolIntegration: ToolIntegration;
  shareData: ShareData;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;
type FieldTouched = Partial<Record<keyof FormState, boolean>>;
type PilotSubmitPayload = {
  name: string;
  email: string;
  company: string;
  website: string;
  monthlyVisitors: string;
  catalogDescription?: string;
  toolIntegration: ToolIntegration;
  shareData: boolean;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  website: "",
  monthlyVisitors: "",
  catalogDescription: "",
  toolIntegration: "react-sdk",
  shareData: "yes",
};

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i;
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
const PILOT_DEMO_URL = "https://primestyleai.com/demo/products";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toSubmitPayload(form: FormState): PilotSubmitPayload {
  return {
    name: form.name.trim(),
    email: normalizeEmail(form.email),
    company: form.website.trim(),
    website: form.website.trim(),
    monthlyVisitors: form.monthlyVisitors.trim(),
    catalogDescription: form.catalogDescription.trim() || undefined,
    toolIntegration: form.toolIntegration,
    shareData: form.shareData === "yes",
  };
}

function validate(form: FormState, translate: (value: string) => string): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2) errors.name = translate("Please enter your full name.");
  if (!form.email.trim()) errors.email = translate("Email is required.");
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = translate("That doesn't look like a valid email.");
  if (!form.website.trim()) errors.website = translate("Please enter your website.");
  else if (!WEBSITE_RE.test(form.website.trim())) errors.website = translate("Enter a valid website.");
  if (!form.monthlyVisitors.trim()) errors.monthlyVisitors = translate("Please enter a rough monthly visitor count.");
  return errors;
}

export function PilotModal({ open, onOpenChange }: PilotModalProps) {
  const { translate } = useLandingLanguage();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [touched, setTouched] = useState<FieldTouched>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<PilotSubmitPayload | null>(null);

  useEffect(() => {
    if (!open) {
      const reset = setTimeout(() => {
        setForm(INITIAL_FORM);
        setTouched({});
        setSubmitError(null);
        setSubmitted(false);
        setSubmitting(false);
        setOtpOpen(false);
        setOtpEmail("");
        setVerifiedEmail(null);
        setEmailVerificationToken(null);
        setPendingPayload(null);
      }, 200);
      return () => clearTimeout(reset);
    }
  }, [open]);

  const errors = validate(form, translate);
  const hasErrors = Object.keys(errors).length > 0;

  const setField =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((f) => {
        const next = { ...f, [key]: value };
        if (key === "email") {
          const nextEmail = normalizeEmail(String(value));
          if (!verifiedEmail || nextEmail !== verifiedEmail) {
            setVerifiedEmail(null);
            setEmailVerificationToken(null);
          }
        }
        return next;
      });
    };
  const markTouched = (key: keyof FormState) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
  };

  const submitWithVerification = async (payload: PilotSubmitPayload, verificationToken: string) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(getPilotRequestUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          emailVerificationToken: verificationToken,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(payload.error ?? payload.message ?? translate("Could not submit. Try again."));
      }
      setSubmitted(true);
      setPendingPayload(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : translate("Something went wrong."));
      if (err instanceof Error && /verify your email/i.test(err.message)) {
        setVerifiedEmail(null);
        setEmailVerificationToken(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      website: true,
      monthlyVisitors: true,
      catalogDescription: true,
      toolIntegration: true,
      shareData: true,
    });
    if (hasErrors) return;

    const payload = toSubmitPayload(form);
    const emailNormalized = payload.email;

    if (!emailVerificationToken || verifiedEmail !== emailNormalized) {
      setPendingPayload(payload);
      setOtpEmail(emailNormalized);
      setOtpOpen(true);
      return;
    }

    await submitWithVerification(payload, emailVerificationToken);
  };

  const handleOtpVerified = async (email: string, verificationToken: string) => {
    const normalized = normalizeEmail(email);
    setVerifiedEmail(normalized);
    setEmailVerificationToken(verificationToken);
    setOtpOpen(false);

    if (pendingPayload && normalizeEmail(pendingPayload.email) === normalized) {
      await submitWithVerification(pendingPayload, verificationToken);
    }
  };

  return (
    <>
      <EmailOtpConfirmModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        email={otpEmail}
        onVerified={handleOtpVerified}
      />
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col overflow-y-auto overscroll-contain border border-brand-blue/10 bg-white shadow-[0_32px_80px_rgba(33,84,239,0.25)]",
            // mobile: bottom drawer
            "inset-x-0 bottom-0 max-h-[92vh] w-full rounded-t-3xl rounded-b-none pt-2",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            // desktop: centered modal
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-6 md:w-[94vw] md:max-h-[calc(100vh-3rem)] md:max-w-[520px] md:-translate-x-1/2 md:translate-y-0 md:rounded-2xl md:pt-0",
            "md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:fade-out-0 md:data-[state=closed]:zoom-out-95 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:slide-out-to-bottom-0"
          )}
        >
          <div className="mx-auto mb-1 h-1.5 w-10 flex-shrink-0 rounded-full bg-text-primary/15 md:hidden" aria-hidden />
          <ModalHeader onClose={() => onOpenChange(false)} translate={translate} />

          <div className="px-5 pb-6 pt-4 md:px-7 md:pb-7 md:pt-5">
            {submitted ? <SuccessState onClose={() => onOpenChange(false)} /> : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <DialogPrimitive.Title className="text-[22px] font-medium leading-[1.2] tracking-[-0.015em] text-text-primary">
                    {translate("Decision Engine Pilot Application")}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-sm leading-[1.55] text-text-body">
                    {translate("Apply for a limited pilot to test the Decision Engine.")}
                  </DialogPrimitive.Description>
                  <p className="text-xs text-text-hint">{translate("Limited slots available. Subject to qualification approval.")}</p>
                </div>

                <div className="flex flex-col gap-3">
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
                  <Textarea
                    label={translate("Apparel catalog")}
                    value={form.catalogDescription}
                    onChange={setField("catalogDescription")}
                    onBlur={markTouched("catalogDescription")}
                    placeholder={translate("Tell us what you sell, your size chart setup, and where you want the pilot to run.")}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <RadioGroup
                    label={translate("Integration")}
                    name="toolIntegration"
                    value={form.toolIntegration}
                    onChange={(v) => setField("toolIntegration")(v as ToolIntegration)}
                    options={[
                      { value: "react-sdk", label: "React SDK" },
                      { value: "shopify", label: "Shopify app" },
                    ].map((option) => ({ ...option, label: translate(option.label) }))}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <RadioGroup
                    label={translate("Pilot measurement")}
                    name="shareData"
                    value={form.shareData}
                    onChange={(v) => setField("shareData")(v as ShareData)}
                    layout="stack"
                    options={[
                      { value: "yes", label: "Yes, I can share pilot performance data." },
                      { value: "no", label: "No, I prefer not to share performance data." },
                    ].map((option) => ({ ...option, label: translate(option.label) }))}
                  />
                </div>

                <p className="text-xs leading-[1.55] text-text-hint">
                  {translate("By applying, you agree to share data on the impact of the Decision Engine if your brand is selected.")}
                </p>

                {submitError ? (
                  <div className="rounded-lg border border-text-error/20 bg-text-error/5 px-3 py-2 text-sm text-text-error animate-in fade-in-0 slide-in-from-top-1 duration-300">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full font-medium transition-all",
                    submitting
                      ? "cursor-wait bg-brand-blue/70 text-white"
                      : "bg-brand-blue text-white hover:bg-brand-blue-dark"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {translate("Submitting application...")}
                    </>
                  ) : (
                    translate("Submit pilot application")
                  )}
                </button>

                <p className="text-center text-xs text-text-hint">
                  {translate("Your information will remain confidential and secure.")}
                </p>
              </form>
            )}
          </div>
        </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function ModalHeader({
  onClose,
  translate,
}: {
  onClose: () => void;
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}) {
  return (
    <div className="relative flex shrink-0 items-center justify-between border-b border-brand-blue/10 bg-gradient-to-br from-brand-blue-pale/60 via-white to-brand-blue-pale/30 px-5 py-4 md:sticky md:top-0 md:z-20 md:px-7 md:py-5">
      <Image
        src="/images/landing/optimized/logo-navbar-transparent.webp"
        alt="PrimeStyle AI"
        width={280}
        height={68}
        className="h-12 w-auto shrink-0 object-contain md:h-14"
        priority
      />
      <DialogPrimitive.Close
        onClick={onClose}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-hint transition-colors hover:bg-brand-blue-pale/50 hover:text-text-primary"
        aria-label={translate("Close")}
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

function SuccessState({
  onClose,
}: {
  onClose: () => void;
}) {
  const { translate } = useLandingLanguage();

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center animate-in fade-in-0 zoom-in-95 duration-400">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-success/10 text-status-success">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <h3 className="text-xl font-medium tracking-[-0.01em] text-text-primary">{translate("Application submitted.")}</h3>
      <p className="max-w-[34ch] text-sm leading-[1.55] text-text-body">
        {translate("Thanks — we’ll review your application and reach out within 1 business day if your brand is a fit.")}
      </p>
      <a
        href={PILOT_DEMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center justify-center rounded-full border border-brand-blue/25 bg-white px-5 text-sm font-semibold text-brand-blue transition-all hover:-translate-y-0.5 hover:border-brand-blue hover:bg-brand-blue-pale/40"
      >
        {translate("Browse our demo while you wait")}
      </a>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-brand-blue px-6 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark"
      >
        {translate("Done")}
      </button>
    </div>
  );
}

interface FieldBaseProps {
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
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  required,
  error,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
}: FieldBaseProps) {
  const isValid = !error && value.trim().length > 0;
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-primary">
        {label}
        {required ? <span className="text-brand-blue"> *</span> : null}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={cn(
            "h-11 w-full rounded-lg border bg-white px-3 pr-9 text-sm text-text-primary placeholder:text-text-hint transition-all duration-200",
            "focus:outline-none focus:ring-2",
            error
              ? "border-text-error/50 focus:border-text-error focus:ring-text-error/15"
              : isValid
              ? "border-status-success/50 focus:border-status-success focus:ring-status-success/15"
              : "border-text-primary/15 focus:border-brand-blue focus:ring-brand-blue/15"
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300",
            isValid ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
        >
          <Check className="h-4 w-4 text-status-success" strokeWidth={3} />
        </div>
      </div>
      <div
        className={cn(
          "overflow-hidden text-xs text-text-error transition-all duration-300",
          error ? "max-h-6 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {error}
      </div>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: Pick<FieldBaseProps, "label" | "value" | "onChange" | "onBlur" | "placeholder">) {
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

interface RadioOption {
  value: string;
  label: string;
}

function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  layout = "inline",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  layout?: "inline" | "stack";
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-text-primary">{label}</legend>
      <div className={cn("flex gap-2", layout === "stack" ? "flex-col" : "flex-row flex-wrap")}>
        {options.map((opt) => {
          const checked = opt.value === value;
          return (
            <label
              key={opt.value}
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
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
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
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
