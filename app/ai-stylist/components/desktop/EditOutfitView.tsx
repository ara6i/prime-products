"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { OutfitSuggestion, ReplacementProduct } from "@/app/ai-stylist/types";
import { useEditOutfit } from "@/app/ai-stylist/hooks/useEditOutfit";
import * as stylistService from "@/app/ai-stylist/services/stylist.service";
import { EditOutfitLeftPanel } from "./EditOutfitLeftPanel";
import { EditOutfitRightPanel } from "./EditOutfitRightPanel";
import { DISC_DEFAULTS, type DiscConfig } from "./DiscCanvas";

interface EditOutfitViewProps {
  outfit: OutfitSuggestion;
  allOutfits?: OutfitSuggestion[];
  conversationId?: string | null;
  onBack: () => void;
  onNewChat: () => void;
  userInitials?: string;
  userPhotoUrl?: string | null;
}

export function EditOutfitView({
  outfit,
  allOutfits,
  conversationId,
  userInitials,
  userPhotoUrl,
}: EditOutfitViewProps) {
  const [discConfig, setDiscConfig] = useState<DiscConfig>(DISC_DEFAULTS);

  const {
    outfit: currentOutfit,
    outfitImages,
    currentIndex,
    totalOutfits,
    segmentTab,
    outfitItemIds,
    outfitItemCount,
    setSegmentTab,
    navigateOutfit,
    selectOutfit,
    addItem,
    removeItem,
    resetOutfit,
  } = useEditOutfit(outfit, allOutfits);

  // Check if all outfits have transparent images
  const allTransparentReady = useMemo(() => {
    const outfits = allOutfits ?? [outfit];
    return outfits.every((o) => o.transparentImageUrl || !o.imageUrl);
  }, [allOutfits, outfit]);
  const isProcessingBg = Boolean(conversationId) && !allTransparentReady;

  // Trigger background removal on mount if needed
  useEffect(() => {
    if (!conversationId || allTransparentReady) return;

    void stylistService.processTransparentImages(conversationId).catch(() => {});
  }, [allTransparentReady, conversationId]);

  const handleToggleTryOn = useCallback(
    (productId: string) => {
      if (outfitItemIds.has(productId)) {
        removeItem(productId);
      } else {
        addItem(productId);
      }
    },
    [outfitItemIds, addItem, removeItem]
  );

  const handleAddReplacementItem = useCallback(
    (product: ReplacementProduct) => {
      addItem(product.id);
    },
    [addItem]
  );

  return (
    <div className="relative flex min-h-0 flex-1 gap-[0.625vw] self-stretch">
      <EditOutfitLeftPanel
        outfitImages={outfitImages}
        currentIndex={currentIndex}
        totalOutfits={totalOutfits}
        segmentTab={segmentTab}
        outfitItemCount={outfitItemCount}
        discConfig={discConfig}
        onSegmentChange={setSegmentTab}
        onNavigate={navigateOutfit}
        onSelectOutfit={selectOutfit}
        onReset={resetOutfit}
      />
      <EditOutfitRightPanel
        tryOnProductIds={Array.from(outfitItemIds)}
        onToggleTryOn={handleToggleTryOn}
        outfitItems={currentOutfit.items}
        onAddItem={handleAddReplacementItem}
        userInitials={userInitials}
        userPhotoUrl={userPhotoUrl}
        discConfig={discConfig}
        onDiscConfigChange={setDiscConfig}
      />

      {/* Full-page blur overlay while background removal is processing */}
      {isProcessingBg && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center rounded-[1.042vw]"
          style={{ backdropFilter: "blur(0.521vw)", background: "rgba(255,255,255,0.25)" }}
        >
          <div className="flex flex-col items-center gap-[0.833vw] rounded-[0.833vw] bg-white/80 px-[2.083vw] py-[1.458vw] shadow-xl backdrop-blur-sm">
            <div className="relative flex h-[2.917vw] w-[2.917vw] items-center justify-center">
              <div className="absolute h-[2.917vw] w-[2.917vw] animate-spin rounded-full border-[0.156vw] border-neutral-200 border-t-brand-blue" />
              <svg width="1.25vw" height="1.25vw" viewBox="0 0 24 24" fill="none" className="relative">
                <path d="M20.38 3.46L16 2L12.34 8.38C12.13 8.75 11.72 9 11.28 9H8L4 12L8 15H11.28C11.72 15 12.13 15.25 12.34 15.62L16 22L20.38 20.54" stroke="var(--brand-blue)" strokeWidth="0.078vw" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex flex-col items-center gap-[0.208vw]">
              <span className="text-[0.833vw] font-semibold text-text-primary">
                Preparing outfits for platform
              </span>
              <span className="text-[0.729vw] text-text-muted">
                Removing backgrounds — models will appear as they&apos;re ready
              </span>
            </div>
            <div className="h-[0.313vw] w-[10.833vw] overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-brand-blue"
                style={{ animation: "bgProgress 4s ease-in-out infinite" }}
              />
            </div>
            <style>{`
              @keyframes bgProgress {
                0% { width: 5%; }
                50% { width: 75%; }
                100% { width: 95%; }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
