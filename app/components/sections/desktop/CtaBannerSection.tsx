"use client";

import { Reveal } from "../../shared/Reveal";
import { LandingButton } from "../../shared/LandingButton";
import { usePilotModal } from "../../shared/PilotModalContext";
import { CTA } from "../../../content/landing";

export function CtaBannerSection() {
  const { open: openPilot } = usePilotModal();
  return (
    <section className="px-8 py-[clamp(5rem,7vw,7rem)]">
      <Reveal
        variant="scale"
        className="relative mx-auto flex w-[75vw] flex-col items-center gap-6 overflow-hidden rounded-[32px] px-8 py-[clamp(3.5rem,5vw,5rem)] text-center text-white shadow-[0_32px_80px_rgba(25,62,220,0.35)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: "linear-gradient(135deg, #193EDC 0%, #2154EF 40%, #4A3AE8 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 mix-blend-overlay opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1), transparent 40%)",
          }}
        />

        <h2 className="max-w-[24ch] text-[clamp(2rem,1.6rem+2vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
          {CTA.title}
        </h2>
        <p className="max-w-[48ch] text-lg leading-[1.55] text-white/80">{CTA.body}</p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <LandingButton onClick={openPilot} variant="white" icon="arrow-right">
            {CTA.primaryLabel}
          </LandingButton>
          <LandingButton href={CTA.secondaryHref} variant="onGradient">
            {CTA.secondaryLabel}
          </LandingButton>
        </div>

        <p className="pt-2 text-xs text-white/55">{CTA.footer}</p>
      </Reveal>
    </section>
  );
}
