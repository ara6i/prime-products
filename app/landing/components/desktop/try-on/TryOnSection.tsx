"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLandingTryOn } from "@/app/landing/hooks/useLandingTryOn";
import { ModelUploadPanel } from "./ModelUploadPanel";
import { CatalogPanel } from "./CatalogPanel";
import { Button } from "@/app/shared/components/ui";
import { ArrowRightIcon, StarIcon } from "@/app/shared/components/icons";

export function TryOnSection() {
  const {
    products,
    models,
    activeCategory,
    selectedModelId,
    tryOnProductIds,
    uploadedImage,
    phase,
    resultImageUrl,
    canGenerate,
    handleCategoryChange,
    handleModelSelect,
    handleTryOn,
    handleImageUpload,
    handleGenerate,
  } = useLandingTryOn();

  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    if (phase === "complete" || phase === "already_used") {
      const id = setTimeout(() => setCtaVisible(true), 400);
      return () => clearTimeout(id);
    }
    setCtaVisible(false);
  }, [phase]);

  const showCta = phase === "complete" || phase === "already_used" || phase === "failed";

  return (
    <div className="flex w-full flex-col items-stretch gap-[0.833vw]">
      <p className="text-center text-[1.042vw] leading-[1.7] text-text-primary">
        See Exactly How Clothes Look On You — Before You Buy.
      </p>

      <div className="flex w-full gap-[0.833vw] rounded-[1.042vw] bg-search-bg p-[0.833vw] shadow-card-elevated">
        <ModelUploadPanel
          models={models}
          selectedModelId={selectedModelId}
          uploadedImage={uploadedImage}
          phase={phase}
          resultImageUrl={resultImageUrl}
          onModelSelect={handleModelSelect}
          onImageUpload={handleImageUpload}
        />
        <CatalogPanel
          products={products}
          activeCategory={activeCategory}
          tryOnProductIds={tryOnProductIds}
          phase={phase}
          canGenerate={canGenerate}
          onCategoryChange={handleCategoryChange}
          onTryOn={handleTryOn}
          onGenerate={handleGenerate}
        />
      </div>

      {/* Save CTA — slides in after result */}
      <div
        className={`overflow-hidden transition-all duration-600 ease-out ${
          showCta ? "max-h-[10.417vw] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className={`relative overflow-hidden rounded-[1.042vw] transition-all duration-600 ease-out ${
            ctaVisible ? "translate-y-0 opacity-100" : "translate-y-[1.25vw] opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3fd4] via-brand-blue to-[#7258fa]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(114,88,250,0.4),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(33,84,239,0.3),transparent_60%)]" />

          <div className="absolute -top-[1.667vw] -right-[1.667vw] h-[6.667vw] w-[6.667vw] rounded-full bg-white/[0.06] blur-2xl" />
          <div className="absolute -bottom-[1.25vw] -left-[1.25vw] h-[5vw] w-[5vw] rounded-full bg-white/[0.04] blur-xl" />

          <div className="relative flex items-center justify-between gap-[1.25vw] px-[1.458vw] py-[1.042vw]">
            <div className="flex items-center gap-[0.833vw]">
              <div className="flex h-[2.083vw] w-[2.083vw] shrink-0 items-center justify-center rounded-full bg-white/[0.12] backdrop-blur-sm">
                <StarIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="white" />
              </div>
              <div className="flex flex-col gap-[0.104vw]">
                {phase === "complete" ? (
                  <>
                    <span className="text-[0.833vw] font-semibold tracking-[-0.01em] text-white">
                      Love this look?
                    </span>
                    <span className="text-[0.729vw] text-white/75">
                      Sign up free to save it, share it, and try unlimited outfits.
                    </span>
                  </>
                ) : phase === "already_used" ? (
                  <>
                    <span className="text-[0.833vw] font-semibold tracking-[-0.01em] text-white">
                      Want more try-ons?
                    </span>
                    <span className="text-[0.729vw] text-white/75">
                      Sign up for unlimited virtual try-ons and save your looks.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[0.833vw] font-semibold tracking-[-0.01em] text-white">
                      Try again with an account
                    </span>
                    <span className="text-[0.729vw] text-white/75">
                      Sign up to get unlimited try-ons and better results.
                    </span>
                  </>
                )}
              </div>
            </div>

            <Link href="/auth" className="shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="gap-[0.313vw] rounded-full bg-white h-[1.979vw] px-[1.042vw] py-[0.417vw] font-medium text-brand-blue text-[0.729vw] leading-[1.146vw] shadow-lg shadow-black/10 transition-all hover:bg-white hover:shadow-xl hover:shadow-black/15"
              >
                Save My Look
                <ArrowRightIcon size={14} className="!w-[0.729vw] !h-[0.729vw]" color="var(--brand-blue)" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
