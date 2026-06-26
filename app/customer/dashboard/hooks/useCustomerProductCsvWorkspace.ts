"use client";

import { useMemo, useState } from "react";
import {
  CUSTOMER_PRODUCT_COLLECTION_ALL,
  filterCustomerProducts,
  mapCustomerProductImportSummary,
  mapProductCollections,
  productHasInventory,
} from "../mappers/productCsvMapper";
import { parseProductCsv } from "../services/productCsvParser";
import type {
  CustomerImportedProduct,
  CustomerProductCsvParseResult,
  CustomerProductInventoryFilter,
  CustomerProductSelectionFilter,
  CustomerProductSelectionState,
} from "../types/products";

export function useCustomerProductCsvWorkspace(initialProducts?: CustomerProductCsvParseResult) {
  const [products, setProducts] = useState<CustomerImportedProduct[]>(initialProducts?.products ?? []);
  const [selectionState, setSelectionState] = useState<Record<string, CustomerProductSelectionState>>(initialProducts?.defaultStates ?? {});
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState(initialProducts?.products.length ? "Demo products" : "");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState(CUSTOMER_PRODUCT_COLLECTION_ALL);
  const [selectionFilter, setSelectionFilter] = useState<CustomerProductSelectionFilter>("all");
  const [inventoryFilter, setInventoryFilter] = useState<CustomerProductInventoryFilter>("in-stock");

  const collections = useMemo(() => mapProductCollections(products), [products]);

  const visibleProducts = useMemo(
    () => filterCustomerProducts({
      products,
      selectionState,
      search,
      collectionFilter,
      selectionFilter,
      inventoryFilter,
    }),
    [collectionFilter, inventoryFilter, products, search, selectionFilter, selectionState],
  );

  const summary = useMemo(
    () => mapCustomerProductImportSummary({ products, visibleProducts, selectionState }),
    [products, selectionState, visibleProducts],
  );

  async function importFile(file: File): Promise<boolean> {
    setError("");

    try {
      const text = await file.text();
      const parsed = parseProductCsv(text);

      if (parsed.products.length === 0) {
        setProducts([]);
        setSelectionState({});
        setFileName("");
        setError("No products were found. Use a CSV with Title, Handle, SKU, image, and inventory columns.");
        return false;
      }

      setProducts(parsed.products);
      setSelectionState(parsed.defaultStates);
      setExpandedProducts(new Set());
      setFileName(file.name);
      setSearch("");
      setCollectionFilter(CUSTOMER_PRODUCT_COLLECTION_ALL);
      setSelectionFilter("all");
      setInventoryFilter("in-stock");
      return true;
    } catch {
      setError("The CSV could not be read. Check that the file is a valid comma-separated CSV.");
      return false;
    }
  }

  function updateProductState(productHandle: string, updater: (current: CustomerProductSelectionState) => CustomerProductSelectionState) {
    setSelectionState((currentState) => {
      const current = currentState[productHandle] ?? { currentCycle: false, currentStorefront: false };
      return {
        ...currentState,
        [productHandle]: updater(current),
      };
    });
  }

  function toggleCycle(product: CustomerImportedProduct) {
    updateProductState(product.handle, (current) => {
      const nextCycle = !current.currentCycle;
      return {
        currentCycle: nextCycle,
        currentStorefront: nextCycle ? current.currentStorefront : false,
      };
    });
  }

  function toggleStorefront(product: CustomerImportedProduct) {
    if (!productHasInventory(product)) return;
    updateProductState(product.handle, (current) => ({
      currentCycle: true,
      currentStorefront: !current.currentStorefront,
    }));
  }

  function toggleExpanded(productHandle: string) {
    setExpandedProducts((current) => {
      const next = new Set(current);
      if (next.has(productHandle)) {
        next.delete(productHandle);
      } else {
        next.add(productHandle);
      }
      return next;
    });
  }

  return {
    products,
    visibleProducts,
    selectionState,
    expandedProducts,
    summary,
    collections,
    fileName,
    error,
    search,
    collectionFilter,
    selectionFilter,
    inventoryFilter,
    setSearch,
    setCollectionFilter,
    setSelectionFilter,
    setInventoryFilter,
    importFile,
    toggleCycle,
    toggleStorefront,
    toggleExpanded,
  };
}
