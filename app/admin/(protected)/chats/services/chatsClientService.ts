"use client";

import type {
  AdminChatDetailRaw,
  AdminChatListQuery,
  AdminChatsResponse,
  CustomerChatStartPayload,
  CustomerChatStartResponse,
  SendAdminChatMessagePayload,
  UpdateAdminChatPayload,
} from "../types";

function createChatSearchParams(query: AdminChatListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    status: query.status,
  });
  if (query.query.trim()) {
    params.set("q", query.query.trim());
  }
  return params.toString();
}

export async function fetchAdminChatsClient(query: AdminChatListQuery): Promise<AdminChatsResponse> {
  const response = await fetch(`/api/admin/chats?${createChatSearchParams(query)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load chats");
  }
  return (await response.json()) as AdminChatsResponse;
}

export async function fetchAdminChatClient(id: string): Promise<AdminChatDetailRaw> {
  const response = await fetch(`/api/admin/chats/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load chat");
  }
  return (await response.json()) as AdminChatDetailRaw;
}

export async function sendAdminChatMessageClient(
  id: string,
  payload: SendAdminChatMessagePayload,
): Promise<AdminChatDetailRaw> {
  const response = await fetch(`/api/admin/chats/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as AdminChatDetailRaw & { message?: string };
  if (!response.ok || !data.session) {
    throw new Error(data.message ?? "Failed to send chat message");
  }
  return data;
}

export async function updateAdminChatClient(id: string, payload: UpdateAdminChatPayload): Promise<AdminChatDetailRaw> {
  const response = await fetch(`/api/admin/chats/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as AdminChatDetailRaw & { message?: string };
  if (!response.ok || !data.session) {
    throw new Error(data.message ?? "Failed to update chat");
  }
  return data;
}

export async function startCustomerChatClient(payload: CustomerChatStartPayload): Promise<CustomerChatStartResponse> {
  const response = await fetch("/api/admin/chats/customer/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as CustomerChatStartResponse & { message?: string };
  if (!response.ok || !data.session || !data.customerToken) {
    throw new Error(data.message ?? "Failed to start test chat");
  }
  return data;
}

export async function sendCustomerChatMessageClient(
  id: string,
  customerToken: string,
  body: string,
): Promise<AdminChatDetailRaw> {
  const response = await fetch(`/api/admin/chats/customer/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerToken, body }),
  });
  const data = (await response.json().catch(() => ({}))) as AdminChatDetailRaw & { message?: string };
  if (!response.ok || !data.session) {
    throw new Error(data.message ?? "Failed to send test customer message");
  }
  return data;
}
