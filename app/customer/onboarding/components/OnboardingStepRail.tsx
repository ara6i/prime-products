import { Check, Circle, Lock } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { OnboardingStepId, OnboardingStepViewModel } from "../types";

interface OnboardingStepRailProps {
  steps: OnboardingStepViewModel[];
  activeStepId: OnboardingStepId;
  onStepSelect: (stepId: OnboardingStepId) => void;
}

export function OnboardingStepRail({
  steps,
  activeStepId,
  onStepSelect,
}: OnboardingStepRailProps) {
  return (
    <nav aria-label="Merchant setup steps" className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
          Setup progress
        </p>
        <p className="mt-2 max-w-[240px] text-sm leading-[1.65] text-text-body">
          Complete one step at a time. The next step unlocks only when it is ready.
        </p>
      </div>

      <ol className="relative space-y-6">
        <span
          className="absolute left-5 top-5 h-[calc(100%-40px)] w-px bg-brand-blue/14"
          aria-hidden
        />
        {steps.map((step) => {
          const active = step.id === activeStepId;
          const complete = step.status === "complete";
          const locked = step.status === "locked";
          const Icon = complete ? Check : locked ? Lock : Circle;

          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                onClick={() => onStepSelect(step.id)}
                disabled={locked}
                aria-current={active ? "step" : undefined}
                className="group flex w-full gap-4 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white transition-colors",
                    active && "border-brand-blue bg-brand-blue text-white",
                    complete && !active && "border-brand-blue/20 text-brand-blue",
                    !complete && !locked && !active && "border-brand-blue/18 text-brand-blue",
                    locked && "border-gray-200 text-text-hint",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>

                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
                      active ? "text-brand-blue" : "text-text-hint",
                    )}
                  >
                    {active ? "Now" : step.label}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-sm font-semibold leading-tight transition-colors",
                      active ? "text-text-primary" : "text-text-body group-hover:text-brand-blue",
                      locked && "text-text-hint group-hover:text-text-hint",
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
