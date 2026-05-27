import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type {
  AdminChatDetailRaw,
  AdminChatListQuery,
  AdminChatsResponse,
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

export async function fetchAdminChats(query: AdminChatListQuery): Promise<AdminChatsResponse> {
  return adminFetch<AdminChatsResponse>(`/api/admin/chats?${createChatSearchParams(query)}`);
}

export async function fetchAdminChat(id: string): Promise<AdminChatDetailRaw> {
  return adminFetch<AdminChatDetailRaw>(`/api/admin/chats/${encodeURIComponent(id)}`);
}
