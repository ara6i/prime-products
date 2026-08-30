import { ArrowsDownUp } from "@phosphor-icons/react";
import type { useCategoryCatalog } from "../hooks/useCategoryCatalog";
import type {
  CategoryCatalog,
  CategorySortId,
} from "../types/categoryCatalog.types";
import { CategoryFilterSidebar } from "./CategoryFilterSidebar";
import { CategoryHero } from "./CategoryHero";
import { CategoryProductGrid } from "./CategoryProductGrid";
import { CategoryShopHeader } from "./CategoryShopHeader";
import { CategoryTicker } from "./CategoryTicker";
import styles from "./categoryCatalog.module.css";

type CatalogState = ReturnType<typeof useCategoryCatalog>;

type CategoryCatalogViewProps = {
  catalog: CategoryCatalog;
  state: CatalogState;
};

export function CategoryCatalogView({
  catalog,
  state,
}: CategoryCatalogViewProps) {
  function scrollToProducts() {
    document
      .getElementById("shop-the-edit")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={styles.page}>
      <div className={styles.canvas}>
        <CategoryShopHeader
          categoryId={catalog.id}
          bagCount={state.bagCount}
          onOpenBag={state.openBag}
          searchQuery={state.searchQuery}
          menuOpen={state.menuOpen}
          onSearchChange={state.setSearchQuery}
          onMenuToggle={() => state.setMenuOpen((open) => !open)}
        />
        <main>
          <CategoryHero catalog={catalog} onShopEdit={scrollToProducts} />
          <CategoryTicker items={catalog.announcementItems} />

          <section
            className={styles.edit}
            id="shop-the-edit"
            aria-labelledby="shop-edit-title"
          >
            <header className={styles.editHeader}>
              <div>
                <span>
                  {catalog.label.toUpperCase()} / CURATED ACROSS THE NETWORK
                </span>
                <h2 id="shop-edit-title">SHOP THE EDIT</h2>
              </div>
              <label className={styles.sortControl}>
                <ArrowsDownUp size={15} />
                <span>Sort by</span>
                <select
                  value={state.sortId}
                  onChange={(event) =>
                    state.setSortId(event.target.value as CategorySortId)
                  }
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
            </header>

            <div className={styles.editLayout}>
              <CategoryFilterSidebar
                filters={catalog.filters}
                expandedFilterId={state.expandedFilterId}
                activeFilters={state.activeFilters}
                onExpand={state.setExpandedFilterId}
                onToggle={state.toggleFilter}
                onClear={state.clearFilters}
              />
              <CategoryProductGrid
                products={state.products}
                favoriteIds={state.favoriteIds}
                onFavorite={state.toggleFavorite}
                onAddToBag={state.addToBag}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
