import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { AdminTicketListQuery, AdminTicketRaw, AdminTicketsResponse } from "../types";

function createTicketSearchParams(query: AdminTicketListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    queue: query.queue,
  });
  if (query.query.trim()) {
    params.set("q", query.query.trim());
  }
  return params.toString();
}

export async function fetchAdminTickets(query: AdminTicketListQuery): Promise<AdminTicketsResponse> {
  return adminFetch<AdminTicketsResponse>(`/api/admin/tickets?${createTicketSearchParams(query)}`);
}

export async function fetchAdminTicket(id: string): Promise<AdminTicketRaw> {
  const response = await adminFetch<{ ticket: AdminTicketRaw }>(`/api/admin/tickets/${encodeURIComponent(id)}`);
  return response.ticket;
}
