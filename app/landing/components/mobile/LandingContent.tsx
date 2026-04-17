"use client";

import { useLanding } from "@/app/landing/hooks/useLanding";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { StatsSection } from "./StatsSection";
import { BrandsSection } from "./BrandsSection";
import { FeaturesSection } from "./FeaturesSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { ProblemsSection } from "./ProblemsSection";
import { PricingSection } from "./PricingSection";
import { FAQSection } from "./FAQSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { CTASection } from "./CTASection";
import { NewsletterSection } from "./NewsletterSection";
import { Footer } from "./Footer";

export function LandingContent() {
  const {
    stats,
    steps,
    problems,
    solutions,
    pricingPacks,
    faqItems,
    testimonials,
    footerLinks,
    brandLogos,
    mediaLogos,
    expandedFAQ,
    email,
    handleFAQToggle,
    handleEmailChange,
    handleSubscribe,
  } = useLanding();

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      {/* Hero gradient background */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-[900px] rounded-b-[32px] bg-gradient-to-b from-white to-brand-blue-pale" />
        <div className="relative z-10">
          <Navbar />
          <HeroSection />
        </div>
      </div>

      <StatsSection stats={stats} />

      <div className="mx-4 border-t-[0.5px] border-input-border" />

      <BrandsSection brandLogos={brandLogos} mediaLogos={mediaLogos} />

      <div className="mx-4 border-t-[0.5px] border-input-border" />

      <FeaturesSection />
      <HowItWorksSection steps={steps} />

      <div className="mx-4 border-t-[0.5px] border-input-border" />

      <ProblemsSection problems={problems} solutions={solutions} />

      <div className="mx-4 border-t-[0.5px] border-input-border" />

      <PricingSection pricingPacks={pricingPacks} />

      <FAQSection
        faqItems={faqItems}
        expandedFAQ={expandedFAQ}
        onFAQToggle={handleFAQToggle}
      />

      <TestimonialsSection testimonials={testimonials} />

      <div className="flex flex-col gap-6 bg-brand-blue-pale px-4 py-10">
        <CTASection />
        <NewsletterSection
          email={email}
          onEmailChange={handleEmailChange}
          onSubscribe={handleSubscribe}
        />
        <Footer />
      </div>
    </div>
  );
}
