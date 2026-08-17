"use client";

import {
  EyeIcon,
  SearchIcon,
  FilterIcon,
} from "@/app/shared/components/icons";
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/app/shared/components/ui";
import { FilterDrawer } from "@/app/shared/components/filter-drawer";
import { ProductCard } from "./ProductCard";
import { SavedOutfitCard } from "./SavedOutfitCard";
import { OutfitModal } from "./OutfitModal";
import {
  SORT_OPTIONS,
  GENDER_OPTIONS,
} from "@/app/shared/data/filter-config";
import { useCatalogPanel } from "@/app/try-on/hooks/useCatalogPanel";
import type {
  CatalogProduct,
  CatalogTab,
  OutfitProduct,
  TryOnProductDetail,
} from "@/app/try-on/types";
import { useCallback, useMemo, useState } from "react";

interface ExtraTab {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  defaultActive?: boolean;
  placement?: "first" | "last";
}

interface CatalogPanelProps {
  tryOnProductIds: string[];
  onToggleTryOn: (productId: string, details?: TryOnProductDetail) => void;
  previewImageUrl?: string;
  onGenerate?: () => void;
  onChooseModel?: () => void;
  className?: string;
  extraTab?: ExtraTab;
  catalogProducts?: CatalogProduct[];
  catalogDescription?: string;
  onToggleCatalogSave?: (productId: string) => void;
  headerActions?: React.ReactNode;
  productActionLabel?: string;
  activeProductActionLabel?: string;
  productImageFit?: "cover" | "contain";
}

