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
    <div className="flex flex-col w-full min-h-screen bg-white">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-[55.208vw] bg-gradient-to-b from-white to-brand-blue-pale rounded-b-[2.5vw]" />
        <div className="relative z-10">
          <Navbar />
          <HeroSection />
        </div>
      </div>

      <StatsSection stats={stats} />

      <div className="border-t-[0.5px] border-input-border mx-[7.292vw]" />

      <BrandsSection brandLogos={brandLogos} mediaLogos={mediaLogos} />

      <div className="border-t-[0.5px] border-input-border mx-[7.292vw]" />

      <FeaturesSection />
      <HowItWorksSection steps={steps} />

      <div className="border-t-[0.5px] border-input-border mx-[7.292vw]" />

      <ProblemsSection problems={problems} solutions={solutions} />

      <div className="border-t-[0.5px] border-input-border mx-[7.292vw]" />

      <PricingSection pricingPacks={pricingPacks} />

      <FAQSection
        faqItems={faqItems}
        expandedFAQ={expandedFAQ}
        onFAQToggle={handleFAQToggle}
      />

      <TestimonialsSection testimonials={testimonials} />

      <div data-testid="footer-area" className="flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw]">
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
