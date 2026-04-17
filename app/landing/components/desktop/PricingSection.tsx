"use client";

import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import {
  CheckIcon,
  ArrowRightIcon,
  CheckroomIcon,
  LocalOfferIcon,
} from "@/app/shared/components/icons";
import { useScrollFadeUp, useScrollScale } from "@/app/landing/hooks/useScrollAnimation";
import type { PricingPack } from "@/app/landing/types";

interface PricingSectionProps {
  pricingPacks: PricingPack[];
}

function StarterCard({ pack }: { pack: PricingPack }) {
  return (
    <div className="relative flex flex-col items-stretch gap-[0.625vw] rounded-[1.042vw] p-[0.625vw] pb-[1.042vw] bg-catalog-bg border border-divider flex-1 overflow-hidden">
      <h3 className="text-[1.042vw] leading-[1.7] text-text-primary font-normal">
        {pack.name}
      </h3>
      <p className="text-[0.833vw] leading-[1.625] text-text-body font-normal">
        {pack.subtitle}
      </p>

      <div className="flex flex-col items-center gap-[0.208vw]">
        <div className="flex items-center gap-[0.208vw]">
          <span className="text-[1.042vw] leading-[1.7] text-catalog-link-underline font-normal">$</span>
          <span className="text-[1.667vw] leading-[1.5] text-text-subtitle font-normal">{pack.price}</span>
        </div>
        <span className="text-[0.521vw] leading-[1.6] text-text-body font-normal">{pack.priceNote}</span>
      </div>

      <div className="flex items-center justify-center gap-[0.208vw] bg-brand-blue-pale rounded-[0.417vw] py-[0.208vw]">
        <CheckroomIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="var(--brand-blue)" />
        <span className="text-[1.042vw] leading-[1.7] text-text-subtitle font-normal">{pack.tokens}</span>
        <span className="text-[0.625vw] leading-[1.667] text-text-body font-normal">Tokens</span>
      </div>

      <Button variant="primary" size="default" className="w-full h-[2.604vw] text-[0.833vw] rounded-[52.083vw]" asChild>
        <Link href="/auth">
          {pack.buttonLabel}
          <ArrowRightIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="white" />
        </Link>
      </Button>

      <div className="flex flex-col gap-[0.208vw]">
        {pack.features.map((feature) => (
          <div key={feature} className="flex items-center gap-[0.208vw]">
            <CheckIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--catalog-link-underline)" />
            <span className="text-[0.833vw] leading-[1.625] text-text-primary font-normal">{feature}</span>
          </div>
        ))}
      </div>

      {pack.badge && (
        <div
          className="absolute flex items-center justify-center py-[0.521vw] px-[0.521vw] text-[1.042vw] leading-[1.7] text-white font-normal"
          style={{
            width: "19.375vw",
            bottom: "1.875vw",
            left: "-1.615vw",
            background: "linear-gradient(90deg, #EDA403 0%, #C96500 100%)",
            transform: "rotate(-20deg)",
            transformOrigin: "center",
          }}
        >
          {pack.badge}
        </div>
      )}
    </div>
  );
}

