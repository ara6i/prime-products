import {
  CameraIcon,
  PeopleIcon,
  GenerateIcon,
  ApparelIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { Step } from "@/app/try-on/types";

interface ActionBarProps {
  activeStep: Step;
  hasModel: boolean;
  selectedItemCount: number;
  tokenCost: number;
  onUploadClick: () => void;
  onChooseModelClick: () => void;
  onGenerate: () => void;
  onViewPieces: () => void;
}

export function ActionBar({
  activeStep,
  hasModel,
  selectedItemCount,
  tokenCost,
  onUploadClick,
  onChooseModelClick,
  onGenerate,
  onViewPieces,
}: ActionBarProps) {
  const isTryOnStep = activeStep === "try-on";
  const canGenerate = isTryOnStep && hasModel && selectedItemCount > 0;

  if (isTryOnStep) {
    return (
      <div className="flex h-[66px] shrink-0 items-center gap-2 rounded-[100px] bg-[#dae7ff] p-2">
        <Button
          variant="primary"
          size="default"
          className="h-[50px] flex-1"
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          <GenerateIcon size={20} color="white" />
          <span className="text-[16px] text-white">Generate</span>
          {canGenerate && (
            <span className="flex h-6 items-center gap-1 rounded-[11px] bg-warning-bg px-1 py-0.5">
              <span className="text-[12px] font-normal leading-[1.667] text-warning-text">
                {tokenCost}
              </span>
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          size="default"
          className="h-[50px] flex-1"
          onClick={onViewPieces}
        >
          <ApparelIcon size={20} color="var(--brand-blue)" />
          <span className="text-[14px] text-brand-blue">
            View Pieces ({selectedItemCount})
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[66px] shrink-0 items-center gap-2 rounded-[100px] bg-[#dae7ff] p-2">
      <Button
        variant="primary"
        size="default"
        className="h-[50px] flex-1"
        onClick={onUploadClick}
      >
        <CameraIcon size={20} color="white" />
        <span className="text-[16px] text-white">Upload</span>
      </Button>

      <Button
        variant="primary"
        size="default"
        className="h-[50px] flex-1"
        onClick={onChooseModelClick}
      >
        <PeopleIcon size={20} color="white" />
        <span className="text-[16px] text-white">Choose Model</span>
      </Button>
    </div>
  );
}
