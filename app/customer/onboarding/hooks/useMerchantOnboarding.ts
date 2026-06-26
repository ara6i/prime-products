"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getMerchantOnboardingAction,
  submitMerchantOnboardingReviewAction,
  verifyMerchantDomainAction,
} from "../actions";
import type {
  DomainVerificationResult,
  MerchantOnboardingViewModel,
  OnboardingStepId,
  OnboardingStepViewModel,
} from "../types";

const STEP_ORDER: OnboardingStepId[] = ["welcome", "business", "domain", "review"];

interface UseMerchantOnboardingResult {
  activeStepId: OnboardingStepId;
  activeStepIndex: number;
  onboarding: MerchantOnboardingViewModel;
  profileComplete: boolean;
  domainVerified: boolean;
  verifying: boolean;
  completing: boolean;
  verificationResult: DomainVerificationResult | null;
  steps: OnboardingStepViewModel[];
  updateOnboarding: (onboarding: MerchantOnboardingViewModel) => void;
  goBack: () => void;
  goNext: () => void;
  selectStep: (stepId: OnboardingStepId) => void;
  copyText: (value: string, label: string) => Promise<void>;
  verifyDomain: () => void;
  submitReview: () => void;
}

export function useMerchantOnboarding(
  initial: MerchantOnboardingViewModel,
): UseMerchantOnboardingResult {
  const router = useRouter();
  const initialDomainVerified = initial.steps.find((step) => step.id === "domain")?.status === "complete";
  const [onboarding, setOnboarding] = useState(initial);
  const [activeStepId, setActiveStepId] = useState<OnboardingStepId>(
    initial.review.status === "manual_review" || initial.review.status === "rejected"
      ? "review"
      : initial.profile.completed ? (initialDomainVerified ? "review" : "domain") : "welcome",
  );
  const [domainVerified, setDomainVerified] = useState(initialDomainVerified);
  const [verificationResult, setVerificationResult] = useState<DomainVerificationResult | null>(null);
  const [verifying, startVerifyTransition] = useTransition();
  const [completing, startCompleteTransition] = useTransition();
  const redirectedRef = useRef(false);

  const profileComplete = onboarding.profile.completed;
  const activeStepIndex = STEP_ORDER.indexOf(activeStepId);

  const steps = useMemo<OnboardingStepViewModel[]>(
    () =>
      onboarding.steps.map((step) => {
        if (step.id === "welcome") {
          return { ...step, status: profileComplete || activeStepIndex > 0 ? "complete" : "ready" };
        }
        if (step.id === "business") {
          return { ...step, status: profileComplete ? "complete" : "ready" };
        }
        if (step.id === "domain") {
          return { ...step, status: profileComplete ? (domainVerified ? "complete" : "ready") : "locked" };
        }
        if (step.id === "review") {
          return {
            ...step,
            status: onboarding.review.status === "approved"
              ? "complete"
              : profileComplete && domainVerified ? "ready" : "locked",
          };
        }
        return step;
      }),
    [activeStepIndex, domainVerified, onboarding.review.status, onboarding.steps, profileComplete],
  );

  const canOpenStep = (stepId: OnboardingStepId) => {
    if (stepId === "welcome" || stepId === "business") return true;
    if (stepId === "domain") return profileComplete;
    return profileComplete && domainVerified;
  };

  const selectStep = (stepId: OnboardingStepId) => {
    if (canOpenStep(stepId)) {
      setActiveStepId(stepId);
      return;
    }

    toast.warning(profileComplete ? "Verify the domain first" : "Finish the business profile first", {
      description: profileComplete
        ? "The review step unlocks after DNS ownership is confirmed."
        : "The SDK workspace needs a website before domain verification.",
    });
  };

  const goBack = () => {
    const previousStep = STEP_ORDER[Math.max(activeStepIndex - 1, 0)] ?? "welcome";
    setActiveStepId(previousStep);
  };

  const goNext = () => {
    if (activeStepId === "welcome") {
      setActiveStepId("business");
      return;
    }

    if (activeStepId === "business") {
      if (!profileComplete) {
        toast.warning("Save the business profile first", {
          description: "This sets the website used for DNS and SDK key restrictions.",
        });
        return;
      }
      setActiveStepId("domain");
      return;
    }

    if (activeStepId === "domain") {
      if (!domainVerified) {
        toast.warning("Verify the domain first", {
          description: "Once DNS is confirmed, your workspace can move to review.",
        });
        return;
      }

      setActiveStepId("review");
    }
  };

  const updateOnboarding = (nextOnboarding: MerchantOnboardingViewModel) => {
    setOnboarding(nextOnboarding);
    setDomainVerified(nextOnboarding.steps.find((step) => step.id === "domain")?.status === "complete");
    if (activeStepId === "business" && nextOnboarding.profile.completed) {
      setActiveStepId("domain");
    }
  };

  const updateReview = (review: MerchantOnboardingViewModel["review"]) => {
    setOnboarding((current) => ({ ...current, review }));
  };

  const redirectToDashboard = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace("/customer/dashboard");
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (onboarding.review.status === "approved") {
      redirectToDashboard();
    }
  }, [onboarding.review.status, redirectToDashboard]);

  useEffect(() => {
    const shouldPollReview =
      onboarding.review.status === "auto_reviewing" ||
      onboarding.review.status === "manual_review";

    if (activeStepId !== "review" || !shouldPollReview) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const nextOnboarding = await getMerchantOnboardingAction();
        if (cancelled) return;
        setOnboarding(nextOnboarding);
        setDomainVerified(nextOnboarding.steps.find((step) => step.id === "domain")?.status === "complete");
        if (nextOnboarding.review.status === "approved") {
          redirectToDashboard();
        }
      } catch {
        // Keep the review screen visible; the next poll or refresh can recover.
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeStepId, onboarding.review.status, redirectToDashboard]);

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const verifyDomain = () => {
    startVerifyTransition(async () => {
      try {
        const result = await verifyMerchantDomainAction();
        setVerificationResult(result);
        setDomainVerified(result.verified);

        if (result.verified) {
          toast.success("Domain verified", {
            description: "Continue to submit your workspace for review.",
          });
          return;
        }

        toast.warning("What PrimeStyleAI found", {
          description: result.foundValues.length
            ? "TXT values were found, but not the required PrimeStyleAI value."
            : `No TXT values were found for ${result.record.host}.`,
        });
      } catch {
        toast.error("Could not verify domain", {
          description: "Please try again in a moment.",
        });
      }
    });
  };

  const submitReview = () => {
    if (!domainVerified) {
      toast.warning("Verify the domain first", {
        description: "We need a verified storefront domain before review.",
      });
      return;
    }

    startCompleteTransition(async () => {
      try {
        const result = await submitMerchantOnboardingReviewAction();
        updateReview(result.review);
        if (result.review.status === "approved") {
          toast.success("Workspace approved", {
            description: "Create your production key from the dashboard.",
          });
          redirectToDashboard();
          return;
        }
        toast.info("Manual review started", {
          description: "Our team will email you when the workspace is approved.",
        });
      } catch {
        toast.error("Could not submit review", {
          description: "Please try again in a moment.",
        });
      }
    });
  };

  return {
    activeStepId,
    activeStepIndex,
    onboarding,
    profileComplete,
    domainVerified,
    verifying,
    completing,
    verificationResult,
    steps,
    updateOnboarding,
    goBack,
    goNext,
    selectStep,
    copyText,
    verifyDomain,
    submitReview,
  };
}
