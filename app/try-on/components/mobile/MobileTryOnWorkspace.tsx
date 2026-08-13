"use client";

import { useCallback, useRef, useState } from "react";
import { ModelPreview } from "./ModelPreview";
import { MobileTryOnCatalog } from "./MobileTryOnCatalog";
import { estimateTokenCost } from "@/app/try-on/hooks/useTryOn";
import type { useCatalogPanel } from "@/app/try-on/hooks/useCatalogPanel";
import type {
  TryOnProductDetail,
  TryOnStatus,
} from "@/app/try-on/types";

interface MobileTryOnWorkspaceProps {
  modelImageUrl: string;
  selectedProducts: TryOnProductDetail[];
  tryOnProductIds: string[];
  tryOnStatus: TryOnStatus;
  resultImageUrl: string | null;
  tryOnError: string | null;
  catalog: Omit<ReturnType<typeof useCatalogPanel>, "sentinelRef">;
  catalogSentinelRef: ReturnType<typeof useCatalogPanel>["sentinelRef"];
  onRefresh: () => void;
  onChooseModel: () => void;
  onViewPieces: () => void;
  onToggleTryOn: (
    productId: string,
    details?: TryOnProductDetail,
  ) => void;
  onGenerate: () => void;
}

export function MobileTryOnWorkspace({
  modelImageUrl,
  selectedProducts,
  tryOnProductIds,
  tryOnStatus,
  resultImageUrl,
  tryOnError,
  catalog,
  catalogSentinelRef,
  onRefresh,
  onChooseModel,
  onViewPieces,
  onToggleTryOn,
  onGenerate,
}: MobileTryOnWorkspaceProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [showCompactModel, setShowCompactModel] = useState(false);

  const displayedImageUrl =
    tryOnStatus === "completed" && resultImageUrl
      ? resultImageUrl
      : modelImageUrl;

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const heroHeight = heroRef.current?.offsetHeight ?? 536;
      const shouldCompact = event.currentTarget.scrollTop >= heroHeight + 4;
      setShowCompactModel((current) =>
        current === shouldCompact ? current : shouldCompact,
      );
    },
    [],
  );

  const showFullModel = useCallback(() => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div ref={heroRef} className="shrink-0">
        <ModelPreview
          hasModel
          modelImageUrl={modelImageUrl}
          selectedProducts={selectedProducts}
          tryOnStatus={tryOnStatus}
          resultImageUrl={resultImageUrl}
          tryOnError={tryOnError}
          onRefresh={onRefresh}
          onViewPieces={onViewPieces}
          onChooseModel={onChooseModel}
          className="h-[536px] w-full shrink-0"
        />
      </div>

      <div className="mt-2 flex shrink-0 flex-col">
        <div
          className={`sticky top-0 z-30 overflow-hidden bg-white transition-[height,margin,opacity] duration-200 ${
            showCompactModel
              ? "mb-2 h-[96px] opacity-100"
              : "pointer-events-none h-0 opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={showFullModel}
            aria-label="View current model full size"
            className="flex h-[96px] w-full items-center gap-2 rounded-[10px] bg-[#f5f5f6] p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2154ef]"
          >
            <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[8px] bg-[#cbcacf]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayedImageUrl}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            </span>
            <span className="flex min-w-0 flex-col gap-2">
              <strong className="text-[16px] font-bold leading-[26px] text-[#1c1d1e]">
                Current model
              </strong>
              <span className="text-[14px] leading-[22px] text-[#343538]">
                Tap to view model full size
              </span>
            </span>
          </button>
        </div>

        <MobileTryOnCatalog
          catalog={catalog}
          sentinelRef={catalogSentinelRef}
          tryOnProductIds={tryOnProductIds}
          onToggleTryOn={onToggleTryOn}
          onGenerate={onGenerate}
          onViewPieces={onViewPieces}
          isGenerating={tryOnStatus === "generating"}
          tokenCost={estimateTokenCost(tryOnProductIds.length)}
        />
      </div>
    </div>
  );
}
