"use client";

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
    <section className="relative isolate overflow-hidden border-b border-brand-blue/10 bg-white px-1 pb-5 pt-4">
      <HeroBackground />

      <div className="relative z-10">
        <Reveal delay={1}>
          <>
            <h1 className="sr-only">{`${hero.headline} ${hero.headlineEm} ${fitLine}`}</h1>
            <div
              aria-hidden="true"
              className="ps-hero-mobile-title mt-4 px-1 font-poppins text-[clamp(2rem,9.7vw,3rem)] font-medium leading-[0.98] tracking-[-0.055em] text-text-primary lg:hidden"
            >
              <span className="block whitespace-nowrap">
                <span>{hero.headline}</span>{" "}
                <span className="text-brand-blue">{hero.headlineEm}</span>
              </span>
              <span className="block text-center">{fitLine}</span>
            </div>
            <p className="mt-3 px-5 text-center font-poppins text-[14px] font-medium leading-[1.35] tracking-[-0.01em] text-text-muted lg:hidden">
              Stop returns. Start confidence.
            </p>
          </>
        </Reveal>

        <Reveal delay={3} className="mt-4 px-3">
          <HeroVideoEditor variant="mobile" />
        </Reveal>

        <Reveal delay={4} className="ps-hero-cta-row mt-3 flex gap-2">
          <LandingButton onClick={openPilot} variant="primary" size="md" icon="arrow-right" className="h-10 min-w-0 flex-1 basis-0 gap-1.5 overflow-hidden px-2.5 text-[12.5px]">
            Apply pilot
          </LandingButton>
          <LandingButton href={hero.secondaryHref} variant="outline" size="md" className="h-10 min-w-0 flex-1 basis-0 overflow-hidden px-2.5 text-[12.5px]">
            See action
          </LandingButton>
        </Reveal>
      </div>

      <div className="relative z-10 mt-3 -mx-1">
        <Marquee items={hero.marquee} speed="slow" />
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(33,84,239,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(33,84,239,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(180deg, black 0%, transparent 80%)",
        }}
      />
      <div className="absolute -left-24 top-14 h-64 w-64 rounded-full bg-brand-blue/12 blur-[80px]" />
      <div className="absolute right-[-70px] top-28 h-64 w-64 rounded-full bg-brand-blue-light/45 blur-[90px]" />
    </div>
  );
}
