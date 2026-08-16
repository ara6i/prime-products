"use client";

import { useCallback, useState } from "react";
import { submitPartnerInterest } from "../services/partnerInterestService";
import type { CreatorPrimaryChannel, PartnerAudience } from "../types";

type SubmissionState = "idle" | "submitting" | "success" | "error";

function readCreatorProfiles(formData: FormData) {
  try {
    const parsed = JSON.parse(
      String(formData.get("creatorProfiles") ?? "[]"),
    ) as Array<{
      platform?: string;
      url?: string;
    }>;
    return parsed
      .filter((profile) => profile.platform && profile.url)
      .map((profile) => ({
        platform: profile.platform as CreatorPrimaryChannel,
        url: String(profile.url),
      }));
  } catch {
    return [];
  }
}

export function usePartnerInterest(audience: PartnerAudience) {
  const [isOpen, setIsOpen] = useState(false);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
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
      const creatorProfiles = readCreatorProfiles(formData);

      const result = await submitPartnerInterest({
        audience,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        website:
          audience === "influencer"
            ? undefined
            : String(formData.get("website") ?? ""),
        creatorProfiles,
        audienceSize: String(formData.get("audienceSize") ?? "") as
          "under-10k" | "10k-50k" | "50k-250k" | "250k-1m" | "1m-plus",
        location: String(formData.get("location") ?? ""),
        timezone: String(formData.get("timezone") ?? ""),
        marketingConsent: formData.get("marketingConsent") === "on",
        leadSource: audience === "influencer" ? "creator-waitlist" : undefined,
      });

      setSubmissionState(result.ok ? "success" : "error");
      setMessage(result.message);
    },
    [audience],
  );

  return { close, isOpen, message, open, submissionState, submit };
}
