"use client";

import Image from "next/image";
import { FormatQuoteIcon } from "@/app/shared/components/icons";
import { useScrollFadeUp } from "@/app/landing/hooks/useScrollAnimation";
import type { Testimonial } from "@/app/landing/types";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const headingRef = useScrollFadeUp();
  const cardsRef = useScrollFadeUp({
    staggerChildren: true,
    childSelector: ":scope > div",
    stagger: 0.15,
    delay: 0.1,
  });

  return (
    <section className="flex flex-col items-center gap-[2.5vw] w-full px-[7.292vw] py-[5.208vw]">
      <div ref={headingRef} className="flex flex-col items-center gap-[0.625vw] text-center">
        <h2 className="text-[1.667vw] leading-[1.5] text-text-primary font-normal">
          What people are saying
        </h2>
        <p className="text-[1.042vw] leading-[1.7] text-text-body">
          See how real users are using virtual try-on to discover outfits they
          actually love.
        </p>
      </div>

      <div ref={cardsRef} className="flex gap-[0.833vw] w-full max-w-[85.417vw]">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="flex-1 flex flex-col gap-[0.833vw] rounded-[1.042vw] bg-landing-blue-section-bg p-[0.833vw]"
          >
            <FormatQuoteIcon
              size={36}
              className="!w-[1.875vw] !h-[1.875vw]"
              color="var(--dashboard-chart-medium-blue)"
            />
            <p className="text-[0.833vw] leading-[1.625] text-black flex-1">
              {t.quote}
            </p>
            <div className="flex items-center gap-[0.625vw] mt-[0.417vw]">
              <Image
                src={t.avatar}
                alt={t.name}
                width={60}
                height={60}
                className="rounded-full object-cover w-[3.125vw] h-[3.125vw]"
              />
              <div className="flex flex-col">
                <span className="text-[0.833vw] leading-[1.625] text-text-primary font-medium">
                  {t.name}
                </span>
                <span className="text-[0.729vw] leading-[1.57] text-text-body">
                  {t.role}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
