"use client";

import Image from "next/image";
import {
  CheckroomIcon,
  GenerateIcon,
  ShoppingBagIcon,
} from "@/app/shared/components/icons";
import { ApparelIcon } from "@/app/shared/components/icons";
import { useScrollFadeUp, useScrollScale } from "@/app/landing/hooks/useScrollAnimation";

export function FeaturesSection() {
  const headingRef = useScrollFadeUp();
  const row1Ref = useScrollFadeUp({
    staggerChildren: true,
    childSelector: ":scope > div",
    stagger: 0.2,
    duration: 0.9,
  });
  const row2Ref = useScrollFadeUp({
    staggerChildren: true,
    childSelector: ":scope > div",
    stagger: 0.2,
    duration: 0.9,
  });

  return (
    <section data-testid="features-section" className="flex flex-col items-center gap-[2.5vw] w-full px-[7.292vw] py-[5.208vw]">
      <div ref={headingRef} className="flex flex-col self-stretch gap-[0.417vw]">
        <h2 className="text-[1.667vw] leading-[1.5] text-text-primary font-semibold">
          What Makes Our Platform Unique
        </h2>
        <p className="text-[1.042vw] leading-[1.7] text-text-body font-normal">
          From real-brand catalogs to AI-powered try-on, each feature is
          designed to give you control, confidence, and a seamless experience.
        </p>
      </div>

      <div className="flex flex-col gap-[1.25vw] w-full max-w-[62.5vw]">
        {/* Row 1 */}
        <div ref={row1Ref} className="flex gap-[1.25vw] items-stretch min-h-[25vw]">
          {/* Card 1 */}
          <div className="relative flex-1 flex flex-col justify-end gap-[1.25vw] rounded-[1.042vw] p-[2.5vw] pb-[2.083vw] bg-brand-blue-pale overflow-hidden">
            <div className="absolute top-[1.667vw] left-[1.667vw]">
              <CheckroomIcon size={48} className="!w-[2.5vw] !h-[2.5vw]" color="var(--brand-blue-light)" />
            </div>
            <div className="absolute top-[-3.125vw] left-[12.5vw] shadow-feature-card rounded-[1.042vw]">
              <Image
                src="/images/landing/feature-catalog-screenshots.png"
                alt="Catalog screenshots"
                width={705}
                height={510}
                className="object-contain w-[36.719vw]"
              />
            </div>
            <div className="flex flex-col gap-[0.208vw] relative z-10">
              <h3 className="text-[1.042vw] leading-[1.7] text-text-primary font-semibold">
                Freedom without limitations
              </h3>
              <p className="text-[1.042vw] leading-[1.7] text-text-body font-normal">
                Mix items across brands and styles — no locked looks, no forced paths.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div data-testid="feature-card-2" className="relative flex flex-col gap-[1.25vw] rounded-[1.042vw] p-[1.667vw] bg-landing-blue-section-bg overflow-hidden w-[20.833vw] shrink-0">
            <div className="flex flex-col gap-[0.208vw] relative z-10">
              <h3 className="text-[1.042vw] leading-[1.7] text-text-primary font-semibold">
                Confidence over guesswork
              </h3>
              <p className="text-[1.042vw] leading-[1.7] text-text-body font-normal">
                See results before buying, so you return less and choose better.
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <Image
                src="/images/landing/feature-outfit-preview.png"
                alt="Outfit preview with model"
                width={672}
                height={745}
                className="w-full max-w-none object-cover object-top"
              />
            </div>
            <div className="absolute bottom-[1.667vw] right-[1.667vw]">
              <ApparelIcon size={48} className="!w-[2.5vw] !h-[2.5vw]" color="var(--brand-blue-pale)" />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div ref={row2Ref} className="flex gap-[1.25vw] items-stretch">
          {/* Card 3 */}
          <div className="relative flex flex-col justify-end gap-[1.25vw] rounded-[1.042vw] p-[1.667vw] bg-catalog-bg overflow-hidden w-[20.833vw] h-[20.833vw] shrink-0">
            <div className="absolute top-[1.667vw] right-[1.667vw]">
              <ShoppingBagIcon size={48} className="!w-[2.5vw] !h-[2.5vw]" color="var(--text-primary)" />
            </div>
            <div className="absolute -left-[6.406vw] top-[4.844vw]">
              <Image
                src="/images/landing/feature-brand-logos.png"
                alt="Trusted brand logos"
                width={684}
                height={160}
                className="object-contain w-[35.625vw]"
              />
            </div>
            <div className="flex flex-col gap-[0.208vw] relative z-10">
              <h3 className="text-[1.042vw] leading-[1.7] text-text-primary font-semibold">
                Real products, not placeholders
              </h3>
              <p className="text-[1.042vw] leading-[1.7] text-text-body font-normal">
                Every outfit is built from real, trusted fashion brands.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="relative flex-1 flex flex-col gap-[0.521vw] rounded-[1.042vw] pt-[2.083vw] px-[2.5vw] pb-[2.5vw] bg-weather-pill-bg overflow-hidden min-h-[20.833vw]">
            <div className="absolute bottom-[1.667vw] left-[1.667vw]">
              <GenerateIcon size={48} className="!w-[2.5vw] !h-[2.5vw]" color="var(--weather-pill-divider)" />
            </div>
            <div className="flex flex-col gap-[0.208vw] relative z-10">
              <h3 className="text-[1.042vw] leading-[1.7] text-text-primary font-semibold">
                Try-on that feels realistic
              </h3>
              <p className="text-[1.042vw] leading-[1.7] text-text-body font-normal">
                AI-powered visuals that help you understand fit and style on you.
              </p>
            </div>
            <div className="absolute top-[8.333vw] left-[11.875vw] shadow-feature-card rounded-[1.042vw]">
              <Image
                src="/images/landing/feature-ai-stylist.png"
                alt="AI Stylist conversation interface"
                width={661}
                height={518}
                className="object-contain rounded-[1.042vw] w-[34.427vw]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
