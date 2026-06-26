"use client";

import { useMemo } from "react";
import { DocsMobileNav } from "../../docs/reference/components/DocsMobileNav";
import { DocsSidebar } from "../../docs/reference/components/DocsSidebar";
import { OnThisPage } from "../../docs/reference/components/OnThisPage";
import { docsNavigation, getAllSectionIds } from "../../docs/reference/data/docs-navigation";
import {
  ApiReferenceSection,
  AuthenticationSection,
  DpaSection,
  GuidesSection,
  IntroductionSection,
  LegalSection,
  PricingSection,
  QuickStartSection,
  SdkSection,
  SupportSection,
} from "../../docs/reference/data/docs-sections";
import { useActiveSection } from "../../docs/reference/hooks/useActiveSection";

export function CustomerDashboardFullDocumentation() {
  const sectionIds = useMemo(() => getAllSectionIds(), []);
  const activeId = useActiveSection(sectionIds);

  return (
    <section className="overflow-hidden rounded-customer-card border border-customer-border bg-white shadow-customer-card">
      <div className="lg:hidden">
        <DocsMobileNav navigation={docsNavigation} activeId={activeId} />
      </div>

      <div className="min-h-[70vh] lg:grid lg:grid-cols-[15.625vw_minmax(0,1fr)_13.542vw]">
        <aside className="hidden lg:block border-r border-gray-200">
          <DocsSidebar navigation={docsNavigation} activeId={activeId} />
        </aside>

        <main
          data-docs-content
          className="min-w-0 px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-lg)] max-lg:px-[4vw] max-lg:py-[5vw]"
        >
          <div className="mx-auto max-w-[46.875vw] max-lg:max-w-none">
            <p className="mb-[0.417vw] text-customer-xs font-semibold uppercase tracking-[0.14em] text-brand-blue max-lg:mb-[2vw] max-lg:text-[2.8vw]">
              Developer Documentation
            </p>
            <h2 className="mb-[0.625vw] text-[2.083vw] font-semibold leading-tight tracking-[-0.04em] text-gray-950 max-lg:mb-[2vw] max-lg:text-[8vw]">
              PrimeStyleAI API, SDK, and Shopify
            </h2>
            <p className="mb-[2.083vw] max-w-[39.583vw] text-customer-base leading-[1.7] text-gray-600 max-lg:mb-[8vw] max-lg:max-w-none max-lg:text-[3.6vw]">
              Full integration reference for virtual try-on, AI sizing, React SDK usage,
              REST API endpoints, Shopify installation, legal terms, and data processing.
            </p>

            <div className="docs-prose">
              <IntroductionSection />
              <QuickStartSection />
              <AuthenticationSection />
              <ApiReferenceSection />
              <SdkSection />
              <GuidesSection />
              <PricingSection />
              <SupportSection />
              <LegalSection />
              <DpaSection />
            </div>
          </div>
        </main>

        <aside className="hidden xl:block border-l border-gray-200 px-[1.25vw] py-[var(--spacing-customer-gap-lg)]">
          <OnThisPage />
        </aside>
      </div>
    </section>
  );
}
