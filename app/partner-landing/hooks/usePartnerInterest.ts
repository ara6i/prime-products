"use client";

import { useCallback, useState } from "react";
import { submitPartnerInterest } from "../services/partnerInterestService";
import type { PartnerAudience } from "../types";

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function usePartnerInterest(audience: PartnerAudience) {
  const [isOpen, setIsOpen] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");

  const open = useCallback(() => {
    setSubmissionState("idle");
    setMessage("");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const submit = useCallback(
    async (formData: FormData) => {
      setSubmissionState("submitting");
      setMessage("");

      const result = await submitPartnerInterest({
        audience,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        website: String(formData.get("website") ?? ""),
      });

      setSubmissionState(result.ok ? "success" : "error");
      setMessage(result.message);
    },
    [audience],
  );

  return { close, isOpen, message, open, submissionState, submit };
}
