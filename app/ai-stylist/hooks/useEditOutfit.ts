"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  OutfitSuggestion,
  CatalogProduct,
  CatalogTab,
} from "@/app/ai-stylist/types";

interface UseEditOutfitReturn {
  /** Current outfit being edited */
  outfit: OutfitSuggestion;
  /** All outfit image URLs for the platform carousel */
  outfitImages: string[];
  /** Index of current outfit (0-based) */
  currentIndex: number;
  /** Total number of outfits */
  totalOutfits: number;
  /** Active segment tab */
  segmentTab: "edit-model" | "try-on";
  /** Active catalog tab */
  catalogTab: CatalogTab;
  /** Search query for catalog */
  searchQuery: string;
  /** Filtered catalog products */
  catalogProducts: CatalogProduct[];
  /** IDs of items currently in the outfit */
  outfitItemIds: Set<string>;
  /** Number of items in the outfit */
  outfitItemCount: number;

  /* Actions */
  setSegmentTab: (tab: "edit-model" | "try-on") => void;
  setCatalogTab: (tab: CatalogTab) => void;
  setSearchQuery: (query: string) => void;
  navigateOutfit: (direction: "prev" | "next") => void;
  selectOutfit: (index: number) => void;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  resetOutfit: () => void;
}

export function useEditOutfit(
  initialOutfit: OutfitSuggestion,
  allOutfits?: OutfitSuggestion[]
): UseEditOutfitReturn {
  const outfits = useMemo(
    () =>
      allOutfits && allOutfits.length > 0 ? allOutfits : [initialOutfit],
    [allOutfits, initialOutfit],
  );
  const initialIndex = outfits.findIndex((o) => o.id === initialOutfit.id);

  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0
  );
  const [segmentTab, setSegmentTab] = useState<"edit-model" | "try-on">(
    "try-on"
  );
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [outfitItemIds, setOutfitItemIds] = useState<Set<string>>(() => {
    // Initialize with real outfit item IDs
    const ids = initialOutfit.items.map((item) => item.id);
    return new Set(ids.length > 0 ? ids : []);
  });

  const outfit = outfits[currentIndex] ?? initialOutfit;

  // Only show transparent images on the disc — empty until bg removal is done
  const outfitImages = useMemo(
    () => outfits.map((o) => o.transparentImageUrl || ""),
    [outfits]
  );

  // Build catalog products from current outfit items
  const catalogProducts: CatalogProduct[] = useMemo(() => {
    const items = outfit.items.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand ?? "",
      price: item.price ?? 0,
      imageUrl: item.imageUrl ?? "",
      category: item.category,
    }));

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [outfit.items, searchQuery]);

  const navigateOutfit = useCallback(
    (direction: "prev" | "next") => {
      setCurrentIndex((prev) => {
        const len = outfits.length;
        if (direction === "prev") return (prev - 1 + len) % len;
        return (prev + 1) % len;
      });
      // Update outfitItemIds for new outfit
      const nextIdx =
        direction === "prev"
          ? (currentIndex - 1 + outfits.length) % outfits.length
          : (currentIndex + 1) % outfits.length;
      const nextOutfit = outfits[nextIdx];
      if (nextOutfit) {
        setOutfitItemIds(new Set(nextOutfit.items.map((item) => item.id)));
      }
    },
    [outfits, currentIndex]
  );

  const selectOutfit = useCallback(
    (index: number) => {
      if (index >= 0 && index < outfits.length) {
        setCurrentIndex(index);
        const selected = outfits[index];
        if (selected) {
          setOutfitItemIds(new Set(selected.items.map((item) => item.id)));
        }
      }
    },
    [outfits]
  );

  const addItem = useCallback((productId: string) => {
    setOutfitItemIds((prev) => new Set(prev).add(productId));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setOutfitItemIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const resetOutfit = useCallback(() => {
    setOutfitItemIds(new Set(outfit.items.map((item) => item.id)));
  }, [outfit.items]);

  return {
    outfit,
    outfitImages,
    currentIndex,
    totalOutfits: outfits.length,
    segmentTab,
    catalogTab,
    searchQuery,
    catalogProducts,
    outfitItemIds,
    outfitItemCount: outfitItemIds.size,

    setSegmentTab,
    setCatalogTab,
    setSearchQuery,
    navigateOutfit,
    selectOutfit,
    addItem,
    removeItem,
    resetOutfit,
  };
}
