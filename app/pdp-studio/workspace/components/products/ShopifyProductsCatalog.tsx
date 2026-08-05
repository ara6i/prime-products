"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import type {
  ShopifyConnection,
  ShopifyProduct,
  ShopifyProductsStatusFilter,
  ShopifyProductsViewMode,
} from "../../types/shopifyProducts";

interface ShopifyProductsCatalogProps {
  connection: ShopifyConnection;
  products: ShopifyProduct[];
  loading: boolean;
  loadingMore: boolean;
  disconnecting: boolean;
  hasNextPage: boolean;
  searchDraft: string;
  statusFilter: ShopifyProductsStatusFilter;
  viewMode: ShopifyProductsViewMode;
  error: string | null;
  importingProductIds: Set<string>;
  importedCounts: Record<string, number>;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onStatusFilterChange: (value: ShopifyProductsStatusFilter) => void;
  onViewModeChange: (value: ShopifyProductsViewMode) => void;
  onImport: (productId: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export function ShopifyProductsCatalog({
  connection,
  products,
  loading,
  loadingMore,
  disconnecting,
  hasNextPage,
  searchDraft,
  statusFilter,
  viewMode,
  error,
  importingProductIds,
  importedCounts,
  onSearchDraftChange,
  onSearch,
  onClearSearch,
  onStatusFilterChange,
  onViewModeChange,
  onImport,
  onLoadMore,
  onRefresh,
  onDisconnect,
}: ShopifyProductsCatalogProps) {
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  function openShopifyProductCreate() {
    if (!connection.shopDomain) return;
    window.open(
      `https://${connection.shopDomain}/admin/products/new`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="grid gap-5 pb-10">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-pdp-accent-soft)]">
              <PdpStudioUiIcon name="shopify" size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.625rem] font-medium uppercase tracking-[0.16em] text-[var(--color-pdp-orange)]">Connected catalog</p>
              <h1 className="truncate text-[1.65rem] font-medium tracking-[-0.03em]">
                Shopify Products
              </h1>
              <p className="truncate text-xs text-[var(--color-pdp-muted)]">
                {connection.storeName} · {connection.shopDomain}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PdpStudioButton
            type="button"
            variant="secondary"
            onClick={onRefresh}
          >
            Refresh
          </PdpStudioButton>
          <PdpStudioButton
            type="button"
            variant="secondary"
            onClick={openShopifyProductCreate}
          >
            <PdpStudioUiIcon name="plus" size={16} />
            Add product
          </PdpStudioButton>
          {!connection.canPublish && connection.publishAccessUrl ? (
            <PdpStudioButton
              type="button"
              onClick={() =>
                window.location.assign(connection.publishAccessUrl!)
              }
            >
              Enable publishing
            </PdpStudioButton>
          ) : (
            <PdpStudioButton
              type="button"
              disabled
              title="Select a generated image and a product to publish"
            >
              Review & publish
            </PdpStudioButton>
          )}
          <PdpStudioButton
            type="button"
            variant="ghost"
            onClick={onDisconnect}
            disabled={disconnecting}
            className="text-[var(--color-pdp-muted)]"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </PdpStudioButton>
        </div>
      </header>

      <div className="grid gap-3">
        <form
          onSubmit={handleSearch}
          className="flex min-h-11 items-center gap-2 rounded-[var(--radius-pdp-pill)] border border-[var(--color-pdp-rule)] bg-white px-4 shadow-[var(--shadow-pdp-card)] focus-within:border-[var(--color-pdp-accent)] focus-within:ring-2 focus-within:ring-[var(--color-pdp-accent-soft)]"
        >
          <PdpStudioUiIcon
            name="search"
            size={18}
            className="text-[var(--color-pdp-muted)]"
          />
          <input
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {searchDraft ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={onClearSearch}
              className="grid size-8 place-items-center rounded-lg text-[var(--color-pdp-muted)] hover:bg-[var(--color-pdp-surface-soft)]"
            >
              <PdpStudioUiIcon name="close" size={15} />
            </button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-pdp-muted)]">
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(
                  event.target.value as ShopifyProductsStatusFilter,
                )
              }
              className="min-h-9 rounded-lg border border-[var(--color-pdp-rule)] bg-white px-3 text-sm text-[var(--color-pdp-ink)] outline-none focus:border-[var(--color-pdp-accent)]"
            >
              <option value="all">All products</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-pdp-muted)]">
              {products.length} loaded
            </span>
            <div className="flex rounded-lg border border-[var(--color-pdp-rule)] bg-white p-1">
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={`${mode} view`}
                  aria-pressed={viewMode === mode}
                  onClick={() => onViewModeChange(mode)}
                  className={`grid size-8 place-items-center rounded-md ${
                    viewMode === mode
                      ? "bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]"
                      : "text-[var(--color-pdp-muted)] hover:bg-[var(--color-pdp-surface-soft)]"
                  }`}
                >
                  <PdpStudioUiIcon
                    name={mode === "grid" ? "template" : "menu"}
                    size={17}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button type="button" onClick={onRefresh} className="font-semibold">
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <ProductSkeletonGrid />
      ) : products.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-[var(--radius-pdp-xl)] border border-dashed border-[var(--color-pdp-rule)] bg-white text-center shadow-[var(--shadow-pdp-card)]">
          <div>
            <PdpStudioUiIcon
              name="product"
              size={34}
              className="mx-auto text-[var(--color-pdp-muted)]"
            />
            <h2 className="mt-3 text-base font-semibold">No products found</h2>
            <p className="mt-1 text-sm text-[var(--color-pdp-muted)]">
              Change the search or status filter, then try again.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              : "grid gap-2"
          }
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              importing={importingProductIds.has(product.id)}
              importedCount={importedCounts[product.id]}
              onImport={() => onImport(product.id)}
            />
          ))}
        </div>
      )}

      {hasNextPage ? (
        <div className="flex justify-center py-3">
          <PdpStudioButton
            type="button"
            variant="secondary"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more products"}
          </PdpStudioButton>
        </div>
      ) : null}
    </div>
  );
}

