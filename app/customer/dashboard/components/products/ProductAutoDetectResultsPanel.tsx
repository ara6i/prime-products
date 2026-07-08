/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  EyeIcon,
  InfoIcon,
  Layers3Icon,
  Loader2Icon,
  PackageCheckIcon,
  SearchCheckIcon,
  TagsIcon,
} from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";
import type { useCustomerProductAutoDetectRequest } from "../../hooks/useCustomerProductAutoDetectRequest";

interface ProductAutoDetectResultsPanelProps {
  autoDetect: ReturnType<typeof useCustomerProductAutoDetectRequest>;
}

const ALL_CATEGORIES = "all";

export function ProductAutoDetectResultsPanel({ autoDetect }: ProductAutoDetectResultsPanelProps) {
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  const products = autoDetect.detectedProducts;
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const key = product.collection || product.type || "Uncategorized";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [products]);

  const visibleProducts = useMemo(
    () => products.filter((product) => category === ALL_CATEGORIES || product.collection === category),
    [category, products],
  );
  const detailProduct =
    products.find((product) => product.id === detailProductId) ??
    visibleProducts[0] ??
    products[0] ??
    null;
  const detailTags = detailProduct && Array.isArray(detailProduct.tags) ? detailProduct.tags : [];
  const detailVariants = detailProduct && Array.isArray(detailProduct.variants) ? detailProduct.variants : [];
  const missingFields = detailProduct && Array.isArray(detailProduct.missingFields) ? detailProduct.missingFields : [];
  const selectedCount = products.filter((product) => product.selected ?? true).length;
  const reviewedCount = products.filter((product) => Boolean(product.reviewedAt)).length;
  const isRunning = autoDetect.status === "import_running";

  function toggleProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    void autoDetect.patchProduct(productId, { selected: !(product?.selected ?? true) });
  }

  function selectAll() {
    products.forEach((product) => {
      if (!(product.selected ?? true)) void autoDetect.patchProduct(product.id, { selected: true });
    });
  }

  function clearSelection() {
    products.forEach((product) => {
      if (product.selected ?? true) void autoDetect.patchProduct(product.id, { selected: false });
    });
  }

  function reviewProduct(productId: string) {
    void autoDetect.patchProduct(productId, { reviewed: true });
    setDetailProductId(productId);
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] bg-customer-card">
      <section className="border-b border-customer-border px-5 py-3 max-lg:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white">
              {isRunning ? (
                <Loader2Icon className="h-[1.125rem] w-[1.125rem] animate-spin" aria-hidden />
              ) : (
                <SearchCheckIcon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight text-text-primary">
                {isRunning ? "Finding products" : "Product review"}
              </p>
              <p className="mt-0.5 truncate text-xs text-customer-muted">
                {products.length.toLocaleString()} found · {selectedCount.toLocaleString()} selected · {reviewedCount.toLocaleString()} reviewed · {isRunning ? "Live" : "Ready"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll} className="h-9 px-4 text-sm">
              Select all
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="h-9 px-4 text-sm text-customer-muted">
              Clear
            </Button>
          </div>
        </div>
        {autoDetect.errorMessage ? (
          <p className="mt-2 text-sm font-semibold text-customer-danger-text">{autoDetect.errorMessage}</p>
        ) : null}
      </section>

      <nav className="flex gap-2 overflow-x-auto border-b border-customer-border bg-customer-soft/45 px-5 py-2 max-lg:px-4">
        <CategoryChip
          active={category === ALL_CATEGORIES}
          label="All"
          count={products.length}
          onClick={() => setCategory(ALL_CATEGORIES)}
        />
        {categories.map((item) => (
          <CategoryChip
            key={item.label}
            active={category === item.label}
            label={item.label}
            count={item.count}
            onClick={() => setCategory(item.label)}
          />
        ))}
      </nav>

      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(21rem,26rem)] gap-3 overflow-hidden p-4 pb-3 max-xl:grid-cols-[minmax(0,1fr)_24rem] max-lg:grid-cols-1 max-lg:px-4">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-customer-border bg-customer-card">
          <div className="flex items-center justify-between gap-3 border-b border-customer-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Products</p>
              <p className="text-xs text-customer-muted">{visibleProducts.length.toLocaleString()} shown</p>
            </div>
            {isRunning ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-customer-blue px-3 py-1 text-xs font-semibold text-brand-blue">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Live
              </span>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {visibleProducts.length === 0 ? (
              <EmptyProducts isRunning={isRunning} />
            ) : (
              <div className="grid gap-3 pb-8">
                {visibleProducts.map((product) => {
                  const selected = product.selected ?? true;
                  const reviewed = Boolean(product.reviewedAt);
                  const active = detailProduct?.id === product.id;

                  return (
                    <article
                      key={product.id}
                      className={cn(
                        "grid grid-cols-[auto_5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 transition-colors max-md:grid-cols-[auto_4.5rem_minmax(0,1fr)]",
                        active
                          ? "border-brand-blue bg-customer-blue"
                          : selected
                            ? "border-brand-blue/20 bg-customer-blue/70"
                            : "border-customer-border bg-customer-soft",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 accent-brand-blue"
                      />

                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-20 w-20 rounded-2xl border border-customer-border bg-customer-card object-cover max-md:h-[4.5rem] max-md:w-[4.5rem]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-customer-border bg-customer-card text-center text-[0.65rem] font-semibold uppercase text-customer-muted max-md:h-[4.5rem] max-md:w-[4.5rem]">
                          No image
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{product.title}</p>
                        <p className="mt-1 truncate text-xs text-customer-muted">
                          {categoryPathLabel(product)} · {product.variantCount.toLocaleString()} variants
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-customer-card px-2.5 py-1 text-[0.68rem] font-semibold uppercase text-brand-blue">
                            {product.confidence}% match
                          </span>
                          {reviewed ? (
                            <span className="rounded-full bg-customer-success-bg px-2.5 py-1 text-[0.68rem] font-semibold uppercase text-customer-success-text">
                              Reviewed
                            </span>
                          ) : null}
                          {(Array.isArray(product.tags) ? product.tags : []).slice(0, 2).map((tag) => (
                            <span
                              key={`${product.id}:${tag}`}
                              className="rounded-full bg-customer-card px-2.5 py-1 text-[0.68rem] text-customer-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 max-md:col-span-3 max-md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => setDetailProductId(product.id)}
                          className="h-9 gap-1.5 px-3 text-xs"
                        >
                          <EyeIcon className="h-3.5 w-3.5" aria-hidden />
                          Details
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => reviewProduct(product.id)}
                          className="h-9 gap-1.5 px-3 text-xs !text-white"
                        >
                          <CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden />
                          Review
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-customer-border bg-customer-card">
          <div className="flex items-center gap-2 border-b border-customer-border px-4 py-3">
            <InfoIcon className="h-4 w-4 text-brand-blue" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Product detail</p>
              <p className="text-xs text-customer-muted">Review fields before approval</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {detailProduct ? (
              <div className="grid gap-4 pb-8">
                {detailProduct.image ? (
                  <img
                    src={detailProduct.image}
                    alt={detailProduct.title}
                    className="aspect-[4/3] w-full rounded-2xl border border-customer-border bg-customer-soft object-contain"
                    loading="lazy"
                  />
                ) : null}

                <div>
                  <h3 className="text-lg font-semibold leading-tight text-text-primary">{detailProduct.title}</h3>
                  <p className="mt-1 text-sm text-customer-muted">{categoryPathLabel(detailProduct)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <DetailMetric label="Category" value={detailProduct.collection || "Website"} />
                  <DetailMetric label="Type" value={detailProduct.type || "Product"} />
                  <DetailMetric label="Variants" value={detailProduct.variantCount.toLocaleString()} />
                  <DetailMetric label="Coverage" value={`${detailProduct.coverageScore ?? detailProduct.confidence}%`} />
                </div>

                {detailProduct.price ? (
                  <div className="rounded-2xl border border-customer-border bg-customer-soft px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-customer-muted">Price</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">
                      {detailProduct.currency ? `${detailProduct.currency} ` : ""}
                      {detailProduct.price}
                    </p>
                  </div>
                ) : null}

                {detailProduct.categoryPath?.length ? (
                  <InfoBlock label="Website path" value={detailProduct.categoryPath.join(" > ")} />
                ) : null}

                {detailProduct.sizeGuideUrl || detailProduct.sizeGuideText ? (
                  <div className="rounded-2xl border border-customer-border bg-customer-soft px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-customer-muted">Size guide</p>
                    {detailProduct.sizeGuideUrl ? (
                      <a
                        href={detailProduct.sizeGuideUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex max-w-full items-center gap-2 truncate text-sm font-semibold text-brand-blue"
                      >
                        <ExternalLinkIcon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">{detailProduct.sizeGuideUrl}</span>
                      </a>
                    ) : null}
                    {detailProduct.sizeGuideText ? (
                      <p className="mt-2 line-clamp-4 text-xs leading-5 text-customer-muted">{detailProduct.sizeGuideText}</p>
                    ) : null}
                  </div>
                ) : null}

                {detailProduct.mergedUrls && detailProduct.mergedUrls.length > 1 ? (
                  <InfoBlock label="Merged URLs" value={`${detailProduct.mergedUrls.length.toLocaleString()} matching product links`} />
                ) : null}

                {missingFields.length ? (
                  <InfoBlock label="Needs review" value={missingFields.join(", ")} tone="warn" />
                ) : null}

                {detailTags.length > 0 ? (
                  <div className="rounded-2xl border border-customer-border bg-customer-soft p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-customer-muted">
                      <TagsIcon className="h-3.5 w-3.5 text-brand-blue" aria-hidden />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailTags.map((tag) => (
                        <span
                          key={`${detailProduct.id}:detail:${tag}`}
                          className="rounded-full bg-customer-card px-2.5 py-1 text-xs text-customer-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <a
                  href={detailProduct.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 truncate rounded-2xl border border-customer-border bg-customer-soft px-4 py-3 text-sm font-semibold text-brand-blue hover:bg-customer-blue"
                >
                  <ExternalLinkIcon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{detailProduct.sourceUrl}</span>
                </a>

                <div className="rounded-2xl border border-customer-border bg-customer-soft">
                  <div className="flex items-center gap-2 border-b border-customer-border px-4 py-3 text-sm font-semibold text-text-primary">
                    <Layers3Icon className="h-4 w-4 text-brand-blue" aria-hidden />
                    Variants
                  </div>
                  <div className="max-h-64 overflow-y-auto p-3">
                    {detailVariants.length === 0 ? (
                      <p className="text-sm text-customer-muted">No variant details found.</p>
                    ) : (
                      <div className="grid gap-2">
                        {detailVariants.map((variant) => (
                          <div key={variant.id} className="rounded-xl bg-customer-card px-3 py-3">
                            <p className="truncate text-sm font-semibold text-text-primary">{variant.title}</p>
                            <p className="mt-1 truncate text-xs text-customer-muted">
                              {variant.sku ? `SKU ${variant.sku}` : "No SKU"} · {variant.inventoryQuantity.toLocaleString()} in stock
                            </p>
                            {variant.options ? (
                              <p className="mt-1 truncate text-xs text-customer-muted">{variant.options}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-customer-border bg-customer-soft p-6 text-center">
                <div className="max-w-xs">
                  <PackageCheckIcon className="mx-auto h-8 w-8 text-brand-blue" aria-hidden />
                  <p className="mt-3 text-sm font-semibold text-text-primary">No product selected</p>
                  <p className="mt-1 text-sm text-customer-muted">Products will appear as soon as they are found.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function CategoryChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
        active
          ? "border-brand-blue bg-brand-blue text-white"
          : "border-customer-border bg-customer-card text-customer-muted hover:text-brand-blue",
      )}
    >
      {label} {count.toLocaleString()}
    </button>
  );
}

function EmptyProducts({ isRunning }: { isRunning: boolean }) {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-customer-border bg-customer-soft p-8 text-center">
      <div className="max-w-sm">
        {isRunning ? (
          <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-brand-blue" aria-hidden />
        ) : (
          <PackageCheckIcon className="mx-auto h-8 w-8 text-brand-blue" aria-hidden />
        )}
        <p className="mt-3 text-sm font-semibold text-text-primary">
          {isRunning ? "Waiting for first product" : "No products in this category"}
        </p>
        <p className="mt-1 text-sm text-customer-muted">
          {isRunning ? "Products will be added here one by one." : "Choose another category or start over."}
        </p>
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-customer-soft px-3 py-3">
      <p className="text-xs font-semibold uppercase text-customer-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "warn"
          ? "border-amber-400/30 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          : "border-customer-border bg-customer-soft text-customer-muted",
      )}
    >
      <p className="text-xs font-semibold uppercase">{label}</p>
      <p className="mt-1 font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function categoryPathLabel(product: { categoryPath?: string[]; collection?: string; type?: string }) {
  if (Array.isArray(product.categoryPath) && product.categoryPath.length) return product.categoryPath.join(" > ");
  return [product.collection, product.type].filter(Boolean).join(" · ") || "Website";
}