function RecommendedCard({ pack }: { pack: PricingPack }) {
  return (
    <div className="flex flex-col items-stretch gap-[1.042vw] rounded-[1.042vw] p-[0.833vw] bg-brand-blue-pale border border-product-card-selected-border flex-1">
      <div className="flex items-center gap-[0.521vw]">
        <h3 className="text-[1.042vw] leading-[1.7] text-text-primary font-normal flex-1">{pack.name}</h3>
        {pack.discountBadge && (
          <span className="inline-flex items-center gap-[0.208vw] bg-warning-bg text-warning-text text-[0.729vw] leading-[1.57] font-normal px-[0.208vw] py-[0.104vw] rounded-[0.573vw] h-[1.25vw]">
            <LocalOfferIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--warning-text)" />
            {pack.discountBadge}
          </span>
        )}
      </div>

      <p className="text-[0.833vw] leading-[1.625] text-text-body font-normal">{pack.subtitle}</p>

      <div className="flex flex-col items-center gap-[0.208vw]">
        <div className="flex items-center gap-[0.208vw]">
          <span className="text-[1.042vw] leading-[1.7] text-catalog-link-underline font-normal">$</span>
          <span className="text-[1.875vw] leading-none text-text-subtitle font-normal">{pack.price}</span>
        </div>
        <span className="text-[0.625vw] leading-[1.667] text-text-body font-normal text-center">{pack.priceNote}</span>
      </div>

      <div className="flex items-center justify-center gap-[0.208vw] bg-white rounded-[0.417vw] py-[0.208vw]">
        <CheckroomIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="var(--brand-blue)" />
        <span className="text-[1.042vw] leading-[1.7] text-text-subtitle font-normal">{pack.tokens}</span>
        <span className="text-[0.625vw] leading-[1.667] text-text-body font-normal">Tokens</span>
      </div>

      <div className="flex flex-col gap-[0.208vw]">
        {pack.features.map((feature) => (
          <div key={feature} className="flex items-center gap-[0.208vw]">
            <CheckIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--catalog-link-underline)" />
            <span className="text-[0.833vw] leading-[1.625] text-text-primary font-normal">{feature}</span>
          </div>
        ))}
        {pack.highlightFeature && (
          <div className="flex items-center gap-[0.208vw]">
            <CheckIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--catalog-link-underline)" />
            <span className="text-[0.833vw] leading-[1.625] text-tab-active font-normal">{pack.highlightFeature}</span>
          </div>
        )}
      </div>

      <Button variant="primary" size="default" className="w-full mt-auto h-[2.604vw] text-[0.833vw] rounded-[52.083vw]" asChild>
        <Link href="/auth">
          {pack.buttonLabel}
          <ArrowRightIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="white" />
        </Link>
      </Button>
    </div>
  );
}

export function PricingSection({ pricingPacks }: PricingSectionProps) {
  const starterPack = pricingPacks[0];
  const recommendedPacks = pricingPacks.slice(1);

  const headingRef = useScrollFadeUp();
  const cardsRef = useScrollScale({
    staggerChildren: true,
    childSelector: ":scope > div",
    stagger: 0.15,
    delay: 0.1,
  });

  return (
    <section data-testid="pricing-section" className="flex flex-col items-center gap-[2.5vw] w-full px-[7.292vw] py-[5.208vw]">
      <div ref={headingRef} className="flex items-start justify-between w-full max-w-[68.646vw]">
        <div className="flex flex-col gap-[0.833vw]">
          <h2 className="text-[1.667vw] leading-[1.5] text-text-primary font-normal">
            Choose the right token pack for you
          </h2>
          <p className="text-[1.042vw] leading-[1.7] text-text-body font-normal">
            Tokens power your virtual try-ons and outfit creation.
            <br />
            Pick a pack that fits how often you want to explore and experiment.
          </p>
        </div>
        <Button variant="primary" size="2xl" className="h-[3.021vw] px-[1.25vw] text-[1.042vw] leading-[1.771vw] rounded-[52.083vw]" asChild>
          <Link href="/auth">
            View all plans
            <ArrowRightIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="white" />
          </Link>
        </Button>
      </div>

      <div ref={cardsRef} className="flex gap-[1.667vw] justify-center">
        <div className="flex flex-col gap-[0.625vw]">
          <div className="flex justify-center items-center p-[0.521vw] border-b-[3px] border-warning-dot">
            <span className="text-[0.833vw] leading-[1.625] text-text-primary font-normal">Your Pack After Signing Up</span>
          </div>
          <div className="w-[15.625vw] h-[25vw] flex">
            <StarterCard pack={starterPack} />
          </div>
        </div>

        <div className="flex flex-col gap-[0.625vw] w-[34.167vw]">
          <div className="flex justify-center items-center p-[0.521vw] border-b-[3px] border-catalog-link-underline">
            <span className="text-[0.833vw] leading-[1.625] text-text-primary font-normal">Our Recommended Packs to Start</span>
          </div>
          <div className="flex gap-[0.833vw] items-stretch">
            {recommendedPacks.map((pack) => (
              <RecommendedCard key={pack.name} pack={pack} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
