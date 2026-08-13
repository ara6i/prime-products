import Image from "next/image";
import type { CatalogProduct } from "@/app/ai-stylist/types";
import { Button } from "@/app/shared/components/ui";
import {
  BookmarkOutlineIcon,
  InfoOutlineIcon,
} from "@/app/shared/components/icons";

interface CatalogProductCardProps {
  product: CatalogProduct;
  isInOutfit: boolean;
  onAddToOutfit: (id: string) => void;
  onRemoveFromOutfit: (id: string) => void;
}

export function CatalogProductCard({
  product,
  isInOutfit,
  onAddToOutfit,
  onRemoveFromOutfit,
}: CatalogProductCardProps) {
  return (
    <div
      className={`flex flex-col gap-[0.417vw] rounded-[0.729vw] border-[0.5px] p-[0.417vw] ${
        isInOutfit
          ? "border-[#80B3FF] bg-[#DAE7FF]"
          : "border-[#ADB1B3] bg-[#E5E6E8]"
      }`}
    >
      {/* Product Image */}
      <div className="relative flex items-center justify-center self-stretch rounded-[0.729vw] border-[0.5px] border-[#ADB1B3] bg-[#F9F9F9] p-[0.365vw]">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={101}
          height={151}
          className="object-cover"
        />

        {/* Bookmark */}
        <button
          type="button"
          className="absolute right-[0.417vw] bottom-[0.417vw] flex items-center justify-center bg-[#BED6FF] p-[0.417vw]"
        >
          <BookmarkOutlineIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="#1B34B2" />
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between gap-[0.313vw]">
        {/* Name + Brand */}
        <div className="flex flex-col self-stretch">
          <span className="text-[0.729vw] leading-[1.146vw] text-text-primary">
            {product.name}
          </span>
          <span className="text-[0.625vw] leading-[1.042vw] text-[#696E71]">
            {product.brand}
          </span>
        </div>

        {/* Price + Buttons */}
        <div className="flex items-center justify-between self-stretch">
          <div className="flex items-center gap-[0.104vw]">
            <span className="text-[0.729vw] leading-[1.146vw] text-text-primary">
              ${product.price.toFixed(2)}
            </span>
            <InfoOutlineIcon size={12} className="!w-[0.625vw] !h-[0.625vw]" color="#84898C" />
          </div>

          <div className="flex items-center gap-[0.208vw]">
            <Button variant="outline-dark" size="xs">
              Buy
            </Button>
            <Button
              variant={isInOutfit ? "chip" : "secondary"}
              size="xs"
              onClick={() =>
                isInOutfit
                  ? onRemoveFromOutfit(product.id)
                  : onAddToOutfit(product.id)
              }
            >
              {isInOutfit ? "Remove" : "Try on"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
