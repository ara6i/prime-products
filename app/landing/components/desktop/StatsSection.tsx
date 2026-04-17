"use client";

import { useScrollFadeUp } from "@/app/landing/hooks/useScrollAnimation";
import type { StatCard } from "@/app/landing/types";

interface StatsSectionProps {
  stats: StatCard[];
}

export function StatsSection({ stats }: StatsSectionProps) {
  const headingRef = useScrollFadeUp();
  const cardsRef = useScrollFadeUp({
    staggerChildren: true,
    childSelector: ":scope > div",
    stagger: 0.12,
    delay: 0.1,
  });

  return (
    <section className="flex flex-col items-center gap-[2.5vw] w-full px-[7.292vw] pt-[9.375vw] pb-[5.208vw]">
      <div ref={headingRef} className="flex flex-col self-stretch gap-[0.417vw]">
        <h2 className="text-[1.667vw] leading-[1.5] text-text-primary font-normal">
          Trusted by style lovers worldwide
        </h2>
        <p className="text-[1.042vw] leading-[1.7] text-text-body">
          Real users. Real outfits. Real results.
        </p>
      </div>

      <div ref={cardsRef} className="flex gap-[0.833vw] w-full max-w-[85.417vw]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 flex flex-col gap-[1.667vw] rounded-[1.042vw] py-[1.667vw] px-[1.25vw] bg-gradient-to-r from-brand-blue-pale to-landing-blue-section-bg"
          >
            <div className="flex items-center self-stretch gap-[0.208vw]">
              <span className="text-[1.667vw] leading-[1.5] text-text-primary font-normal">
                {stat.number}
              </span>
              <span className="text-[0.833vw] leading-[1.625] text-text-body">
                {stat.label}
              </span>
            </div>
            <span className="text-[0.833vw] leading-[1.625] text-catalog-section-text">
              {stat.description}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
