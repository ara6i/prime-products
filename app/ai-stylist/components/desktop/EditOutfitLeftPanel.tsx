"use client";

import { useMemo } from "react";
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlItem,
} from "@/app/shared/components/ui";
import { SettingsIcon, TryOnIcon } from "@/app/shared/components/icons";
import { useTurntableRotation } from "@/app/ai-stylist/hooks/useTurntableRotation";
import { DiscCanvas, DISC_DEFAULTS, type DiscConfig } from "./DiscCanvas";
import { ModelCarousel } from "./ModelCarousel";
import { GlassResetButton, NavigationControls, BottomActionBar } from "./PlatformOverlays";

/* ─── Types ─── */

interface EditOutfitLeftPanelProps {
  outfitImages: string[];
  currentIndex: number;
  totalOutfits: number;
  segmentTab: "edit-model" | "try-on";
  outfitItemCount: number;
  discConfig?: DiscConfig;
  onSegmentChange: (tab: "edit-model" | "try-on") => void;
  onNavigate: (direction: "prev" | "next") => void;
  onSelectOutfit: (index: number) => void;
  onReset: () => void;
}

/* ─── Main Component ─── */

export function EditOutfitLeftPanel({
  outfitImages,
  currentIndex,
  totalOutfits,
  segmentTab,
  outfitItemCount,
  discConfig,
  onSegmentChange,
  onNavigate,
  onSelectOutfit,
  onReset,
}: EditOutfitLeftPanelProps) {
  const hasImages = useMemo(
    () => outfitImages.some((url) => url.length > 0),
    [outfitImages]
  );

  const { rotationRef, isDragging, pointerHandlers } = useTurntableRotation({
    modelCount: outfitImages.length,
    selectedIndex: currentIndex,
    onIndexChange: onSelectOutfit,
  });

  const segmentIconColor = (tab: string) =>
    segmentTab === tab ? "white" : "currentColor";

  return (
    <div className="flex w-1/2 min-w-0 shrink-0 flex-col gap-[0.625vw] self-stretch">
      {/* Segmented Control */}
      <SegmentedControl
        value={segmentTab}
        onValueChange={(v) => onSegmentChange(v as "edit-model" | "try-on")}
      >
        <SegmentedControlList className="rounded-[0.729vw] bg-white p-[0.208vw]">
          <SegmentedControlItem
            value="edit-model"
            className="gap-[0.313vw] rounded-[0.521vw] py-[0.521vw] text-[0.729vw] font-medium text-text-muted data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <SettingsIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color={segmentIconColor("edit-model")} />
            Edit Model
          </SegmentedControlItem>
          <SegmentedControlItem
            value="try-on"
            className="gap-[0.313vw] rounded-[0.521vw] py-[0.521vw] text-[0.729vw] font-medium text-text-muted data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <TryOnIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color={segmentIconColor("try-on")} />
            Try on
          </SegmentedControlItem>
        </SegmentedControlList>
      </SegmentedControl>

      {/* Platform Preview Container */}
      <div
        className="relative flex flex-1 flex-col overflow-hidden rounded-[1.042vw] border border-border-light"
        style={{
          backgroundImage: "url('/images/ai-stylist/Gemini_Generated_Image_fjyzt7fjyzt7fjyz.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Disc — Three.js canvas */}
        <div
          className="pointer-events-none absolute left-1/2 z-[2] -translate-x-1/2"
          style={{ bottom: 0, width: "100%", height: "100%" }}
        >
          <DiscCanvas rotationRef={rotationRef} isDragging={isDragging} config={discConfig} />
        </div>

        {/* Floor shadow under disc */}
        <div
          className="pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2"
          style={{
            bottom: "10%",
            width: "80%",
            height: "4%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Drag interaction surface */}
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "pan-y" }}
          onPointerDown={pointerHandlers.onPointerDown}
          onPointerMove={pointerHandlers.onPointerMove}
          onPointerUp={pointerHandlers.onPointerUp}
          onPointerCancel={pointerHandlers.onPointerUp}
        />

        {/* Model images — each appears as its transparent version arrives */}
        {hasImages && (
          <div className="pointer-events-none absolute inset-0 z-20">
            <ModelCarousel
              images={outfitImages}
              rotationRef={rotationRef}
              modelBottom={discConfig?.modelBottom ?? DISC_DEFAULTS.modelBottom}
              modelSpread={discConfig?.modelSpread ?? DISC_DEFAULTS.modelSpread}
              modelSize={discConfig?.modelSize ?? DISC_DEFAULTS.modelSize}
            />
          </div>
        )}

        {/* UI overlays */}
        <div className="pointer-events-none absolute inset-0 z-30">
          <div className="pointer-events-auto">
            <GlassResetButton onReset={onReset} />
          </div>
        </div>
        <NavigationControls
          currentIndex={currentIndex}
          totalOutfits={totalOutfits}
          onNavigate={onNavigate}
        />
        <BottomActionBar outfitItemCount={outfitItemCount} />
      </div>
    </div>
  );
}