export function CatalogPanel({
  tryOnProductIds,
  onToggleTryOn,
  previewImageUrl,
  onGenerate,
  onChooseModel,
  className,
  extraTab,
  catalogProducts,
  catalogDescription = "Browse fashion items with AI-powered recommendations",
  onToggleCatalogSave,
  headerActions,
  productActionLabel,
  activeProductActionLabel,
  productImageFit,
}: CatalogPanelProps) {
  const [isExtraTabActive, setIsExtraTabActive] = useState(!!extraTab?.defaultActive);
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    products,
    totalProducts,
    savedOutfits,
    closetItems,
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
    sentinelRef,
    filterSections,
  } = useCatalogPanel({ tryOnProductIds });

  const isCatalogOverride = catalogProducts !== undefined;
  const displayedProducts = useMemo(() => {
    const source = catalogProducts ?? products;
    const query = searchQuery.trim().toLowerCase();
    let next = isCatalogOverride && query
      ? source.filter((product) =>
          [product.name, product.brand, product.category]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : [...source];

    if (isCatalogOverride && filterState.priceRange.max > 0) {
      next = next.filter(
        (product) =>
          product.price >= filterState.priceRange.min &&
          product.price <= filterState.priceRange.max,
      );
    }

    if (isCatalogOverride && filterState.sort === "price-low-high") {
      next.sort((a, b) => a.price - b.price);
    } else if (isCatalogOverride && filterState.sort === "price-high-low") {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [catalogProducts, filterState.priceRange, filterState.sort, isCatalogOverride, products, searchQuery]);

  const displayedTotalProducts = catalogProducts?.length ?? totalProducts;

  const handleTryOnToggle = useCallback(
    (productId: string) => {
      const product =
        displayedProducts.find((p) => p.id === productId) ||
        outfitModalProducts.find((p) => p.id === productId);
      onToggleTryOn(
        productId,
        product
          ? {
              id: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
              category: product.category,
              brand: product.brand,
              price: product.price,
              affiliateUrl: product.affiliateUrl ?? null,
            }
          : undefined,
      );
    },
    [displayedProducts, outfitModalProducts, onToggleTryOn],
  );

  const handleCatalogSave = useCallback(
    (productId: string) => {
      if (onToggleCatalogSave) {
        onToggleCatalogSave(productId);
        return;
      }
      handleToggleSave(productId);
    },
    [handleToggleSave, onToggleCatalogSave],
  );

  const displayedModalProducts: OutfitProduct[] =
    isCatalogOverride && !viewingOutfit
      ? displayedProducts
          .filter((product) => tryOnProductIds.includes(product.id))
          .map((product) => ({
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            brand: product.brand,
            price: product.price,
            category: product.category,
            affiliateUrl: product.affiliateUrl ?? null,
          }))
      : outfitModalProducts;

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-[1.042vw] overflow-hidden rounded-[1.042vw] border border-border-light bg-catalog-bg p-[1.25vw] ${className ?? ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-[0.521vw] gap-y-[0.417vw] self-stretch">
        <Tabs
          value={isExtraTabActive ? (extraTab?.value ?? "") : activeTab}
          onValueChange={(v) => {
            if (extraTab && v === extraTab.value) {
              setIsExtraTabActive(true);
            } else {
              setIsExtraTabActive(false);
              setActiveTab(v as CatalogTab);
            }
          }}
          className="flex shrink-0 flex-col"
        >
          <TabsList>
            {extraTab?.placement === "first" && (
              <TabsTrigger value={extraTab.value} className="whitespace-nowrap">
                {extraTab.label}
              </TabsTrigger>
            )}
            <TabsTrigger value="catalog" className="whitespace-nowrap">
              Catalog ({displayedTotalProducts})
            </TabsTrigger>
            <TabsTrigger value="my-closet" className="whitespace-nowrap">
              My Closet
            </TabsTrigger>
            <TabsTrigger value="saved-outfits" className="whitespace-nowrap">
              Saved Outfits
            </TabsTrigger>
            {extraTab && extraTab.placement !== "first" && (
              <TabsTrigger value={extraTab.value} className="whitespace-nowrap">
                {extraTab.label}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="ml-auto flex shrink-0 items-center gap-[0.417vw]">
          {headerActions}
          {!isExtraTabActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenViewPieces}
            >
              <EyeIcon size={16} color="var(--brand-blue)" className="!w-[0.833vw] !h-[0.833vw]" />
              View Pieces ({tryOnProductIds.length})
            </Button>
          )}
        </div>
      </div>

      {isExtraTabActive && extraTab ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {extraTab.content}
        </div>
      ) : (
      <>
      {activeTab !== "saved-outfits" && (
        <>
          <p className="text-[0.729vw] leading-[1.57] text-text-muted">
            {catalogDescription}
          </p>

          <div className="flex items-center gap-[0.313vw]">
            <div className="flex flex-1 items-center gap-[0.417vw] rounded border-[0.5px] border-product-card-border bg-white px-[0.625vw] py-[0.417vw]">
              <SearchIcon size={16} color="var(--input-placeholder)" className="!w-[0.833vw] !h-[0.833vw]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Try &quot;black oversized blazer&quot;"
                className="flex-1 bg-transparent text-[0.729vw] leading-[1.57] text-text-primary outline-none placeholder:text-input-placeholder"
              />
            </div>

            <Button
              variant="link"
              size="sm"
              onClick={() => setIsFilterOpen(true)}
            >
              <FilterIcon size={16} color="var(--brand-blue)" className="!w-[0.833vw] !h-[0.833vw]" />
              Sort &amp; Filter ({Object.values(filterState.selectedFilters).flat().length})
            </Button>
          </div>
        </>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-[0.833vw] self-stretch overflow-y-auto">
        {activeTab === "catalog" && (
          <>
            <div className="grid grid-cols-3 gap-[0.521vw] self-stretch">
              {!isCatalogOverride && isLoading && displayedProducts.length === 0 ? (
                <p className="col-span-3 py-[2.5vw] text-center text-[0.729vw] text-text-caption">
                  Loading products...
                </p>
              ) : displayedProducts.length === 0 ? (
                <p className="col-span-3 py-[2.5vw] text-center text-[0.729vw] text-text-caption">
                  No products found. Try a different search or filter.
                </p>
              ) : (
                displayedProducts.map((product) => (
                  <div key={product.id}>
                    <ProductCard
                      product={product}
                      isActive={tryOnProductIds.includes(product.id)}
                      onTryOn={handleTryOnToggle}
                      onToggleSave={handleCatalogSave}
                      actionLabel={productActionLabel}
                      activeActionLabel={activeProductActionLabel}
                      imageFit={productImageFit}
                    />
                  </div>
                ))
              )}
            </div>

            {!isCatalogOverride && isLoadingMore && (
              <p className="py-[0.833vw] text-center text-[0.729vw] text-text-caption">
                Loading more...
              </p>
            )}

            {!isCatalogOverride && (
              <div ref={sentinelRef} className="h-[0.052vw] shrink-0" />
            )}
          </>
        )}

        {activeTab === "my-closet" && (
          isLoadingCloset ? (
            <div className="flex flex-wrap gap-[0.833vw] self-stretch">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex w-[10.573vw] animate-pulse flex-col gap-[0.417vw] rounded-[0.729vw] bg-[#E5E6E8] p-[0.417vw]">
                  <div className="h-[12.083vw] w-full rounded-[1.042vw] bg-gray-300" />
                  <div className="flex flex-col gap-[0.313vw] self-stretch">
                    <div className="h-[0.833vw] w-3/4 rounded bg-gray-300" />
                    <div className="flex gap-[0.208vw]">
                      <div className="h-[1.042vw] w-[2.5vw] rounded-[0.625vw] bg-gray-300" />
                      <div className="h-[1.042vw] w-[2.083vw] rounded-[0.625vw] bg-gray-300" />
                    </div>
                    <div className="flex justify-end">
                      <div className="h-[1.458vw] w-[3.333vw] rounded-[0.417vw] bg-gray-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : closetItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-[2.5vw]">
              <p className="text-[0.729vw] text-text-caption">
                Your closet is empty. Try on items to see them here.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-[0.833vw] self-stretch">
              {closetItems.map((item) => (
                <SavedOutfitCard
                  key={item.id}
                  outfit={{
                    id: item.id,
                    name: "",
                    imageUrl: item.imageUrl,
                    date: item.date,
                    tags: [],
                    pieceCount: item.products.length,
                    products: item.products,
                  }}
                  onView={handleViewOutfit}
                />
              ))}
            </div>
          )
        )}

        {activeTab === "saved-outfits" && (
          <>
            <div className="flex flex-col gap-[0.208vw]">
              <span className="text-[0.729vw] leading-[1.57] text-text-primary">
                Your saved outfits
              </span>
              <span className="text-[0.625vw] leading-[1.667] text-text-muted">
                Outfits you generated from Try-on and AIStylist
              </span>
            </div>

            {isLoadingOutfits ? (
              <div className="flex flex-wrap gap-[0.833vw] self-stretch">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex w-[10.573vw] animate-pulse flex-col gap-[0.417vw] rounded-[0.729vw] bg-[#E5E6E8] p-[0.417vw]">
                    <div className="h-[12.083vw] w-full rounded-[1.042vw] bg-gray-300" />
                    <div className="flex flex-col gap-[0.313vw] self-stretch">
                      <div className="h-[0.833vw] w-3/4 rounded bg-gray-300" />
                      <div className="flex gap-[0.208vw]">
                        <div className="h-[1.042vw] w-[2.5vw] rounded-[0.625vw] bg-gray-300" />
                        <div className="h-[1.042vw] w-[2.083vw] rounded-[0.625vw] bg-gray-300" />
                      </div>
                      <div className="flex justify-end">
                        <div className="h-[1.458vw] w-[3.333vw] rounded-[0.417vw] bg-gray-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : savedOutfits.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-[2.5vw]">
                <p className="text-[0.729vw] text-text-caption">
                  No saved outfits yet. Generate outfits to see them here.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-[0.833vw] self-stretch">
                {savedOutfits.map((outfit) => (
                  <SavedOutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    onView={handleViewOutfit}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}

      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        sortOptions={SORT_OPTIONS}
        genderOptions={GENDER_OPTIONS}
        filterSections={filterSections}
        initialState={filterState}
        onApply={handleApplyFilters}
      />

      <OutfitModal
        isOpen={isOutfitModalOpen}
        onClose={handleCloseOutfitModal}
        products={displayedModalProducts}
        selectedIds={outfitModalProductIds}
        previewImageUrl={previewImageUrl}
        onToggleSelect={handleTryOnToggle}
        onTryOn={handleTryOnToggle}
        onGenerate={onGenerate}
        onChooseModel={onChooseModel}
      />
    </div>
  );
}
