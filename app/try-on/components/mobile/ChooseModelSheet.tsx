"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon } from "@/app/shared/components/icons";
import {
  Button,
  Sheet,
  SheetContent,
} from "@/app/shared/components/ui";
import { FULL_BODY_MODELS } from "@/app/try-on/data/models";

interface ChooseModelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModelId: string | null;
  onModelSelect: (id: string) => void;
}

export function ChooseModelSheet({
  open,
  onOpenChange,
  selectedModelId,
  onModelSelect,
}: ChooseModelSheetProps) {
  const [previewModelId, setPreviewModelId] = useState<string | null>(
    selectedModelId,
  );

  const handleSave = () => {
    if (previewModelId) {
      onModelSelect(previewModelId);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-[20px] px-4 pb-6 pt-4"
      >
        <div className="mb-3 flex items-center justify-center">
          <div className="h-[4px] w-[40px] rounded-full bg-[#d9d9d9]" />
        </div>

        <h3 className="mb-4 text-[16px] font-semibold leading-[1.5] text-text-primary">
          Choose a Model
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {FULL_BODY_MODELS.map((model) => (
            <Button
              key={model.id}
              variant="ghost"
              onClick={() => setPreviewModelId(model.id)}
              className={`h-auto overflow-hidden rounded-[12px] p-0 ${
                previewModelId === model.id
                  ? "ring-[3px] ring-[#2154ef]"
                  : "ring-[3px] ring-transparent"
              }`}
            >
              <Image
                src={model.src}
                alt={model.alt}
                width={110}
                height={140}
                className="h-full w-full object-cover"
              />
            </Button>
          ))}
        </div>

        <div className="mt-4">
          <Button
            variant="primary"
            size="default"
            disabled={!previewModelId}
            className="w-full"
            onClick={handleSave}
          >
            <CheckIcon size={16} color="white" />
            <span className="text-[16px] text-white">Save as Model</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
