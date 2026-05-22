"use client";

import { useEffect } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Check, Loader2, Mail, RefreshCcw, ShieldCheck, X } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import { usePilotEmailOtpVerification } from "./hooks/usePilotEmailOtpVerification";
import { useLandingLanguage } from "@/app/landing/i18n";

interface EmailOtpConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerified: (verifiedEmail: string, verificationToken: string) => void;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function EmailOtpConfirmModal({ open, onOpenChange, email, onVerified }: EmailOtpConfirmModalProps) {
  const { translate } = useLandingLanguage();
  const {
    code,
    setCode,
    error,
    info,
    requesting,
    verifying,
    cooldownSecondsLeft,
    requestOtp,
    verifyOtp,
  } = usePilotEmailOtpVerification(email, open);

  useEffect(() => {
    if (!open) return;
    requestOtp();
  }, [open, requestOtp]);

  const handleConfirm = async () => {
    const token = await verifyOtp();
    if (!token) return;
    onVerified(normalizeEmail(email), token);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-text-primary/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[90] flex flex-col overflow-y-auto overscroll-contain border border-brand-blue/10 bg-white shadow-[0_32px_80px_rgba(33,84,239,0.25)]",
            "inset-x-0 bottom-0 max-h-[90vh] w-full rounded-t-3xl rounded-b-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[94vw] md:max-w-[500px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl",
            "md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:fade-out-0 md:data-[state=closed]:zoom-out-95"
          )}
        >
          <div className="flex items-center justify-between border-b border-brand-blue/10 bg-gradient-to-br from-brand-blue-pale/55 via-white to-brand-blue-pale/30 px-5 py-4 md:px-6">
            <DialogPrimitive.Title className="text-lg font-semibold text-text-primary">{translate("Confirm your email")}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-hint transition-colors hover:bg-brand-blue-pale/60 hover:text-text-primary"
              aria-label={translate("Close")}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-5 px-5 pb-6 pt-5 md:px-6 md:pb-7">
            <div className="rounded-2xl border border-brand-blue/12 bg-brand-blue-pale/35 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-blue shadow-[0_8px_18px_rgba(33,84,239,0.18)]">
                  <Mail className="h-4 w-4" strokeWidth={2.1} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{translate("We sent a 6-digit code to:")}</p>
                  <p className="mt-0.5 break-all text-sm text-brand-blue-dark">{email || translate("your email")}</p>
                  <p className="mt-2 text-xs leading-[1.55] text-text-body">
                    {translate("Confirming email keeps spam and fake submissions out.")}
                  </p>
                </div>
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-text-primary">{translate("Verification code")}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleConfirm();
                  }
                }}
                placeholder="123456"
                className="h-12 w-full rounded-xl border border-text-primary/12 bg-white px-3 text-center text-lg tracking-[0.26em] text-text-primary placeholder:tracking-normal placeholder:text-text-hint focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-text-error/25 bg-text-error/5 px-3 py-2 text-sm text-text-error">{error}</p>
            ) : null}
            {info ? <p className="text-xs text-text-hint">{info}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={verifying || requesting}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-all",
                  verifying || requesting
                    ? "cursor-wait bg-brand-blue/70"
                    : "bg-brand-blue hover:-translate-y-0.5 hover:bg-brand-blue-dark hover:shadow-[0_16px_32px_rgba(33,84,239,0.2)]"
                )}
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {verifying ? translate("Confirming...") : translate("Confirm email")}
              </button>

              <button
                type="button"
                onClick={() => void requestOtp()}
                disabled={requesting || cooldownSecondsLeft > 0 || verifying}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all",
                  requesting || cooldownSecondsLeft > 0 || verifying
                    ? "cursor-not-allowed border-text-primary/12 bg-text-primary/5 text-text-hint"
                    : "border-brand-blue/25 bg-white text-brand-blue hover:-translate-y-0.5 hover:border-brand-blue hover:bg-brand-blue-pale/35"
                )}
              >
                {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {cooldownSecondsLeft > 0
                  ? translate("Resend in {seconds}s", { seconds: cooldownSecondsLeft })
                  : translate("Resend code")}
              </button>
            </div>

            <div className="inline-flex items-start gap-2 rounded-xl border border-status-success/15 bg-status-success/5 px-3 py-2 text-xs text-text-body">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-success" strokeWidth={2} />
              {translate("This code expires quickly and is required before we accept your application.")}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
