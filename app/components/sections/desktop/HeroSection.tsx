"use client";

import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { LandingButton } from "../../shared/LandingButton";
import { Marquee } from "../../shared/Marquee";
import { usePilotModal } from "../../shared/PilotModalContext";
import { HERO } from "../../../content/landing";

export function HeroSection() {
  const { open: openPilot } = usePilotModal();
  return (
    <section className="relative overflow-hidden px-8 pb-12 pt-24">
      <HeroBackground />

      <div className="relative z-10 mx-auto flex w-[62.5vw] flex-col items-center gap-6 text-center">
        <Reveal variant="fade">
          <Eyebrow>{HERO.eyebrow}</Eyebrow>
        </Reveal>

        <Reveal delay={1}>
          <h1 className="text-[clamp(3rem,2.4rem+3.2vw,5.25rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-text-primary">
            {HERO.headline}{" "}
            <em className="not-italic bg-gradient-to-br from-brand-blue via-brand-blue to-accent-purple bg-clip-text font-serif text-transparent italic">
              {HERO.headlineEm}
            </em>
            <br />
            for fit.
          </h1>
        </Reveal>

        <Reveal delay={2} className="h-px w-16 bg-gradient-to-r from-transparent via-brand-blue to-transparent">
          <span className="sr-only">divider</span>
        </Reveal>

        <Reveal delay={2}>
          <p className="whitespace-nowrap text-lg leading-[1.6] text-text-body">{HERO.subhead}</p>
        </Reveal>

        <Reveal delay={3} className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <LandingButton onClick={openPilot} variant="primary" icon="arrow-right">
            {HERO.primaryLabel}
          </LandingButton>
          <LandingButton href={HERO.secondaryHref} variant="outline">
            {HERO.secondaryLabel}
          </LandingButton>
        </Reveal>
      </div>

      <div className="relative z-10 mt-16">
        <Marquee items={HERO.marquee} />
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(33,84,239,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(33,84,239,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 35%, transparent 75%)",
        }}
      />
      <div className="ps-glow absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-brand-blue/25 blur-[120px]" />
      <div className="ps-glow absolute top-40 right-1/5 h-[360px] w-[360px] rounded-full bg-accent-purple/20 blur-[120px]" style={{ animationDelay: "-3s" }} />
      <div className="ps-glow absolute bottom-0 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-brand-blue-light/35 blur-[120px]" style={{ animationDelay: "-5s" }} />
    </div>
  );
}
