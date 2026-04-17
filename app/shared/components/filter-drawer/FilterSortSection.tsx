"use client";

import { RadioIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { FilterAccordion } from "./FilterAccordion";
import type { SortOption } from "@/app/shared/types";

interface FilterSortSectionProps {
  sortOptions: SortOption[];
  selectedSort: string;
  onSortChange: (value: string) => void;
}

export function FilterSortSection({
  sortOptions,
  selectedSort,
  onSortChange,
}: FilterSortSectionProps) {
  return (
    <FilterAccordion title="Sort">
      <div className="flex flex-col gap-[0.833vw]">
        {sortOptions.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            onClick={() => onSortChange(option.value)}
            className="h-auto justify-start gap-[0.208vw] rounded-none p-0 hover:bg-transparent"
          >
            <RadioIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" checked={selectedSort === option.value} />
            <span className="font-poppins text-[0.729vw] font-normal leading-[1.43] text-black">
              {option.label}
            </span>
          </Button>
        ))}
      </div>
    </FilterAccordion>
  );
}
