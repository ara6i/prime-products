"use client";

import { useMemo } from "react";
import type {
  IntelligentOutfit,
  StylistTryOnBatchState,
} from "@/app/ai-stylist/types";
import { StylistTryOnBatchView } from "@/app/ai-stylist/components/desktop/StylistTryOnBatchView";
import { MobileStylistStage } from "./MobileStylistStage";

interface MobileTryOnWorkspaceProps {
  batch: StylistTryOnBatchState;
  outfits: IntelligentOutfit[];
  onBack: () => void;
  onReset: () => void;
  onEditModel: () => void;
}

export function MobileTryOnWorkspace({
  batch,
  outfits,
  onBack,
  onReset,
  onEditModel,
}: MobileTryOnWorkspaceProps) {
  const slotImages = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const job = batch.jobs[index];
        return job?.discStatus === "completed" && job.discImageUrl
          ? job.discImageUrl
          : null;
      }),
    [batch.jobs],
  );

  return (
    <div className="flex flex-col gap-3 pb-4">
      <MobileStylistStage
        slotImages={slotImages}
        onReset={onReset}
        onEditModel={onEditModel}
      />
      <div className="flex min-h-[560px] overflow-hidden rounded-[20px] border border-[#e1dfe6] bg-white">
        <StylistTryOnBatchView
          batch={batch}
          outfits={outfits}
          onBack={onBack}
          onReset={onReset}
        />
      </div>
    </div>
  );
}
