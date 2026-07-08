"use client";

import { useMemo } from "react";
import { DocsMobileNav } from "../../docs/reference/components/DocsMobileNav";
import { DocsSidebar } from "../../docs/reference/components/DocsSidebar";
import { OnThisPage } from "../../docs/reference/components/OnThisPage";
import { docsNavigation, getAllSectionIds } from "../../docs/reference/data/docs-navigation";
import { useActiveSection } from "../../docs/reference/hooks/useActiveSection";
import { CustomerDashboardSdkDocumentation } from "./CustomerDashboardSdkDocumentation";

export function CustomerDashboardFullDocumentation() {
  const sectionIds = useMemo(() => getAllSectionIds(), []);
  const activeId = useActiveSection(sectionIds);

  return (
    <section
      data-docs-shell
      className="overflow-hidden rounded-customer-card border border-customer-border bg-customer-card shadow-customer-card"
    >
      <div className="lg:hidden">
        <DocsMobileNav navigation={docsNavigation} activeId={activeId} />
      </div>

      <div className="min-h-[70vh] lg:grid lg:grid-cols-[15.625vw_minmax(0,1fr)_13.542vw]">
        <aside className="hidden border-r border-customer-border lg:block">
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
            <h2 className="mb-[0.625vw] text-[2.083vw] font-semibold leading-tight tracking-[-0.04em] text-text-primary max-lg:mb-[2vw] max-lg:text-[8vw]">
              PrimeStyleAI SDK
            </h2>
            <p className="mb-[2.083vw] max-w-[39.583vw] text-customer-base leading-[1.7] text-text-body max-lg:mb-[8vw] max-lg:max-w-none max-lg:text-[3.6vw]">
              SDK-only reference for adding virtual try-on, AI sizing, profile storage,
              styling, callbacks, image handling, loading states, and localization.
            </p>

            <div className="docs-prose">
              <CustomerDashboardSdkDocumentation />
            </div>
          </div>
        </main>

        <aside className="hidden border-l border-customer-border px-[1.25vw] py-[var(--spacing-customer-gap-lg)] xl:block">
          <OnThisPage />
        </aside>
      </div>
    </section>
  );
}
