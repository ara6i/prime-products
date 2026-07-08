"use client";

import { SearchIcon } from "lucide-react";
import { CustomerDashboardCard } from "../shared/CustomerDashboardCard";
import { useCustomerProductCsvWorkspace } from "../../hooks/useCustomerProductCsvWorkspace";
import {
  CUSTOMER_PRODUCT_COLLECTION_ALL,
  customerProductInventoryFilterOptions,
  customerProductSelectionFilterOptions,
} from "../../mappers/productCsvMapper";
import { ProductFilterDropdown } from "./ProductFilterDropdown";
import { ProductImportSummaryStrip } from "./ProductImportSummaryStrip";
import { ProductSelectionRow } from "./ProductSelectionRow";
import { ProductAutoDetectDialog } from "./ProductAutoDetectDialog";
import { ProductUploadDialog } from "./ProductUploadDialog";
import type {
  CustomerProductCsvParseResult,
  CustomerProductFilterOption,
  CustomerProductInventoryFilter,
  CustomerProductSelectionFilter,
} from "../../types/products";

interface CustomerProductCsvWorkspaceProps {
  initialProducts?: CustomerProductCsvParseResult;
  verifiedWebsiteUrl: string;
}

export function CustomerProductCsvWorkspace({ initialProducts, verifiedWebsiteUrl }: CustomerProductCsvWorkspaceProps) {
  const workspace = useCustomerProductCsvWorkspace(initialProducts);
  const collectionOptions: Array<CustomerProductFilterOption<string>> = [
    { label: "All collections", value: CUSTOMER_PRODUCT_COLLECTION_ALL },
    ...workspace.collections.map((collection) => ({ label: collection, value: collection })),
  ];

  return (
    <CustomerDashboardCard
      title="Product selection"
      description="Demo products are preloaded so you can review sorting, coverage, inventory, and fit-button visibility before importing products."
      action={
        <div className="flex shrink-0 flex-wrap justify-end gap-[0.521vw] max-lg:w-full max-lg:gap-[2vw]">
          <ProductUploadDialog
            currentFileName={workspace.fileName}
            error={workspace.error}
            onApply={workspace.importFile}
          />
          <ProductAutoDetectDialog verifiedWebsiteUrl={verifiedWebsiteUrl} />
        </div>
      }
      bodyClassName="!p-0"
    >
      <div className="border-b border-customer-border px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-md)] max-lg:px-[4vw] max-lg:py-[4vw]">
        <ProductImportSummaryStrip summary={workspace.summary} fileName={workspace.fileName} />
      </div>

      <div className="grid grid-cols-[minmax(16vw,1fr)_auto_auto_auto] gap-[var(--spacing-customer-gap-sm)] border-b border-customer-border px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-md)] max-xl:grid-cols-[minmax(16vw,1fr)_auto_auto] max-lg:grid-cols-1 max-lg:gap-[3vw] max-lg:px-[4vw] max-lg:py-[4vw]">
        <label className="flex h-[2.292vw] min-w-0 items-center gap-[var(--spacing-customer-gap-sm)] rounded-full border border-customer-border bg-customer-card px-[0.833vw] transition-colors focus-within:border-brand-blue max-lg:h-[10.5vw] max-lg:gap-[2vw] max-lg:px-[4vw]">
          <SearchIcon className="h-[0.833vw] w-[0.833vw] shrink-0 text-customer-muted max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
          <span className="sr-only">Search products or collections</span>
          <input
            value={workspace.search}
            onChange={(event) => workspace.setSearch(event.target.value)}
            placeholder="Search products or collections"
            className="h-full min-w-0 flex-1 bg-transparent text-customer-sm text-text-primary outline-none placeholder:text-customer-muted max-lg:text-[3.4vw]"
          />
        </label>

        <ProductFilterDropdown
          label="Collection"
          value={workspace.collectionFilter}
          options={collectionOptions}
          onChange={workspace.setCollectionFilter}
        />

        <ProductFilterDropdown<CustomerProductSelectionFilter>
          label="Selection"
          value={workspace.selectionFilter}
          options={customerProductSelectionFilterOptions}
          onChange={workspace.setSelectionFilter}
        />

        <ProductFilterDropdown<CustomerProductInventoryFilter>
          label="Inventory"
          value={workspace.inventoryFilter}
          options={customerProductInventoryFilterOptions}
          onChange={workspace.setInventoryFilter}
        />
      </div>

      <div className="border-b border-customer-border px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-sm)] text-customer-sm font-semibold tabular-nums text-customer-muted max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3vw]">
        {workspace.summary.visibleProductCount.toLocaleString()} products, {workspace.summary.visibleVariantCount.toLocaleString()} variants on this page
      </div>

      {workspace.products.length === 0 ? (
        <div className="p-[var(--spacing-customer-card)] max-lg:p-[6vw]">
          <div className="rounded-[0.938vw] border border-dashed border-customer-border bg-customer-soft p-[var(--spacing-customer-gap-xl)] text-center max-lg:rounded-[5vw] max-lg:p-[8vw]">
            <p className="text-customer-lg font-semibold text-text-primary max-lg:text-[4.2vw]">
              No products loaded yet.
            </p>
            <p className="mx-auto mt-[0.313vw] max-w-[30vw] text-customer-sm leading-[1.6] text-text-body max-lg:mt-[2vw] max-lg:max-w-none max-lg:text-[3.3vw]">
              Upload a CSV or use Auto Detect from the actions above.
            </p>
          </div>
        </div>
      ) : workspace.visibleProducts.length === 0 ? (
        <div className="p-[var(--spacing-customer-card)] text-center text-customer-sm text-customer-muted max-lg:p-[6vw] max-lg:text-[3.3vw]">
          No products match these filters.
        </div>
      ) : (
        <div>
          {workspace.visibleProducts.map((product) => (
            <ProductSelectionRow
              key={product.handle}
              product={product}
              state={workspace.selectionState[product.handle] ?? { currentCycle: false, currentStorefront: false }}
              expanded={workspace.expandedProducts.has(product.handle)}
              onToggleCycle={() => workspace.toggleCycle(product)}
              onToggleStorefront={() => workspace.toggleStorefront(product)}
              onToggleExpanded={() => workspace.toggleExpanded(product.handle)}
            />
          ))}
        </div>
      )}
    </CustomerDashboardCard>
  );
}
