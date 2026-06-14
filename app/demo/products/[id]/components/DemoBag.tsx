"use client";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import type { DemoProductView } from "../../types";

export type DemoAddToBagPayload = {
  productId?: string;
  productTitle?: string;
  productUrl?: string;
  productPrice?: number | string;
  productCompareAtPrice?: number | string;
  productCurrency?: string;
  recommendedSize?: string;
  sizingResult?: unknown;
  resultImageUrl?: string | null;
  historyEntryId?: string;
  selectedSizes?: Array<{
    sectionName: string;
    selectedSize: string;
    selectedLength?: string;
    displayLabel: string;
    isOverride: boolean;
  }>;
};

export type DemoBagItem = {
  lineId: string;
  productId: string;
  title: string;
  image: string;
  color?: string;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  sizeLabel: string;
  quantity: number;
};

function normalizePart(value: string | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9|:/ ._-]/g, "");
}

function sizeSummary(payload: DemoAddToBagPayload): string {
  const selected = payload.selectedSizes?.filter((size) => size.selectedSize || size.displayLabel) ?? [];
  if (selected.length > 0) {
    return selected
      .map((size) => {
        const value = size.displayLabel || [size.selectedSize, size.selectedLength].filter(Boolean).join(" / ");
        const section = size.sectionName?.trim();
        if (!section || /^your fit$/i.test(section)) return value;
        return `${section}: ${value}`;
      })
      .filter(Boolean)
      .join(" / ");
  }
  return payload.recommendedSize?.trim() || "Suggested size";
}

function normalizePrice(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function positivePrice(value: number | null | undefined): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

function formatPrice(price: number): string {
  const fractionDigits = Number.isInteger(price) ? 0 : 2;
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function buildDemoBagItem({
  product,
  image,
  color,
  payload,
}: {
  product: DemoProductView;
  image: string;
  color?: string;
  payload: DemoAddToBagPayload;
}): DemoBagItem {
  const sizeLabel = sizeSummary(payload);
  const productId = payload.productId || product.id;
  const price = positivePrice(normalizePrice(payload.productPrice)) ?? positivePrice(product.price);
  const compareAtPrice = positivePrice(normalizePrice(payload.productCompareAtPrice)) ?? positivePrice(product.originalPrice);
  const currency = "USD";
  const lineId = [
    normalizePart(productId),
    normalizePart(color),
    normalizePart(sizeLabel),
  ].filter(Boolean).join("|");

  return {
    lineId,
    productId,
    title: payload.productTitle || product.name,
    image: image || product.primaryImage,
    color,
    price,
    compareAtPrice,
    currency,
    sizeLabel,
    quantity: 1,
  };
}

export function mergeDemoBagItem(items: DemoBagItem[], item: DemoBagItem): DemoBagItem[] {
  const index = items.findIndex((existing) => existing.lineId === item.lineId);
  if (index === -1) return [...items, item];

  return items.map((existing, currentIndex) => (
    currentIndex === index
      ? { ...existing, quantity: existing.quantity + 1 }
      : existing
  ));
}

export function DemoBagButton({
  count,
  onClick,
  className = "",
}: {
  count: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open bag, ${count} item${count === 1 ? "" : "s"}`}
      className={`relative inline-flex items-center justify-center rounded-full border border-border-light bg-white text-text-body shadow-sm transition-colors hover:border-brand-blue/40 hover:text-brand-blue ${className}`}
    >
      <ShoppingBag className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function DemoBagDrawer({
  open,
  mode = "desktop",
  items,
  onClose,
  onClear,
  onRemove,
  onIncrement,
  onDecrement,
}: {
  open: boolean;
  mode?: "desktop" | "mobile";
  items: DemoBagItem[];
  onClose: () => void;
  onClear: () => void;
  onRemove: (lineId: string) => void;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
}) {
  const isMobile = mode === "mobile";

  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button
        type="button"
        aria-label="Close bag"
        onClick={onClose}
        className={`absolute inset-0 bg-black/25 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={[
          "absolute bg-white shadow-2xl transition-transform duration-300",
          isMobile
            ? `inset-x-0 bottom-0 max-h-[84vh] rounded-t-2xl ${open ? "translate-y-0" : "translate-y-full"}`
            : `right-0 top-0 h-full w-[min(420px,34vw)] ${open ? "translate-x-0" : "translate-x-full"}`,
        ].join(" ")}
      >
        <div className={`flex h-full flex-col ${isMobile ? "max-h-[84vh]" : ""}`}>
          <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-blue">Bag</p>
              <h2 className="mt-1 text-lg font-semibold text-text-primary">Your selections</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-text-hint transition-colors hover:text-text-primary"
              aria-label="Close bag"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {items.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-light text-text-hint">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-semibold text-text-primary">Your bag is empty</p>
                <p className="mt-1 max-w-[220px] text-xs leading-5 text-text-hint">
                  Add a suggested fit from the SDK result to review it here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.lineId} className="flex gap-3 rounded-xl border border-border-light bg-white p-3">
                    <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-light">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold leading-5 text-text-primary">{item.title}</p>
                          {item.color ? (
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-text-caption">{item.color}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(item.lineId)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-disabled transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label={`Remove ${item.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-2 rounded-lg bg-surface-light px-2 py-1 text-xs font-medium leading-5 text-text-body">
                        {item.sizeLabel}
                      </p>
                      {item.price !== null && item.price > 0 ? (
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-text-primary">{formatPrice(item.price)}</span>
                          {item.compareAtPrice !== null && item.compareAtPrice > item.price ? (
                            <span className="text-[11px] text-text-disabled line-through">{formatPrice(item.compareAtPrice)}</span>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-border-light bg-white">
                          <button
                            type="button"
                            onClick={() => onDecrement(item.lineId)}
                            className="flex h-7 w-8 items-center justify-center text-text-hint transition-colors hover:text-text-primary"
                            aria-label={`Decrease ${item.title} quantity`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-7 text-center text-xs font-semibold text-text-primary">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onIncrement(item.lineId)}
                            className="flex h-7 w-8 items-center justify-center text-text-hint transition-colors hover:text-brand-blue"
                            aria-label={`Increase ${item.title} quantity`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-[11px] font-medium text-text-caption">
                          {item.price !== null && item.price > 0 ? formatPrice(item.price * item.quantity) : "No checkout"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border-light px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                {items.reduce((sum, item) => sum + item.quantity, 0)} item{items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={onClear}
                disabled={items.length === 0}
                className="text-xs font-semibold text-text-hint transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear bag
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
