"use client";

import { FilterAccordion } from "./FilterAccordion";
import type { PriceRange } from "@/app/shared/types";

interface FilterPriceSectionProps {
  priceRange: PriceRange;
  onPriceChange: (field: keyof PriceRange, value: string) => void;
}

export function FilterPriceSection({
  priceRange,
  onPriceChange,
}: FilterPriceSectionProps) {
  return (
    <FilterAccordion title="Price">
      <div className="flex items-start gap-[0.833vw]">
        <div className="flex flex-1 flex-col gap-[0.417vw]">
          <label className="text-[0.625vw] font-normal leading-[1.667] text-input-label">
            Minimum (USD)
          </label>
          <input
            type="number"
            value={priceRange.min || ""}
            onChange={(e) => onPriceChange("min", e.target.value)}
            placeholder="0"
            className="bg-input-bg px-[0.625vw] py-[0.417vw] text-[0.729vw] font-normal leading-[1.57] text-text-primary outline-none placeholder:text-input-placeholder"
          />
        </div>
        <div className="flex flex-1 flex-col gap-[0.417vw]">
          <label className="text-[0.625vw] font-normal leading-[1.667] text-input-label">
            Maximum (USD)
          </label>
          <input
            type="number"
            value={priceRange.max || ""}
            onChange={(e) => onPriceChange("max", e.target.value)}
            placeholder="0"
            className="bg-input-bg px-[0.625vw] py-[0.417vw] text-[0.729vw] font-normal leading-[1.57] text-text-primary outline-none placeholder:text-input-placeholder"
          />
        </div>
      </div>
    </FilterAccordion>
  );
}
