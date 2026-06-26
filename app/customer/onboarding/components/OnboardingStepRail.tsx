import { Check, Lock } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { OnboardingStepId, OnboardingStepViewModel } from "../types";

interface OnboardingStepRailProps {
  steps: OnboardingStepViewModel[];
  activeStepId: OnboardingStepId;
  onStepSelect: (stepId: OnboardingStepId) => void;
  compact?: boolean;
}

export function OnboardingStepRail({
  steps,
  activeStepId,
  onStepSelect,
  compact = false,
}: OnboardingStepRailProps) {
  if (compact) {
    const activeIndex = Math.max(steps.findIndex((step) => step.id === activeStepId), 0);
    const activeStep = steps[activeIndex] ?? steps[0];
    const progress = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 100;

    return (
      <nav aria-label="Merchant setup steps" className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
              Step {activeIndex + 1} of {steps.length}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[#111827]">
              {activeStep?.title}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[#dbe6f5] bg-white px-2.5 py-1 text-xs font-semibold text-[#667085]">
            {activeStep?.status === "complete" ? "Done" : activeStep?.status === "locked" ? "Locked" : "Current"}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[#e6edf7]" aria-hidden>
          <div
            className="h-full rounded-full bg-brand-blue transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="grid grid-cols-5 gap-2">
          {steps.map((step, index) => {
            const active = step.id === activeStepId;
            const locked = step.status === "locked";

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onStepSelect(step.id)}
                  disabled={locked}
                  aria-label={step.title}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "h-2.5 w-full rounded-full transition-colors disabled:cursor-not-allowed",
                    index <= activeIndex ? "bg-brand-blue" : "bg-[#d9e1ec]",
                    locked && "bg-[#e6edf7]",
                  )}
                />
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Merchant setup steps"
      className="space-y-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#475467]">
          Setup checklist
        </p>
        <p
          className="mt-2 max-w-[250px] text-sm leading-6 text-[#667085]"
        >
          Complete each requirement before generating production credentials.
        </p>
      </div>

      <ol className="relative space-y-3">
        <span
          className="absolute left-[13px] top-5 h-[calc(100%-40px)] w-px bg-[#dbe6f5]"
          aria-hidden
        />
        {steps.map((step) => {
          const active = step.id === activeStepId;
          const complete = step.status === "complete";
          const locked = step.status === "locked";

          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                onClick={() => onStepSelect(step.id)}
                disabled={locked}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex w-full text-left disabled:cursor-not-allowed",
                  "items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/70",
                  active && "bg-white",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white text-[11px] font-semibold transition-colors",
                    active && "border-brand-blue bg-brand-blue text-white",
                    complete && !active && "border-brand-blue bg-brand-blue text-white",
                    !complete && !locked && !active && "border-[#c9d8ef] text-brand-blue",
                    locked && "border-[#d9e1ec] text-[#98a2b3]",
                  )}
                >
                  {complete ? <Check className="h-3.5 w-3.5" aria-hidden /> : locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : step.label}
                </span>

                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block text-[10px] font-semibold uppercase tracking-[0.14em]",
                      active ? "text-brand-blue" : "text-[#98a2b3]",
                    )}
                  >
                    {active ? "Current" : complete ? "Done" : locked ? "Locked" : "Ready"}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-sm font-semibold leading-tight transition-colors",
                      active ? "text-[#111827]" : "text-[#475467] group-hover:text-[#111827]",
                      locked && "text-[#98a2b3] group-hover:text-[#98a2b3]",
                    )}
                  >
                    {step.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
