import { MagnifyingGlass, Minus, Plus } from "@phosphor-icons/react";
import { Button } from "@/app/shared/components/ui/button";
import type { useBrandCatalog } from "../hooks/useBrandCatalog";
import type { BrandEditorialViewModel } from "../types/brandCatalog.types";
import { BrandFilterPanel } from "./BrandFilterPanel";
import { BrandProductCard } from "./BrandProductCard";
import styles from "./brandCatalog.module.css";

interface BrandCatalogSectionProps {
  viewModel: BrandEditorialViewModel;
  controller: ReturnType<typeof useBrandCatalog>;
}

export function BrandCatalogSection({
  viewModel,
  controller,
}: BrandCatalogSectionProps) {
  const { catalog, filterOptions, newCount, saleCount } = viewModel;
  const {
    activeFilterCount,
    clearFilters,
    filterOpen,
    filters,
    products,
    productGridRef,
    searchQuery,
    setPrice,
    setSearchQuery,
    setSortId,
    setVisibleCount,
    sortId,
    toggleFilter,
    toggleFilterPanel,
    visibleCount,
  } = controller;

  return (
    <section
      id="collection"
      className={styles.catalog}
      aria-label={`${catalog.name} products`}
    >
      <div className={styles.catalogControls}>
        <Button
          className={styles.filterToggle}
          variant="commerce"
          size="commerce"
          type="button"
          aria-expanded={filterOpen}
          onClick={toggleFilterPanel}
        >
          {filterOpen ? <Minus size={16} /> : <Plus size={16} />}
          Filter
          {activeFilterCount > 0 ? <b>{activeFilterCount}</b> : null}
        </Button>

        <label className={styles.catalogSearch}>
          <MagnifyingGlass size={16} aria-hidden="true" />
          <span className={styles.srOnly}>Search {catalog.name}</span>
          <input
            type="search"
            value={searchQuery}
            placeholder={`Search ${catalog.name}`}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <label className={styles.sortControl}>
          <span>Sort by:</span>
          <select
            value={sortId}
            onChange={(event) => setSortId(event.target.value as typeof sortId)}
          >
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </div>

      <div
        className={`${styles.catalogLayout} ${filterOpen ? styles.filtersOpen : ""}`}
      >
        <BrandFilterPanel
          filters={filters}
          options={filterOptions}
          newCount={newCount}
          saleCount={saleCount}
          onToggle={toggleFilter}
          onPriceChange={setPrice}
          onClear={clearFilters}
        />

        <div className={styles.productsArea}>
          {products.length > 0 ? (
            <div
              ref={productGridRef}
              className={styles.productGrid}
              aria-live="polite"
            >
              {products.slice(0, visibleCount).map((product, index) => (
                <BrandProductCard
                  key={product.id}
                  product={product}
                  priority={index < 6}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No pieces match those filters.</strong>
              <Button
                variant="commerce-outline"
                size="commerce"
                type="button"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          )}

          {products.length > visibleCount ? (
            <Button
              className={styles.showMore}
              variant="commerce-outline"
              size="commerce"
              type="button"
              onClick={() => setVisibleCount((count) => count + 3)}
            >
              Show more <span>›</span>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
