"use client";

import { useMemo, useState } from "react";
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
      { label: "Products", value: selectedProductTier.label },
      { label: "Try-ons", value: selectedTryOnPack.label },
      { label: "Monthly total", value: `${formatCurrency(totalMonthlyPrice)} / month` },
    ],
    [selectedProductTier.label, selectedTryOnPack.label, totalMonthlyPrice]
  );

  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden px-5 pb-14 pt-12">
      <article className="mb-6 flex flex-col items-start gap-3 text-left">
        <h2 className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-text-primary">
          {PRICING.title}
        </h2>
        <Reveal variant="blur" delay={1}>
          <p className="text-[15px] leading-[1.55] text-text-body">{PRICING.subtitle}</p>
        </Reveal>
      </article>

      <div className="rounded-[22px] border border-brand-blue/10 bg-white p-3 shadow-[0_8px_24px_rgba(33,84,239,0.06)]">
        <div className="flex flex-col gap-3">
          <FreePlanMobile />
          <CustomPlanBuilderMobile
            builderStats={builderStats}
            effectiveTryOnRate={effectiveTryOnRate}
            productTierIndex={productTierIndex}
            setProductTierIndex={setProductTierIndex}
            setTryOnPackIndex={setTryOnPackIndex}
            totalMonthlyPrice={totalMonthlyPrice}
            tryOnPackIndex={tryOnPackIndex}
          />
        </div>
      </div>

    </section>
  );
}

function FreePlanMobile() {
  return (
    <div className="relative flex flex-col rounded-2xl border border-text-primary/8 bg-white p-5">
      <h3 className="text-2xl font-semibold tracking-[-0.01em] text-text-primary">{FREE_PLAN.name}</h3>
      <p className="mt-1 text-sm leading-[1.5] text-text-body">{FREE_PLAN.description}</p>

      <div className="mt-4 space-y-2.5 border-t border-text-primary/10 pt-4">
        <h4 className="text-sm font-medium text-text-primary">Free plan includes:</h4>
        <ul className="flex flex-col gap-2">
          {FREE_PLAN.features.map((f) => (
            <li key={f} className="flex items-center">
              <span className="mr-2.5 grid h-5 w-5 shrink-0 place-content-center rounded-full border border-brand-blue/30 bg-white text-brand-blue-dark">
                <CheckCheck className="h-3 w-3" />
              </span>
              <span className="text-sm text-text-body">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center pt-5">
        <Button variant="primary" size="default" className="h-10 w-auto min-w-[210px] gap-2 rounded-full px-5 text-sm font-semibold !text-white" asChild>
          <Link href={JOIN_PRIMESTYLEAI_HREF}>
            Join PrimeStyleAI
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

    </div>
  );
}

function CustomPlanBuilderMobile({
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
    <div className="relative flex flex-col rounded-2xl border border-brand-blue/12 bg-[#f8fbff] p-5 text-text-primary">
      <span className="mb-3 inline-flex w-fit rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-blue ring-1 ring-inset ring-brand-blue/15">
        Live plan builder
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold leading-none tracking-[-0.02em] text-text-primary">{formatCurrency(totalMonthlyPrice)}</span>
        <span className="text-xs text-text-hint">/month</span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.01em]">{CUSTOM_PLAN.name}</h3>
      <p className="mt-1 text-sm leading-[1.5] text-text-body">{CUSTOM_PLAN.description}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 ring-1 ring-inset ring-brand-blue/10">
        {builderStats.map((stat) => (
          <div key={stat.label}>
            <p className="text-[11px] text-text-hint">{stat.label}</p>
            <p className="text-sm font-semibold leading-tight text-text-primary">{stat.value}</p>
          </div>
        ))}
        <p className="mt-3 text-xs leading-[1.45] text-text-body">
          Effective try-on rate: ${effectiveTryOnRate.toFixed(2)} per try-on.
        </p>
      </div>

      <BuilderSelectorMobile
        label="Product coverage"
        options={PRODUCT_PACKAGE_TIERS.map((tier) => `${tier.label} · ${formatCurrency(tier.price)}`)}
        selectedIndex={productTierIndex}
        onSelect={setProductTierIndex}
      />
      <BuilderSelectorMobile
        label="Monthly try-ons"
        options={TRY_ON_PACKAGE_TIERS.map(
          (pack) => `${formatNumber(pack.quantity)} try-ons · ${formatCurrency(pack.price)}`
        )}
        selectedIndex={tryOnPackIndex}
        onSelect={setTryOnPackIndex}
      />

    </div>
  );
}

function BuilderSelectorMobile({
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
    <div className="mt-4">
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
