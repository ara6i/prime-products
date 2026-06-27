"use client";

import { useState } from "react";
import { DeveloperNavbar } from "./shared/DeveloperNavbar";
import { PilotModalProvider } from "./shared/PilotModalContext";
import { Footer } from "@/app/landing/components/desktop/Footer";
import { NewsletterSection } from "@/app/landing/components/desktop/NewsletterSection";
import { HeroSection } from "./sections/desktop/HeroSection";
import { IntegrationsSection } from "./sections/desktop/IntegrationsSection";
import { ProblemSection } from "./sections/desktop/ProblemSection";
import { FeaturesSection } from "./sections/desktop/FeaturesSection";
import { SdkDemoSection } from "./sections/desktop/SdkDemoSection";
import { ScaleSection } from "./sections/desktop/ScaleSection";
import { GarmentsSection } from "./sections/desktop/GarmentsSection";
import { PricingSection } from "./sections/desktop/PricingSection";
import { CtaBannerSection } from "./sections/desktop/CtaBannerSection";
import { AskAiSection } from "./sections/shared/AskAiSection";
import { PilotContactSection } from "./sections/shared/PilotContactSection";

export function DeveloperLanding() {
  const [email, setEmail] = useState("");

  return (
    <PilotModalProvider>
    <div className="flex flex-col w-full min-h-screen bg-white text-text-primary [overflow-x:clip]">
      <DeveloperNavbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <section id="integrations"><IntegrationsSection /></section>
        <section id="features"><FeaturesSection /></section>
        <section id="demo"><SdkDemoSection /></section>
        <ScaleSection />
        <GarmentsSection />
        <PricingSection />
        <PilotContactSection />
        <CtaBannerSection />
        <AskAiSection />
      </main>
      <div data-testid="footer-area" className="flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw]">
        <NewsletterSection
          email={email}
          onEmailChange={(e) => setEmail(e.target.value)}
          onSubscribe={() => setEmail("")}
        />
        <Footer />
      </div>
    </div>
    </PilotModalProvider>
  );
}
