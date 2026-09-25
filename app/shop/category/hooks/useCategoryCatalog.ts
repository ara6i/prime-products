"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useShopBag } from "../../bag/useShopBag";
import type {
  ActiveCategoryFilters,
  CategoryCatalog,
  CategoryProduct,
  CategorySortId,
} from "../types/categoryCatalog.types";
import {
  categoryProductMatchesFilters,
  createInitialCategoryFilters,
} from "../utils/categoryCatalogFilters";

type CategoryCatalogOptions = {
  initialBrand?: string;
};

export function useCategoryCatalog(
  catalog: CategoryCatalog,
  options: CategoryCatalogOptions = {},
) {
  const router = useRouter();
  const [expandedFilterId, setExpandedFilterId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveCategoryFilters>(
    () => createInitialCategoryFilters(options.initialBrand),
  );
  const [sortId, setSortId] = useState<CategorySortId>("featured");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const bag = useShopBag();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const products = useMemo(() => {
    const filtered = catalog.products.filter((product) =>
      categoryProductMatchesFilters(product, activeFilters, searchQuery),
    );

    return [...filtered].sort((a, b) => {
      if (sortId === "price-low") return a.priceCents - b.priceCents;
      if (sortId === "price-high") return b.priceCents - a.priceCents;
      if (sortId === "newest") return b.position - a.position;
      return a.position - b.position;
    });
  }, [activeFilters, catalog.products, searchQuery, sortId]);

  function toggleFilter(groupId: string, value: string) {
    setActiveFilters((current) => {
      const values = current[groupId] ?? [];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [groupId]: nextValues };
    });
  }

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((item) => item !== productId)
        : [...current, productId],
    );
  }

  return {
    products,
    expandedFilterId,
    activeFilters,
    sortId,
    favoriteIds,
    bagCount: bag.bagCount,
    openBag: () => bag.setOpen(true),
    searchQuery,
    menuOpen,
    setExpandedFilterId,
    setSortId,
    setSearchQuery,
    setMenuOpen,
    toggleFilter,
    toggleFavorite,
    clearFilters: () => setActiveFilters({}),
    addToBag: (product: CategoryProduct) => {
      const oneSize =
        product.sizes?.length === 1 && product.sizes[0] === "One size";
      if (!oneSize) {
        router.push(`/shop/product/${product.id}#size`);
        return;
      }
      bag.add({
        productId: product.id,
        name: product.name,
        brandName: product.brand,
        image: product.image,
        href: `/shop/product/${product.id}`,
        size: "One size",
        color:
          product.facets.find((facet) => facet.groupId === "color")?.value ??
          "",
        priceCents: product.priceCents,
        currency: "USD",
      });
    },
  };
}
