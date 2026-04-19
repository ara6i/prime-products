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
    <section id="pricing" className="relative overflow-hidden px-5 pb-14 pt-12">
      <article className="mb-6 flex flex-col items-start gap-3 text-left">
        <h2 className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-text-primary">
          <WordReveal text={PRICING.title} />
        </h2>
        <Reveal variant="blur" delay={1}>
          <p className="text-[15px] leading-[1.55] text-text-body">{PRICING.subtitle}</p>
        </Reveal>
      </article>

      <div className="rounded-3xl border border-brand-blue/10 bg-gradient-to-b from-brand-blue-pale/50 via-white to-brand-blue-pale/40 p-3 shadow-[0_8px_24px_rgba(33,84,239,0.06)]">
        <div className="flex flex-col gap-3">
          {PRICING.tiers.map((tier, i) => (
            <MobileCardReveal key={tier.id} index={i}>
              <PricingCardMobile tier={tier} onPilotClick={openPilot} />
            </MobileCardReveal>
          ))}
        </div>
      </div>

      <Reveal variant="blur" delay={4} className="mt-6">
        <PayAsYouGoMobile />
      </Reveal>

      <Reveal variant="fade" delay={5} className="mt-6 flex justify-center text-center">
        <button
          type="button"
          onClick={openPilot}
          className="text-base font-semibold text-text-primary cursor-pointer"
        >
          {PRICING.enterpriseNote.label}
        </button>
      </Reveal>

    </section>
  );
}

function MobileCardReveal({ index, children }: { index: number; children: React.ReactNode }) {
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
      { rootMargin: "0px 0px -20% 0px", threshold: 0.3 }
    );
    observer.observe(node);
    const failsafe = window.setTimeout(() => node.classList.add("is-visible"), 4000);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);
  return (
    <div ref={ref} className="ps-card-reveal" style={{ animationDelay: `${index * 140}ms` }}>
      {children}
    </div>
  );
}

function PricingCardMobile({ tier, onPilotClick }: { tier: PricingTier; onPilotClick: () => void }) {
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
        "relative flex flex-col rounded-2xl p-5",
        featured
          ? "bg-gradient-to-br from-brand-blue via-brand-blue-dark to-accent-purple text-white shadow-[0_16px_48px_rgba(33,84,239,0.3)] ring-2 ring-brand-blue"
          : "bg-white border border-text-primary/8"
      )}
    >
      {featured ? (
        <span className="mb-3 inline-flex w-fit items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white ring-1 ring-inset ring-white/30">
          Most Popular
        </span>
      ) : null}

      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-3xl font-semibold leading-none tracking-[-0.02em]",
            featured ? "text-white" : "text-text-primary"
          )}
        >
          {tier.price}
        </span>
        {tier.priceSuffix ? (
          <span className={cn("ml-1 text-xs", featured ? "text-white/80" : "text-text-hint")}>
            {tier.priceSuffix}
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "mt-3 text-2xl font-semibold tracking-[-0.01em]",
          featured ? "text-white" : "text-text-primary"
        )}
      >
        {tier.name}
      </h3>
      <p className={cn("mt-1 text-sm leading-[1.5]", featured ? "text-white/75" : "text-text-body")}>
        {tier.description}
      </p>

      <div className={cn("mt-4 space-y-2.5 border-t pt-4", featured ? "border-white/15" : "border-text-primary/10")}>
        <h4 className={cn("text-sm font-medium", featured ? "text-white" : "text-text-primary")}>
          {INCLUDES_HEADER[tier.id]}
        </h4>
        <ul className="flex flex-col gap-2">
          {tier.features.map((f) => (
            <li key={f} className="flex items-center">
              <span
                className={cn(
                  "mr-2.5 grid h-5 w-5 shrink-0 place-content-center rounded-full",
                  featured
                    ? "border border-white/30 bg-white/15 text-white"
                    : "border border-brand-blue/30 bg-white text-brand-blue-dark"
                )}
              >
                <CheckCheck className="h-3 w-3" />
              </span>
              <span className={cn("text-sm", featured ? "text-white/90" : "text-text-body")}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl border px-5 text-sm font-semibold transition-transform cursor-pointer hover:-translate-y-0.5",
          featured
            ? "border-white/40 bg-gradient-to-t from-white via-white to-brand-blue-pale text-brand-blue-dark"
            : "border-brand-blue-dark/40 bg-gradient-to-t from-brand-blue-dark via-brand-blue to-brand-blue/90 text-white shadow-[0_8px_24px_rgba(33,84,239,0.25)]"
        )}
      >
        {tier.ctaLabel}
      </button>
    </div>
  );
}

function PayAsYouGoMobile() {
  const payg = PRICING.payg;
  const { open: openPilot } = usePilotModal();
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-brand-blue/10 bg-gradient-to-br from-white via-brand-blue-pale/30 to-white p-6">
      <h3 className="text-xl font-medium leading-tight tracking-[-0.015em] text-text-primary">
        {payg.title}
      </h3>
      <p className="text-sm leading-[1.55] text-text-body">{payg.description}</p>
      <div className="flex items-baseline gap-1">
        <span className="bg-gradient-to-br from-brand-blue to-accent-purple bg-clip-text text-3xl font-semibold leading-none text-transparent">
          {payg.price}
        </span>
        <span className="text-sm text-text-hint">{payg.priceSuffix}</span>
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
      <LandingButton onClick={openPilot} variant="primary" size="lg" icon="arrow-right" className="w-full">
        {payg.ctaLabel}
      </LandingButton>
    </div>
  );
}
