"use client";

import Image from "next/image";
import { Funnel } from "lucide-react";
import {
  ApparelIcon,
  BookmarkIcon,
  BookmarkOutlineIcon,
  CheckroomIcon,
  ExternalLinkIcon,
  GenerateIcon,
  InfoOutlineIcon,
  SearchIcon,
} from "@/app/shared/components/icons";
import { FilterDrawer } from "@/app/shared/components/filter-drawer";
import {
  GENDER_OPTIONS,
  SORT_OPTIONS,
} from "@/app/shared/data/filter-config";
import type { useCatalogPanel } from "@/app/try-on/hooks/useCatalogPanel";
import type {
  CatalogProduct,
  CatalogTab,
  ClosetItem,
  SavedOutfit,
  TryOnProductDetail,
} from "@/app/try-on/types";

type CatalogController = ReturnType<typeof useCatalogPanel>;

interface MobileTryOnCatalogProps {
  catalog: Omit<CatalogController, "sentinelRef">;
  sentinelRef: CatalogController["sentinelRef"];
  tryOnProductIds: string[];
  onToggleTryOn: (
    productId: string,
    details?: TryOnProductDetail,
  ) => void;
  onGenerate: () => void;
  onViewPieces: () => void;
  isGenerating: boolean;
  tokenCost: number;
}

const BROWSE_TABS: { value: CatalogTab; label: string }[] = [
  { value: "catalog", label: "Catalog" },
  { value: "my-closet", label: "My Closet" },
  { value: "saved-outfits", label: "Saved Outfits" },
];

function safeAffiliateUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function productDetails(product: CatalogProduct): TryOnProductDetail {
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    category: product.category,
    brand: product.brand,
    price: product.price,
    affiliateUrl: product.affiliateUrl ?? null,
  };
}

function MobileTryOnProductCard({
  product,
  isActive,
  onToggleTryOn,
  onToggleSave,
}: {
  product: CatalogProduct;
  isActive: boolean;
  onToggleTryOn: (
    productId: string,
    details?: TryOnProductDetail,
  ) => void;
  onToggleSave: (productId: string) => void;
}) {
  const affiliateUrl = safeAffiliateUrl(product.affiliateUrl);

  return (
    <article className="flex min-w-0 flex-col gap-2">
      <div className="relative h-[166px] w-full overflow-hidden rounded-[8px] border-[0.5px] border-[#adb1b3] bg-[#f9f9f9]">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 390px) calc(50vw - 34px), 164px"
          className="object-contain p-3"
        />

        <div className="absolute bottom-[5px] left-[5px] flex h-6 items-center gap-1 rounded-full bg-[#ffef87] px-2">
          <CheckroomIcon size={14} color="#b95d04" />
          <span className="text-[12px] leading-5 text-[#b95d04]">12</span>
        </div>

        <button
          type="button"
          aria-label={product.isSaved ? "Remove bookmark" : "Save product"}
          aria-pressed={product.isSaved}
          onClick={() => onToggleSave(product.id)}
          className="absolute bottom-[5px] right-[5px] flex size-8 items-center justify-center rounded-full bg-[#d1d1d1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2154ef]"
        >
          {product.isSaved ? (
            <BookmarkIcon size={16} color="#595959" />
          ) : (
            <BookmarkOutlineIcon size={16} color="#595959" />
          )}
        </button>
      </div>

      <div className="flex min-w-0 flex-col">
        <h3 className="truncate text-[12px] font-medium leading-5 text-[#1c1d1e]">
          {product.name}
        </h3>
        <p className="truncate text-[12px] font-bold leading-5 text-[#696e71]">
          {product.brand}
        </p>
        <div className="flex items-center gap-0.5">
          <span className="text-[14px] font-medium leading-[22px] text-[#1c1d1e]">
            ${product.price.toFixed(2)}
          </span>
          <InfoOutlineIcon size={12} color="#767676" />
        </div>
      </div>

      <div className="flex h-9 items-center justify-between gap-2">
        <button
          type="button"
          aria-pressed={isActive}
          onClick={() => onToggleTryOn(product.id, productDetails(product))}
          className={`h-9 min-w-[78px] rounded-full px-4 text-[12px] font-medium leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2154ef] ${
            isActive
              ? "border border-[#2154ef] bg-white text-[#2154ef]"
              : "bg-[#bed6ff] text-[#193edc]"
          }`}
        >
          {isActive ? "Tried on" : "Try on"}
        </button>

        {affiliateUrl ? (
          <a
            href={affiliateUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            aria-label={`Open ${product.name} product page`}
            className="flex size-9 items-center justify-center rounded-full text-[#666] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2154ef]"
          >
            <ExternalLinkIcon size={16} color="currentColor" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Product link unavailable"
            className="flex size-9 items-center justify-center rounded-full text-[#999]"
          >
            <ExternalLinkIcon size={16} color="currentColor" />
          </button>
        )}
      </div>
    </article>
  );
}

