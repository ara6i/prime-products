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
    <section className="relative isolate overflow-hidden border-b border-brand-blue/10 bg-white px-4 pb-5 pt-4">
      <HeroBackground />

      <div className="relative z-10">
        <Reveal delay={1}>
          <h1 className="mt-4 max-w-[92vw] font-poppins text-[clamp(2.9rem,11.5vw,4.85rem)] font-medium leading-[0.98] tracking-[-0.048em] text-text-primary">
            <span className="block">{hero.headline}</span>
            <span className="block text-brand-blue">{hero.headlineEm}</span>
            <span className="block">{fitLine}</span>
          </h1>
        </Reveal>

        <Reveal delay={2}>
          <p className="mt-4 max-w-[21rem] text-[14.5px] leading-[1.45] text-text-body">{hero.subhead}</p>
        </Reveal>

        <Reveal delay={3} className="mt-4 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
          <LandingButton onClick={openPilot} variant="primary" size="lg" icon="arrow-right" className="w-full">
            {hero.primaryLabel}
          </LandingButton>
          <LandingButton href={hero.secondaryHref} variant="outline" size="lg" className="w-full">
            {hero.secondaryLabel}
          </LandingButton>
        </Reveal>

        <Reveal delay={4} className="mt-4">
          <HeroVideoEditor variant="mobile" />
        </Reveal>
      </div>

      <div className="relative z-10 mt-3 -mx-4">
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
