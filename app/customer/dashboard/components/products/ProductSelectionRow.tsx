/* eslint-disable @next/next/no-img-element */
import { Button } from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";
import {
  productHasInventory,
  productInventorySummary,
  variantInventoryQuantity,
} from "../../mappers/productCsvMapper";
import type { CustomerImportedProduct, CustomerProductSelectionState } from "../../types/products";

function ProductImage({ src, title, className }: { src: string; title: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center rounded-[0.833vw] border border-customer-border bg-customer-soft text-customer-xs font-semibold uppercase tracking-[0.14em] text-customer-muted max-lg:rounded-[3vw] max-lg:text-[2.4vw]", className)}>
        No image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className={cn("rounded-[0.833vw] border border-customer-border bg-customer-soft object-cover max-lg:rounded-[3vw]", className)}
      loading="lazy"
    />
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: string; tone?: "blue" | "green" | "neutral" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[0.521vw] py-[0.208vw] text-[0.625vw] font-semibold uppercase tracking-[0.1em] max-lg:px-[2.5vw] max-lg:py-[1vw] max-lg:text-[2.5vw]",
        tone === "blue" && "bg-customer-blue text-brand-blue",
        tone === "green" && "bg-customer-success-bg text-customer-success-text",
        tone === "warning" && "bg-customer-warning-bg text-customer-warning-text",
        tone === "neutral" && "bg-customer-soft text-customer-muted",
      )}
    >
      {children}
    </span>
  );
}

function ProductSwitch({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-[1.563vw] w-[2.917vw] rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45 max-lg:h-[7vw] max-lg:w-[13vw]",
        checked ? "border-brand-blue bg-brand-blue" : "border-customer-border-strong bg-customer-soft",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-[1.146vw] w-[1.146vw] -translate-y-1/2 rounded-full bg-white shadow-[0_0.104vw_0.313vw_rgba(15,23,42,0.2)] transition-transform max-lg:h-[5vw] max-lg:w-[5vw]",
          checked ? "translate-x-[1.458vw] max-lg:translate-x-[6.2vw]" : "translate-x-[0.208vw] max-lg:translate-x-[1vw]",
        )}
      />
    </button>
  );
}

interface ProductSelectionRowProps {
  product: CustomerImportedProduct;
  state: CustomerProductSelectionState;
  expanded: boolean;
  onToggleCycle: () => void;
  onToggleStorefront: () => void;
  onToggleExpanded: () => void;
}

