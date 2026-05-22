"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  completeMerchantOnboardingAction,
  createMerchantApiKeyAction,
  verifyMerchantDomainAction,
} from "../actions";
import type {
  DomainVerificationResult,
  MerchantApiKeyResult,
  MerchantOnboardingViewModel,
  OnboardingStepId,
  OnboardingStepViewModel,
} from "../types";

const STEP_ORDER: OnboardingStepId[] = ["environment", "domain", "api-key"];

interface UseMerchantOnboardingResult {
  activeStepId: OnboardingStepId;
  activeStepIndex: number;
  domainVerified: boolean;
  verifying: boolean;
  creatingKey: boolean;
  completing: boolean;
  verificationResult: DomainVerificationResult | null;
  apiKeyResult: MerchantApiKeyResult | null;
  steps: OnboardingStepViewModel[];
  goBack: () => void;
  goNext: () => void;
  selectStep: (stepId: OnboardingStepId) => void;
  copyText: (value: string, label: string) => Promise<void>;
  verifyDomain: () => void;
  createApiKey: () => void;
  completeOnboarding: () => void;
}

export function useMerchantOnboarding(
  initial: MerchantOnboardingViewModel,
): UseMerchantOnboardingResult {
  const router = useRouter();
  const [activeStepId, setActiveStepId] = useState<OnboardingStepId>("environment");
  const [domainVerified, setDomainVerified] = useState(
    initial.steps.find((step) => step.id === "domain")?.status === "complete",
  );
  const [verificationResult, setVerificationResult] = useState<DomainVerificationResult | null>(null);
  const [apiKeyResult, setApiKeyResult] = useState<MerchantApiKeyResult | null>(null);
  const [verifying, startVerifyTransition] = useTransition();
  const [creatingKey, startKeyTransition] = useTransition();
  const [completing, startCompleteTransition] = useTransition();

  const steps = useMemo<OnboardingStepViewModel[]>(
    () =>
      initial.steps.map((step) => {
        if (step.id === "domain") {
          return { ...step, status: domainVerified ? "complete" : "ready" };
        }
        if (step.id === "api-key") {
          if (apiKeyResult?.id) return { ...step, status: "complete" };
          return { ...step, status: domainVerified ? "ready" : "locked" };
        }
        return step;
      }),
    [apiKeyResult?.id, domainVerified, initial.steps],
  );

  const activeStepIndex = STEP_ORDER.indexOf(activeStepId);

  const canOpenStep = (stepId: OnboardingStepId) => {
    if (stepId === "environment" || stepId === "domain") return true;
    return domainVerified;
  };

  const selectStep = (stepId: OnboardingStepId) => {
    if (canOpenStep(stepId)) {
      setActiveStepId(stepId);
      return;
    }

    toast.warning("Verify the domain first", {
      description: "The API key step unlocks after DNS ownership is confirmed.",
    });
  };

  const goBack = () => {
    const previousStep = STEP_ORDER[Math.max(activeStepIndex - 1, 0)] ?? "environment";
    setActiveStepId(previousStep);
  };

  const goNext = () => {
    if (activeStepId === "environment") {
      setActiveStepId("domain");
      return;
    }

    if (activeStepId === "domain") {
      if (!domainVerified) {
        toast.warning("Verify the domain first", {
          description: "Once DNS is confirmed, you can create the production API key.",
        });
        return;
      }

      setActiveStepId("api-key");
    }
  };

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
            description: "Continue to create the API key.",
          });
          return;
        }

        toast.warning("DNS record not found yet", {
          description: "DNS changes can take a few minutes to propagate.",
        });
      } catch {
        toast.error("Could not verify domain", {
          description: "Please try again in a moment.",
        });
      }
    });
  };

  const createApiKey = () => {
    if (!domainVerified) {
      toast.warning("Verify the domain first", {
        description: "The production key unlocks after DNS ownership is confirmed.",
      });
      return;
    }

    startKeyTransition(async () => {
      try {
        const result = await createMerchantApiKeyAction();
        setApiKeyResult(result);
        toast.success(result.created ? "Production key created" : "Production key already exists", {
          description: "Your workspace is ready for SDK and API traffic.",
        });
      } catch {
        toast.error("Could not create API key", {
          description: "Please try again or contact PrimeStyleAI support.",
        });
      }
    });
  };

  const completeOnboarding = () => {
    if (!apiKeyResult?.id) {
      toast.warning("Create the key first", {
        description: "Once the key is ready, you can enter the dashboard.",
      });
      return;
    }

    startCompleteTransition(async () => {
      try {
        await completeMerchantOnboardingAction();
        toast.success("Workspace ready", {
          description: "Opening your PrimeStyle dashboard.",
        });
        router.push("/customer/dashboard");
        router.refresh();
      } catch {
        toast.error("Could not open dashboard", {
          description: "Please try again in a moment.",
        });
      }
    });
  };

  return {
    activeStepId,
    activeStepIndex,
    domainVerified,
    verifying,
    creatingKey,
    completing,
    verificationResult,
    apiKeyResult,
    steps,
    goBack,
    goNext,
    selectStep,
    copyText,
    verifyDomain,
    createApiKey,
    completeOnboarding,
  };
}
