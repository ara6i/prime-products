import { CaretDown, Check } from "@phosphor-icons/react";
import { Button } from "@/app/shared/components/ui/button";
import type {
  ActiveBrandFilters,
  BrandFilterOptions,
} from "../types/brandCatalog.types";
import { brandColorValues } from "../utils/brandCatalog.utils";
import styles from "./brandCatalog.module.css";

interface BrandFilterPanelProps {
  filters: ActiveBrandFilters;
  options: BrandFilterOptions;
  newCount: number;
  saleCount: number;
  onToggle: (
    group: "categories" | "seasons" | "colors" | "sizes",
    value: string,
  ) => void;
  onPriceChange: (price: ActiveBrandFilters["price"]) => void;
  onClear: () => void;
}

export function BrandFilterPanel({
  filters,
  options,
  newCount,
  saleCount,
  onToggle,
  onPriceChange,
  onClear,
}: BrandFilterPanelProps) {
  return (
    <aside className={styles.filterPanel} aria-label="Filter brand products">
      <div className={styles.quickFilters}>
        <span>New items ({newCount})</span>
        <span>On sale ({saleCount})</span>
      </div>

      <FilterGroup title="Categories">
        <div className={styles.categoryOptions}>
          {options.categories.map((option) => (
            <Button
              key={option}
              variant="ghost"
              size="sm"
              type="button"
              aria-pressed={filters.categories.includes(option)}
              onClick={() => onToggle("categories", option)}
            >
              {option} <span>({options.categoryCounts[option]})</span>
            </Button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Season">
        <div className={styles.checkboxGrid}>
          {options.seasons.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                checked={filters.seasons.includes(option)}
                onChange={() => onToggle("seasons", option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Color">
        <div className={styles.colorGrid}>
          {options.colors.map((option) => (
            <Button
              key={option}
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label={`Filter by ${option}`}
              aria-pressed={filters.colors.includes(option)}
              style={{ backgroundColor: brandColorValues[option] ?? "#dddddd" }}
              onClick={() => onToggle("colors", option)}
            >
              {filters.colors.includes(option) ? (
                <Check size={12} weight="bold" />
              ) : null}
            </Button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Size">
        <div className={styles.sizeGrid}>
          {options.sizes.map((option) => (
            <Button
              key={option}
              variant="ghost"
              size="sm"
              type="button"
              aria-pressed={filters.sizes.includes(option)}
              onClick={() => onToggle("sizes", option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className={styles.priceOptions}>
          {(
            [
              ["all", "All prices"],
              ["under-125", "Under $125"],
              ["125-175", "$125 – $175"],
              ["over-175", "$175+"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="brand-price"
                checked={filters.price === value}
                onChange={() => onPriceChange(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <Button
        className={styles.clearFilters}
        variant="commerce-outline"
        size="commerce"
        type="button"
        onClick={onClear}
      >
        Clear all filters
      </Button>
    </aside>
  );
}

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
}

function FilterGroup({ title, children }: FilterGroupProps) {
  return (
    <section className={styles.filterGroup}>
      <header>
        <span>{title}</span>
        <CaretDown size={14} />
      </header>
      {children}
    </section>
  );
}
