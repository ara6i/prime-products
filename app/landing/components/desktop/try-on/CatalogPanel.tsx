"use client";

import { TShirtIcon, JeansIcon, ShoeIcon, GenerateIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { LandingProductCard } from "./LandingProductCard";
import type { LandingProduct, LandingClothingCategory, TryOnPhase } from "@/app/landing/types/try-on";

interface CatalogPanelProps {
  products: LandingProduct[];
  activeCategory: LandingClothingCategory;
  tryOnProductIds: Set<string>;
  phase: TryOnPhase;
  canGenerate: boolean;
  onCategoryChange: (category: LandingClothingCategory) => void;
  onTryOn: (id: string) => void;
  onGenerate: () => void;
}

const CATEGORIES: { id: LandingClothingCategory; icon: typeof TShirtIcon; label: string }[] = [
  { id: "upper-body", icon: TShirtIcon, label: "Tops" },
  { id: "lower-body", icon: JeansIcon, label: "Bottoms" },
  { id: "shoes", icon: ShoeIcon, label: "Shoes" },
];

export function CatalogPanel({
  products,
  activeCategory,
  tryOnProductIds,
  phase,
  canGenerate,
  onCategoryChange,
  onTryOn,
  onGenerate,
}: CatalogPanelProps) {
  const filteredProducts = products;
  const isGenerating = phase === "generating";
  const isDisabled = isGenerating || phase === "complete" || phase === "already_used";

  return (
    <div className="flex flex-1 flex-col items-stretch">
      <div className="flex items-end self-stretch">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant="ghost"
              onClick={() => onCategoryChange(cat.id)}
              disabled={isDisabled}
              className={`flex h-[2.708vw] w-[2.708vw] items-center justify-center gap-[0.208vw] rounded-t-[0.208vw] rounded-b-none border-[0.5px] px-[0.625vw] py-[0.417vw] transition-colors ${
                isActive
                  ? "border-input-border border-b-0 bg-white hover:bg-white"
                  : "border-input-border bg-surface-light hover:bg-surface-muted"
              }`}
            >
              <Icon
                size={28}
                className="!w-[1.458vw] !h-[1.458vw]"
                color={isActive ? "var(--text-primary)" : "var(--text-secondary)"}
              />
            </Button>
          );
        })}

        <div className="flex-1 border-b-[0.5px] border-input-border" />

        <div className="relative pb-[0.365vw]">
          <Button
            variant="primary"
            size="sm"
            className="h-[1.979vw] px-[0.625vw] text-[0.729vw] rounded-[52.083vw]"
            onClick={onGenerate}
            disabled={!canGenerate || isDisabled}
          >
            {isGenerating ? (
              <>
                <span className="h-[0.833vw] w-[0.833vw] animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating…
              </>
            ) : (
              <>
                <GenerateIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
                Generate Outfit
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-[0.625vw] self-stretch rounded-b-[1.042vw] rounded-tr-[1.042vw] border-[0.5px] border-t-0 border-input-border bg-white p-[0.625vw]">
        <div className="flex flex-wrap gap-[0.625vw] self-stretch">
          {filteredProducts.map((product) => (
            <LandingProductCard
              key={product.id}
              product={product}
              isActive={tryOnProductIds.has(product.id)}
              disabled={isDisabled}
              onTryOn={onTryOn}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
