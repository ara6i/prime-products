"use client";

import { useEffect, useRef } from "react";
import { CheckCheck } from "lucide-react";
import { Reveal } from "../../shared/Reveal";
import { WordReveal } from "../../shared/WordReveal";
import { LandingButton } from "../../shared/LandingButton";
import { usePilotModal } from "../../shared/PilotModalContext";
import { cn } from "@/app/shared/lib/utils";
import { PRICING } from "../../../content/landing";
import type { PricingTier } from "../../../types/landing";

const INCLUDES_HEADER: Record<PricingTier["id"], string> = {
  pilot: "Pilot includes:",
  starter: "Starter includes:",
  growth: "Everything in Starter, plus:",
  pro: "Everything in Growth, plus:",
  scale: "Everything in Pro, plus:",
};

export function PricingSection() {
  const { open: openPilot } = usePilotModal();

  return (
    <section id="pricing" className="relative overflow-hidden px-8 pb-[clamp(5rem,7vw,7rem)] pt-[clamp(4rem,6vw,6rem)]">
      <div className="mx-auto w-[88.889vw]">
        <article className="mb-8 flex flex-col items-start gap-4 text-left">
          <h2 className="text-[clamp(2rem,1.6rem+1.8vw,3rem)] font-medium leading-[1.15] tracking-[-0.02em] text-text-primary">
            <WordReveal text={PRICING.title} />
          </h2>

          <Reveal variant="blur" delay={1}>
            <p className="max-w-[60ch] text-base leading-[1.6] text-text-body">{PRICING.subtitle}</p>
          </Reveal>
        </article>

        <div className="rounded-3xl border border-brand-blue/10 bg-gradient-to-b from-brand-blue-pale/50 via-white to-brand-blue-pale/40 p-3 shadow-[0_24px_64px_rgba(33,84,239,0.06)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-stretch">
            {PRICING.tiers.map((tier, i) => (
              <PricingCardReveal key={tier.id} index={i}>
                <PricingCard tier={tier} onPilotClick={openPilot} />
              </PricingCardReveal>
            ))}
          </div>
        </div>

        <Reveal variant="blur" delay={4} className="mt-10">
          <PayAsYouGo />
        </Reveal>

        <Reveal variant="fade" delay={5} className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={openPilot}
            className="inline-flex items-center gap-1.5 text-base md:text-[1vw] font-semibold text-text-primary transition-colors cursor-pointer hover:text-brand-blue"
          >
            {PRICING.enterpriseNote.label}
          </button>
        </Reveal>
      </div>

    </section>
  );
}

function PricingCardReveal({ index, children }: { index: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.35 }
    );
    observer.observe(node);
    const failsafe = window.setTimeout(() => node.classList.add("is-visible"), 4000);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div ref={ref} className="ps-card-reveal h-full" style={{ animationDelay: `${index * 180}ms` }}>
      {children}
    </div>
  );
}

function PricingCard({ tier, onPilotClick }: { tier: PricingTier; onPilotClick: () => void }) {
  const featured = !!tier.featured;
  const isPilot = tier.id === "pilot";
  const isExternal = tier.ctaHref.startsWith("mailto:") || tier.ctaHref.startsWith("http");
  const handleClick = () => {
    if (isPilot || !isExternal) {
      onPilotClick();
      return;
    }
    window.location.href = tier.ctaHref;
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between rounded-2xl transition-all duration-300",
        featured
          ? "bg-gradient-to-br from-brand-blue via-brand-blue-dark to-accent-purple text-white shadow-[0_24px_64px_rgba(33,84,239,0.35)] ring-2 ring-brand-blue xl:scale-[1.04]"
          : "bg-transparent pt-4 text-text-primary"
      )}
    >
      <div className="p-6 pt-0">
        <div className="space-y-2 pb-3">
          {featured ? (
            <div className="pt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm">
                Most Popular
              </span>
            </div>
          ) : (
            <div className="pt-4" aria-hidden>
              <span className="block h-6" />
            </div>
          )}

          <div className="flex items-baseline">
            <span
              className={cn(
                "text-4xl font-semibold leading-none",
                featured ? "text-white" : "text-text-primary"
              )}
            >
              {tier.price}
            </span>
            {tier.priceSuffix ? (
              <span className={cn("ml-1 text-sm", featured ? "text-white/80" : "text-text-hint")}>
                {tier.priceSuffix}
              </span>
            ) : null}
          </div>
        </div>

        <h3
          className={cn(
            "mb-2 text-3xl font-semibold tracking-[-0.01em]",
            featured ? "text-white" : "text-text-primary"
          )}
        >
          {tier.name}
        </h3>
        <p className={cn("mb-4 text-sm leading-[1.5]", featured ? "text-white/75" : "text-text-body")}>
          {tier.description}
        </p>

        <div
          className={cn(
            "space-y-3 border-t pt-4",
            featured ? "border-white/15" : "border-text-primary/10"
          )}
        >
          <h4 className={cn("mb-3 text-base font-medium", featured ? "text-white" : "text-text-primary")}>
            {INCLUDES_HEADER[tier.id]}
          </h4>
          <ul className="space-y-2 font-medium">
            {tier.features.map((f) => (
              <li key={f} className="flex items-center">
                <span
                  className={cn(
                    "mr-3 mt-0.5 grid h-6 w-6 shrink-0 place-content-center rounded-full",
                    featured
                      ? "border border-white/30 bg-white/15 text-white"
                      : "border border-brand-blue/30 bg-white text-brand-blue-dark"
                  )}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </span>
                <span className={cn("text-sm", featured ? "text-white/90" : "text-text-body")}>
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-6 pt-0">
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "mb-2 inline-flex h-14 w-full items-center justify-center rounded-xl px-5 text-base font-semibold transition-colors cursor-pointer",
            featured
              ? "border border-white/40 bg-gradient-to-t from-white via-white to-brand-blue-pale text-brand-blue-dark shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:-translate-y-0.5"
              : "bg-brand-blue text-white hover:bg-brand-blue-dark"
          )}
        >
          {tier.ctaLabel}
        </button>
      </div>
    </div>
  );
}

function PayAsYouGo() {
  const payg = PRICING.payg;
  const { open: openPilot } = usePilotModal();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand-blue/10 bg-gradient-to-br from-white via-brand-blue-pale/25 to-white px-8 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-blue/10 blur-[80px]"
      />
      <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.2fr_auto_1fr]">
        <div className="flex flex-col gap-2">
          <h3 className="text-[clamp(1.5rem,1.3rem+0.6vw,1.875rem)] font-medium leading-tight tracking-[-0.015em] text-text-primary">
            {payg.title}
          </h3>
          <p className="text-base leading-[1.55] text-text-body">{payg.description}</p>
          <div className="flex items-baseline gap-1 pt-2">
            <span className="bg-gradient-to-br from-brand-blue to-accent-purple bg-clip-text text-3xl font-semibold leading-none text-transparent">
              {payg.price}
            </span>
            <span className="text-sm text-text-hint">{payg.priceSuffix}</span>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {payg.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-text-primary">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-content-center rounded-full border border-brand-blue/30 bg-white text-brand-blue-dark">
                <CheckCheck className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="flex justify-start lg:justify-end">
          <LandingButton onClick={openPilot} variant="primary" icon="arrow-right">
            {payg.ctaLabel}
          </LandingButton>
        </div>
      </div>
    </div>
  );
}
