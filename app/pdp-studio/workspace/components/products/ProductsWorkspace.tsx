"use client";

import { useShopifyProducts } from "../../hooks/useShopifyProducts";
import { ShopifyConnectionGate } from "./ShopifyConnectionGate";
import { ShopifyOnboardingOverlay } from "./ShopifyOnboardingOverlay";
import { ShopifyProductsCatalog } from "./ShopifyProductsCatalog";

export function ProductsWorkspace() {
  const shopify = useShopifyProducts();

  if (shopify.loadingConnection) {
    return (
      <div className="grid min-h-[34rem] place-items-center">
        <div className="text-center">
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-[var(--color-pdp-accent)] border-r-transparent" />
          <p className="mt-3 text-sm text-[var(--color-pdp-muted)]">
            Checking Shopify connection…
          </p>
        </div>
      </div>
    );
  }

  if (!shopify.connection.connected) {
    return (
      <ShopifyConnectionGate
        connecting={shopify.connecting}
        error={shopify.error}
        onConnect={shopify.connect}
      />
    );
  }

  return (
    <>
      <ShopifyProductsCatalog
        connection={shopify.connection}
        products={shopify.products}
        loading={shopify.loadingProducts}
        loadingMore={shopify.loadingMore}
        disconnecting={shopify.disconnecting}
        hasNextPage={shopify.hasNextPage}
        searchDraft={shopify.searchDraft}
        statusFilter={shopify.statusFilter}
        viewMode={shopify.viewMode}
        error={shopify.error}
        importingProductIds={shopify.importingProductIds}
        importedCounts={shopify.importedCounts}
        onSearchDraftChange={shopify.setSearchDraft}
        onSearch={shopify.submitSearch}
        onClearSearch={shopify.clearSearch}
        onStatusFilterChange={shopify.setStatusFilter}
        onViewModeChange={shopify.setViewMode}
        onImport={shopify.importProduct}
        onLoadMore={shopify.loadMore}
        onRefresh={shopify.refreshProducts}
        onDisconnect={shopify.disconnect}
      />
      <ShopifyOnboardingOverlay
        open={shopify.onboardingOpen}
        ready={shopify.onboardingReady}
        error={shopify.error}
        productCount={shopify.onboardingProductCount}
        productImages={shopify.tourProductImages}
        storeName={
          shopify.connection.storeName ||
          shopify.connection.shopDomain ||
          "Shopify store"
        }
        tourStep={shopify.tourStep}
        onTourStepChange={shopify.setTourStep}
        onRetry={shopify.refreshProducts}
        onClose={() => shopify.setOnboardingOpen(false)}
      />
    </>
  );
}
