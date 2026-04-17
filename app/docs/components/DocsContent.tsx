"use client";

import { useMemo } from "react";
import { DeveloperNavbar } from "@/app/components/shared/DeveloperNavbar";
import { MobileDeveloperNavbar } from "@/app/components/shared/MobileDeveloperNavbar";
import { PilotModalProvider } from "@/app/components/shared/PilotModalContext";
import { Footer } from "@/app/landing/components/desktop/Footer";
import { DocsSidebar } from "./DocsSidebar";
import { DocsMobileNav } from "./DocsMobileNav";
import { OnThisPage } from "./OnThisPage";
import { useActiveSection } from "../hooks/useActiveSection";
import { docsNavigation, getAllSectionIds } from "../data/docs-navigation";
import {
  IntroductionSection,
  QuickStartSection,
  AuthenticationSection,
  ApiReferenceSection,
  SdkSection,
  GuidesSection,
  PricingSection,
  SupportSection,
  LegalSection,
  DpaSection,
} from "../data/docs-sections";

interface DocsContentProps {
  isLoggedIn?: boolean;
}

export function DocsContent({ isLoggedIn: _isLoggedIn }: DocsContentProps) {
  const sectionIds = useMemo(() => getAllSectionIds(), []);
  const activeId = useActiveSection(sectionIds);

  return (
    <PilotModalProvider>
      <div className="flex min-h-screen flex-col bg-white text-gray-900 [overflow-x:clip]">
        {/* Brand header (same as landing) */}
        <div className="hidden lg:block">
          <DeveloperNavbar />
        </div>
        <div className="lg:hidden">
          <MobileDeveloperNavbar />
        </div>

        {/* Mobile docs sub-nav (section dropdown) */}
        <DocsMobileNav navigation={docsNavigation} activeId={activeId} />

        {/* Desktop 3-column / Mobile single column */}
        <div className="flex-1 mx-auto w-full max-w-[1440px] lg:grid lg:grid-cols-[260px_minmax(0,1fr)_220px]">
          {/* Left sidebar — sticky on desktop */}
          <aside className="hidden lg:block sticky top-0 self-start h-screen overflow-y-auto border-r border-gray-200">
            <DocsSidebar navigation={docsNavigation} activeId={activeId} />
          </aside>

          {/* Main content */}
          <main
            data-docs-content
            className="min-w-0 px-5 py-8 sm:px-6 lg:px-10 lg:py-12"
          >
            <div className="max-w-[720px] mx-auto">
              <p className="text-[11px] font-semibold tracking-wider text-[#2154EF] uppercase mb-2">
                Developer Documentation
              </p>
              <h1 className="text-[28px] sm:text-[32px] lg:text-[36px] font-bold text-gray-900 tracking-tight leading-tight mb-3">
                PrimeStyle VTO API
              </h1>
              <p className="text-[15px] sm:text-[16px] leading-[1.7] text-gray-600 mb-10">
                Add AI-powered virtual try-on to any e-commerce experience. One API call turns a
                product photo into a try-on result.
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

          {/* Right "On this page" — sticky on xl+ */}
          <aside className="hidden xl:block sticky top-0 self-start h-screen overflow-y-auto pr-8 py-12">
            <OnThisPage />
          </aside>
        </div>

        {/* Shared footer */}
        <div className="flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-4 py-8 lg:px-[7.292vw] lg:py-[2.5vw]">
          <Footer />
        </div>
      </div>
    </PilotModalProvider>
  );
}