function ProductCard({
  product,
  viewMode,
  importing,
  importedCount,
  onImport,
}: {
  product: ShopifyProduct;
  viewMode: ShopifyProductsViewMode;
  importing: boolean;
  importedCount?: number;
  onImport: () => void;
}) {
  const isList = viewMode === "list";
  const productHref = `/pdp-studio/products/${encodeURIComponent(product.id)}`;
  return (
    <article
      className={`group overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-white shadow-[var(--shadow-pdp-card)] transition hover:-translate-y-0.5 hover:border-[var(--color-pdp-rule-strong)] hover:shadow-[var(--shadow-pdp-popover)] ${
        isList ? "flex min-h-28 items-center" : ""
      }`}
    >
      <Link
        href={productHref}
        className={`min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pdp-focus)] ${
          isList ? "flex min-h-28 items-center" : "block"
        }`}
        aria-label={`Open ${product.title}`}
      >
        <div
          className={`relative grid shrink-0 place-items-center overflow-hidden bg-[#f5f6f8] ${
            isList ? "h-28 w-28" : "aspect-square w-full"
          }`}
        >
          {product.featuredImage ? (
            // Shopify media is served from dynamic merchant CDN hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.featuredImage}
              alt={product.title}
              loading="lazy"
              className="size-full object-contain transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <PdpStudioUiIcon
              name="image"
              size={30}
              className="text-[#9aa5b5]"
            />
          )}
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm">
            {product.status}
          </span>
        </div>
        <div
          className={`min-w-0 flex-1 ${
            isList ? "px-4 py-3" : "px-3 pb-2.5 pt-2.5"
          }`}
        >
          <h2 className="truncate text-sm font-medium" title={product.title}>
            {product.title}
          </h2>
          <p className="mt-1 truncate text-xs text-[var(--color-pdp-muted)]">
            {product.priceLabel || `${product.variants.length} variants`} ·{" "}
            {product.media.length} images
          </p>
        </div>
      </Link>
      <div className={isList ? "mr-4 shrink-0" : "px-3 pb-3"}>
        <PdpStudioButton
          type="button"
          variant="secondary"
          onClick={onImport}
          disabled={importing}
          className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
            importedCount !== undefined
              ? "border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]"
              : "border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-ink)] hover:border-[var(--color-pdp-accent)] hover:text-[var(--color-pdp-accent)]"
          }`}
        >
          <PdpStudioUiIcon
            name={importedCount !== undefined ? "check" : "download"}
            size={14}
          />
          {importing
            ? "Importing…"
            : importedCount !== undefined
              ? `${importedCount} imported`
              : "Import"}
        </PdpStudioButton>
      </div>
    </article>
  );
}

function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-[var(--color-pdp-rule)] bg-white"
        >
          <div className="aspect-square animate-pulse bg-[#eef1f5]" />
          <div className="grid gap-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded bg-[#e6eaf0]" />
            <div className="h-2.5 w-2/5 animate-pulse rounded bg-[#eef1f5]" />
          </div>
        </div>
      ))}
    </div>
  );
}
