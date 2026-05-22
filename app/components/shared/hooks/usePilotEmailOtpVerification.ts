"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPilotEmailOtpRequestUrl, getPilotEmailOtpVerifyUrl } from "../pilotRequest";
import { useLandingLanguage } from "@/app/landing/i18n";

const OTP_CODE_RE = /^\d{6}$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function usePilotEmailOtpVerification(email: string, open: boolean) {
  const { translate } = useLandingLanguage();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(() => Date.now());

  const emailNormalized = useMemo(() => normalizeEmail(email), [email]);

  const cooldownSecondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    if (!open || cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open, cooldownUntil]);

  useEffect(() => {
    if (!open || !emailNormalized) return;
    const id = window.setTimeout(() => {
      setCode("");
      setError(null);
      setInfo(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, emailNormalized]);

  const requestOtp = useCallback(async () => {
    if (!emailNormalized) return;

    setRequesting(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(getPilotEmailOtpRequestUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNormalized }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        cooldownSeconds?: number;
        retryAfterSeconds?: number;
      };

      if (!res.ok) {
        const retryAfter = payload.retryAfterSeconds ?? 0;
        if (retryAfter > 0) {
          setCooldownUntil(Date.now() + retryAfter * 1000);
        }
        throw new Error(payload.error ?? translate("Could not send verification code."));
      }

      const cooldownSeconds = payload.cooldownSeconds ?? 30;
      setCooldownUntil(Date.now() + cooldownSeconds * 1000);
      setInfo(translate("Code sent to {email}.", { email: emailNormalized }));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : translate("Could not send verification code."));
    } finally {
      setRequesting(false);
    }
  }, [emailNormalized, translate]);

  const verifyOtp = useCallback(async (): Promise<string | null> => {
    if (!emailNormalized) {
      setError(translate("Email is required."));
      return null;
    }

    if (!OTP_CODE_RE.test(code.trim())) {
      setError(translate("Enter the 6-digit code sent to your email."));
      return null;
    }

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch(getPilotEmailOtpVerifyUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNormalized, code: code.trim() }),
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string; verificationToken?: string };
      if (!res.ok || !payload.verificationToken) {
        throw new Error(payload.error ?? translate("Could not verify code."));
      }

      return payload.verificationToken;
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : translate("Could not verify code."));
      return null;
    } finally {
      setVerifying(false);
    }
  }, [code, emailNormalized, translate]);

  return {
    code,
    setCode,
    error,
    info,
    requesting,
    verifying,
    cooldownSecondsLeft,
    requestOtp,
    verifyOtp,
  };
}
