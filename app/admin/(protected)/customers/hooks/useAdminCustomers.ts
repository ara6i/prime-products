"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mapCustomersPage } from "../mappers/customersMapper";
import {
  fetchAdminCustomersClient,
  fetchAdminShopifyTryOnOverviewClient,
} from "../services/customersClientService";
import type {
  AdminCustomerListQuery,
  AdminCustomerSource,
  CustomersViewModel,
} from "../types";

export interface UseAdminCustomersResult {
  view: CustomersViewModel;
  listQuery: AdminCustomerListQuery;
  searchInput: string;
  isLoading: boolean;
  error: string | null;
  updateSearchInput: (value: string) => void;
  submitSearch: (event: FormEvent<HTMLFormElement>) => void;
  goToPage: (page: number) => void;
  selectCustomer: (id: string) => void;
}

function createDefaultQuery(source: AdminCustomerSource): AdminCustomerListQuery {
  return {
    page: 1,
    limit: 25,
    source,
    search: "",
  };
}

export function useAdminCustomers(
  initialView: CustomersViewModel,
  source: AdminCustomerSource,
): UseAdminCustomersResult {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [listQuery, setListQuery] = useState<AdminCustomerListQuery>(createDefaultQuery(source));
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback((query: AdminCustomerListQuery) => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchAdminCustomersClient(query),
      source === "shopify" ? fetchAdminShopifyTryOnOverviewClient("30d") : Promise.resolve(null),
    ])
      .then(([response, overview]) => {
        setView(mapCustomersPage(response, source, overview));
        setListQuery(query);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load customers"))
      .finally(() => setIsLoading(false));
  }, [source]);

  const submitSearch = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loadCustomers({ ...listQuery, page: 1, search: searchInput.trim() });
  }, [listQuery, loadCustomers, searchInput]);

  const goToPage = useCallback((page: number) => {
    const nextPage = Math.min(Math.max(page, 1), view.pagination.totalPages);
    if (nextPage === listQuery.page) return;
    loadCustomers({ ...listQuery, page: nextPage });
  }, [listQuery, loadCustomers, view.pagination.totalPages]);

  const selectCustomer = useCallback((id: string) => {
    router.push(`/admin/customers/${source}/${encodeURIComponent(id)}`);
  }, [router, source]);

  return useMemo(
    () => ({
      view,
      listQuery,
      searchInput,
      isLoading,
      error,
      updateSearchInput: setSearchInput,
      submitSearch,
      goToPage,
      selectCustomer,
    }),
    [
      error,
      goToPage,
      isLoading,
      listQuery,
      searchInput,
      selectCustomer,
      submitSearch,
      view,
    ],
  );
}
