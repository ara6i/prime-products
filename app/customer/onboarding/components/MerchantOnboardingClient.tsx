"use client";

import { BusinessProfilePanel } from "./BusinessProfilePanel";
import { DnsVerificationPanel } from "./DnsVerificationPanel";
import { OnboardingStepRail } from "./OnboardingStepRail";
import { ReviewPanel } from "./ReviewPanel";
import { WelcomePanel } from "./WelcomePanel";
import { useMerchantOnboarding } from "../hooks/useMerchantOnboarding";
import type { MerchantOnboardingViewModel } from "../types";

interface MerchantOnboardingClientProps {
  onboarding: MerchantOnboardingViewModel;
}

export function MerchantOnboardingClient({ onboarding }: MerchantOnboardingClientProps) {
  const {
    activeStepId,
    onboarding: currentOnboarding,
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
  } = useMerchantOnboarding(onboarding);

  const activePanel = {
    welcome: (
      <WelcomePanel onContinue={goNext} />
    ),
    business: (
      <BusinessProfilePanel
        profile={currentOnboarding.profile}
        onSaved={updateOnboarding}
      />
    ),
    domain: (
      <DnsVerificationPanel
        record={currentOnboarding.dnsRecord}
        domain={currentOnboarding.domain}
        verified={domainVerified}
        verifying={verifying}
        result={verificationResult}
        onCopy={copyText}
        onVerify={verifyDomain}
        onBack={goBack}
        onContinue={goNext}
      />
    ),
    review: (
      <ReviewPanel
        review={currentOnboarding.review}
        completing={completing}
        onBack={goBack}
        onSubmit={submitReview}
      />
    ),
  }[activeStepId];

  return (
    <main className="h-dvh overflow-hidden bg-white text-text-primary">
      <div className="grid h-full lg:grid-cols-[360px_1fr]">
        <aside className="hidden min-h-0 border-r border-[#e6edf7] bg-[#f7faff] px-8 py-8 lg:flex lg:flex-col">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
              PrimeStyleAI
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#111827]">
              SDK onboarding
            </h1>
            <p className="mt-3 max-w-[260px] text-sm leading-6 text-[#5f6b7a]">
              Set up the merchant workspace, verify the domain, and submit for review.
            </p>
          </div>

          <div className="mt-10 min-h-0 flex-1">
            <OnboardingStepRail
              steps={steps}
              activeStepId={activeStepId}
              onStepSelect={selectStep}
            />
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="shrink-0 border-b border-[#edf2f7] bg-white px-5 py-4 sm:px-8">
            <div className="mx-auto flex max-w-[920px] items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
                  Merchant setup
                </p>
                <p className="mt-1 truncate text-sm text-[#667085]">
                  {currentOnboarding.storeName} · {currentOnboarding.domain}
                </p>
              </div>
              <span className="rounded-full border border-[#dbe6f5] bg-[#f8fbff] px-3 py-1.5 text-xs font-semibold text-brand-blue">
                SDK
              </span>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-9">
            <div className={`mx-auto w-full ${activeStepId === "domain" ? "max-w-[1040px]" : "max-w-[820px]"}`}>
              <div className="mb-6 rounded-2xl border border-[#e6edf7] bg-[#f8fbff] p-4 lg:hidden">
                <OnboardingStepRail
                  steps={steps}
                  activeStepId={activeStepId}
                  onStepSelect={selectStep}
                  compact
                />
              </div>
              <div className="rounded-2xl border border-[#e6edf7] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10">
                {activePanel}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
