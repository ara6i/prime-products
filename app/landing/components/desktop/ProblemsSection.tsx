"use client";

import {
  Layers, Ruler, ClockAlert, Shirt,
  MessageCircleQuestion, SwatchBook, Puzzle, Sparkles,
} from "lucide-react";
import { useScrollFadeUp, useScrollSlideIn } from "@/app/landing/hooks/useScrollAnimation";
import type { ProblemItem, SolutionItem } from "@/app/landing/types";

interface ProblemsSectionProps {
  problems: ProblemItem[];
  solutions: SolutionItem[];
}

const PROBLEM_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  layers: Layers, ruler: Ruler, "clock-alert": ClockAlert, shirt: Shirt,
};

const SOLUTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "message-circle-question": MessageCircleQuestion, "swatch-book": SwatchBook, puzzle: Puzzle, sparkles: Sparkles,
};

export function ProblemsSection({ problems, solutions }: ProblemsSectionProps) {
  const problemsRef = useScrollSlideIn("left", { duration: 0.9 });
  const solutionsRef = useScrollSlideIn("right", { duration: 0.9, delay: 0.15 });

  return (
    <section className="flex flex-col items-center gap-[2.5vw] w-full px-[7.292vw] py-[5.208vw]">
      <div className="flex gap-[1.667vw] w-full max-w-[85.417vw]">
        {/* Problems column */}
        <div ref={problemsRef} className="flex-1 flex gap-[1.25vw]">
          <div className="flex items-center">
            <span className="text-[1.25vw] leading-[1.667] text-rule-rejected font-normal [writing-mode:vertical-lr] rotate-180">
              Problems
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-0">
            <h3 className="text-[1.667vw] leading-[1.5] text-text-primary font-normal mb-[1.25vw]">
              Getting dressed shouldn&apos;t be this hard
            </h3>
            <div className="border-t border-product-card-border mb-[0.417vw]" />
            {problems.map((item, i) => {
              const Icon = PROBLEM_ICONS[item.icon];
              return (
                <div key={item.text}>
                  <div className="flex items-center gap-[0.833vw] py-[0.833vw]">
                    <div className="w-[2.5vw] h-[2.5vw] rounded-[0.625vw] bg-white flex items-center justify-center shrink-0 shadow-sm">
                      {Icon && <Icon className="text-rule-rejected w-[1.25vw] h-[1.25vw]" />}
                    </div>
                    <span className="text-[0.833vw] leading-[1.625] text-text-primary">
                      {item.text}
                    </span>
                  </div>
                  {i < problems.length - 1 && (
                    <div className="border-t border-dashed border-text-hint" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Solutions column */}
        <div ref={solutionsRef} className="flex-1 flex gap-[1.25vw]">
          <div className="flex items-center">
            <span className="text-[1.25vw] leading-[1.667] text-rule-passed font-normal [writing-mode:vertical-lr] rotate-180">
              Our Solution
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-0">
            <h3 className="text-[1.667vw] leading-[1.5] text-text-primary font-normal mb-[1.25vw]">
              We help you dress with confidence
            </h3>
            <div className="border-t border-text-hint mb-[0.417vw]" />
            {solutions.map((item, i) => {
              const Icon = SOLUTION_ICONS[item.icon];
              return (
                <div key={item.text}>
                  <div className="flex items-center gap-[0.833vw] py-[0.833vw]">
                    <div className="w-[2.5vw] h-[2.5vw] rounded-[0.625vw] bg-white flex items-center justify-center shrink-0 shadow-sm">
                      {Icon && <Icon className="text-landing-solution-green w-[1.25vw] h-[1.25vw]" />}
                    </div>
                    <span className="text-[0.833vw] leading-[1.625] text-text-primary">
                      {item.text} → <span className="text-text-body">{item.highlight}</span>
                    </span>
                  </div>
                  {i < solutions.length - 1 && (
                    <div className="border-t border-dashed border-text-hint" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
