"use client";

import Image from "next/image";
import { CheckIcon } from "@/app/shared/components/icons";
import type { LandingProduct } from "@/app/landing/types/try-on";

interface LandingProductCardProps {
  product: LandingProduct;
  isActive: boolean;
  disabled?: boolean;
  onTryOn: (id: string) => void;
}

export function LandingProductCard({
  product,
  isActive,
  disabled = false,
  onTryOn,
}: LandingProductCardProps) {
  return (
    <button
      type="button"
      onClick={() => onTryOn(product.id)}
      disabled={disabled}
      className={`flex w-[calc((100%-1.25vw)/3)] flex-col gap-[0.417vw] rounded-[1.042vw] p-[0.417vw] text-left transition-all ${
        disabled ? "opacity-60" : "cursor-pointer hover:shadow-md"
      } ${
        isActive
          ? "border-[1.5px] border-brand-blue bg-brand-blue-pale/30 ring-1 ring-brand-blue/20"
          : "border-[0.5px] border-product-card-border bg-product-card-bg hover:border-brand-blue/30"
      }`}
    >
      <div className="relative flex items-center justify-center self-stretch rounded-[0.729vw] border-[0.5px] border-product-card-border bg-product-card-image-bg p-[0.365vw]">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={101}
          height={151}
          className="object-cover w-[5.26vw] h-[7.865vw]"
        />
        {isActive && (
          <div className="absolute top-[0.313vw] right-[0.313vw] flex h-[1.042vw] w-[1.042vw] items-center justify-center rounded-full bg-brand-blue">
            <CheckIcon size={12} className="!w-[0.625vw] !h-[0.625vw]" color="white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[0.208vw] self-stretch">
        <div className="flex flex-col self-stretch">
          <span className="text-[0.625vw] leading-[1.667] text-text-primary">{product.name}</span>
          <span className="text-[0.625vw] leading-[1.667] text-catalog-category-text">{product.brand}</span>
        </div>

        <span className="text-[0.729vw] leading-[1.57] text-text-primary">
          ${product.price.toFixed(2)}
        </span>
      </div>
    </button>
  );
}
