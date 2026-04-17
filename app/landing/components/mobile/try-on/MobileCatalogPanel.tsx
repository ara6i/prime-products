"use client";

import Image from "next/image";
import { TShirtIcon, JeansIcon, ShoeIcon, GenerateIcon, CheckIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { LandingProduct, LandingClothingCategory, TryOnPhase } from "@/app/landing/types/try-on";

interface MobileCatalogPanelProps {
  products: LandingProduct[];
  activeCategory: LandingClothingCategory;
  tryOnProductIds: Set<string>;
  phase: TryOnPhase;
  canGenerate: boolean;
  onCategoryChange: (cat: LandingClothingCategory) => void;
  onTryOn: (id: string) => void;
  onGenerate: () => void;
}

const CATEGORIES: { id: LandingClothingCategory; icon: typeof TShirtIcon; label: string }[] = [
  { id: "upper-body", icon: TShirtIcon, label: "Tops" },
  { id: "lower-body", icon: JeansIcon, label: "Bottoms" },
  { id: "shoes", icon: ShoeIcon, label: "Shoes" },
];

interface MobileProductCardProps {
  product: LandingProduct;
  isActive: boolean;
  disabled: boolean;
  onTryOn: (id: string) => void;
}

function MobileProductCard({ product, isActive, disabled, onTryOn }: MobileProductCardProps) {
  return (
    <button
      type="button"
      onClick={() => onTryOn(product.id)}
      disabled={disabled}
      className={`flex flex-col gap-2 rounded-[14px] p-2 text-left transition-all ${
        isActive
          ? "border-[1.5px] border-brand-blue bg-brand-blue-pale/30 ring-1 ring-brand-blue/20"
          : "border-[0.5px] border-product-card-border bg-product-card-bg"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div className="relative flex items-center justify-center rounded-[10px] border-[0.5px] border-product-card-border bg-product-card-image-bg p-1.5">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={72}
          height={96}
          className="object-cover"
        />
        {isActive && (
          <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue">
            <CheckIcon size={10} color="white" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="truncate text-[11px] leading-[1.5] text-text-primary">{product.name}</p>
        <span className="text-xs text-text-primary">${product.price.toFixed(0)}</span>
      </div>
    </button>
  );
}

export function MobileCatalogPanel({
  products,
  activeCategory,
  tryOnProductIds,
  phase,
  canGenerate,
  onCategoryChange,
  onTryOn,
  onGenerate,
}: MobileCatalogPanelProps) {
  const filtered = products;
  const isGenerating = phase === "generating";
  const isDisabled = isGenerating || phase === "complete" || phase === "already_used";

  return (
    <div className="flex flex-col gap-3">
      {/* Category tabs */}
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex-1 gap-1 rounded-full border transition-colors ${
                isActive
                  ? "border-brand-blue bg-brand-blue-pale text-brand-blue"
                  : "border-input-border bg-surface-light text-text-secondary"
              }`}
            >
              <Icon size={16} color={isActive ? "var(--brand-blue)" : "var(--text-secondary)"} />
              {cat.label}
            </Button>
          );
        })}
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((product) => (
          <MobileProductCard
            key={product.id}
            product={product}
            isActive={tryOnProductIds.has(product.id)}
            disabled={isDisabled}
            onTryOn={onTryOn}
          />
        ))}
      </div>

      {/* Generate button */}
      <Button
        variant="primary"
        size="default"
        className="w-full"
        onClick={onGenerate}
        disabled={!canGenerate || isDisabled}
      >
        {isGenerating ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating…
          </>
        ) : (
          <>
            <GenerateIcon size={16} color="white" />
            Generate Outfit
          </>
        )}
      </Button>
    </div>
  );
}
