"use client";

import type {
  AdminTicketListQuery,
  AdminTicketRaw,
  AdminTicketsResponse,
  ReplyAdminTicketPayload,
  UpdateAdminTicketPayload,
} from "../types";

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

export async function fetchAdminTicketsClient(query: AdminTicketListQuery): Promise<AdminTicketsResponse> {
  const response = await fetch(`/api/admin/tickets?${createTicketSearchParams(query)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load tickets");
  }
  return (await response.json()) as AdminTicketsResponse;
}

export async function replyAdminTicketClient(id: string, payload: ReplyAdminTicketPayload): Promise<AdminTicketRaw> {
  const response = await fetch(`/api/admin/tickets/${encodeURIComponent(id)}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as { ticket?: AdminTicketRaw; message?: string };
  if (!response.ok || !data.ticket) {
    throw new Error(data.message ?? "Failed to reply to ticket");
  }
  return data.ticket;
}

export async function updateAdminTicketClient(id: string, payload: UpdateAdminTicketPayload): Promise<AdminTicketRaw> {
  const response = await fetch(`/api/admin/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as { ticket?: AdminTicketRaw; message?: string };
  if (!response.ok || !data.ticket) {
    throw new Error(data.message ?? "Failed to update ticket");
  }
  return data.ticket;
}
