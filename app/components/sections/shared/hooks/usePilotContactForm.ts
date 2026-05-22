"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getPilotRequestUrl } from "../../../shared/pilotRequest";
import { useLandingLanguage } from "@/app/landing/i18n";

export type ToolIntegration = "react-sdk" | "api" | "shopify";
export type ShareData = "yes" | "no";

export type FormState = {
  name: string;
  email: string;
  website: string;
  monthlyVisitors: string;
  catalogDescription: string;
  toolIntegration: ToolIntegration;
  shareData: ShareData;
};

export type FieldErrors = Partial<Record<keyof FormState, string>>;
export type FieldTouched = Partial<Record<keyof FormState, boolean>>;

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

export const INITIAL_FORM: FormState = {
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

const ALL_TOUCHED_FIELDS: FieldTouched = {
  name: true,
  email: true,
  website: true,
  monthlyVisitors: true,
  catalogDescription: true,
  toolIntegration: true,
  shareData: true,
};

export const PILOT_DEMO_URL = "https://primestyleai.com/demo/products";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validate(form: FormState, translate: (value: string) => string): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2) errors.name = translate("Please enter your full name.");
  if (!form.email.trim()) errors.email = translate("Email is required.");
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = translate("Enter a valid email address.");
  if (!form.website.trim()) errors.website = translate("Please enter your website.");
  else if (!WEBSITE_RE.test(form.website.trim())) errors.website = translate("Enter a valid website.");
  if (!form.monthlyVisitors.trim()) errors.monthlyVisitors = translate("Please enter a rough monthly visitor count.");
  return errors;
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

export function usePilotContactForm() {
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

  const errors = useMemo(() => validate(form, translate), [form, translate]);
  const hasErrors = Object.keys(errors).length > 0;

  const setField =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((current) => {
        const next = { ...current, [key]: value };
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

  const markTouched =
    (key: keyof FormState) =>
    () => {
      setTouched((current) => ({ ...current, [key]: true }));
    };

  const submitWithVerification = async (payload: PilotSubmitPayload, verificationToken: string) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(getPilotRequestUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          emailVerificationToken: verificationToken,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(body.error ?? body.message ?? translate("Could not submit. Try again."));
      }

      setSubmitted(true);
      setForm(INITIAL_FORM);
      setTouched({});
      setPendingPayload(null);

      toast.success(translate("Application submitted"), {
        position: "bottom-right",
        description: translate("Thanks. Browse our demo while you wait."),
        action: {
          label: translate("Open demo"),
          onClick: () => {
            window.open(PILOT_DEMO_URL, "_blank", "noopener,noreferrer");
          },
        },
        className: "rounded-2xl",
        style: {
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid rgba(33,84,239,0.25)",
          boxShadow: "0 16px 44px rgba(33,84,239,0.16)",
          width: "min(92vw, 460px)",
          padding: "14px 16px",
          fontSize: "15px",
          lineHeight: "1.45",
        },
        actionButtonStyle: {
          background: "#2154EF",
          color: "#ffffff",
          borderRadius: "999px",
          fontWeight: 600,
          padding: "8px 14px",
        },
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : translate("Something went wrong."));
      if (error instanceof Error && /verify your email/i.test(error.message)) {
        setEmailVerificationToken(null);
        setVerifiedEmail(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(ALL_TOUCHED_FIELDS);

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

  return {
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
  };
}
