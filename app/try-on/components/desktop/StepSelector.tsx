"use client";

import { PaletteIcon, ApparelIcon } from "@/app/shared/components/icons";
import { StepTabs, StepTabsList, StepTabsTrigger } from "@/app/shared/components/ui";
import type { Step } from "@/app/try-on/types";

interface StepSelectorProps {
  activeStep: Step;
  onStepChange: (step: Step) => void;
}

export function StepSelector({ activeStep, onStepChange }: StepSelectorProps) {
  const isChooseModel = activeStep === "choose-model";
  const isTryOn = activeStep === "try-on";

  return (
    <StepTabs value={activeStep} onValueChange={(v) => onStepChange(v as Step)}>
      <StepTabsList>
        {/* Choose Model step */}
        <StepTabsTrigger value="choose-model">
          <PaletteIcon
            size={24}
            color={isChooseModel ? "var(--brand-blue)" : "var(--surface-disabled)"}
            className="!w-[1.25vw] !h-[1.25vw]"
          />
          <span
            className={`text-[0.833vw] font-normal leading-[1.625] ${
              isChooseModel ? "text-brand-blue" : "text-surface-disabled"
            }`}
          >
            Choose Model
          </span>
        </StepTabsTrigger>

        {/* Try on step */}
        <StepTabsTrigger value="try-on">
          <ApparelIcon
            size={24}
            color={isTryOn ? "var(--brand-blue)" : "var(--surface-disabled)"}
            className="!w-[1.25vw] !h-[1.25vw]"
          />
          <span
            className={`text-[0.833vw] font-normal leading-[1.625] ${
              isTryOn ? "text-brand-blue" : "text-surface-disabled"
            }`}
          >
            Try on
          </span>
        </StepTabsTrigger>
      </StepTabsList>
    </StepTabs>
  );
}
