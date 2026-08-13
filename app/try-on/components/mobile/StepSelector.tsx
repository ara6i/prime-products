import { PaletteIcon, ApparelIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { Step } from "@/app/try-on/types";

interface StepSelectorProps {
  activeStep: Step;
  onStepChange: (step: Step) => void;
}

export function StepSelector({ activeStep, onStepChange }: StepSelectorProps) {
  const isChooseModel = activeStep === "choose-model";
  const isTryOn = activeStep === "try-on";

  return (
    <div className="flex h-[46px] shrink-0 items-center rounded-[100px] bg-[#f6f6f6] p-[4px]">
      <Button
        variant="ghost"
        onClick={() => onStepChange("choose-model")}
        className={`flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[300px] px-0 py-0 transition-colors ${
          isChooseModel
            ? "bg-[#dae7ff] text-[#2154ef] hover:bg-[#dae7ff]"
            : "bg-transparent text-[#434547] hover:bg-transparent"
        }`}
      >
        <PaletteIcon
          size={20}
          color={isChooseModel ? "#2154ef" : "#434547"}
        />
        <span className="text-[14px] font-medium leading-[1.4]">
          Choose Model
        </span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => onStepChange("try-on")}
        className={`flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[300px] px-0 py-0 transition-colors ${
          isTryOn
            ? "bg-[#dae7ff] text-[#2154ef] hover:bg-[#dae7ff]"
            : "bg-transparent text-[#434547] hover:bg-transparent"
        }`}
      >
        <ApparelIcon
          size={20}
          color={isTryOn ? "#2154ef" : "#434547"}
        />
        <span className="text-[14px] font-medium leading-[1.4]">
          Try on
        </span>
      </Button>
    </div>
  );
}
