"use client";

import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { LandingButton } from "../../shared/LandingButton";
import { Marquee } from "../../shared/Marquee";
import { usePilotModal } from "../../shared/PilotModalContext";
import { useLandingLanguage } from "@/app/landing/i18n";

export function HeroSection() {
  const { open: openPilot } = usePilotModal();
  const { content, translate } = useLandingLanguage();
  const { hero } = content;

  return (
    <section className="relative overflow-hidden px-5 pb-10 pt-20">
      <HeroBackground />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <Reveal variant="fade">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
        </Reveal>

        <Reveal delay={1}>
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-text-primary">
            {hero.headline}{" "}
            <em className="not-italic bg-gradient-to-br from-brand-blue to-accent-purple bg-clip-text font-serif italic text-transparent">
              {hero.headlineEm}
            </em>
            <br />
            {translate("for fit.")}
          </h1>
        </Reveal>

        <Reveal delay={2} className="h-px w-12 bg-gradient-to-r from-transparent via-brand-blue to-transparent" />

        <Reveal delay={2}>
          <p className="text-base leading-[1.5] text-text-body">{hero.subhead}</p>
        </Reveal>

        <Reveal delay={3} className="flex w-full flex-col gap-3 pt-2">
          <LandingButton onClick={openPilot} variant="primary" size="lg" icon="arrow-right" className="w-full">
            {hero.primaryLabel}
          </LandingButton>
          <LandingButton href={hero.secondaryHref} variant="outline" size="lg" className="w-full">
            {hero.secondaryLabel}
          </LandingButton>
        </Reveal>
      </div>

      <div className="relative z-10 mt-10 -mx-5">
        <Marquee items={hero.marquee} />
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(33,84,239,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(33,84,239,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 35%, transparent 80%)",
        }}
      />
      <div className="ps-glow absolute -top-16 left-1/3 h-[260px] w-[260px] rounded-full bg-brand-blue/25 blur-[80px]" />
      <div className="ps-glow absolute top-40 right-1/4 h-[240px] w-[240px] rounded-full bg-accent-purple/20 blur-[80px]" style={{ animationDelay: "-3s" }} />
    </div>
  );
}