function CatalogGrid({
  catalog,
  sentinelRef,
  tryOnProductIds,
  onToggleTryOn,
}: Pick<
  MobileTryOnCatalogProps,
  "catalog" | "sentinelRef" | "tryOnProductIds" | "onToggleTryOn"
>) {
  const products = Array.from(
    new Map(catalog.products.map((product) => [product.id, product])).values(),
  );

  if (catalog.isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[278px] animate-pulse rounded-[10px] bg-[#f0f0f0]"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[#767676]">
        No products found
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-2 gap-y-6">
        {products.map((product) => (
          <MobileTryOnProductCard
            key={product.id}
            product={product}
            isActive={tryOnProductIds.includes(product.id)}
            onToggleTryOn={onToggleTryOn}
            onToggleSave={catalog.handleToggleSave}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-px" />
    </>
  );
}

function ClosetGrid({
  products,
  items,
  isLoading,
  tryOnProductIds,
  onToggleTryOn,
  onToggleSave,
}: {
  products: CatalogProduct[];
  items: ClosetItem[];
  isLoading: boolean;
  tryOnProductIds: string[];
  onToggleTryOn: MobileTryOnCatalogProps["onToggleTryOn"];
  onToggleSave: (productId: string) => void;
}) {
  if (isLoading) {
    return <p className="py-12 text-center text-[13px] text-[#767676]">Loading...</p>;
  }

  if (products.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-x-2 gap-y-6">
        {products.map((product) => (
          <MobileTryOnProductCard
            key={product.id}
            product={product}
            isActive={tryOnProductIds.includes(product.id)}
            onToggleTryOn={onToggleTryOn}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[#767676]">
        Your closet is empty
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-[10px] border border-[#e7e7e7] bg-white"
        >
          <div className="relative aspect-[4/5]">
            <Image
              src={item.imageUrl}
              alt="Saved try-on"
              fill
              sizes="(max-width: 390px) calc(50vw - 34px), 164px"
              className="object-cover"
            />
          </div>
          <div className="p-2">
            <p className="text-[12px] leading-5 text-[#343538]">{item.date}</p>
            <p className="text-[11px] leading-[18px] text-[#767676]">
              {item.products.length} pieces
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function SavedOutfitsGrid({
  outfits,
  isLoading,
}: {
  outfits: SavedOutfit[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="py-12 text-center text-[13px] text-[#767676]">Loading...</p>;
  }

  if (outfits.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[#767676]">
        No saved outfits yet
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {outfits.map((outfit) => (
        <article
          key={outfit.id}
          className="overflow-hidden rounded-[10px] border border-[#e7e7e7] bg-white"
        >
          <div className="relative aspect-[4/5]">
            <Image
              src={outfit.imageUrl}
              alt={outfit.name || "Saved outfit"}
              fill
              sizes="(max-width: 390px) calc(50vw - 34px), 164px"
              className="object-cover"
            />
          </div>
          <div className="p-2">
            <p className="truncate text-[12px] font-medium leading-5 text-[#343538]">
              {outfit.name || "Saved outfit"}
            </p>
            <p className="text-[11px] leading-[18px] text-[#767676]">
              {outfit.pieceCount} pieces
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MobileTryOnCatalog({
  catalog,
  sentinelRef,
  tryOnProductIds,
  onToggleTryOn,
  onGenerate,
  onViewPieces,
  isGenerating,
  tokenCost,
}: MobileTryOnCatalogProps) {
  const activeFilterCount = Object.values(
    catalog.filterState.selectedFilters,
  ).flat().length;

  return (
    <section
      aria-label="Try-on catalog"
      className="overflow-hidden rounded-[8px] border border-[#e7e7e7] bg-white"
    >
      <div
        role="tablist"
        aria-label="Browse source"
        className="grid h-[38px] grid-cols-3"
      >
        {BROWSE_TABS.map((tab) => {
          const active = catalog.activeTab === tab.value;
          const label =
            tab.value === "catalog"
              ? `Catalog (${tryOnProductIds.length})`
              : tab.label;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => catalog.setActiveTab(tab.value)}
              className={`border-t-2 px-2 text-[14px] leading-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2154ef] ${
                active
                  ? "border-[#3773fa] bg-white font-medium text-[#3773fa]"
                  : "border-transparent bg-[#e5e6e8] font-normal text-[#767676]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-3 py-4">
        {catalog.activeTab !== "saved-outfits" && (
          <>
            <p className="text-[12px] leading-5 text-[#434547]">
              Browse fashion items with AI-powered recommendations
            </p>

            <div className="flex h-9 items-center gap-1.5">
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[4px] border-[0.5px] border-[#adb1b3] bg-[#f6f6f6] px-3">
                <span className="sr-only">Search catalog</span>
                <SearchIcon size={16} color="#767676" />
                <input
                  type="search"
                  value={catalog.searchQuery}
                  onChange={(event) =>
                    catalog.setSearchQuery(event.target.value)
                  }
                  placeholder="Try “black oversized blazer”"
                  className="min-w-0 flex-1 bg-transparent text-[14px] leading-[22px] text-[#1c1d1e] outline-none placeholder:text-[#b0b0b0]"
                />
              </label>

              <button
                type="button"
                aria-label={`Open filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
                onClick={() => catalog.setIsFilterOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#2154ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2154ef]"
              >
                <Funnel
                  aria-hidden="true"
                  size={24}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </button>
            </div>
          </>
        )}

        {catalog.activeTab === "catalog" && (
          <CatalogGrid
            catalog={catalog}
            sentinelRef={sentinelRef}
            tryOnProductIds={tryOnProductIds}
            onToggleTryOn={onToggleTryOn}
          />
        )}

        {catalog.activeTab === "my-closet" && (
          <ClosetGrid
            products={catalog.closetProducts}
            items={catalog.closetItems}
            isLoading={
              catalog.isLoadingClosetProducts || catalog.isLoadingCloset
            }
            tryOnProductIds={tryOnProductIds}
            onToggleTryOn={onToggleTryOn}
            onToggleSave={catalog.handleToggleSave}
          />
        )}

        {catalog.activeTab === "saved-outfits" && (
          <SavedOutfitsGrid
            outfits={catalog.savedOutfits}
            isLoading={catalog.isLoadingOutfits}
          />
        )}

        {tryOnProductIds.length > 0 && (
          <div className="mt-2 flex h-[58px] items-center gap-2 rounded-full bg-[#dae7ff] p-1.5">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onGenerate}
              className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#2154ef] px-3 text-[13px] font-medium text-white disabled:bg-[#d1d1d1]"
            >
              <GenerateIcon size={18} color="currentColor" />
              {isGenerating ? "Generating..." : "Generate"}
              <span className="rounded-full bg-[#ffef87] px-1.5 text-[11px] leading-5 text-[#b95d04]">
                {tokenCost}
              </span>
            </button>
            <button
              type="button"
              onClick={onViewPieces}
              className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-full border border-[#2154ef] px-3 text-[12px] font-medium text-[#2154ef]"
            >
              <ApparelIcon size={18} color="currentColor" />
              View Pieces ({tryOnProductIds.length})
            </button>
          </div>
        )}
      </div>

      <FilterDrawer
        isOpen={catalog.isFilterOpen}
        onClose={() => catalog.setIsFilterOpen(false)}
        sortOptions={SORT_OPTIONS}
        genderOptions={GENDER_OPTIONS}
        filterSections={catalog.filterSections}
        initialState={catalog.filterState}
        onApply={catalog.handleApplyFilters}
      />
    </section>
  );
}
