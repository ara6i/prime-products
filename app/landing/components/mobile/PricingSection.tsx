import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import {
  CheckIcon,
  ArrowRightIcon,
  CheckroomIcon,
  LocalOfferIcon,
} from "@/app/shared/components/icons";
import type { PricingPack } from "@/app/landing/types";

interface PricingSectionProps {
  pricingPacks: PricingPack[];
}

function StarterRibbon() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
      <div
        className="absolute -right-12 bottom-16 w-[300px] -rotate-[20deg] py-2"
        style={{ background: "linear-gradient(to right, #EDA403, #C96500)" }}
      >
        <p className="text-center text-sm font-bold text-white">Free once signed up</p>
      </div>
    </div>
  );
}

function PricingCard({
  pack,
  isStarter,
  isRecommended,
}: {
  pack: PricingPack;
  isStarter?: boolean;
  isRecommended?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[20px] p-4 ${
        isRecommended
          ? "border border-[#80b3ff] bg-[#dae7ff]"
          : "border border-[#cfd1d2] bg-[#f5f6f6]"
      }`}
    >
      {isStarter && <StarterRibbon />}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 text-base font-normal leading-[1.5] text-text-primary">
            {pack.name}
          </h3>
          {pack.discountBadge && (
            <span className="inline-flex items-center gap-1 rounded-[11px] bg-warning-bg px-1 py-0.5 text-xs text-warning-text">
              <LocalOfferIcon size={12} color="var(--warning-text)" />
              {pack.discountBadge}
            </span>
          )}
        </div>

        <p className="text-xs leading-[1.5] text-text-body">{pack.subtitle}</p>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-base text-brand-blue">$</span>
            <span className="text-[28px] font-normal leading-none text-text-subtitle">
              {pack.price}
            </span>
          </div>
          <span className="text-[10px] text-text-body">{pack.priceNote}</span>
        </div>

        <div className="flex items-center justify-center gap-1 rounded-lg bg-white py-1">
          <CheckroomIcon size={16} color="var(--brand-blue)" />
          <span className="text-base font-normal text-text-subtitle">{pack.tokens}</span>
          <span className="text-xs text-text-body">Tokens</span>
        </div>

        <div className="flex flex-col gap-1">
          {pack.features.map((feature) => (
            <div key={feature} className="flex items-center gap-1">
              <CheckIcon size={14} color="var(--catalog-link-underline)" />
              <span className="text-xs leading-[1.5] text-text-primary">{feature}</span>
            </div>
          ))}
          {pack.highlightFeature && (
            <div className="flex items-center gap-1">
              <CheckIcon size={14} color="var(--catalog-link-underline)" />
              <span className="text-xs leading-[1.5] text-tab-active">{pack.highlightFeature}</span>
            </div>
          )}
        </div>

        <Button variant="primary" size="sm" className="w-full" asChild>
          <Link href="/auth">
            {pack.buttonLabel}
            <ArrowRightIcon size={16} color="white" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function PricingSection({ pricingPacks }: PricingSectionProps) {
  const [starterPack, ...recommendedPacks] = pricingPacks;

  return (
    <section className="flex flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-[22px] font-normal leading-[1.4] text-text-primary">
          Choose the right token pack for you
        </h2>
        <p className="text-sm leading-[1.57] text-text-body">
          Tokens power your virtual try-ons and outfit creation.
          Pick a pack that fits how often you want to explore and experiment.
        </p>
        <Button variant="primary" size="sm" className="self-start" asChild>
          <Link href="/auth">
            View all plans
            <ArrowRightIcon size={16} color="white" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div
          className="border-b-2 border-[#EDA403] pb-1 text-sm font-medium text-text-primary"
        >
          Your Pack After Signing Up
        </div>
        <PricingCard pack={starterPack} isStarter />

        <div className="border-b-2 border-brand-blue pb-1 text-sm font-medium text-text-primary">
          Our Recommended Packs to Start
        </div>
        {recommendedPacks.map((pack) => (
          <PricingCard key={pack.name} pack={pack} isRecommended />
        ))}
      </div>
    </section>
  );
}
