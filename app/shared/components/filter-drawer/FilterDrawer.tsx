"use client";

import { useState, useCallback, useEffect } from "react";
import { CloseIcon } from "@/app/shared/components/icons";
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/app/shared/components/ui";
import { FilterSortSection } from "./FilterSortSection";
import { FilterGenderSection } from "./FilterGenderSection";
import { FilterCheckboxSection } from "./FilterCheckboxSection";
import { FilterPriceSection } from "./FilterPriceSection";
import type {
  FilterState,
  FilterSectionConfig,
  SortOption,
  PriceRange,
} from "@/app/shared/types";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sortOptions: SortOption[];
  genderOptions: { value: string; label: string }[];
  filterSections: FilterSectionConfig[];
  initialState: FilterState;
  onApply: (state: FilterState) => void;
}

export function FilterDrawer({
  isOpen,
  onClose,
  sortOptions,
  genderOptions,
  filterSections,
  initialState,
  onApply,
}: FilterDrawerProps) {
  const [state, setState] = useState<FilterState>(initialState);

  useEffect(() => {
    if (isOpen) setState(initialState);
  }, [isOpen, initialState]);

  const handleSortChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, sort: value }));
  }, []);

  const handleGenderChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, gender: value }));
  }, []);

  const handleToggleFilter = useCallback((sectionId: string, value: string) => {
    setState((prev) => {
      const current = prev.selectedFilters[sectionId] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        ...prev,
        selectedFilters: { ...prev.selectedFilters, [sectionId]: next },
      };
    });
  }, []);

  const handlePriceChange = useCallback((field: keyof PriceRange, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) && value !== "") return;
    setState((prev) => ({
      ...prev,
      priceRange: { ...prev.priceRange, [field]: value === "" ? 0 : num },
    }));
  }, []);

  const handleClear = useCallback(() => {
    setState({
      sort: sortOptions[0]?.value || "",
      gender: "all",
      selectedFilters: {},
      priceRange: { min: 0, max: 0 },
    });
  }, [sortOptions]);

  const handleApply = useCallback(() => {
    onApply(state);
    onClose();
  }, [state, onApply, onClose]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto border-l-0 bg-white p-0 sm:max-w-[25vw]"
      >
        <div className="flex flex-col gap-[1.198vw] p-[1.25vw]">
          <SheetHeader className="flex-row items-center justify-between gap-0 p-0">
            <SheetTitle className="text-[1.042vw] font-normal leading-[1.7] text-text-primary">
              Filter Catalog
            </SheetTitle>
            <Button
              variant="icon"
              size="icon-sm"
              onClick={onClose}
              className="flex h-[1.667vw] w-[1.667vw] items-center justify-center rounded-full hover:bg-catalog-bg"
            >
              <CloseIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--text-neutral)" />
            </Button>
          </SheetHeader>

          <div className="flex flex-col gap-[0.625vw]">
            <FilterSortSection
              sortOptions={sortOptions}
              selectedSort={state.sort}
              onSortChange={handleSortChange}
            />
            <FilterGenderSection
              genderOptions={genderOptions}
              selectedGender={state.gender}
              onGenderChange={handleGenderChange}
            />
            {filterSections.map((section) => {
              if (section.type === "price-range") return null;
              const selected = state.selectedFilters[section.id] || [];
              const count = section.showCount ? selected.length : undefined;
              return (
                <FilterCheckboxSection
                  key={section.id}
                  section={section}
                  selectedValues={selected}
                  selectedCount={count}
                  onToggle={handleToggleFilter}
                />
              );
            })}
            <FilterPriceSection
              priceRange={state.priceRange}
              onPriceChange={handlePriceChange}
            />
          </div>

          <SheetFooter className="flex-row gap-[0.625vw] p-0">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear Filters
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply Filters
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