export function ProductSelectionRow({
  product,
  state,
  expanded,
  onToggleCycle,
  onToggleStorefront,
  onToggleExpanded,
}: ProductSelectionRowProps) {
  const hasInventory = productHasInventory(product);
  const storefrontDisabled = !state.currentCycle || !hasInventory;

  return (
    <article className="border-b border-customer-border last:border-b-0">
      <div className="grid grid-cols-[3.75vw_minmax(0,1fr)_auto] items-center gap-[var(--spacing-customer-gap-md)] px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-md)] max-lg:grid-cols-[16vw_minmax(0,1fr)] max-lg:gap-[3vw] max-lg:px-[4vw] max-lg:py-[4vw]">
        <ProductImage src={product.image} title={product.title} className="aspect-square h-[3.75vw] w-[3.75vw] max-lg:h-[16vw] max-lg:w-[16vw]" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[var(--spacing-customer-gap-xs)] max-lg:gap-[1.6vw]">
            <h3 className="truncate text-[clamp(13px,0.78vw,15px)] font-semibold text-text-primary max-lg:max-w-full max-lg:text-[3.5vw]">
              {product.title}
            </h3>
            {state.currentStorefront ? <StatusBadge tone="green">Live</StatusBadge> : <StatusBadge>Off</StatusBadge>}
            {state.currentCycle ? <StatusBadge tone="blue">Current cycle</StatusBadge> : <StatusBadge tone="warning">Not included</StatusBadge>}
          </div>
          <p className="mt-[0.208vw] truncate text-[clamp(12px,0.68vw,13px)] text-customer-muted max-lg:mt-[1vw] max-lg:text-[3vw]">
            {product.collection} · {productInventorySummary(product)}
          </p>
          {product.type || product.tags.length > 0 ? (
            <p className="mt-[0.156vw] truncate text-[clamp(11px,0.62vw,12px)] text-customer-muted max-lg:mt-[0.8vw] max-lg:text-[2.8vw]">
              {[product.type, ...product.tags.slice(0, 3)].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-[var(--spacing-customer-gap-lg)] max-lg:col-span-2 max-lg:grid max-lg:grid-cols-3 max-lg:gap-[3vw]">
          <div className="min-w-[7.292vw] max-lg:min-w-0">
            <p className="text-[0.573vw] font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.5vw]">
              Current storefront
            </p>
            <div className="mt-[0.417vw] flex items-center gap-[var(--spacing-customer-gap-sm)] max-lg:mt-[1.5vw] max-lg:gap-[2vw]">
              <ProductSwitch checked={state.currentStorefront} disabled={storefrontDisabled} onToggle={onToggleStorefront} />
              <span className="text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary max-lg:text-[3vw]">
                {state.currentStorefront ? "Live" : "Off"}
              </span>
            </div>
          </div>

          <div className="min-w-[7.292vw] max-lg:min-w-0">
            <p className="text-[0.573vw] font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.5vw]">
              Current cycle
            </p>
            <Button
              type="button"
              variant={state.currentCycle ? "tunal" : "outline"}
              size="xs"
              onClick={onToggleCycle}
              className="mt-[0.417vw] h-[1.563vw] px-[0.625vw] text-[0.625vw] max-lg:mt-[1.5vw] max-lg:h-[7vw] max-lg:px-[3vw] max-lg:text-[2.8vw]"
            >
              {state.currentCycle ? "Included" : "Add"}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onToggleExpanded}
              className="h-[1.563vw] rounded-full px-[0.625vw] text-[0.625vw] text-brand-blue max-lg:h-[7vw] max-lg:px-[3vw] max-lg:text-[2.8vw]"
            >
              {expanded ? "Hide" : "Info"}
            </Button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-customer-border bg-customer-soft/50 px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-md)] max-lg:px-[4vw] max-lg:py-[4vw]">
          <div className="grid gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[2.5vw]">
            {product.variants.map((variant) => (
              <div
                key={`${product.handle}:${variant.id}`}
                className="grid grid-cols-[2.917vw_minmax(0,1fr)_auto] items-center gap-[var(--spacing-customer-gap-sm)] rounded-[0.833vw] border border-customer-border bg-customer-card p-[0.625vw] max-lg:grid-cols-[12vw_minmax(0,1fr)] max-lg:rounded-[3vw] max-lg:p-[3vw]"
              >
                <ProductImage src={variant.image || product.image} title={variant.title} className="aspect-square h-[2.917vw] w-[2.917vw] max-lg:h-[12vw] max-lg:w-[12vw]" />
                <div className="min-w-0">
                  <p className="truncate text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary max-lg:text-[3.2vw]">
                    {variant.title}
                  </p>
                  <p className="mt-[0.104vw] truncate text-[clamp(11px,0.62vw,12px)] text-customer-muted max-lg:mt-[0.8vw] max-lg:text-[2.8vw]">
                    {variant.sku ? `SKU ${variant.sku}` : "No SKU"}{variant.selectedOptions.length > 0 ? ` · ${variant.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}` : ""}
                  </p>
                </div>
                <div className="text-right max-lg:col-span-2 max-lg:text-left">
                  <p className="text-[clamp(12px,0.72vw,14px)] font-semibold tabular-nums text-text-primary max-lg:text-[3.2vw]">
                    {variantInventoryQuantity(variant).toLocaleString()} in inventory
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
