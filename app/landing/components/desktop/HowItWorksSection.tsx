"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckroomIcon, GenerateIcon, ApparelIcon } from "@/app/shared/components/icons";
import { useScrollFadeUp } from "@/app/landing/hooks/useScrollAnimation";
import type { HowItWorksStep } from "@/app/landing/types";

gsap.registerPlugin(ScrollTrigger);

interface HowItWorksSectionProps {
  steps: HowItWorksStep[];
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  generate: GenerateIcon,
  apparel: ApparelIcon,
  checkroom: CheckroomIcon,
};

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  const headingRef = useScrollFadeUp();
  const timelineRef = useRef<HTMLDivElement>(null);
  const cardsRef = useScrollFadeUp({
    staggerChildren: true,
    childSelector: ":scope > div",
    stagger: 0.2,
    delay: 0.4,
  });

  useEffect(() => {
    if (!timelineRef.current) return;
    const container = timelineRef.current;
    const line = container.querySelector("line");
    const circles = container.querySelectorAll("[data-step-circle]");

    if (line) {
      const totalLength = line.getTotalLength?.() || 1400;
      gsap.set(line, { strokeDasharray: totalLength, strokeDashoffset: totalLength });
      gsap.to(line, {
        strokeDashoffset: 0,
        duration: 1.2,
        ease: "power2.inOut",
        scrollTrigger: { trigger: container, start: "top 80%", toggleActions: "play none none none" },
      });
    }

    gsap.set(circles, { opacity: 0, scale: 0 });
    gsap.to(circles, {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      stagger: 0.25,
      delay: 0.3,
      ease: "back.out(2)",
      scrollTrigger: { trigger: container, start: "top 80%", toggleActions: "play none none none" },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === container) t.kill();
      });
    };
  }, []);

  return (
    <section data-testid="how-it-works-section" className="flex flex-col items-center gap-[2.5vw] w-full px-[7.292vw] py-[5.208vw]">
      <div ref={headingRef} className="flex flex-col gap-[0.417vw] self-stretch">
        <h2 className="text-[1.667vw] leading-[1.5] text-text-primary font-normal">
          How it Works?
        </h2>
      </div>

      <div ref={timelineRef} className="relative w-full py-[2.083vw]">
        <svg className="absolute top-1/2 left-0 right-0 -translate-y-1/2 w-full" height="2" preserveAspectRatio="none">
          <line x1="0" y1="1" x2="100%" y2="1" stroke="#ADB1B3" strokeWidth="1" strokeDasharray="15 8" />
        </svg>
        <div className="relative flex gap-[1.042vw] w-full">
          {steps.map((step) => (
            <div key={step.number} className="flex-1">
              <div
                data-step-circle
                className="w-[4.167vw] h-[4.167vw] rounded-full flex items-center justify-center"
                style={{ background: "radial-gradient(circle at 79% 13%, #FFCF1E 0%, #EDA403 100%)" }}
              >
                <span className="text-[1.875vw] leading-none text-white font-normal">
                  {step.number}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={cardsRef} className="flex gap-[1.042vw] w-full">
        {steps.map((step) => {
          const Icon = ICON_MAP[step.icon];
          return (
            <div
              key={step.number}
              className="flex-1 flex flex-col gap-[2.5vw] rounded-[1.042vw] bg-landing-step-bg p-[1.25vw]"
            >
              <div className="w-[2.917vw] h-[2.917vw] flex items-center justify-center">
                {Icon && <Icon size={56} className="!w-[2.917vw] !h-[2.917vw]" color="white" />}
              </div>
              <div className="flex flex-col gap-[0.625vw]">
                <h3 className="text-[1.042vw] leading-[1.7] text-white font-normal">
                  {step.title}
                </h3>
                <p className="text-[1.042vw] leading-[1.7] text-white font-normal">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
