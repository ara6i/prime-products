"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/layout/Header";
import { Footer } from "@/app/components/layout/Footer";
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
  isLoggedIn: boolean;
}

export function DocsContent({ isLoggedIn }: DocsContentProps) {
  const router = useRouter();
  const sectionIds = useMemo(() => getAllSectionIds(), []);
  const activeId = useActiveSection(sectionIds);

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
      {/* Fixed header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white z-20">
        <Header
          isLoggedIn={isLoggedIn}
          currentPath="/docs"
          onSignupClick={() => router.push("/signup")}
          onDashboardClick={() => router.push("/dashboard")}
        />
      </div>

      {/* Mobile top nav (still visible under header on small screens) */}
      <div className="lg:hidden flex-shrink-0">
        <DocsMobileNav navigation={docsNavigation} activeId={activeId} />
      </div>

      {/* 3-column shell — only this area scrolls, each column independently */}
      <div className="flex-1 min-h-0 mx-auto w-full max-w-[1440px] lg:grid lg:grid-cols-[260px_minmax(0,1fr)_220px]">
        {/* Left sidebar — independently scrollable */}
        <aside className="hidden lg:block overflow-y-auto border-r border-gray-200">
          <DocsSidebar navigation={docsNavigation} activeId={activeId} />
        </aside>

        {/* Main content — independently scrollable */}
        <main
          data-docs-content
          className="min-w-0 overflow-y-auto px-6 py-8 lg:px-10 lg:py-12"
        >
          <div className="max-w-[720px] mx-auto">
            {/* Page eyebrow + title */}
            <p className="text-[11px] font-semibold tracking-wider text-[#2154EF] uppercase mb-2">
              Developer Documentation
            </p>
            <h1 className="text-[36px] font-bold text-gray-900 tracking-tight leading-tight mb-3">
              PrimeStyle VTO API
            </h1>
            <p className="text-[16px] leading-[1.7] text-gray-600 mb-10">
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

            <Footer />
          </div>
        </main>

        {/* Right "On this page" — independently scrollable */}
        <aside className="hidden xl:block overflow-y-auto pr-8 py-12">
          <OnThisPage />
        </aside>
      </div>
    </div>
  );
}
