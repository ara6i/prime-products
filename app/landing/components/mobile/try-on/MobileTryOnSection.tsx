"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLandingTryOn } from "@/app/landing/hooks/useLandingTryOn";
import { MobileModelPanel } from "./MobileModelPanel";
import { MobileCatalogPanel } from "./MobileCatalogPanel";
import { Button } from "@/app/shared/components/ui";
import { ArrowRightIcon, StarIcon } from "@/app/shared/components/icons";

export function MobileTryOnSection() {
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
    <div className="flex w-full flex-col gap-3 rounded-[20px] bg-search-bg p-3">
      <p className="text-center text-sm text-text-primary">
        See how clothes look on you — before you buy
      </p>

      <MobileModelPanel
        models={models}
        selectedModelId={selectedModelId}
        uploadedImage={uploadedImage}
        phase={phase}
        resultImageUrl={resultImageUrl}
        onModelSelect={handleModelSelect}
        onImageUpload={handleImageUpload}
      />

      <MobileCatalogPanel
        products={products}
        activeCategory={activeCategory}
        tryOnProductIds={tryOnProductIds}
        phase={phase}
        canGenerate={canGenerate}
        onCategoryChange={handleCategoryChange}
        onTryOn={handleTryOn}
        onGenerate={handleGenerate}
      />

      {/* Save CTA */}
      <div
        className={`overflow-hidden transition-all duration-600 ease-out ${
          showCta ? "max-h-56 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className={`relative overflow-hidden rounded-[16px] transition-all duration-600 ease-out ${
            ctaVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3fd4] via-brand-blue to-[#7258fa]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(114,88,250,0.4),transparent_60%)]" />
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/[0.06] blur-2xl" />

          <div className="relative flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.12]">
                <StarIcon size={16} color="white" />
              </div>
              <div className="flex flex-col gap-0.5">
                {phase === "complete" ? (
                  <>
                    <span className="text-sm font-semibold text-white">Love this look?</span>
                    <span className="text-xs text-white/75">
                      Sign up free to save it and try unlimited outfits.
                    </span>
                  </>
                ) : phase === "already_used" ? (
                  <>
                    <span className="text-sm font-semibold text-white">Want more try-ons?</span>
                    <span className="text-xs text-white/75">
                      Sign up for unlimited virtual try-ons.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-white">Try again with an account</span>
                    <span className="text-xs text-white/75">
                      Sign up for unlimited try-ons and better results.
                    </span>
                  </>
                )}
              </div>
            </div>
            <Link href="/auth" className="block">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 rounded-full bg-white font-medium text-brand-blue shadow-lg shadow-black/10 hover:bg-white hover:shadow-xl"
              >
                Save My Look
                <ArrowRightIcon size={14} color="var(--brand-blue)" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
