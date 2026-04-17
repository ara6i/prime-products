"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X, Check, Loader2, Bell } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

export type NotifyProduct = "widget" | "shopify";

interface NotifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: NotifyProduct;
}

const PRODUCT_META: Record<NotifyProduct, { title: string; subtitle: string }> = {
  widget: {
    title: "Drop-in Widget",
    subtitle:
      "Get notified the moment the single-script embed opens for early access. One email — no newsletters.",
  },
  shopify: {
    title: "Shopify App",
    subtitle:
      "Get notified the moment the native Shopify app opens for early access. One email — no newsletters.",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NotifyModal({ open, onOpenChange, product }: NotifyModalProps) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      const reset = setTimeout(() => {
        setEmail("");
        setCompany("");
        setTouched(false);
        setSubmitError(null);
        setSubmitted(false);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(reset);
    }
  }, [open]);

  const emailError = !email.trim()
    ? "Email is required."
    : !EMAIL_RE.test(email.trim())
    ? "That doesn't look like a valid email."
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailError) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/contact/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          product,
          company: company.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(payload.error ?? payload.message ?? "Could not sign you up. Try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const meta = PRODUCT_META[product];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[92vh] w-[94vw] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-brand-blue/10 bg-white shadow-[0_32px_80px_rgba(33,84,239,0.25)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <ModalHeader onClose={() => onOpenChange(false)} />

          <div className="px-7 pb-7 pt-4">
            {submitted ? (
              <SuccessState email={email.trim()} onClose={() => onOpenChange(false)} />
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-brand-blue-pale/60 px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-brand-blue-dark">
                      <Bell className="h-3 w-3" />
                      Coming soon
                    </span>
                  </div>
                  <DialogPrimitive.Title className="text-[22px] font-medium leading-[1.2] tracking-[-0.015em] text-text-primary">
                    {meta.title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-sm leading-[1.55] text-text-body">
                    {meta.subtitle}
                  </DialogPrimitive.Description>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-body">
                    Work email<span className="ml-0.5 text-brand-blue">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className={cn(
                        "h-11 w-full rounded-lg border bg-white px-3 pr-9 text-sm text-text-primary placeholder:text-text-hint transition-all duration-200",
                        "focus:outline-none focus:ring-2",
                        touched && emailError
                          ? "border-text-error/50 focus:border-text-error focus:ring-text-error/15"
                          : !emailError && email.trim()
                          ? "border-status-success/50 focus:border-status-success focus:ring-status-success/15"
                          : "border-text-primary/15 focus:border-brand-blue focus:ring-brand-blue/15"
                      )}
                    />
                    <div
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300",
                        !emailError && email.trim() ? "scale-100 opacity-100" : "scale-75 opacity-0"
                      )}
                    >
                      <Check className="h-4 w-4 text-status-success" strokeWidth={3} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "overflow-hidden text-xs text-text-error transition-all duration-300",
                      touched && emailError ? "max-h-6 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    {emailError}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-body">Company (optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your store or brand"
                    autoComplete="organization"
                    className="h-11 w-full rounded-lg border border-text-primary/15 bg-white px-3 text-sm text-text-primary placeholder:text-text-hint transition-all duration-200 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>

                {submitError ? (
                  <div className="rounded-lg border border-text-error/20 bg-text-error/5 px-3 py-2 text-sm text-text-error animate-in fade-in-0 slide-in-from-top-1 duration-300">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full font-medium transition-all",
                    submitting
                      ? "cursor-wait bg-brand-blue/70 text-white"
                      : "bg-brand-blue text-white shadow-[0_8px_24px_rgba(33,84,239,0.25)] hover:-translate-y-0.5 hover:bg-brand-blue-dark hover:shadow-[0_12px_32px_rgba(33,84,239,0.32)]"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding you…
                    </>
                  ) : (
                    "Notify me"
                  )}
                </button>

                <p className="text-center text-xs text-text-hint">
                  One email when it ships. No spam, unsubscribe anytime.
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
        width={200}
        height={48}
        className="h-11 w-auto object-contain"
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

function SuccessState({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center animate-in fade-in-0 zoom-in-95 duration-400">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-success/10 text-status-success">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <h3 className="text-xl font-medium tracking-[-0.01em] text-text-primary">You&rsquo;re on the list.</h3>
      <p className="max-w-[36ch] text-sm leading-[1.55] text-text-body">
        We sent a confirmation to <span className="font-medium text-text-primary">{email}</span>. You&rsquo;ll hear from us the moment early access opens.
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
