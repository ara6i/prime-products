"use client";

import { Button } from "@/app/shared/components/ui";
import { FilterAccordion } from "./FilterAccordion";

interface FilterGenderSectionProps {
  genderOptions: { value: string; label: string }[];
  selectedGender: string;
  onGenderChange: (value: string) => void;
}

export function FilterGenderSection({
  genderOptions,
  selectedGender,
  onGenderChange,
}: FilterGenderSectionProps) {
  return (
    <FilterAccordion title="Gender">
      <div className="flex items-center gap-[0.625vw]">
        {genderOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedGender === option.value ? "primary" : "tunal"}
            size="sm"
            onClick={() => onGenderChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </FilterAccordion>
  );
}
