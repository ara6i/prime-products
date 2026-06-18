"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { LandingButton } from "../../shared/LandingButton";
import { Marquee } from "../../shared/Marquee";
import { usePilotModal } from "../../shared/PilotModalContext";
import { HeroVideoEditor } from "../shared/HeroVideoEditor";
import { useLandingLanguage } from "@/app/landing/i18n";

export function HeroSection() {
  const { open: openPilot } = usePilotModal();
  const { content, translate } = useLandingLanguage();
  const { hero } = content;
  const fitLine = translate("for fit.").replace(/\.$/, "");

  return (
    <section className="relative isolate overflow-hidden border-b border-brand-blue/10 bg-white px-4 pb-5 pt-4 lg:px-[3.125vw] lg:pb-[2.4vw] lg:pt-[2.2vw]">
      <HeroBackground />

      <div className="relative z-10 grid grid-cols-1 gap-4 pt-3 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-[4.25vw] lg:pt-[2.3vw]">
        <div className="min-w-0">
          <Reveal variant="fade" className="hidden items-center gap-[0.625vw] lg:flex">
            <span className="h-px w-[3.2vw] bg-brand-blue" />
            <HeroTechStack />
          </Reveal>

          <Reveal delay={1}>
            <h1 className="ps-hero-title mt-4 w-full max-w-none font-poppins text-[clamp(1.72rem,8.55vw,4.85rem)] font-medium leading-[0.98] tracking-[-0.058em] text-text-primary lg:mt-[1.45vw] lg:max-w-[41vw] lg:text-[clamp(3.35rem,4.8vw,6.15rem)] lg:leading-[1.02] lg:tracking-[-0.052em]">
              <span className="block">{hero.headline}</span>
              <span className="ps-hero-title-em block whitespace-nowrap text-brand-blue">{hero.headlineEm}</span>
              <span className="block">{fitLine}</span>
            </h1>
          </Reveal>

          <Reveal delay={2}>
            <p className="mt-4 max-w-[21rem] text-[14.5px] leading-[1.45] text-text-body lg:mt-[1.35vw] lg:max-w-[38vw] lg:text-[clamp(1.05rem,1vw,1.25rem)] lg:leading-[1.55]">
              {hero.subhead}
            </p>
          </Reveal>

          <Reveal delay={3} className="mt-4 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 lg:mt-[1.5vw] lg:flex lg:flex-wrap lg:items-center lg:gap-[0.75vw]">
            <LandingButton onClick={openPilot} variant="primary" size="lg" icon="arrow-right" className="w-full lg:w-auto">
              {hero.primaryLabel}
            </LandingButton>
            <LandingButton href={hero.secondaryHref} variant="outline" size="lg" className="w-full lg:w-auto">
              {hero.secondaryLabel}
            </LandingButton>
          </Reveal>

        </div>

        <Reveal delay={2} className="min-w-0 lg:-translate-y-[1.25vw]">
          <HeroVideoEditor />
        </Reveal>
      </div>

      <div className="relative z-10 -mx-4 mt-3 lg:mx-0 lg:mt-[0.9vw]">
        <Marquee items={hero.marquee} speed="slow" />
      </div>
    </section>
  );
}

function HeroTechStack() {
  return (
    <div className="grid grid-cols-3 gap-[0.6vw]">
      <a href="#integrations" aria-label="Learn more about the PrimeStyleAI SDK" className="group flex min-w-[8.2vw] flex-col gap-[0.34vw] rounded-[0.95vw] border border-brand-blue/15 bg-white px-[0.85vw] py-[0.68vw] text-brand-blue shadow-[0_14px_32px_rgba(33,84,239,0.09)] transition-all duration-200 hover:-translate-y-px hover:border-brand-blue/35 hover:bg-brand-blue-pale/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30">
        <span className="flex items-center gap-[0.38vw] text-[0.72vw] font-semibold uppercase tracking-[0.12em]">
          <ReactLogoIcon className="h-[1.08vw] w-[1.08vw]" />
          SDK
        </span>
        <span className="text-[0.58vw] font-medium leading-[1.2] tracking-normal text-text-body transition-colors group-hover:text-brand-blue">
          React components
        </span>
      </a>
      <a href="#integrations" aria-label="Learn more about the PrimeStyleAI Shopify app" className="group flex min-w-[8.2vw] flex-col gap-[0.34vw] rounded-[0.95vw] border border-brand-blue/15 bg-white px-[0.85vw] py-[0.68vw] text-brand-blue shadow-[0_14px_32px_rgba(33,84,239,0.09)] transition-all duration-200 hover:-translate-y-px hover:border-brand-blue/35 hover:bg-brand-blue-pale/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30">
        <span className="flex items-center gap-[0.38vw] text-[0.72vw] font-semibold uppercase tracking-[0.12em]">
          <Image src="/images/landing/ps/shopify-glyph.svg" alt="" width={22} height={22} className="h-[1.08vw] w-[1.08vw]" />
          Shopify
        </span>
        <span className="text-[0.58vw] font-medium leading-[1.2] tracking-normal text-text-body transition-colors group-hover:text-brand-blue">
          Store install
        </span>
      </a>
      <a href="#integrations" aria-label="Learn more about the PrimeStyleAI API" className="group flex min-w-[8.2vw] flex-col gap-[0.34vw] rounded-[0.95vw] border border-brand-blue/15 bg-white px-[0.85vw] py-[0.68vw] text-brand-blue shadow-[0_14px_32px_rgba(33,84,239,0.09)] transition-all duration-200 hover:-translate-y-px hover:border-brand-blue/35 hover:bg-brand-blue-pale/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30">
        <span className="flex items-center gap-[0.38vw] text-[0.72vw] font-semibold uppercase tracking-[0.12em]">
          <ApiIcon className="h-[1.08vw] w-[1.08vw]" />
          API
        </span>
        <span className="text-[0.58vw] font-medium leading-[1.2] tracking-normal text-text-body transition-colors group-hover:text-brand-blue">
          REST access
        </span>
      </a>
    </div>
  );
}

function ReactLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-11.5 -10.23174 23 20.46348" className={className} aria-hidden>
      <circle cx="0" cy="0" r="2.05" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function ApiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </svg>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-[0.42]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(33,84,239,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(33,84,239,0.08) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(180deg, black 0%, transparent 78%)",
        }}
      />
      <div className="absolute -left-[10vw] top-[7vw] h-[26vw] w-[26vw] rounded-full bg-brand-blue/10 blur-[110px]" />
      <div className="absolute right-[8vw] top-[2vw] h-[22vw] w-[22vw] rounded-full bg-brand-blue-light/35 blur-[120px]" />
      <div className="absolute bottom-[4vw] left-[40vw] h-[18vw] w-[18vw] rounded-full bg-brand-blue-pale/60 blur-[90px]" />
    </div>
  );
}
