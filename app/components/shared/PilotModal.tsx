"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X, Check, Loader2 } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

interface PilotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ToolIntegration = "react-sdk" | "api" | "shopify";
type ShareData = "yes" | "no";

interface FormState {
  name: string;
  email: string;
  brand: string;
  monthlyVisitors: string;
  catalogDescription: string;
  toolIntegration: ToolIntegration;
  shareData: ShareData;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;
type FieldTouched = Partial<Record<keyof FormState, boolean>>;

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  brand: "",
  monthlyVisitors: "",
  catalogDescription: "",
  toolIntegration: "react-sdk",
  shareData: "yes",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2) errors.name = "Please enter your full name.";
  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = "That doesn't look like a valid email.";
  if (!form.brand.trim() || form.brand.trim().length < 2) errors.brand = "Please enter your brand or store name.";
  if (!form.monthlyVisitors.trim()) errors.monthlyVisitors = "Please enter a rough monthly visitor count.";
  return errors;
}

export function PilotModal({ open, onOpenChange }: PilotModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [touched, setTouched] = useState<FieldTouched>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      const reset = setTimeout(() => {
        setForm(INITIAL_FORM);
        setTouched({});
        setSubmitError(null);
        setSubmitted(false);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(reset);
    }
  }, [open]);

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;

  const setField =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    };
  const markTouched = (key: keyof FormState) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      brand: true,
      monthlyVisitors: true,
      catalogDescription: true,
      toolIntegration: true,
      shareData: true,
    });
    if (hasErrors) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/contact/pilot-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.brand.trim(),
          monthlyVisitors: form.monthlyVisitors.trim(),
          catalogDescription: form.catalogDescription.trim() || undefined,
          toolIntegration: form.toolIntegration,
          shareData: form.shareData === "yes",
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(payload.error ?? payload.message ?? "Could not submit. Try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[94vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-brand-blue/10 bg-white shadow-[0_32px_80px_rgba(33,84,239,0.25)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <ModalHeader onClose={() => onOpenChange(false)} />

          <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-7 pt-5">
            {submitted ? <SuccessState onClose={() => onOpenChange(false)} /> : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <DialogPrimitive.Title className="text-[22px] font-medium leading-[1.2] tracking-[-0.015em] text-text-primary">
                    Decision Engine Pilot Application
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-sm leading-[1.55] text-text-body">
                    Apply for a limited pilot to test the Decision Engine.
                  </DialogPrimitive.Description>
                  <p className="text-xs text-text-hint">Limited slots available. Subject to qualification approval.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium text-text-primary">Tell us about your brand</div>

                  <Field
                    placeholder="Full name"
                    required
                    value={form.name}
                    onChange={setField("name")}
                    onBlur={markTouched("name")}
                    error={touched.name ? errors.name : undefined}
                    autoComplete="name"
                  />
                  <Field
                    type="email"
                    placeholder="Your email"
                    required
                    value={form.email}
                    onChange={setField("email")}
                    onBlur={markTouched("email")}
                    error={touched.email ? errors.email : undefined}
                    autoComplete="email"
                  />
                  <Field
                    placeholder="Brand/store name"
                    required
                    value={form.brand}
                    onChange={setField("brand")}
                    onBlur={markTouched("brand")}
                    error={touched.brand ? errors.brand : undefined}
                    autoComplete="organization"
                  />
                  <Field
                    placeholder="Monthly website visitors *"
                    required
                    value={form.monthlyVisitors}
                    onChange={setField("monthlyVisitors")}
                    onBlur={markTouched("monthlyVisitors")}
                    error={touched.monthlyVisitors ? errors.monthlyVisitors : undefined}
                    inputMode="numeric"
                  />
                  <Field
                    placeholder="Describe your apparel catalog"
                    value={form.catalogDescription}
                    onChange={setField("catalogDescription")}
                    onBlur={markTouched("catalogDescription")}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium text-text-primary">What type of tool integration are you using?</div>
                  <RadioGroup
                    name="toolIntegration"
                    value={form.toolIntegration}
                    onChange={(v) => setField("toolIntegration")(v as ToolIntegration)}
                    options={[
                      { value: "react-sdk", label: "React SDK" },
                      { value: "api", label: "API" },
                      { value: "shopify", label: "Shopify app" },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium text-text-primary">
                    Are you willing to share data on the effect of the Decision Engine to help us measure performance?
                  </div>
                  <RadioGroup
                    name="shareData"
                    value={form.shareData}
                    onChange={(v) => setField("shareData")(v as ShareData)}
                    layout="stack"
                    options={[
                      { value: "yes", label: "Yes, I am willing to share performance data." },
                      { value: "no", label: "No, I'd prefer not to share performance data." },
                    ]}
                  />
                </div>

                <p className="text-xs leading-[1.55] text-text-hint">
                  By applying you agree to share data on the impact of the Decision Engine if your brand is selected.
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
                      : "bg-brand-blue text-white shadow-[0_8px_24px_rgba(33,84,239,0.25)] hover:-translate-y-0.5 hover:bg-brand-blue-dark hover:shadow-[0_12px_32px_rgba(33,84,239,0.32)]"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting application…
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </button>

                <p className="text-center text-xs text-text-hint">
                  Your information will remain confidential and secure.
                </p>
              </form>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative flex items-center justify-between border-b border-brand-blue/10 bg-gradient-to-br from-brand-blue-pale/60 via-white to-brand-blue-pale/30 px-7 py-5">
      <Image
        src="/images/landing/logo-navbar-transparent.png"
        alt="PrimeStyle AI"
        width={220}
        height={52}
        className="h-12 w-auto object-contain"
        priority
      />
      <DialogPrimitive.Close
        onClick={onClose}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-hint transition-colors hover:bg-brand-blue-pale/50 hover:text-text-primary"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center animate-in fade-in-0 zoom-in-95 duration-400">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-success/10 text-status-success">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <h3 className="text-xl font-medium tracking-[-0.01em] text-text-primary">Application submitted.</h3>
      <p className="max-w-[34ch] text-sm leading-[1.55] text-text-body">
        Thanks — we&rsquo;ll review your application and reach out within 1 business day if your brand is a fit.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-brand-blue px-6 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark"
      >
        Done
      </button>
    </div>
  );
}

interface FieldBaseProps {
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
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
}: FieldBaseProps) {
  const isValid = !error && value.trim().length > 0;
  return (
    <div className="flex flex-col gap-1">
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
    </div>
  );
}

interface RadioOption {
  value: string;
  label: string;
}

function RadioGroup({
  name,
  value,
  onChange,
  options,
  layout = "inline",
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  layout?: "inline" | "stack";
}) {
  return (
    <div className={cn("flex gap-3", layout === "stack" ? "flex-col" : "flex-row flex-wrap")}>
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <label
            key={opt.value}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 text-sm text-text-body",
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
            <span className={cn(checked ? "text-text-primary" : "text-text-body")}>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
