"use client";

import { Reveal } from "../../shared/Reveal";
import { LandingButton } from "../../shared/LandingButton";
import { usePilotModal } from "../../shared/PilotModalContext";
import { CTA } from "../../../content/landing";

export function CtaBannerSection() {
  const { open: openPilot } = usePilotModal();
  return (
    <section className="px-5 py-14">
      <Reveal
        variant="scale"
        className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[24px] px-6 py-12 text-center text-white shadow-[0_16px_48px_rgba(25,62,220,0.3)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(135deg, #193EDC 0%, #2154EF 40%, #4A3AE8 100%)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 mix-blend-overlay opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1), transparent 40%)",
          }}
        />

        <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">{CTA.title}</h2>
        <p className="text-[15px] leading-[1.5] text-white/80">{CTA.body}</p>

        <div className="flex w-full flex-col items-center gap-3 pt-1">
          <LandingButton onClick={openPilot} variant="white" size="lg" icon="arrow-right" className="w-full">
            {CTA.primaryLabel}
          </LandingButton>
          <LandingButton href={CTA.secondaryHref} variant="onGradient" size="lg" className="w-full">
            {CTA.secondaryLabel}
          </LandingButton>
        </div>

        <p className="pt-1 text-[11px] leading-[1.4] text-white/55">{CTA.footer}</p>
      </Reveal>
    </section>
  );
}
