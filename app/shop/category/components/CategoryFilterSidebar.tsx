import { CaretDown, FunnelSimple, X } from "@phosphor-icons/react";
import type {
  ActiveCategoryFilters,
  CategoryFilter,
} from "../types/categoryCatalog.types";
import styles from "./categoryCatalog.module.css";

type CategoryFilterSidebarProps = {
  filters: CategoryFilter[];
  expandedFilterId: string | null;
  activeFilters: ActiveCategoryFilters;
  onExpand: (filterId: string | null) => void;
  onToggle: (filterId: string, value: string) => void;
  onClear: () => void;
};

export function CategoryFilterSidebar({
  filters,
  expandedFilterId,
  activeFilters,
  onExpand,
  onToggle,
  onClear,
}: CategoryFilterSidebarProps) {
  const activeCount = Object.values(activeFilters).flat().length;

  return (
    <aside className={styles.filters} aria-label="Product filters">
      <div className={styles.filterTitle}>
        <strong>Filters</strong>
        <FunnelSimple size={16} />
      </div>
      {activeCount > 0 ? (
        <button className={styles.clearFilters} type="button" onClick={onClear}>
          Clear {activeCount} {activeCount === 1 ? "filter" : "filters"}{" "}
          <X size={13} />
        </button>
      ) : null}
      {filters.map((filter) => {
        const expanded = expandedFilterId === filter.id;
        const selected = activeFilters[filter.id] ?? [];
        return (
          <div className={styles.filterGroup} key={filter.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => onExpand(expanded ? null : filter.id)}
            >
              <span>
                {filter.label}
                {selected.length > 0 ? <b>{selected.length}</b> : null}
              </span>
              <CaretDown size={13} />
            </button>
            {expanded ? (
              <div className={styles.filterOptions}>
                {filter.options.map((option) => (
                  <label key={option}>
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => onToggle(filter.id, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <button
        className={styles.applyFilters}
        type="button"
        onClick={() => onExpand(null)}
      >
        Apply filter
      </button>
    </aside>
  );
}
