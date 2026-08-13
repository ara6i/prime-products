"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  Button,
} from "@/app/shared/components/ui";
import {
  CloseIcon,
  SearchIcon,
  ApparelIcon,
  CalendarIcon,
  BookmarkOutlineIcon,
  InfoOutlineIcon,
  CheckIcon,
} from "@/app/shared/components/icons";
import { AffiliateBuyButton } from "@/app/try-on/components/AffiliateBuyButton";
import type {
  CatalogTab,
  CatalogProduct,
  SavedOutfit,
  TryOnProductDetail,
} from "@/app/try-on/types";

const TAB_LABELS: Record<CatalogTab, string> = {
  catalog: "Catalog",
  "saved-outfits": "Saved Outfits",
  "my-closet": "My Closet",
};

interface CatalogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: CatalogTab;
  products: CatalogProduct[];
  savedOutfits: SavedOutfit[];
  closetProducts: CatalogProduct[];
  closetOutfits: SavedOutfit[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  isLoadingCloset: boolean;
  isLoadingOutfits: boolean;
  tryOnProductIds: string[];
  onToggleTryOn: (productId: string, details?: TryOnProductDetail) => void;
}

export function CatalogSheet({
  isOpen,
  onClose,
  activeTab,
  products,
  savedOutfits,
  closetProducts,
  closetOutfits,
  searchQuery,
  onSearchChange,
  isLoading,
  isLoadingCloset,
  isLoadingOutfits,
  tryOnProductIds,
  onToggleTryOn,
}: CatalogSheetProps) {
  const handleToggle = (productId: string, product?: TryOnProductDetail) => {
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
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-3 rounded-t-[20px] border-none bg-[#fafafa] px-4 pb-4 pt-5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold leading-[26px] text-brand-blue">
            {TAB_LABELS[activeTab]}
          </span>
          <Button variant="link" size="sm" onClick={onClose}>
            <CloseIcon size={16} color="var(--brand-blue)" />
          </Button>
        </div>

        {activeTab !== "saved-outfits" && activeTab !== "my-closet" && (
          <div className="flex h-9 items-center gap-2 rounded border-[0.5px] border-input-border bg-white px-3 py-2">
            <SearchIcon size={16} color="var(--text-hint)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Try "black oversized blazer"`}
              className="flex-1 bg-transparent text-sm leading-[1.571em] text-text-primary outline-none placeholder:text-input-border"
            />
          </div>
        )}

        {activeTab === "saved-outfits" && (
          <p className="text-sm leading-[1.571em] text-text-muted">
            Choose from your saved outfits:
          </p>
        )}

        <div className="flex-1 overflow-y-auto">
          {activeTab === "catalog" && (
            <CatalogGrid
              products={products}
              isLoading={isLoading}
              tryOnProductIds={tryOnProductIds}
              onToggle={handleToggle}
            />
          )}

          {activeTab === "my-closet" && (
            <ClosetGrid
              outfits={closetOutfits}
              items={closetProducts}
              isLoadingOutfits={isLoadingOutfits}
              isLoadingItems={isLoadingCloset}
              tryOnProductIds={tryOnProductIds}
              onToggle={handleToggle}
            />
          )}

          {activeTab === "saved-outfits" && (
            <OutfitsList
              outfits={savedOutfits}
              isLoading={isLoadingOutfits}
            />
          )}
        </div>

        <Button
          variant="primary"
          size="default"
          className="w-full shrink-0"
          onClick={onClose}
        >
          <CheckIcon size={16} color="white" />
          Choose
        </Button>
      </SheetContent>
    </Sheet>
  );
}

/* ── Catalog Grid ────────────────────────────────── */

function CatalogGrid({
  products,
  isLoading,
  tryOnProductIds,
  onToggle,
}: {
  products: CatalogProduct[];
  isLoading: boolean;
  tryOnProductIds: string[];
  onToggle: (id: string, product?: TryOnProductDetail) => void;
}) {
  const uniqueProducts = Array.from(new Map(products.map((p) => [p.id, p])).values());

  if (isLoading && uniqueProducts.length === 0) {
    return <p className="py-12 text-center text-sm text-text-hint">Loading...</p>;
  }
  if (uniqueProducts.length === 0) {
    return <p className="py-12 text-center text-sm text-text-hint">No products found</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      {uniqueProducts.map((product) => {
        const isSelected = tryOnProductIds.includes(product.id);
        return (
          <div
            key={product.id}
            className={`flex flex-col gap-2 rounded-[20px] p-2 ${
              isSelected
                ? "border border-[#80b3ff] bg-[#dae7ff]"
                : "border-[0.5px] border-[#adb1b3] bg-[#e5e6e8]"
            }`}
          >
            {/* Image container */}
            <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[20px] border-[0.5px] border-[#adb1b3] bg-white p-[7px]">
              <div className="relative h-[132px] w-[88px] shrink-0">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="88px"
                  className="object-contain"
                />
              </div>
              {/* Token badge bottom-left */}
              <div className="absolute bottom-[5px] left-[5px] flex h-6 items-center gap-1 rounded-[11px] bg-[#ffef87] px-1 py-[2px]">
                <ApparelIcon size={14} color="#b95d04" />
                <span className="text-[10px] font-normal leading-[20px] text-[#b95d04]">5</span>
              </div>
              {/* Bookmark bottom-right */}
              <button className="absolute bottom-[5px] right-[5px] flex items-center justify-center rounded-[30px] bg-[#bed6ff] p-2">
                <BookmarkOutlineIcon size={16} color="#2154ef" />
              </button>
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col justify-between gap-1 overflow-hidden">
              <div className="flex flex-col">
                <span className="w-full truncate text-[14px] leading-[22px] text-[#1c1d1e]">
                  {product.name}
                </span>
                <span className="w-full truncate text-[12px] leading-[20px] text-[#696e71]">
                  {product.brand}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex w-full items-center gap-[2px]">
                  <span className="text-[14px] font-medium leading-[22px] text-[#1c1d1e]">
                    ${product.price.toFixed(2)}
                  </span>
                  <InfoOutlineIcon size={12} color="var(--text-hint)" />
                </div>
                <div className="flex w-full justify-end gap-1">
                  <AffiliateBuyButton
                    affiliateUrl={product.affiliateUrl}
                    variant="outline-dark"
                    size="xs"
                    className="h-[36px] w-[72px] shrink-0 text-[12px]"
                  />
                  <button
                    className={`flex h-[36px] w-[72px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium ${
                      isSelected ? "bg-[#d1d1d1] text-[#4f4f4f]" : "bg-[#888] text-white"
                    }`}
                    onClick={() => onToggle(product.id, product)}
                  >
                    {isSelected ? "Remove" : "Try on"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── My Closet Grid (with Outfits / Items sub-tabs) ── */

function ClosetGrid({
  outfits,
  items,
  isLoadingOutfits,
  isLoadingItems,
  tryOnProductIds,
  onToggle,
}: {
  outfits: SavedOutfit[];
  items: CatalogProduct[];
  isLoadingOutfits: boolean;
  isLoadingItems: boolean;
  tryOnProductIds: string[];
  onToggle: (id: string, product?: TryOnProductDetail) => void;
}) {
  const [subTab, setSubTab] = useState<"outfits" | "items">("outfits");

  return (
    <div className="flex flex-col gap-3">
      {/* Sub-tabs */}
      <div className="flex items-end border-b-[0.5px] border-input-border">
        {(["outfits", "items"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`rounded-t border-[0.5px] border-input-border px-3 py-1.5 text-sm capitalize leading-[1.571em] ${
              subTab === tab
                ? "border-b-0 bg-white text-brand-blue"
                : "bg-surface-light text-text-muted"
            }`}
          >
            {tab === "outfits" ? "Outfits" : "Items"}
          </button>
        ))}
      </div>

      {subTab === "outfits" && (
        isLoadingOutfits ? (
          <p className="py-12 text-center text-sm text-text-hint">Loading...</p>
        ) : outfits.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-hint">No saved outfits yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {outfits.map((outfit) => (
              <div
                key={outfit.id}
                className="flex flex-col gap-2 rounded-[14px] border-[0.5px] border-product-card-border bg-white p-2"
              >
                <div className="relative h-[180px] w-full overflow-hidden rounded-[10px] bg-white">
                  <Image
                    src={outfit.imageUrl}
                    alt={outfit.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 170px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1.5 overflow-hidden px-1">
                  <div className="flex items-center gap-1">
                    <CalendarIcon size={14} color="var(--text-hint)" />
                    <span className="truncate text-xs leading-[1.667em] text-text-primary">
                      {outfit.date}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {outfit.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-[12px] bg-brand-blue-light px-1.5 text-[10px] leading-[1.6em] text-brand-blue"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex justify-end">
                    <Button
                      variant="primary"
                      size="xs"
                      className="h-7 rounded-full px-3 text-[11px]"
                      onClick={() => {
                        outfit.products.forEach((p) =>
                          onToggle(p.id, { id: p.id, name: p.name, imageUrl: p.imageUrl, category: p.category, brand: p.brand, price: p.price })
                        );
                      }}
                    >
                      Try Outfit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {subTab === "items" && (
        isLoadingItems ? (
          <p className="py-12 text-center text-sm text-text-hint">Loading...</p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-hint">Your closet is empty</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {Array.from(new Map(items.map((p) => [p.id, p])).values()).map((product) => {
              const isSelected = tryOnProductIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  className={`flex flex-col gap-2 rounded-[20px] border p-2 ${
                    isSelected
                      ? "border-[#80b3ff] bg-[#dae7ff]"
                      : "border-[0.5px] border-[#adb1b3] bg-[#e5e6e8]"
                  }`}
                >
                  {/* Product image */}
                  <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[20px] border-[0.5px] border-[#adb1b3] bg-white p-[7px]">
                    <div className="relative h-[151px] w-[101px] shrink-0">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="101px"
                        className="object-contain"
                      />
                    </div>
                    {/* Token badge bottom-left */}
                    <div className="absolute bottom-[5px] left-[5px] flex h-6 items-center gap-1 rounded-[11px] bg-[#ffef87] px-1 py-[2px]">
                      <ApparelIcon size={14} color="#b95d04" />
                      <span className="text-[10px] font-normal leading-[20px] text-[#b95d04]">5</span>
                    </div>
                    {/* Bookmark bottom-right */}
                    <button className="absolute bottom-[5px] right-[5px] flex items-center justify-center rounded-[30px] bg-[#bed6ff] p-2">
                      <BookmarkOutlineIcon size={16} color="#2154ef" />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between gap-1 overflow-hidden">
                    <div className="flex flex-col">
                      <span className="w-full truncate text-[14px] leading-[22px] text-[#1c1d1e]">
                        {product.name}
                      </span>
                      <span className="w-full truncate text-[12px] leading-[20px] text-[#696e71]">
                        {product.brand}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex w-full items-center gap-[2px]">
                        <span className="text-[14px] font-medium leading-[22px] text-[#1c1d1e]">
                          ${product.price.toFixed(2)}
                        </span>
                        <InfoOutlineIcon size={12} color="var(--text-hint)" />
                      </div>
                      <div className="flex w-full justify-end gap-1">
                        <AffiliateBuyButton
                          affiliateUrl={product.affiliateUrl}
                          variant="outline-dark"
                          size="xs"
                          className="h-[36px] w-[72px] shrink-0 text-[12px]"
                        />
                        <button
                          className={`flex h-[36px] w-[72px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium ${
                            isSelected ? "bg-[#d1d1d1] text-[#4f4f4f]" : "bg-[#888] text-white"
                          }`}
                          onClick={() => onToggle(product.id, { ...product, category: product.category })}
                        >
                          {isSelected ? "Remove" : "Try on"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

/* ── Saved Outfits List ────────────────────────────── */

function OutfitsList({
  outfits,
  isLoading,
}: {
  outfits: SavedOutfit[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="py-12 text-center text-sm text-text-hint">Loading...</p>;
  }
  if (outfits.length === 0) {
    return <p className="py-12 text-center text-sm text-text-hint">No saved outfits yet</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {outfits.map((outfit) => (
        <div
          key={outfit.id}
          className="flex flex-col gap-2 rounded-[14px] border-[0.5px] border-product-card-border bg-white p-2"
        >
          <div className="relative flex w-full overflow-hidden rounded-[10px] bg-white">
            <div className="relative h-[180px] w-full">
              <Image
                src={outfit.imageUrl}
                alt={outfit.name}
                fill
                sizes="(max-width: 768px) 50vw, 170px"
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 overflow-hidden px-1">
            <div className="flex items-center gap-1">
              <CalendarIcon size={14} color="var(--text-hint)" />
              <span className="text-xs leading-[1.667em] text-text-primary">
                {outfit.date}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {outfit.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-[12px] bg-brand-blue-light px-1.5 text-[10px] leading-[1.6em] text-brand-blue"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="fill-neutral" size="xs" className="h-7 text-[11px]">
                View ({outfit.pieceCount})
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
