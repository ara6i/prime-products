"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveBrandFilters,
  BrandProduct,
  BrandSortId,
} from "../types/brandCatalog.types";

const emptyFilters: ActiveBrandFilters = {
  categories: [],
  seasons: [],
  colors: [],
  sizes: [],
  price: "all",
};

export function useBrandCatalog(productsSource: BrandProduct[]) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortId, setSortId] = useState<BrandSortId>("popular");
  const [filters, setFilters] = useState<ActiveBrandFilters>(emptyFilters);
  const [visibleCount, setVisibleCount] = useState(9);
  const productGridRef = useRef<HTMLDivElement>(null);
  const pendingCardRects = useRef<Map<string, DOMRect> | null>(null);

  const products = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = productsSource.filter((product) => {
      const searchableCopy = `${product.name} ${product.category} ${product.color}`;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        searchableCopy.toLowerCase().includes(normalizedQuery);
      const matchesCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(product.category);
      const matchesSeason =
        filters.seasons.length === 0 ||
        filters.seasons.includes(product.season);
      const matchesColor =
        filters.colors.length === 0 || filters.colors.includes(product.color);
      const matchesSize =
        filters.sizes.length === 0 ||
        filters.sizes.some((size) => product.sizes.includes(size));
      const matchesPrice =
        filters.price === "all" ||
        (filters.price === "under-125" && product.price < 125) ||
        (filters.price === "125-175" &&
          product.price >= 125 &&
          product.price <= 175) ||
        (filters.price === "over-175" && product.price > 175);

      return (
        matchesQuery &&
        matchesCategory &&
        matchesSeason &&
        matchesColor &&
        matchesSize &&
        matchesPrice
      );
    });

    return filtered.toSorted((first, second) => {
      if (sortId === "price-low") return first.price - second.price;
      if (sortId === "price-high") return second.price - first.price;
      if (sortId === "newest") {
        return Number(second.badge === "NEW") - Number(first.badge === "NEW");
      }
      return second.popularity - first.popularity;
    });
  }, [filters, productsSource, searchQuery, sortId]);

  const activeFilterCount =
    filters.categories.length +
    filters.seasons.length +
    filters.colors.length +
    filters.sizes.length +
    Number(filters.price !== "all");

  useLayoutEffect(() => {
    const firstRects = pendingCardRects.current;
    const grid = productGridRef.current;
    pendingCardRects.current = null;
    if (!firstRects || !grid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    grid
      .querySelectorAll<HTMLElement>("[data-brand-product-card]")
      .forEach((card) => {
        const productId = card.dataset.productId;
        const first = productId ? firstRects.get(productId) : undefined;
        if (!first) return;

        const last = card.getBoundingClientRect();
        card.animate(
          [
            {
              transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`,
              transformOrigin: "top left",
            },
            {
              transform: "translate(0, 0) scale(1, 1)",
              transformOrigin: "top left",
            },
          ],
          {
            duration: 680,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          },
        );
      });
  }, [filterOpen]);

  function toggleFilterPanel() {
    const cards = productGridRef.current?.querySelectorAll<HTMLElement>(
      "[data-brand-product-card]",
    );
    if (cards) {
      pendingCardRects.current = new Map(
        Array.from(cards).map((card) => [
          card.dataset.productId ?? "",
          card.getBoundingClientRect(),
        ]),
      );
    }
    setFilterOpen((open) => !open);
  }

  function toggleFilter(
    group: "categories" | "seasons" | "colors" | "sizes",
    value: string,
  ) {
    setFilters((current) => {
      const values = current[group];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [group]: nextValues };
    });
    setVisibleCount(9);
  }

  function selectCategory(value: string | null) {
    setFilters((current) => ({
      ...current,
      categories: value ? [value] : [],
    }));
    setVisibleCount(9);
  }

  return {
    activeFilterCount,
    clearFilters: () => setFilters(emptyFilters),
    filterOpen,
    filters,
    products,
    productGridRef,
    searchQuery,
    selectCategory,
    setPrice: (price: ActiveBrandFilters["price"]) =>
      setFilters((current) => ({ ...current, price })),
    setSearchQuery,
    setSortId,
    setVisibleCount,
    sortId,
    toggleFilter,
    toggleFilterPanel,
    visibleCount,
  };
}
