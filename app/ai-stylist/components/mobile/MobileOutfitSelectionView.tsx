"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  Shirt,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import type {
  OutfitIntelligenceResponse,
  IntelligentOutfit,
  IntelligentOutfitItem,
} from "@/app/ai-stylist/types";
import type { StylistPreparationStatus } from "@/app/ai-stylist/hooks/useOutfitIntelligence";
import { MobileStylistStage } from "./MobileStylistStage";

interface MobileOutfitSelectionViewProps {
  result: OutfitIntelligenceResponse;
  selectedIds: string[];
  onToggle: (outfitId: string) => void;
  onEditModel: () => void;
  onReset: () => void;
  onStartTryOns: () => void;
  tryOnPreparationStatus?: StylistPreparationStatus;
  tryOnError?: string | null;
}

type WorkspaceTab = "outfits" | "catalog" | "closet" | "saved";

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function productId(item: IntelligentOutfitItem): string {
  return item.id || item.styleRagId;
}

function OutfitPreview({ outfit }: { outfit: IntelligentOutfit }) {
  return (
    <div className="grid aspect-[5/4] grid-cols-2 gap-1 overflow-hidden rounded-xl bg-[#f5f5f7] p-2">
      {outfit.items.slice(0, 4).map((item) => (
        <div
          key={item.styleRagId}
          className="flex min-w-0 items-center justify-center overflow-hidden rounded-lg bg-white"
        >
          {/* Product images are dynamic affiliate/CDN URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.cutoutImageUrl ?? item.imageUrl}
            alt=""
            className="h-full w-full object-contain p-1"
          />
        </div>
      ))}
    </div>
  );
}

export function MobileOutfitSelectionView({
  result,
  selectedIds,
  onToggle,
  onEditModel,
  onReset,
  onStartTryOns,
  tryOnPreparationStatus = "idle",
  tryOnError,
}: MobileOutfitSelectionViewProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("outfits");
  const [piecesOutfit, setPiecesOutfit] =
    useState<IntelligentOutfit | null>(null);
  const selectionLimit = result.selectionLimit || 5;
  const selectionFull = selectedIds.length >= selectionLimit;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const catalogProducts = useMemo(() => {
    const products = new Map<
      string,
      IntelligentOutfitItem & { outfitId: string }
    >();
    for (const outfit of result.outfits) {
      for (const item of outfit.items) {
        const id = productId(item);
        if (!products.has(id))
          products.set(id, { ...item, outfitId: outfit.id });
      }
    }
    return Array.from(products.values());
  }, [result.outfits]);

  if (result.outfits.length === 0 && result.availabilityContext?.customerMessage) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl border border-[#dfe3eb] bg-white px-6 text-center">
        <h2 className="text-lg font-semibold text-[#20242c]">
          Delivery is not available yet
        </h2>
        <p className="max-w-sm text-sm leading-6 text-[#667085]">
          {result.availabilityContext.customerMessage}
        </p>
        <a
          href="/dashboard/profile"
          className="rounded-full bg-[#2457eb] px-5 py-3 text-sm font-semibold text-white"
        >
          Update delivery country
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <MobileStylistStage onReset={onReset} onEditModel={onEditModel} />

      <button
        type="button"
        onClick={onStartTryOns}
        disabled={
          selectedIds.length === 0 || tryOnPreparationStatus === "working"
        }
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2457eb] px-5 text-sm font-semibold text-white disabled:bg-[#c9c6d0]"
      >
        {tryOnPreparationStatus === "working" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {tryOnPreparationStatus === "working"
          ? "Preparing try-ons…"
          : `Try on selected outfits · ${selectedIds.length * 4} tokens`}
      </button>

      {tryOnError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {tryOnError}
        </p>
      )}

      <section className="overflow-hidden rounded-[20px] border border-[#dfdde4] bg-white">
        <div className="flex overflow-x-auto border-b border-[#dfdde4] bg-[#ececef] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ["outfits", `Outfits (${result.outfits.length})`],
              ["catalog", `Catalog (${catalogProducts.length})`],
              ["closet", "My Closet"],
              ["saved", "Saved Outfits"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`relative min-h-12 shrink-0 px-4 text-sm ${
                activeTab === value
                  ? "bg-white font-medium text-[#2457eb]"
                  : "text-[#77737f]"
              }`}
            >
              {label}
              {activeTab === value && (
                <span className="absolute inset-x-0 top-0 h-0.5 bg-[#2457eb]" />
              )}
            </button>
          ))}
        </div>

        {activeTab === "outfits" && (
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#24212c]">
                  Select up to {selectionLimit} outfits
                </h2>
                <p className="mt-0.5 text-xs text-[#77737f]">
                  Choose the looks you want to try on.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#efebff] px-3 py-1.5 text-xs font-semibold text-[#5945cb]">
                {selectedIds.length} / {selectionLimit}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {result.outfits.map((outfit) => {
                const selected = selectedSet.has(outfit.id);
                return (
                  <article
                    key={outfit.id}
                    className={`overflow-hidden rounded-2xl border p-2 ${
                      selected
                        ? "border-[#7258fa] bg-[#f5f2ff]"
                        : "border-[#e4e2e8] bg-white"
                    }`}
                  >
                    <OutfitPreview outfit={outfit} />
                    <div className="px-0.5 pt-2">
                      <h3 className="line-clamp-2 text-xs font-semibold leading-4 text-[#24212c]">
                        {outfit.label}
                      </h3>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#77737f]">
                        <span className="flex items-center gap-1">
                          <Shirt className="size-3" />
                          {outfit.items.length} pieces
                        </span>
                        <span className="font-semibold text-[#24212c]">
                          {formatMoney(outfit.totalPrice, outfit.currency)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggle(outfit.id)}
                        disabled={!selected && selectionFull}
                        aria-pressed={selected}
                        className={`mt-2 flex min-h-9 w-full items-center justify-center gap-1 rounded-full text-xs font-semibold ${
                          selected
                            ? "bg-[#7258fa] text-white"
                            : selectionFull
                              ? "bg-[#e9e7eb] text-[#aaa6b0]"
                              : "bg-[#dce9ff] text-[#2457eb]"
                        }`}
                      >
                        {selected && <Check className="size-3.5" />}
                        {selected
                          ? "Selected"
                          : selectionFull
                            ? "Max 5"
                            : "Select"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPiecesOutfit(outfit)}
                        className="mt-1.5 w-full text-center text-[11px] font-semibold text-[#5945cb]"
                      >
                        View pieces and sizes
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "catalog" && (
          <div className="p-3">
            <p className="mb-3 text-sm text-[#5f5a68]">
              Browse the real products selected by your AI Stylist.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {catalogProducts.map((product) => (
                <article
                  key={productId(product)}
                  className="overflow-hidden rounded-2xl border border-[#e4e2e8] bg-white p-2"
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f7]">
                    {/* Product images are dynamic affiliate/CDN URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.cutoutImageUrl ?? product.imageUrl}
                      alt={product.title}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-xs font-semibold leading-4 text-[#24212c]">
                    {product.title}
                  </h3>
                  <p className="mt-1 truncate text-[10px] text-[#77737f]">
                    {product.brand || product.merchantName}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-[#5945cb]">
                    {product.sizeStatus === "loading"
                      ? "Finding your size…"
                      : product.recommendedSize
                        ? `Your size: ${product.recommendedSize}`
                        : "Size unavailable"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#24212c]">
                      {formatMoney(product.price, product.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggle(product.outfitId)}
                      aria-label={`Select the outfit containing ${product.title}`}
                      className="flex size-8 items-center justify-center rounded-full bg-[#dce9ff] text-[#2457eb]"
                    >
                      <Shirt className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {(activeTab === "closet" || activeTab === "saved") && (
          <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
            {activeTab === "closet" ? (
              <UserRound className="size-8 text-[#9b96a1]" />
            ) : (
              <RotateCcw className="size-8 text-[#9b96a1]" />
            )}
            <h2 className="mt-3 text-sm font-semibold text-[#24212c]">
              {activeTab === "closet" ? "Your closet" : "Your saved outfits"}
            </h2>
            <p className="mt-1 max-w-60 text-xs leading-5 text-[#77737f]">
              Open the full section from the dashboard to manage these items.
            </p>
          </div>
        )}
      </section>

      {piecesOutfit && (
        <div
          className="fixed inset-0 z-[90] flex items-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-outfit-pieces-title"
        >
          <button
            type="button"
            aria-label="Close outfit pieces"
            onClick={() => setPiecesOutfit(null)}
            className="absolute inset-0 bg-[#17141f]/40"
          />
          <section className="relative z-10 max-h-[78dvh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-[#e8e6ec] px-4 py-4">
              <div>
                <h2
                  id="mobile-outfit-pieces-title"
                  className="text-base font-semibold text-[#24212c]"
                >
                  {piecesOutfit.label}
                </h2>
                <p className="mt-1 text-xs text-[#77737f]">
                  What to buy in your recommended size
                </p>
              </div>
              <button
                type="button"
                aria-label="Close outfit pieces"
                onClick={() => setPiecesOutfit(null)}
                className="rounded-full border border-[#e4e2e8] p-2 text-[#5f5a68]"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="max-h-[65dvh] space-y-2 overflow-y-auto p-4">
              {piecesOutfit.items.map((item) => (
                <article
                  key={item.styleRagId}
                  className="flex gap-3 rounded-2xl border border-[#e4e2e8] p-3"
                >
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f4f7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.cutoutImageUrl ?? item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-xs font-semibold text-[#24212c]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-[#77737f]">
                      {item.brand || item.merchantName}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#5945cb]">
                      {item.sizeStatus === "loading"
                        ? "Finding your size…"
                        : item.recommendedSize
                          ? `Your size: ${item.recommendedSize}`
                          : "Size recommendation unavailable"}
                    </p>
                    {item.purchaseDisabled ? (
                      <p className="mt-2 text-[11px] leading-4 text-[#8a5a12]">
                        {item.availabilityMessage ??
                          "This item is no longer available for purchase."}
                      </p>
                    ) : (
                      <a
                        href={`/shop/ai-stylist/product/${encodeURIComponent(productId(item))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2154ef]"
                      >
                        Details
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
