import type {
  ActiveCategoryFilters,
  CategoryProduct,
} from "../types/categoryCatalog.types";

export function createInitialCategoryFilters(
  initialBrand?: string,
): ActiveCategoryFilters {
  return initialBrand ? { brand: [initialBrand] } : {};
}

export function categoryProductMatchesFilters(
  product: CategoryProduct,
  activeFilters: ActiveCategoryFilters,
  searchQuery: string,
): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesQuery =
    normalizedQuery.length === 0 ||
    `${product.name} ${product.brand}`.toLowerCase().includes(normalizedQuery);
  const matchesFilters = Object.entries(activeFilters).every(
    ([groupId, values]) =>
      values.length === 0 ||
      product.facets.some(
        (facet) => facet.groupId === groupId && values.includes(facet.value),
      ),
  );
  return matchesQuery && matchesFilters;
}
