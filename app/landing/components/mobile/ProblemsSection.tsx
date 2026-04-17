import {
  Layers,
  Ruler,
  ClockAlert,
  Shirt,
  MessageCircleQuestion,
  SwatchBook,
  Puzzle,
  Sparkles,
} from "lucide-react";
import type { ProblemItem, SolutionItem } from "@/app/landing/types";

interface ProblemsSectionProps {
  problems: ProblemItem[];
  solutions: SolutionItem[];
}

const PROBLEM_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  layers: Layers,
  ruler: Ruler,
  "clock-alert": ClockAlert,
  shirt: Shirt,
};

const SOLUTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> =
  {
    "message-circle-question": MessageCircleQuestion,
    "swatch-book": SwatchBook,
    puzzle: Puzzle,
    sparkles: Sparkles,
  };

export function ProblemsSection({ problems, solutions }: ProblemsSectionProps) {
  return (
    <section className="flex flex-col gap-16 px-7 py-16">
      {/* Problems */}
      <div className="flex items-end gap-0">
        {/* Side label */}
        <div className="flex shrink-0 flex-col items-center justify-center self-stretch px-1">
          <div className="-rotate-90 whitespace-nowrap text-[24px] font-medium leading-[40px] text-rule-rejected">
            Problems
          </div>
        </div>
        {/* Vertical line */}
        <div className="mr-4 w-px self-stretch bg-rule-rejected opacity-30" />
        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="pb-9 text-[32px] font-bold leading-[48px] text-text-primary">
            Getting dressed shouldn&apos;t be this hard
          </h3>
          <div className="flex flex-col divide-y divide-dashed divide-text-hint">
            {problems.map((item) => {
              const Icon = PROBLEM_ICONS[item.icon];
              return (
                <div key={item.text} className="flex flex-col gap-6 p-6">
                  {Icon && <Icon size={48} className="text-rule-rejected" />}
                  <span className="text-[20px] font-medium leading-[34px] text-text-primary">
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Solutions */}
      <div className="flex items-end gap-0">
        {/* Side label */}
        <div className="flex shrink-0 flex-col items-center justify-center self-stretch px-1">
          <div className="-rotate-90 whitespace-nowrap text-[24px] font-medium leading-[40px] text-landing-solution-green">
            Our Solution
          </div>
        </div>
        {/* Vertical line */}
        <div className="mr-4 w-px self-stretch bg-landing-solution-green opacity-30" />
        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="pb-9 text-[32px] font-bold leading-[48px] text-text-primary">
            We help you dress with confidence
          </h3>
          <div className="flex flex-col divide-y divide-dashed divide-text-hint">
            {solutions.map((item) => {
              const Icon = SOLUTION_ICONS[item.icon];
              return (
                <div key={item.text} className="flex flex-col gap-6 p-6">
                  {Icon && <Icon size={48} className="text-landing-solution-green" />}
                  <span className="text-[20px] font-medium leading-[34px] text-text-primary">
                    {item.text} → {item.highlight}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
