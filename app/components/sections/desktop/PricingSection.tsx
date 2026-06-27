"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCheck, ChevronDown } from "lucide-react";
import { Reveal } from "../../shared/Reveal";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/shared/components/ui";
import { PRICING, PRODUCT_PACKAGE_TIERS, TRY_ON_PACKAGE_TIERS } from "../../../content/landing";

const [FREE_PLAN, CUSTOM_PLAN] = PRICING.tiers;
const JOIN_PRIMESTYLEAI_HREF = "/customer/login";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function PricingSection() {
  const [productTierIndex, setProductTierIndex] = useState(1);
  const [tryOnPackIndex, setTryOnPackIndex] = useState(2);
  const selectedProductTier = PRODUCT_PACKAGE_TIERS[productTierIndex];
  const selectedTryOnPack = TRY_ON_PACKAGE_TIERS[tryOnPackIndex];
  const totalMonthlyPrice = selectedProductTier.price + selectedTryOnPack.price;
  const effectiveTryOnRate = selectedTryOnPack.price / selectedTryOnPack.quantity;
  const builderStats = useMemo(
    () => [
      { label: "Product coverage", value: selectedProductTier.label },
      { label: "Try-on package", value: selectedTryOnPack.label },
      { label: "Estimated monthly total", value: `${formatCurrency(totalMonthlyPrice)} / month` },
    ],
    [selectedProductTier.label, selectedTryOnPack.label, totalMonthlyPrice]
  );

  return (
    <section id="pricing" className="relative scroll-mt-[12rem] overflow-hidden px-8 pb-[clamp(5rem,7vw,7rem)] pt-[clamp(4rem,6vw,6rem)]">
      <div className="mx-auto w-[min(86vw,78rem)]">
        <article className="mb-8 flex flex-col items-start gap-4 text-left">
          <h2 className="text-[clamp(2rem,1.6rem+1.8vw,3rem)] font-medium leading-[1.15] tracking-[-0.02em] text-text-primary">
            {PRICING.title}
          </h2>

          <Reveal variant="blur" delay={1}>
            <p className="max-w-[60ch] text-base leading-[1.6] text-text-body">{PRICING.subtitle}</p>
          </Reveal>
        </article>

        <div className="rounded-[1.4rem] border border-brand-blue/10 bg-white p-3 shadow-[0_24px_64px_rgba(33,84,239,0.06)]">
          <div className="mx-auto grid max-w-[76rem] items-stretch gap-4 lg:grid-cols-[0.84fr_1.16fr]">
            <PricingCardReveal index={0}>
              <FreePlanCard />
            </PricingCardReveal>
            <PricingCardReveal index={1}>
              <CustomPlanBuilder
                builderStats={builderStats}
                effectiveTryOnRate={effectiveTryOnRate}
                productTierIndex={productTierIndex}
                setProductTierIndex={setProductTierIndex}
                setTryOnPackIndex={setTryOnPackIndex}
                totalMonthlyPrice={totalMonthlyPrice}
                tryOnPackIndex={tryOnPackIndex}
              />
            </PricingCardReveal>
          </div>
        </div>
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

function FreePlanCard() {
  return (
    <div className="relative flex h-full flex-col rounded-2xl bg-white p-6 text-text-primary shadow-[inset_0_0_0_1px_rgba(33,84,239,0.08)]">
      <div>
        <h3 className="mb-2 text-[1.65rem] font-semibold tracking-[-0.01em] text-text-primary">{FREE_PLAN.name}</h3>
        <p className="mb-4 text-sm leading-[1.5] text-text-body">{FREE_PLAN.description}</p>

        <div className="space-y-3 border-t border-text-primary/10 pt-4">
          <h4 className="mb-3 text-base font-medium text-text-primary">Free plan includes:</h4>
          <ul className="space-y-2 font-medium">
            {FREE_PLAN.features.map((f) => (
              <li key={f} className="flex items-center">
                <span className="mr-3 mt-0.5 grid h-6 w-6 shrink-0 place-content-center rounded-full border border-brand-blue/30 bg-white text-brand-blue-dark">
                  <CheckCheck className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-text-body">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto flex justify-center pt-6">
        <Button variant="primary" size="default" className="h-10 w-auto min-w-[13.5rem] gap-2 rounded-full px-6 text-sm font-semibold !text-white" asChild>
          <Link href={JOIN_PRIMESTYLEAI_HREF}>
            Join PrimeStyleAI
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

    </div>
  );
}

function CustomPlanBuilder({
  builderStats,
  effectiveTryOnRate,
  productTierIndex,
  setProductTierIndex,
  setTryOnPackIndex,
  totalMonthlyPrice,
  tryOnPackIndex,
}: {
  builderStats: Array<{ label: string; value: string }>;
  effectiveTryOnRate: number;
  productTierIndex: number;
  setProductTierIndex: (index: number) => void;
  setTryOnPackIndex: (index: number) => void;
  totalMonthlyPrice: number;
  tryOnPackIndex: number;
}) {
  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-brand-blue/12 bg-[#f8fbff] p-6 text-text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(12.5rem,15rem)] gap-5">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-blue ring-1 ring-inset ring-brand-blue/15">
            Live plan builder
          </span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[2.65rem] font-semibold leading-none tracking-[-0.03em] text-text-primary">{formatCurrency(totalMonthlyPrice)}</span>
            <span className="text-sm text-text-hint">/month</span>
          </div>
          <h3 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.01em]">{CUSTOM_PLAN.name}</h3>
          <p className="mt-2 max-w-[42ch] text-sm leading-[1.55] text-text-body">{CUSTOM_PLAN.description}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-brand-blue/10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-hint">Estimate</p>
          <div className="mt-3 space-y-3">
            {builderStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-xs text-text-hint">{stat.label}</p>
                <p className="text-sm font-semibold leading-tight text-text-primary">{stat.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-[1.45] text-text-body">
            Effective try-on rate: ${effectiveTryOnRate.toFixed(2)} per try-on.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 border-t border-brand-blue/10 pt-5">
        <BuilderSelector
          label="Product coverage"
          options={PRODUCT_PACKAGE_TIERS.map((tier) => `${tier.label} · ${formatCurrency(tier.price)}`)}
          selectedIndex={productTierIndex}
          onSelect={setProductTierIndex}
        />
        <BuilderSelector
          label="Monthly try-ons"
          options={TRY_ON_PACKAGE_TIERS.map(
            (pack) => `${formatNumber(pack.quantity)} try-ons · ${formatCurrency(pack.price)}`
          )}
          selectedIndex={tryOnPackIndex}
          onSelect={setTryOnPackIndex}
        />
      </div>

    </div>
  );
}

function BuilderSelector({
  label,
  options,
  selectedIndex,
  onSelect,
}: {
  label: string;
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-text-primary">{label}</p>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-brand-blue/15 bg-white px-3 text-left text-sm font-medium text-text-primary outline-none transition hover:border-brand-blue/30 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
          >
            <span className="truncate">{options[selectedIndex]}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-text-hint" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border-brand-blue/10 bg-white p-1 shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
        >
          {options.map((option, index) => (
            <DropdownMenuItem
              key={option}
              onSelect={() => onSelect(index)}
              className="rounded-lg px-3 py-2 text-sm text-text-primary focus:bg-brand-blue-pale"
            >
              <span className="min-w-5 text-brand-blue">
                {selectedIndex === index ? <CheckCheck className="h-3.5 w-3.5" /> : null}
              </span>
              <span>{option}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
