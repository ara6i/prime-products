"use client";

import Image from "next/image";
import { CheckIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlItem,
  SegmentedControlDivider,
} from "@/app/shared/components/ui";
import { FULL_BODY_MODELS, CLOSE_UP_MODELS } from "@/app/try-on/data/models";
import type { BodyType } from "@/app/try-on/types";

interface ChooseModelTabProps {
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  previewModelId: string | null;
  onPreviewModelSelect: (id: string) => void;
  onSaveModel: () => void;
}

export function ChooseModelTab({
  bodyType,
  onBodyTypeChange,
  previewModelId,
  onPreviewModelSelect,
  onSaveModel,
}: ChooseModelTabProps) {
  const modelsToDisplay = bodyType === "full-body" ? FULL_BODY_MODELS : CLOSE_UP_MODELS;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[0.833vw] self-stretch">
      <p className="shrink-0 text-[0.729vw] leading-[1.57] text-text-primary">
        No photo needed.
        <br />
        Choose from our models and see how outfits look instantly:
      </p>

      <div className="shrink-0">
        <SegmentedControl
          value={bodyType}
          onValueChange={(v) => onBodyTypeChange(v as BodyType)}
        >
          <SegmentedControlList>
            <SegmentedControlItem value="full-body">Full Body</SegmentedControlItem>
            <SegmentedControlDivider />
            <SegmentedControlItem value="close-up">Close-up</SegmentedControlItem>
          </SegmentedControlList>
        </SegmentedControl>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-[0.625vw] self-stretch">
          {modelsToDisplay.map((model) => (
            <Button
              key={model.id}
              variant="ghost"
              onClick={() => onPreviewModelSelect(model.id)}
              className={`h-auto w-full overflow-hidden p-0 transition-all md:!h-auto md:!p-0 ${
                bodyType === "close-up" ? "aspect-[2/3]" : "aspect-[4/5]"
              } ${
                bodyType === "close-up" ? "rounded-[1.042vw]" : "rounded-[0.833vw]"
              } ${
                previewModelId === model.id
                  ? "border-[3px] border-tab-active"
                  : "border-[3px] border-transparent"
              }`}
            >
              <Image
                src={model.src}
                alt={model.alt}
                width={148}
                height={bodyType === "close-up" ? 222 : 185}
                className={`h-full w-full ${
                  bodyType === "close-up" ? "object-cover" : "object-contain"
                }`}
              />
            </Button>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        disabled={!previewModelId}
        className="shrink-0 self-start"
        onClick={onSaveModel}
      >
        <CheckIcon size={16} color="white" className="!w-[0.833vw] !h-[0.833vw]" />
        <span className="text-[0.729vw] leading-[1.57] text-white">
          Save as Model
        </span>
      </Button>
    </div>
  );
}
