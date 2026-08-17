"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  fetchProductById,
  fetchProducts,
  fetchUserClosetProducts,
} from "@/app/try-on/services/catalog.service";
import { fetchOutfits } from "@/app/try-on/services/outfits.service";
import { fetchGallery } from "@/app/try-on/services/gallery.service";
import { fetchUserGender } from "@/app/try-on/services/user.service";
import {
  mapProductsToFrontend,
  mapOutfitsToFrontend,
  mapGalleryToCloset,
} from "@/app/try-on/mappers/catalog-mapper";
import {
  DEFAULT_FILTER_STATE,
  filterSectionsWithCounts,
} from "@/app/shared/data/filter-config";
import type {
  CatalogTab,
  CatalogProduct,
  SavedOutfit,
  ClosetItem,
  OutfitProduct,
} from "@/app/try-on/types";
import type { FilterFacetCounts, FilterState } from "@/app/shared/types";

const PRODUCTS_PER_PAGE = 20;

interface UseCatalogPanelParams {
  tryOnProductIds: string[];
}

export function useCatalogPanel({ tryOnProductIds }: UseCatalogPanelParams) {
  const [activeTab, setActiveTab] = useState<CatalogTab>("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [infiniteScrollDone, setInfiniteScrollDone] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [closetProducts, setClosetProducts] = useState<CatalogProduct[]>([]);
  const [isLoadingClosetProducts, setIsLoadingClosetProducts] = useState(false);
  const closetProductsLoadedRef = useRef(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isOutfitModalOpen, setIsOutfitModalOpen] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [filterFacets, setFilterFacets] = useState<FilterFacetCounts>();
  const [appliedFilters, setAppliedFilters] = useState<FilterState | null>(null);
  const [viewingOutfit, setViewingOutfit] = useState<SavedOutfit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingCloset, setIsLoadingCloset] = useState(false);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);
  const closetLoadedRef = useRef(false);
  const outfitsLoadedRef = useRef(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasMountedRef = useRef(false);
  const userGenderRef = useRef<string | null>(null);
  const [genderReady, setGenderReady] = useState(false);

  // Fetch user gender once on mount and update filter state
  useEffect(() => {
    fetchUserGender().then((g) => {
      userGenderRef.current = g;
      if (g) {
        const genderValue = g.toLowerCase() === "male" || g.toLowerCase() === "men" || g.toLowerCase() === "man" ? "men" : "women";
        setFilterState((prev) => ({ ...prev, gender: genderValue }));
      }
      setGenderReady(true);
    });
  }, []);

  // Reset catalog state for fresh load
  const resetCatalog = useCallback(() => {
    setProducts([]);
    setCurrentPage(1);
    setInfiniteScrollDone(false);
  }, []);

  // Load a specific page (used for both initial, infinite scroll, and pagination)
  const loadPage = useCallback(async (
    page: number,
    search?: string,
    filters?: FilterState | null,
    append = false,
  ): Promise<boolean | null> => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await fetchProducts({
        search: search || undefined,
        filterState: filters ?? undefined,
        userGender: userGenderRef.current ?? undefined,
        page,
        limit: PRODUCTS_PER_PAGE,
      });
      const mapped = mapProductsToFrontend(response.items);
      if (append) {
        setProducts((prev) => {
          const existing = new Map(prev.map((p) => [p.id, p]));
          mapped.forEach((p) => existing.set(p.id, p));
          return Array.from(existing.values());
        });
      } else {
        setProducts(mapped);
      }
      setTotalProducts(response.total);
      const hasMore = response.hasMore ?? page < response.totalPages;
      setInfiniteScrollDone(!hasMore);
      if (!append && response.facets) setFilterFacets(response.facets);
      return hasMore;
    } catch {
      // Keep existing products on error
      return null;
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Load next page for infinite scroll
  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || isLoading || infiniteScrollDone) return;
    const nextPage = currentPage + 1;
    const hasMore = await loadPage(
      nextPage,
      searchQuery,
      appliedFilters,
      true,
    );
    if (hasMore !== null) setCurrentPage(nextPage);
  }, [
    appliedFilters,
    currentPage,
    infiniteScrollDone,
    isLoading,
    isLoadingMore,
    loadPage,
    searchQuery,
  ]);

  // Intersection Observer for infinite scroll sentinel
  useEffect(() => {
    if (infiniteScrollDone || activeTab !== "catalog") return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [infiniteScrollDone, activeTab, loadNextPage]);

  // Initial load + reset on filter/search change
  const loadInitial = useCallback(async (search?: string, filters?: FilterState | null) => {
    resetCatalog();
    setFilterFacets(undefined);
    setIsLoading(true);
    try {
      const response = await fetchProducts({
        search: search || undefined,
        filterState: filters ?? undefined,
        userGender: userGenderRef.current ?? undefined,
        page: 1,
        limit: PRODUCTS_PER_PAGE,
      });
      const mapped = mapProductsToFrontend(response.items);
      setProducts(mapped);
      setTotalProducts(response.total);
      setFilterFacets(response.facets);
      setCurrentPage(1);
      const hasMore = response.hasMore ?? response.page < response.totalPages;
      setInfiniteScrollDone(!hasMore);
    } catch {
      // Keep empty on error
    } finally {
      setIsLoading(false);
    }
  }, [resetCatalog]);

  // Load on mount (once gender is ready) and when filters change
  useEffect(() => {
    if (!genderReady) return;
    // Loading the catalog is the synchronization purpose of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial(searchQuery, appliedFilters);
    hasMountedRef.current = true;
  }, [appliedFilters, genderReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search — skip initial render (handled above)
  useEffect(() => {
    if (!hasMountedRef.current) return;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadInitial(searchQuery, appliedFilters);
    }, 500);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load outfits/closet on tab switch
  const loadOutfits = useCallback(async () => {
    if (!outfitsLoadedRef.current) setIsLoadingOutfits(true);
    try {
      const response = await fetchOutfits();
      setSavedOutfits(mapOutfitsToFrontend(response.outfits));
      outfitsLoadedRef.current = true;
    } catch {
      // Keep empty on error
    } finally {
      setIsLoadingOutfits(false);
    }
  }, []);

  const loadClosetItems = useCallback(async () => {
    if (!closetLoadedRef.current) setIsLoadingCloset(true);
    try {
      const items = await fetchGallery("image");
      setClosetItems(mapGalleryToCloset(items));
      closetLoadedRef.current = true;
    } catch {
      // Keep empty on error
    } finally {
      setIsLoadingCloset(false);
    }
  }, []);

  const loadClosetProducts = useCallback(async () => {
    if (closetProductsLoadedRef.current) return;
    setIsLoadingClosetProducts(true);
    try {
      const items = await fetchUserClosetProducts();
      setClosetProducts(mapProductsToFrontend(items));
      closetProductsLoadedRef.current = true;
    } catch {
      // Keep empty on error
    } finally {
      setIsLoadingClosetProducts(false);
    }
  }, []);

  useEffect(() => {
    // Tab changes synchronize the matching remote collection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab === "saved-outfits") loadOutfits();
  }, [activeTab, loadOutfits]);

  useEffect(() => {
    if (activeTab === "my-closet") {
      // Tab changes synchronize the matching remote collections.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadClosetItems();
      loadClosetProducts();
    }
  }, [activeTab, loadClosetItems, loadClosetProducts]);

  const handleApplyFilters = useCallback((state: FilterState) => {
    setFilterState(state);
    setAppliedFilters(state);
  }, []);

  const handleToggleSave = useCallback((productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isSaved: !p.isSaved } : p,
      ),
    );
  }, []);

  const handleViewOutfit = useCallback(async (outfit: SavedOutfit) => {
    const missingAffiliateIds = [
      ...new Set(
        outfit.products
          .filter((product) => !product.affiliateUrl)
          .map((product) => product.id),
      ),
    ];

    const resolvedProducts = await Promise.all(
      missingAffiliateIds.map(async (productId) => {
        try {
          return await fetchProductById(productId);
        } catch {
          return null;
        }
      }),
    );
    const affiliateUrlById = new Map<string, string>();
    for (const product of resolvedProducts) {
      if (product?.affiliate_url) {
        affiliateUrlById.set(product.product_id, product.affiliate_url);
      }
    }

    setViewingOutfit({
      ...outfit,
      products: outfit.products.map((product) => ({
        ...product,
        affiliateUrl:
          product.affiliateUrl ?? affiliateUrlById.get(product.id) ?? null,
      })),
    });
    setIsOutfitModalOpen(true);
  }, []);

  const handleOpenViewPieces = useCallback(() => {
    setViewingOutfit(null);
    setIsOutfitModalOpen(true);
  }, []);

  const handleCloseOutfitModal = useCallback(() => {
    setIsOutfitModalOpen(false);
    setViewingOutfit(null);
  }, []);

  const outfitModalProducts: OutfitProduct[] = viewingOutfit
    ? viewingOutfit.products
    : products
        .filter((p) => tryOnProductIds.includes(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          brand: p.brand,
          price: p.price,
          category: p.category,
          affiliateUrl: p.affiliateUrl ?? null,
        }));

  const outfitModalProductIds = viewingOutfit
    ? viewingOutfit.products.map((p) => p.id)
    : tryOnProductIds;

  const filterSections = filterSectionsWithCounts(filterFacets);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    products,
    totalProducts,
    savedOutfits,
    closetItems,
    closetProducts,
    isLoadingClosetProducts,
    loadClosetProducts,
    loadOutfits,
    isFilterOpen,
    setIsFilterOpen,
    isOutfitModalOpen,
    isLoading,
    isLoadingMore,
    isLoadingCloset,
    isLoadingOutfits,
    filterState,
    viewingOutfit,
    handleApplyFilters,
    handleToggleSave,
    handleViewOutfit,
    handleOpenViewPieces,
    handleCloseOutfitModal,
    outfitModalProducts,
    outfitModalProductIds,
    // Pagination
    sentinelRef,
    filterSections,
  };
}
