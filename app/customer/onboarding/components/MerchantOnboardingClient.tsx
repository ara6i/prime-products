"use client";

import { ApiKeyPanel } from "./ApiKeyPanel";
import { DnsVerificationPanel } from "./DnsVerificationPanel";
import { EnvironmentReadyPanel } from "./EnvironmentReadyPanel";
import { OnboardingHero } from "./OnboardingHero";
import { OnboardingStepRail } from "./OnboardingStepRail";
import { useMerchantOnboarding } from "../hooks/useMerchantOnboarding";
import type { MerchantOnboardingViewModel } from "../types";

interface MerchantOnboardingClientProps {
  onboarding: MerchantOnboardingViewModel;
}

export function MerchantOnboardingClient({ onboarding }: MerchantOnboardingClientProps) {
  const {
    activeStepId,
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
  } = useMerchantOnboarding(onboarding);

  const activePanel = {
    environment: (
      <EnvironmentReadyPanel
        storeName={onboarding.storeName}
        domain={onboarding.domain}
        ownerEmail={onboarding.ownerEmail}
        invitationCode={onboarding.invitationCode}
        onContinue={goNext}
      />
    ),
    domain: (
      <DnsVerificationPanel
        record={onboarding.dnsRecord}
        verified={domainVerified}
        verifying={verifying}
        result={verificationResult}
        onCopy={copyText}
        onVerify={verifyDomain}
        onBack={goBack}
        onContinue={goNext}
      />
    ),
    "api-key": (
      <ApiKeyPanel
        domainVerified={domainVerified}
        creatingKey={creatingKey}
        completing={completing}
        apiKeyResult={apiKeyResult}
        onCopy={copyText}
        onCreateKey={createApiKey}
        onContinue={completeOnboarding}
        onBack={goBack}
      />
    ),
  }[activeStepId];

  return (
    <main className="h-dvh overflow-hidden bg-[#f4f8ff] px-5 py-5 text-text-primary">
      <div className="mx-auto flex h-full w-full max-w-[1260px] flex-col gap-5">
        <OnboardingHero
          storeName={onboarding.storeName}
          domain={onboarding.domain}
        />

        <section className="grid min-h-0 flex-1 overflow-hidden rounded-[34px] border border-brand-blue/10 bg-white lg:grid-cols-[310px_1fr]">
          <aside className="hidden border-r border-brand-blue/10 bg-[#f8fbff] px-8 py-9 lg:block">
            <OnboardingStepRail
              steps={steps}
              activeStepId={activeStepId}
              onStepSelect={selectStep}
            />
          </aside>

          <div className="flex min-h-0 items-center px-6 py-7 sm:px-8 lg:px-12 lg:py-10">
            <div className="mx-auto w-full max-w-[760px]">
              <div className="mb-6 lg:hidden">
                <OnboardingStepRail
                  steps={steps}
                  activeStepId={activeStepId}
                  onStepSelect={selectStep}
                />
              </div>
              {activePanel}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
