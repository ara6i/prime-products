import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type {
  AdminCustomerDetailRaw,
  AdminCustomerListQuery,
  AdminCustomerSource,
  AdminCustomersResponse,
} from "../types";

function createCustomerSearchParams(query: AdminCustomerListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    source: query.source,
  });
  if (query.search.trim()) {
    params.set("search", query.search.trim());
  }
  return params.toString();
}

export async function fetchAdminCustomers(query: AdminCustomerListQuery): Promise<AdminCustomersResponse> {
  return adminFetch<AdminCustomersResponse>(`/api/admin/stores?${createCustomerSearchParams(query)}`);
}

export async function fetchAdminCustomer(
  source: AdminCustomerSource,
  id: string,
): Promise<AdminCustomerDetailRaw> {
  return adminFetch<AdminCustomerDetailRaw>(
    `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}`,
  );
}
