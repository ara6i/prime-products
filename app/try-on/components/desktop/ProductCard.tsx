"use client";

import Image from "next/image";
import {
  BookmarkIcon,
  BookmarkOutlineIcon,
  InfoOutlineIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { AffiliateBuyButton } from "@/app/try-on/components/AffiliateBuyButton";
import { formatPrice } from "@/app/try-on/mappers/catalog-mapper";
import type { CatalogProduct } from "@/app/try-on/types";

interface ProductCardProps {
  product: CatalogProduct;
  isActive: boolean;
  onTryOn: (id: string) => void;
  onToggleSave: (id: string) => void;
  actionLabel?: string;
  activeActionLabel?: string;
  imageFit?: "cover" | "contain";
}

export function ProductCard({
  product,
  isActive,
  onTryOn,
  onToggleSave,
  actionLabel = "Try on",
  activeActionLabel = "Remove",
  imageFit = "contain",
}: ProductCardProps) {
  return (
    <div
      className={`flex h-full flex-col gap-[0.313vw] rounded-[0.521vw] p-[0.313vw] ${
        isActive
          ? "border-[0.5px] border-product-card-selected-border bg-product-card-selected-bg"
          : "border-[0.5px] border-product-card-border bg-white"
      }`}
    >
      <div className="relative flex aspect-[4/5] items-center justify-center self-stretch overflow-hidden rounded-[0.521vw] border-[0.5px] border-product-card-border bg-white">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="12vw"
          className={imageFit === "contain" ? "object-contain p-[0.833vw]" : "object-cover"}
        />

        <Button
          variant="icon"
          onClick={() => onToggleSave(product.id)}
          className="absolute bottom-[0.313vw] right-[0.313vw] z-10 h-auto w-auto rounded-none bg-brand-blue-light p-[0.313vw] hover:bg-brand-blue-light/80"
        >
          {product.isSaved ? (
            <BookmarkIcon size={14} color="var(--catalog-bookmark-icon)" className="!w-[0.729vw] !h-[0.729vw]" />
          ) : (
            <BookmarkOutlineIcon size={14} color="var(--catalog-bookmark-icon)" className="!w-[0.729vw] !h-[0.729vw]" />
          )}
        </Button>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-[0.208vw]">
        <div className="flex flex-col self-stretch">
          <span className="line-clamp-1 text-[0.625vw] leading-[1.5] text-text-primary">
            {product.name}
          </span>
          <span className="line-clamp-1 text-[0.573vw] leading-[1.5] text-text-caption">
            {product.brand}
          </span>
        </div>

        <div className="flex items-center justify-between self-stretch">
          <div className="flex items-center gap-[0.104vw]">
            <span className="text-[0.625vw] leading-[1.5] text-text-primary">
              {formatPrice(product.price)}
            </span>
            <InfoOutlineIcon size={10} color="var(--text-hint)" className="!w-[0.521vw] !h-[0.521vw]" />
          </div>

          <div className="flex items-center gap-[0.208vw]">
            <AffiliateBuyButton
              affiliateUrl={product.affiliateUrl}
              variant="outline-dark"
              size="xs"
            />
            <Button
              variant={isActive ? "chip" : "secondary"}
              size="xs"
              onClick={() => onTryOn(product.id)}
            >
              {isActive ? activeActionLabel : actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
