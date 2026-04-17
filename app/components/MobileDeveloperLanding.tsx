"use client";

import { useState } from "react";
import { MobileDeveloperNavbar } from "./shared/MobileDeveloperNavbar";
import { PilotModalProvider } from "./shared/PilotModalContext";
import { Footer } from "@/app/landing/components/mobile/Footer";
import { NewsletterSection } from "@/app/landing/components/mobile/NewsletterSection";
import { HeroSection } from "./sections/mobile/HeroSection";
import { IntegrationsSection } from "./sections/mobile/IntegrationsSection";
import { ProblemSection } from "./sections/mobile/ProblemSection";
import { FeaturesSection } from "./sections/mobile/FeaturesSection";
import { SdkDemoSection } from "./sections/mobile/SdkDemoSection";
import { ScaleSection } from "./sections/mobile/ScaleSection";
import { GarmentsSection } from "./sections/mobile/GarmentsSection";
import { PricingSection } from "./sections/mobile/PricingSection";
import { CtaBannerSection } from "./sections/mobile/CtaBannerSection";

export function MobileDeveloperLanding() {
  const [email, setEmail] = useState("");

  return (
    <PilotModalProvider>
    <div className="flex flex-col w-full min-h-screen bg-white text-text-primary [overflow-x:clip]">
      <MobileDeveloperNavbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <section id="integrations"><IntegrationsSection /></section>
        <section id="features"><FeaturesSection /></section>
        <section id="demo"><SdkDemoSection /></section>
        <ScaleSection />
        <GarmentsSection />
        <section id="pricing"><PricingSection /></section>
        <CtaBannerSection />
      </main>
      <div className="flex flex-col gap-6 bg-brand-blue-pale px-4 py-10">
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
