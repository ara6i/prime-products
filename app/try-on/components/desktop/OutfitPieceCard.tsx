"use client";

import Image from "next/image";
import { InfoOutlineIcon, CheckmarkSmallIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { AffiliateBuyButton } from "@/app/try-on/components/AffiliateBuyButton";
import { formatPrice } from "@/app/try-on/mappers/catalog-mapper";
import type { OutfitProduct } from "@/app/try-on/types";

interface OutfitPieceCardProps {
  product: OutfitProduct;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onTryOn: (id: string) => void;
}

export function OutfitPieceCard({
  product,
  isSelected,
  onToggleSelect,
  onTryOn,
}: OutfitPieceCardProps) {
  return (
    <div
      className={`flex items-stretch gap-[0.417vw] rounded-[0.729vw] p-[0.417vw] ${
        isSelected
          ? "border-[0.72px] border-product-card-selected-border bg-product-card-selected-bg"
          : "bg-product-card-bg"
      }`}
    >
      <Button
        variant="ghost"
        onClick={() => onToggleSelect(product.id)}
        className="h-auto w-auto rounded-none p-[0.104vw]"
      >
        {isSelected ? (
          <div className="flex h-[1.042vw] w-[1.042vw] items-center justify-center rounded-[0.156vw] bg-brand-blue">
            <CheckmarkSmallIcon size={10} color="white" className="!w-[0.521vw] !h-[0.521vw]" />
          </div>
        ) : (
          <div className="h-[1.042vw] w-[1.042vw] rounded-[0.156vw] border-[1.25px] border-checkbox-border" />
        )}
      </Button>

      <div className="flex w-[6.25vw] shrink-0 items-center justify-center rounded-[0.521vw] border-[0.48px] border-surface-segment bg-product-card-image-bg p-[0.208vw]">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={67}
          height={101}
          className="object-cover w-[3.49vw] h-[5.26vw]"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-[0.313vw]">
        <div className="flex flex-col self-stretch">
          <span className="text-[0.729vw] leading-[1.57] text-text-primary">
            {product.name}
          </span>
          <span className="text-[0.625vw] leading-[1.667] text-text-caption">
            {product.brand}
          </span>
        </div>

        <div className="flex items-center gap-[1.25vw] self-stretch">
          <div className="flex items-center gap-[0.104vw]">
            <span className="text-[0.729vw] leading-[1.57] text-text-primary">
              {formatPrice(product.price)}
            </span>
            <InfoOutlineIcon size={12} color="var(--text-hint)" className="!w-[0.625vw] !h-[0.625vw]" />
          </div>

          <div className="flex items-center gap-[0.208vw]">
            <AffiliateBuyButton
              affiliateUrl={product.affiliateUrl}
              variant="secondary"
              size="xs"
            />
            <Button
              variant="secondary"
              size="xs"
              onClick={() => onTryOn(product.id)}
            >
              Try on
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
