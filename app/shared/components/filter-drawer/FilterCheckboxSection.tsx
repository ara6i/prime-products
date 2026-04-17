"use client";

import { CheckboxIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { FilterAccordion } from "./FilterAccordion";
import type { FilterSectionConfig, ColorFilterOption } from "@/app/shared/types";

interface FilterCheckboxSectionProps {
  section: FilterSectionConfig;
  selectedValues: string[];
  selectedCount?: number;
  onToggle: (sectionId: string, value: string) => void;
}

export function FilterCheckboxSection({
  section,
  selectedValues,
  selectedCount,
  onToggle,
}: FilterCheckboxSectionProps) {
  return (
    <FilterAccordion
      title={section.title}
      count={selectedCount || undefined}
    >
      <div className="flex flex-col gap-[0.833vw]">
        {section.options.map((option) => {
          const isChecked = selectedValues.includes(option.value);
          const isColorSection = section.type === "checkbox-color";
          const colorOption = isColorSection
            ? (option as ColorFilterOption)
            : null;

          return (
            <div key={option.value} className="flex items-center gap-[0.521vw]">
              <Button
                variant="ghost"
                onClick={() => onToggle(section.id, option.value)}
                className="h-auto justify-start gap-[0.208vw] rounded-none p-[0.104vw] hover:bg-transparent"
              >
                <CheckboxIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" checked={isChecked} />
                <span className="px-[0.208vw] py-[0.104vw] font-poppins text-[0.729vw] font-normal leading-[1.43] text-text-primary">
                  {option.label}
                </span>
              </Button>

              {isColorSection && colorOption ? (
                <div className="flex items-center gap-[0.417vw]">
                  <div
                    className="h-[1.042vw] w-[1.042vw] border border-surface-segment"
                    style={{ backgroundColor: colorOption.swatchColor }}
                  />
                  {option.count !== undefined && (
                    <span className="text-[0.625vw] font-normal leading-[1.667] text-text-caption">
                      ({option.count})
                    </span>
                  )}
                </div>
              ) : (
                option.count !== undefined && (
                  <span className="text-[0.625vw] font-normal leading-[1.667] text-text-caption">
                    ({option.count})
                  </span>
                )
              )}
            </div>
          );
        })}

        {section.hasViewAll && (
          <Button
            variant="link"
            className="h-auto justify-start gap-[0.208vw] self-start rounded-none p-0 text-[0.729vw] font-normal leading-[1.57] text-brand-blue hover:bg-transparent"
          >
            View all ({section.viewAllCount})
          </Button>
        )}
      </div>
    </FilterAccordion>
  );
}
