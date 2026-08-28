"use client";

import { EmailOtpConfirmModal } from "@/app/components/shared/EmailOtpConfirmModal";
import { getPilotRequestUrl } from "@/app/components/shared/pilotRequest";
import {
  ArrowRight,
  Atom,
  BracketsCurly,
  Browser,
  CheckCircle,
  CircleNotch,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { MerchantLandingViewModel } from "../types";
import styles from "./merchantLanding.module.css";

type DialogPhase = "opening" | "open" | "closing";
type SubmissionState = "idle" | "submitting" | "success" | "error";
type ToolIntegration = "shopify" | "react-sdk" | "api" | "widget";

type WaitlistSubmitPayload = {
  requestType: "merchant-waitlist";
  name: string;
  email: string;
  company: string;
  website: string;
  monthlyVisitors: string;
  catalogDescription?: string;
  toolIntegration: ToolIntegration;
  shareData: boolean;
};

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i;
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function MerchantInterestDialog({
  viewModel,
  isOpen,
  onClose,
}: {
  viewModel: MerchantLandingViewModel;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<DialogPhase>("opening");
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [emailVerificationToken, setEmailVerificationToken] = useState<
    string | null
  >(null);
  const [pendingPayload, setPendingPayload] =
    useState<WaitlistSubmitPayload | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let phaseTimeout: number | undefined;

    const phaseFrame = window.requestAnimationFrame(() => {
      if (isOpen) {
        setIsMounted(true);
        setPhase("opening");
        phaseTimeout = window.setTimeout(() => setPhase("open"), 700);
      } else {
        setPhase("closing");
        phaseTimeout = window.setTimeout(() => {
          setIsMounted(false);
          setSubmissionState("idle");
          setMessage("");
          setOtpOpen(false);
          setOtpEmail("");
          setVerifiedEmail(null);
          setEmailVerificationToken(null);
          setPendingPayload(null);
        }, 700);
      }
    });

    return () => {
      window.cancelAnimationFrame(phaseFrame);
      if (phaseTimeout) window.clearTimeout(phaseTimeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted || !isOpen) return;

    const focusFrame = window.requestAnimationFrame(() =>
      nameInputRef.current?.focus(),
    );

    return () => {
      window.cancelAnimationFrame(focusFrame);
    };
  }, [isMounted, isOpen]);

  useEffect(() => {
    if (!isMounted) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isMounted]);

  const submitWithVerification = async (
    payload: WaitlistSubmitPayload,
    verificationToken: string,
  ) => {
    setSubmissionState("submitting");
    setMessage("");

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
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(
          result.error ?? result.message ?? "Could not submit. Try again.",
        );
      }

      setSubmissionState("success");
      setMessage(
        "You’re on the merchant waitlist. We’ll review your brand and follow up with next steps.",
      );
      setPendingPayload(null);
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Something went wrong.";
      setSubmissionState("error");
      setMessage(nextMessage);
      if (/verify your email/i.test(nextMessage)) {
        setVerifiedEmail(null);
        setEmailVerificationToken(null);
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const website = String(formData.get("website") ?? "").trim();
    const monthlyVisitors = String(
      formData.get("monthlyVisitors") ?? "",
    ).trim();

    const invalidField =
      name.length < 2
        ? "name"
        : !EMAIL_RE.test(email)
          ? "email"
          : !WEBSITE_RE.test(website)
            ? "website"
            : !monthlyVisitors
              ? "monthlyVisitors"
              : null;

    if (invalidField) {
      setSubmissionState("error");
      setMessage(
        invalidField === "email"
          ? "Add a valid work email."
          : invalidField === "website"
            ? "Add a valid brand website."
            : invalidField === "monthlyVisitors"
              ? "Add a rough monthly visitor count."
              : "Add your full name.",
      );
      form
        .querySelector<HTMLInputElement>(`[name="${invalidField}"]`)
        ?.focus();
      return;
    }

    const payload: WaitlistSubmitPayload = {
      requestType: "merchant-waitlist",
      name,
      email,
      company: website,
      website,
      monthlyVisitors,
      catalogDescription:
        String(formData.get("catalogDescription") ?? "").trim() || undefined,
      toolIntegration: String(
        formData.get("toolIntegration") ?? "react-sdk",
      ) as ToolIntegration,
      shareData: false,
    };

    if (!emailVerificationToken || verifiedEmail !== email) {
      setPendingPayload(payload);
      setOtpEmail(email);
      setOtpOpen(true);
      return;
    }

    void submitWithVerification(payload, emailVerificationToken);
  };

  const handleOtpVerified = (
    email: string,
    verificationToken: string,
  ) => {
    const normalized = normalizeEmail(email);
    setVerifiedEmail(normalized);
    setEmailVerificationToken(verificationToken);
    setOtpOpen(false);

    if (pendingPayload && normalizeEmail(pendingPayload.email) === normalized) {
      void submitWithVerification(pendingPayload, verificationToken);
    }
  };

  if (!isMounted) return null;

  return (
    <>
      <EmailOtpConfirmModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        email={otpEmail}
        onVerified={handleOtpVerified}
      />
      <div
        className={styles.dialogBackdrop}
        data-state={phase}
      >
        <section
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="merchant-interest-title"
        >
          <button
            type="button"
            className={styles.dialogClose}
            onClick={onClose}
            aria-label="Close form"
          >
            <X size={20} />
          </button>
          <span>PrimeStyleAI Shopping Network</span>
          <h2 id="merchant-interest-title">{viewModel.interest.title}</h2>
          <p>{viewModel.interest.body}</p>
          {submissionState === "success" ? (
            <div className={styles.dialogSuccess}>
              <CheckCircle size={36} weight="fill" />
              <strong>{message}</strong>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label>
                <span className={styles.dialogFieldLabel}>
                  Full name <span className={styles.dialogRequired}>*</span>
                </span>
                <input
                  ref={nameInputRef}
                  name="name"
                  autoComplete="name"
                  required
                  placeholder="Jane Cooper"
                />
              </label>
              <label>
                <span className={styles.dialogFieldLabel}>
                  Work email <span className={styles.dialogRequired}>*</span>
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  placeholder="jane@brand.com"
                />
              </label>
              <label>
                <span className={styles.dialogFieldLabel}>
                  Brand website <span className={styles.dialogRequired}>*</span>
                </span>
                <input
                  name="website"
                  type="url"
                  autoComplete="url"
                  inputMode="url"
                  required
                  placeholder="https://yourbrand.com"
                />
              </label>
              <label>
                <span className={styles.dialogFieldLabel}>
                  Monthly visitors <span className={styles.dialogRequired}>*</span>
                </span>
                <input
                  name="monthlyVisitors"
                  inputMode="numeric"
                  required
                  placeholder="Example: 50,000"
                />
              </label>
              <fieldset className={styles.dialogChoiceGroup}>
                <legend>Integration</legend>
                <div className={styles.dialogChoiceRow}>
                  <label className={styles.dialogChoice}>
                    <input
                      type="radio"
                      name="toolIntegration"
                      value="shopify"
                    />
                    <span
                      className={styles.dialogChoiceIndicator}
                      aria-hidden="true"
                    />
                    <span
                      className={styles.dialogIntegrationMark}
                      aria-hidden="true"
                    >
                      <Image
                        src="/images/landing/ps/shopify/glyph-color.svg"
                        alt=""
                        width={24}
                        height={24}
                      />
                    </span>
                    <strong>Shopify</strong>
                  </label>
                  <label className={styles.dialogChoice}>
                    <input
                      type="radio"
                      name="toolIntegration"
                      value="react-sdk"
                      defaultChecked
                    />
                    <span
                      className={styles.dialogChoiceIndicator}
                      aria-hidden="true"
                    />
                    <span
                      className={`${styles.dialogIntegrationMark} ${styles.dialogIntegrationReact}`}
                      aria-hidden="true"
                    >
                      <Atom size={24} weight="regular" />
                    </span>
                    <strong>SDK</strong>
                  </label>
                  <label className={styles.dialogChoice}>
                    <input
                      type="radio"
                      name="toolIntegration"
                      value="api"
                    />
                    <span
                      className={styles.dialogChoiceIndicator}
                      aria-hidden="true"
                    />
                    <span
                      className={`${styles.dialogIntegrationMark} ${styles.dialogIntegrationApi}`}
                      aria-hidden="true"
                    >
                      <BracketsCurly size={23} weight="bold" />
                    </span>
                    <strong>API</strong>
                  </label>
                  <label className={styles.dialogChoice}>
                    <input
                      type="radio"
                      name="toolIntegration"
                      value="widget"
                    />
                    <span
                      className={styles.dialogChoiceIndicator}
                      aria-hidden="true"
                    />
                    <span
                      className={`${styles.dialogIntegrationMark} ${styles.dialogIntegrationWidget}`}
                      aria-hidden="true"
                    >
                      <Browser size={23} weight="bold" />
                    </span>
                    <strong>Widget</strong>
                  </label>
                </div>
              </fieldset>
              <label>
                <span className={styles.dialogFieldLabel}>Apparel catalog</span>
                <textarea
                  name="catalogDescription"
                  rows={4}
                  placeholder="Tell us what you sell, your size chart setup, and how you want to use PrimeStyleAI."
                />
              </label>
              {message ? (
                <p className={styles.formMessage} data-state={submissionState}>
                  {message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submissionState === "submitting"}
              >
                {submissionState === "submitting" ? (
                  <>
                    <CircleNotch
                      className={styles.dialogSpinner}
                      size={17}
                    />
                    Joining waitlist…
                  </>
                ) : (
                  <>
                    Join the waitlist <ArrowRight size={17} />
                  </>
                )}
              </button>
              <p className={styles.dialogPrivacyNote}>
                Your information will remain confidential and secure.
              </p>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
